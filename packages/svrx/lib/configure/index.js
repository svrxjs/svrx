/**
 * @TODO split config
 *
 * pluginConfig = config.sub('plugins');
 */
const IModel = require('../model');
const Option = require('./option');
const Validator = require('./validator');

const option = new Option();
const validator = new Validator();

class Configure extends IModel {
    constructor(inlineOptions = {}) {
        const formattedOptions = option.formatInlineOptions(inlineOptions);
        const rcOptions = option.rcFileRead();
        const merged = option.merge(formattedOptions, rcOptions);
        const validated = validator.validate(merged);
        const options = option.fillWithDefaults(validated);

        super(options);
    }
}

module.exports = Configure;
