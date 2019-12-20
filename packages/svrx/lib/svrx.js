/* eslint no-console: "off" */

const { rcFileRead } = require('@svrx/util');
const ffp = require('find-free-port');
const libPath = require('path');
const chalk = require('chalk');
const https = require('https');
const http = require('http');
const Koa = require('koa');

const { getCert, getExternalIp } = require('./util/helper');
const { Loader, exportsToPlugin } = require('./router');
const PluginSystem = require('./plugin/system');
const Middleware = require('./middleware');
const Configure = require('./configure');
const Injector = require('./injector');
const IO = require('./io');

const CONFIGS = require('./config-list');
const { PRIORITY } = require('./constant');
const getEvents = require('./shared/events');
const logger = require('./util/logger');

const NOOP = () => {};
const DOC_URL = 'https://docs.svrx.io/en/guide/option.html';

class Svrx {
  constructor(inlineOptions = {}, cliOptions = {}) {
    this.Svrx = Svrx;
    const rcOptions = Svrx._rcFileRead();
    this.config = new Configure({
      inline: inlineOptions,
      cli: cliOptions,
      rc: rcOptions,
    });
    this.logger = logger;
    const { config } = this;

    this._prepareConfig(config);
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

    // @TODO
    this.loader = new Loader();
    this.loader.on('error', (payload) => logger.error(payload));
    this.loader.on('update', (payload) => logger.notify(`[routing update] ${payload}`));

    this.router = exportsToPlugin(this.loader);

    this.system = new PluginSystem({
      router: this.router,
      middleware,
      injector,
      config,
      events,
      io,
    });

    // @TODO: need dynamic
    app.use(this.koaMiddleware());
  }

  _prepareConfig() {
    const { config } = this;
    // logger
    if (config.get('logger.level')) {
      logger.setLevel(config.get('logger.level'));
    }
    config.watch('logger.level', () => {
      if (config.get('logger.level')) {
        logger.setLevel(config.get('logger.level'));
      }
    });

    // root
    const root = config.get('root');
    if (!libPath.isAbsolute(root)) {
      config.set('root', libPath.join(process.cwd(), root));
    }
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
    this.loader.destroy();
    this._server.close(callback);
  }

  // cli
  static printBuiltinOptionsHelp() {
    let message = '';
    Object.keys(CONFIGS).forEach((name) => {
      const option = CONFIGS[name];
      if (option.cli !== false) {
        const cmd = option.alias ? `-${option.alias}, --${name}` : `--${name}`;
        if (option.description) {
          const desc = option.description.replace(/^(\w)/, (a) => a.toUpperCase());
          const defaultHint = option.defaultHint ? ` (${option.defaultHint})` : '';
          const hint = defaultHint.replace(/^(\w)/, (a) => a.toLowerCase());

          const defaults = option.default ? ` (default: ${option.default})` : '';
          message += (
            `\n${
              ''.padEnd(8)
            }${cmd.padEnd(22)
            }${desc}${hint || defaults}`
          );
        }
      }
    });
    message += `\n${''.padEnd(8)} Visit ${DOC_URL} for more option detail`;

    console.log(message);
    return message;
  }

  // cli
  static getCurrentVersion() {
    return require('../package').version; // eslint-disable-line
  }

  async setup() {
    const plugins = this.config.getPlugins();
    const { loader, middleware } = this;
    const route = this.config.get('route');
    return this.system
      .load(plugins)
      .then(() => this.system.build())
      .then(() => this.events.emit('plugin', {
        middleware: this.middleware,
        injector: this.injector,
        logger,
        config: this.config,
        events: this.events,
        router: this.router,
        io: this.io,
      }))
      .then(() => {
        middleware.add('$router', {
          priority: PRIORITY.ROUTER,
          onRoute: loader.middleware(),
        });
        if (typeof route === 'string') {
          return loader.load(libPath.resolve(this.config.get('root'), route));
        }
        return null;
      });
  }

  static _rcFileRead() {
    try {
      logger.debug('Reading config file...');
      return rcFileRead();
    } catch (e) {
      logger.error(`Config file loaded fail because \n\n${e.message}`);
    }

    return {};
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
    events.emit('ready', port);
  }
}

module.exports = Svrx;
