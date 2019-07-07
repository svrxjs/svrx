const fs = require('fs');
const path = require('path');
const semver = require('semver');
const config = require('./config');

const getSvrxPath = version => path.resolve(config.VERSIONS_ROOT, version, 'lib/svrx.js');
const getVersions = () => {
  const { lstatSync, readdirSync } = fs;
  const { join } = path;
  const isDirectory = name => lstatSync(join(config.VERSIONS_ROOT, name)).isDirectory();
  const getDirectories = source => readdirSync(source).filter(isDirectory);

  return (fs.existsSync(config.VERSIONS_ROOT) && getDirectories(config.VERSIONS_ROOT)) || [];
};
module.exports = {
  getLatestVersion: () => {
    const versions = getVersions();
    versions.sort((v1, v2) => semver.lt(v1, v2));
    const noBetaVersions = versions.filter(v => v.indexOf('-') === -1);
    if (noBetaVersions.length > 0) return noBetaVersions[0];
    return versions.length > 0 ? versions[0] : null;
  },

  getVersions,

  exists: version => version && fs.existsSync(getSvrxPath(version)),

  load: (version, optionsFromCli = {}) => new Promise((resolve) => {
    const Svrx = require(getSvrxPath(version)); // eslint-disable-line
    resolve(new Svrx({}, optionsFromCli));
  }),
};
