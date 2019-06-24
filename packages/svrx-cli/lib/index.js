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
    if (this.loaded) return;
    await config.loadFile();
    this.loaded = true;
  }

  static async loadSvrx(optionsFromCli = {}) {
    const cliVersion = optionsFromCli.svrx || optionsFromCli.v;
    const rcVersion = config.getConfig().svrx;
    // use the latest version in local if no version supplied
    const version = cliVersion || rcVersion || (await local.getLatestVersion());

    if (!version || !local.exists(version)) {
      await registry.install(version || 'latest');
    }
    return local.load(version, optionsFromCli);
  }

  static getLocalVersions() {
    return local.getVersions();
  }

  static async getRemoteVersions() {
    return registry.getVersions();
  }

  static async getRemoteTags() {
    return registry.getTags();
  }

  static async install(version) {
    return registry.install(version);
  }
}

module.exports = Manager;
