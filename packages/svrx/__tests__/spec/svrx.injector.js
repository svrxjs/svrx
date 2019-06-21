const request = require('supertest');
const { Duplex } = require('stream');
const expect = require('expect.js');
const Svrx = require('../../lib/svrx');

function bufferToStream(buffer) {
  const stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

describe('Injector', () => {
  describe('Basic', () => {
    const svrx = new Svrx({});
    const injector = svrx.injector;
    const MARK_TESTING = '__svrx_testing__';

    injector.add('style', { content: 'body{padding:10px}' });
    injector.add('style', { content: 'body{color:black}' });
    injector.add('script', { content: 'window.test=true;' });
    injector.add('style', {
      content: MARK_TESTING,
      test(referer) {
        return /\.md$/.test(referer);
      },
    });


    it('Integration: Basic', (done) => {
      request(svrx.callback())
        .get(svrx.config.get('urls.script'))
        .set('accept-encoding', 'identity')
        .expect(/window\.test\=true/, (err, res) => {
          if (err) return done(err);
          request(svrx.callback())
            .get(svrx.config.get('urls.style'))
            .set('accept-encoding', 'identity')
            .expect(/body\{padding:10px\}/)
            .end(done);
        });
    });

    it('Integration: style join', (done) => {
      request(svrx.callback())
        .get(svrx.config.get('urls.style'))
        .set('accept-encoding', 'identity')
        .expect(/body\{padding:10px\}\nbody\{color:black\}/, done);
    });

    it('Integration:  Gzip content-encoding', (done) => {
      request(svrx.callback())
        .get(svrx.config.get('urls.script'))
        .set('accept-encoding', 'gzip')
        .expect('content-encoding', 'gzip')
        .expect(/window\.test\=true/, done);
    });
    it('Integration: Injection Testing', (done) => {
      request(svrx.callback())
        .get(svrx.config.get('urls.style'))
        .set('accept-encoding', 'identity')
        .expect(/body\{padding:10px\}/)
        .expect((res) => {
          expect(res.text).to.not.match(new RegExp(MARK_TESTING));
        })
        .end((err) => {
          if (err) return done(err);
          request(svrx.callback())
            .get(svrx.config.get('urls.style'))
            .set('accept-encoding', 'identity')
            .set('Referer', 'test.md')
            .expect(/body\{padding:10px\}/)
            .expect(new RegExp(MARK_TESTING), done);
        });
    });
  });

  describe('Transform content', () => {
    it('html should be injected script and style', (done) => {
      const svrx = new Svrx({
        port: 8001,
        middlewares: [
          {
            priority: 12,
            onCreate: () => async (ctx, next) => {
              ctx.set('Content-Type', 'text/html');
              ctx.body = '<head></head><body></body>';
            },
          },
        ],
      });

      request(svrx.callback())
        .get('/')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });

    it('transform with stream', (done) => {
      const svrx = new Svrx({
        port: 8001,
        middlewares: [
          {
            priority: 12,
            onCreate: () => async (ctx, next) => {
              ctx.set('Content-Type', 'text/html');
              ctx.body = bufferToStream(new Buffer('<head></head><body></body>'));
            },
          },
        ],
      });

      request(svrx.callback())
        .get('/')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });
  });
});

describe('IO', () => {
  const svrx = new Svrx({
    port: 8001,
    plugins: [
      {
        name: 'io-test',
        assets: {
          script: [
            {
              content: `
void function(svrx){
    const io = svrx.io;
    const event = svrx.events
    
}(window.__svrx__)
                        `,
            },
          ],
        },
        hooks: {
          onRoute: async (ctx, next) => {},
        },
      },
    ],
  });
});
