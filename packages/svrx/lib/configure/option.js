// const Ajv = require('ajv');
const _ = require('lodash');
const Ajv = require('ajv');
const ajvErrorParse = require('ajv-errors');
const IModel = require('../model');
const logger = require('../util/logger');

class Option extends IModel {
    updateOptions(options = {}) {
        this.produce((draft) => {
            _.keys(options).forEach((key) => {
                draft[key] = options[key];
            });
        });
    }

    validate(configs = {}) {
        const options = this.get();
        const ajv = new Ajv({ allErrors: true, jsonPointers: true });
        ajvErrorParse(ajv);
        const valid = ajv.validate(
            {
                type: 'object',
                properties: configs
            },
            options
        );
        if (!valid) {
            const ajvErrors = ajv.errors;
            logger.error('Config Error:');
            _.forEach(ajvErrors, (err) => {
                logger.error(`${err.dataPath.replace('/', '.')} ${err.message}`);
            });
            process.exit(1);
        }
    }
}

module.exports = Option;
