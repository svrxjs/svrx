const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const localWebpack = require('webpack');
const compose = require('koa-compose');
const c2k = require('koa2-connect');
const libPath = require('path');

module.exports = {
    hooks: {
        async onCreate({ middleware, config, logger, events }) {
            //@TODO: use local webpack first
            let webpackConfig = false;
            if (!webpackConfig) {
                try {
                    webpackConfig = require(libPath.join(config.get('root'), 'webpack.config.js'));
                } catch (e) {
                    logger.error('webpack config file missed!');
                }
            }
            const compiler = localWebpack(webpackConfig);

            const oldCompilerWatch = compiler.watch.bind(compiler);
            const dataToBeRecycle = {
                watchers: [],
                modules: []
            };

            compiler.watch = (opt, handler) => {
                const newHandler = (err, stats) => {
                    if(err) return logger.error(err.message);
                    dataToBeRecycle.stats = stats;
                    dataToBeRecycle.modules = stats
                        .toJson()
                        .modules.map((m) => m.id)
                        .filter((id) => typeof id === 'string' && id.indexOf('node_modules') === -1)
                        .map(normalizeResource.bind(null, compiler.context));

                    return handler(err, stats);
                };
                const watcher = oldCompilerWatch(opt, newHandler);
                dataToBeRecycle.watchers.push(watcher);
                return watcher;
            };

            const hotReloadMiddleware = compose([
                c2k(
                    webpackDevMiddleware(compiler, {
                        logLevel: 'warn'
                    })
                ),
                c2k(webpackHotMiddleware(compiler, {}))
            ]);

            middleware.add('webpack-hot-reload', {
                onCreate: () => async (ctx, next) => {
                    // return next();
                    return hotReloadMiddleware(ctx, next);
                }
            });

            events.on('file:change', (evt)=>{
                const path =evt.payload.path;
                // means it is a webpack resource
                if( dataToBeRecycle.modules.indexOf(path) !== -1 ){
                    evt.stop();
                }
            })

            // destory logic
            return async () => {
                const p = Promise.all( watchers.map(closeWatcher) );
                dataToBeRecycle = {};
                return p;
            };
        }
    }
};

function closeWatcher(watcher) {
    return new Promise((resolve) => {
        watcher.close(resolve);
    });
}

function normalizeResource( root, path ) {
    return libPath.resolve(root, path)
}
