const _ = require('lodash');
const chokidar = require('chokidar');
const libPath = require('path');

module.exports = {
  assets: {
    script: ['./assets/index.js'],
  },
  hooks: {
    async onCreate({ config, events, io }) {
      const reloadConfig = config.get('livereload');
      if (reloadConfig === false) return;

      const dir = config.get('serve.base') || config.get('root');
      const exclude = config.get('livereload.exclude');
      const ignoreList = [/node_modules/];

      if (_.isString(exclude)) ignoreList.push(new RegExp(exclude));
      if (_.isArray(exclude)) {
        _.forEach(exclude, (ex) => {
          ignoreList.push(new RegExp(ex));
        });
      }

      chokidar
        .watch(dir, {
          persistent: true,
          ignored: ignoreList,
        })
        .on(
          'change',
          _.debounce((path) => {
            const data = { path };
            const extname = libPath.extname(path);

            if (extname === '.css') {
              data.css = path.slice(dir.length);
            }

            events.emit('file:change', data, true).then((evt) => {
              if (!evt.isStoped) {
                io.emit('file:change', data);
              }
            });
          }, 200),
        );
    },
  },
};
