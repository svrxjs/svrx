const { debounce } = require('lodash');
const chokidar = require('chokidar');
const libPath = require('path');

module.exports = {
    assets: {
        script: ['./assets/index.js']
    },
    hooks: {
        // on plugin enable
        async onCreate({ config, events, io }) {
            if (config.get('livereload') === false) {
                return;
            }

            const dir = config.get('static.root') || config.get('root');
            let exclude = config.get('livereload.exclude');

            if (typeof exclude === 'string') exclude = new RegExp(exclude);
            chokidar
                .watch(dir, {
                    persistent: true,
                    ignored: [exclude, /node_modules/]
                })
                .on(
                    'change',
                    debounce((path) => {
                        const data = { path: path };
                        const extname = libPath.extname(path);

                        if (extname === '.css') {
                            data.css = path.slice(dir.length);
                        }

                        events.emit('file:change', data, true).then((evt) => {
                            if (!evt.isStoped) {
                                io.emit('file:change', data);
                            }
                        });
                    }, 200)
                );
        }
    }
};
