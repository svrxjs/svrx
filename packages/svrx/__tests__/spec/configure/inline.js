const expect = require('expect.js');
const libPath = require('path');
const fs = require('fs');
const sinon = require('sinon');
const { createServer } = require('../../util');
require('../../../lib/configure/index'); // required for module get

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../../fixture/plugin/svrx-plugin-test');
const NO_PACKAGE_PLUGIN_PATH = libPath.join(__dirname, '../../fixture/plugin/svrx-plugin-no-package');

describe('Inline/RC File Config', () => {
  describe('plugins', () => {
    it('should pick string plugins correctly', () => {
      const server = createServer({
        plugins: [
          'test', 'demo',
        ],
      });
      const testPlugin = server.config.getPlugin('test');
      const demoPlugin = server.config.getPlugin('demo');
      expect(testPlugin).not.to.be(undefined);
      expect(demoPlugin).not.to.be(undefined);
    });

    it('should pick obj plugins correctly', () => {
      const server = createServer({
        plugins: [
          {
            name: 'test',
          },
        ],
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
    });

    // pass plugin by path
    describe('Local plugin name parse', () => {
      it('should parse normal plugin name correctly', () => {
        const server = createServer({
          plugins: [
            {
              path: TEST_PLUGIN_PATH,
            },
          ],
        });
        const testPlugin = server.config.getPlugin('test');
        expect(testPlugin).not.to.be(undefined);
      });
      it('should get plugin name without package.json correctly', () => {
        const server = createServer({
          plugins: [
            {
              path: NO_PACKAGE_PLUGIN_PATH,
            },
          ],
        });
        const testPlugin = server.config.getPlugin('no-package');
        expect(testPlugin).not.to.be(undefined);
      });
      it('should parse plugin name from path correctly', () => {
        const fakes = [
          { path: '/fake/path/for/normal/plugin', name: 'svrx-plugin-foo', pluginName: 'foo' },
          { path: '/fake/path/for/normal/dash/plugin', name: 'svrx-plugin-foo-bar', pluginName: 'foo-bar' },
          { path: '/fake/path/for/scope/plugin', name: '@scope/svrx-plugin-foo', pluginName: '@scope/foo' },
          { path: '/fake/path/for/scope/dash/plugin', name: '@scope/svrx-plugin-foo-bar', pluginName: '@scope/foo-bar' },
        ];
        const moduleId = '/svrx/packages/svrx/lib/configure/index.js';

        fakes.forEach((fake) => {
          const fakePackagePath = `${fake.path}/package.json`;
          const existsSyncStub = sinon.stub(fs, 'existsSync');
          const configModule = module.children.find((mod) => mod.id.endsWith(moduleId));
          const requireStub = sinon.stub(configModule, 'require');

          // fake functions
          requireStub.withArgs(fakePackagePath).callsFake(() => ({ name: fake.name }));
          existsSyncStub.withArgs(fakePackagePath).callsFake(() => true);

          const server = createServer({
            plugins: [{ path: fake.path }],
          });
          const testPlugin = server.config.getPlugin(fake.pluginName);
          expect(testPlugin).not.to.be(undefined);
          requireStub.restore();
          existsSyncStub.restore();
        });
      });
    });
  });
});
