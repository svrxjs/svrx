// migrated from https://github.com/leeluolee/mcss/blob/master/lib/helper/event.js

// integrated sorted type broadcast and unsorted version
/* eslint no-continue: "off", no-await-in-loop: "off" */

function getCtrlObj(type) {
  let _stopped = false;
  return {
    type,
    stop() {
      _stopped = true;
    },
    get isStoped() {
      return _stopped;
    },
  };
}

const API = {
  on(type, fn, opts) {
    if (typeof opts === 'number') opts = { priority: opts };
    if (!opts) opts = {};

    const { priority = 10 } = opts;

    if (typeof type === 'object') {
      Object.keys(type).forEach((i) => {
        this.on(i, type[i], fn);
      });
    } else {
      const watcher = { priority, fn };
      const handles = this._handles || (this._handles = {});
      const watchers = handles[type] || (handles[type] = []);

      if (!watchers.length) {
        watchers.push(watcher);
        return this;
      }

      for (let j = watchers.length - 1; j >= 0; j -= 1) {
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
    const watchers = handles[type];

    if (watchers) {
      if (!fn) {
        handles[type] = [];
        return this;
      }
      for (let i = 0, len = watchers.length; i < len; i += 1) {
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
    let passedEvtObj;
    let pending;
    if (!sorted) {
      pending = [];
    }

    if (!handles) return this;

    const watchers = handles[type];

    if (!watchers) return this;

    for (let i = 0, len = watchers.length; i < len; i += 1) {
      const watcher = watchers[i];
      const fn = watcher && watcher.fn;
      if (typeof fn === 'function') {
        if (!sorted) {
          const ctrlObj = getCtrlObj(type);
          pending.push(fn.call(this, payload, ctrlObj));
        } else {
          if (!passedEvtObj) passedEvtObj = getCtrlObj(type);
          await fn.call(this, payload, passedEvtObj); // eslint-disable-line
          if (passedEvtObj.isStoped) break;
        }
      }
    }
    if (!sorted) {
      return Promise.all(pending);
    }
    return passedEvtObj;
  },
};

module.exports = (origin) => {
  let obj = typeof origin === 'function' ? origin.prototype : origin;
  if (!obj) obj = {};
  ['on', 'off', 'emit'].forEach((name) => {
    obj[name] = API[name];
  });
  return origin || obj;
};
