const expect = require('expect.js');
const libPath = require('path');
const sinon = require('sinon');
const { createServer } = require('../../util');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../../fixture/plugin/svrx-plugin-test');

function requireEnsure(path) {
  delete require.cache[path];
  /* eslint-disable global-require, import/no-dynamic-require */
  return require(path);
}

describe('Plugin Config', () => {
  describe('functions', () => {
    let testPlugin;
    let builtinConfig;
    before(async () => {
      const server = createServer({
        plugins: [{
          path: TEST_PLUGIN_PATH,
        }],
      });
      await server.setup();
      testPlugin = server.config.getPlugin('test');
      testPlugin = server.config.getPlugin('test');
      builtinConfig = server.config;
    });

    it('should return value correctly when #get()', () => {
      expect(testPlugin.get('none-exist')).to.equal(undefined);
      expect(testPlugin.get('limit')).to.equal(100);
      expect(testPlugin.get('$.port')).to.equal(8000); // builtin config
    });

    it('should set value correctly when #set()', () => {
      testPlugin.set('foo', 'bar');
      testPlugin.set('a.b', 'ab');
      testPlugin.set('c.d', { obj: 'obj' });
      expect(testPlugin.get('foo')).to.equal('bar');
      expect(testPlugin.get('a.b')).to.equal('ab');
      expect(testPlugin.get('c.d')).to.eql({ obj: 'obj' });
    });

    it('should not modify builtin configs by #set()', () => {
      testPlugin.set('$.port', 3000);
      expect(testPlugin.get('$.port')).to.not.equal(3000);
    });

    it('should keep #watch() on configs', (done) => {
      const release = testPlugin.watch((evt) => {
        expect(evt.affect()).to.equal(true);
        expect(evt.affect('watch.b.c')).to.equal(true);
        expect(evt.affect('watch')).to.equal(true);
        expect(evt.affect('watch.c')).to.equal(false);
        release();
        done();
      });
      testPlugin.set('watch.b.c', 'world');
    });

    it('should keep #watch($.port) on builtin configs', (done) => {
      const release = testPlugin.watch('$.port', (evt) => {
        expect(evt.affect()).to.equal(true);
        release();
        done();
      });
      builtinConfig.set('port', 3000);
    });

    it('should keep #watch($) on builtin configs', (done) => {
      const release = testPlugin.watch('$', (evt) => {
        expect(evt.affect('port')).to.equal(true);
        release();
        done();
      });
      builtinConfig.set('port', 4000);
    });

    it('should keep #watch($.a) multi-level builtin configs', (done) => {
      const release = testPlugin.watch('$.a', (evt) => {
        expect(evt.affect('b.c')).to.equal(true);
        expect(evt.affect('b.d')).to.equal(false);
        release();
        done();
      });
      builtinConfig.set('a.b.c', 3000);
    });

    it('should delete a config after #del()', () => {
      testPlugin.set('test.del.item', 'hello');
      expect(testPlugin.get('test.del.item')).to.equal('hello');
      testPlugin.del('test.del.item');
      expect(testPlugin.get('test.del.item')).to.eql(undefined);

      testPlugin.del('none.exists.config');
      expect(testPlugin.get('none.exists.config')).to.eql(undefined);
    });

    it('should splice an array config after #splice()', () => {
      testPlugin.set('test.splice.item', [1, 2, 3]);
      testPlugin.splice('test.splice.item', 0, 1);
      expect(testPlugin.get('test.splice.item')).to.eql([2, 3]);
    });
  });

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

  it('should return all builtin options when get(\'$\')', () => {
    const server = createServer({
      plugins: ['test'],
    });
    const { config } = server;
    expect(config.getPlugin('test').get('$')).to.eql(
      config.get(),
    );
  });

  it('should return plugin schema using getSchema()', async () => {
    const server = createServer({
      plugins: [{
        path: TEST_PLUGIN_PATH,
      }],
    });
    await server.setup();
    const { config } = server;
    expect(config.getPlugin('test').getSchema()).to.eql({ limit: { type: 'number', default: 100 } });
  });
});
