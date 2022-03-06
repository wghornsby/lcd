/** 
 * LCD v3.2.1
 * JavaScript library (c)2019 Warren Hornsby 
 **/

/** Local database */
class LocalDb {
  //
  static open(name, setup) {
    var me = new this(name);
    me.open();
    if (setup && me.notSetup()) {
      setup(me);
    }
    return me;
  }
  //
  constructor(name) {
    this.name = name;
    this._tables = {};
    this._tpkfs = {};
  }
  createTables(tpfks) {
    each(tpfks, (pkf, tname) => {
      if (! this.table(tname, 1)) {
        this.createTable(tname, pkf);
      }
    })
  }
  createTable(tname, pkf) {
    var table = new this.constructor.Table(this, tname, pkf);
    this._tables[tname] = table;
    this._tpkfs[tname] = pkf;
    this.saveTables();
    return table;
  }
  drop() {
    each(this._tables, (table, tname) => this.dropTable(tname));
    this.eraseTables();
  }
  dropTable(tname) {
    var table = this.table(tname);
    table.drop();
    this._tables[tname] = null;
    delete this._tables[tname];
    delete this._tpkfs[tname];
    this.saveTables();
  }
  insert(tname) {
    var table = this.table(tname);
    return table.insert();
  }
  insertOrUpdate(tname) {
    var table = this.table(tname);
    return table.insertOrUpdate();
  }
  select(tname) {
    var table = this.table(tname);
    return table.select();
  }
  update(tname) {
    var table = this.table(tname);
    return table.update();    
  }
  delete(tname) {
    var table = this.table(tname);
    return table.delete();
  }
  //
  notSetup() {
    return Object.isEmpty(this._tables);
  }
  setup() {
    // override to create tables on first open
  }
  table(tname, allowUndef) {
    var table = this._tables[tname];
    if (table === undefined && ! allowUndef) {
      throw "Table " + tname + " not defined"
    }
    return table;
  }
  key(sub) {
    return this.name + '.' + sub;
  }
  open() {
    var tpkfs = LocalDb.fetch(this.key('tables'));
    each(tpkfs, (pkf, tname) => {
      this._tables[tname] = LocalDb.Table.open(this, tname, pkf);
      return null;
    })
    return this;
  }
  saveTables() {
    LocalDb.store(this.key('tables'), this._tpkfs);
  }
  eraseTables() {
    LocalDb.erase(this.key('tables'));
  }
  //
  static store(key, o) {
    localStorage.setItem(key, js(o));
  }
  static fetch(key) {
    return JSON.parse(localStorage.getItem(key));
  }
  static erase(key) {
    localStorage.removeItem(key);
  }
}
LocalDb.Table = class {
  //
  static open(db, name, pkf) {
    var me = new LocalDb.Table(db, name, pkf);
    return me.open();
  }
  //
  constructor(db, name, pkf) {
    this.name = name;
    this._db = db;
    this._pkf = pkf;
    this._pks = [];
    this._npk = 0;
    this._key = db.name + '.table.' + name;
    priv(this, '_db', '_pkf', '_pks', '_npk', '_key');
  }
  open() {
    var stats = this.fetchStats();
    if (stats) {
      this._pks = stats.pks;
      this._npk = stats.npk;
    }
    return this;
  }
  drop() {
    this._pks.forEach(pk => this.eraseRow(pk));
    this.eraseStats();
  }
  select() {
    return {
      where:filter => this.selectByWhere(filter),
      pk:pk => this.selectByPk(pk)
    }
  }
  selectByWhere(filter) {
    var rows = this.selectAll();
    if (filter) {
      rows = rows.filter(filter);
    }
    return rows;
  }
  selectByPk(pk, throwIfNotFound) {
    var row = LocalDb.fetch(this.key(pk));
    if (row === undefined && throwIfNotFound) {
      throw 'Row not found';
    }
    return row;
  }
  selectAll() {
    var rows = [];
    this._pks.forEach(pk => rows.push(LocalDb.fetch(this.key(pk))));
    return rows;
  }
  delete() {
    return {
      where:filter => this.deleteByWhere(filter),
      pk:pk => this.deleteByPk(pk)
    }
  }
  deleteByWhere(filter) {
    var rows = this.selectByWhere(filter), pk;
    rows.each(row => {
      pk = row[this._pkf];
      this.deletePk(pk);
    })
    this.saveStats();
    return rows.length;
  }
  deleteByPk(pk) {
    this.selectByPk(pk, 1);
    this.deletePk(pk);
    this.saveStats();
  }
  deletePk(pk) {
    this.eraseRow(pk);
    this._pks = this._pks.filter(i => i != pk); 
  }
  insertOrUpdate() {
    return {
      values:e => this.insertOrUpdateByValues(e)
    }
  }
  insert() {
    return {
      values:e => this.insertByValues(e)
    }
  }
  update() {
    return {
      set:setter => {
        return {
          where:filter => this.updateByWhere(setter, filter),
          pk:pk => this.updateByPk(setter, pk)
        }
      },
      values:o => this.updateByValues(o)
    }
  }
  insertOrUpdateByValues(rec) {
    if (rec[this._pkf]) {
      return this.updateByValues(rec);
    } else {
      return this.insertByValues(rec);
    }
  }
  insertByValues(e) {
    var recs = (Array.isArray(e)) ? e : [e], row;
    recs.forEach(rec => {
      row = this.insertRec(rec);
    })
    return row;
  }
  insertRec(rec) {
    var row = jscopy(rec);
    row[this._pkf] = ++this._npk;
    this._pks.push(this._npk);
    this.saveStats();
    this.save(row);
    return row;
  }
  updateByWhere(setter, filter) {
    var rows = this.selectByWhere(filter);
    this.updateRows(rows, setter);
    return rows.length;
  }
  updateByPk(setter, pk) {
    var rows = [this.selectByPk(pk, 1)];
    return this.updateRows(rows, setter);
  }
  updateRows(rows, setter) {
    var row;
    rows.forEach(r => {
      setter(r);
      this.save(r);
      row = r;
    })
    return row;
  }
  updateByValues(o) {
    var pk = o[this._pkf];
    if (pk === undefined) {
      throw 'PK undefined';
    }
    var row = this.selectByPk(pk, 1);
    row = Object.assign(row, o);
    this.save(row);
    return row;
  }
  key(sub) {
    return this._key + '.' + sub;
  }
  save(row) {
    LocalDb.store(this.key(row[this._pkf]), row);
  }
  saveStats() {
    LocalDb.store(this.key('stats'), {'npk':this._npk, 'pks':this._pks});
  }
  fetchStats() {
    return LocalDb.fetch(this.key('stats'));
  }
  eraseStats() {
    LocalDb.erase(this.key('stats'));
  }
  eraseRow(pk) {
    LocalDb.erase(this.key(pk));
  }
}

/** Local client/server 
var LocalServer = {
  process(action, args, data) {  // e.g. 'getUser',{id:5} or 'saveUser',null,{id:5,name:'George'}
    switch(action) {
      // ...
    }
  }
}
*/
class LocalClient extends Obj {
  onworking(b) {}
  /**
   * Optional events - if not implemented, throw will be done instead
   * onexpired() {}
   * onerror(msg) {}
   */
  constructor(server) {
    super();
    this.server = server;
  }
  async ajax_get(action, args) {
    if (Number.isInteger(args)) {
      args = {id:args};
    }
    return await this.ajax('GET', action, args);
  }
  async ajax_post(action, body) {
    return await this.ajax('POST', action, body);
  }
  async ajax(method, action, o) {
    this.onworking(1);
    await wait(1);
    try {
      var data = o && jscopy(o);
      var lresp = JSON.parse(this.server.process(action, data));
      if (lresp[0] == 200) {
        return lresp[1];
      } else {
        if (lresp[0] == 419 && this.onexpired) {
          return this.onexpired();
        }
        if (this.onerror) {
          return this.onerror(lresp[1]);
        } else {
          throw lresp[1];
        }
      }
    } catch (e) {
      log(e);
      throw 'Unknown Error';
    }
  }
}
class LocalResponse extends Array {
  //
  static asOK(o) {
    if (o === undefined) {
      o = null;
    }
    return js(new this(200, o));
  }
  static asOKOrNotFound(row) {
    return row ? this.asOK(row) : this.asNotFound();
  }
  static asBadRequest(msg = 'Bad Request') {
    return js(new this(400, msg));
  }
  static asUnauthorized(msg = 'Unauthorized') {
    return js(new this(401, msg));
  }
  static asBadLogin(msg = 'Bad Login') {
    return js(new this(401, msg));
  }
  static asForbidden(msg = 'Forbidden') {
    return js(new this(403, msg));
  }
  static asNotFound(msg = 'Not Found') {
    return js(new this(404, msg));
  }
  static asExpired(msg = 'Session Expired') {
    return js(new this(419, msg));
  }
  static asServerError(msg = 'Internal Server Error') {
    return js(new this(500, msg));
  }
}

/** Local session */
class LocalSession {
  //
  static open(key, minToExpire = 30) {
    return new this(key, minToExpire);
  }
  constructor(key, minToExpire = 30) {
    this.store = new Storage(key, minToExpire);
    this.data = {};
    this.fetch();
  }
  fetch() {
    this.data = this.store.fetch() || {};
    return this.data;
  }
  set(fid, value) {
    this.data[fid] = value;
    this.save();
    return this;
  }
  get(fid) {
    return this.data[fid];
  }
  save() {
    this.store.save(this.data);
    return this;
  }
  erase() {
    this.store.erase();
    this.data = {};
    return this;
  }
}
class Storage {
  //
  constructor(key, minToExpire = null/*never*/) {
    this.key = key;
    this.minToExpire = minToExpire;
  }
  save(obj) {
    var expires = this.minToExpire ? Date.now() + this.minToExpire * 60000 : null;
    localStorage.setItem(this.key, js({obj:obj,expires:expires}));
  }
  fetch() {
    var o = JSON.parse(localStorage.getItem(this.key));
    if (o?.expires) {
      if (Date.now() > o.expires) {
        this.erase();
        o = null;
      } else {
        this.save(o.obj); // to update expires
      }
    }
    return o?.obj;
  }
  erase() {
    localStorage.removeItem(this.key);
  }    
}
Array.prototype.sortBy = function(refs) {
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
