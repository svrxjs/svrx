const { npm } = require('svrx-util');
const semver = require('../util/semver');
const { normalizePluginName } = require('../util/helper');

const storage = {};

function setRegistry(registry) {
  storage.registry = registry;
}

async function getMatchedPkg(name, semverVersion) {
  name = normalizePluginName(name);
  const versions = await npm.view([`${name}@${semverVersion || '*'}`, 'engines'], {
    registry: storage.registry,
  });
  if (versions) {
    const packages = Object.keys(versions).map(v => ({
      version: v,
      pattern: (versions[v].engines && versions[v].engines.svrx) || '*',
    }));
    return packages;
  }
  return [];
}

async function listMatchedPackageVersion(name) {
  name = normalizePluginName(name);
  const packages = await getMatchedPkg(name);
  return packages.map(p => `${name}@${p.version} satisfies svrx@${p.pattern}`);
}

async function getSatisfiedVersion(name, semverVersion) {
  const packages = await getMatchedPkg(name, semverVersion);

  if (!packages.length) return false;
  const matchedPackage = semver.getClosestPackage(packages);
  return matchedPackage ? matchedPackage.version : false;
}

async function install(options) {
  options.registry = storage.registry;
  return npm.install(options);
}

module.exports = {
  // view,
  // search,
  install,
  getSatisfiedVersion,
  listMatchedPackageVersion,
  setRegistry,
};
