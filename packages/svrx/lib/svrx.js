const http = require('http');
const https = require('https');
const ffp = require('find-free-port');
const Koa = require('koa');
const { getCert } = require('./util/helper');
const Middleware = require('./middleware');
const PluginSystem = require('./plugin/system');
const Configure = require('./configure');
const Injector = require('./injector');
const IO = require('./io');
const OPTIONS = require('./option-list');

const NOOP = () => {};

class Svrx {
    constructor(options) {
        const config = (this.config = new Configure(options));
        const app = (this.app = new Koa());
        const server = (this._server = config.get('https')
            ? https.createServer(getCert(), app.callback())
            : http.createServer(app.callback()));

        const middleware = (this.middleware = new Middleware(config));

        const injector = (this.injector = new Injector({ config, middleware }));

        const io = (this.io = new IO({ config, server, middleware }));

        this.system = new PluginSystem({
            io,
            config,
            injector,
            middleware
        });

        // @TODO: need dynamic
        app.use(this.koaMiddleware());
    }

    async ready() {
        return Promise.all(this._tasks);
    }

    // export koa middleware for exsited koa application
    koaMiddleware() {
        return this.middleware.middleware();
    }

    // export raw callback for http(s).createServer
    callback() {
        return this.app.callback();
    }

    start(callback) {
        this._tryStart(this.config.get('port'), callback || NOOP);
    }

    close(callback) {
        this._server.close(callback);
    }

    loadOptionList() {
        return OPTIONS;
    }

    async setup() {
        const plugins = this._getPlugins();
        return this.system.load(plugins).then(() => {
            return this.system.build();
        });
    }

    _getPlugins(plugins) {
        // auto load builtin plugin
        return [
            // @TODO: livereload settings
            { name: 'livereload' },
            { name: 'serve' },
            { name: 'proxy' },
            { name: 'cors' }
        ].concat(this.config.get('plugins') || []);
    }

    _tryStart(port, callback) {
        const config = this.config;

        this.setup()
            .then(() => {
                ffp(port, '127.0.0.1', (err, p1) => {
                    if (err) throw Error('NO PORT FREE');
                    // this.setup().then(()=>{
                    this._server.listen(p1, () => {
                        config.set('port', p1);
                        callback(p1);
                    });
                    // })
                });
            })
            .catch((e) => {
                throw e;
            });
    }
}

module.exports = Svrx;
