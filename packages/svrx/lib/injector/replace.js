/**
 *  stream#replace
 *
 */

const { Transform } = require('stream');
const { is } = require('../util/helper');

/**
 * str.replace (stream version)
 * rs.pipe(replaceStream('</body>', '<script src="xx.js"></body>'))
 */

module.exports = function replaceStream(pattern, replaced) {
    //   const isMaybeMatchedEnd = false

    if (typeof replaced === 'string') replaced = is(replaced);

    return new Transform({
        transform(chunk, enc, callback) {
            const str = chunk.toString().replace(pattern, replaced);
            this.push(str);
            callback();
        },
        flush(callback) {
            callback();
        }
    });
};

/**
 * extractStrEnd('hahahaha</bo', '</body>') => true
 */
// function isStrEnd () { }
