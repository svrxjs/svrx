const npm = require('npm');
const npmi = require('npmi');
const _ = require('lodash');
const nUtil = require('util');

const { npCall } = require('./helper');

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
const install = nUtil.promisify(npmi);

module.exports = {
    view,
    search,
    install
};
