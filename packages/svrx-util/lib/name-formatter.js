const PLUGIN_PREFIX = 'svrx-plugin-';
const scopeAndNameRegex = /^@([a-z\d][\w-.]+)\/([a-z\d][\w-.]*)/;

/**
 * combine pluginName to packageName
 * - foo -> svrx-plugin-foo
 * - foo-bar -> svrx-plugin-foo-bar
 * - @scope/foo -> @scope/svrx-plugin-foo
 * - @scope/foo-bar -> @scope/svrx-plugin-foo-bar
 * @param name
 * @returns {string|null|*}
 */
const normalizePluginName = (name) => {
  const combineName = (n) => (n.startsWith(PLUGIN_PREFIX) ? n : PLUGIN_PREFIX + n);
  const isScoped = name.startsWith('@');

  if (isScoped) {
    const matches = scopeAndNameRegex.exec(name);
    if (matches) {
      const scope = matches[1];
      const realName = matches[2];
      return `@${scope}/${combineName(realName)}`;
    }
    return null;
  }
  return combineName(name);
};

/**
 * parse packageName to pluginName (revert normalizePluginName())
 * @param packageName
 * @returns {null|*}
 */
const parsePluginName = (packageName) => {
  const isScoped = packageName.startsWith('@');
  const removePrefix = (n) => (n.startsWith(PLUGIN_PREFIX) ? n.slice(PLUGIN_PREFIX.length) : null);

  if (isScoped) {
    const matches = scopeAndNameRegex.exec(packageName);
    if (matches) {
      const scope = matches[1];
      const realName = matches[2];
      const formattedName = removePrefix(realName);
      return formattedName ? `@${scope}/${formattedName}` : null;
    }
    return null;
  }
  return removePrefix(packageName);
};

exports.normalizePluginName = normalizePluginName;
exports.parsePluginName = parsePluginName;
