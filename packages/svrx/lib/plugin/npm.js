const npm = require('npm');
const npmi = require('npmi');
const _ = require('lodash');
const nUtil = require('util');
const libPath = require('path');

const { npCall } = require('../util/helper');

const load = _.memoize(
    nUtil.promisify(npm.load).bind(npm, {
        loglevel: 'silent',
        silent: true
    })
);

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
                    name,
                    version,
                    path
                });
            }
        });
    });
}

module.exports = {
    view,
    search,
    install
};
