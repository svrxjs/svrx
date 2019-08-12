const supertest = require('supertest');
const { Buffer } = require('buffer');
const { createServer } = require('../util');
const { gzip } = require('../../lib/util/gzip');

const PROXY_SERVER = 'http://localhost:9003';
const PROXY_SERVER_HTTPS = 'https://localhost:9004';
const proxyServer = createServer({
  port: 9003,
  plugins: [
    {
      name: 'proxy-action-test',
      inplace: true,
      hooks: {
        async onCreate({ router }) {
          const { route } = router;

          const htmlContent = await gzip(Buffer.from('<html><body>hello</body></html>'));
          route(({ get }) => {
            get('/api(.*)').to.send('proxied');
            get('/wapi(.*)').to.send('proxied wapi');
            get('/origin/api(.*)').to.handle((ctx) => {
              if (ctx.request.headers.host === 'localhost:9003') {
                ctx.body = 'changeOrigin proxied';
              }
            });
            get('/dynamic/host/:port').to.send('dynamic proxied');
            get('/foo/abc').to.send('abc');
            get('/foo/xyz').to.send('xyz');
            get('/bar/page-1').to.send('page-1');
            get('/other/path').to.send('other');
            get('/gzip').to
              .header({
                'Content-Encoding': 'gzip',
                'Content-Type': 'html',
              })
              .send(htmlContent, { gzip: true });
          });
        },
      },
    },
  ],
});
const proxyServerHttps = createServer({
  port: 9004,
  https: true,
  plugins: [
    {
      name: 'proxy-action-test',
      inplace: true,
      hooks: {
        async onCreate({ router }) {
          const { route } = router;
          route(({ get }) => {
            get('/secure/api(.*)').to.send('secure proxied');
          });
        },
      },
    },
  ],
});

describe('Proxy', () => {
  const noProxyServer = createServer({
    proxy: false,
  });

  let agt;
  before((done) => {
    noProxyServer.setup().then(() => {
      agt = supertest(noProxyServer.callback());
      done();
    });
  });

  it('should proxy nothing when proxy is set to false', () => agt
    .get('/api/test')
    .expect(404));

  describe('Context is object', () => {
    const svrx = createServer({
      proxy: {
        '/api/test': {
          target: PROXY_SERVER,
        },
        '/foo/(abc|xyz)': {
          target: PROXY_SERVER,
        },
        '/bar/page-[1-5]': {
          target: PROXY_SERVER,
        },
        '/gzip': {
          target: PROXY_SERVER,
        },
      },
    });
    let agent;
    before((done) => {
      Promise.all([
        svrx.setup(),
        new Promise(resolve => proxyServer.start(resolve)),
      ]).then(() => {
        agent = supertest(svrx.callback());
        done();
      });
    });
    after((done) => {
      proxyServer.close();
      done();
    });

    it('should proxy path to a target server', () => agent
      .get('/api/test')
      .expect('proxied'));

    it('should support micromatch pattern \'logical or\'', () => agent
      .get('/foo/abc')
      .expect('abc'));

    it('should support micromatch pattern \'logical or\'', () => agent
      .get('/foo/xyz')
      .expect('xyz'));

    it('should support micromatch pattern \'regex character classes\'', () => agent
      .get('/bar/page-1')
      .expect('page-1'));

    it('should return 404 when not match pattern', () => agent
      .get('/no/match')
      .expect(404));

    // fixme
    // it('should set content-encoding to identity when resp is gzip', () => agent
    //   .get('/gzip')
    //   .set('accept-encoding', 'identity')
    //   .expect('Content-Encoding', 'identity')
    //   .expect(/<html><body>hello/));
  });

  describe('Context is array', () => {
    const svrx = createServer({
      proxy: [
        {
          context: ['/api', '/wapi'],
          target: PROXY_SERVER,
        },
        {
          // context: [], no context supplied will match any path
          target: PROXY_SERVER,
        },
      ],
    });
    let agent;
    before((done) => {
      Promise.all([
        svrx.setup(),
        new Promise(resolve => proxyServer.start(resolve)),
      ]).then(() => {
        agent = supertest(svrx.callback());
        done();
      });
    });
    after((done) => {
      proxyServer.close();
      done();
    });

    it('should proxy path to a target server', () => agent
      .get('/api/test')
      .expect('proxied'));

    it('should proxy path to a target server', () => agent
      .get('/wapi/test')
      .expect('proxied wapi'));

    it('should match any path if context is undefined ', () => agent
      .get('/other/path')
      .expect('other'));
  });
});

describe('Proxy Api', () => {
  const svrx = createServer({
    plugins: [
      {
        name: 'proxy-api-test',
        inplace: true,
        hooks: {
          async onRoute(ctx, next) {
            if (ctx.path !== '/api/test') {
              await next();
              return;
            }
            await ctx.proxy(ctx, {
              target: PROXY_SERVER,
            });
          },
        },
      },
    ],
  });
  let agent;
  before((done) => {
    Promise.all([
      svrx.setup(),
      new Promise(resolve => proxyServer.start(resolve)),
    ]).then(() => {
      agent = supertest(svrx.callback());
      done();
    });
  });
  after((done) => {
    proxyServer.close();
    done();
  });

  it('should apend a proxy api to ctx', () => agent
    .get('/api/test')
    .expect('proxied'));
});

describe('Proxy Action', async () => {
  const svrx = createServer({
    plugins: [
      {
        name: 'action-test',
        inplace: true,
        hooks: {
          async onCreate({ router }) {
            const { route } = router;
            route(({ get }) => {
              get('/api(.*)').to.proxy(PROXY_SERVER);
              get('/origin/api/test').to.proxy(PROXY_SERVER, {
                changeOrigin: true,
              });
              get('/origin/api/noset').to.proxy(PROXY_SERVER);
              get('/rewrite/api(.*)').to.proxy(PROXY_SERVER, {
                pathRewrite: {
                  '^/rewrite/api': '/api',
                },
              });
              get('/secure/api/test').to.proxy(PROXY_SERVER_HTTPS, {
                secure: false,
              });
              get('/secure/api/noset').to.proxy(PROXY_SERVER_HTTPS);
              get('/dynamic/host/:port').to.proxy('http://localhost:{port}');
            });
          },
        },
      },
    ],
  });
  let agent;
  before((done) => {
    Promise.all([
      svrx.setup(),
      new Promise(resolve => proxyServer.start(resolve)),
      new Promise(resolve => proxyServerHttps.start(resolve)),
    ]).then(() => {
      agent = supertest(svrx.callback());
      done();
    });
  });
  after((done) => {
    proxyServer.close();
    proxyServerHttps.close();
    done();
  });

  it('should proxy path to a target server', () => agent
    .get('/api/test')
    .expect('proxied'));

  it('should change the host header when set changeOrigin to true', () => agent
    .get('/origin/api/test')
    .expect('changeOrigin proxied'));

  it('should not change the host header when not set changeOrigin', () => agent
    .get('/origin/api/noset')
    .expect(404));

  it('should rewrite the path after proxy', () => agent
    .get('/rewrite/api/test')
    .expect('proxied'));


  it('should receive ERROR from a https server without a valid SSL certificate', () => agent
    .get('/secure/api/noset')
    .expect(500)); // Internal Server Error: self signed certificate

  it('should work after set secure to false with server that has no valid SSL certificate', () => agent
    .get('/secure/api/test')
    .expect('secure proxied'));

  it('should work when set a dynamic target hostname', () => agent
    .get('/dynamic/host/9003')
    .expect('dynamic proxied'));
});
