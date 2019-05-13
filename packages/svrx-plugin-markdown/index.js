
const libFs = require('fs');
const libPath = require('path');

function isMarkdown(url){
    return /\.(md|markdown)$/.test(url)
}

module.exports = {

    propsModels: {
        port: {
            type: 'number',
            default: 8000
        }
    },
    
    assets:{
        test: isMarkdown,
        script: [
            './assets/index.js'
        ],
        style: [
            './assets/index.css'
        ]
    },
    services: {
        // io.call('markdown.test).then(content=> content)
        async ['markdown.test'](param){
            return 'markdown test'
        }
    },
    hooks: {
        async onRoute(ctx, next, {config}){
            if(isMarkdown(ctx.path)){
                ctx.set('Content-Type', 'text/html')
                ctx.status = 200;
                ctx.body = `
                    <html>
                        <head>
                            <title>MARKDOWN PREVIEW</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
                        </head>
                        <body><div class="markdown-body"></div></body>
                    </html>`
            }
            await next();
        },
        async onCreate({io, config, middleware, injector}){
            io.registService('markdown.content', async payload => {
                return new Promise((resolve, reject)=>{

                    libFs.readFile(libPath.resolve(config.get('root'), payload), 'utf8', (err, content)=>{
                        if(err) return reject(err)
                        else resolve(content)
                    })

                })
            })
            
        }

    }
}