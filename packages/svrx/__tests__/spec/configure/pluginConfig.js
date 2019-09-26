const expect = require('expect.js');
const libPath = require('path');
const sinon = require('sinon');
const { createServer } = require('../../util');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');

function requireEnsure(path) {
  delete require.cache[path];
  /* eslint-disable global-require, import/no-dynamic-require */
  return require(path);
}

describe('Plugin Config', () => {
  it('should return default values when get plugin(load from path) option', async () => {
    const server = createServer({
      plugins: [{
        path: TEST_PLUGIN_PATH,
      }],
    });
    await server.setup();
    const testPlugin = server.config.getPlugin('test');
    expect(testPlugin.get('limit')).to.equal(100);
  });

  it('should return default values when get plugin(load from remote) option', async () => {
    const server = createServer({
      plugins: ['remote'],
    });
    const fakeLoadOne = sinon.fake.resolves({
      name: 'remote',
      path: TEST_PLUGIN_PATH,
      module: requireEnsure(TEST_PLUGIN_PATH),
      version: requireEnsure(TEST_PLUGIN_PATH).version,
      pluginConfig: server.config.getPlugin('remote'),
    });

    const pluginDetail = await fakeLoadOne();
    await server.system.buildOne(pluginDetail);

    const testPlugin = server.config.getPlugin('remote');
    expect(testPlugin.get('limit')).to.equal(100);
    expect(testPlugin.get('$.port')).to.equal(8000);
    sinon.restore();
  });
});
