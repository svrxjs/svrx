// migrated from https://github.com/leeluolee/mcss/blob/master/lib/helper/type.js
// integrated sorted type broadcast and unsorted version
const API = {
  on(type, fn, opts) {
    if (typeof opts === 'number') opts = { priority: opts };
    if (!opts) opts = {};

    const { priority = 10 } = opts;

    if (typeof type === 'object') {
      for (const i in type) {
        this.on(i, type[i], fn);
      }
    } else {
      const watcher = { priority, fn };
      const handles = this._handles || (this._handles = {});
      const watchers = handles[type] || (handles[type] = []);

      if (!watchers.length) {
        watchers.push(watcher);
        return this;
      }

      for (let j = watchers.length; j--;) {
        const call = watchers[j];
        if (call.priority >= priority) {
          watchers.splice(j + 1, 0, watcher);
          return this;
        }
      }
      watchers.unshift(watcher);
    }
    return this;
  },
  off(type, fn) {
    if (!type) throw Error('event type is required');

    if (!this._handles) this._handles = {};

    const handles = this._handles;
    let watchers;

    if ((watchers = handles[type])) {
      if (!fn) {
        handles[type] = [];
        return this;
      }
      for (let i = 0, len = watchers.length; i < len; i++) {
        if (fn === watchers[i].fn) {
          watchers.splice(i, 1);
          return this;
        }
      }
    }
    return this;
  },
  async emit(type, payload, sorted) {
    const handles = this._handles;
    let watchers; let passedEvtObj; let
      pending;
    if (!sorted) {
      pending = [];
    }

    if (!handles || !(watchers = handles[type])) return this;
    for (let i = 0, len = watchers.length; i < len; i++) {
      const watcher = watchers[i];
      const fn = watcher && watcher.fn;
      if (typeof fn !== 'function') continue;
      if (!sorted) {
        const evtObj = getEvtObj(type, payload);
        pending.push(fn.call(this, evtObj));
      } else {
        if (!passedEvtObj) passedEvtObj = getEvtObj(type, payload);
        await fn.call(this, passedEvtObj);
        if (passedEvtObj.isStoped) break;
      }
    }
    if (!sorted) {
      return Promise.all(pending);
    }
    return passedEvtObj;
  },
};

function getEvtObj(type, payload) {
  let _stopped = false;
  return {
    type,
    payload,
    stop() {
      _stopped = true;
    },
    get isStoped() {
      return _stopped;
    },
  };
}

module.exports = function (origin) {
  let obj = typeof origin === 'function' ? origin.prototype : origin;
  if (!obj) obj = {};
  ['on', 'off', 'emit'].forEach(name => (obj[name] = API[name]));
  return origin || obj;
};
