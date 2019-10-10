const libPath = require('path');
const nUtil = require('util');
const _ = require('lodash');
const npm = require('global-npm');
const npCall = require('../npCall');
const DevNull = require('./devnull');

const SILENT_SUGAR_NOT_NECESSARILY_WORKS = {
  loglevel: 'silent',
  silent: true,
  logstream: new DevNull(),
  progress: false,
};

const load = _.memoize(async (options) => nUtil.promisify(npm.load).bind(npm, {
  ...SILENT_SUGAR_NOT_NECESSARILY_WORKS,
  ...options,
})());

const normalizeNpmCommand = (command) => async function callNpm(argsArr, options = {}, root) {
  const args = command === 'install' ? [root, argsArr] : [argsArr];
  await load(options);

  return npCall(npm.commands[command], args);
};

const npmView = normalizeNpmCommand('view');
const npmSearch = normalizeNpmCommand('search');
const npmInstall = normalizeNpmCommand('install');

const install = (options) => {
  const installPath = options.path || '.';

  return new Promise((resolve, reject) => {
    const installName = options.version ? `${options.name}@${options.version}` : options.name;
    npmInstall([installName], {
      registry: options.registry,
      ...options.npmLoad,
    }, installPath).then((result) => {
      if (!result) return resolve(result);
      const packName = (() => {
        const { localInstall, nameReal, name } = options;
        return localInstall ? nameReal : name;
      })();
      const pack = result.map((r) => {
        const [, name, version] = /(\S+)@(\S+)/.exec(r[0]);

        const path = !libPath.isAbsolute(r[1]) ? libPath.join(installPath, r[1]) : r[1];
        return { version, name, path };
      }).find((r) => r.name === packName);

      return resolve(pack);
    }).catch((err) => {
      reject(err);
    });
  });
};

module.exports = {
  view: npmView,
  search: npmSearch,
  install,
};
