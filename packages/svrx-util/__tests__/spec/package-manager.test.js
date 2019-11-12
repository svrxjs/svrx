const expect = require('expect.js');
const libPath = require('path');
const rimraf = require('rimraf');
const PM = require('../../lib/package-manager');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');
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
    it('should work fine when load with a local path', async () => {
      const storePath = libPath.join(SVRX_DIR, 'plugins/test/1.0.0');
      after(async () => {
        await cleanModule(storePath);
      });
      const pm = new PM({
        plugin: 'test',
        coreVersion: '1.0.0',
        path: TEST_PLUGIN_PATH,
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('svrx-plugin-test');
      expect(plugin.version).to.eql('0.0.1');
      expect(plugin.path).to.eql(storePath);
    });
    it('should work fine when load with a local version', async () => {
      const pm = new PM({
        plugin: 'hello',
        coreVersion: '1.0.0',
        version: '1.0.1',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('svrx-plugin-hello');
      expect(plugin.version).to.eql('1.0.1');
      expect(plugin.path).to.eql(libPath.join(SVRX_DIR, 'plugins/hello/1.0.1'));
    });
    it('should work fine when load with a remote version', async () => {
      const storePath = libPath.join(SVRX_DIR, 'plugins/demo/1.0.2');
      after(async () => {
        await cleanModule(storePath);
      });
      const pm = new PM({
        plugin: 'demo',
        coreVersion: '0.0.2',
        version: '1.0.2',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('svrx-plugin-demo');
      expect(plugin.version).to.eql('1.0.2');
      expect(plugin.path).to.eql(storePath);
    }).timeout(10000);
    it('should work fine when load without a specific version(local)', async () => {
      const pm = new PM({
        plugin: 'hello',
        coreVersion: '0.0.2',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('svrx-plugin-hello');
      expect(plugin.version).to.eql('0.0.5');
      expect(plugin.path).to.eql(libPath.join(SVRX_DIR, 'plugins/hello/0.0.5'));
    });
    it('should work fine when load without a specific version(remote)', async () => {
      const storePath = libPath.join(SVRX_DIR, 'plugins/demo/1.0.3');
      after(async () => {
        await cleanModule(storePath);
      });
      const pm = new PM({
        plugin: 'demo',
        coreVersion: '0.0.3',
      });
      const plugin = await pm.load();
      expect(plugin.name).to.eql('svrx-plugin-demo');
      expect(plugin.version).to.eql('1.0.3');
      expect(plugin.path).to.eql(storePath);
    }).timeout(10000);
    it('should return file status through #exists()', () => {
      const pm = new PM({
        plugin: 'hello',
        coreVersion: '1.0.0',
        version: '1.0.0',
      });
      const pm2 = new PM({
        plugin: 'hello',
        coreVersion: '1.0.0',
        version: '1.0.2',
      });
      expect(pm.exists()).to.eql(true);
      expect(pm2.exists()).to.eql(false);
    });
    it('should return the best fit version through #getBestfitLocal()', () => {
      const pm = new PM({
        plugin: 'hello',
        coreVersion: '1.0.0',
      });
      expect(pm.getBestfitLocal()).to.eql('1.0.1');
      const pm2 = new PM({
        plugin: 'hello',
        coreVersion: '0.0.1',
      });
      expect(pm2.getBestfitLocal()).to.eql('0.0.5');
    });
    it('should return the best fit version through #getBestfitRemote()', () => {
      const pm = new PM({
        plugin: 'demo',
        coreVersion: '0.0.2',
      });
      expect(pm.getBestfitLocal()).to.eql('1.0.2');
      const pm2 = new PM({
        plugin: 'demo',
        coreVersion: '0.0.3',
      });
      expect(pm2.getBestfitLocal()).to.eql('1.0.3');
    });

    it('should report error when unmatched version', async () => {
      const pm = new PM({
        plugin: 'demo',
        coreVersion: '0.0.3',
        version: '1.0.10',
      });
      try {
        await pm.load();
      } catch (e) {
        expect(e).to.match(/version of plugin 'demo' is not matched to current version of svrx/);
      }
    }).timeout(10000);
  });
});
