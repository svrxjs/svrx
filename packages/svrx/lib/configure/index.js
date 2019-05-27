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

    /**
     * update option._svrxProps after one plugin is loaded, and validate the plugin options
     * @param name
     * @param props
     */
    updatePluginProps(name, props) {
        const plugins = this.get('plugins');
        option.updatePluginProps(name, props);

        const pluginIndex = plugins.findIndex((p) => p.name === name);
        const generatedPlugin = option.generateSinglePlugin(plugins[pluginIndex]);
        this.set(['plugins', pluginIndex], generatedPlugin, true);
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
