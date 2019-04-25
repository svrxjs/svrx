const npm = require('npm');
const npmi = require('npmi');
const _ = require('lodash');
const nUtil = require('util');

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
    return new Promise((resolve, reject) => {
        npmi(option, (err, result) => {
            if (err) return reject(err);
            else {
                if (!result) return resolve(result);
                let len = result.length;
                const [name, version] = result[len - 1][0].split('@');
                resolve({
                    name,
                    version,
                    path: result[len - 1][1]
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
