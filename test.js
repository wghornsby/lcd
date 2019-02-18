logg('DOM');
var clicks = 0;
var na = $$('.a');
assert(na.length, 2, 'na.length');
na.on('click', function() {
	log('click a');
	clicks++;
})
na[0].click();
na[1].click();
assert(clicks, 2, 'clicks');
$('.b').on('click', function() {
	log('click b');
	clicks++;
})
$('.b').click();
assert(clicks, 3, 'clicks');
na[0].on('click', function() {
	log('click na[0]');
	clicks++;
})
na[0].click();
assert(clicks, 5, 'clicks');
logg(1);

logg('_OBJ and _ARRAY');
class Product extends _Obj {
	/*
	 id
	 name
	 active
	 desc
	 */
	init(o) {
		this.mix(o);
	}
	entityid() {
		return this.id;
	}
}
class Products extends _Array {
	//
	init(a) {
		this.load(a, Product);
	}
}
class EditProduct extends _Obj {
	/*
	 product
	 hists
	 */
	init(o) {
		this.product = new Product(o.product);
		this.hists = Hists(o.hists);
	}
}

var a2 = ['a','b','c','d','e'];
log(a2);
assert(a2.findValue('b'), 1, 'a2.findValue');

var p1 = {id:2,name:'B',active:0,desc:'B prod'};
var p2 = {id:1,name:'A',active:1,desc:'A prod'};
var p3 = {id:3,name:'C',active:1,desc:'C prod'};

var a = new Products([p1, p2, p3]);
log(a);
assert(Function.isFunction(a.each), true, 'a.each == fn')
assert(a.length, 3, 'a.length');
assert(a[1].constructor.name, 'Product', 'a[1]');

var af = a.filterBy({'active':1});
log(af);
assert(af.length, 2, 'af.length');

var as = a.sortBy('name');
log(as);
assert(Function.isFunction(as.each), true, 'as.each == fn')
assert(as.length, 3, 'as.length');
assert(as[0].name, 'A', 'as[0]');
assert(as[1].name, 'B', 'as[1]');
assert(as[2].name, 'C', 'as[2]');

as = a.sortBy('-entityid()');
log(as);
assert(as[0].id, 3, 'as[0]');
assert(as[1].id, 2, 'as[1]');
assert(as[2].id, 1, 'as[2]');

as.clear();
log(as);
assert(Function.isFunction(as.each), true, 'as.each == fn')
assert(as.length, 0, 'as.length');

class Dog extends _Obj {
	onbark(volume) {}
	//
	constructor(name) {
		super();
		this.name = name;
	}
	pet() {
		this.onbark(1);
	}
	outside() {
		this.onbark(10);
	}
}
var db = 0, db2 = 0;
function dogbark(volume) {
	log('bark ' + volume);
	db += volume;
}
function dogbark2(volume) {
	log('bark2 ' + volume);
	db2 += volume;
}
var d1 = new Dog('Fido')
	.on('bark', dogbark)
	.on('bark', dogbark2)
  .on('bark', dogbark2);

d1.pet();
assert(db, 1, 'db pet');
assert(db2, 2, 'db2 pet');

d1.outside();
assert(db, 11, 'db outside');
assert(db2, 22, 'db2 outside');

logg(1);
