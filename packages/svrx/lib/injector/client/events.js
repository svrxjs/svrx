// migrated from https://github.com/leeluolee/mcss/blob/master/lib/helper/Event.js
const API = {
    on: function(event, fn) {
        if (typeof event === 'object') {
            for (var i in event) {
                this.on(i, event[i]);
            }
        } else {
            var handles = this._handles || (this._handles = {});
            var calls = handles[event] || (handles[event] = []);
            calls.push(fn);
        }
        return this;
    },
    off: function(event, fn) {
        if (!event || !this._handles) this._handles = {};
        if (!this._handles) return;

        var handles = this._handles;
        var calls;

        if ((calls = handles[event])) {
            if (!fn) {
                handles[event] = [];
                return this;
            }
            for (var i = 0, len = calls.length; i < len; i++) {
                if (fn === calls[i]) {
                    calls.splice(i, 1);
                    return this;
                }
            }
        }
        return this;
    },
    emit: function(event) {
        var args = [].slice.call(arguments, 1);
        var handles = this._handles;
        var calls;

        if (!handles || !(calls = handles[event])) return this;
        for (var i = 0, len = calls.length; i < len; i++) {
            calls[i].apply(this, args);
        }
        return this;
    }
};
module.exports = function(obj) {
    obj = typeof obj === 'function' ? obj.prototype : obj;
    ['on', 'off', 'emit'].forEach((name) => (obj[name] = API[name]));
    return obj;
};
