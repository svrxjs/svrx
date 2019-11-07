const libPath = require('path');
const expect = require('expect.js');
const readJSON = require('../../lib/readJSON');

const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');

describe('readJSON', () => {
  it('read a json file', () => {
    const json = readJSON(libPath.join(TEST_PLUGIN_PATH, 'package.json'));
    expect(json.version).to.eql('0.0.1');
  });
  it('read a non-exist file', () => {
    const json = readJSON(libPath.join(TEST_PLUGIN_PATH, 'non-exist.json'));
    expect(json).to.eql({});
  });
  it('read a non-json file', () => {
    try {
      readJSON(libPath.join(TEST_PLUGIN_PATH, 'index.js'));
    } catch (e) {
      expect(e).to.match(/SyntaxError: Unexpected token/);
    }
  });
});
