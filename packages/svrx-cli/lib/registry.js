const path = require('path');
const { npm } = require('svrx-util');
const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs-extra');
const config = require('./config');

const getVersions = async () => {
  const result = await npm.view(['svrx', 'versions']);
  return _.chain(result)
    .values()
    .first()
    .value().versions;
};

const getTags = async () => {
  const result = await npm.view(['svrx', 'dist-tags']);
  return _.chain(result)
    .values()
    .first()
    .value()['dist-tags'];
};

/**
 * install a specific version of svrx
 * @param version
 * @returns {Promise<*>}
 */
const install = async (version) => {
  const tmpObj = tmp.dirSync();
  const tmpPath = tmpObj.name;
  const options = {
    name: 'svrx',
    version,
    path: tmpPath,
    npmLoad: {
      loaded: false,
      prefix: tmpPath,
    },
  };

  const result = await npm.install(options);
  const svrxRoot = result.path;
  const destFolder = path.resolve(config.VERSIONS_ROOT, result.version);

  return new Promise((resolve) => {
    fs.copySync(svrxRoot, destFolder);
    resolve();
  });
};

module.exports = {
  install,
  getVersions,
  getTags,
};
