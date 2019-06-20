const cosmiconfig = require('cosmiconfig');
const userHome = require('user-home');
const path = require('path');
const fs = require('fs');

class Config {
    constructor() {
        if (Config.prototype.Instance === undefined) {
            this.config = {};
            Config.prototype.Instance = this;
        }
        return Config.prototype.Instance;
    }

    createDirs() {
        return new Promise((resolve, reject) => {
            const configRoot = process.env.SVRX_DIR;
            if (!configRoot && !userHome) {
                return reject(new Error('HOME or SVRX_DIR needs to be defined'));
            }

            // where svrx-cli config exists
            this.CONFIG_ROOT = configRoot || path.resolve(userHome, '.svrx');
            // where versions of svrx core exist
            this.VERSIONS_ROOT = path.resolve(this.CONFIG_ROOT, 'versions');

            fs.mkdir(this.VERSIONS_ROOT, { recursive: true }, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    setWorkRoot(dir) {
        this.WORK_ROOT = dir;
    }

    async loadFile() {
        const explorer = cosmiconfig('svrx', {
            searchPlaces: [`.svrxrc.js`, `svrx.config.js`]
        });
        const result = await explorer.search();
        if (!result || result.isEmpty) return;
        this.addConfigs(result.config);
    }

    addConfigs(configs) {
        Object.assign(this.config, configs);
    }

    getConfig() {
        return this.config;
    }
}

const config = new Config();

module.exports = config;
