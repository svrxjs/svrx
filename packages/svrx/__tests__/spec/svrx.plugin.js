const request = require('supertest');
const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');
const libFs = require('fs');

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
        before(function(done) {
            cleanModule(done);
            // runs before all tests in this block
        });

        afterEach(function(done) {
            cleanModule(done);
        });
        it('basic usage', (done) => {
            npm.install({
                path: MODULE_PATH,
                name: 'lodash.noop',
                version: '3.0.0'
            }).then((result) => {
                expect(result.version).to.equal('3.0.0');
                const expectModulePath = libPath.join(MODULE_PATH, '/node_modules/lodash.noop');
                expect(result.path).to.equal(expectModulePath);
                expect(libFs.statSync(expectModulePath).isDirectory()).to.equal(true);
                done();
            });
        }).timeout(10000);

        it('load module: local install', (done) => {
            npm.install({
                name: TEST_PLUGIN_PATH,
                localInstall: true,
                path: MODULE_PATH
            }).then((ret) => {
                expect(ret.name).to.equal('svrx-plugin-test');
                expect(ret.version).to.equal('0.0.1');
                const testModule = require(libPath.join(TEST_PLUGIN_PATH));
                expect(testModule.name).to.equal('test');
                done();
            });
        }).timeout(10000);
        it('npm view version', (done) => {
            npm.view(['svrx-plugin-demo@*', 'engines']).then((ret) => {
                for (var i in ret) {
                    expect(ret[i].engines.svrx).to.not.equal(undefined);
                }
                done();
            });
        }).timeout(10000);

        it('npm load satisfied version', (done) => {
            const revert = changeVersion('0.0.2');
            npm.getSatisfiedVersion('demo')
                .then((ret) => {
                    expect(ret).to.equal('1.0.2');
                    changeVersion('0.0.3');
                    return npm.getSatisfiedVersion('demo').then((ret) => {
                        expect(ret).to.equal('1.0.3');
                        done();
                        // Restore VERSION
                        revert();
                    });
                })
                .catch(done);
        }).timeout(10000);
    });

    describe('System', () => {
        before(function(done) {
            cleanModule(done);
            // runs before all tests in this block
        });

        afterEach(function(done) {
            cleanModule(done);
        });

        it('system#loadOne with path', (done) => {
            const config = new Configure({
                rc: {
                    root: MODULE_PATH,
                    plugins: [{ path: TEST_PLUGIN_PATH }]
                }
            });
            const system = new System({
                config
            });
            const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
            system.load(plugins).then((res) => {
                expect(system.get('test').name).to.equal('test');
                expect(system.get('test').module.priority).to.equal(100);
                done();
            });
        }).timeout(10000);

        it('system#loadOne with name', (done) => {
            const config = new Configure({
                rc: {
                    root: MODULE_PATH,
                    plugins: [{ name: 'demo' }]
                }
            });
            const system = new System({
                config
            });
            const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
            console.log('===plugins', plugins);
            console.log('===plugins', plugins[0].getInfo('name'));
            system.load(plugins).then((res) => {
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
                            install: true
                        }
                    ]
                }
            });
            const system = new System({
                config
            });
            const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
            system
                .loadOne(plugins[0])
                .then((res) => {
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
                            path: libPath.join(MODULE_PATH, 'svrx-plugin-test')
                        }
                    ]
                }
            });
            const system = new System({
                config
            });
            const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
            system.load(plugins).then((res) => {
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
                            name: 'demo'
                        }
                    ]
                }
            });
            const system = new System({
                config
            });
            const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
            system
                .load(plugins)
                .then((res) => {
                    const plugModule = system.get('demo');
                    expect(plugModule.name).to.equal('demo');
                    return plugModule;
                })
                .then((plugModule) => {
                    system.load(plugins).then((res) => {
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
                                async onRoute(props, ctx, next) {}
                            }
                        }
                    ]
                }
            });
            const system = new System({
                config
            });
            const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
            system.load(plugins).then((res) => {
                const plugModule = system.get('inplace');
                expect(plugModule.name).to.equal('inplace');
                expect(plugModule.path).to.eql(MODULE_PATH);
                done();
            });
        });

        describe('Engine', () => {
            it('loadVersion', (done) => {
                const revert = changeVersion('0.0.2');
                const config = new Configure({
                    rc: {
                        root: MODULE_PATH,
                        plugins: [
                            {
                                name: 'demo',
                                version: '1.0.2'
                            }
                        ]
                    }
                });
                const system = new System({
                    config
                });
                const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
                system
                    .load(plugins)
                    .then((res) => {
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
                                version: '1.0.10'
                            }
                        ]
                    }
                });
                const system = new System({
                    config
                });
                const plugins = config.getPlugins().filter((p) => !BUILTIN_PLUGIN.includes(p.getInfo('name')));
                const revert = changeVersion('0.0.3');
                system
                    .loadOne(plugins[0])
                    .then((res) => {
                        done('Expect Throw Error, but not');
                    })
                    .catch((err) => {
                        expect(err).to.match(/unmatched plugin version/);
                        revert();
                        done();
                    });
            });
        });
    });

    describe('Integration', () => {
        it('plugin-test onRoute', (done) => {
            const svrx = createServer({
                root: MODULE_PATH,
                test: {
                    path: TEST_PLUGIN_PATH,
                    options: {
                        limit: 300
                    }
                }
            });

            svrx.setup().then(() => {
                request(svrx.callback())
                    .get('/djaldajl')
                    .expect('X-Svrx-Limit', '300')
                    .expect(404)
                    .end(done);
            });
        });

        it('asset building', (done) => {
            const svrx = createServer({
                root: MODULE_PATH,
                test: {
                    path: TEST_PLUGIN_PATH,
                    options: {
                        limit: 300
                    }
                }
            });
            svrx.setup().then(() => {
                request(svrx.callback())
                    .get('/svrx/svrx-client.css')
                    .expect(/body\{background: black\}/)
                    .expect(200)
                    .end((err) => {
                        if (err) return done(err);
                        request(svrx.callback())
                            .get('/svrx/svrx-client.js')
                            .expect(/console.log\(\'svrx-plugin-test\'\)/)
                            .expect(200)
                            .end(done);
                    });
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
                static: {
                    root: libPath.join(MODULE_PATH, 'serve')
                }
            });

            svrx.setup().then(() => {
                request(svrx.callback())
                    .get('/demo.js')
                    .expect('const a = 1;', done);
            });
        });
        it('serveStatic: injector', (done) => {
            const svrx = createServer({
                port: 3000,
                static: {
                    root: libPath.join(MODULE_PATH, 'serve')
                }
            });

            svrx.setup().then(() => {
                request(svrx.callback())
                    .get('/demo.html')
                    .expect('Content-Type', /html/)
                    .expect(/src=\"\/svrx\/svrx-client.js\"/, done);
            });
        });
    });
});
