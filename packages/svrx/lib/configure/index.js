/**
 * @TODO split config
 *
 * pluginConfig = config.sub('plugins');
 */
const _ = require('lodash');
const chokidar = require('chokidar');
const IModel = require('../model');
const Option = require('./option');

const option = new Option();

class Configure extends IModel {
    constructor(inlineOptions = {}) {
        const formattedInlineOptions = option.formatInlineOptions(inlineOptions);
        const rcOptions = option.rcFileRead();
        const options = option.generate(formattedInlineOptions, rcOptions);

        super(options);

        this._inlineOptions = formattedInlineOptions;

        if (this.get('livereload')) {
            this._watchRcfile();
        }
    }

    _watchRcfile() {
        const rcfilePath = option.getRcfilePath();
        if (!rcfilePath) return;
        chokidar.watch(rcfilePath).on(
            'change',
            _.debounce(() => {
                const rcOptions = option.rcFileRead();
                this._updateOptions(rcOptions);
            }, 200)
        );
    }

    _updateOptions(newOptions = {}) {
        const options = option.generate(this._inlineOptions, newOptions);

        this.produce((draft) => {
            _.keys(options).forEach((key) => {
                draft[key] = options[key];
            });
        });
    }
}

module.exports = Configure;
