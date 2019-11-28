const expect = require('expect.js');
const libPath = require('path');
const fs = require('fs-extra');
const PackageManagerCreator = require('../../lib/package-manager');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');
const TEST_CORE_PATH = libPath.join(__dirname, '../../../svrx');
const ERROR_NO_VERSION_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-error-no-version');
const ERROR_NO_PACKAGE_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-no-package');
const TEST_SVRX_DIR = libPath.join(__dirname, '../fixture/.svrx');

describe('Package Manager', () => {
  const { SVRX_DIR } = process.env;
  before(() => {
    process.env.SVRX_DIR = TEST_SVRX_DIR;
  });
  after(() => {
    process.env.SVRX_DIR = SVRX_DIR;
  });

  describe('load CORE package', () => {
    /* loads */
    it('should work fine when load with a local path', async () => {
      const pm = PackageManagerCreator({
        path: TEST_CORE_PATH,
      });
      const core = await pm.load();
      expect(core.name).to.equal('svrx');
      expect(core.path).to.equal(TEST_CORE_PATH);
      expect(core.version)
        .to
        .equal((require(libPath.join(TEST_CORE_PATH, 'package.json'))).version); // eslint-disable-line
    });
    it('should work fine when load without a specific version(local)', async () => {
      const pm = PackageManagerCreator({
        version: '1.0.6',
      });
      const core = await pm.load();
      expect(core.name).to.equal('svrx');
      expect(core.version).to.equal('1.0.6');
      expect(core.path).to.equal(libPath.join(TEST_SVRX_DIR, 'versions/1.0.6'));
    }).timeout(100000);
    it('should work fine when load without a specific version(remote)', async () => {
      const pm = PackageManagerCreator();
      const LATEST_CORE_VERSION = await pm.getRemoteLatest();
      after(async () => {
        await pm.remove(LATEST_CORE_VERSION);
      });
      const core = await pm.load();
      expect(core.name).to.equal('svrx');
      expect(core.version).to.equal(LATEST_CORE_VERSION);
    }).timeout(100000);
    it('should work fine when load with a remote version and auto load a latest version', async () => {
      const storePath = libPath.join(TEST_SVRX_DIR, 'versions/1.0.2');
      const pm = PackageManagerCreator({
        version: '1.0.2',
      });
      const LATEST_CORE_VERSION = await pm.getRemoteLatest();

      after(async () => {
        await pm.remove('1.0.2');
        await pm.remove(LATEST_CORE_VERSION);
      });

      const core = await pm.load();
      const storePathLatest = libPath.join(TEST_SVRX_DIR, 'versions', LATEST_CORE_VERSION);
      expect(core.name).to.equal('svrx');
      expect(core.version).to.equal('1.0.2');
      expect(core.path).to.equal(storePath);
      expect(fs.existsSync(libPath.join(storePathLatest, 'index.js')))
        .to
        .equal(true);
    }).timeout(100000);

    /* funcs */
    it('should return file status through #exists()', async () => {
      const pm = PackageManagerCreator();
      expect(pm.exists('1.0.6')).to.equal(true);
      expect(pm.exists('1.0.1')).to.equal(false);
    });
    it('should return all local plugins through #getLocalPlugins()', () => {
      const pm = PackageManagerCreator();
      expect(pm.getLocalPlugins()).to.eql([{
        name: 'hello',
        versions: ['0.0.5', '1.0.0', '1.0.1'],
      }]);
    });

    /* errors */
    it('should report error when unmatched version', (done) => {
      const pm = PackageManagerCreator({
        version: '10.0.0',
      });
      pm.load().catch((e) => {
        expect(e)
          .to
          .match(/No matching version found for @svrx\/svrx@10\.0\.0/);
        done();
      });
    }).timeout(100000);
  });

  describe('load PLUGIN package', () => {
    /* loads */
    it('should work fine when load with a local path', async () => {
      const pm = PackageManagerCreator({
        plugin: 'test',
        coreVersion: '0.0.1',
        path: TEST_PLUGIN_PATH,
      });
      const plugin = await pm.load();
      expect(plugin.name).to.equal('test');
      expect(plugin.version).to.equal('0.0.1');
      expect(plugin.path).to.equal(TEST_PLUGIN_PATH);
    });
    it('should work fine when load a local package without version', async () => {
      const pm = PackageManagerCreator({
        plugin: 'error-no-version',
        path: ERROR_NO_VERSION_PLUGIN_PATH,
        coreVersion: '0.0.1',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.equal('error-no-version');
      expect(plugin.version).to.equal(undefined);
      expect(plugin.path).to.equal(ERROR_NO_VERSION_PLUGIN_PATH);
    });
    it('should work fine when load with a local version', async () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '1.0.0',
        version: '1.0.1',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.equal('hello');
      expect(plugin.version).to.equal('1.0.1');
      expect(plugin.path)
        .to
        .equal(libPath.join(TEST_SVRX_DIR, 'plugins/hello/1.0.1'));
    });
    it('should work fine when load with a remote version and auto load a latest version', async () => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.2',
        version: '1.0.2',
      });

      const storePath = libPath.join(TEST_SVRX_DIR, 'plugins/demo/1.0.2');
      const storePathLatest = libPath.join(TEST_SVRX_DIR, 'plugins/demo/1.0.3');
      after(async () => {
        await pm.remove('demo/1.0.2');
        await pm.remove('demo/1.0.3');
      });

      const plugin = await pm.load();
      expect(plugin.name).to.equal('demo');
      expect(plugin.version).to.equal('1.0.2');
      expect(plugin.path).to.equal(storePath);
      expect(fs.existsSync(libPath.join(storePathLatest, 'index.js')))
        .to
        .equal(true);
    }).timeout(10000);
    it('should work fine when load without a specific version(local)', async () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '0.0.2',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.equal('hello');
      expect(plugin.version).to.equal('0.0.5');
      expect(plugin.path)
        .to
        .equal(libPath.join(TEST_SVRX_DIR, 'plugins/hello/0.0.5'));
    });
    it('should work fine when load without a specific version(remote)', async () => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.3',
      });
      const storePath = libPath.join(TEST_SVRX_DIR, 'plugins/demo/1.0.3');
      after(async () => {
        await pm.remove('demo/1.0.3');
      });

      const plugin = await pm.load();
      expect(plugin.name).to.equal('demo');
      expect(plugin.version).to.equal('1.0.3');
      expect(plugin.path).to.equal(storePath);
    }).timeout(10000);
    it('should return undefined for version when no package.json exist in local package', async () => {
      const pm = PackageManagerCreator({
        plugin: 'no-package',
        path: ERROR_NO_PACKAGE_PLUGIN_PATH,
        coreVersion: '0.0.3',
      });
      const result = await pm.load();
      expect(result.version).to.equal(undefined);
    });

    /* funcs */
    it('should return file status through #exists()', () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '1.0.0',
      });
      expect(pm.exists('0.0.5')).to.equal(true);
      expect(pm.exists('1.0.0')).to.equal(true);
      expect(pm.exists('1.0.2')).to.equal(false);
    });
    it('should return the best fit version through #getLocalBestfit()', () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '1.0.0',
      });
      expect(pm.getLocalBestfit()).to.equal('1.0.1');
      const pm2 = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '0.0.1',
      });
      expect(pm2.getLocalBestfit()).to.equal('0.0.5');
    });
    it('should return the best fit version through #getRemoteBestfit()', async () => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.2',
      });
      expect(await pm.getRemoteBestfit()).to.equal('1.0.2');
      const pm2 = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.3',
      });
      expect(await pm2.getRemoteBestfit()).to.equal('1.0.3');
    }).timeout(10000);

    /* errors */
    it('should report error when unmatched version', (done) => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.3',
        version: '1.0.2',
      });
      pm.load().catch((e) => {
        expect(e)
          .to
          .match(/the version of plugin 'demo' is not matched to the svrx currently using/);
        done();
      });
    }).timeout(10000);
    it('should report error when no version match for current svrx', (done) => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '2.0.0',
      });
      pm.load().catch((e) => {
        expect(e)
          .to
          .match(/there's no satisfied version of plugin demo for the svrx currently using/);
        done();
      });
    }).timeout(10000);
    it('should report error when no remote packages found', (done) => {
      const pm = PackageManagerCreator({
        plugin: 'not-exist-plugin',
        coreVersion: '1.0.0',
      });
      pm.load().catch((e) => {
        expect(e)
          .to
          .match(/install error: package 'svrx-plugin-not-exist-plugin' not found/);
        done();
      });
    }).timeout(10000);
  });
});
