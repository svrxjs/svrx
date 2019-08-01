const childProcess = require('child_process');
const url = require('url');

function openBrowser(target, callback) {
  const map = {
    darwin: 'open',
    win32: 'start ',
  };

  const opener = map[process.platform] || 'xdg-open';

  return childProcess.exec(`${opener} ${target}`, callback);
}

module.exports = {
  hooks: {
    async onCreate({ events, config, logger }) {
      events.on('ready', () => {
        let open = config.get('open');

        const URL_MAPING = {
          external: config.get('urls.external'),
          local: config.get('urls.local'),
        };

        if (open === false) return;

        if (open === true) open = 'local';

        // make sure relative to absoulte url
        const openUrl = url.resolve(
          URL_MAPING.local,
          open.replace(/^(external|local)\b/, capture => URL_MAPING[capture]),
        );

        openBrowser(openUrl, (err) => {
          if (err) {
            logger.error(err);
          }
        });
      });
    },
  },
};
