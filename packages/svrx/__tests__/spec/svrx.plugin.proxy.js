const supertest = require('supertest');
const { createServer } = require('../util');

describe('Proxy Action', async () => {
  const PROXY_SERVER = 'http://localhost:9003';
  const PROXY_SERVER_HTTPS = 'https://localhost:9004';
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
            });
          },
        },
      },
    ],
  });
  const proxyServer = createServer({
    port: 9003,
    plugins: [
      {
        name: 'proxy-action-test',
        inplace: true,
        hooks: {
          async onCreate({ router }) {
            const { route } = router;

            route(({ get }) => {
              get('/api(.*)').to.send('proxied');
              get('/origin/api(.*)').to.handle((ctx) => {
                if (ctx.request.headers.host === 'localhost') {
                  ctx.body = 'changeOrigin proxied';
                }
              });
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
});
