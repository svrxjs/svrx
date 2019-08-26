/**
 * copy from https://github.com/trilogy-group/ignite-chute-opensource-json-schema-defaults
 * modified for custom json-schema type: function
 */

const _ = require('lodash');

module.exports = (() => {
  /**
     * check whether item is plain object
     * @param {*} item
     * @return {Boolean}
     */
  const isObject = (item) => typeof item === 'object' && item !== null && item.toString() === {}.toString();

  /**
     * deep JSON object clone
     *
     * @param {Object} source
     * @return {Object}
     */
  const cloneJSON = (source) => {
    const replacer = (key, value) => {
      if (typeof value === 'function') {
        return value;
      }
      return value;
    };
    return JSON.parse(JSON.stringify(source, replacer));
  };

  /**
     * returns a result of deep merge of two objects
     *
     * @param {Object} target
     * @param {Object} source
     * @return {Object}
     */
  const merge = (target, source) => {
    target = cloneJSON(target);

    Object.keys(source).forEach((key) => {
      if (isObject(target[key]) && isObject(source[key])) {
        target[key] = merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  };

  /**
     * get object by reference. works only with local references that points on
     * definitions object
     *
     * @param {String} path
     * @param {Object} definitions
     * @return {Object}
     */
  const getLocalRef = (path, definitions) => {
    path = path.replace(/^#\/definitions\//, '').split('/');

    const find = (p, root) => {
      const key = p.shift();
      if (!root[key]) {
        return {};
      } if (!p.length) {
        return root[key];
      }
      return find(p, root[key]);
    };

    const result = find(path, definitions);

    if (!isObject(result)) {
      return result;
    }
    return cloneJSON(result);
  };

  /**
     * merge list of objects from allOf properties
     * if some of objects contains $ref field extracts this reference and merge it
     *
     * @param {Array} allOfList
     * @param {Object} definitions
     * @return {Object}
     */
  const mergeAllOf = (allOfList, definitions) => {
    const { length } = allOfList;
    let index = 0;
    let result = {};

    while (index < length) {
      let item = allOfList[index];

      item = typeof item.$ref !== 'undefined' ? getLocalRef(item.$ref, definitions) : item;

      result = merge(result, item);
      index += 1;
    }

    return result;
  };

  /**
     * main function
     *
     * @param {Object} schema
     * @param {Object|undefined} definitions
     * @return {Object}
     */

  /**
     * returns a object that built with default values from json schema
     *
     * @param {Object} schema
     * @param {Object} definitions
     * @return {Object}
     */
  /* eslint-disable consistent-return */
  const defaults = (schema, definitions) => {
    if (typeof schema.default !== 'undefined') {
      return schema.default;
    } if (typeof schema.allOf !== 'undefined') {
      const mergedItem = mergeAllOf(schema.allOf, definitions);
      return defaults(mergedItem, definitions);
    } if (typeof schema.$ref !== 'undefined') {
      const reference = getLocalRef(schema.$ref, definitions);
      return defaults(reference, definitions);
    } if (schema.type === 'object') {
      if (!schema.properties) {
        return undefined;
      }

      Object.keys(schema.properties).forEach((key) => {
        schema.properties[key] = defaults(schema.properties[key], definitions);

        if (typeof schema.properties[key] === 'undefined') {
          delete schema.properties[key];
        }
      });

      return schema.properties;
    } if (schema.type === 'array') {
      if (!schema.items) {
        return [];
      }

      // minimum item count
      const ct = schema.minItems || 0;
      // tuple-typed arrays
      if (schema.items.constructor === Array) {
        const values = schema.items.map((item) => defaults(item, definitions));
        // remove undefined items at the end (unless required by minItems)
        for (let i = values.length - 1; i >= 0; i -= 1) {
          if (typeof values[i] !== 'undefined') {
            break;
          }
          if (i + 1 > ct) {
            values.pop();
          }
        }
        return values;
      }
      // object-typed arrays
      const value = defaults(schema.items, definitions);
      if (typeof value === 'undefined') {
        return [];
      }
      const vals = [];
      for (let j = 0; j < Math.max(1, ct); j += 1) {
        vals.push(cloneJSON(value));
      }
      return vals;
    }
  };

  return (schema, definitions) => {
    if (typeof definitions === 'undefined') {
      definitions = schema.definitions || {};
    } else if (isObject(schema.definitions)) {
      definitions = merge(definitions, schema.definitions);
    }

    return defaults(_.cloneDeep(schema), definitions);
  };
})();
