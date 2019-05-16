const chalk = require('chalk');
const path = require('path');
const config = require('./config');
const local = require('./local');
const registry = require('./registry');

class Manager {
    static log(type = 'info', message = '') {
        switch (type) {
            case 'success':
                console.log(chalk.green(`\n${message}\n`));
                break;
            case 'error':
                console.log(chalk.bold.red(`\n${message}\n`));
                break;
            default:
                console.log(message);
                break;
        }
    }

    constructor() {
        try {
            config.createDirs();
        } catch (e) {
            Manager.log('error', e);
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
            Manager.log('error', e);
            process.exit(1);
        }
    }

    async loadSvrx() {
        try {
            const userConfigVersion = config.getConfig().version;
            const version = await registry.getSatisfiedVersion(userConfigVersion);

            if (!local.exists(version)) {
                await registry.install(version);
            }
            return local.load(version);
        } catch (e) {
            Manager.log('error', e);
            process.exit(1);
        }
    }
}

module.exports = Manager;
