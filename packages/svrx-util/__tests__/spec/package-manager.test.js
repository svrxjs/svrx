const expect = require('expect.js');
const libPath = require('path');
const rimraf = require('rimraf');
const PackageManagerCreator = require('../../lib/package-manager');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');
const ERROR_NO_VERSION_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-error-no-version');
const ERROR_NO_PACKAGE_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-no-package');
const TEST_SVRX_DIR = libPath.join(__dirname, '../fixture/.svrx');

const cleanModule = (path) => new Promise((resolve) => rimraf(path, resolve));

describe('Package Manager', () => {
  const { SVRX_DIR } = process.env;
  before(() => {
    process.env.SVRX_DIR = TEST_SVRX_DIR;
  });
  after(() => {
    process.env.SVRX_DIR = SVRX_DIR;
  });

  describe('load CORE package', () => {
    // todo
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
      expect(plugin.name).to.eql('test');
      expect(plugin.version).to.eql('0.0.1');
      expect(plugin.path).to.eql(TEST_PLUGIN_PATH);
    });
    it('should work fine when load a local package without version', async () => {
      const pm = PackageManagerCreator({
        plugin: 'error-no-version',
        path: ERROR_NO_VERSION_PLUGIN_PATH,
        coreVersion: '0.0.1',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('error-no-version');
      expect(plugin.version).to.eql(undefined);
      expect(plugin.path).to.eql(ERROR_NO_VERSION_PLUGIN_PATH);
    });
    it('should work fine when load with a local version', async () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '1.0.0',
        version: '1.0.1',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('hello');
      expect(plugin.version).to.eql('1.0.1');
      expect(plugin.path).to.eql(libPath.join(TEST_SVRX_DIR, 'plugins/hello/1.0.1'));
    });
    it('should work fine when load with a remote version', async () => {
      const storePath = libPath.join(TEST_SVRX_DIR, 'plugins/demo/1.0.2');
      after(async () => {
        await cleanModule(storePath);
      });
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.2',
        version: '1.0.2',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('demo');
      expect(plugin.version).to.eql('1.0.2');
      expect(plugin.path).to.eql(storePath);
    }).timeout(10000);
    it('should work fine when load without a specific version(local)', async () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '0.0.2',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('hello');
      expect(plugin.version).to.eql('0.0.5');
      expect(plugin.path).to.eql(libPath.join(TEST_SVRX_DIR, 'plugins/hello/0.0.5'));
    });
    it('should work fine when load without a specific version(remote)', async () => {
      const storePath = libPath.join(TEST_SVRX_DIR, 'plugins/demo/1.0.3');
      after(async () => {
        await cleanModule(storePath);
      });
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.3',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('demo');
      expect(plugin.version).to.eql('1.0.3');
      expect(plugin.path).to.eql(storePath);
    }).timeout(10000);
    it('should return undefined for version when no package.json exist in local package', async () => {
      const pm = PackageManagerCreator({
        plugin: 'no-package',
        path: ERROR_NO_PACKAGE_PLUGIN_PATH,
        coreVersion: '0.0.3',
      });
      const result = await pm.load();
      expect(result.version).to.eql(undefined);
    });

    /* funcs */
    it('should return file status through #exists()', () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '1.0.0',
      });
      expect(pm.exists('0.0.5')).to.eql(true);
      expect(pm.exists('1.0.0')).to.eql(true);
      expect(pm.exists('1.0.2')).to.eql(false);
    });
    it('should return the best fit version through #getLocalBestfit()', () => {
      const pm = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '1.0.0',
      });
      expect(pm.getLocalBestfit()).to.eql('1.0.1');
      const pm2 = PackageManagerCreator({
        plugin: 'hello',
        coreVersion: '0.0.1',
      });
      expect(pm2.getLocalBestfit()).to.eql('0.0.5');
    });
    it('should return the best fit version through #getRemoteBestfit()', async () => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.2',
      });
      expect(await pm.getRemoteBestfit()).to.eql('1.0.2');
      const pm2 = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.3',
      });
      expect(await pm2.getRemoteBestfit()).to.eql('1.0.3');
    });

    /* errors */
    it('should report error when unmatched version', (done) => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '0.0.3',
        version: '1.0.2',
      });
      pm.load().catch((e) => {
        expect(e).to.match(/the version of plugin 'demo' is not matched to the svrx currently using/);
        done();
      });
    }).timeout(10000);
    it('should report error when no version match for current svrx', (done) => {
      const pm = PackageManagerCreator({
        plugin: 'demo',
        coreVersion: '2.0.0',
      });
      pm.load().catch((e) => {
        expect(e).to.match(/there's no satisfied version of plugin demo for the svrx currently using/);
        done();
      });
    });
    it('should report error when no remote packages found', (done) => {
      const pm = PackageManagerCreator({
        plugin: 'not-exist-plugin',
        coreVersion: '1.0.0',
      });
      pm.load().catch((e) => {
        expect(e).to.match(/install error: package 'svrx-plugin-not-exist-plugin' not found/);
        done();
      });
    }).timeout(10000);
  });
});
