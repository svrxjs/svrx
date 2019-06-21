'use strict';

const path = require('path');

const ffp = require('find-free-port');
const request = require('supertest');
const expect = require('expect.js');
const Koa = require('koa');

const Configure = require('../../lib/configure');
const Middleware = require('../../lib/middleware');
const Svrx = require('../../lib/svrx');

function createServer(option){
    option = option || {};
    option.livereload = false
    return new Svrx(option)
}


const getPort = function(number) {
    return new Promise((resolve, reject) => {
        ffp(3000, 8000, '127.0.0.1', number || 1, (err, ...ports) => {
            resolve(ports);
        });
    });
};

describe('Basic', () => {
    it('#Callback', (done) => {
        const server = createServer();

        request(server.callback())
            .get('/path-not-exsits')
            .expect(404, done);
    });

    it('#start', (done) => {
        ffp(3000, '127.0.0.1', (err, p) => {
            const svrx = createServer({
                port: p,
                open: false
            });
            svrx.start((port) => {
                expect(port).to.eql(p);
                svrx.close(done);
            });
        });
    });

    it('#start with no port', (done) => {
        const svrx = createServer({
            open: false
        });
        svrx.start((port) => {
            expect(port).to.not.equal(undefined);
            svrx.close(done)
        });
    });


    it('#port conflict', (done) => {
        getPort().then((p) => {
            p = p[0];
            const svrx = createServer({ port: p, open:false });

            svrx.start((port) => {
                expect(port).to.eql(p);
                const svrx2 = createServer({
                    port: p,
                    open: false
                });

                const config = svrx2.config;
                svrx2.start((port) => {
                    expect(port).to.not.equal(p);
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
            onCreate(config) {
                return async (ctx, next) => {
                    ctx.body = 'one';
                    await next();
                };
            }
        });

        m.add('two', {
            priority: 1,
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
                const targetServer = createServer(
                    Object.assign(
                        {
                            port: ports[0],
                            open:false
                        },
                        config1
                    )
                );
                targetServer.start(() => {
                    const server = createServer(
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

        // it('proxy: basic', (done) => {
        //     joinTest(
        //         {
        //             middlewares: {
        //                 hello: () => async (ctx, next) => {
        //                     ctx.body = 'hello';
        //                 }
        //             }
        //         },
        //         {
        //             middlewares: {
        //                 test: () => async (ctx, next) => {
        //                     ctx.body += ' world';
        //                 }
        //             }
        //         },
        //         (req, close) => {
        //             return req.get('/').expect('hello world', () => close(done));
        //         }
        //     );
        // });

        // it('proxy: injector', (done) => {
        //     joinTest(
        //         {
        //             middlewares: {
        //                 hello: () => async (ctx, next) => {
        //                     ctx.body = '<body></body>';
        //                     ctx.response.type = 'html';
        //                 }
        //             }
        //         },
        //         {
        //             middlewares: {
        //                 modify: (config) => async (ctx, next) => {
        //                     await next();
        //                     if (/html/.test(ctx.response.get('content-type'))) {
        //                         ctx.body = transform(ctx.body, '</body>', `<script src='xx.js'></body>`);
        //                     }
        //                 }
        //             }
        //         },
        //         (req, close) => {
        //             req.get('/')
        //                 .expect('Content-Type', /js/)
        //                 .expect(`<body><script src='xx.js'></body>`, () => close(done));
        //         }
        //     );
        // });


    });
});
