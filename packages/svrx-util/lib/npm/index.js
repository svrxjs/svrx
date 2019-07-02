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
const load = _.memoize(nUtil.promisify(npm.load).bind(npm, SILENT_SUGAR_NOT_NECESSARILY_WORKS));
const normalizeNpmCommand = command => async function callNpm(...args) {
  const spinner = logger.progress('');
  await load();
  const result = await npCall(npm.commands[command], args);
  if (spinner) spinner();
  return result;
};

const view = normalizeNpmCommand('view');
const search = normalizeNpmCommand('search');

const install = (option) => {
  const root = option.path;
  const { npmLoad } = option;

  if (npmLoad) {
    _.extend(npmLoad, SILENT_SUGAR_NOT_NECESSARILY_WORKS);
  }

  const spinner = logger.progress('Installing package...');
  return new Promise((resolve, reject) => {
    npmi(option, (err, result) => {
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
