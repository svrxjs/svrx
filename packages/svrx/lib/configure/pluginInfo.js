const { logger } = require('@svrx/util');
const IModel = require('../model');

class PluginInfo extends IModel {
  validate() {
    if (this.get('name') === undefined) {
      logger.error('Plugin name is required');
      process.exit(1);
    }
  }
}

module.exports = PluginInfo;
