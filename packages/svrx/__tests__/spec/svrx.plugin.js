const request = require('supertest');
const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');

const System = require('../../lib/plugin/system');
const Configure = require('../../lib/configure');
const constants = require('../../lib/constant');
const npm = require('../../lib/plugin/npm');
const Svrx = require('../../lib/svrx');

const MODULE_PATH = libPath.join(__dirname, '../fixture/plugin');
const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');

function changeVersion(version) {
  const PRE_VERSION = constants.VERSION;
  constants.VERSION = version;
  return () => {
    constants.VERSION = PRE_VERSION;
  };
}

function createServer(option) {
  option = option || {};
  option.livereload = false;
  return new Svrx(option);
}

const { BUILTIN_PLUGIN } = constants;

describe('Plugin System', () => {
  function cleanModule(done) {
    rimraf(libPath.join(MODULE_PATH, 'node_modules'), () => {
      rimraf(libPath.join(MODULE_PATH, 'packag*.json'), done);
    });
  }

  describe('npm', () => {
    before((done) => {
      cleanModule(done);
      // runs before all tests in this block
    });

    afterEach((done) => {
      cleanModule(done);
    });

    it('npm load satisfied version', (done) => {
      const revert = changeVersion('0.0.2');
      npm.getSatisfiedVersion('demo')
        .then((ret) => {
          expect(ret).to.equal('1.0.2');
          changeVersion('0.0.3');
          return npm.getSatisfiedVersion('demo').then((ret1) => {
            expect(ret1).to.equal('1.0.3');
            revert();
            done();
            // Restore VERSION
          });
        })
        .catch(done);
    }).timeout(10000);
  });

  describe('System', () => {
    before((done) => {
      cleanModule(done);
      // runs before all tests in this block
    });

    afterEach((done) => {
      cleanModule(done);
    });

    it('system#loadOne with path', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [{ path: TEST_PLUGIN_PATH }],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        expect(system.get('test').name).to.equal('test');
        expect(system.get('test').module.priority).to.equal(100);
        done();
      });
    }).timeout(10000);

    it('system#loadOne with name', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [{ name: 'demo' }],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        expect(system.get('demo').name).to.equal('demo');
        done();
      });
    }).timeout(10000);

    it('system#loadOne with path has depend, force install', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              path: libPath.join(MODULE_PATH, 'svrx-plugin-depend'),
              install: true,
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system
        .loadOne(plugins[0])
        .then(() => {
          expect(system.get('depend').name).to.equal('depend');
          done();
        })
        .catch(done);
    }).timeout(10000);

    it('system#load: path should correct', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              path: libPath.join(MODULE_PATH, 'svrx-plugin-test'),
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        expect(system.get('test').path).to.equal(TEST_PLUGIN_PATH);
        done();
      });
    });

    it('wont install twice if installed', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'demo',
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system
        .load(plugins)
        .then(() => {
          const plugModule = system.get('demo');
          expect(plugModule.name).to.equal('demo');
          return plugModule;
        })
        .then((plugModule) => {
          system.load(plugins).then(() => {
            expect(plugModule).to.equal(system.get('demo'));
            done();
          });
        });
    }).timeout(10000);

    it('inplace load', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'inplace',
              priority: 10,
              hooks: {
                async onRoute(ctx) { ctx.body = 'hello'; },
              },
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        const plugModule = system.get('inplace');
        expect(plugModule.name).to.equal('inplace');
        expect(plugModule.path).to.eql(MODULE_PATH);
        done();
      });
    });

    it('loadVersion', (done) => {
      const revert = changeVersion('0.0.2');
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'demo',
              version: '1.0.2',
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system
        .load(plugins)
        .then(() => {
          const plugModule = system.get('demo');
          expect(plugModule.version).to.equal('1.0.2');

          revert();
          done();
        })
        .catch(done);
    });
    it('load unmatched Version ', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'demo',
              version: '1.0.10',
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter(p => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      const revert = changeVersion('0.0.3');
      system
        .loadOne(plugins[0])
        .then(() => {
          done('Expect Throw Error, but not');
        })
        .catch((err) => {
          expect(err).to.match(/unmatched plugin version/);
          revert();
          done();
        });
    });
  });


  describe('Plugin:assets', () => {
    it('asset wraping', (done) => {
      const svrx = createServer({
        root: MODULE_PATH,
        plugins: [
          {
            name: 'hello-world',
            inplace: true,
            options: {
              limit: 300,
            },
            assets: {
              script: {
                content: 'window.name=1',
              },
              style: {
                content: 'body{}',
              },
            },
          },
        ],
      });
      svrx.setup().then(() => {
        request(svrx.callback())
          .get('/svrx/svrx-client.js')
          .expect(/window\.name=1/)
          .expect(/void function\(svrx\)/)
          .expect(/_getScopedInstance\('hello-world'\)/)
          .end((err) => {
            if (err) return done(err);
            return request(svrx.callback())
              .get('/svrx/svrx-client.css')
              .expect(/body\{\}/)
              .expect((res) => {
                if (/void function\(svrx\)/.test(res.text)) {
                  throw Error('style wont be injected with wraping');
                }
              })
              .end(done);
          });
      });
    });
    it('asset building', (done) => {
      const svrx = createServer({
        root: MODULE_PATH,
        plugins: [
          {
            path: TEST_PLUGIN_PATH,
            options: {
              limit: 300,
            },
          },
        ],
      });
      svrx.setup().then(() => {
        request(svrx.callback())
          .get('/svrx/svrx-client.css')
          .expect(/body\{background: black\}/)
          .expect(200)
          .end((err) => {
            if (err) return done(err);
            return request(svrx.callback())
              .get('/svrx/svrx-client.js')
              .expect(/console.log\('svrx-plugin-test'\)/)
              .expect(200)
              .end(done);
          });
      });
    });

    it('asset content with function', (done) => {
      const svrx = createServer({
        root: MODULE_PATH,
        plugins: [
          {
            name: 'test',
            inplace: true,
            options: {
              limit: 300,
            },
            assets: {
              script: config => `
                                    window.limit=${config.get('limit')};
                                `,
            },
          },
        ],
      });
      svrx.setup().then(() => {
        request(svrx.callback())
          .get('/svrx/svrx-client.js')
          .expect(/window\.limit=300/)
          .expect(200)
          .end(done);
      });
    });
  });

  describe('Integration', () => {
    it('builtin service: $.config ', (done) => {
      const svrx = createServer({
        root: MODULE_PATH,
        plugins: [
          {
            name: 'hello-world',
            inplace: true,
            options: {
              limit: 300,
            },
          },
        ],
      });

      svrx.io.call('$.config', {
        scope: 'hello-world',
        command: 'get',
        params: [],

      }).then((res) => {
        expect(res).to.eql({ limit: 300 });
        return svrx.io.call('$.config', {
          scope: 'hello-world',
          command: 'get',
          params: ['limit'],
        });
      }).then((res) => {
        expect(res).to.eql(300);
      }).then(done)
        .catch(done);
    });
    it('plugin-test onRoute', (done) => {
      const svrx = createServer({
        root: MODULE_PATH,
        plugins: [
          {
            path: TEST_PLUGIN_PATH,
            options: {
              limit: 300,
            },
          },
        ],
      });

      svrx.setup().then(() => {
        request(svrx.callback())
          .get('/djaldajl')
          .expect('X-Svrx-Limit', '300')
          .expect(404)
          .end(done);
      });
    });


    it('plugin url parser', () => {});

    it('only one plugin is enable', () => {});

    it('plugin config cli builder', () => {});

    it('plugin props handle via propModels', () => {});

    it('selector on props', () => {});
  });

  describe('Builtin', () => {
    it('serveStatic: basic', (done) => {
      const svrx = createServer({
        port: 3000,
        serve: {
          base: libPath.join(MODULE_PATH, 'serve'),
        },
      });

      svrx.setup().then(() => {
        request(svrx.callback())
          .get('/demo.js')
          .expect('parseInt(\'123\', 10);\n', done);
      });
    });
    it('serveStatic: injector', (done) => {
      const svrx = createServer({
        port: 3000,
        serve: {
          base: libPath.join(MODULE_PATH, 'serve'),
        },
      });

      svrx.setup().then(() => {
        request(svrx.callback())
          .get('/demo.html')
          .expect('Content-Type', /html/)
          .expect(/src="\/svrx\/svrx-client.js"/, done);
      });
    });
  });
});
