const fs = require('fs');
const path = require('path');
const semver = require('semver');
const config = require('./config');

const getSvrxPath = (version) => path.resolve(config.VERSIONS_ROOT, version, 'lib/svrx.js');

module.exports = {
    getLatestVersion: () => {
        const { lstatSync, readdirSync } = fs;
        const { join } = path;
        const isDirectory = (name) => lstatSync(join(config.VERSIONS_ROOT, name)).isDirectory();
        const getDirectories = (source) => readdirSync(source).filter(isDirectory);
        const versions = getDirectories(config.VERSIONS_ROOT);
        versions.sort((v1, v2) => semver.lt(v1, v2));
        return versions.length > 0 ? versions[0] : null;
    },

    exists: (version) => {
        return fs.existsSync(getSvrxPath(version));
    },

    load: (version, optionsFromCli = {}) =>
        new Promise((resolve) => {
            const Svrx = require(getSvrxPath(version));
            resolve(new Svrx({}, optionsFromCli));
        })
};
