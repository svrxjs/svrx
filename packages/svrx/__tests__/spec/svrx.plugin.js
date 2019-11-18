const request = require('supertest');
const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');
const sinon = require('sinon');
const childProcess = require('child_process');

const { createServer } = require('../util');
const System = require('../../lib/plugin/system');
const Configure = require('../../lib/configure');
const constants = require('../../lib/constant');
const logger = require('../../lib/util/logger');

const MODULE_PATH = libPath.join(__dirname, '../fixture/plugin');
const TEST_PLUGIN_PATH = libPath.join(__dirname, '../fixture/plugin/svrx-plugin-test');

const { BUILTIN_PLUGIN } = constants;

describe('Plugin System', () => {
  function cleanModule(done) {
    rimraf(libPath.join(MODULE_PATH, 'node_modules'), () => {
      rimraf(libPath.join(MODULE_PATH, 'packag*.json'), done);
    });
  }

  describe('System', () => {
    before((done) => {
      cleanModule(done);
      // runs before all tests in this block
    });

    afterEach((done) => {
      cleanModule(done);
    });


    it('multiple install', async () => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'hello',
              async load() {
                return {
                  name: 'hello',
                };
              },
            },
            {
              name: 'world',
              async load() {
                return {
                  name: 'world',
                };
              },
            },

          ],
        },
      });

      const system = new System({
        config,
      });

      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      const stub = sinon.stub(logger, 'spin').callsFake(() => () => {});


      await system.load(plugins);

      expect(stub.called).to.equal(true);

      expect(stub.firstCall.args[0]).to.match(/hello,world/);

      stub.restore();
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
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        expect(system.get('test').name).to.equal('test');
        expect(system.get('test').module.priority).to.equal(100);
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
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
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
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        expect(system.get('test').path).to.equal(TEST_PLUGIN_PATH);
        done();
      });
    });
    it('system#load: path with no package.json', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              path: libPath.join(MODULE_PATH, 'svrx-plugin-no-package'),
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system.load(plugins).then(() => {
        expect(system.get('no-package').version).to.equal(undefined);
        done();
      });
    });

    it('wont install twice if installed', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              path: libPath.join(MODULE_PATH, 'svrx-plugin-test'),
              install: true,
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system
        .load(plugins)
        .then(() => {
          const plugModule = system.get('test');
          expect(plugModule.name).to.equal('test');
          return plugModule;
        })
        .then((plugModule) => {
          system.load(plugins).then(() => {
            expect(plugModule).to.equal(system.get('test'));
            done();
          });
        });
    }).timeout(10000);

    it('Error boundary', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'not-exsits-error',
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
      system
        .load(plugins)
        .catch((e) => {
          expect(e).to.match(/install error: package 'svrx-plugin-not-exsits-error' not found/);
          done();
        });
    }).timeout(4000);

    it('load empty keep silent', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
        },
      });
      const system = new System({
        config,
      });
      system.load([]).then(done);
    });

    it('inplace load', (done) => {
      const config = new Configure({
        rc: {
          root: MODULE_PATH,
          plugins: [
            {
              name: 'inplace',
              priority: 10,
              hooks: {
                async onRoute(ctx) {
                  ctx.body = 'hello';
                },
              },
            },
          ],
        },
      });
      const system = new System({
        config,
      });
      const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));

      system.load(plugins).then(() => {
        const plugModule = system.get('inplace');
        expect(plugModule.name).to.equal('inplace');
        expect(plugModule.path).to.eql(MODULE_PATH);
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
              script: (config) => `
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

      svrx.io
        .call('$.config', {
          scope: 'hello-world',
          command: 'get',
          params: [],
        })
        .then((res) => {
          expect(res).to.eql({ limit: 300 });
          return svrx.io.call('$.config', {
            scope: 'hello-world',
            command: 'get',
            params: ['limit'],
          });
        })
        .then((res) => {
          expect(res).to.eql(300);
        })
        .then(done)
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
  });

  describe('Builtin:serve', () => {
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
          .expect("parseInt('123', 10);\n", done);
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

  describe('Builtin: open', () => {
    it('basic usage', (done) => {
      const stub = sinon.stub(childProcess, 'exec');
      const svrx = createServer({
        port: 3000,
        open: true,
      });
      svrx.start(() => {
        expect(stub.called).to.equal(true);
        expect(stub.firstCall.args[0]).to.match(new RegExp(svrx.config.get('urls.local')));
        stub.restore();
        svrx.close(done);
      });
    });
    it('external', (done) => {
      const stub = sinon.stub(childProcess, 'exec');
      const svrx = createServer({
        port: 3000,
        open: 'external',
      });
      svrx.start(() => {
        expect(stub.called).to.equal(true);
        expect(stub.firstCall.args[0]).to.match(new RegExp(svrx.config.get('urls.external')));
        stub.restore();
        svrx.close(done);
      });
    });
    it('resolve to  absolute', (done) => {
      const stub = sinon.stub(childProcess, 'exec');
      const svrx = createServer({
        port: 3000,
        open: 'relative.md',
      });
      svrx.start(() => {
        expect(stub.called).to.equal(true);
        expect(stub.firstCall.args[0].split(/\s+/)[1]).to.equal(
          `${svrx.config.get('urls.local')}/relative.md`,
        );
        stub.restore();
        svrx.close(done);
      });
    });
  });
});
