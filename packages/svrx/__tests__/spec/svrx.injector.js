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
    const { injector } = svrx;
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
        .expect(/window\.test=true/, (err) => {
          if (err) return done(err);
          return request(svrx.callback())
            .get(svrx.config.get('urls.style'))
            .set('accept-encoding', 'identity')
            .expect(/body\{padding:10px\}/)
            .end(done);
        });
    });

    it('valid file will return no error', () => {
      expect(() => {
        injector.add('style', { filename: 'content_not_exsits.js' });
      }).to.not.throwError();
    });

    it('Integration: style join', () => request(svrx.callback())
      .get(svrx.config.get('urls.style'))
      .set('accept-encoding', 'identity')
      .expect(/body\{padding:10px\}\nbody\{color:black\}/));

    it('Integration:  Gzip content-encoding', () => request(svrx.callback())
      .get(svrx.config.get('urls.script'))
      .set('accept-encoding', 'gzip')
      .expect('content-encoding', 'gzip')
      .expect(/window\.test=true/));

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
          return request(svrx.callback())
            .get(svrx.config.get('urls.style'))
            .set('accept-encoding', 'identity')
            .set('Referer', 'test.md')
            .expect(/body\{padding:10px\}/)
            .expect(new RegExp(MARK_TESTING), done);
        });
    });
  });

  describe('Transform content', () => {
    const svrx = new Svrx({
      port: 8001,
      middlewares: [
        {
          onCreate: () => async (ctx, next) => {
            switch (ctx.url) {
              case '/content':
                ctx.set('Content-Type', 'text/html');
                ctx.body = '<head></head><body></body>';
                break;
              case '/buffer':
                ctx.set('Content-Type', 'text/html');
                ctx.body = Buffer.from('<head></head><body></body>');
                break;
              case '/stream':
                ctx.set('Content-Type', 'text/html');
                ctx.body = bufferToStream(Buffer.from('<head></head><body></body>'));
                break;
              default:
                next();
            }
          },
        },
      ],
    });
    const { injector } = svrx;

    it('replace should work', () => {
      injector.replace('</head>', (cap) => `<script src="/__nei__/client.js"></script>${cap}`);

      return request(svrx.callback())
        .get('/content')
        .set('accept-encoding', 'identity')
        .expect(/<script src="\/__nei__\/client\.js"><\/script>/);
    });

    it('invalid replace should throw error', () => {
      expect(() => {
        injector.replace(1, () => {});
      }).to.throwError(/invalid replacement/);
    });
    it('html should be injected script and style', (done) => {
      request(svrx.callback())
        .get('/content')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });

    it('transform with stream', (done) => {
      const svrx1 = new Svrx({
        port: 8001,
        middlewares: [
          {
            priority: 12,
            onCreate: () => async (ctx) => {
              ctx.set('Content-Type', 'text/html');
              ctx.body = bufferToStream(Buffer.from('<head></head><body></body>'));
            },
          },
        ],
      });

      request(svrx1.callback())
        .get('/')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });

    it('transform invalid ', () => {
      expect(injector._transform([])).to.eql([]);
    });

    it('Buffer should work', (done) => {
      request(svrx.callback())
        .get('/buffer')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });
    it('Stream should work', (done) => {
      request(svrx.callback())
        .get('/stream')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });
  });

  describe('Insert case', () => {
    const svrx = new Svrx({
      port: 8001,
      middlewares: [
        {
          async onRoute(ctx, next) {
            switch (ctx.url) {
              case '/doc-write-body':
                ctx.set('Content-Type', 'text/html');
                ctx.body = `<head>
                  <script>document.wirte('<body></body>')</script>
                  </head>
                  <body>mark</body>`;
                break;
              case '/only-body':
                ctx.set('Content-Type', 'text/html');
                ctx.body = '<body></body>';
                break;
              case '/only-body-stream':
                ctx.set('Content-Type', 'text/html');
                ctx.body = bufferToStream(Buffer.from('<body></body>'));
                break;
              case '/none-of-both':
                ctx.set('Content-Type', 'text/html');
                ctx.body = bufferToStream(Buffer.from('Hello,World'));
                break;
              default:
                next();
            }
          },
        },
      ],
    });


    it('only last body will be inject', (done) => {
      request(svrx.callback())
        .get('/doc-write-body')
        .expect(new RegExp('mark<script'))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });

    it('missing head should inject style at body', (done) => {
      request(svrx.callback())
        .get('/only-body')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });
    it('stream:missing head should inject style at body', (done) => {
      request(svrx.callback())
        .get('/only-body-stream')
        .expect(new RegExp(`src="${svrx.config.get('urls.script')}"`))
        .expect(new RegExp(`href="${svrx.config.get('urls.style')}"`))
        .end(done);
    });
  });
});
