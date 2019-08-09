const expect = require('expect.js');
const libPath = require('path');
const sinon = require('sinon');
const Option = require('../../lib/configure/option');
const CONFIGS = require('../../lib/config-list');
const { BUILTIN_PLUGIN } = require('../../lib/constant');
const defaults = require('../../lib/util/jsonSchemaDefaults');
const { createServer } = require('../util');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');
const BUILTIN_DEFAULTS = defaults({
  type: 'object',
  properties: CONFIGS,
});

function requireEnsure(path) {
  delete require.cache[path];
  /* eslint-disable global-require, import/no-dynamic-require */
  return require(path);
}

describe('CLI Config', () => {
  it('should replace alias with real param name', () => {
    const server = createServer({}, {
      p: 'test',
    });
    const testPlugin = server.config.getPlugin('test');
    expect(testPlugin).not.to.be(undefined);
  });

  it('should format string with comma to array values', () => {
    const server = createServer({}, {
      livereload: {
        exclude: 'a,b,c',
      },
    });
    const livereload = server.config.get('livereload');
    expect(livereload.exclude).to.eql(['a', 'b', 'c']);
  });

  it('should read boolean value correctly', () => {
    const server = createServer({}, {
      livereload: false,
      serve: true,
    });
    const livereload = server.config.get('livereload');
    const serve = server.config.get('serve');
    expect(livereload).to.eql(false);
    expect(serve).to.eql(true);
  });

  it('should remove dashed params and keep camel ones', () => {
    // svrx --history-api-fallback
    const server = createServer({}, {
      historyApiFallback: true,
      'history-api-fallback': true,
    });
    const camel = server.config.get('historyApiFallback');
    const dash = server.config.get('history-api-fallback');
    expect(camel).to.equal(true);
    expect(dash).to.equal(undefined);
  });

  describe('add plugin and options with --plugin', () => {
    it('add a plugin', () => {
      // --plugin test
      const server = createServer({}, {
        plugin: 'test',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
    });

    it('add plugins', () => {
      // --plugin demo --plugin test
      const server = createServer({}, {
        plugin: ['test', 'demo'],
      });
      const testPlugin = server.config.getPlugin('test');
      const demoPlugin = server.config.getPlugin('demo');
      expect(testPlugin).not.to.be(undefined);
      expect(demoPlugin).not.to.be(undefined);
    });

    it('add a plugin with options', () => {
      // --plugin test?foo=bar
      const server = createServer({}, {
        plugin: 'test?foo=bar',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.get('foo')).to.equal('bar');
    });

    it('add plugins with options', () => {
      // --plugin test?foo=bar
      const server = createServer({}, {
        plugin: [
          'test?foo=bar',
          'demo?foo2=str&bar2=far',
        ],
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.get('foo')).to.equal('bar');

      const demoPlugin = server.config.getPlugin('demo');
      expect(demoPlugin).not.to.be(undefined);
      expect(demoPlugin.get('foo2')).to.equal('str');
      expect(demoPlugin.get('bar2')).to.equal('far');
    });

    it('add a plugin with version', () => {
      // --plugin test@0.0.1
      const server = createServer({}, {
        plugin: 'test@0.0.1',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.equal('0.0.1');
    });

    it('add a plugin with version,options', () => {
      // --plugin test@0.0.1?foo=bar&bar=foo
      const server = createServer({}, {
        plugin: 'test@0.0.1?foo=bar&bar=foo',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.equal('0.0.1');
      expect(testPlugin.get('foo')).to.equal('bar');
      expect(testPlugin.get('bar')).to.equal('foo');
    });

    it('add plugins with version,options', () => {
      // --plugin test@0.0.1?foo=bar&bar=foo --plugin demo@1.0.1?foo=bar
      const server = createServer({}, {
        plugin: [
          'test@0.0.1?foo=bar&bar=foo',
          'demo@1.0.1?foo=bar',
        ],
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.equal('0.0.1');
      expect(testPlugin.get('foo')).to.equal('bar');
      expect(testPlugin.get('bar')).to.equal('foo');
      const demoPlugin = server.config.getPlugin('demo');
      expect(demoPlugin).not.to.be(undefined);
      expect(demoPlugin.getInfo('version')).to.equal('1.0.1');
      expect(demoPlugin.get('foo')).to.equal('bar');
    });

    it('add scoped plugin', () => {
      // --plugin @scope/test
      const server = createServer({}, {
        plugin: '@scope/test',
      });
      const testPlugin = server.config.getPlugin('@scope/test');
      expect(testPlugin).not.to.be(undefined);
    });

    it('add scoped plugin with version', () => {
      // --plugin @scope/test@1.0.0
      const server = createServer({}, {
        plugin: '@scope/test@1.0.0',
      });
      const testPlugin = server.config.getPlugin('@scope/test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.equal('1.0.0');
    });

    it('add scoped plugin with version,options', () => {
      // --plugin @scope/test@1.0.0?foo=bar
      const server = createServer({}, {
        plugin: '@scope/test@1.0.0?foo=bar',
      });
      const testPlugin = server.config.getPlugin('@scope/test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.equal('1.0.0');
      expect(testPlugin.get('foo')).to.equal('bar');
    });

    it('add wrong format string', () => {
      const server = createServer({}, {
        plugin: [
          'wrong@1?foo=bar',
        ],
      });
      const wrongPlugin = server.config.getPlugin('wrong');
      expect(wrongPlugin).to.be(undefined);
    });
  });

  describe('parse --plugin string options', () => {
    it('should parse number string as number', () => {
      const server = createServer({}, {
        plugin: 'test?number=123',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin.get('number')).to.equal(123);
    });

    it('should parse boolean string as boolean', () => {
      const server = createServer({}, {
        plugin: 'test?really=true&nah=false',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin.get('really')).to.equal(true);
      expect(testPlugin.get('nah')).to.equal(false);
    });

    it('should parse "undefined" as undefined', () => {
      const server = createServer({}, {
        plugin: 'test?undefined=undefined',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin.get('undefined')).to.equal(undefined);
    });

    it('should parse "null" as null', () => {
      const server = createServer({}, {
        plugin: 'test?null=null',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin.get('null')).to.equal(null);
    });

    it('should parse string with dot', () => {
      const server = createServer({}, {
        plugin: 'webpack?file=custom.config.js',
      });
      const testPlugin = server.config.getPlugin('webpack');
      expect(testPlugin.get('file')).to.equal('custom.config.js');
    });

    it('should parse single param to empty string', () => {
      const server = createServer({}, {
        plugin: [
          'test?foo&bar=foo',
        ],
      });
      const plugin = server.config.getPlugin('test');
      expect(plugin.get('foo')).to.eql('');
      expect(plugin.get('bar')).to.eql('foo');
    });
  });

  describe('add plugin with shortcut', () => {
    it('should enable plugin with --pluginName', () => {
      const server = createServer({}, {
        test: true,
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
    });

    it('should disable plugin with --no-pluginName', () => {
      const server = createServer({}, {
        test: false,
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).to.be(undefined);
    });

    it('should enable multiple plugins', () => {
      const server = createServer({}, {
        test: true,
        test2: true,
      });
      const testPlugin = server.config.getPlugin('test');
      const testPlugin2 = server.config.getPlugin('test2');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin2).not.to.be(undefined);
    });
  });
});

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

    it('should parse local plugin name correctly', () => {
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
  });
});

describe('Builtin Configs', () => {
  it('should fill all default values', () => {
    const server = createServer();
    Object.keys(CONFIGS).forEach((key) => {
      const value = CONFIGS[key];
      if (value.default !== undefined && key !== 'open' && key
        !== 'livereload') {
        expect(server.config.get(key)).to.eql(value.default);
      }
    });
  });

  it('should enable all builtin plugins by default', () => {
    const server = createServer();
    const plugins = server.config.getPlugins();
    expect(plugins.length).to.eql(BUILTIN_PLUGIN.length);
    expect(plugins.map(p => p.getInfo('name'))).to.eql(BUILTIN_PLUGIN);
  });

  it('should concat array values from CLI and RC', () => {
    const server = createServer({
      proxy: ['a'],
    }, {
      proxy: ['b'],
    });
    expect(server.config.get('proxy')).to.eql(['a', 'b']);
  });
});

describe('Config get', () => {
  const server = createServer({
    port: 3000,
    plugins: [
      {
        name: 'test',
        version: '0.0.1',
        inplace: true,
        configSchema: {
          foo: {
            type: 'string',
            default: 'bar',
          },
        },
        options: {
          op: 123,
        },
      },
    ],
  });
  const { config } = server;
  const testPlugin = config.getPlugin('test');

  it('should get builtin value corrently', () => {
    expect(config.get('port')).to.equal(3000);
  });

  it('should get plugin info corrently', () => {
    expect(testPlugin.getInfo('version')).to.equal('0.0.1');
  });

  it('should get plugin option corrently', () => {
    expect(testPlugin.get('op')).to.equal(123);
  });

  it('should get builtin options in plugin config with $', () => {
    expect(testPlugin.get('$.port')).to.equal(3000);
  });

  it('should get all options (includes the defaults) when there\'s no path', () => {
    expect(config.get()).to.eql({
      ...BUILTIN_DEFAULTS, port: 3000, open: false, livereload: false,
    });
  });

  it('should get all plugin options (includes the defaults) when there\'s no path', async () => {
    await server.setup();
    expect(testPlugin.get()).to.eql({
      op: 123,
      foo: 'bar', // defaults
    });
  });

  it('should return schema correctly', () => {
    expect(config.getSchema()).to.eql(CONFIGS);
  });
});

describe('Config set', () => {
  const server = createServer({
    port: 3000,
    plugins: [
      {
        name: 'test',
        version: '0.0.1',
        inplace: true,
        configSchema: {
          foo: {
            type: 'string',
            default: 'bar',
          },
        },
        options: {
          op: 123,
        },
      },
    ],
  });
  const { config } = server;
  const testPlugin = config.getPlugin('test');

  it('should set builtin value corrently', () => {
    config.set('port', 4000);
    expect(config.get('port')).to.equal(4000);
    config.set('port', 3000);
  });

  it('should set plugin option corrently', () => {
    testPlugin.set('op', 321);
    testPlugin.set('other', 'other info');
    expect(testPlugin.get('op')).to.equal(321);
    expect(testPlugin.get('other')).to.equal('other info');
  });
});

describe('Config Validate', () => {
  it('should validate single type configs', () => {
    const option = new Option({
      https: 3000, // should be boolean
      port: 'port', // should be number
      svrx: 123, // should be string
      urls: 'should be object', // should be object
    });
    const errors = option._validate(CONFIGS);
    expect(errors).not.to.equal(null);
    expect(errors.length).to.equal(4);
    expect(errors[0]).to.equal('Config Error: .https should be boolean');
    expect(errors[1]).to.equal('Config Error: .port should be number');
    expect(errors[2]).to.equal('Config Error: .svrx should be string');
    expect(errors[3]).to.equal('Config Error: .urls should be object');
  });

  it('should validate multi type configs', () => {
    const option = new Option({
      proxy: 123, // boolean,array,object
      open: ['a', 'b'], // boolean,string
      serve: 'string',
    });
    const errors = option._validate(CONFIGS);
    expect(errors).not.to.equal(null);
    expect(errors.length).to.equal(3);
    expect(errors[0])
      .to
      .equal('Config Error: .open should be boolean or string');
    expect(errors[1])
      .to
      .equal('Config Error: .proxy should be boolean or object or array');
    expect(errors[2])
      .to
      .equal('Config Error: .serve should be boolean or object');
  });

  it('should log the error path correctly', () => {
    const option = new Option({
      serve: {
        base: 123, // string
      },
      livereload: {
        exclude: true,
      },
    });
    const errors = option._validate(CONFIGS);
    expect(errors).not.to.equal(null);
    expect(errors.length).to.equal(2);
    expect(errors[0])
      .to
      .equal('Config Error: .livereload.exclude should be string or array');
    expect(errors[1]).to.equal('Config Error: .serve.base should be string');
  });
});

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

  it('should return schema correctly', () => {
    const server = createServer({
      plugins: ['test'],
    });
    expect(server.config.getPlugin('test').getSchema()).to.eql(CONFIGS);
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
});
