const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');
const libFs = require('fs');
const npm = require('../../lib/npm');

const MODULE_PATH = libPath.join(__dirname, '../fixture/plugin');
const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');

function cleanModule(done) {
  rimraf(libPath.join(MODULE_PATH, 'node_modules'), () => {
    rimraf(libPath.join(MODULE_PATH, 'packag*.json'), done);
  });
}

describe('npm', () => {
  before((done) => {
    cleanModule(done);
    // runs before all tests in this block
  });

  afterEach((done) => {
    cleanModule(done);
  });
  it('basic usage', (done) => {
    npm.install({
      path: MODULE_PATH,
      name: 'lodash.noop',
      version: '3.0.0',
    }).then((result) => {
      expect(result.version).to.equal('3.0.0');
      const expectModulePath = libPath.join(MODULE_PATH, '/node_modules/lodash.noop');
      const expectModuleRealPath = libPath.join(MODULE_PATH, '/node_modules/_lodash.noop@3.0.0@lodash.noop');
      expect(result.path).to.equal(expectModulePath);
      expect(libFs.statSync(expectModulePath).isDirectory()).to.equal(true);
      expect(libFs.existsSync(expectModuleRealPath)).to.equal(true);
      done();
    });
  }).timeout(10000);

  it('CLI: global install', (done) => {
    npm.install({
      global: true,
      path: MODULE_PATH,
      name: 'lodash.noop',
      version: '3.0.0',
    }).then((result) => {
      expect(result.version).to.equal('3.0.0');
      const expectModulePath = libPath.join(MODULE_PATH, '/node_modules/lodash.noop');
      const expectModuleRealPath = libPath.join(MODULE_PATH, '/node_modules/_lodash.noop@3.0.0@lodash.noop');
      expect(result.path).to.equal(expectModulePath);
      expect(libFs.statSync(expectModulePath).isDirectory()).to.equal(true);
      expect(libFs.existsSync(expectModuleRealPath)).to.equal(false);
      done();
    });
  }).timeout(10000);

  it('load module: local install', (done) => {
    npm.install({
      nameReal: 'svrx-plugin-test',
      name: TEST_PLUGIN_PATH,
      localInstall: true,
      path: MODULE_PATH,
    }).then((ret) => {
      expect(ret.name).to.equal('svrx-plugin-test');
      expect(ret.version).to.equal('0.0.1');
      /* eslint-disable global-require, import/no-dynamic-require */
      const testModule = require(libPath.join(TEST_PLUGIN_PATH));
      expect(testModule.name).to.equal('test');
      done();
    });
  }).timeout(10000);

  it('npm view version', (done) => {
    npm.view(['svrx-plugin-demo@*', 'engines']).then((ret) => {
      Object.keys(ret).forEach((i) => {
        expect(ret[i].engines.svrx).to.not.equal(undefined);
      });
      done();
    });
  }).timeout(10000);
});
