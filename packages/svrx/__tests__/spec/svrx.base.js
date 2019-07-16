const ffp = require('find-free-port');
const request = require('supertest');
const expect = require('expect.js');
const Koa = require('koa');
const svrx = require('../../index');

const Middleware = require('../../lib/middleware');
const Svrx = require('../../lib/svrx');

function createServer(option) {
  option = option || {};
  option.livereload = false;
  return new Svrx(option);
}


const getPort = number => new Promise((resolve) => {
  ffp(3000, 8000, '127.0.0.1', number || 1, (err, ...ports) => {
    resolve(ports);
  });
});

describe('Basic', () => {
  it('#Callback', (done) => {
    const server = createServer();

    request(server.callback())
      .get('/path-not-exsits')
      .expect(404, done);
  });

  it('#start', (done) => {
    ffp(3000, '127.0.0.1', (err, p) => {
      const svr = createServer({
        port: p,
        open: false,
      });
      svr.start((port) => {
        expect(port).to.eql(p);
        svrx.close(done);
      });
    });
  });

  it('#start with no port', (done) => {
    const svr = createServer({
      open: false,
    });
    svr.start((port) => {
      expect(port).to.not.equal(undefined);
      svrx.close(done);
    });
  });


  it('#port conflict', (done) => {
    getPort().then((ps) => {
      const [p] = ps;
      const svr = createServer({ port: p, open: false });

      svr.start((port) => {
        expect(port).to.eql(p);
        const svrx2 = createServer({
          port: p,
          open: false,
        });

        svrx2.start((port2) => {
          expect(port2).to.not.equal(p);
          svrx.close(() => svrx2.close(done));
        });
      });
    });
  });
});

describe('Middleware', () => {
  it('onCreate Basic', (done) => {
    const m = new Middleware();

    m.add('one', {
      priority: 2,
      onCreate() {
        return async (ctx, next) => {
          ctx.body = 'one';
          await next();
        };
      },
    });

    m.add('two', {
      priority: 1,
      onCreate() {
        return async (ctx, next) => {
          ctx.body += ' two';
          await next();
        };
      },
    });

    const app = new Koa();
    app.use(m.middleware());

    request(app.callback())
      .get('/')
      .expect('one two', done);
  });
});

describe('Public API', () => {
  it('svrx.create() & svrx()', async () => {
    const server = svrx({
      open: false,
      livereload: false,
    });

    const server2 = svrx.create({
      open: false,
      livereload: false,
      plugins: {
        inplace: true,
        hooks: {
          async onRoute(ctx) {
            ctx.body = 'hello';
          },
        },
      },
    });

    await request(server.__svrx.callback())
      .get('/')
      .expect(404);

    return request(server2.__svrx.callback())
      .get('/')
      .expect(200)
      .expect('hello');
  });
});
