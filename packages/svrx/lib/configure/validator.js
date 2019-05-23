const _ = require('lodash');
const OPTIONS = require('../option-list');
const logger = require('../util/logger');

class Validator {
    constructor() {
        this._svrxOptionList = OPTIONS || {};
    }

    _removeInvalid(raw = {}) {
        // remove options that not listed in svrx/option-list.js
        let result = _.cloneDeep(raw);
        const nestedOptionList = {};

        // transform option path(eg: 'a.b.c') into normal nested obj(eg:
        // {a:{b:{c}}})
        _.keys(this._svrxOptionList).forEach((path) => {
            _.set(nestedOptionList, path, this._svrxOptionList[path]);
        });

        // traverse user options and check if the key exists in nestedOptionList
        const traverse = (obj, path = '') => {
            if (path && _.get(nestedOptionList, path) === undefined && path !== 'plugins') {
                result = _.omit(result, [path]);
            }
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
            }
        };
        traverse(raw);

        // remove plugins that _enabled===false
        result.plugins = raw.plugins.filter((p) => p._enable !== false);
        return result;
    }

    validate(raw = {}) {
        const formatted = this._removeInvalid(raw);

        const traverse = (obj, path = '') => {
            if (_.isPlainObject(obj)) {
                _.keys(obj).forEach((key) => {
                    traverse(obj[key], path === '' ? key : `${path}.${key}`);
                });
                return;
            }
            if (path === 'plugins') return;

            const value = obj;
            const configs = _.get(this._svrxOptionList, path);
            const { type, choices } = configs;
            // check the value type
            if (!this._typeCheck(value, type)) {
                this._printErrorAndExit(`Config type error: ${path} should be a ${type}`);
            }
            // check the choices
            if (choices) {
                if (!choices.includes(value)) {
                    this._printErrorAndExit(`Config value error: ${path} should be one of [${choices.join(',')}]`);
                }
            }
        };
        traverse(formatted);

        return formatted;
    }

    _typeCheck(value, type) {
        if (type === 'number') {
            return _.isNumber(value);
        }
        if (type === 'string') {
            return _.isString(value);
        }
        if (type === 'boolean') {
            return _.isBoolean(value);
        }
        if (type === 'number[]') {
            return _.isArray(value) && value.every((v) => _.isNumber(v) || (!isNaN(v) && _.isNumber(parseFloat(v))));
        }
        if (type === 'string[]') {
            return _.isArray(value) && value.every((v) => _.isString(v));
        }
        if (type === 'boolean[]') {
            return _.isArray(value) && value.every((v) => _.isBoolean(v));
        }
    }

    _printErrorAndExit(message) {
        logger.error(message);
        process.exit(1);
    }
}

module.exports = Validator;
