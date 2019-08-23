const fs = require('fs');
const path = require('path');
const replaceStream = require('./replace');
const {
  typeOf, isReadableStream, isHtmlType, isAcceptGzip,
} = require('../util/helper');
const { PRIORITY } = require('../constant');
const { gzip } = require('../util/gzip');
const logger = require('../util/logger');

// const
const ASSETS = Symbol('assets');
const REPLACEMENTS = Symbol('replacements');
const CLIENT_PATH = path.join(__dirname, 'dist/client.js');
const BASIC_SCRIPT = fs.readFileSync(CLIENT_PATH, 'utf8');
const MINE_TYPES = {
  style: 'text/css',
  script: 'application/javascript',
};
const TYPE_SPLITS = {
  style: '\n',
  script: ';\n',
};

module.exports = class Injector {
  constructor({ config, middleware }) {
    this.config = config;
    this[ASSETS] = {
      style: [],
      script: [],
    };
    this[REPLACEMENTS] = [];

    middleware.add('$injector', {
      priority: PRIORITY.INJECTOR,
      onRoute: this.onClient.bind(this),
    });

    middleware.add('$transform', {
      priority: PRIORITY.TRANSFORM,
      onRoute: this.onTransform.bind(this),
    });
  }

  // transform html

  async onTransform(ctx, next) {
    await next();
    if (isHtmlType(ctx.response.header) && !ctx._svrx.isInjected) {
      ctx.body = this._transform(ctx.body);
      ctx._svrx.isInjected = true;
    }
  }

  // serve  /puer/puer-client.js
  // serve  /puer/puer-client.css
  // @TODO 304 Logic
  async onClient(ctx, next) {
    const { config } = this;

    let match;
    ['style', 'script'].some((name) => {
      if (ctx.path === config.get(`urls.${name}`)) {
        match = name;
        return true;
      }
      return false;
    });
    if (match) {
      const isGzip = isAcceptGzip(ctx.headers);
      ctx.body = await this.getContent(match, ctx);
      ctx.set('Content-Type', MINE_TYPES[match]);
      if (isGzip) {
        ctx.body = await gzip(ctx.body);
        ctx.set('Content-Encoding', 'gzip');
      }
    } else {
      await next();
    }
  }

  async getContent(type, ctx) {
    const assets = this[ASSETS][type];

    const appendContent = assets
      .filter((m) => !m.test || m.test(ctx.get('Referer')))
      .map((m) => {
        let { content } = m;
        if (typeof content === 'function') {
          content = content(m.config || this.config);
        }
        return m.filter ? m.filter(content) : content;
      })
      .filter((m) => !!m)
      .join(TYPE_SPLITS[type] || '\n');

    const output = type === 'script' ? `${BASIC_SCRIPT}\n${appendContent}` : appendContent;

    return output;
  }

  add(type, def) {
    const { filename, content } = def;

    if (filename && !content) {
      try {
        def.content = fs.readFileSync(filename, 'utf8');
      } catch (e) {
        logger.error(`readFile(${filename}) failed \n ${e.message}${e.message}`);
        return this;
      }
    }

    this[ASSETS][type].push(def);
    return this;
  }

  replace(pattern, fn) {
    if (
      ['string', 'regexp'].indexOf(typeOf(pattern)) === -1
      || ['string', 'function'].indexOf(typeOf(fn)) === -1
    ) {
      throw Error('invalid replacement');
    }

    this[REPLACEMENTS].push({
      pattern,
      fn,
    });
  }

  // @TODO FIX </body> split case
  _transform(body) {
    const { config } = this;
    const replaceScript = [
      '</body>',
      `<script async src="${config.get('urls.script')}" charset="UTF-8"></script></body>`,
    ];
    const replaceStyle = [
      '</head>',
      `<link rel="stylesheet" type="text/css" href="${config.get('urls.style')}"/></head>`,
    ];

    if (body instanceof Buffer) {
      body = body.toString('utf8');
    }
    if (typeof body === 'string') {
      return this._replace(body.replace(...replaceScript).replace(...replaceStyle), 'string');
    }
    if (isReadableStream(body)) {
      return this._replace(
        body.pipe(replaceStream(...replaceScript)).pipe(replaceStream(...replaceStyle)),
        'stream',
      );
    }

    return body;
  }

  _replace(body, type) {
    if (type === 'string') {
      return this[REPLACEMENTS].reduce((occur, item) => occur.replace(item.pattern, item.fn), body);
    }
    return this[REPLACEMENTS].reduce(
      (occur, item) => occur.pipe(replaceStream(item.pattern, item.fn)),
      body,
    );
  }
};
