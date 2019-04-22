// const assert = require('assert')

// const { install } = require('../util/npm')
// const logger = require('../util/logger')
// const CONST = require('../constant')
// const Model = require('../model')
// const HOOKS = [ 'init', 'after', 'before' ]

// class Plugin extends Model {
//     /**
//      *
//      * @param {Object} option plugin option
//      *  - name: pluginName
//      */
//     constructor (definition) {
//         const {
//             name,
//             schema, // validate
//             assets, //
//             hooks, //
//             priority = CONST.DEFAULT_PRIORITY // 插件优先级
//         } = definition

//         this.name = name

//     // this.handleHooks(hooks)
//     }

//     init () { }
//     before () { }

//     async handleHooks (hooks) {
//         for (var hookName in hooks) {
//             if (hooks.hasOwnProperty(hookName)) {
//                 if (!HOOKS.includes(hookName)) {
//                     logger.error(`unsupported hook ${hookName} in plugin ${this.name}`)
//                     continue
//                 }
//             }
//         }
//     }

//     async getAssets () {

//     }
// }

// module.exports = Plugin
