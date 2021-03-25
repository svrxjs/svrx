const USER_HOME = require('os').homedir();
const mkdirp = require('mkdirp');
const fs = require('fs-extra');
const tmp = require('tmp');
const libPath = require('path');
const semver = require('semver');
const rimraf = require('rimraf');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const requireEnsure = (path) => {
  delete require.cache[path];
  /* eslint-disable global-require, import/no-dynamic-require */
  return require(path);
};
const getLatestVersion = (versionList) => {
  // stable versions is always in higher priority than beta versions
  versionList.sort((v1, v2) => (semver.lt(v1, v2) ? 1 : -1));

  const stableVersions = versionList.filter((v) => v.indexOf('-') === -1);
  if (stableVersions.length > 0) return stableVersions[0];
  return versionList.length > 0 ? versionList[0] : null;
};
const getDirectories = (source, filter) => {
  const { lstatSync, readdirSync } = fs;
  const isDirectory = (name) => lstatSync(libPath.join(source, name)).isDirectory();

  return readdirSync(source)
    .filter(isDirectory)
    .filter(filter || (() => true));
};
const rimrafPromise = (path) => new Promise((resolve) => rimraf(path, resolve));

class PackageManager {
  constructor(options) {
    const {
      name, path, version, coreVersion, registry, autoClean = true,
    } = options;
    this.name = name; // plugin name: foo, foo-bar, @scope/foo
    this.version = version; // plugin version. undefined for core
    this.coreVersion = coreVersion; // core version currently used
    this.path = path; // path for local loaded plugin
    this.registry = registry;
    this.autoClean = autoClean; // auto remove old packages

    // default params for core
    this.packageName = '@svrx/svrx';

    this.createDirs();
  }

  set(key, value) {
    this[key] = value;
  }

  getRoot() {
    return this.CORE_ROOT;
  }

  versionMatch() { // eslint-disable-line
    return true;
  }

  createDirs() {
    const { name } = this;
    const { SVRX_DIR } = process.env;
    if (!SVRX_DIR && !USER_HOME) {
      throw new Error('HOME or SVRX_DIR needs to be defined');
    }

    // where svrx dir exists
    this.SVRX_ROOT = SVRX_DIR || libPath.resolve(USER_HOME, '.svrx');
    // where versions of svrx core exist
    this.CORE_ROOT = libPath.resolve(this.SVRX_ROOT, 'versions');
    // where versions of this plugin exist
    this.PLUGIN_ROOT = libPath.resolve(this.SVRX_ROOT, 'plugins', name);

    mkdirp.sync(this.CORE_ROOT);
    mkdirp.sync(this.PLUGIN_ROOT);

    // where versions of package stored
    this.root = this.getRoot();
  }

  async load() {
    const {
      root, path, version, name,
    } = this;
    const readPackage = (dir) => {
      const jsonPath = libPath.join(dir, 'package.json');
      const json = fs.existsSync(jsonPath) ? requireEnsure(jsonPath) : null;
      const jsonVersion = json ? json.version : undefined;
      const jsonPattern = json && json.engines ? json.engines.svrx : '*';

      // validate version match only when load from local and remote
      if (!path && !this.versionMatch({ pattern: jsonPattern })) {
        throw new Error(
          `the version of plugin '${name}' is not matched to the svrx currently using`,
        );
      }

      const pkg = name === 'svrx'
        ? requireEnsure(libPath.join(dir, 'lib/svrx')) // require svrx core instead of the open api
        : requireEnsure(dir);
      return {
        name,
        path: dir,
        version: jsonVersion,
        module: pkg,
      };
    };

    // 1. load with path ( without installing
    if (path) {
      return readPackage(path);
    }

    // target version: user specify > localBestfit > remoteBestfit
    const targetVerison = await (async () => {
      if (version) return version;
      const localBestfit = this.getLocalBestfit();
      if (localBestfit) return localBestfit;
      const remoteBestfit = await this.getRemoteBestfit();
      if (remoteBestfit) return remoteBestfit;
      throw new Error(
        `there's no satisfied version of plugin ${name} for the svrx currently using`,
      );
    })();

    // 2. load from local
    if (this.exists(targetVerison)) {
      await this.autoclean(targetVerison); // auto clean on remote install
      // auto update package
      this.autoUpdate();
      return readPackage(libPath.join(root, targetVerison));
    }

    // 3. load from remote
    await this.install(targetVerison);
    return readPackage(libPath.join(root, targetVerison));
  }

  /**
   * @param {string|undefined} version
   * @returns {Promise<void>}
   */
  async install(version) {
    const {
      packageName, registry, root,
    } = this;

    try {
      const tmpPath = tmp.dirSync().name;
      const registryCmd = registry ? `--registry=${registry}` : '';
      const cmd = `
      npm install --prefix=${libPath.resolve(tmpPath)} ${packageName}@${version || 'latest'} -g ${registryCmd}
    `;

      const { stderr } = await exec(cmd);

      if (stderr && stderr.indexOf('WARN') === -1) {
        throw new Error(stderr);
      }
      const pkgFileLib = libPath.join(tmpPath, 'lib/node_modules', packageName, 'package.json');
      const pkgFileLibExist = fs.existsSync(pkgFileLib);
      const tmpFolder = pkgFileLibExist
        ? libPath.join(tmpPath, 'lib/node_modules', packageName)
        : libPath.join(tmpPath, 'node_modules', packageName);

      const installedVersion = (() => {
        const pkginfo = require(libPath.join(tmpFolder, 'package.json'));
        return (pkginfo && pkginfo.version) || '';
      })();
      if (!installedVersion) {
        throw new Error('no version installed');
      }

      const destFolder = libPath.join(root, installedVersion);
      fs.copySync(tmpFolder, destFolder, {
        dereference: true, // ensure linked folder is copied too
      });
    } catch (e) {
      throw new Error(`install failed: ${e}`);
    }
  }

  exists(version) {
    const { root } = this;
    return version && fs.existsSync(libPath.join(root, version, 'index.js'));
  }

  getLocalPackages() {
    const { root } = this;
    const isValidVersion = (name) => (!!semver.valid(name));
    const versions = (fs.existsSync(root) && getDirectories(root, isValidVersion)) || [];
    return versions.map((v) => {
      const pkg = require(libPath.join(root, v, 'package.json'));
      return {
        version: v,
        pattern: (pkg.engines && pkg.engines.svrx) || '*',
      };
    });
  }

  /**
   * @returns {null|string} the bestfit version
   */
  getLocalBestfit() {
    const packageList = this.getLocalPackages().filter((pkg) => this.versionMatch(pkg));
    const versionList = packageList.map((p) => p.version);

    return getLatestVersion(versionList);
  }

  async getRemotePackages() {
    const { packageName, registry } = this;
    try {
      const registryCmd = registry ? `--registry=${registry}` : '';
      const cmd = `npm view '${packageName}@*' engines ${registryCmd}`;

      const { stdout, stderr } = await exec(cmd);
      // eg: svrx-plugin-demo@1.0.3 { svrx: '^0.0.3' }
      // eg: @svrx/svrx@1.0.0 { node: '>=8.9.0' }

      if (!stdout || stderr) {
        throw new Error(stderr);
      }

      const results = stdout.split('\n');
      return results.map((str) => {
        const ind = str.indexOf('{');
        if (ind < 0) return null;
        const version = str.slice(packageName.length + 1, ind - 1);

        // cannot use regex to find the pattern due to special characters in stdout
        const engineInd = str.indexOf('svrx', ind);
        if (engineInd < 0) return { version };
        const engineQuoteStartInd = str.indexOf("'", engineInd);
        const engineQuoteEndInd = str.indexOf("'", engineQuoteStartInd + 1);
        const pattern = str.slice(engineQuoteStartInd + 1, engineQuoteEndInd);
        return {
          version,
          pattern,
        };
      }).filter((item) => item);
    } catch (e) {
      throw new Error(`install error: package '${packageName}' not found: ${e}`);
    }
  }

  /**
   * @returns {null|string} the bestfit version
   */
  async getRemoteBestfit() {
    const packageList = (await this.getRemotePackages()).filter((pkg) => this.versionMatch(pkg));
    const versionList = packageList.map((p) => p.version);

    return getLatestVersion(versionList);
  }

  /**
   * @returns {null|string} the latest version
   */
  async getRemoteLatest() {
    const packageList = await this.getRemotePackages();
    const versionList = packageList.map((p) => p.version);

    return getLatestVersion(versionList);
  }

  /**
   * get all local installed plugins and versions
   * @returns {{versions: (*|Array), name: *}[]}
   */
  getLocalPlugins() {
    const { SVRX_ROOT } = this;
    const pluginsRoot = libPath.resolve(SVRX_ROOT, 'plugins');
    const plugins = (fs.existsSync(pluginsRoot) && getDirectories(pluginsRoot)) || [];
    const isValidVersion = (name) => (!!semver.valid(name));

    return plugins.map((name) => {
      const pluginRoot = libPath.resolve(pluginsRoot, name);
      return {
        name,
        versions: (fs.existsSync(pluginRoot) && getDirectories(pluginRoot, isValidVersion)) || [],
      };
    }).filter((p) => p.versions.length > 0);
  }

  /**
   * remove dirs
   * @param packageToRemove  1.0.2, webpack, webpack/1.0.0, ALL, CORE, PLUGIN
   * @returns {Promise<boolean>} isSuccess
   */
  async remove(packageToRemove) {
    const { SVRX_ROOT, CORE_ROOT } = this;
    const pluginsRoot = libPath.join(SVRX_ROOT, 'plugins');

    /* istanbul ignore if */
    if (packageToRemove === 'ALL') {
      await rimrafPromise(SVRX_ROOT);
      return true;
    }

    /* istanbul ignore if */
    if (packageToRemove === 'CORE') {
      await rimrafPromise(CORE_ROOT);
      return true;
    }

    /* istanbul ignore if */
    if (packageToRemove === 'PLUGIN') {
      await rimrafPromise(pluginsRoot);
      return true;
    }

    const versionPath = libPath.join(CORE_ROOT, packageToRemove);
    if (fs.existsSync(versionPath)) {
      await rimrafPromise(versionPath);
      return true;
    }

    const pluginPath = libPath.join(pluginsRoot, packageToRemove);
    if (fs.existsSync(pluginPath)) {
      await rimrafPromise(pluginPath);
      return true;
    }

    return false;
  }

  async autoUpdate() {
    try {
      const latestVersion = await this.getRemoteLatest();
      if (!this.exists(latestVersion)) {
        await this.install(latestVersion);
      }
    } catch (e) {
      // nevermind if auto download failed
    }
  }

  async autoclean(targetVerison) {
    const { autoClean, root, version } = this;
    if (!autoClean) return;

    // clean inside root, exclude this.version & latest version
    const isValidVersion = (name) => (!!semver.valid(name));

    const versions = getDirectories(root, isValidVersion);
    const latestVersion = getLatestVersion(versions);

    const promises = versions
      .filter((v) => v !== latestVersion && v !== version && v !== targetVerison)
      .map((v) => rimrafPromise(libPath.join(root, v)));

    await Promise.all(promises);
  }
}

module.exports = PackageManager;
