'use strict';

const path = require('path');

const { Transform, Duplex } = require('stream');
const ffp = require('find-free-port');
const request = require('supertest');
const expect = require('expect.js');
const Koa = require('koa');

const Configure = require('../lib/configure');
const Middleware = require('../lib/middleware');
const Svrx = require('../lib/svrx');

const getPort = function(number) {
    return new Promise((resolve, reject) => {
        ffp(3000, 8000, '127.0.0.1', number || 1, (err, ...ports) => {
            resolve(ports);
        });
    });
};

function bufferToStream(buffer) {
    let stream = new Duplex();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

function transform(rs, str, replaced) {
    if (rs instanceof Buffer) {
        rs = bufferToStream(rs);
    }
    return rs.pipe(
        new Transform({
            transform(chunk, encoding, callback) {
                this.push(chunk.toString().replace(str, replaced));
                callback();
            }
        })
    );
}

describe('Basic', () => {
    it('#Callback', (done) => {
        const server = new Svrx();

        request(server.callback())
            .get('/path-not-exsits')
            .expect(404, done);
    });

    it('#start', (done) => {
        ffp(3000, '127.0.0.1', (err, p) => {
            const svrx = new Svrx({
                port: p
            });
            svrx.start((port) => {
                expect(port).to.eql(p);
                svrx.close(done);
            });
        });
    });

    it('#port conflict', (done) => {
        getPort().then((p) => {
            p = p[0];
            const svrx = new Svrx({
                port: p
            });
            svrx.start((port) => {
                expect(port).to.eql(p);
                const svrx2 = new Svrx({
                    port: p
                });
                const config = svrx2.config;
                svrx2.start((port) => {
                    expect(port).to.not.equal(p);
                    svrx.close(() => {
                        svrx2.close(done);
                    });
                });
            });
        });
    });
});

describe('Middleware', () => {
    it('onCreate Basic', (done) => {
        const m = new Middleware();

        m.add('one', {
            priority: 1,
            onCreate(config) {
                return async (ctx, next) => {
                    ctx.body = 'one';
                    await next();
                };
            }
        });

        m.add('two', {
            priority: 2,
            onCreate(config) {
                return async (ctx, next) => {
                    ctx.body += ' two';
                    await next();
                };
            }
        });

        const app = new Koa();
        app.use(m.middleware());

        request(app.callback())
            .get('/')
            .expect('one two', done);
    });

    describe('Builtin', () => {
        function joinTest(config1, config2, callback) {
            getPort(2).then((ports) => {
                const targetServer = new Svrx(
                    Object.assign(
                        {
                            port: ports[0]
                        },
                        config1
                    )
                );
                targetServer.start(() => {
                    const server = new Svrx(
                        Object.assign(
                            {
                                port: ports[1],
                                proxy: {
                                    target: '127.0.0.1:' + ports[0]
                                }
                            },
                            config2
                        )
                    );

                    callback(request(server.callback()), targetServer.close.bind(targetServer));
                });
            });
        }

        it('proxy: basic', (done) => {
            joinTest(
                {
                    middlewares: {
                        hello: () => async (ctx, next) => {
                            ctx.body = 'hello';
                        }
                    }
                },
                {
                    middlewares: {
                        test: () => async (ctx, next) => {
                            ctx.body += ' world';
                        }
                    }
                },
                (req, close) => {
                    return req.get('/').expect('hello world', () => close(done));
                }
            );
        });

        it('proxy: injector', (done) => {
            joinTest(
                {
                    middlewares: {
                        hello: () => async (ctx, next) => {
                            ctx.body = '<body></body>';
                            ctx.response.type = 'html';
                        }
                    }
                },
                {
                    middlewares: {
                        modify: (config) => async (ctx, next) => {
                            await next();
                            if (/html/.test(ctx.response.get('content-type'))) {
                                ctx.body = transform(ctx.body, '</body>', `<script src='xx.js'></body>`);
                            }
                        }
                    }
                },
                (req, close) => {
                    req.get('/')
                        .expect('Content-Type', /html/)
                        .expect(`<body><script src='xx.js'></body>`, () => close(done));
                }
            );
        });

        it('serveStatic: basic', (done) => {
            const server = new Svrx({
                port: 3000,
                static: {
                    root: path.join(__dirname, 'fixture/middleware')
                }
            });
            request(server.callback())
                .get('/demo.js')
                .expect('const a = 1;', done);
        });
        it('serveStatic: injector', (done) => {
            const server = new Svrx({
                port: 3000,
                static: {
                    root: path.join(__dirname, 'fixture/middleware')
                },
                middlewares: {
                    modify: (config) => async (ctx, next) => {
                        await next();
                        if (/html/.test(ctx.response.get('content-type'))) {
                            ctx.body = transform(ctx.body, '</body>', `<script src='xx.js'></body>`);
                        }
                    }
                }
            });

            request(server.callback())
                .get('/demo.html')
                .expect('Content-Type', /html/)
                .expect(`<body><script src='xx.js'></body>`, done);
        });

        it('builtin - serveStatic & proxy', () => {});
    });
});
