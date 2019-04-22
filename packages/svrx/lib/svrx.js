const http = require('http');

const ffp = require('find-free-port');
const Koa = require('koa');

const MiddlewareManager = require('./middleware');
// const PluginSystem = require('./plugin/system')
const Configure = require('./configure');
// const Injector = require('./injector')
const IO = require('./io');

const NOOP = () => {};

class Svrx {
    constructor(options) {
        options = options || {};

        const app = (this.app = new Koa());
        const server = (this._server = http.createServer(app.callback()));
        const config = (this.config = new Configure(options));

        this.middlewareManager = new MiddlewareManager(config);

        this.io = new IO({
            config,
            server,
            middlewareManager: this.middlewareManager
        });

        // @TODO: need dynamic
        app.use(this.koaMiddleware());
    }

    // export koa middleware for exsited koa application
    koaMiddleware() {
        return this.middlewareManager.middleware();
    }

    // export raw callback for http(s).createServer
    callback() {
        return this.app.callback();
    }

    start(callback) {
        this._io = new IO(this.app);
        this._tryStart(this.config.get('port'), callback || NOOP);
    }

    close(callback) {
        this._server.close(callback);
    }

    _tryStart(port, callback) {
        const config = this.config;

        ffp(port, '127.0.0.1', (err, p1) => {
            if (err) throw Error('NO PORT FREE');
            this._server.listen(p1, () => {
                config.set('port', p1);
                callback(p1);
            });
        });
    }

    // facade export to koa ctx
    _facade() {
        return {
            inject() {}
        };
    }
}

module.exports = Svrx;

// const server = new Svrx({
//     port: 8002,
//     proxy: {
//         target: 'nej.netease.com',
//         next: true
//     },
//     middlewares: {
//         hello: {
//             priority: 100,
//             onCreate(){
//                 return async (ctx, next)=>{
//                     console.log('===============')
//                     await next();
//                 }
//             }
//         }
//     }
// })

// server.start((p) => {
//     console.log(p)
// })
