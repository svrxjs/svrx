// @TODO;
const npm = require('npm');
const npmi = require('npmi');
const _ = require('lodash');
const nUtil = require('util');
const libPath = require('path');
const semver = require('../util/semver');
const DevNull = require('./devnull');

const { npCall, normalizePluginName } = require('../util/helper');
// @TODO
const SILENT_SUGAR_NOT_NECESSARILY_WORKS = {
    loglevel: 'silent',
    silent: true,
    logstream: new DevNull(),
    progress: false
};

const load = _.memoize(nUtil.promisify(npm.load).bind(npm, SILENT_SUGAR_NOT_NECESSARILY_WORKS));

function normalizeNpmCommand(command) {
    return async function(...args) {
        await load();
        return npCall(npm.commands[command], args);
    };
}

const view = normalizeNpmCommand('view');
const search = normalizeNpmCommand('search');

function install(option) {
    const root = option.path;
    const npmLoad = option.npmLoad;

    if (npmLoad) {
        _.extend(npmLoad, SILENT_SUGAR_NOT_NECESSARILY_WORKS);
    }

    return new Promise((resolve, reject) => {
        npmi(option, (err, result) => {
            if (err) return reject(err);
            else {
                if (!result) return resolve(result);
                let len = result.length;
                const [name, version] = result[len - 1][0].split('@');
                let path = result[len - 1][1];
                // @FIX npmi error
                if (!libPath.isAbsolute(path)) {
                    path = libPath.join(root, path);
                }
                resolve({
                    version,
                    name,
                    path
                });
            }
        });
    });
}

// getSatisfiedPackage('svrx-plugin-qrcode')
async function getSatisfiedVersion(name, semverVersion) {
    const packages = await getMatchedPkg(name, semverVersion);
    if (!packages.length) return false;
    const matchedPackage = semver.getClosestPackage(packages);
    return matchedPackage ? matchedPackage.version : false;
}

async function getMatchedPkg(name, semverVersion) {
    name = normalizePluginName(name);
    const versions = await view([name + '@' + (semverVersion || '*'), 'engines']);
    if (versions) {
        let packages = Object.keys(versions).map((v) => {
            return {
                version: v,
                pattern: (versions[v].engines && versions[v].engines.svrx) || '*'
            };
        });
        return packages;
    }
    return [];
}

async function listMatchedPackageVersion(name) {
    name = normalizePluginName(name);
    const packages = await getMatchedPkg(name);
    return packages.map((p) => {
        return `${name}@${p.version} satisfies svrx@${p.pattern}`;
    });
}

module.exports = {
    view,
    search,
    install,
    getSatisfiedVersion,
    listMatchedPackageVersion
};
