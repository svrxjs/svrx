const consts = require('../constant');
const semver = require('semver');

function satisfies(engineVersion, version) {
    return semver.satisfies(version || consts.VERSION, engineVersion);
}

function getClosestPackage(pkgs) {
    if (!pkgs || !pkgs.length) return;
    pkgs.sort((p1, p2) => {
        return semver.lt(p1.version, p2.version) ? 1 : -1;
    });

    for (let pkg of pkgs) {
        if (satisfies(pkg.pattern || '*')) {
            return pkg;
        }
    }
}

exports.satisfies = satisfies;
exports.getClosestPackage = getClosestPackage;
