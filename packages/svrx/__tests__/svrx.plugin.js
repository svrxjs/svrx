const request = require('supertest');
const expect = require('expect.js');
const rimraf = require('rimraf');
const libPath = require('path');
const libFs = require('fs');

const MiddlewareManager = require('../lib/middleware');
const System = require('../lib/plugin/system');
const Configure = require('../lib/configure');
const npm = require('../lib/plugin/npm');
const Svrx = require('../lib/svrx');

const MODULE_PATH = libPath.join(__dirname, './fixture/plugin');
const TEST_PLUGIN_PATH = libPath.join(__dirname, 'fixture/plugin/svrx-plugin-test');

function des() {}

describe('Plugin System', () => {
    function cleanModule(done) {
        rimraf(libPath.join(__dirname, 'fixture/plugin/node_modules'), () => {
            rimraf(libPath.join(__dirname, 'fixture/plugin/packag*.json'), done);
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
                const expectModulePath = libPath.join(__dirname, 'fixture/plugin/node_modules/lodash.noop');
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
                const testModule = require(libPath.join(__dirname, 'fixture/plugin/node_modules/svrx-plugin-test'));
                expect(testModule.name).to.equal('test');
                done();
            });
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

        it('system#loadOne with path & install', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system.load([{ path: libPath.join(MODULE_PATH, 'svrx-plugin-test') }]).then((res) => {
                expect(system.get('test').name).to.equal('test');
                expect(system.get('test').module.priority).to.equal(100);
                done();
            });
        }).timeout(10000);

        it('system#loadOne with path ', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system.load([{ path: libPath.join(MODULE_PATH, 'svrx-plugin-test') }]).then((res) => {
                expect(system.get('test').name).to.equal('test');
                expect(system.get('test').module.priority).to.equal(100);
                done();
            });
        });

        it('system#loadOne with name', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system.load([{ name: 'demo' }]).then((res) => {
                expect(system.get('demo').name).to.equal('demo');
                done();
            });
        }).timeout(10000);

        it('system#loadOne with path has depend', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system.load([{ path: libPath.join(MODULE_PATH, 'svrx-plugin-depend'), install: true }]).then((res) => {
                expect(system.get('depend').name).to.equal('depend');
                done();
            });
        }).timeout(10000);

        it('wont install twice if installed', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system
                .load([{ name: 'demo' }])
                .then((res) => {
                    const plugModule = system.get('demo');
                    expect(plugModule.name).to.equal('demo');
                    return plugModule;
                })
                .then((plugModule) => {
                    system.load([{ name: 'demo' }]).then((res) => {
                        expect(plugModule).to.equal(system.get('demo'));
                        done();
                    });
                });
        }).timeout(10000);

        it('inplace load', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system
                .load([
                    {
                        name: 'inplace',
                        priority: 10,
                        hooks: {
                            async onRoute(props, ctx, next) {}
                        }
                    }
                ])
                .then((res) => {
                    const plugModule = system.get('inplace');
                    expect(plugModule.name).to.equal('inplace');
                    expect(plugModule.path).to.eql(MODULE_PATH);
                    done();
                });
        });

        it('path: install', (done) => {
            const system = new System({
                config: new Configure({
                    root: MODULE_PATH
                })
            });
            system
                .load([
                    {
                        name: 'inplace',
                        priority: 10,
                        hooks: {
                            async onRoute(props, ctx, next) {}
                        }
                    }
                ])
                .then((res) => {
                    const plugModule = system.get('inplace');
                    expect(plugModule.name).to.equal('inplace');
                    expect(plugModule.path).to.eql(MODULE_PATH);
                    done();
                });
        });
    });

    describe('Svrx Integration', () => {
        it('plugin-test onRoute', (done) => {
            const svrx = new Svrx({
                root: MODULE_PATH,
                plugins: [
                    {
                        path: TEST_PLUGIN_PATH,
                        props: {
                            limit: 300
                        }
                    }
                ]
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
    });
});
