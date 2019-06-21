const { exec } = require('child_process');

module.exports = {
  configSchema: {},
  hooks: {
    async onCreate({ events, config, logger }) {
      events.on('ready', () => {
        let open = config.get('open');

        const URL_MAPING = {
          external: config.get('urls.external'),
          local: config.get('urls.local'),
        };

        if (open === false) return;

        if (open === true) open = 'external';

        if (typeof open !== 'string') return;

        const openUrl = open.replace(/^(external|local)\b/, capture => URL_MAPING[capture]);

        openBrowser(openUrl, (err) => {
          if (err) return logger.error(err);
        });
      });
    },
  },
};

function openBrowser(target, callback) {
  const map = {
    darwin: 'open',
    win32: 'start ',
  };

  const opener = map[process.platform] || 'xdg-open';

  return exec(`${opener} ${target}`, callback);
}
