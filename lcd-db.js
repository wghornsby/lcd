/** 
 * LCD v3.2.01
 * JavaScript library (c)2019 Warren Hornsby 
 **/

/** Local database */
class LocalDb {
  //
  static open(name) {
    var me = new this(name);
    return me.open();
  }
  //
  constructor(name) {
    this.name = name;
    this._tables = {};
    this._tpkfs = {};
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
    var table = this.table(tname, 1);
    table.drop();
    this._tables[tname] = null;
    delete this._tables[tname];
    delete this._tpkfs[tname];
    this.saveTables();
  }
  insert(tname) {
    var table = this.table(tname, 1);
    return table.insert();
  }
  select(tname) {
    var table = this.table(tname, 1);
    return table.select();
  }
  update(tname) {
    var table = this.table(tname, 1);
    return table.update();    
  }
  delete(tname) {
    var table = this.table(tname, 1);
    return table.delete();
  }
  //
  table(tname, throwIfNotFound) {
    var table = this._tables[tname];
    if (table === undefined && throwIfNotFound) {
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
    priv(this, {
      _db:db,
      _pkf:pkf,
      _pks:[],
      _npk:0,
      _key:db.name + '.table.' + name
    })
  }
  open() {
    var stats = this.fetchStats();
    this._pks = stats.pks;
    this._npk = stats.npk;
    return this;
  }
  drop() {
    this._pks.all(pk => this.eraseRow(pk));
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
    this._pks.all(pk => rows.push(LocalDb.fetch(this.key(pk))));
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
  insert() {
    return {
      values:e => this.insertByValues(e)
    }
  }
  insertByValues(e) {
    var recs = (Array.isArray(e)) ? e : [e], row;
    recs.all(rec => {
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
    rows.all(r => {
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

/** Local client/server */
class LocalServer {
  //
  process(action/*'ex. 'getPatient'*/, args/*ex. {id:5}*/, data/*posted object*/) {
    /**
    switch(action) {
    }
    */
  }
}
class LocalClient {
  //
  constructor(server) {
    this.server = server;
  }
  async ajax_get(action, args) {
    if (Number.isInteger(args)) {
      args = {id:args};
    }
    return await this.ajax('GET', action, args, onsuccess);
  }
  async ajax_post(action, body) {
    return await this.ajax('POST', action, body);
  }
  async ajax(method, action, o) {
    var data = o && jscopy(o);
    wait(500).then(() => {
      var j = this.server.process(action, data);
      return JSON.parse(j);
    })
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
  static asForbidden(msg = 'Forbidden') {
    return js(new this(403, msg));
  }
  static asNotFound(msg = 'Not Found') {
    return js(new this(404, msg));
  }
}

/** Local session */
class LocalSession {
  //
  static open(key, minToExpire = 30) {
    return new this(key, minToExpire);
  }
  //
  constructor(key, minToExpire = 30) {
    this.store = new Storage(key, minToExpire);
    this.data = {};
    this.fetch();
  }
  save() {
    this.store.save(this.data);
    return this;
  }
  fetch() {
    this.data = this.store.fetch() || {};
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
    if (o && o.expires && Date.now() > o.expires) {
      this.erase();
      o = null;
    }
    return o && o.obj;
  }
  erase() {
    localStorage.removeItem(this.key);
  }    
}
/** Storage */
class Storage {
  //
  constructor(key, minToExpire/*=null(never)*/) {
    this.key = key;
    this.minToExpire = minToExpire;
  }
  save(o) {
    let expires = this.minToExpire ? Date.now() + this.minToExpire * 60000 : null;
    localStorage.setItem(this.key, JSON.stringify({obj:o,expires:expires}));
  }
  fetch() {
    var o = JSON.parse(localStorage.getItem(this.key));
    if (o && o.expires && Date.now() > o.expires) {
      this.erase();
      o = null;
    }
    return o && o.obj;
  }
  erase() {
    localStorage.removeItem(this.key);
  }
}
