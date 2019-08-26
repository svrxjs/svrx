const ffp = require('find-free-port');
const request = require('supertest');
const expect = require('expect.js');
const sinon = require('sinon');
const Koa = require('koa');
const svrx = require('../../index');
const Svrx = require('../../lib/svrx');
const CONFIGS = require('../../lib/config-list');

const Middleware = require('../../lib/middleware');

const { createServer } = require('../util');

const getPort = (number) => new Promise((resolve) => {
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
        svr.close(done);
      });
    });
  });

  it('#start with no port', (done) => {
    const svr = createServer({
      open: false,
    });
    svr.start((port) => {
      expect(port).to.not.equal(undefined);
      svr.close(done);
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
          svr.close(() => svrx2.close(done));
        });
      });
    });
  });

  it('getCurrentVersion', () => {
    expect(Svrx.getCurrentVersion()).to.equal(require('../../package.json').version);  // eslint-disable-line
  });
  it('printHelper', () => {
    expect(Svrx.printBuiltinOptionsHelp()).to.match(new RegExp(Object.keys(CONFIGS).join('|')));
  });
});

describe('Middleware', () => {
  it('onRoute Basic', (done) => {
    const m = new Middleware();

    m.add('two', {
      priority: 2,
      async onRoute(ctx, next) {
        ctx.body += ' two';
        await next();
      },
    });

    m.add('one', async (ctx, next) => {
      ctx.body = 'one';
      await next();
    });

    const app = new Koa();
    app.use(m.middleware());

    request(app.callback())
      .get('/')
      .expect('one two', done);
  });
  it('del: dynamic updating', async () => {
    const m = new Middleware();

    m.add('two', {
      priority: 2,
      async onRoute(ctx, next) {
        ctx.body += ' two';
        await next();
      },
    });

    m.add('one', async (ctx, next) => {
      ctx.body = 'one';
      await next();
    });

    const app = new Koa();
    app.use(m.middleware());

    await request(app.callback())
      .get('/')
      .expect('one two');

    m.del('two');

    await request(app.callback())
      .get('/')
      .expect('one');
  });
  it('add: invalid input', async () => {
    const m = new Middleware();

    expect(() => {
      m.add('two', {
        priority: 2,
      });
    }).to.throwError(/two should contains onRoute field/);
  });
  it('onCreate Basic: deprecated in future', (done) => {
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
  it('add overflow', () => {
    const m = new Middleware();

    expect(() => {
      for (let i = 0; i < 201; i += 1) {
        m.add(`one${i}`, {
          onCreate() {
            return async (ctx, next) => {
              await next();
            };
          },
        });
      }
    }).to.throwError(/max middleware size limit exceeded/);
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
      plugins: [
        {
          inplace: true,
          name: 'hello-body',
          hooks: {
            async onRoute(ctx) {
              ctx.body = 'hello';
            },
          },
        },
      ],
    });
    await server2.__svrx.setup();

    await request(server.__svrx.callback())
      .get('/')
      .expect(404);

    return request(server2.__svrx.callback())
      .get('/')
      .expect(200)
      .expect('hello');
  });

  it('svrx.start svrx.close', async () => {
    const TEST_PORT = 9002;

    const server = svrx({
      port: TEST_PORT,
      open: false,
      livereload: false,
      plugins: [
        {
          inplace: true,
          name: 'hello-body',
          hooks: {
            async onRoute(ctx) {
              ctx.body = 'hello';
            },
          },
        },
      ],
    });

    await server.start();

    await request(`http://localhost:${TEST_PORT}`)
      .get('/')
      .expect(200)
      .expect('hello');

    return server.close();
  });
  it('svrx.events', async () => {
    const spy = sinon.spy();

    const server = svrx({
      open: false,
      livereload: false,
    });

    server.on('hello', spy);
    await server.emit('hello', 'world');

    expect(spy.calledOnce).to.equal(true);
    server.off('hello', spy);
    await server.emit('hello', 'world');

    expect(spy.calledOnce).to.equal(true);
  });

  it('svrx.reload()', async () => {
    const spy = sinon.spy();

    const server = svrx({
      open: false,
      livereload: false,
    });

    server.on('file:change', spy);

    await server.reload();

    expect(spy.calledOnce).to.equal(true);
  });
});
