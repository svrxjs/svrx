const semver = require('semver');
const consts = require('../constant');

function satisfies(engineVersion, version) {
  return semver.satisfies(version || consts.VERSION, engineVersion);
}

function getClosestPackage(pkgs) {
  if (!pkgs || !pkgs.length) return;
  pkgs.sort((p1, p2) => (semver.lt(p1.version, p2.version) ? 1 : -1));

  for (const pkg of pkgs) {
    if (satisfies(pkg.pattern || '*')) {
      return pkg;
    }
  }
}

exports.satisfies = satisfies;
exports.getClosestPackage = getClosestPackage;
