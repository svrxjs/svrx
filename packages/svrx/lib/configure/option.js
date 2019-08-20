const _ = require('lodash');
const Ajv = require('super-ajv');
const ajvErrorParse = require('ajv-errors');
const IModel = require('../model');
const logger = require('../util/logger');

class Option extends IModel {
  validate(configs = {}) {
    try {
      const errors = this._validate(configs);
      if (errors !== null) {
        errors.forEach((err) => {
          logger.error(err);
        });
        process.exit(1);
      }
    } catch (e) {
      logger.warn(e);
    }
  }

  _validate(configs = {}) {
    const options = this.get();
    const ajv = new Ajv({
      allErrors: true,
      jsonPointers: true,
    });

    // define custom types
    // fixme validate is not work for function values
    ajv.addType('function', {
      compile: () => (data) => _.isFunction(data),
    });
    ajv.addType('compute', {
      compile: () => (data) => _.isFunction(data),
    });

    // errors formatting
    ajvErrorParse(ajv);

    const valid = ajv.validate(
      {
        type: 'object',
        properties: configs,
      },
      options,
    );

    if (!valid) {
      const ajvErrors = ajv.errors;
      const formattedErrors = Option._format(ajvErrors);
      return formattedErrors.map((err) => `Config Error: ${err.dataPath.replace('/', '.')} ${err.message}`);
    }

    return null;
  }

  static _format(errors = []) {
    const pathMap = new Map();
    errors.forEach((e) => {
      const path = e.dataPath.replace('/', '.');
      const valueArray = pathMap.has(path)
        ? pathMap.get(path)
        : [];

      pathMap.set(path, [...valueArray, e]);
    });

    const pathes = [...pathMap.keys()].sort();
    const filterPathes = [];
    let i = 0;
    while (i < pathes.length - 1) {
      if (!pathes[i + 1].startsWith(pathes[i])) {
        filterPathes.push(pathes[i]);
      }
      i += 1;
    }
    filterPathes.push(pathes[i]);
    return filterPathes.map((k) => {
      const valueArray = pathMap.get(k);
      if (valueArray.length === 1) {
        return {
          dataPath: k,
          message: valueArray[0].message,
        };
      }

      const types = valueArray
        .filter((v) => v.keyword === 'type')
        .map((v) => v.params.type)
        .join(' or ');
      return {
        dataPath: k,
        message: `should be ${types}`,
      };
    });
  }
}

module.exports = Option;
