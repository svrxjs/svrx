// resource injector 
const fs = require('fs')

// const
const DEFAULT_INJECT_AT = /<\/body>/
const INJECT_SCRIPT = `<script async src='/svr.client.js'></script>`
const DEFAULT_INJECT_FN = ( str )=>{
    return INJECT_SCRIPT +  str
}
const ASSETS = Symbol('assets');
const CONFIG = Symbol('config');


class Injector {

    constructor({ config }) {

        this[CONFIG] = config
        this[ASSETS] = {
            'style': [],
            'script': []
        }
    }

    add(type, {content, filename}){
        if(filename && !content){
            content = fs.readFileSync(filename, 'utf8');
        }
        this[ASSETS][type].push({  content })
    }

    middleware() {

        const config = this[CONFIG];
        return async (ctx, next) => {

            await next();

            if ( isHtml(ctx.response.get('Content-Type')) ) {
                if (typeof ctx.body === 'string') {
                    ctx.body = ctx.body.replace(
                        config.get('inject.at', DEFAULT_INJECT_AT), 
                        config.get('inject.fn', DEFAULT_INJECT_FN)
                    )
                }
            }

        }
    }

}


const acceptMineTypes = /\b(xhtml|html|htm|xml)\b/

function isHtml( contentType ) {
    return acceptMineTypes.test( contentType )
}