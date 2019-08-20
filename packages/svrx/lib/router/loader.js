const { debounce } = require('lodash');
const chokidar = require('chokidar');
const Module = require('module');
const libPath = require('path');
const util = require('util');
const libFs = require('fs');

const events = require('../shared/events');
const compose = require('../util/compose');
const methods = require('./methods');

const read = util.promisify(libFs.readFile);

const NOTIFY_THROTTLE = 100;
const ROUTE_MODULE_PATH = libPath.join(__dirname, 'router.js');
const PREFIX = `void function({route, ${methods.join(',')}}){`;
const POSTFIX = `}((()=>{
    const Router = require('${ROUTE_MODULE_PATH}') 
    const router = new Router();
    module.exports = router;
    return router.commands;
})())`;

function wrap(content) {
  return `${PREFIX}\n${content}\n${POSTFIX}`;
}

async function readContent(filename) {
  return read(filename, 'utf8');
}

function requireSource(src, filename) {
  const m = new Module();
  m._compile(src, filename);
  return m.exports;
}

class Loader {
  constructor() {
    this.moduleMap = new Map();
    this._middlewares = [];
    this._cachedMiddleware = compose(
      this._middlewares,
      null,
      (m) => m.middleware,
    );

    this.notify = debounce((type, evt) => this.emit(type, evt), NOTIFY_THROTTLE);
  }

  async load(filename, content) {
    if (!content) {
      this.watch(filename);
    }
    return this.build(filename, content);
  }

  add(router) {
    this._set(null, router.middleware());
  }

  async build(filename, content) {
    content = content || (await readContent(filename));
    const wrapContent = wrap(content);
    let m;
    try {
      m = requireSource(wrapContent, filename);
    } catch (e) {
      this.notify(
        'error',
        new Error(
          `build routeFile [${filename}] failed\n${(e.stack)
            .replace(PREFIX, '')
            .replace(POSTFIX, '')}`,
        ),
      );
      return null;
    }
    this.notify('update', filename);
    this._set(filename, m.middleware(), content);
    return m;
  }

  _set(filename, middleware, content) {
    const middlewares = this._middlewares;
    const isExist = middlewares.some((m) => {
      if (m.filename && m.filename === filename) {
        m.middleware = middleware;
        m.content = content;
        return true;
      }
      return false;
    });
    if (!isExist) {
      middlewares.push({
        filename,
        middleware,
        content,
      });
    }
  }

  middleware() {
    return this._cachedMiddleware;
  }

  watch(filename) {
    if (!this.watcher) {
      this.watcher = chokidar
        .watch(filename, {
          interval: 200,
        })
        .on('change', (path) => {
          this.build(path);
        })
        .on('add', (path) => {
          this.build(path);
        })
        .on('unlink', (path) => {
          this.unwatch(path);
        });
    } else {
      this.watcher.add(filename);
    }
  }

  unwatch(filename) {
    const middlewares = this._middlewares;
    for (let len = middlewares.length - 1; len >= 0; len -= 1) {
      if (middlewares[len].filename === filename) {
        middlewares.splice(len, 1);
      }
    }
  }

  destroy() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

events(Loader);

module.exports = Loader;
