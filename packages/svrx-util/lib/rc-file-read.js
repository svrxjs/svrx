const { cosmiconfigSync } = require('cosmiconfig');
const userHome = require('os').homedir();
const path = require('path');
const fs = require('fs');

const RC_FILES = ['.svrxrc.js', 'svrx.config.js'];
const readGlobal = () => {
  const configRoot = process.env.SVRX_DIR;
  if (!configRoot && !userHome) {
    return {};
  }

  const root = configRoot || path.resolve(userHome, '.svrx');
  const fileName = RC_FILES.find((file) => fs.existsSync(path.join(root, 'config', file)));

  if (fileName) {
    return require(path.join(root, 'config', fileName)); // eslint-disable-line
  }

  return {};
};

const readScope = () => {
  const explorer = cosmiconfigSync('svrx', {
    searchPlaces: RC_FILES,
  });
  const result = explorer.search();
  if (result && !result.isEmpty) {
    return result.config;
  }
  return {};
};

module.exports = () => {
  const globalConfig = readGlobal();
  const scopeConfig = readScope();

  return { ...globalConfig, ...scopeConfig };
};
