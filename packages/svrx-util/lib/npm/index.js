const libPath = require('path');
const nUtil = require('util');
const npmi = require('npmi');
const _ = require('lodash');
const npm = require('npm');
const npCall = require('../npCall');
const DevNull = require('./devnull');

const SILENT_SUGAR_NOT_NECESSARILY_WORKS = {
  loglevel: 'silent',
  silent: true,
  logstream: new DevNull(),
  progress: false,
};

const load = _.memoize(async registry => nUtil.promisify(npm.load).bind(npm, {
  ...SILENT_SUGAR_NOT_NECESSARILY_WORKS,
  registry,
})());

const normalizeNpmCommand = command => async function callNpm(argsArr, options = {}) {
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
      const len = result.length;
      const [, name, version] = /(\S+)@(\S+)/.exec(result[len - 1][0]);
      let path = result[len - 1][1];
      // @FIX npmi error
      if (!libPath.isAbsolute(path)) {
        path = libPath.join(root, path);
      }
      return resolve({ version, name, path });
    });
  });
};

module.exports = {
  view,
  search,
  install,
};
