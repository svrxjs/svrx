const chokidar = require('chokidar');
const Module = require('module');
const libPath = require('path');
const util = require('util');
const libFs = require('fs');
const methods = require('./methods');
const logger = require('../util/logger');
const compose = require('../util/compose');

const read = util.promisify(libFs.readFile);

const ROUTE_MODULE_PATH = libPath.join(__dirname, 'router.js');

class Loader {
  constructor() {
    this.moduleMap = new Map();
    this._middlewares = [];
    this._cachedMiddleware = compose(
      this._middlewares,
      null,
      m => m.middleware,
    );
  }

  async load(filename, content) {
    if (!content) {
      this.watch(filename);
    }

    return this.build(filename, content);
  }

  async build(filename, content) {
    content = content || await this._readContent(filename);
    const wrapContent = this._wrap(content);
    let module;
    try {
      module = requireSource(wrapContent, filename);
    } catch (e) {
      logger.error(`build routeFile [${filename}] failed${e.stack}` || e.message);
      return;
    }
    this._set(filename, module.middleware(), content);
    return module;
  }


  _set(filename, middleware, content) {
    const middlewares = this._middlewares;
    const isExist = middlewares.some((m) => {
      if (m.filename === filename) {
        m.middleware = middleware;
        m.content = content;
        return true;
      }
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

  async _readContent(filename) {
    return read(filename, 'utf8');
  }

  _wrap(content) {
    return `
        void function({route, ${methods.join(',')}}){${content}}((()=>{
            const Router = require('${ROUTE_MODULE_PATH}') 
            const router = new Router();
            module.exports = router;
            return router.commands;
        })())
    `;
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
    for (let len = middlewares.length; len--;) {
      if (middlewares[len].filename === filename) {
        middlewares.splice(len, 1);
      }
    }
  }

  destroy() {
    this.watcher && this.watcher.close();
  }
}

function requireSource(src, filename) {
  const m = new Module();
  m._compile(src, filename);
  return m.exports;
}

module.exports = Loader;
