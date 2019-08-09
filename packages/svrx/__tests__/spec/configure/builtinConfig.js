const expect = require('expect.js');
const Option = require('../../../lib/configure/option');
const CONFIGS = require('../../../lib/config-list');
const { BUILTIN_PLUGIN } = require('../../../lib/constant');
const defaults = require('../../../lib/util/jsonSchemaDefaults');
const { createServer } = require('../../util');

const BUILTIN_DEFAULTS = defaults({
  type: 'object',
  properties: CONFIGS,
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
    expect(plugins.map((p) => p.getInfo('name'))).to.eql(BUILTIN_PLUGIN);
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

describe('Functions', () => {
  let builtinConfig;
  before(async () => {
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
    builtinConfig = server.config;
  });

  it('should keep #watch() on configs', (done) => {
    const release = builtinConfig.watch((evt) => {
      expect(evt.affect()).to.equal(true);
      expect(evt.affect('watch.b.c')).to.equal(true);
      expect(evt.affect('watch')).to.equal(true);
      expect(evt.affect('watch.c')).to.equal(false);
      release();
      done();
    });
    builtinConfig.set('watch.b.c', 'world');
  });

  it('should delete a config after #del()', () => {
    builtinConfig.set('test.del.item', 'hello');
    expect(builtinConfig.get('test.del.item')).to.equal('hello');
    builtinConfig.del('test.del.item');
    expect(builtinConfig.get('test.del.item')).to.eql(undefined);

    builtinConfig.del('none.exists.config');
    expect(builtinConfig.get('none.exists.config')).to.eql(undefined);
  });

  it('should splice an array config after #splice()', () => {
    builtinConfig.set('test.splice.item', [1, 2, 3]);
    builtinConfig.splice('test.splice.item', 0, 1);
    expect(builtinConfig.get('test.splice.item')).to.eql([2, 3]);
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
