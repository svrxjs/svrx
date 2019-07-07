const path = require('path');
const { npm, logger } = require('svrx-util');
const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs-extra');
const config = require('./config');

const getVersions = async () => {
  const spinner = logger.progress('Searching versions...');
  try {
    const result = await npm.view(['svrx', 'versions']);
    if (spinner) spinner();
    return _.chain(result)
      .values()
      .first()
      .value().versions.filter(v => v.indexOf('-') === -1);
  } catch (e) {
    if (spinner) spinner();
    logger.error(e);
    return null;
  }
};

const getTags = async () => {
  const spinner = logger.progress('Searching tags...');
  try {
    const result = await npm.view(['svrx', 'dist-tags']);
    if (spinner) spinner();
    return _.chain(result)
      .values()
      .first()
      .value()['dist-tags'];
  } catch (e) {
    if (spinner) spinner();
    return null;
  }
};

/**
 * install a specific version of svrx
 * @param version
 * @returns {Promise<*>}
 */
const install = async (version) => {
  const versions = await getVersions();
  versions.reverse();

  const installVersion = version || versions[0];
  const tmpObj = tmp.dirSync();
  const tmpPath = tmpObj.name;
  const options = {
    name: 'svrx',
    version: installVersion,
    path: tmpPath,
    npmLoad: {
      loaded: false,
      prefix: tmpPath,
    },
  };

  const spinner = logger.progress('Installing svrx core package...');

  try {
    const result = await npm.install(options);
    const svrxRoot = path.resolve(tmpPath, 'node_modules/svrx');
    const destFolder = path.resolve(config.VERSIONS_ROOT, result.version);
    const destFolderDependency = path.resolve(config.VERSIONS_ROOT, result.version, 'node_modules');

    return new Promise((resolve) => {
      fs.copySync(svrxRoot, destFolder);
      fs.copySync(path.resolve(tmpPath, 'node_modules'), destFolderDependency);
      if (spinner) spinner();
      resolve();
    });
  } catch (e) {
    if (spinner) spinner();
    logger.error(e);
    return null;
  }
};

module.exports = {
  install,
  getVersions,
  getTags,
};
