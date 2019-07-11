const expect = require('expect.js');
const Svrx = require('../../lib/svrx');

const createServer = (inlineOptions = {}, cliOptions = {}) => {
  inlineOptions.livereload = false;
  inlineOptions.open = false;
  return new Svrx(inlineOptions, cliOptions);
};

describe('CLI Config', () => {
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
          'wrong2?foo&bar=foo',
        ],
      });
      const wrongPlugin = server.config.getPlugin('wrong');
      const wrongPlugin2 = server.config.getPlugin('wrong2');
      expect(wrongPlugin).to.be(undefined);
      expect(wrongPlugin2).to.be(undefined);
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
  });
});
