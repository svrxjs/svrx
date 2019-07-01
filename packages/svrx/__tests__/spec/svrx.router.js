const supertest = require('supertest');
const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');
const Koa = require('koa');

const util = require('util');
const libFs = require('fs');
const Svrx = require('../../lib/Svrx');
const Router = require('../../lib/router/router');
const Route = require('../../lib/router/route');
const Loader = require('../../lib/router/loader');
const { getProxyServer } = require('../util');

const read = util.promisify(libFs.readFile);
const write = util.promisify(libFs.writeFile);
const unlink = util.promisify(libFs.unlink);

const ROUTER_PATH = libPath.join(__dirname, '../fixture/router');

function request(router) {
  const app = new Koa();

  app.use(router.middleware());

  return supertest(app.callback());
}

function cleanModule(done) {
  rimraf(libPath.join(ROUTER_PATH, '*.tmp.js'), done);
}

describe('Router ', () => {
  describe('E2E', () => {
    it('basic', (done) => {
      const svrx = new Svrx({
        route: libPath.join(ROUTER_PATH, 'rule.normal.js'),
      });

      svrx.setup().then(() => {
        supertest(svrx.callback())
          .get('/blog/name')
          .expect(200)
          .expect({ code: 200 })
          .end(done);
      });
    });
  });
  describe('Route', () => {
    it('route match', () => {
      const route = new Route({
        selector: '/blog/:id',
        method: 'get',
      });

      const param = route.exec('/blog/svrx', 'get');

      expect(param).to.eql({
        id: 'svrx',
      });
    });
    it('route unnamed match', () => {
      const route = new Route({
        selector: '/blog/(hello|world)',
        method: 'get',
      });

      const param1 = route.exec('/blog/hello', 'post');
      const param2 = route.exec('/blog/hello', 'get');
      const param3 = route.exec('/blog/svrx', 'get');

      expect(param1).to.equal(null);
      expect(param2).to.eql({ 0: 'hello' });
      expect(param3).to.equal(null);
    });
    it('route all', () => {
      const route = new Route({
        selector: '/blog/(hello|world)',
      });
      const param1 = route.exec('/blog/hello', 'post');
      const param2 = route.exec('/blog/world', 'get');
      expect(param1).to.eql({ 0: 'hello' });
      expect(param2).to.eql({ 0: 'world' });
    });
    it('route middleware should work', (done) => {
      const route = new Route({
        selector: '/blog/(hello|world)',
        method: 'get',
      });

      route.to.json({ code: 200 });

      request(route)
        .post('/blog/hello')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(res => expect(res.body.code).to.equal(200))
        .end(done);
    });
  });

  describe('action json', async (done) => {
    it('basic', (done) => {
      const r = new Router();
      const { get } = r.commands;

      get('/blog(.*)').to.json({ id: 1 }),
      request(r)
        .get('/blog/test')
        .expect('Content-Type', /json/)
        .expect({ id: 1 })
        .end(done);
    });
  });

  describe('Loader', () => {
    after((done) => {
      loaders.forEach(loader => loader.destroy());
      loaders = [];
      cleanModule(done);
    });
    let loaders = [];
    function getLoader() {
      const loader = new Loader();
      loaders.push(loader);
      return loader;
    }

    function waitWatcher(watcher, evt) {
      return new Promise((resolve) => {
        watcher.on(evt, (evt) => {
          setTimeout(resolve, 10);
        });
      });
    }
    it('loader.build normal', async () => {
      const loader = getLoader();
      const router = await loader.build(
        libPath.join(ROUTER_PATH, 'rule.normal.js'),
      );
      const router2 = await loader.build(
        libPath.join(ROUTER_PATH, 'rule.normal.js'),
      );

      expect(router).to.be.an(Router);
      expect(router).to.not.equal(router2);

      return new Promise((resolve, reject) => {
        request(router)
          .get('/hello/test')
          .expect('Content-Type', /html/)
          .expect(200, '<html>hello world</html>')
          .end((err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    });
    it('loader.load normal', async () => {
      const loader = getLoader();
      // monkey patch
      const filePath = libPath.join(ROUTER_PATH, 'load.normal.tmp.js');
      await write(
        filePath,
        `
        get('/blog/:id').send({title: 'svrx is awesome!'})
      `,
      );
      await loader.load(filePath);
      const agent = request(loader);
      return new Promise((resolve, reject) => {
        agent
          .get('/blog/name')
          .expect('Content-Type', /json/)
          .expect({ title: 'svrx is awesome!' })
          .expect(200)
          .end((err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    });
    it('watch + filechange', (done) => {
      const loader = getLoader();
      expect(loader._middlewares.length).to.equal(0);
      // monkey patch
      const filePath = libPath.join(ROUTER_PATH, 'load.change.tmp.js');
      libFs.writeFileSync(
        filePath,
        `
        get('/blog/:id').send({title: 'svrx is awesome!'})
      `,
      );
      loader.load(filePath).then(() => {
        expect(loader._middlewares.length).to.equal(1);

        const agent = request(loader);

        waitWatcher(loader.watcher, 'change').then(() => {
          agent
            .get('/blog/name')
            .expect({ title: 'svrx.router is awesome!' })
            .end(done);
        });

        setTimeout(() => {
          write(
            filePath,
            `
            get('/blog/:id').send({title: 'svrx.router is awesome!'})
          `,
          );
        }, 10);
      });
    }).timeout(5000);


    it('load with content', (done) => {
      const loader = getLoader();
      const filePath = libPath.join(ROUTER_PATH, 'load.unlink.tmp.js');

      loader.load(filePath, `
          get('/blog/:id').send({title: 'svrx is awesome!'})
      `).then(() => {
        const agent = request(loader);
        agent
          .get('/blog/name')
          .expect({ title: 'svrx is awesome!' })
          .end(done);
      });
    });

    it('watch + unlink', (done) => {
      const loader = getLoader();
      // monkey patch
      const filePath = libPath.join(ROUTER_PATH, 'load.unlink.tmp.js');
      libFs.writeFileSync(
        filePath,
        `
        get('/blog/:id').send({title: 'svrx is awesome!'})
      `,
      );
      loader.load(filePath).then(() => {
        const agent = request(loader);

        waitWatcher(loader.watcher, 'unlink').then(() => {
          agent
            .get('/blog/name')
            .expect(404)
            .end(done);
        });

        setTimeout(() => {
          unlink(filePath);
        }, 10);
      });
    }).timeout(5000);

    it('watch + multi file', () => {});
  });

  describe('Action', async () => {
    const r = new Router();
    const { get } = r.commands;

    // const location = await getProxyServer(async (ctx, next) => {
    //   if (ctx.url === '/blog') {
    //     ctx.body = 'blog';
    //   } else {
    //     return next();
    //   }
    // });

    get('/blog(.*)').to.json({ code: 200 });
    get('/json(.*)').to.send({ json: true });
    get('/html(.*)').to.send('<html>haha</html>');
    get('/text(.*)').to.send('haha');
    get('/user(.*)')
      .to.header({ 'X-From': 'svrx' })
      .json({ user: 'svrx' });

    const agent = request(r);

    it('json', (done) => {
      agent
        .get('/blog/hello')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect({ code: 200 })
        .end(done);
    });
    it('send', (done) => {
      agent
        .get('/html/hello')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect('<html>haha</html>')
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/text/hello')
            .expect(200)
            .expect('Content-Type', /plain/)
            .expect('haha')
            .end((err) => {
              if (err) return done(err);

              agent
                .get('/json/hello')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect({ json: true })
                .end(done);
            });
        });
    });
    it('header', (done) => {
      agent
        .get('/user/hello')
        .expect(200)
        .expect('X-From', 'svrx')
        .expect({ user: 'svrx' })
        .end(done);
    });
  });
});
