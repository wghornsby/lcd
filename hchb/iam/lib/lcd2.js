/** 
 * LCD v 2.1.01
 * Warren Hornsby 
 **/

/** 
 * CORE FUNCTIONS AND EXTENSIONS  
 **/
var undef;
function mix(target, source/*, source,..*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < sources.length; i++) { 
    if (sources[i] instanceof Object) {
      for (var name in sources[i]) {
        if (sources[i].hasOwnProperty(name) || target[name] == undef)
          target[name] = sources[i][name];
      }
    }
  }
  return target;
}
function extend(from/*, mixin,..*/) {
  if (from) { 
    var args = Array.fromArgs(arguments);
    args[0] = Object.create(from);
    return mix.apply(args[0], args);
  }
}
function copy(o) { 
  return extend({}, o);
}
function resolve(o, ref, toUpperCase/*=null*/) {
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
function getset(o, fid, e) {
  /*
   * name:function(e) {
   *   return getset(this, 'name', e);
   * }
   */
  if (e === undef) {
    return o[fid];
  } else {
    o[fid] = e;
    return this;
  }
}
function ec(constructor, prototype, statics) {
  for (var name in prototype) {
    if (! constructor.prototype[name]) {
      constructor.prototype[name] = prototype[name];
    }
  }
  for (var name in statics) {
    if (! constructor[name]) {
      constructor[name] = statics[name];
    }
  }
  return constructor;
}
/* Function */
ec(Function, {
  bind:/*fn*/function(context/*, arg, arg,..*/) {
    /* 
     * $anchor.on('click', this.dostuff.bind(this));
     * $anchor.on('click', this.dostuff.bind(this, i, 'something'));
     */
    var args = Array.prototype.slice.call(arguments, 1);
    var fn = this;
    return function() {
      return fn.apply(context, args.concat(Array.prototype.slice.call(arguments)));
    }
  },
  curry:/*fn*/function(/*arg, arg,..*/) {
    /* 
     * $anchor.on('click', dostuff.curry(i));
     */
    var args = Array.fromArgs(arguments);
    var fn = this;
    return function() {
      return fn.apply(fn, args.concat(Array.prototype.slice.call(arguments)));
    }
  },
  extend:/*fn*/function(fn) {
    /*
     * parent.add = function(x, y) {return x + y}
     * child.add = parent.add.extend(function(_add, x, y, z) {
     *   return _add(_add(x, y), z);
     * })
     * parent.add(1, 2);   // returns 3
     * child.add(1, 2, 3); // returns 6
     */
    var fnOrig = this;
    return function() {
      return fn.apply(fn, [fnOrig].concat(Array.prototype.slice.call(arguments)));
    }
  }
},{
  isFunction:function(e) {
    return isFunction(e);
  },
  defer/*fn*/:function(/*s*/method/*, arg, arg,..*/) {
    /*
     * obj.load = function(recs) {
     *   this.recs = recs;
     *   Function.defer('onload', recs);
     * } 
     */
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
      return this[method] && this[method].apply(this, args);
    }
  }  
})
function isFunction(e) {
  try {  
    return /^\s*\bfunction\b/.test(e);  
  } catch (e) {
    return false;  
  }    
}
/* String */
ec(String, {  
},{
  isString:/*b*/function(e) {
    return e !== null && typeof e == 'string';
  },
  empty:/*b*/function(e) {
    return e == null || String.trim(e).length == 0;
  },
  from:/*s*/function(e) {
    return String.denull(e);
  },
  trim:/*s*/function(e) {
    if (Array.isArray(e)) {
      for (var i = 0; i < e.length; i++) {
        e[i] = String.trim(e[i]);
      }
      return e;
    } else {
      return (e != null) ? (e + '').replace(/\xa0/g, '').replace(/^\s+|\s+$/g, '') : null;
    }
  },
  denull:/*s*/function(e) {
    return (e == null) ? '' : e + '';
  },  
  nullify:function(e) {
    return (e == null) ? null : (String.trim(e + '') == '') ? null : e;
  }
})
/* Object */
ec(Object, {
},{
  isArguments:function(e) {
    return Object.prototype.toString.call(e) === '[object Arguments]';
  },
  isObject:function(e) {
    return (typeof e === "object") && (e !== null);
  }
})
/* Array */
ec(Array, {
  find:/*i*/function(value) {
    return Array.find(this, value);
  },
  has:/*b*/function(value) {
    return Array.find(this, value) != -1;
  }
},{
  empty:function(array) {
    return array == null || array.length == 0;
  },
  copy:function(array) {
    return array && array.slice();
  },
  find:function(array, value) { 
    if (array && array.length) {
      for (var i = 0, l = array.length; i < l; i++) { 
        if (array[i] == value) 
          return i;
      }
    }
    return -1;
  },
  push:function(e, i) {
    if (e == null)
      e = [];
    e.push(i);
    return e;
  },
  flatten:function(array) {
    if (array && array.length) {
      if (! Array.isArray(array[0]))
        array[0] = [array[0]];
      return array.reduce(function(a, b) {
        return a.concat(b);
      })
    } else {
      return array;
    }
  },
  fromArgs:function(args) {
    return Array.prototype.slice.call(args);
  }
})
/** Map */
var Map = {
  isMap:function(e) {
    return e && typeof e === 'object' && ! Array.isArray(e);
  },
  props:/*s[]*/function(e) {
    var p = {};
    if (Map.isMap(e)) {
      for (var i in e) {
        if (e.hasOwnProperty(i) && ! Function.isFunction(e[i]))
          p[i] = e[i];
      }
    }
    return p;
  },
  keys:/*s[]*/function(e) {
    var a = [];
    var p = Map.props(e);
    for (var i in p) 
      a.push(i);
    return a;
  },
  values:/*[]*/function(e) {
    var a = [];
    var p = Map.props(e);
    for (var i in p) 
      a.push(p[i]);
    return a;
  },
  from:/*{}*/function(e, key) {
    var m = {};
    if (Array.isArray(e)) {
      var isf = Function.isFunction(key), k;
      each(e, this, function(o) {
        k = isf ? o[key]() : o[key];
        m[k] = o;
      })
    }
    return m;
  }
}
/** Looping */
function each(/*[]|{}*/items, ctxOrFn, /*fn(item, index)*/fn) {
  /* 
   * each(recs, function(rec, i) {
   *   dostuff(rec);
   * })
   * return each(recs, this, function(rec, i) {
   *   if (this.matches(rec)) {
   *     return rec;
   *   }
   * })
   */
  var ctx, r;
  if (fn) {
    ctx = ctxOrFn;
  } else {
    ctx = items;
    fn = ctxOrFn;
  }
  if (items && items.length != undef) { 
    for (var i = 0, l = items.length; i < l; i++) {
      r = fn.call(ctx, items[i], i);
      if (r) 
        break;
    }
  } else if (Map.isMap(items)) {
    for (var i in items) {
      if (! Function.isFunction(items[i])) {
        r = fn.call(ctx, items[i], i);
        if (r)
          break;
      }
    }
  }
  return r;
}
function sort(/*[]*/recs, /*fn(rec)*/valfn) {
  /*
   * sort(dogs, function(dog) {
   *   return dog.height;
   * })
   */
  [].sort.call(recs, function(a, b) {
    var va = valfn(a), vb = valfn(b);
    if (va > vb) 
      return 1;
    else if (va < vb)
      return -1;
    else 
      return 0;
  })
  return recs;
}
function filter(/*[]*/recs, /*fn(rec)*/include) {
  var a = (recs._constructor && recs._constructor()) || [];
  each(recs, function(rec) {
    if (include(rec)) {
      a.push(rec);
    }
  })
  return a;
}
function loop(/*fn(exit)*/fn, /*i*/ms/*=1*/) {
  /* 
   * loop(function(exit) {
   *   dostuff(i++);
   *   if (i > 10) exit();
   * })
   */
  fn.timer = setInterval(fn.curry(function(onfinish) {
    fn.timer = clearInterval(fn.timer);
    if (onfinish)
      onfinish();
  }), ms || 1);
}
function async(fnOrCtx, fn) {
  fn = fn ? fn.bind(fnOrCtx) : fnOrCtx;
  return setTimeout(fn, 1);
}
/** Logging and unit tests */
function log(o) {
  if (typeof o == 'object') 
    console.log(js(o));
  else
    console.log(o);
}
function logg(cap/*string=start group, null=close group, true=close group and show elapsed time*/) {
  if (cap && cap.length) {
    console.group(cap);
    if (logg.timer == null)
      logg.timer = [];
    logg.timer.push(Date.now());
  } else {
    if (logg.timer) {
      var elapsed = (Date.now() - logg.timer.pop()) / 1000;
      if (cap)
        log('[' + elapsed + ']');
    }
    console.groupEnd();
  }
}
function assert(value, expected, cap) {
  value = js(value);
  expected = js(expected);
  cap = cap ? cap + ': ' : '';
  var r = value == expected;
  if (r)
    console.log('%c' + cap + value, 'color:green');
  else
    console.error(cap + value + ', expected: ' + expected);
  return r;
}
function js(o) {
  return JSON.stringify(o);
}
/** Exception handling */
/*
 * throw exception('sql2proc', 'No columns found beyond identifier.'); 
 */
function exception(name, message) {
  return {
    name:name,
    message:message,
    toString:function() {
      return this.name + ': ' + this.message;
    }
  }
}
/** 
 * PROTOTYPES
 **/
var Prototype = {
  _proto:{},
  _inits:[],
  extend:function(/*proto,..*/) {
    var i = {};
    var constructor = mix(Prototype_maker.bind(i), this);
    i._stat = constructor;
    constructor._inits = Array.copy(this._inits);
    constructor._proto = Object.create(this._proto);
    var protos = Array.fromArgs(arguments);
    for (var i = 0; i < protos.length; i++) {
      for (var name in protos[i]) {
        if (name == 'init') {
          constructor._inits.push(protos[i].init);
        } else if (protos[i].hasOwnProperty(name) || constructor._proto[name] == undef) {
          constructor._proto[name] = protos[i][name];
        }
      }
    }
    return constructor;
  },  
  make:function(/*arg,..*/) {
    return Object.create(this._proto);
  },
  stat:function(o) {
    var me = mix(this, o);
    if (o && o.make) {
      me = this.extend.call(me, this._proto);
    }
    return me;
  }
}
var Prototype_maker = function(/*arg,..*/) {
  var constructor = this._stat || this;
  var instance = constructor.make.apply(constructor, arguments);
  instance._constructor = constructor;
  if (constructor._inits.length) {
    var args = Array.fromArgs(arguments);
    each(constructor._inits, function(init) {
      init.apply(instance, args);
    })
  }
  return instance;  
}
/** Proto */
function Proto(/*proto,..*/) {
  var args = Array.fromArgs(arguments);
  each(args, function(e, i) {
    if (Object.isArguments(e))
      args[i] = Array.fromArgs(e);
  })
  var protos = [Proto.Base].concat(Array.flatten(args));
  return Prototype.extend.apply(Prototype, protos);
}
Proto.Base = {
  stat:function(o) {
    return o ? this._constructor.stat(o) : this._constructor;
  },
  mix:function(o) {
    /*
     * init:function(o) {
     *   this.mix(o);
     * }
     */
    return mix(this, o);
  },
  apply:function(fid, proto) {
    /*
     * this.apply('dog', Dog);  // equiv to: this.dog = Dog(this.dog);
     */
    this[fid] = proto(this[fid]);
  },
  on:function(event, ctxOrFn, fn) {
    /*
     * dog.on('bark', this, this.dog_onbark);
     * dog.on('bark', this.dog_onbark.bind(this, dog);
     */
    fn = fn ? fn.bind(ctxOrFn) : ctxOrFn;
    if (this._events === undef)
      this._events = {};
    if (this._events[event]) {
      this._events[event].push(fn);
    } else {
      this._events[event] = [fn];
      this['on' + event] = function() {
        for (var i = 0; i < this._events[event].length; i++) {
          this._events[event][i].apply(this, arguments);
        }
      }
    }
    return this;
  },
  bubble:function(event, ctx, targetevent/*omit to keep same as event*/) {
    /*
     * dog.bubble('bark', this);
     */
    this.on(event, ctx, function() {
      this[targetevent || ('on' + event)].apply(this, arguments);      
    })
    return this;
  }
}
/*
 * var Dogs = ProtoArray({
 *   init:function(array) {
 *     this.load(array, Dog);
 *   }
 * })
 */
function ProtoArray(/*proto,..*/) {
  return Proto(ProtoArray.Base, arguments).stat({
    make:function() {
      return mix([], this._proto);
    }
  })
}
ProtoArray.Base = {
  load:function(a, proto/*=null*/) {
    each(a, this, function(e) {
      this.push(proto ? proto(e) : e);
    })
  },
  each:function(ctxOrFn, fn) {
    return each(this, ctxOrFn, fn);
  },
  clear:function() {
    this.length = 0;
  },
  index:function(fid) {
    this.map = {};
    this.each(this, function(rec) {
      this.map[rec[fid]] = rec;
    })
  },
  filter:function(/*{ref:[value,..],..}*/refmap) {
    /*
     * this.filter({'vendor().name':['ALPHA','BETA'],'active':1})
     */
    each(refmap, function(values, ref) {
      if (! Array.isArray(values)) {
        values = [values];
      }
      for (var i = 0; i < values.length; i++) {
        if (String.isString(values[i])) {
          values[i] = values[i].toUpperCase();
        }
      }
      refmap[ref] = values;
    })
    var a = this._constructor();
    this.each(function(rec) {
      var exclude = each(refmap, this, function(values, ref) {
        var v = resolve(rec, ref, 1);
        if (Array.find(values, v) == -1) {
          return true;
        }
      })
      if (! exclude) {
        a.push(rec);
      }
    })
    return a;
  },
  sort:function(/*ref,..*/) {
    /*
     * this.load(recs.sort('-active, app().name, route().short(), vendor().name')));
     */
    var refs = Array.fromArgs(arguments), orders = [];
    if (refs.length) {
      if (refs.length == 1) {
        refs = refs[0].split(',');
      }
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
  }
}
/** Local storage */
var Storage = Proto({
  init:function(key) {
    this.key = key;
  },
  save:function(obj) {
    localStorage.setItem(this.key, JSON.stringify(obj));
  },
  fetch:function() {
    var obj = JSON.parse(localStorage.getItem(this.key));
    return obj;
  },
  erase:function() {
    localStorage.removeItem(this.key);
  }  
})
/** UI */
var UiHistory = ProtoArray({
  /*
   replaying (1=working)
   */
  onreplay:function() {/*typically ui will reset() here*/},
  onreplaydone:function() {/*typically ui will onupdate() here*/},
  //
  init:function() {
    this.i = 0;
    this.hard = [];
    this.hardi = 0;
    this.replaying = 0;
  },
  add:function(ui, method, args, soft/*=null*/) {
    var action = UiHistory.Action(ui, method, args, soft);
    action.play();
    if (action.hard) {
      this.hard.splice(this.hardi++, this.hardi.length, this.i);
    }
    this.splice(this.i++, this.length, action);
  },
  soft:function(ui, method, args) {
    this.add(ui, method, args, 1);
  },
  undo:function() {
    if (this.undoable()) {
      this.i = this.hard[--this.hardi];
      this.replay();
    }
  },
  redo:function() {
    if (this.redoable()) {
      this.i = this.hard[++this.hardi];
      this.replay();
    }
  },
  undoable:function() {/*also indicates dirty*/
    return this.hardi > 0;
  },
  redoable:function() {
    return this.hardi < this.hardi.length;
  },
  //
  replay:function() {
    this.onreplay();
    this.replaying = 1;
    this.each(function(action, i) {
      if (i < this.i)
        action.play();
    })
    this.replaying = 0;
    this.onreplaydone();
  }
}).stat({
  Action:Proto({
    /*
     ui
     method
     args
     hard
     */
    init:function(ui, method, args, soft) {
      this.ui = ui;
      this.method = method;
      this.args = JSON.parse(JSON.stringify(Array.prototype.slice.call(args)));
      this.hard = ! soft;
    },
    play:function() {
      this.ui[this.method].apply(this.ui, this.args);
    }
  })
})
function Ui(/*proto,..*/) {
  return Proto(Ui.Base, arguments);
}
Ui.Base = {
  on$:function($e, $event, onevent/*, arg,..*/) {
    /*
     * this.on$($a, 'click', this.$a_onclick, id);
     */
    var me = this;
    var args = Array.prototype.slice.call(arguments, 3);
    $e.on($event, function() {
      onevent.apply(me, args);
    })
    return this;
  },
  bubble$:function($e, $event) {
    /*
     * this.bubble$($this, 'click')
     */
    this.on$($e, $event, this['on' + $event]);
  }
}
