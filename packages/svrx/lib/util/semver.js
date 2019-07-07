const semver = require('semver');
const consts = require('../constant');

function satisfies(engineVersion, version) {
  return semver.satisfies(version || consts.VERSION, engineVersion);
}

function getClosestPackage(pkgs) {
  if (!pkgs || !pkgs.length) return null;
  pkgs.sort((p1, p2) => (semver.lt(p1.version, p2.version) ? 1 : -1));

  return pkgs.find(pkg => satisfies(pkg.pattern || '*'));
}

exports.satisfies = satisfies;
exports.getClosestPackage = getClosestPackage;
