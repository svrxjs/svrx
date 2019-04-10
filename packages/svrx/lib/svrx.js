const http = require('http');
const path = require('path');
const fs = require('fs');

const KoaRouter = require('koa-router');
const compose = require('koa-compose');
const ffp = require('find-free-port');
const Koa = require('koa');

const PluginSystem = require('./plugin/system');
const Configure = require('./configuration');
const Injector = require('./injector');
const IO = require('./io');


const NOOP = () => {}


class Svrx {

    constructor( options ) {

        options = options || {};
        const { file } = options;

        this._middlewares = [];

        this._config = new Configure( options )
        // // watching plugin config change
        // this._psystem = new PluginSystem({
        //     config: this._config
        // })
        // // client injector
        // this._injector = new Injector({
        //     config: this._config
        // });

        this.app = new Koa();
        this.app.use(this.koaMiddleware())

    }

    async init(){

        await this._psystem.setup()

    }

    // priority > 10:  after builtin middleware
    // priority < 10:  before builtin middleware

    use( {middleware, priority = 10 , name} ){

        this._middlewares.push( {
            priority, 
            middleware, 
            name
        } )

    }


    // export koa middleware for exsited koa application
    koaMiddleware(){

        const [beforeMiddleware, afterMiddleware] = this._composeMiddlewares();

        const basicMiddleware = this._basicKoaMiddleware();

        return compose( [
            beforeMiddleware, 
            basicMiddleware, 
            afterMiddleware
        ] ) 

    }

    // basic middle 
    _basicKoaMiddleware(){
        return async (ctx,next)=>{
            await next();
        }
    }


    _composeMiddlewares(){
        return [
            async ( ctx, next )=>{
                await next()
            },
            async ( ctx, next )=>{
                await next()
            }

        ]
    }


    // export raw callback for http(s).createServer
    callback(){

        return this.app.callback();

    }

    start( callback ){

        this._io = new IO( this.app );
        this._tryStart( this._config.get('port'), callback || NOOP )

    }

    close(callback){
        this._server.close( callback );
    }


    _tryStart(port, callback){

        ffp( port,  (err, p1)=>{
            let server = this.app.listen( p1, ()=> callback( p1 ))
            this._server = server;
        })

    }


    // facade export to koa ctx
    _facade(){

        const svrx = this;

        return {
            inject(){

            }
        }
    }


}

// // hello
// const server = svrx({
//     plugins: [
//         {
//             name: 'vconsole',
//             // just for testing
//             location: path.join('./plugins/svrx-plugin-vconsole'),
//             config:{ }
//             // selector: '/path/*.html'
//         },
//         'slow?delay=2000'
//     ],

//     middlewares: [

//         async function( ctx, next ){
//             const prev = +Date.now();
//             await next();
//             console.log('access time ' + (Date.now() - prev) + 'ms')
//         }

//     ],

//     port: 8001

// })


// server.start( port => {
//     console.log( port )
// })




module.exports = Svrx