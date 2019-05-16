const fs = require('fs');
const path = require('path');
const config = require('./config');

const getSvrxPath = (version) => path.resolve(config.VERSIONS_ROOT, version, 'lib/svrx.js');
module.exports = {
    exists: (version) => {
        return fs.existsSync(getSvrxPath(version));
    },

    load: (version) =>
        new Promise(() => {
            const Svrx = require(getSvrxPath(version));
            return new Svrx();
        })
};
