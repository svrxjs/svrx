const fs = require('fs');
const path = require('path');
const replaceStream = require('./replace');

// const
const ASSETS = Symbol('assets');
const CONFIG = Symbol('config');

module.exports = class Injector {
    constructor({ config }) {
        this[CONFIG] = config;
        this[ASSETS] = {
            style: [],
            script: []
        };
    }

    add(type, { content, filename }) {
        if (filename && !content) {
            content = fs.readFileSync(filename, 'utf8');
        }
        this[ASSETS][type].push({ content });
    }

    addResource(resource) {
        this.resources.push(createResource(resource));
    }

    getScriptContent() {}
    // @TODO FIX </body> split case
    transform(rs, ctx) {
        return rs.pipe(replaceStream(`</body>`, `<script src=${this.config.get('injector.script')}></body>`));
    }
};

// const acceptMineTypes = /\b(xhtml|html|htm|xml)\b/;

// function isHtml(contentType) {
//     return acceptMineTypes.test(contentType);
// }

function createResource(def) {
    if (def.filepath) {
        def.content = fs.readFileSync(def.filepath, 'utf8');
        if (!def.type) {
            def.type = path.extname(def.filepath).slice(1);
        }
    }
    return def;
}
