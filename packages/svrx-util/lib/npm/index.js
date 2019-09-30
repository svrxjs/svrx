const libPath = require('path');
const nUtil = require('util');
const _ = require('lodash');
const npmi = require('npmi');
const npm = require('global-npm');
const npCall = require('../npCall');
const DevNull = require('./devnull');

const SILENT_SUGAR_NOT_NECESSARILY_WORKS = {
  loglevel: 'silent',
  silent: true,
  logstream: new DevNull(),
  progress: false,
};

const load = _.memoize(async (registry) => nUtil.promisify(npm.load).bind(npm, {
  ...SILENT_SUGAR_NOT_NECESSARILY_WORKS,
  registry,
})());

const normalizeNpmCommand = (command) => async function callNpm(argsArr, options = {}) {
  const args = [argsArr];
  const { registry } = options;
  await load(registry);

  return npCall(npm.commands[command], args);
};

const view = normalizeNpmCommand('view');
const search = normalizeNpmCommand('search');

const install = (options) => {
  const root = options.path;
  const { npmLoad, registry } = options;

  if (npmLoad) {
    _.extend(npmLoad, SILENT_SUGAR_NOT_NECESSARILY_WORKS);
    if (!npmLoad.registry) {
      npmLoad.registry = registry;
    }
  }

  return new Promise((resolve, reject) => {
    npmi(options, (err, result) => {
      if (err) return reject(err);
      if (!result) return resolve(result);
      const packName = (() => {
        const { localInstall, nameReal, name } = options;
        return localInstall ? nameReal : name;
      })();
      const pack = result.map((r) => {
        const [, name, version] = /(\S+)@(\S+)/.exec(r[0]);

        const path = !libPath.isAbsolute(r[1]) ? libPath.join(root, r[1]) : r[1];
        return { version, name, path };
      }).find((r) => r.name === packName);

      return resolve(pack);
    });
  });
};

module.exports = {
  view,
  search,
  install,
};
