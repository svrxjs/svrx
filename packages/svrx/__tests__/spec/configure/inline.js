const expect = require('expect.js');
const libPath = require('path');
const { createServer } = require('../../util');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');

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
