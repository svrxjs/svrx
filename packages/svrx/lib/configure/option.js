const _ = require('lodash');
const Ajv = require('super-ajv');
const ajvErrorParse = require('ajv-errors');
const IModel = require('../model');
const logger = require('../util/logger');

class Option extends IModel {
  validate(configs = {}) {
    const options = this.get();
    const ajv = new Ajv({
      allErrors: true,
      coerceTypes: true,
      useDefaults: true,
      jsonPointers: true,
    });

    // define custom types
    // fixme validate is not work for function values
    ajv.addType('function', {
      compile: () => data => _.isFunction(data),
    });
    ajv.addType('compute', {
      compile: () => data => _.isFunction(data),
    });

    // errors formatting
    ajvErrorParse(ajv);

    try {
      const valid = ajv.validate(
        {
          type: 'object',
          properties: configs,
        },
        options,
      );

      if (!valid) {
        const ajvErrors = ajv.errors;
        _.forEach(ajvErrors, (err) => {
          logger.error(`Config Error: ${err.dataPath.replace('/', '.')} ${err.message}`);
        });
        process.exit(1);
      }
    } catch (e) {
      logger.warn(e);
    }
  }
}

module.exports = Option;
