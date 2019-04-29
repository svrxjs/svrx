const fs = require('fs');
const path = require('path');
const replaceStream = require('./replace');
const { isReadableStream } = require('../util/helper');
const { gzip } = require('../util/gzip');
const { PRIORITY } = require('../constant');

// const
const ASSETS = Symbol('assets');
const CLIENT_PATH = path.join(__dirname, 'dist/client.js');
const BASIC_SCRIPT = fs.readFileSync(CLIENT_PATH, 'utf8');
const MINE_TYPES = {
    style: 'text/css',
    script: 'application/javascript'
};

module.exports = class Injector {
    constructor({ config, middleware }) {
        this.config = config;
        this[ASSETS] = {
            style: [],
            script: []
        };

        middleware.add('$injector', {
            priority: PRIORITY.INJECTOR,
            onCreate: () => this.onClient.bind(this)
        });

        middleware.add('$transform', {
            priority: PRIORITY.TRANSFORM,
            onCreate: () => this.onTransform.bind(this)
        });
    }

    // transform html

    async onTransform(ctx, next) {
        await next();
        if (isHtmlType(ctx.response.header) && !ctx._svrx.isInjected) {
            ctx.body = this.transform(ctx.body);
            ctx._svrx.isInjected = true;
        }
    }

    // serve  /puer/puer-client.js
    // serve  /puer/puer-client.css
    // @TODO 304 Logic
    async onClient(ctx, next) {
        let config = this.config;

        let match;
        ['style', 'script'].some((name) => {
            if (ctx.url === config.get('urls.' + name)) {
                match = name;
                return true;
            }
        });
        if (match) {
            const isGzip = isAcceptGzip(ctx.headers);
            ctx.body = await this.getContent(match, isGzip);
            ctx.set('Content-Type', MINE_TYPES[match]);
            if (isGzip) {
                ctx.body = await gzip(ctx.body);
                ctx.set('Content-Encoding', 'gzip');
            }
        } else {
            await next();
        }
    }

    async getContent(type, isGzip) {
        const assets = this[ASSETS][type];

        const appendContent = assets
            .map((m) => m.content + (m.name ? '\n//' + `source from ${m.name}` : ''))
            .filter((m) => !!m)
            .join('\n;');

        const output = type === 'script' ? BASIC_SCRIPT + '\n' + appendContent : appendContent;

        if (isGzip) {
        }
        return output;
    }

    add(type, def) {
        if (typeof def === 'string') {
            def = { filename: def };
        }

        let { filename, content } = def;

        if (filename && !content) {
            def.content = fs.readFileSync(filename, 'utf8');
        }

        this[ASSETS][type].push(def);
    }

    // @TODO FIX </body> split case
    transform(body) {
        const config = this.config;
        const replaceScript = [`</body>`, `<script async src="${config.get('urls.script')}"/></body>`];
        const replaceStyle = [`</head>`, `<link rel="stylesheet" type="text/css" href="${config.get('urls.style')}"/>`];

        if (body instanceof Buffer) {
            body = body.toString('utf8');
        }
        if (typeof body === 'string') {
            return body.replace(...replaceScript).replace(...replaceStyle);
        } else if (isReadableStream(body)) {
            return body.pipe(replaceStream(...replaceScript)).pipe(replaceStream(...replaceStyle));
        }

        return body;
    }
};

const acceptMineTypes = /\b(xhtml|html|htm|xml)\b/;

function isHtmlType(headers) {
    return acceptMineTypes.test(headers['content-type'] || '');
}

function isAcceptGzip(headers) {
    return (headers['accept-encoding'] || '').indexOf('gzip') !== -1;
}
