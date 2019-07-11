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
      expect(testPlugin.get('foo')).to.eql('bar');
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
      expect(testPlugin.get('foo')).to.eql('bar');

      const demoPlugin = server.config.getPlugin('demo');
      expect(demoPlugin).not.to.be(undefined);
      expect(demoPlugin.get('foo2')).to.eql('str');
      expect(demoPlugin.get('bar2')).to.eql('far');
    });

    it('add a plugin with version', () => {
      // --plugin test@0.0.1
      const server = createServer({}, {
        plugin: 'test@0.0.1',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.eql('0.0.1');
    });

    it('add a plugin with version,options', () => {
      // --plugin test@0.0.1?foo=bar&bar=foo
      const server = createServer({}, {
        plugin: 'test@0.0.1?foo=bar&bar=foo',
      });
      const testPlugin = server.config.getPlugin('test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.eql('0.0.1');
      expect(testPlugin.get('foo')).to.eql('bar');
      expect(testPlugin.get('bar')).to.eql('foo');
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
      expect(testPlugin.getInfo('version')).to.eql('0.0.1');
      expect(testPlugin.get('foo')).to.eql('bar');
      expect(testPlugin.get('bar')).to.eql('foo');
      const demoPlugin = server.config.getPlugin('demo');
      expect(demoPlugin).not.to.be(undefined);
      expect(demoPlugin.getInfo('version')).to.eql('1.0.1');
      expect(demoPlugin.get('foo')).to.eql('bar');
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
      expect(testPlugin.getInfo('version')).to.eql('1.0.0');
    });

    it('add scoped plugin with version,options', () => {
      // --plugin @scope/test@1.0.0?foo=bar
      const server = createServer({}, {
        plugin: '@scope/test@1.0.0?foo=bar',
      });
      const testPlugin = server.config.getPlugin('@scope/test');
      expect(testPlugin).not.to.be(undefined);
      expect(testPlugin.getInfo('version')).to.eql('1.0.0');
      expect(testPlugin.get('foo')).to.eql('bar');
    });
  });

  describe('parse --plugin string options', () => {
    it('should split all options correctly', () => {
      // todo
    });
  });
});
