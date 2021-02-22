const PluginPackageManager = require('./plugin-package-manager');
const PackageManager = require('./package-manager');

/**
 * @example
 const pm = PackageManagerCreator({
  plugin: 'lodash', // will install svrx core if missing
  path: undefined, // if install from path
  version: '1.0.0',
  coreVersion: '1.0.1', // version of current svrx core
  autoClean: true, // auto remove old packages
});
 const pkg = await pm.load();
 */
const PackageManagerCreator = ({
  plugin,
  ...options
} = {}) => (plugin
  ? new PluginPackageManager({
    name: plugin, // plugin name: foo, foo-bar, @scope/foo
    ...options,
  })
  : new PackageManager({
    name: 'svrx',
    ...options,
  })
);

module.exports = PackageManagerCreator;
