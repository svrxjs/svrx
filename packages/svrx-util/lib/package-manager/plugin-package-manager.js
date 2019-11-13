const semver = require('semver');
const PackageManager = require('./package-manager');
const { normalizePluginName } = require('../name-formatter');

class PluginPackageManager extends PackageManager {
  constructor(options) {
    super(options);
    this.packageName = normalizePluginName(this.name);
  }

  getRoot() {
    return this.PLUGIN_ROOT;
  }

  versionMatch(pkg) {
    const { coreVersion } = this;
    return semver.satisfies(coreVersion, pkg.pattern);
  }
}

module.exports = PluginPackageManager;
