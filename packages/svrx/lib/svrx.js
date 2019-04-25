const http = require('http');

const ffp = require('find-free-port');
const Koa = require('koa');

const MiddlewareManager = require('./middleware');
const PluginSystem = require('./plugin/system');
const Configure = require('./configure');
// const Injector = require('./injector')
const IO = require('./io');

const NOOP = () => {};

class Svrx {
    constructor(options) {
        options = Object.assign(
            {
                root: process.cwd()
            },
            options
        );

        const app = (this.app = new Koa());
        const server = (this._server = http.createServer(app.callback()));
        const config = (this.config = new Configure(options));

        this.middlewareManager = new MiddlewareManager(config);

        this.system = new PluginSystem({
            config,
            middleware: this.middlewareManager
        });

        this.io = new IO({
            config,
            server,
            middlewareManager: this.middlewareManager
        });

        // @TODO: need dynamic
        app.use(this.koaMiddleware());
    }

    async ready() {
        return Promise.all(this._tasks);
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

    async setup() {
        const config = this.config;
        const plen = config.get('plugins.length');
        if (!plen) return;
        return this.system.load(config.get('plugins') || []).then(() => {
            this.system.build();
        });
    }

    _tryStart(port, callback) {
        const config = this.config;

        this.setup().then(() => {
            ffp(port, '127.0.0.1', (err, p1) => {
                if (err) throw Error('NO PORT FREE');
                // this.setup().then(()=>{
                this._server.listen(p1, () => {
                    config.set('port', p1);
                    callback(p1);
                });
                // })
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
