/* Servers */
PageServer = Proto({
  //
  init:function(serverproto) {
    this.server = serverproto()  
      .on('beforeajax', this, this.server_onbeforeajax)
      .on('afterajax', this, this.server_onafterajax)
      .on('error', this, this.server_onerror);
  },
  server_onbeforeajax:function() {
    Page.working(1);
  },
  server_onafterajax:function() {
    Page.working(0);
  },
  server_onerror:function(o, status, error) {
    Page.working(0);
    Page.msgbox.showOkOnly("There was a problem communicating with the server.<br><br>" + error);
  }
}).stat({
  of:function(serverproto) {
    return PageServer(serverproto).server;
  }
})
//
var ArvServer = Proto({
  onbeforeajax:function() {},
  onafterajax:function() {},
  onerror:function(o, status, error) {},
  //
  init:function() {
    this.server = Server(my.env.serverUrl)  
      .bubble('beforeajax', this)
      .on('afterajax', this, this.server_onafterajax)
  },
  getLists:function(callback) {
    this.server.ajax_get('lists', callback, this.onerror.bind(this));
  },
  getReqdefs:function(callback) {
    this.server.ajax_get('reqdefs', callback, this.onerror.bind(this));
  },
  getReqdef:function(id, callback) {
    this.server.ajax_get('reqdef/' + id, callback, this.onerror.bind(this));
  },
  getRoute:function(id, callback) {
    this.server.ajax_get('route/' + id, callback, this.onerror.bind(this)); 
  },
  getProduct:function(id, callback) {
    this.server.ajax_get('product/' + id, callback, this.onerror.bind(this)); 
  },
  getFeed:function(id, callback) {
    this.server.ajax_get('feed/' + id, callback, this.onerror.bind(this)); 
  },
  getApp:function(id, callback) {
    this.server.ajax_get('application/' + id, callback, this.onerror.bind(this)); 
  },
  getArv:function(id, callback) {
    this.server.ajax_get('arv/' + id, callback, this.onerror.bind(this));
  },
  saveReqdef:function(adding, rec, callback) {
    this.ajax_save('reqdef', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  saveProduct:function(adding, rec, callback) {
    this.ajax_save('product', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  saveFeed:function(adding, rec, callback) {
    this.ajax_save('feed', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  saveApp:function(adding, rec, callback) {
    this.ajax_save('application', adding, rec, rec.aid, callback, this.onerror.bind(this));
  },
  saveVendor:function(adding, rec, callback) {
    this.ajax_save('vendor', adding, rec, rec.aid, callback, this.onerror.bind(this));
  },
  saveArv:function(adding, rec, callback) {
    this.ajax_save('arv', adding, rec, rec.arvid, callback, this.onerror.bind(this));
  },
  saveRoute:function(adding, rec, callback) {
    this.ajax_save('route', adding, rec, rec.rid, callback, this.onerror.bind(this));
  },
  saveMatch:function(adding, rec, callback) {
    this.ajax_save('match', adding, rec, rec.arvmid, callback, this.onerror.bind(this));
  },
  saveAssign:function(adding, rec, callback) {
    this.ajax_save('assign', adding, rec, rec.arvaid, callback, this.onerror.bind(this));
  },
  saveReqcat:function(adding, rec, callback) {
    this.ajax_save('reqcat', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  saveDataflow:function(adding, rec, callback) {
    this.ajax_save('dataflow', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  saveNamespace:function(adding, rec, callback) {
    this.ajax_save('namespace', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  saveSku:function(adding, rec, callback) {
    this.ajax_save('sku', adding, rec, rec.skuid, callback, this.onerror.bind(this));
  },
  saveReq:function(adding, entity, rec, callback) {
    rec.entity = entity;
    this.ajax_save('req', adding, rec, rec.id, callback, this.onerror.bind(this));
  },
  //
  ajax_save:function(uri, adding, rec, id, callback) {
    rec.auditUser = my.user;
    this.server.ajax_save(uri, adding, rec, id, callback, this.onerror.bind(this));
  },
  server_onafterajax:function(j) {
    this.onafterajax();
    return j && j.split('CacheSP:')[0];    
  }
})
