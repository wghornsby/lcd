/** 
 * LCD v3.0.01
 * JavaScript library (c)2019 Warren Hornsby 
 **/

/** DOM */
window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = Node.prototype.addEventListener;
NodeList.prototype.on = NodeList.prototype.addEventListener = function(name, fn) {
  this.forEach((elem, i) => {elem.on(name, fn)});
}

/** Extensions */
Function.isFunction = e => typeof e === 'function';
String.isString = e => typeof e === 'string';
Array.prototype.findValue = function(e) {
	return this.findIndex(ee => ee == e);
} 
Array.prototype.sortBy = function(refs) {
  /*
   * this.load(recs.sort('-active, app().name, route().short(), vendor().name')));
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
}
Array.prototype.filterBy = function(refmap) {
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
	var a = new this.constructor();
	this.each(function(rec) {
		var exclude = each(refmap, this, function(values, ref) {
			var v = resolve(rec, ref, 1);
			if (Array.findValue(values, v) == -1) {
				return true;
			}
		})
		if (! exclude) {
			a.push(rec);
		}
	})
	return a;		
}
Array.findValue = function(arr, e) {
	return arr ? arr.findValue(e) : -1;
}

/** Global functions */
function each(items, ctxOrFn, fn) {
	var ctx, r;
	if (fn) {
		ctx = ctxOrFn;
	} else {
		ctx = items;
		fn = ctxOrFn;
	}
	if (items) {
		for (var i in items) {
			if (! Function.isFunction(items[i])) {
				r = fn.call(ctx, items[i], i);
				if (r) {
					break;
				}
			}			
		}
	}
	return r;
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
function log(o) {
	if (typeof o === 'object') { 
		console.log(js(o));
	} else {
		console.log(o);
	}
}
function logg(cap/*string=start group, null=close group, true=close group and show elapsed time*/) {
	if (cap && cap.length) {
		console.group(cap);
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
function assert(value, expected, cap) {
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
var js = JSON.stringify;

/** Object library */
class _Array extends Array {
	//
	constructor(a) {
		super();
		this.init(a);
	}
	init(a) {
		this.load(a);
	}
	load(a, cls) {
		if (a) {
			each(a, this, e => {this.push(cls ? new cls(e) : e)});
		}
	}
	clear() {
		this.length = 0;
		return this;
	}
	each(ctxOrFn, fn) {
		return each(this, ctxOrFn, fn);
	}
}
class _Obj {
	//
	constructor() {
		this.init(...arguments);
	}
	init() {
	}
	mix(o) {
		return Object.assign(this, o);
	}
	each(ctxOrFn, fn) {
		return each(this, ctxOrFn, fn);
	}
  on(event, ctxOrFn, fn) {
    /*
     * dog.on('bark', this, this.dog_onbark);
     * dog.on('bark', this.dog_onbark.bind(this, dog);
     */
    fn = fn ? fn.bind(ctxOrFn) : ctxOrFn;
    var _events = Symbol.for('_events');
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
      }
    }
    return this;
  }
  bubble(event, ctx, targetevent/*omit to keep same as event*/) {
    /*
     * dog.bubble('bark', this);
     */
    this.on(event, ctx, () => {this[targetevent || ('on' + event)](...arguments)});
    return this;
  }
}
class _Ui extends _Obj {
	//
	on$($e, $event, onevent, ...args) {
    /*
     * this.on$($a, 'click', this.$a_onclick, id);
     */
    var me = this;
    $e.on($event, function() {
      onevent.apply(me, args);
    })
    return this;
	}
  bubble$($e, $event) {
    /*
     * this.bubble$($this, 'click')
     */
    var me = this;
    this.on$($e, $event, function(...args) {
      me['on' + $event].apply(me, args);
    })
  }
}