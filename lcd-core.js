/** 
 * LCD v3.2.05
 * JavaScript library (c)2020 Warren Hornsby 
 **/

/** DOM */
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function(event, fn, options) {
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

/** Extensions */
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
  sortBy:function(refs) {
    /*
     * recs.sortBy('-active, app().name, route().short(), vendor().name'));
     */
    var orders = [];
    if (refs) {
      refs = refs.split(',');
      for (var i = 0; i < refs.length; i++) {
        refs[i] = refs[i].trim();
        if (refs[i].substr(0, 1) == '-') {
          refs[i] = refs[i].substr(1);
          orders.push(-1);
        } else {
          orders.push(1);
        }
      }
      [].sort.call(this, function(a, b) {
        var va, vb;
        for (var i = 0; i < refs.length; i++) {
          va = resolve(a, refs[i], 1);
          vb = resolve(b, refs[i], 1);
          if (va > vb) {
            return 1 * orders[i];
          }
          if (va < vb) {
            return -1 * orders[i];
          }
        }
        return 0;
      })
    }
    return this;    
  },
  has:function(value) {
    return this.findValue(value) > -1;
  },
  each:function(fn) {
    return each(this, fn);
  },
  all:function(fn) {
    each(this, function() {
      fn(...arguments);
    })
    return this;
  },
  pushIf(cond, e) {
    if (cond) {
      this.push(e === undefined ? cond : e);
    }
  }
})

/** Global functions */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function each(items, ctxOrFn, fn) {
  var ctx, r;
  if (fn) {
    ctx = ctxOrFn;
  } else {
    ctx = items;
    fn = ctxOrFn;
  }
  if (items) {
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) {
        r = fn.call(ctx, items[i], i);
        if (r) {
          break;
        }        
      }
    } else {
      for (var i in items) {
        if (! Function.isFunction(items[i])) {
          r = fn.call(ctx, items[i], i);
          if (r) {
            break;
          }
        }     
      }
    }
  }
  return r;
}
function resolve(o, ref, toUpperCase = null) {
  /*
   * o = {vendor:function(){return{name:'fred'}}}
   * v = resolve(o, 'vendor().name'); 
   */
  if (ref) {
    var refs = ref.split('.'), a;
    for (var i = 0; i < refs.length; i++) {
      if (o != null) {
        a = refs[i].split('()');
        o = (a.length == 1) ? o[a[0]] : o[a[0]]();
      }
    }
  }
  if (toUpperCase && String.isString(o)) {
    o = o.toUpperCase();
  }
  return o;
}
function priv(target, map/*{fid:val,fid:val...}*/) {
  each(map, (val, fid) => {
    Object.defineProperty(target, fid, {value:val,writable:true});
  })
}
function log(o, cap/*=null*/) {
  if (cap) {
    log(cap);
  }
  if (typeof o === 'object') { 
    console.log(js(o));
  } else {
    console.log(o);
  }
}
function logg(cap/*string=start group, null=close group, true=close group and show elapsed time*/, collapsed/*=0*/) {
  if (cap && cap.length) {
    collapsed ? console.groupCollapsed(cap) : console.group(cap);
    if (logg.timer == null) {
      logg.timer = [];
    }
    logg.timer.push(Date.now());
  } else {
    if (logg.timer) {
      var elapsed = (Date.now() - logg.timer.pop()) / 1000;
      if (cap) {
        log('[' + elapsed + ']');
      }
    }
    console.groupEnd();
  }
}
function loggg(cap, fn) {
  logg(cap,1);
  fn();
  logg();
}
function assert(value, expected, cap = null) {
  value = js(value);
  expected = js(expected);
  cap = cap ? cap + ': ' : '';
  var r = value == expected;
  if (r) {
    console.log('%c' + cap + value, 'color:green');
  } else {
    console.error(cap + value + ', expected: ' + expected);
  }
  return r;
}
function rnd(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
function jscopy(o) {
  return JSON.parse(JSON.stringify(o));
}
const js = JSON.stringify;

/** Object library */
class Rec {
  //
  constructor() {
    this.init(...arguments);
  }
  init() {
  }
  mix(o) {
    return Object.assign(this, o);
  }
  priv(map) {
    priv(this, map);
  }
  each(fn) {
    return each(this, fn);
  }
  all(fn) {
    each(this, function() {
      fn(...arguments);
    })
    return this;
  }
}
class RecArray extends Array {
  //
  constructor() {
    super();
    this.init(...arguments);
  }
  init() {
    this.load(...arguments);
  }
  load(a, cls, indexfid/*=null, to not index*/) {
    if (a) {
      each(a, e => {this.push(cls ? new cls(e) : e)});
      this.map(indexfid);
    }
  }
  clear() {
    this.length = 0;
    return this;
  }
  get(id) {
    return this[Symbol.for('_Array.ixmap')][id];
  }
  remove(id) {
    var rec = this.get(id);
    if (rec) {
      var i = this.findValue(rec);
      if (i > -1) {
        this.splice(i, 1);
        delete this[Symbol.for('_Array.ixmap')][id];
      }
    }
    return this;
  }
  add(rec) {
    this.push(rec);
    this[Symbol.for('_Array.ixmap')][rec[this[Symbol.for('_Array.ixfid')]]] = rec;
    return this;
  }
  index(id) {
    return this.findValue(this[Symbol.for('_Array.ixmap')][id]);
  }
  //
  map(fid) {
    if (fid) {
      this[Symbol.for('_Array.ixfid')] = fid;
      this[Symbol.for('_Array.ixmap')] = {};
      this.each((rec) => {
        this[Symbol.for('_Array.ixmap')][rec[fid]] = rec;
      })
    }
  }
}
class Ui {
  //
  constructor() {
    this.init(...arguments);
  }
  init() {
  }
  on(event, fn) {
    /*
     * dog.on('bark', () => this.dog_onbark(dog));
     */
    var _events = Symbol.for('Ui.events');
    if (this[_events] === undefined)
      this[_events] = {};
    if (this[_events][event]) {
      this[_events][event].push(fn);
    } else {
      this[_events][event] = [fn];
      this['on' + event] = function() {
        var r;
        for (var i = 0; i < this[_events][event].length; i++) {
          r = this[_events][event][i](...arguments);
        }
        return r;
      }.bind(this);
    }
    return this;
  }
  bubble(event, ctx, targetevent/*omit to keep same as event*/) {
    /*
     * dog.bubble('bark', this);
     */
    this.on(event, function(...args) {
      this[targetevent || ('on' + event)](...args)
    }.bind(ctx))
    return this;
  }
}