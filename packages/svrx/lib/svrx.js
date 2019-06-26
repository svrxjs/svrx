const chalk = require('chalk');
const http = require('http');
const https = require('https');
const ffp = require('find-free-port');
const Koa = require('koa');
const cosmiconfig = require('cosmiconfig');
const chokidar = require('chokidar');
const { getCert, getExternalIp } = require('./util/helper');

const PluginSystem = require('./plugin/system');
const Middleware = require('./middleware');
const Configure = require('./configure');
const Injector = require('./injector');
const IO = require('./io');

const CONFIGS = require('./config-list');
const getEvents = require('./shared/events');
const logger = require('./util/logger');

const NOOP = () => {};

class Svrx {
  constructor(inlineOptions = {}, cliOptions = {}) {
    this.Svrx = Svrx;
    this._rcFilePath = null;
    const rcOptions = this._rcFileRead();
    this.config = new Configure({
      inline: inlineOptions,
      cli: cliOptions,
      rc: rcOptions,
    });
    const { config } = this;

    if (config.get('logger.level')) {
      logger.setLevel(config.get('logger.level'));
    }
    logger.debug('Config is loaded');

    this.app = new Koa();
    const { app } = this;
    this._server = config.get('https')
      ? https.createServer(getCert(), app.callback())
      : http.createServer(app.callback());
    const server = this._server;

    // todo move into pluginSystem
    this.middleware = new Middleware(config);
    const { middleware } = this;
    this.events = getEvents();
    this.injector = new Injector({ config, middleware });
    this.io = new IO({ config, server, middleware });
    const { events, injector, io } = this;

    this.system = new PluginSystem({
      middleware,
      injector,
      config,
      events,
      io,
    });

    // @TODO: need dynamic
    app.use(this.koaMiddleware());

    // watch file change
    this._watchRcfile();
  }

  async ready() {
    return Promise.all(this._tasks);
  }

  // export koa middleware for exsited koa application
  koaMiddleware() {
    return this.middleware.middleware();
  }

  // export raw callback for http(s).createServer
  callback() {
    return this.app.callback();
  }

  start(callback) {
    this._tryStart(this.config.get('port'), callback || NOOP);
  }

  close(callback) {
    this._server.close(callback);
  }

  static getConfigList() {
    return CONFIGS;
  }

  async setup() {
    const plugins = this.config.getPlugins();
    return this.system.load(plugins).then(() => this.system.build());
  }

  _rcFileRead() {
    try {
      logger.debug('Reading config file...');
      const explorer = cosmiconfig('svrx', {
        searchPlaces: ['.svrxrc.js', 'svrx.config.js'],
      });
      const result = explorer.searchSync();
      if (result && !result.isEmpty) {
        this._rcFilePath = result.filepath;
        return result.config;
      }
    } catch (e) {
      logger.error(`Config file loaded fail because \n\n${e.message}`);
    }

    return {};
  }

  _watchRcfile() {
    const rcfilePath = this._rcFilePath;
    if (!rcfilePath) return;
    chokidar.watch(rcfilePath).on('change', () => {
      const rcOptions = this._rcFileRead(); // xxx perf
      this.config.updateRcOptions(rcOptions);
      // todo reloadPlugins();
    });
  }

  _tryStart(port, callback) {
    this.setup()
      .then(() => {
        ffp(port, '127.0.0.1', (err, p1) => {
          if (err) throw Error('NO PORT FREE');
          if (port !== p1) {
            logger.warn(`port ${port} is in use, using port ${p1} instead`);
          }

          this._server.listen(p1, () => {
            this._afterStart(p1);
            callback(p1);
          });
        });
      })
      .catch((e) => {
        logger.error(e.stack || e.message);
        process.exit(0);
      });
  }

  _afterStart(port) {
    const { config, events } = this;

    config.set('port', port);

    const [ip] = getExternalIp();
    const protocal = `http${config.get('https') ? 's' : ''}`;

    config.set('urls.external', `${protocal}://${ip}:${port}`);
    config.set('urls.local', `${protocal}://localhost:${port}`);

    logger.notify(`svrx successfully started at

${'External'.padStart(12)}: ${chalk.underline.blue(config.get('urls.external'))}
${'Local'.padStart(12)}: ${chalk.underline.blue(config.get('urls.local'))}

${'Plugins'.padStart(12)}: ${chalk.gray(this.system.getInstalledPluginNames().join(','))}
`);
    events.emit('ready');
  }
}

module.exports = Svrx;
