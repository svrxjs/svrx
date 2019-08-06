const { npm, logger } = require('svrx-util');
const semver = require('../util/semver');
const { normalizePluginName } = require('../util/helper');

const storage = {};

function setRegistry(registry) {
  storage.registry = registry;
}

async function getMatchedPkg(name, semverVersion) {
  name = normalizePluginName(name);
  const versions = await npm.view([`${name}@${semverVersion
  || '*'}`, 'engines'], {
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
  const spinner = logger.progress('');

  try {
    name = normalizePluginName(name);
    const packages = await getMatchedPkg(name);

    if (spinner) spinner();
    return packages.map(p => `${name}@${p.version} satisfies svrx@${p.pattern}`);
  } catch (e) {
    if (spinner) spinner();
    return [];
  }
}

async function getSatisfiedVersion(name, semverVersion) {
  // const spinner = logger.progress(`Detecting satisfied plugin: ${chalk.gray(name)}`);
  try {
    const packages = await getMatchedPkg(name, semverVersion);

    // if (spinner) spinner();
    if (!packages.length) return false;
    const matchedPackage = semver.getClosestPackage(packages);

    return matchedPackage ? matchedPackage.version : false;
  } catch (e) {
    // if (spinner) spinner();
    logger.error(e);
    return false;
  }
}

function install(options) {
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
