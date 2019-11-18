const expect = require('expect.js');
const { normalizePluginName, parsePluginName } = require('../../lib/name-formatter');

describe('Name Formatter', () => {
  const plugins = [
    { name: 'svrx-plugin-foo', pluginName: 'foo' },
    { name: 'svrx-plugin-foo-bar', pluginName: 'foo-bar' },
    { name: '@scope/svrx-plugin-foo', pluginName: '@scope/foo' },
    { name: '@scope/svrx-plugin-foo-bar', pluginName: '@scope/foo-bar' },
  ];

  it('normalizePluginName', () => {
    plugins.forEach((p) => {
      expect(normalizePluginName(p.pluginName)).to.equal(p.name);
    });
    expect(normalizePluginName('@scope')).to.equal(null);
    expect(normalizePluginName('@scope/')).to.equal(null);
    expect(normalizePluginName('@SCOPE/bar')).to.equal(null);
  });
  it('parsePluginName', () => {
    plugins.forEach((p) => {
      expect(parsePluginName(p.name)).to.equal(p.pluginName);
    });
    expect(parsePluginName('svrx-not-a-legal-plugin')).to.equal(null);
    expect(parsePluginName('@scope/svrx-not-a-legal-plugin')).to.equal(null);
    expect(parsePluginName('@no_')).to.equal(null);
  });
});
