const userHome = require('user-home');
const path = require('path');
const mkdirp = require('mkdirp');
const { rcFileRead } = require('svrx-util');

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
        reject(new Error('HOME or SVRX_DIR needs to be defined'));
        return;
      }

      // where svrx-cli config exists
      this.CONFIG_ROOT = configRoot || path.resolve(userHome, '.svrx');
      // where versions of svrx core exist
      this.VERSIONS_ROOT = path.resolve(this.CONFIG_ROOT, 'versions');

      mkdirp(this.VERSIONS_ROOT, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  setWorkRoot(dir) {
    this.WORK_ROOT = dir;
  }

  loadFile() {
    this.addConfigs(rcFileRead());
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
