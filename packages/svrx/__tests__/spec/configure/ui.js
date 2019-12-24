const expect = require('expect.js');
const { createServer } = require('../../util');

describe('UI Configs', () => {
  let uiClientConfig = null;
  const server = createServer({
    plugins: [
      {
        name: 'ui',
        inplace: true,
        hooks: {
          onCreate({ config }) {
            uiClientConfig = config;
          },
        },
      },
    ],
  });
  const { config } = server;

  it('should consider ui as external plugin', () => {
    expect(config.getExternalPlugins().map((p) => p.getInfo('name'))).to.eql(['ui']);
  });
  it('should return ui config as builtin config in client side', async () => {
    await server.setup();
    // uiClientConfig is actually builtin config here
    expect(uiClientConfig.get()).to.eql(config.get());
  });
});
