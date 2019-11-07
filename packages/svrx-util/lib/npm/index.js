const libPath = require('path');
const nUtil = require('util');
const _ = require('lodash');
const npm = require('global-npm');
const npminstall = require('npminstall');
const npCall = require('../npCall');
const DevNull = require('./devnull');
const readJSON = require('../readJSON');

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

const install = (options) => {
  const installPath = options.path || process.cwd();

  return new Promise((resolve, reject) => {
    // Due to some history reason:
    // options use 'name' to specify the local install path of package,
    // but npminstall uses 'version'
    const name = options.localInstall ? '' : options.name;
    const version = options.localInstall ? options.name : options.version;
    const pkgName = options.localInstall ? options.nameReal : options.name;
    const installMethod = options.global ? npminstall.installGlobal : npminstall;
    installMethod({
      root: installPath,
      // global install only
      targetDir: options.global ? installPath : undefined,
      pkgs: [
        { name, version },
      ],
      registry: options.registry,
      ignoreScripts: false,
      save: false,
    }).then(() => {
      const pkgPath = libPath.join(installPath, 'node_modules', pkgName);
      const pkg = readJSON(libPath.join(pkgPath, 'package.json'));

      return resolve({
        version: pkg.version,
        name: pkgName,
        path: pkgPath,
      });
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
