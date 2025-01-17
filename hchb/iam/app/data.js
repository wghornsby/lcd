/* Data elements */
var Product = Proto({
  /*
   id
   name
   active
   desc
   */
  init:function(o) {
    this.mix(o);
  },
  entityid:function() {
    return this.id;
  },
  feeds:function() {
    return my.lists.feeds.filterProduct(this.id);
  },
  feedsForRoute:function(rid) {
    return this.feeds().filterRoute(rid);
  }
}).stat({
  asNew:function() {
    return Product({active:1});
  }
})
var Feed = Proto({
  /*
   id
   aid
   vid
   active
   iptid
   iinid
   idftid
   ipid
   req
   totalCost
   configCost
   desc
   */
  init:function(o) {
    this.mix(o);
    this.totalCost = this.totalCost || '';
    this.configCost = this.configCost || '';
  },
  entityid:function() {
    return this.id;
  },
  unassigned:function()  {
    return this.ipid == null;
  },
  name:function() {
    return this.app().name + ' - ' + this.vendor().name;
  },
  app:function() {
    return my.lists.apps.get(this.aid);
  },
  vendor:function() {
    return my.lists.vendors.get(this.vid);
  },
  product:function() {
    return my.lists.products.get(this.ipid);
  },
  routes:function() {
    return this.arvs().routes();
  },
  activeRoutes:function() {
    return this.arvs().active().routes();
  },
  arvs:function() {
    return my.lists.arvs.filterFeed(this);
  },
  arv:function(rid) {
    var a;
    if (rid) {
      a = this.arvs().filterRoute(rid);
    } else {
      a = this.arvs().active();
    }
    return a.length && a[0];
  },
  platformHtml:function() {
    var ns = this.namespaceName()
    var text = this.platformName()
    var ip;
    if (ns) {
      ip = this.arvs().nodes().each(this, function(node) {
        return node.ip();
      })  
    }
    if (ip) {
      return '<a href="http://' + ip + ':57772/csp/healthshare/' + ns + '/EnsPortal.ProductionConfig.zen?$NAMESPACE=' + ns + '" target="_blank">&#10697; ' + text + '</a>';
    } else {
      return text;
    }
  },
  platformName:function() {
    var rec = my.lists.platforms.get(this.iptid);
    if (rec) {
      var ns = this.namespaceName();
      return ns ? rec.name + ' (' + ns + ')' : rec.name;
    }
  },
  namespaceName:function() {
    var rec = my.lists.namespaces.get(this.iinid);
    return rec && rec.name;
  },
  dataflowName:function() {
    var rec = my.lists.dataflows.get(this.idftid);
    return rec && rec.name;
  }
}).stat({
  asNew:function(ipid, aid, vid) {
    return Feed({ipid:ipid, aid:aid, vid:vid, active:1});
  }
})
var Dataflow = Proto({
  /*
   id
   name
   desc
   */
  init:function(o) {
    this.mix(o);
  }
}).stat({
  asNew:function() {
    return Dataflow();
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    Page.server.saveDataflow(adding, rec, function() {
      Lists.fetchToGlobal(function() {
        callback.call(ctx);
      })
    })    
  }  
})
var Platform = Proto({
  /*
   id
   name
   desc
   */
  init:function(o) {
    this.mix(o);
  }
})
var Namespace = Proto({
  /*
   id
   name
   */
  init:function(o) {
    this.mix(o);
  }
}).stat({
  asNew:function() {
    return Namespace();
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    Page.server.saveNamespace(adding, rec, function() {
      Lists.fetchToGlobal(function() {
        callback.call(ctx);
      })
    })    
  }  
})
var Reqcat = Proto({
  /*
   id
   name
   desc
   */
  init:function(o) {
    this.mix(o);
  }
}).stat({
  asNew:function() {
    return Reqcat();
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    Page.server.saveReqcat(adding, rec, function() {
      Lists.fetchToGlobal(function() {
        callback.call(ctx);
      })
    })    
  }
})
var App = Proto({
  /*
   aid
   name
   dir
   */
  init:function(o) {
    this.mix(o);
  },
  dirText:function() {
    return App.dirText(this.dir);
  },
  arvs:function() {
    return my.lists.arvs.filterApp(this.aid);
  },
  isNotFound:function() {
    return this.name.substr(0, 9) == "NOT FOUND";
  }
}).stat({
  asNew:function() {
    return App({newid:my.lists.apps.nextId()})
  },
  dirText:function(dir) {
    switch (dir) {
    case 1:
      return 'INBOUND';
    case 2:
      return 'OUTBOUND';
    case 3:
      return 'BOTH';
    }
  }
})
var Arv = Proto({
  /*
   arvid
   aid
   rid
   vid
   arvnid
   nid
   active
   dbId
   dbHash
   */
  init:function(o) {
    this.mix(o);
  },
  entityid:function() {
    return this.arvid;
  },
  app:function() {
    return my.lists.apps.get(this.aid);
  },
  route:function() {
    return my.lists.routes.get(this.rid);
  },
  vendor:function() {
    return my.lists.vendors.get(this.vid);
  },
  node:function() {
    return my.lists.nodes.get(this.nid);
  },
  feed:function() {
    return my.lists.feeds.getByAppVendor(this.aid, this.vid);
  },
  hasFeed:function() {
    return this.feed() ? 1 : 0;
  },
  invalid:function() {
    return this.aid == null;
  },
  name:function() {
    return this.app().name + ' - ' + this.vendor().name + ' - ' + this.route().short();
  },
  isNew:function() {
    return this.arvid == null;
  }
}).stat({
  asNew:function(aid, vid, rid) {
    var apps, vendors, nodes, nid;
    if (aid) {
      vendors = my.lists.arvs.filterApp(aid).vendors()/*already in use by app*/;
      nodes = my.lists.arvs.filterApp(aid).nodes()/*already in use by app*/;
      vid = (vendors.length == 1) ? vendors[0].vid : null;
      nid = (nodes.length == 1) ? nodes[0].nid : null;
    } else if (vid) {
      apps = my.lists.arvs.filterVendor(vid).apps()/*already in use by vendor*/;
      nodes = my.lists.arvs.filterVendor(vid).nodes()/*already in use by vendor*/;
      aid = (apps.length == 1) ? apps[0].aid : null;
      nid = (nodes.length == 1) ? nodes[0].nid : null;
    }
    return Arv({aid:aid,vid:vid,nid:nid,rid:rid,active:1})
  }
})
var Route = Proto({
  /*
   rid
   server
   database
   tier
   ownid
   ownname
   acctno
   */
  init:function(o) {
    this.mix(o);
    if (o.rid == null) {
      this.rid = 0;
    }
  },
  entityid:function() {
    return this.rid;
  },
  short:function() {
    var s = this.database.replace('HCHB_', '');
    return s;
  },
  oid:function() {
    return '2.16.840.1.113883.3.3490.4.' + this.rid + (this.isLouisville() ? '.2' : '.1');  
  },
  isProd:function() {
    return this.tier == 1;
  },
  isTemp:function() {
    return this.database.substr(0, 5) == 'TEMP_';
  },
  isLouisville:function() {
    return this.server.substr(1, 1) == 'B';
  },
  arvs:function(all) {
    return my.lists.arvs.filterRoute(this.rid, all);
  },
  isNotFound:function() {
    return this.database.substr(0, 9) == "NOT FOUND";
  },
  products:function() {
    return my.lists.products.filterRoute(this.rid).sort('name');
  }
})
var Vendor = Proto({
  /*
   vid
   name
   active
   desc
   */
  init:function(o) {
    this.mix(o);
    this.desc = o.desc || '';
  },
  arvs:function() {
    return my.lists.arvs.filterVendor(this.vid, 1);
  },
  isNotFound:function() {
    return this.name.substr(0, 9) == "NOT FOUND";
  }  
}).stat({
  asNew:function() {
    return Vendor({newid:my.lists.vendors.nextId(),active:1})
  }
})
var Node = Proto({
  /*
   nid
   name
   type
   active
   */
  init:function(o) {
    this.mix(o);
  },
  arvs:function() {
    return my.lists.arvs.filterNode(this.nid);
  },
  apps:function() {
    var arvs = this.arvs(), apps = [], a = {};
    each(arvs, this, function(arv) {
      if (! a[arv.aid]) {
        a[arv.aid] = 1;
        apps.push(my.lists.apps.get(arv.aid));
      }
    })
    return Lists.Apps(apps).sort('name');
  },
  isProd:function() {
    var n = this.name.substr(0, 2);
    return (this.type == 2) && (n != 'DB' && n != 'QB');
  },
  isNew:function() {
    return ! (this.name == 'DBINTSYS101' || this.name == 'QBINTSYS111' || this.name == 'PBINTSYS103');
  },
  ip:function() {
    switch (this.name) {
    case 'HSPRD114':
      return '10.160.138.114';
    case 'HSPRD115':
      return '10.170.138.115';
    case 'TBINTSYS113':
      return this.name;
    }
  },
  typeText:function() {
    switch (this.type) {
    case 1:
      return 'SQL';
    case 2:
      return 'InterSystems';
    case 3:
      return 'Application';
    }
  }
})
var Match = Proto({
  /*
   arvmid
   arvid
   field
   value
   active
   */
  init:function(o) {
    this.mix(o);
  },
  activeText:function() {
    return Page.yesno(this.active);
  },
  activeHtml:function() {
    return this.active ? '<span class="yes">&#10003;</span> Yes' : '<span class="nope">&#10005;</span> No';
  }
}).stat({
  asNew:function(arvid) {
    return Match({arvid:arvid,active:1});
  }
})
var Assign = Proto({
  /*
   arvaid
   arvid
   field
   value
   active
   */
  init:function(o) {
    this.mix(o);
  },
  activeText:function() {
    return Page.yesno(this.active);
  }
}).stat({
  asNew:function(arvid) {
    return Assign({arvid:arvid,active:1});
  }
})
var Reqs = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Req).index('id').index('irdid', 'byReqdef').index('entityid', 'byEntityid');
  },
  getByReqdef:function(irdid) {
    return this.get(irdid, 'byReqdef');
  },
  getByEntityid:function(entityid) {
    return this.get(entityid, 'byEntityid');
  },
  defsort:function() {
    return this.sort('reqdef().reqcatName(),reqdef().sort,reqdef().id');
  },
  filterReqdef:function(irdid) {
    return Reqs(this.filter({'irdid':irdid}));
  },
  lowstat:function() {
    var i = 9;
    this.each(function(rec) {
      i = (rec.status < i) ? rec.status : i;
    })
    return i;
  }
}).stat({
  forEntity:function(reqs, reqdefs, entityid) {
    var me = Reqs();
    reqs = Reqs(reqs);
    Reqs.reqdefs = Reqdefs(reqdefs).defsort();
    Reqs.reqdefs.each(function(reqdef) {
      me.push(reqs.getByReqdef(reqdef.id) || Req.asNew(reqdef.id, entityid));
    })
    return me;
  },
  forReqdef:function(reqdef, reqs) {
    var me = Reqs();
    Reqs.reqdefs = Reqdefs([reqdef]);
    Reqs._append(me, reqdef, reqs);
    return me;
  },
  forReqdefs:function(reqdefs, reqs) {
    var me = Reqs();
    Reqs.reqdefs = reqdefs;
    Reqs.reqdefs.each(function(reqdef) {
      Reqs._append(me, reqdef, reqs.filterReqdef(reqdef.id));
    })
    return me;    
  },
  //
  _append:function(me, reqdef, reqs) {
    reqdef.entities().each(function(rec) {
      me.push(reqs.getByEntityid(rec.entityid()) || Req.asNew(reqdef.id, rec.entityid()));
    })    
  }
})
var Req = Proto({
  /*
   id
   irdid
   entityid
   status
   comment
   link
   score
   */
  init:function(o) {
    this.mix(o);
  },
  reqdef:function() {
    return Reqs.reqdefs.get(this.irdid);
  },
  title:function() {
    var rd = this.reqdef();
    return rd.reqcatName() + ': ' + rd.name;
  },
  entity:function() {
    return Hist.entity(this.reqdef().entity, this.entityid);
  },
  scoreText:function() {
    if (! this.reqdef().scorecard) {
      return "";
    } else {
      return this.score || '';
    }
  },
  statusText:function() {
    switch (this.status) {
    case 1: 
      return 'In Progress';
    case 9:
      return 'Completed';
    default:
      return 'Not Started';
    }
  },
  statusHtml:function() {
    var s = this.statusText();
    if (this.status == 9) {
      s = '<span class="yes">&#10003;</span> <span class="green">' + s + '</span>';
    } else if (! this.status) {
      s = '<span class="red">' + s + '</span>';
    }
    return this.statusAnchor(s);
  },
  statusAnchor:function(inner) {
    var a = "<a href='";
    switch (this.reqdef().entity) {
    case Hist.ENTITY_PRODUCT:
      a += 'product.csp?tab=3&';
      break;
    case Hist.ENTITY_FEED:
      a += 'feed.csp?tab=2&';
      break;
    case Hist.ENTITY_CUST:
      a += 'customer.csp?tab=2&';
      break;
    case Hist.ENTITY_ARV:
      a += 'arv.csp?tab=2&';
      break;
    }
    a += "id=" + this.entityid + "'>" + inner + "</a>";
    return a;
  },
  doc:function() {
    return Page.linkify(this.comment);
  }
}).stat({
  asNew:function(irdid, entityid) {
    return Req({irdid:irdid, entityid:entityid, status:0})
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    var entity = rec.reqdef().entity;
    var Rec;
    switch (entity) {
    case Hist.ENTITY_PRODUCT:
      Rec = EditProduct;
      break;
    case Hist.ENTITY_FEED:
      Rec = EditFeed;
      break;
    case Hist.ENTITY_CUST:
      Rec = EditRoute;
      break;
    case Hist.ENTITY_ARV:
      Rec = EditArv;
      break;
    }
    Page.server.saveReq(adding, entity, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, Rec(o));
      })
    })    
  },  
  //
  STATUS_NOT_DONE:0,
  STATUS_IN_PROG:1,
  STATUS_DONE:9
})
var Reqdefs = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Reqdef).index('id');
  },
  filterProd:function() {
    return this.filterBy(Reqdef.ENTITY_PROD);
  },
  filterFeed:function() {
    return this.filterBy(Reqdef.ENTITY_FEED);
  },
  filterCust:function() {
    return this.filterBy(Reqdef.ENTITY_CUST);
  },
  filterArv:function() {
    return this.filterBy(Reqdef.ENTITY_ARV);
  },
  filterBy:function(entity) {
    return filter(this, function(rec) {return rec.entity == entity});
  },
  defsort:function() {
    return this.sort('reqcatName(),sort,id');
  }
}).stat({
  // deprecated
  fetch:function(ctx, callback) {
    Page.server.getReqdefs(function(a) {
      callback.call(ctx, Reqdefs(a));
    })    
  }
})
var Reqdef = Proto({
  /*
   id
   entity
   ircatid
   active
   sort
   name
   desc
   scorecard 
   */
  init:function(o) {
    this.mix(o);
  },
  reqcatName:function() {
    return this.ircatid ? my.lists.reqcats.get(this.ircatid).name : '';
  },
  entityName:function() {
    return Reqdef.ENTITY_NAMES[this.entity];
  },
  entities:function() {
    switch (+this.entity) {
    case Hist.ENTITY_PRODUCT:
      return my.lists.products.sort('name');
    case Hist.ENTITY_FEED:
      return my.lists.feeds.sort('product().name,name()');
    case Hist.ENTITY_CUST:
      return my.lists.routes.custs().sort('database');
    case Hist.ENTITY_ARV:
      return my.lists.arvs.active().sort('name()');
    }    
  }  
}).stat({
  asNew:function(entity) {
    return Reqdef({entity:entity, active:1});
  },
  //
  ENTITY_ARV:3,
  ENTITY_CUST:4,
  ENTITY_PROD:5,
  ENTITY_FEED:6,
  ENTITY_NAMES:{3:'Configuration',4:'Customer',5:'Product',6:'Feed'}
})
/* Lists */
var Lists = Proto({
  /*
   arvs
   routes
   vendors
   nodes
   apps
   products
   feeds
   dataflows
   platforms
   reqcats
   namespaces
   */
  init:function(o) {
    this.arvs = Lists.Arvs(o.arvs);
    this.routes = Lists.Routes(o.routes);
    this.vendors = Lists.Vendors(o.vendors);
    this.nodes = Lists.Nodes(o.nodes);
    this.apps = Lists.Apps(o.applications);
    this.products = Lists.Products(o.products);
    this.feeds = Lists.Feeds(o.feeds, this.arvs);
    this.dataflows = Lists.Dataflows(o.dataflows);
    this.platforms = Lists.Platforms(o.platforms);
    this.reqcats = Lists.Reqcats(o.reqcats);
    this.namespaces = Lists.Namespaces(o.namespaces);
  }
}).stat({
  fetchToGlobal:function(callback) {
    Page.server.getLists(function(o) {
      my.lists = Lists(o);
      Lists.storage.save(o);
      callback && callback();
    })
  },
  cached:function(callback) {
    Page.working(1);
    async(function() {
      var o = Lists.storage.fetch();
      Page.working(0);
      if (o) {
        my.lists = Lists(o);
        callback();
      } else {
        Lists.fetchToGlobal(callback);
      } 
    })
  },
  //
  storage:Storage('Lists', 5/*minutes*/)
})
Lists.Arvs = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Arv).index('arvid');
  },
  filterApp:function(aid, all) {
    return this.filterBy('aid', aid, ! all); 
  },
  filterVendor:function(vid, all) {
    return this.filterBy('vid', vid, ! all); 
  },
  filterRoute:function(rid, all) {
    return this.filterBy('rid', rid, ! all);
  },
  filterNode:function(nid) {
    return this.filterBy('nid', nid, 1);
  },
  filterFeed:function(rec) {
    return this.filterApp(rec.aid, 1).filterVendor(rec.vid, 1);
  },
  filterBy:function(fid, value, active) {
    return filter(this, function(arv) {
      return (! active || (active && arv.active)) && (arv[fid] == value);
    })
  },
  active:function() {
    return filter(this, function(arv) {
      return arv.active;
    })
  },
  apps:function() {
    var map = {};
    this.each(function(arv) {
      map[arv.aid] = my.lists.apps.get(arv.aid);
    })
    return Lists.Apps(Map.values(map));
  },
  routes:function() {
    var map = {};
    this.each(function(arv) {
      map[arv.rid] = my.lists.routes.get(arv.rid);
    })
    return Lists.Routes(Map.values(map));
  },
  vendors:function() {
    var map = {};
    this.each(function(arv) {
      map[arv.vid] = my.lists.vendors.get(arv.vid);
    })
    return Lists.Vendors(Map.values(map));
  },
  nodes:function() {
    var map = {};
    this.each(function(arv) {
      map[arv.nid] = my.lists.nodes.get(arv.nid);
    })
    return Lists.Nodes(Map.values(map));
  },
  asNotFound:function(id) {
    return Arv({arvid:-1});
  }
})
Lists.Apps = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, App).index('aid');
  },
  asNotFound:function(id) {
    return App({aid:id, name:'NOT FOUND'});
  },
  nextId:function() {
    var id = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      if (this[i].aid > id) {
        id = this[i].aid;
      }
    }
    return id + 1;
  }
})
Lists.Routes = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Route).index('rid');
  },
  asNotFound:function(id) {
    return Route({rid:id, database:'NOT FOUND' + (id ? ': ' + id : '')});
  },
  forEntry:function(includeAll) {
    switch (my.env.tier) {
    case 1/*test*/: 
      if (includeAll) {
        return filter(this, function(rec) {
          return rec.server;
        })
      } else {
        return filter(this, function(rec) {
          return rec.server && (rec.tier == null || rec.tier >= 7);
        })
      }
    case 2/*QA*/:
      if (includeAll) {
        return filter(this, function(rec) {
          return rec.server;
        })
      } else {
        return filter(this, function(rec) {
          return rec.server && (rec.tier == null || rec.tier >= 6);
        })
      }
    case 3/*prod*/:
      return filter(this, function(rec) {
        return rec.tier < 6 || rec.database == 'TEMP_ADV_20190724142413030_WHORNSBY';
      })
    }
  },
  active:function() {
    return filter(this, function(rec) {
      return rec.isTemp() || rec.tier;
    })
  },
  custs:function(configured) {
    return filter(this, function(rec) {
      return configured ? rec.isProd() && rec.arvs().length : rec.isProd();
    })
  },
  byName:function(name) {
    var a = filter(this, function(rec) {
      return rec.short() == name;
    })
    return a.length && a[0];
  }
})
Lists.Vendors = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Vendor).index('vid');
  },
  asNotFound:function(id) {
    return Vendor({vid:id, name:'NOT FOUND'});
  },
  nextId:function() {
    var id = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      if (this[i].vid < 998 && this[i].vid > id) {
        id = this[i].vid;
      }
    }
    return id + 1;
  }
})
Lists.Nodes = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Node).index('nid');
  },
  active:function() {
    return filter(this, function(rec) {return rec.active});
  }
})
Lists.Products = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Product).index('id');
  },
  filterRoute:function(rid) {
    return filter(this, function(rec) {
      if (rec.feedsForRoute(rid).length) {
        return true;
      }
    })
  }
})
Lists.Feeds = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a, arvs) {
    this.load(a, Feed).indexAppVendors();
    if (arvs) {
      this.addUnassigned(arvs);
    }    
    this.index('id');
  },
  filterProduct:function(ipid) {
    return filter(this, function(rec) {
      return rec.ipid == ipid;
    })
  },
  filterRoute:function(rid) {
    var arvs = my.lists.arvs.filterRoute(rid);
    return filter(this, function(rec) {
      return arvs.each(this, function(arv) {
        if (rec.aid == arv.aid && rec.vid == arv.vid) {
          return true;
        }
      })
    })
  },
  filterUnassigned:function() {
    return filter(this, function(rec) {
      return rec.unassigned();
    })
  },
  getByAppVendor:function(aid, vid) {
    return this.mapav[aid + ',' + vid];
  },
  //
  indexAppVendors:function() {
    this.mapav = {};
    this.each(this, function(rec) {
      this.indexAppVendor(rec);
    })
    return this;
  },
  indexAppVendor:function(rec) {
    this.mapav[rec.aid + ',' + rec.vid] = rec;
  },
  addUnassigned:function(arvs) {
    var feed;
    arvs.each(this, function(arv) {
      if (arv.active) {
        if (! this.getByAppVendor(arv.aid, arv.vid)) {
          feed = Feed.asNew(null, arv.aid, arv.vid)
          this.push(feed);
          this.indexAppVendor(feed);
        }  
      }
    })
  }
})
Lists.Dataflows = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Dataflow).index('id');
  }
})
Lists.Platforms = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Platform).index('id');
  }
})
Lists.Namespaces = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Namespace).index('id');
  }
})
Lists.Reqcats = ProtoArray(ProtoArray.Indexed, {
  //
  init:function(a) {
    this.load(a, Reqcat).index('id');
  }
})
/* Edit/view packages */
var ViewReqdefs = Proto({
  /*
   reqdefs
   reqs
   */
  init:function(o) {
    this.reqdefs = Reqdefs(o.reqdefs);
    this.reqs = Reqs.forReqdefs(this.reqdefs, Reqs(o.reqs));
  }
}).stat({
  fetch:function(ctx, callback) {
    Page.server.getReqdefs(function(o) {
      callback.call(ctx, ViewReqdefs(o));
    })    
  }  
})
var EditProduct = Proto({
  /*
   product
   feeds
   hists
   arvhists
   reqs
   skus
   */
  init:function(o) {
    this.product = Product(o.product);
    this.feeds = Lists.Feeds(o.feeds);
    this.hists = Hists(o.hists);
    this.arvhists = Hists(o.arvhists);
    this.reqs = Reqs.forEntity(o.reqs, o.reqdefs, this.product.id);
    this.skus = EditProduct.Skus(o.skus);
  },
  isNew:function() {
    return this.product.id == null;
  },
  name:function() {
    return this.product.id ? this.product.name : 'New Record';
  },
  routefeeds:/*[{route:Route,feeds:[b,..]},..]*/function() {
    if (this.feeds.length) {
      return EditProduct.RouteFeeds(this.feeds).sort('route.short()');
    }
  }
}).stat({
  fetch:function(ctx, id, callback) {
    Page.server.getProduct(id, function(o) {
      callback.call(ctx, EditProduct(o));
    })    
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    Page.server.saveProduct(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditProduct(o));
      })
    })
  },
  saveSku:function(ctx, rec, callback) {
    var adding = ! rec.skuid;
    Page.server.saveSku(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditProduct(o));
      })
    })    
  },
  asNew:function() {
    return EditProduct({product:Product.asNew()});
  },
  RouteFeeds:ProtoArray({
    init:function(feeds) {
      var fl = feeds.length;
      var rmap = {}, frmaps = [];
      feeds.each(this, function(feed, i) {
        frmaps[i] = {};
        feed.activeRoutes().each(this, function(route) {
          rmap[route.rid] = route;
          frmaps[i][route.rid] = route;
        })
      })
      var routes = Map.values(rmap), rfeeds, req;
      each(routes, this, function(route) {
        rfeeds = [];
        for (var i = 0; i < fl; i++) {        
          rfeeds.push(frmaps[i][route.rid] ? 1 : (feeds[i].req ? -1 : 0));
        }
        this.push({route:route,feeds:rfeeds});
      })
    }
  }),
  Skus:ProtoArray({
	init:function(a) {
      this.load(a, Sku);
	}
  })
})
var Sku = Proto({
  /*
   id
   value
   desc
   active
   ipid
   */
  init:function(o) {
    this.mix(o);
  },
  activeText:function() {
    return Page.yesno(this.active);
  },
  activeHtml:function() {
    return this.active ? '<span class="yes">&#10003;</span> Yes' : '<span class="nope">&#10005;</span> No';
  }
}).stat({
  asNew:function(ipid) {
    return Sku({ipid:ipid,active:1});
  }
})
var EditFeed = Proto({
  /*
   feed
   hists
   arvhists
   product
   reqs
   */
  init:function(o) {
    this.feed = Feed(o.feed);
    this.hists = Hists(o.hists);
    this.arvhists = Hists(o.arvhists);
    this.product = this.feed.product();
    this.reqs = Reqs.forEntity(o.reqs, o.reqdefs, this.feed.id);
  },
  isNew:function() {
    return this.feed.id == null;
  },
  name:function() {
    return this.feed.id ? this.feed.name() : 'New Record';
  },
  arvs:function() {
    return my.lists.arvs.filterFeed(this.feed);
  }
}).stat({
  fetch:function(ctx, id, callback) {
    Page.server.getFeed(id, function(o) {
      callback.call(ctx, EditFeed(o));
    })    
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    Page.server.saveFeed(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditFeed(o));
      })
    })
  },
  asNew:function(ipid, aid, vid) {
    return EditFeed({feed:Feed.asNew(ipid, aid, vid)});
  }
})
var EditApp = Proto({
  /*
   app
   arvs
   matches
   */
  init:function(o) {
    this.app = App(o.application);
    this.arvs = Lists.Arvs(o.arvs);
    this.matches = EditApp.Matches(o.matches);
  },
  isNew:function() {
    return this.app.newid;
  },
  name:function() {
    return this.app.newid ? 'New Record' : this.app.name;
  }
}).stat({
  fetch:function(ctx, id, callback) {
    Page.server.getApp(id, function(o) {
      callback.call(ctx, EditApp(o));
    })    
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.aid;
    if (adding) {
      rec.aid = rec.newid;
    }
    Page.server.saveApp(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditApp(o));             
      })
    })
  },
  asNew:function() {
    return EditApp({application:App.asNew()})
  }
})
EditApp.Matches = ProtoArray({
  //
  init:function(a) {
    this.load(a, Match);
  },
  arvs:function() {/*[arv,..] with map:{field:value,..} on each arv*/
    var arvs = {}, arv;
    this.each(function(rec) {
      if (rec.active) {
        arv = arvs[rec.arvid];
        if (! arv) {
          arv = my.lists.arvs.get(rec.arvid);
          arv.map = {};
          arvs[rec.arvid] = arv;
        }
        if (arv.map[rec.field]) {
          arv.map[rec.field] += '<br>' + rec.value; 
        } else {
          arv.map[rec.field] = rec.value; 
        }
      }
    })
    var a = [];
    for (var arvid in arvs) {
      arv = arvs[arvid];
      a.push(arv);
    }
    return a;
  },
  distinctFields:function() {
    var map = {};
    this.each(function(rec) {
      if (rec.active) {
        map[rec.field] = 1;
      }
    })
    return Map.keys(map).sort();
  }
})
var EditRoute = Proto({
  /*
   route
   arvhists
   reqs
   */
  init:function(o) {
    this.route = my.lists.routes.get(o.rid)
    this.arvhists = Hists(o.arvhists);
    this.reqs = Reqs.forEntity(o.reqs, o.reqdefs, this.route.rid);
  }
}).stat({
  fetch:function(ctx, id, callback) {
    Page.server.getRoute(id, function(o) {
      o.rid = id;
      callback.call(ctx, EditRoute(o));
    })    
  },
  save:function(ctx, rec, callback) {
    var adding = false;
    Page.server.saveRoute(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
	    o.rid = rec.rid
        callback.call(ctx, EditRoute(o));
      })
    })    
  }  
})
var EditArv = Proto({
  /*
   arv
   matches
   assigns
   hists
   reqs
   */
  init:function(o) {
    this.arv = Arv(o.arv);
    this.assigns = EditArv.Assigns(o.assigns);
    this.matches = EditArv.Matches(o.matches);
    this.hists = Hists(o.hists);
    this.reqs = Reqs.forEntity(o.reqs, o.reqdefs, this.arv.arvid);
  },
  isNew:function() {
    return ! this.arv.arvid;
  },
  name:function() {
    return this.isNew() ? 'New Record' : this.arv.name();
  }
}).stat({
  fetch:function(ctx, id, callback) {
    Page.server.getArv(id, function(o) {
      callback.call(ctx, EditArv(o));
    })    
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.arvid;
    Page.server.saveArv(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditArv(o));
      })
    })
  },
  saveMatch:function(ctx, rec, callback) {
    var adding = ! rec.arvmid;
    Page.server.saveMatch(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditArv(o));
      })
    })    
  },
  saveAssign:function(ctx, rec, callback) {
    var adding = ! rec.arvaid;
    Page.server.saveAssign(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditArv(o));
      })
    })    
  },
  deleteMatch:function(ctx, id, callback) {

  },
  asNew:function(aid, vid, rid) {
    return EditArv({arv:Arv.asNew(aid, vid, rid)})
  }
})
EditArv.Matches = ProtoArray({
  //
  init:function(a) {
    this.load(a, Match);
  }
})
EditArv.Assigns = ProtoArray({
  //
  init:function(a) {
    this.load(a, Assign);
  }
})
var Hists = ProtoArray({
  //
  init:function(a) {
    this.load(a, Hist);
  },
  filterArv:function(arvid) {
    return filter(this, function(rec) {
      return rec.entity == Hist.ENTITY_ARV && rec.entityid == arvid;
    })
  },
  lastUpdatedText:function() {
    return this.length ? Hist.timeText(this[0].time) + ' by ' + this[0].user : null;
  },
  lastAuthText:function() {
    return this.each(function(rec) {
      if (rec.hasAuth()) {
        return rec.authText();
      }
    })
  }
})  
var Hist = Proto({
  /*
   arvhid
   entity
   entityid
   action
   user
   time
   auth
   authno
   comment
   Changes changes
   */  
  init:function(o) {
    this.mix(o);
    this.changes = Hist.Changes(this.before, this.after, this.entity, this.action);
  },
  actionText:function() {
    return (this.action == 'A' ? 'Add' : 'Update') + ' ' + this.entityName();
  },
  actionArvText:function() {
    if (this.action == 'A') {
      return 'Add ';
    }
    var t = this.changes.get('Active');
    if (t) {
      return t.after == 'Yes' ? 'Activate ' : 'Deactivate ';
    } else {
      return 'Update ';
    }
  },
  hasAuth:function() {
    return this.auth || this.comment;
  },
  entityRec:function() {
    return Hist.entity(this.entity, this.entityid);
  },
  authText:function() {
    var t = '';
    if (this.auth) {
      t = this.authName() + ' ' + (this.authno || '');
      if (this.authno) {
        switch (this.auth) {
        case 1:
          t = '<a class="act" target="_blank" href="http://pbtfsapp101:8080/tfs/HCHBCollection/HCHB/_workitems#_a=edit&id=' + this.authno + '">&#10697; ' + t + '</a>';
          break;
        case 2:
          t = '<a class="act" target="_blank" href="https://rightnowlink.hchb.com/IncidentItem/IncidentSearch/' + this.authno + '">&#10697; ' + t + '</a>';
          break;
        case 3:
          t = '<a class="act" target="_blank" href="https://hchb.visualstudio.com/HCHB/_workitems?id=' + this.authno + '&_a=edit">&#10697; ' + t + '</a>';
          break;
        }
      }      
    }
    if (this.comment) {
      t += (t.length && '<br>' || '') + Page.linkify(this.comment);
    }
    return t;
  },
  beforeHtml:function() {
    return this.chgHtml('before');
  },
  afterHtml:function() {
    return this.chgHtml('after');
  },
  arv:function() {
    if (this.entity == Hist.ENTITY_ARV) {
      return my.lists.arvs.get(this.entityid);
    }
  },
  timesort:function() {
    var t = this.time;
    return t.substr(6,4) + t.substr(0,2) + t.substr(3,2) + t.substr(16,2) + t.substr(11,2) + t.substr(14,2);
  },
  timeText:function() {
    return Hist.timeText(this.time);
  },
  //
  authName:function() {
    switch (this.auth) {
    case 1:
      return 'TFS';
    case 2:
      return 'RN';
    case 3:
      return 'VSTS';
    }
  },
  entityName:function() {
    switch (this.entity) {
    case Hist.ENTITY_APP:
      return 'Application';
    case Hist.ENTITY_VENDOR:
      return 'Vendor';
    case Hist.ENTITY_ARV:
      return 'ARV';
    case Hist.ENTITY_ARV_MATCH:
      return 'ARV Match';
    case Hist.ENTITY_ARV_ASSIGN:
      return 'ARV Assignment';
    case Hist.ENTITY_PRODUCT:
      return 'Product';
    case Hist.ENTITY_FEED:
      return 'Product';
    }
  },
  chgHtml:function(fid) {
    h = "";
    this.changes.each(function(chg) {
      h += '<label class="hist">' + chg.fid + ':</label> ' + $('<div>').html(chg[fid]).text() + '<br>';
    })
    return h;
  }
}).stat({
  ENTITY_APP:1,
  ENTITY_VENDOR:2,
  ENTITY_ARV:3,
  ENTITY_ARV_MATCH:30,
  ENTITY_ARV_ASSIGN:31,
  ENTITY_CUST:4,
  ENTITY_PRODUCT:5,
  ENTITY_FEED:6,
  ENTITY_REQDEF:7,
  ENTITY_REQ:8,
  //
  M:{'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec'},
  timeText:function(t) {
    if (! this.NOW) {
      this.NOW = this.current();
    }
    var time = parseInt(t.substr(11, 2), 10) + t.substr(13);
    if (t.substr(0, 10) == this.NOW) {
      return 'Today, ' + time;
    } else {
      return t.substr(6,4) + '-' + Hist.M[t.substr(0,2)] + '-' + t.substr(3,2) + ', ' + time;
    }
  },
  //
  current:function() {
    var t = new Date().toJSON().slice(0, 10);
    return t.substr(5,2) + '/' + t.substr(8,2) + '/' + t.substr(0,4);
  },
  entity:function(entity, entityid) {
    switch (entity) {
    case Hist.ENTITY_PRODUCT:
      return my.lists.products.get(entityid);
    case Hist.ENTITY_FEED:
      return my.lists.feeds.get(entityid);
    case Hist.ENTITY_CUST:
      return my.lists.routes.get(entityid);
    case Hist.ENTITY_ARV:
      return my.lists.arvs.get(entityid);
    }        
  },
  Change:Proto({
    /*
     fid
     before
     after
     */
    init:function(fid, bt, at) {
      this.fid = fid;
      this.before = bt;
      this.after = at;
    }
  }),
  Changes:ProtoArray(ProtoArray.Indexed, {
    init:function(before, after, entity, action) {
      if (action == 'U' || entity == Hist.ENTITY_ARV_MATCH || entity == Hist.ENTITY_ARV_ASSIGN) {
        var b = this.xml(before), a = this.xml(after);
        var bm = this.getTagMap(b), am = this.getTagMap(a);
        var tags = this.distinctTags(bm, am);
        var f, ai, bi;
        each(tags, this, function(tag) {
          bi = bm[tag], ai = am[tag];
          bt = bi && bi.text;
          at = ai && ai.text;
          f = this.getFid(entity, ai, bi);
          if (f && (bt != at || f == 'Field')) {
            this.push(Hist.Change(f, this.getValue(f, bt), this.getValue(f, at)));
          }                  
        })
      }
      this.index('fid').sort('fid');
    },
    //
    distinctTags:function(map1, map2) {
      return Map.keys(mix({}, map1, map2));
    },
    getTagMap:function(x) {
      var map = {};
      for (var i = 0; i < x.inners.length; i++) {
        map[x.inners[i].tag] = x.inners[i];
      }
      return map;
    },
    getValue:function(fid, t) {
      if (t == null) {
        return "";
      }
      switch(fid) {
      case 'Direction':
        return App.dirText(+t);
      case 'Product':
        return my.lists.products.get(t).name;
      case 'Application':
        return my.lists.apps.get(t).name;
      case 'Vendor':
        return my.lists.vendors.get(t).name;
      case 'Route':
        return my.lists.routes.get(t).short();
      case 'Node':
        return my.lists.nodes.get(t).name;
      case 'Platform':
        return my.lists.platforms.get(t).name;
      case 'Namespace':
        return my.lists.namespaces.get(t).name;
      case 'Data Flow':
        return my.lists.dataflows.get(t).name;
      case 'Active':
      case 'Required':
        return t == 1 ? 'Yes' : 'No';
      }
      return t;
    },
    getFid:function(entity, ai, bi) {
      var fid, tag = ai ? ai.tag : bi.tag;
      switch (entity) {
      case Hist.ENTITY_PRODUCT:
        switch (tag) {
        case 'ip_name':
          return 'Name';
        case 'ip_active':
          return 'Active';
        case 'ip_description':
          return 'Description';
        }
      case Hist.ENTITY_FEED:
        switch (tag) {
        case 'if_aid':
          return 'Application';
        case 'if_vid':
          return 'Vendor';
        case 'if_active':
          return 'Active';
        case 'if_iptid':
          return 'Platform';
        case 'if_iinid':
          return 'Namespace';
        case 'if_idftid':
          return 'Data Flow';
        case 'ipf_ipid':
          return 'Product';
        case 'ipf_required':
          return 'Required';
        case 'if_totalHoursCost':
          return 'Total Cost';
        case 'if_configHoursCost':
          return 'Config Cost';
        }
      case Hist.ENTITY_APP:
        switch (tag) {
        case 'Name':
          return tag;
        case 'DirectionId':
          return 'Direction';
        }
      case Hist.ENTITY_VENDOR:
        switch (tag) {
        case 'Name':
          return tag;
        case 'IsActive':
          return 'Active';
        }
      case Hist.ENTITY_ARV:
        switch (tag) {
        case 'ApplicationId':
          return 'Application';
        case 'RouteId':
          return 'Route';
        case 'VendorId':
          return 'Vendor';
        case 'Active':
          return tag;
        case 'arvn_nid':
          return 'Node';
        }
      case Hist.ENTITY_ARV_MATCH:
      case Hist.ENTITY_ARV_ASSIGN:
        switch (tag) {
        case 'Field':
        case 'Value':
        case 'Active':
          return tag;
        }
      }
    },
    xml:function(s) {
      return Jxml('<row>' + s + '</row>');
    }    
  })
})
var EditVendor = Proto({
  /*
   vendor
   */
  init:function(o) {
    this.vendor = Vendor(o.vendor);
  },
  isNew:function() {
    return ! this.vendor.vid;
  },
  name:function() {
    return this.isNew() ? 'New Record' : this.vendor.name;
  }  
}).stat({
  fetch:function(ctx, id, callback) {
    callback.call(ctx, EditVendor({'vendor':my.lists.vendors.get(id)}));
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.vid;
    if (adding) {
      rec.vid = rec.newid;
    }
    Page.server.saveVendor(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditVendor(o));
      })
    })
  },
  asNew:function() {
    return EditVendor({vendor:Vendor.asNew()})
  }
})
var EditReqdef = Proto({
  /*
   reqdef
   reqs
   */
  init:function(o) {
    this.reqdef = Reqdef(o.reqdef);
    this.reqs = Reqs.forReqdef(this.reqdef, Reqs(o.reqs));
  },
  isNew:function() {
    return this.reqdef.id == null;
  },
  name:function() {
    var name = this.reqdef.id ? this.reqdef.name : 'New Record';
    return name;
  }
}).stat({
  fetch:function(ctx, id, callback) {
    Page.server.getReqdef(id, function(o) {
      callback.call(ctx, EditReqdef(o));
    })    
  },
  save:function(ctx, rec, callback) {
    var adding = ! rec.id;
    Page.server.saveReqdef(adding, rec, function(o) {
      Lists.fetchToGlobal(function() {
        callback.call(ctx, EditReqdef(o));
      })
    })
  },
  asNew:function(eid) {
    return EditReqdef({reqdef:Reqdef.asNew(eid)});
  }
})
var Config = Proto({
  /*
   vendor
   transactions
   details
   branches
   */
  init:function(o) {
    this.vendor = Config.Vendor(o);
    this.transactions = Config.Transactions(o.vendorInterfaceTransaction.transactionTypes);
    this.details = Config.Details(o.vendorDetails.details);
    this.branches = Config.Branches(o.vendorServiceLineBranch);
  },
  name:function() {
    return this.isNew() ? 'New Record' : this.arv.name();
  }
}).stat({
  step:function(ctx, i, callback) {
	Page.server.step(i, function(o) {
	  callback.call(ctx, Config(o));
	})
  },
  getITTs:function(ctx, callback) {
	Page.server.step(1, function(o) {
	  callback.call(ctx, Config.ITTs(o));
	})
  },
  getASBs:function(ctx, callback) {
	Page.server.step(1, function(o) {
	  callback.call(ctx, Config.ASBs(o));
	})
  }
})
Config.Details = Proto({
  init:function(o) {
    this.mix(o);
  }
})
Config.Transactions = ProtoArray({
  //
  init:function(a) {
	this.load(a, Config.Transaction);
  }
})
Config.Transaction = Proto({
  init:function(o) {
    this.id = o.id;
    this.ittid = o.interfaceTransactionTypeId;
    this.desc = o.description;
    this.type = o.vendorTransactionType;
    this.details = o.details;
  }
})
Config.Branches = ProtoArray({
  //
  init:function(a) {
	this.load(a, Config.Branch);
  }
})
Config.Branch = Proto({
  init:function(o) {
    this.id = o.id;
    this.slid = o.serviceLineId;
    this.branchCode = o.branchCode;
    this.vconfigType = o.configType4;
    this.vconfig = o.config4;
  }
})
Config.ITTs = ProtoArray({
  //
  init:function(a) {
    this.load(a, Config.ITT);
  }
})
Config.ITT = Proto({
  init:function(o) {
    this.id = o.id;
    this.name = o.name;
  }
})
Config.VSBs = ProtoArray({
  //
  init:function(a) {
    this.load(a, Config.ITT);
  }
})
Config.VSB = Proto({
  init:function(o) {
    this.id = o.id;
    this.slid = o.serviceLineId;
    this.branch = o.branchCode;
  }
})