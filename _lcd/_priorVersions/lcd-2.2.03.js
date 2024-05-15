/** 
 * LCD v2.2.03
 * JavaScript library (c)2017 Warren Hornsby 
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
        if (sources[i].hasOwnProperty(name) || target[name] == undef) {
          target[name] = sources[i][name];
        }
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
  },
  linkify:function(s) {
    var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
    var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;    
    return String.denull(s)
    .replace(urlPattern, '<a class="linkify" target="_blank" href="$&">$&</a>')
    .replace(pseudoUrlPattern, '$1<a class="linkify" target="_blank" href="http://$2">$2</a>')
    .replace(emailAddressPattern, '<a class="linkify" target="_blank" href="mailto:$&">$&</a>');    
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
  },
  singleton:function(/*args*/) {
    if (! this._i) {
      this._i = this.apply(this, arguments);
    }
    return this._i;
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
        var r;
        for (var i = 0; i < this._events[event].length; i++) {
          r = this._events[event][i].apply(this, arguments);
        }
        return r;
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
    return this;
  },
  each:function(ctxOrFn, fn) {
    return each(this, ctxOrFn, fn);
  },
  clear:function() {
    this.length = 0;
    return this;
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
ProtoArray.Indexed = {
  init:function() {
    this.map = {};
  },
  get:function(id, mapid/*=null*/) {
    mapid = mapid || '_DEF';
    var me = this.map[mapid][id];
    if (me == null && this.asNotFound) {
      me = this.asNotFound(id);
    }
    return me;
  },
  index:function(ref, mapid/*=null*/) {
    mapid = mapid || '_DEF';
    this.map[mapid] = this.map[mapid] || {};
    this.each(this, function(rec) {
      this.map[mapid][resolve(rec, ref)] = rec;
    })
    return this;
  }  
}
/** Local storage */
var Storage = Proto({
  init:function(key, minToExpire/*=null(never)*/) {
    this.key = key;
    this.minToExpire = minToExpire;
  },
  save:function(obj) {
    var expires = this.minToExpire ? Date.now() + this.minToExpire * 60000 : null;
    localStorage.setItem(this.key, JSON.stringify({obj:obj,expires:expires}));
  },
  fetch:function() {
    var o = JSON.parse(localStorage.getItem(this.key));
    if (o && o.expires && Date.now() > o.expires) {
      this.erase();
      o = null;
    }
    return o && o.obj;
  },
  erase:function() {
    localStorage.removeItem(this.key);
  }  
})
/** Server */
var Server = Proto({
  onbeforeajax:function() {},
  onafterajax:function(o) {return o}/*allows modification of successful response prior to JSON.parse*/,
  //
  init:function(url, /*fn*/responsePreProc/*=null*/) {
    this.url = url;
    this.preproc = responsePreProc ? responsePreProc : function(j) {return j};  
  },
  ajax_get:function(uri, onsuccess, onerror) {
    this.ajax('GET', uri, null, onsuccess, onerror);
  },
  ajax_post:function(uri, rec, onsuccess, onerror) {
    this.ajax('POST', uri, rec, onsuccess, onerror);
  },
  ajax_put:function(uri, rec, onsuccess, onerror) {
    this.ajax('PUT', uri, rec, onsuccess, onerror);
  },
  ajax_save:function(uri, adding, rec, id, onsuccess, onerror) {
    if (adding) {
      this.ajax_post(uri, rec, onsuccess, onerror);
    } else {
      this.ajax_put(uri + '/' + (id || ''), rec, onsuccess, onerror);
    }
  },  
  //
  ajax:function(type, uri, rec, onsuccess, onerror) {
    this.onbeforeajax();
    var data = rec ? JSON.stringify(rec) : null;
    var onafter = this.onafterajax.bind(this);
    $.ajax({
      type:type, 
      url:this.url + uri, 
      data:data, 
      contentType:'application/json', 
      dataType:'html',
      timeout:15000,
      success:function(j) {
        j = onafter(j);
        onsuccess(JSON.parse(j)); 
      },
      error:function(o, status, error) {
        if (onerror) {
          onerror(o, status, error);
        } else {
          alert(o.statusText);
        }
      }
    })
  },
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
  return Proto({
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
      var me = this;
      this.on$($e, $event, function() {
        me['on' + $event]();
      })
    }
  }, arguments);
}
Ui.Page = {
  getQueryValue:function(fid) {
    var url = window.location.href;
    fid = fid.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + fid + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
    if (! results) return null;
    if (! results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }  
}
var UiTable = Ui({
  //
  init:function($this/*<table>*/) {
    this.$this = $this;
    this.$head = $this.find('THEAD');
    this.$body = $this.find('TBODY');
  },
  clear:function() {
    this.$body.html('');
  },
  $tr:function() {
    this._$tr = $('<tr>').appendTo(this.$body);
    return this._$tr;
  },
  $td:function(html) {
    return $('<td>').html(html).appendTo(this._$tr);
  },
  $trs:function() {
    return this.$body.children();
  },
  html:function(h) {
    this.$body.html(h);
  }
})
var UiEntry = Ui({
  onkeyesc:function() {},
  //
  init:function($this/*container*/) {
    this.$this = $this;
    $this.find('.icheck').on('click', function() {
      $(this).prev().click();
    })
  },
  load:function(rec) {
    this.rec = rec;
    this.reset();
    return this;
  },
  get:function() {
    var o = mix({}, this.rec), fid;
    this.$this.find('.i').each(function() {
      fid = this.id.split('_')[1];
      o[fid] = $(this).val();
    })
    return o;
  },
  reset:function() {
    var rec = this.rec;
    this.$this.find('.i').each(function() {
      fid = this.id.split('_')[1];
      $(this).val((rec == null || rec[fid] == null) ? '' : rec[fid]);
    })
    this.resetValidation();
    return this;
  },
  require:function() {
    this.resetValidation();
    var $this = this.$this, name;
    $this.find('.req').each(function() {
      if ($(this).val() == '' || $(this).val() == null) {
        if (! name) {
          $(this).focus();
        }
        name = this.name || $('label[for="' + this.id + '"]').text() || "Field";
        $this.find('#' + this.id + '_err').text(name + ' is a required field.').fadeIn();
      }
    })
    return name;    
  },
  show:function() {
    this.$this.show();
    this.bindKeys(1);
  },
  hide:function() {
    this.$this.hide();
    this.bindKeys(0);
  },
  loadSelect:function($e, recs, fid, ftext) {
    var a = ['<option value=""></option>'], fn, text, val;
    if (recs.length) {
      fn = Function.isFunction(recs[0][ftext]);
      each(recs, this, function(rec) {
        text = fn ? rec[ftext]() : rec[ftext];
        val = rec[fid] == null ? '' : rec[fid];
        a.push('<option value="' + val + '">' + text + '</option>');
      })
    }
    a = a.join('');
    var e = $e[0]; 
    if (e.children.length) { /*following seems to be fastest way to empty a select*/
      var c = e.cloneNode(false);
      e.parentNode.replaceChild(c, e);
      c.innerHTML = a;
    } else {
      e.innerHTML = a;
    }
  },
  //
  bindKeys:function(b) {
    if (b) {
      var onkeyesc = this.onkeyesc.bind(this);
      this.$this.on('keyup', this.$this, function(e) {
        if (e.keyCode == 27) { 
          onkeyesc();
        }
      })
    } else {
      this.$this.off('keyup', this.$this);
    }
    return this;
  },
  resetValidation:function() {
    this.$this.find('.err').text('').hide();
  }
})
var UiDialog = Ui({
  oncancel:function() {},
  //
  init:function(title) {
    var $e = $("<dialog class='dialog'><div class='dtitle'></div><div class='dbody'></div><div class='dact'></div></dialog>").appendTo($('body'));
    this.$title = $e.find('.dtitle');
    this.$body = $e.find('.dbody');
    this.$acts = $e.find('.dact');
    this.d = $e.get(0);
    dialogPolyfill.registerDialog(this.d);
    this.title(title);
    var me = this;
    this.d.oncancel = function(e) {
      e = e || window.event;
      e.stopPropagation();
      me.oncancel();
    }
  },
  title:function(s) {
    this.$title.text(s || '');
  },
  body:function($e) {
    this.$body.append($e);
  },
  button:function(text, ctx, onclick, cls) {
    $e = $('<a class="' + (cls || '') + '">').html(text).on('click', onclick.bind(ctx));
    this.$acts.append($e);
    return $e;
  },
  show:function(wide) {
    this.d.showModal();
    this.d.className = 'dialog dialog-scale' + (wide ? ' dwide' : '');    
  },
  close:function() {
    this.d.close();
  }
})
var UiMsgBox = Ui({
  oncancel:function() {},
  //
  init:function(title) {
    this.dialog = UiDialog(title)
    .bubble('cancel', this);
    this.$prompt = $('<span>');
    this.dialog.body(this.$prompt);
    this.$ok = this.dialog.button('OK', this, this.$ok_onclick);
    this.$cancel = this.dialog.button('Cancel', this, this.$cancel_onclick);
  },
  show:function(prompt, ctx, callback/*onok*/, hideCancel) {
    this.$prompt.html(prompt);
    this.onok = callback && callback.bind(ctx);
    this.$ok.show();
    this.$cancel.toggle(! hideCancel);
    this.dialog.show();
  },
  showOkOnly:function(prompt, ctx, callback) {
    this.show(prompt, ctx, callback, true);
  },
  //
  $ok_onclick:function() {
    this.dialog.close();
    this.onok && this.onok();    
  },
  $cancel_onclick:function() {
    this.dialog.close();
    this.oncancel();
  }
})
/** XML */
/*  
 <person id="12"><name>Fred</name></person>
 {tag:"person",  
  attr:{"id":12},
  text:"",
  inners:[
   {tag:"name",
    attr:null,
    text:"Fred",
    inners:[]}]}
 */
var Jxml = Proto({
  //
  init:function(e) {
    this.tag = null;
    this.attr = null;
    this.text = "";
    this.inners = [];
    if (String.isString(e)) {
      e = new DOMParser().parseFromString(e, 'text/xml');
    }
    if (! (e && e.nodeType)) {
      return;  
    }
    if (e.nodeType == e.DOCUMENT_NODE) {
      e = e.documentElement;
    }
    var n = Jxml.clean(e);
    if (n) {
      this.tag = n.tagName;
      if (n.attributes.length) {
        this.attr = {};
        each(n.attributes, this, function(a) {
          this.attr[a.nodeName] = String.denull(a.nodeValue);
        })
      }
      each(n.childNodes, this, function(n) {
        switch (n.nodeType) {
        case n.ELEMENT_NODE:
          this.inners.push(Jxml(n));
          break;
        case n.TEXT_NODE:
          this.text += Jxml.escape(n.nodeValue);
          break;
        }
      })
    }    
  },
  each:function(ctx, fn) {
    return each(this.inners, ctx, fn);
  }
}).stat({
  clean:function(e) {
    e.normalize();
    var n = e.firstChild;
    while (n) {
      switch (n.nodeType) {
      case n.ELEMENT_NODE:
        Jxml.clean(n);
        n = n.nextSibling;
        break;
      case n.TEXT_NODE:
        if (Jxml.hasNonWhitespace(n)) {
          n = n.nextSibling;
        } else {
          var next = n.nextSibling;
          e.removeChild(n);
          n = next;
        }
        break;
      default:
        n = n.nextSibling;
      }
    }
    return e;
  },
  escape:function(s) {
    return s
    .replace(/[\\]/g, "\\\\")
    .replace(/[\"]/g, '\\"')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r');
  },  
  hasNonWhitespace:function(n) {
    return n.nodeValue.match(/[^ \f\n\r\t\v]/);
  }
})
