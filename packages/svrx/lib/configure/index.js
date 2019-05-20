/**
 * @TODO split config
 *
 * pluginConfig = config.sub('plugins');
 */
const IModel = require('../model');
const OPTIONS = require('../option-list');

class Configure extends IModel {
    constructor(options) {
        super(options);
        this.removeAlias();
    }

    /**
     * replace alias with their real name
     */
    removeAlias() {
        const options = this.get();
        const allNameAndAlias = [];
        Object.keys(OPTIONS).forEach((confName) => {
            if (OPTIONS[confName].alias) {
                allNameAndAlias.push({
                    alias: OPTIONS[confName].alias,
                    name: confName
                });
            }
        });
        allNameAndAlias
            .filter((pair) => options[pair.alias] !== undefined)
            .forEach((pair) => {
                const value = options[pair.alias];
                this.del(pair.alias);
                this.set(pair.name, value);
            });
    }
}

module.exports = Configure;
