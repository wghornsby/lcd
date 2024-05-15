/** 
 * LCD simple v1.2.1
 * JavaScript library (c)2023 Warren Hornsby 
 **/

/** DOM */
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function(event, fn, options) {
  this._events = this._events || {};
  this._events[event] = this._events[event] || [];
  this._events[event].push(fn);
  this.addEventListener(event, fn, options);
  return this;
}
Node.prototype.on_once = window.on_once = function(event, fn) {
  this.addEventListener(event, fn, {once:true});
  return this;
}
NodeList.prototype.on = function(name, fn, options) {
  this.forEach((elem, i) => {elem.on(name, fn, options)});
  return this;
}
HTMLElement.prototype.$ = HTMLElement.prototype.querySelector;
HTMLElement.prototype.$$ = HTMLElement.prototype.querySelectorAll;

/** Extensions */
Object.assign(Object, {
  isObject:e => e && typeof e === 'object' && ! Array.isArray(e),
  isEmpty:e => Object.keys(e).length === 0
})
Object.assign(Function, {
  isFunction:e => typeof e === 'function'
})
Object.assign(String, {
  isString:e => typeof e === 'string',
  denull:e => (e == null) ? '' : e + '',
  isEmpty:e => e == null || (e + '').trim().length == 0,
  nullify:e => (e == null) ? null : ((e + '').trim() == '') ? null : e
})
Object.assign(Array.prototype, {
  findValue:function(e) {
    return this.findIndex(ee => ee == e);
  },
  has:function(value) {
    return this.findValue(value) > -1;
  },
  pushIf:function(cond, e) {
    cond && this.push(e === undefined ? cond : e);
  } 
})

/** Logging/testing */
function log(o, cap) {
  cap && console.warn(cap);
  console.log(typeof o === 'object' ? js(o) : o);
}
function logg(cap/*string=start group, null=close group, true=close group and show elapsed time*/, collapsed/*=0*/) {
  if (cap && cap.length) {
    collapsed ? console.groupCollapsed(cap) : console.group(cap);
    logg.timer = logg.timer || [];
    logg.timer.push(Date.now());
  } else {
    logg.timer && cap && log('[' + ((Date.now() - logg.timer.pop()) / 1000) + ']');
    console.groupEnd();
  }
}
function loggg(cap, fn) {
  logg(cap, 1);
  fn();
  logg();
}
function assert(value, expected, cap = null) {
  value = js(value), expected = js(expected), cap = cap ? cap + ': ' : '';
  let r = value == expected;
  if (r) {
    console.log('%c' + cap + value, 'color:green');
  } else {
    console.error(cap + value + ', expected: ' + expected);
  }
  return r;
}

/** Misc functions */
const guid = () => crypto.randomUUID();
const wait = (ms, fn) => setTimeout(fn, ms);
const priv = (target, ...fids) => {
  fids.forEach(fid => Object.defineProperty(target, fid, {enumerable:false}));
}
const rnd = max => Math.floor(Math.random() * Math.floor(max));
const js = JSON.stringify;
const jscopy = o => JSON.parse(js(o));
const pojo = o => clone(o, 'toPojo');
const clone = (o, fname) => { 
  let p = Array.isArray(o) ? [] : {};
  each(o, (val, fid) => {
    if (Array.isArray(val)) {
      p[fid] = clone(val, fname);
    } else if (Object.isObject(val)) {
      p[fid] = (val[fname]) ? val[fname]() : clone(val, fname);
    } else if (Array.isArray(val)) {
      p[fid] = clone(val, fname);
    } else {
      p[fid] = val;
    }
  })
  return p;
}
const qs = () => {
  var o = {};
  for (const [fid, val] of (new URLSearchParams(window.location.search).entries())) {
    o[fid] = val;
  }
  return o; /*{fid:value,fid:value,..}*/
}
const each = (items, fn) => {
  let r;
  if (items) {
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) {
        r = fn.call(items, items[i], i);
        if (r) {
          break;
        }        
      }
    } else {
      for (var i in items) {
        if (! Function.isFunction(items[i])) {
          r = fn.call(items, items[i], i);
          if (r) {
            break;
          }
        }     
      }
    }
  }
  return r;
}

/** Custom object */
class Obj {
  //
  on(event, fn) {
    this['on' + event] = fn;
    return this;
  }
  priv(...fids) {
    fids.forEach(fid => Object.defineProperty(this, fid, {enumerable:false}));
  }
}
class ObjArray extends Array {
  //
  on(event, fn) {
    this['on' + event] = fn;
    return this;
  }
}

/** Storage */
class Storage {
  //
  constructor(key) {
    this.key = key;
  }
  save(o) {
    localStorage.setItem(this.key, js(o));
  }
  fetch() {
    let s = localStorage.getItem(this.key);
    return s && JSON.parse(s);
  }
  erase() {
    localStorage.removeItem(this.key);
  }
}
class StorableObj extends Obj {
  //
  constructor(key, clean = 0) {
    super();
    this._storage = new Storage(key || window.location);
    this.priv('_storage');
    if (clean) {
      this.erase();
    } else {
      this.fetch();
    }
  }
  fetch() {
    let o = this._storage.fetch();
    this.mix(o);
  }
  mix(o) {
    if (o) {
      Object.assign(this, o);
    }
  }
  save() {
    this._storage.save(pojo(this));
  }
  erase() {
    this._storage.erase();   
  }
}

/** Server */
class Server extends Obj {
  onbeforeajax() {}
  onafterajax(o) {return o/*allows modification of successful response prior to JSON.parse*/}
  //
  constructor(url) {
    this.url = url;
  }
  ajax_get(uri, onsuccess, onerror) {
    
  }
}