const _ = require('lodash');
const Option = require('./option');

class BuiltinOption extends Option {
  constructor(data) {
    const { cli = {}, rc = {} } = data;
    const options = BuiltinOption._merge(cli, rc);
    super(options);
  }

  /**
     * merged inline and rcfile options
     *   addons has a lower priority
     *   if the value type is array, the values will concat
     *   if the value type is object, the values will be merged
     * merged
     * @param options
     * @param addons
     * @private
     */
  static _merge(options = {}, addons = {}) {
    const customizer = (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    };

    return _.mergeWith(_.cloneDeep(addons), options, customizer);
  }
}

module.exports = BuiltinOption;
