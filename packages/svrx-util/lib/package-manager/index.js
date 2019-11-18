const PluginPackageManager = require('./plugin-package-manager');
const PackageManager = require('./package-manager');

const PackageManagerCreator = ({ plugin, ...options }) => (plugin
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
