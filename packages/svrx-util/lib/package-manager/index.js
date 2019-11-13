const PluginPackageManager = require('./plugin-package-manager');
const CorePackageManager = require('./core-package-manager');

const PackageManagerCreator = ({ plugin, ...options }) => (plugin
  ? new PluginPackageManager({
    name: plugin, // plugin name: foo, foo-bar, @scope/foo
    ...options,
  })
  : new CorePackageManager({
    name: 'svrx',
    ...options,
  })
);

module.exports = PackageManagerCreator;
