const fs = require('fs');
const path = require('path');
const config = require('./config');

const getSvrxPath = (version) => path.resolve(config.VERSIONS_ROOT, version, 'lib/svrx.js');
module.exports = {
    exists: (version) => {
        return fs.existsSync(getSvrxPath(version));
    },

    load: (version, optionsFromCli = {}) =>
        new Promise((resolve) => {
            const Svrx = require(getSvrxPath(version));
            resolve(new Svrx({}, optionsFromCli));
        })
};
