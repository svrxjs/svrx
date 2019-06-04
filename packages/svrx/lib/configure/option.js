// const Ajv = require('ajv');
const _ = require('lodash');
const IModel = require('../model');

class Option extends IModel {
    updateOptions(options = {}) {
        this.produce((draft) => {
            _.keys(options).forEach((key) => {
                draft[key] = options[key];
            });
        });
    }
}

module.exports = Option;
