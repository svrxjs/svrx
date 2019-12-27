const expect = require('expect.js');
const { createServer } = require('../../util');

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

    it('add scoped plugin with special scope name', () => {
      // --plugin @scope-foo/test
      const server = createServer({}, {
        plugin: '@scope-foo/test',
      });
      const testPlugin = server.config.getPlugin('@scope-foo/test');
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

    it('add plugin with dashed name', () => {
      const server = createServer({}, {
        plugin: 'hello-world',
      });
      const testPlugin = server.config.getPlugin('hello-world');
      expect(testPlugin).not.to.be(undefined);
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

    it('should parse web url with number correctly', () => {
      const server = createServer({}, {
        plugin: [
          'test?host=https://test.163.com',
        ],
      });
      const plugin = server.config.getPlugin('test');
      expect(plugin.get('host')).to.eql('https://test.163.com');
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

    it('should parse dashed plugin correctly', () => {
      // svrx --hello-world
      const server = createServer({}, {
        'hello-world': true,
        helloWorld: true,
        'dash-plugin': false,
        dashPlugin: false,
      });
      const dash = server.config.getPlugin('hello-world');
      const camel = server.config.getPlugin('helloWorld');
      const dashFalse = server.config.getPlugin('dash-plugin');
      const camelFalse = server.config.getPlugin('dashPlugin');
      expect(dash).not.to.be(undefined);
      expect(camel).to.be(undefined);
      expect(dashFalse).to.be(undefined);
      expect(camelFalse).to.be(camelFalse);
    });
  });
});
