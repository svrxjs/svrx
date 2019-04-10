
const path = require('path');
const Model = require('../model');
const Plugin = require('./plugin');
const {install} = require('../util/npm');
const logger = require('../util/logger');
const { normalizePluginName } = require('../util/helper');
const PLUGIN_MAP = Symbol('PLUGIN_MAP');



class PluginSystem extends Model{
    /**
     * @param {Array} pluginlist 
     */
    constructor(){

        this[PLUGIN_MAP] = {}

    }

    async setup(){
        
        logger.debug('Install Plugin ...')
        await this.install( plugins );

        logger.debug('Load Plugin ...')
        await this.load( plugins );
    }

    /**
     * [{ name: 'live-reload', version: '0.9.0', config: { enable: true} }]
     * @param {Array} plugins  
     */
    async install( plugins ){

        return plugins.reduce( 
            (left ,right) =>  left.then( ()=> this.installOne(right) ), 
            Promise.resolve() 
        )

    }

    /**
     * Install Single Plugin From Npm or Local
     * @param {Object} plugin definition
     */
    async installOne( plugin ){

        await install( {
            name: normalizePluginName( plugin.name ),
            version: plugin.version || '*',
            path: '.'
        } )

    }

    /**
     * 
     * @param {Object} param0 
     *  - name: 接入
     *  - root: 模块根目录
     */
    async loadOne( {name, root} ){

        const moduleName = normalizePluginName( name );
        delete require.cache[moduleName];

        const definition = require( moduleName );

        this[PLUGIN_MAP][name] = new Plugin({
            definition, root
        }) 

    }


    // rebuild plugin process
    rebuild(){

    }

    async load( plugins ){
        

    }


}


    

module.exports = PluginSystem;