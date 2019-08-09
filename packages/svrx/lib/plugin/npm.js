const { npm, logger } = require('svrx-util');
const semver = require('../util/semver');
const { normalizePluginName } = require('../util/helper');
const { VERSION } = require('../constant');

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



async function getSatisfiedVersion(name, semverVersion) {
  try {
    const packages = await getMatchedPkg(name, semverVersion);

    if (!packages.length) return false;
    const matchedPackage = semver.getClosestPackage(packages);

    return matchedPackage ? matchedPackage.version : false;
  } catch (e) {
    logger.error(e);
    return false;
  }
}

function install(options) {
  options.registry = options.registry || storage.registry;
  return npm.install(options);
}

async function getInstallForTask({
  name, path, version, root, registry,
}) {
  if (registry) setRegistry(registry);

  const installOptions = {
    registry,
    path: root,
    npmLoad: {
      prefix: root,
    },
  };

  if (path === undefined) {
    const targetVersion = await getSatisfiedVersion(name, version);
    if (!targetVersion) {
      // @TODO
      throw Error(
        `unmatched plugin ${name} version for svrx@${VERSION}, please check it`,
      );
    } else {
      installOptions.name = normalizePluginName(name);
      installOptions.version = targetVersion;
    }
  } else {
    // local install
    installOptions.name = path;
    installOptions.localInstall = true;
  }

  return install(installOptions);
}


module.exports = {
  // view,
  // search,
  install,
  getSatisfiedVersion,
  getInstallForTask,
  setRegistry,
};
