// @TODO;
const npm = require('npm');
const npmi = require('npmi');
const _ = require('lodash');
const nUtil = require('util');
const libPath = require('path');
const DevNull = require('./devnull');
const npCall = require('../npCall');

// @TODO
const SILENT_SUGAR_NOT_NECESSARILY_WORKS = {
    loglevel: 'silent',
    silent: true,
    logstream: new DevNull(),
    progress: false
};

const load = _.memoize(nUtil.promisify(npm.load).bind(npm, SILENT_SUGAR_NOT_NECESSARILY_WORKS));

const normalizeNpmCommand = (command) =>
    async function(...args) {
        await load();
        return npCall(npm.commands[command], args);
    };

const view = normalizeNpmCommand('view');
const search = normalizeNpmCommand('search');

const install = (option) => {
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
                resolve({ version, name, path });
            }
        });
    });
};

module.exports = {
    view,
    search,
    install
};
