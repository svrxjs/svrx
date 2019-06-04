const IModel = require('../model');

class PluginInfo extends IModel {
    validate() {
        if (this.get('name') === undefined) return 'Plugin name is required';
    }
}

module.exports = PluginInfo;
