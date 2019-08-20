const supertest = require('supertest');
const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');
const Koa = require('koa');

const util = require('util');
const libFs = require('fs');
const Svrx = require('../../lib/svrx');
const Router = require('../../lib/router/router');
const Route = require('../../lib/router/route');
const Loader = require('../../lib/router/loader');
const { exportsToPlugin } = require('../../lib/router');
// const { getProxyServer } = require('../util');

// const read = util.promisify(libFs.readFile);
const write = util.promisify(libFs.writeFile);
const unlink = util.promisify(libFs.unlink);

const ROUTER_PATH = libPath.join(__dirname, '../fixture/router');

function createServer(option) {
  option = option || {};
  option.livereload = false;
  option.open = false;
  return new Svrx(option);
}

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
      const svrx = createServer({
        route: libPath.join(ROUTER_PATH, 'rule.normal.js'),
      });

      svrx.setup().then(() => {
        supertest(svrx.callback())
          .get('/normal/name')
          .expect(200)
          .expect({ code: 200 })
          .end((err) => {
            done(err);
            svrx.close();
          });
      });
    });

    it('exportsToPlugin', (done) => {
      const loader = new Loader();
      const { action, route } = exportsToPlugin(loader);
      action('hello', () => (ctx) => {
        ctx.body = 'hello';
      });
      route(({ all }) => {
        all('/blog').hello();
      });

      request(loader)
        .post('/blog')
        .expect(200)
        .expect('Content-Type', /plain/)
        .expect('hello')
        .end(done);
    });


    it('integrated with plugin', (done) => {
      const svrx = createServer({
        plugins: [
          {
            name: 'hello-world',
            inplace: true,
            hooks: {
              async onCreate({ router }) {
                const { action, route, load } = router;
                // action(name, handler )
                action('say', (name) => (ctx) => {
                  ctx.body = `hello ${name}`;
                });

                // route({...methods})
                route(({ all, get }) => {
                  all('/blog').to.say('leeluolee');
                  get('/user').to.json({ user: 'svrx' });
                });

                // load(file)
                await load(libPath.join(ROUTER_PATH, 'rule.normal.js'));
              },
            },
          },
        ],
      });

      svrx.setup().then(() => {
        supertest(svrx.callback())
          .post('/blog')
          .expect(200)
          .expect('Content-Type', /plain/)
          .expect('hello leeluolee')
          .end((e) => {
            if (e) return done(e);
            return supertest(svrx.callback())
              .get('/normal/hello')
              .expect(200)
              .expect({ code: 200 })
              .end((err) => {
                done(err);
                svrx.close();
              });
          });
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
        .expect((res) => expect(res.body.code).to.equal(200))
        .end(done);
    });

    it('route regexp', (done) => {
      const route = new Route({
        selector: /^\/blog\/(name|hello)/,
        method: 'get',
      });

      route.to.send({ code: 200 });

      request(route)
        .post('/blog/hello')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => expect(res.body.code).to.equal(200))
        .end(done);
    });
    it('selector is need', () => {
      expect(() => new Route({
        selector: null,
        method: 'get',
      })).to.throwError();
    });
  });

  describe('Router Class', () => {
    it('del should mapping to delete', () => {
      const r = new Router();
      const { del } = r.commands;

      del('/blog(.*)').to.json({ id: 1 });

      return request(r)
        .del('/blog/test')
        .expect('Content-Type', /json/)
        .expect({ id: 1 });
    });
    it('basic', (done) => {
      const r = new Router();
      const { get } = r.commands;

      get('/blog(.*)').to.json({ id: 1 });

      request(r)
        .get('/blog/test')
        .expect('Content-Type', /json/)
        .expect({ id: 1 })
        .end(done);
    });
  });

  describe('Loader', () => {
    let loaders = [];
    after((done) => {
      loaders.forEach((loader) => loader.destroy());
      loaders = [];
      cleanModule(done);
    });
    function getLoader() {
      const loader = new Loader();
      loaders.push(loader);
      return loader;
    }

    function waitWatcher(watcher, evt) {
      return new Promise((resolve) => {
        watcher.on(evt, () => {
          setTimeout(resolve, 10);
        });
      });
    }
    it('loader.build normal', async () => {
      const loader = getLoader();
      const router = await loader.build(libPath.join(ROUTER_PATH, 'rule.normal.js'));
      const router2 = await loader.build(libPath.join(ROUTER_PATH, 'rule.normal.js'));

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

    it('watch + multiple + filechange ', (done) => {
      const loader = getLoader();
      expect(loader._middlewares.length).to.equal(0);
      // monkey patch
      const filePath1 = libPath.join(ROUTER_PATH, 'load.change1.tmp.js');
      const filePath2 = libPath.join(ROUTER_PATH, 'load.change2.tmp.js');
      libFs.writeFileSync(
        filePath1,
        `
        get('/change1/:id').send({title: 'change1'})
      `,
      );
      libFs.writeFileSync(
        filePath2,
        `
        get('/change2/:id').send({title: 'change2'})
      `,
      );
      loader.load(filePath1);
      loader.load(filePath2);

      const agent = request(loader);

      waitWatcher(loader.watcher, 'change').then(() => {
        agent
          .get('/change2/name')
          .expect({ title: 'change2 is ready!' })
          .end(done);
      });

      setTimeout(() => {
        write(filePath2, 'get(\'/change2/:id\').send({title: \'change2 is ready!\'})');
      }, 10);
    }).timeout(5000);

    it('load with content', (done) => {
      const loader = getLoader();
      const filePath = libPath.join(ROUTER_PATH, 'load.unlink.tmp.js');

      loader
        .load(
          filePath,
          `
          get('/blog/:id').send({title: 'svrx is awesome!'})
      `,
        )
        .then(() => {
          const agent = request(loader);
          agent
            .get('/blog/name')
            .expect({ title: 'svrx is awesome!' })
            .end(done);
        });
    });

    it('loaderror', () => {
      const loader = getLoader();
      const filePath = libPath.join(ROUTER_PATH, 'load.error.tmp.js');

      return loader
        .load(
          filePath,
          `
            get('/blog/:id').send({title: 'svrx is awesome!'})
        `,
        )
        .then(() => {
          const agent = request(loader);
          return agent.get('/blog/name').expect({ title: 'svrx is awesome!' });
        })
        .then(() => loader.load(filePath, 'Syntax Error !!!!!!!!').then(() => {
          const agent = request(loader);
          return agent.get('/blog/name').expect({ title: 'svrx is awesome!' });
        }));
    });

    it('add router', (done) => {
      const loader = getLoader();
      const router = new Router();
      router.commands.get('/blog/:id').send({ title: 'add is work' });
      loader.add(router);

      const agent = request(loader);
      agent
        .get('/blog/name')
        .expect({ title: 'add is work' })
        .end(done);
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
    const svrx = createServer({
      root: libPath.join(__dirname, '../fixture/router/static'),
      plugins: [
        {
          name: 'action-test',
          inplace: true,
          hooks: {
            async onCreate({ router }) {
              const { route } = router;

              // route({...methods})
              route(({ get }) => {
                get('/handle(.*)').to.handle((ctx) => { ctx.body = 'handle'; });
                get('/blog(.*)').to.json({ code: 200 });
                get('/code(.*)').to.send('code', 201);
                get('/json(.*)').to.send({ json: true });
                get('/html(.*)').to.send('<html>haha</html>');
                get('/rewrite:path(.*)').to.rewrite('/query{path}');
                get('/redirect:path(.*)').to.redirect('localhost:9002/proxy{path}');
                get('/text(.*)').to.send('haha');
                get('/query(.*)').to.handle((ctx) => {
                  ctx.body = ctx.query;
                });
                get('/header(.*)')
                  .to.header({ 'X-From': 'svrx' })
                  .json({ user: 'svrx' });
                get('/user').to.json({ user: 'svrx' });

                get('/sendFile/:path(.*)').to.sendFile(
                  libPath.join(__dirname, '../fixture/plugin/serve/{path}'),
                );
              });
            },
          },
        },
      ],
    });
    const proxyServer = createServer({
      port: 9002,
      plugins: [
        {
          name: 'action-test',
          inplace: true,
          hooks: {
            async onCreate({ router }) {
              const { route } = router;

              // route({...methods})
              route(({ get }) => {
                get('/proxy(.*)').to.handle((ctx) => {
                  ctx.body = `proxy ${ctx.query.name}`;
                });
              });
            },
          },
        },
      ],
    });

    let agent;
    before((done) => {
      Promise.all([svrx.setup(), new Promise((resolve) => proxyServer.start(resolve))]).then(() => {
        agent = supertest(svrx.callback());
        done();
      });
    });
    after((done) => {
      proxyServer.close(done);
    });

    it('redirect', () => agent
      .get('/redirect/demo.html?name=hello')
      .expect(302)
      .expect('Location', 'localhost:9002/proxy/demo.html'));
    it('rewrite', () => agent
      .get('/rewrite/demo.html?name=hello')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({ name: 'hello' }));
    it('handle', () => agent
      .get('/handle/demo.html')
      .expect(200)
      .expect('Content-Type', /plain/)
      .expect('handle'));
    it('sendFile', () => agent
      .get('/sendFile/demo.html')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/body/));

    it('json', (done) => {
      agent
        .get('/blog/hello')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect({ code: 200 })
        .end(done);
    });
    it('send code', () => agent
      .get('/code/hello')
      .expect(201)
      .expect('Content-Type', /plain/)
      .expect('code'));
    it('send code', () => agent
      .get('/code/hello')
      .expect(201)
      .expect('Content-Type', /plain/)
      .expect('code'));
    it('send', (done) => {
      agent
        .get('/html/hello')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect('<html>haha</html>')
        .end((er) => {
          if (er) return done(er);
          return agent
            .get('/text/hello')
            .expect(200)
            .expect('Content-Type', /plain/)
            .expect('haha')
            .end((err) => {
              if (err) return done(err);

              return agent
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
        .get('/header/hello')
        .expect(200)
        .expect('X-From', 'svrx')
        .expect({ user: 'svrx' })
        .end(done);
    });
  });
});
