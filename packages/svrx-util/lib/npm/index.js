const libPath = require('path');
const nUtil = require('util');
const npmi = require('npmi');
const _ = require('lodash');
const npm = require('npm');
const logger = require('../logger');
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
  const spinner = logger.progress('');
  try {
    const args = [argsArr];
    const { registry } = options;
    await load(registry);
    const result = await npCall(npm.commands[command], args);
    if (spinner) spinner();

    return result;
  } catch (e) {
    if (spinner) spinner();
    logger.error(e);
    process.exit(1);
    return null;
  }
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

  const spinner = logger.progress('Installing package...');
  return new Promise((resolve, reject) => {
    npmi(options, (err, result) => {
      if (spinner) spinner();
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
