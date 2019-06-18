const path = require('path');
const { logger } = require('svrx-util');
const config = require('./config');
const local = require('./local');
const registry = require('./registry');

class Manager {
    constructor() {
        try {
            config.createDirs();
            this.setWorkRoot();
        } catch (e) {
            logger.error(e);
            process.exit(1);
        }
    }

    setWorkRoot(dir = '') {
        this.WORK_ROOT = path.resolve(process.cwd(), dir);
        config.setWorkRoot(this.WORK_ROOT);
    }

    async loadConfigFile() {
        try {
            await config.loadFile();
        } catch (e) {
            logger.error(e);
            process.exit(1);
        }
    }

    async loadSvrx(optionsFromCli = {}) {
        try {
            const cliVersion = optionsFromCli.svrx || optionsFromCli.v;
            const rcVersion = config.getConfig().svrx;
            const version = cliVersion || (await registry.getSatisfiedVersion(rcVersion));

            if (!local.exists(version)) {
                await registry.install(version);
            }
            return local.load(version, optionsFromCli);
        } catch (e) {
            logger.error(e);
            process.exit(1);
        }
    }
}

module.exports = Manager;
