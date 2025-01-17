/* Page and UI components */
var Page = Ui({
  onload:function() {},
  //
  init:function($this) {
    this.$this = $this;
    this.$h1 = $('#h1');
    var deftext = 'search for...';
    $('#pagesearch').focus(function() {
      var $this = $(this);
      if ($this.val() == deftext) {
        $this.val('');
      }
      $this.select();
    }).focusout(function() {
      var $this = $(this);
      if ($this.val() == '') {
        $this.val(deftext);
      }
    })
    this.load();
  },
  load:function() {
    var me = this;
    var method = Ui.Page.getQueryValue('CacheLogout') ? Lists.fetchToGlobal : Lists.cached;
    method(function() {
      me.loadSearch();
      me.onload();
    })
  },
  title:function(s) {
    if (s) {
      this.$h1.text(s);
    } else {
      s = this.$h1.text();
    }
    document.title = s;
  },
  offwork:function() {
    this.$this.find('.loading').removeClass('loading');
  },
  //
  loadSearch:function() {
    var a = [];
    my.lists.apps.each(function(app) {
      a.push({value:'A: ' + app.name, i:0, data:app});
    })
    my.lists.routes.each(function(route) {
      a.push({value:'R: ' + route.database, i:1, data:route});
    })
    my.lists.vendors.each(function(vendor) {
      a.push({value:'V: ' + vendor.name, i:2, data:vendor});
    })
    my.lists.products.each(function(prod) {
      a.push({value:'P: ' + prod.name, i:3, data:prod});
    })
    my.lists.feeds.each(function(feed) {
      a.push({value:'F: ' + feed.name(), i:5, data:feed});
    })
    my.lists.routes.each(function(route) {
      if (route.isProd()) {
        a.push({value:'C: ' + route.short(), i:4, data:route});
      }
    })
    $('#pagesearch').autocomplete({
      lookup:a,
      autoSelectFirst:true,
      appendTo:$('#divhead'),
      onSelect:function(choice) {
        switch (choice.i) {
        case 0:
          url = 'application.csp?id=' + choice.data.aid;
          break;
        case 1:
          url = 'route.csp?id=' + choice.data.rid;
          break;
        case 2:
          url = 'vendor.csp?id=' + choice.data.vid;
          break;
        case 3:
          url = 'product.csp?id=' + choice.data.id;
          break;
        case 4:
          url = 'customer.csp?id=' + choice.data.rid;
          break;
        case 5:
          url = 'feed.csp?id=' + choice.data.id;
          break;
        }
        location.href = url;
      }
    }).on('focus', function() {
      $(this).select();
    })
    $('#smag').on('click', function() {
      $('#pagesearch').focus();
    })    
  }
}).stat({
  // common functions
  working:function(e, fn/*=null*/) {
    this.ct = this.ct || 0;
    if (e) {
      this.ct++;
      $('.cssload-loader').show();
      if (fn) {
        async(e, function() {
          fn.apply(e);
          Page.working(0);
        });
      }
    } else {
      this.ct--;
      if (this.ct <= 0) {
        $('.cssload-loader').hide();
        this.ct = 0;
      }
    }
  },
  yesno:function(b) {
    return b ? 'Yes' : 'No';
  },
  nbsp:function(b) {
    return b ? b : '&nbsp;';
  },
  linkify:function(s) {
    s = String.linkify(s);
    s = s.split('>http://home.hchb.local/Divisions/Dev/Interfaces/Security%20Review%20Documentation/Interface%20Review%20Documentation/').join('>&#10697; ');
    s = s.split('>http://home.hchb.local/Divisions/Security%20and%20Compliance/Lists/Interface%20Doc%20All/').join('>&#10697; ');
    s = s.split('%20').join(' ');
    s = s.split('</a>').join('</a><br>');
    return s;
  },
  // instances  
  msgbox:UiMsgBox("IAM"),
  server:PageServer.of(ArvServer)
})
Page.Table = Ui({
  //
  init:function($this) {
    this.$this = $this;
    this.table = UiTable($this);
    this.$head = this.table.$head;
    this.$headtr = this.$head.find('TR');
    this.$body = this.table.$body;
  },
  clear:function() {
    this.$this.addClass('loading');
    this.table.clear();
  },
  $tr:function() {
    return this.table.$tr();
  },
  $td:function(html) {
    return this.table.$td(html);
  },
  $th:function(html) {
    return $('<th>').html(html).appendTo(this.$headtr);
  },
  color:function() {
    var $trs = this.table.$trs();
    this.$this.removeClass('loading');
    if ($trs.children().length == 0) {
      var j = this.table.$head && this.table.$head.find('th').length;
      if (j) {
        this.table.html('<tr class="empty"><td class="empty" colspan=' + j + '><span>(No records)</span></td></tr>');
      }
    } else {
      var toggle = true;
      $trs.each(function() {
        if (this.children.length && this.children[0].className == 'cat') {
          toggle = true;
        } else {
          toggle = ! toggle;        
          $(this).toggleClass('off', toggle);
        }        
      })      
    }
  }
})
Page.Entry = Ui({
  oncancel:function() {},
  onsave:function(rec) {}, 
  //
  init:function($this/*container*/) {
    this.$this = $this;
    this.$save = $this.find('.save')
      .on('click', this.$save_onclick.bind(this));
    this.$cancel = $this.find('.cancel')
      .on('click', this.$cancel_onclick.bind(this));
    this.entry = UiEntry($this)
      .on('keyesc', this.$cancel_onclick.bind(this));
  },
  load:function(rec) {
    this.rec = rec;
    this.entry.load(rec);
  },
  get:function() {
    return this.entry.get();
  },  
  show:function() {
    this.$save.removeClass('click');
    this.entry.show();
  },
  hide:function() {
    this.entry.hide();
  },
  loadSelect:function($e, recs, fid, ftext) {
    this.entry.loadSelect($e, recs, fid, ftext);
  },
  reset:function() {
    this.entry.reset();
  },
  bindKeys:function(b) {
    this.entry.bindKeys(b);
  },
  //
  $cancel_onclick:function() {
    this.entry.reset();
    this.oncancel();
  },
  $save_onclick:function() {
    if (! this.entry.require()) {
      this.$save.addClass('click');
      this.onsave(this.get());
    }
  }  
})
Page.EntryTable = Ui({
  ontoggle:function(editing/*1=in edit mode*/) {},
  onsave:function(rec) {/*must call load() after saved*/},
  ondelete:function(rec) {/*must call load() after deleted*/},
  //
  init:function($this/*<table>*/, $new/*<a>; if not provided, a non-editable table is assumed*/) {
    this.$this = $this;
    this.$edit = $this.find('TR.edit');
    this.$new = $new;
    this.table = Page.Table($this);
    this.entry = Page.Entry(this.$edit)
      .on('cancel', this, this.entry_oncancel)
      .on('save', this, this.entry_onsave);
    this.$delete = this.$edit.find('.delete')
      .on('click', this.$delete_onclick.bind(this));
    this.editable = ! ($new == undef || $new.length == 0);
    if (this.editable) {
      $new.on('click', this.edit.bind(this, null, null));
    }
    this.editing = null/*1 when in edit mode*/;
    this.enabled = 1;
  },
  load:function(NewRec/*fn to construct new rec*/, recs, textsfn/*fn(rec) returns [text,..] or {row:[text,..],active:b} for populating <td>s*/) {
    this.reset();
    this.clear();
    this.NewRec = NewRec;
    var e, texts, inactive;
    recs.each(this, function(rec) {
      e = textsfn(rec);
      if (Array.isArray(e)) {
        texts = e;
      } else {
        texts = e.row;
        inactive = ! e.active;
      }
      this.row(rec, texts, inactive);
    })
    this.table.color();
  },
  reset:function() {
    this.$this.removeClass('editing');
    this.entry.$save.removeClass('click');
    this.toggle(0);
  },
  enable:function(b) {
    this.enabled = b;
    this.$this.toggleClass('inactive', ! b);
    this.$new && this.$new.toggleClass('inactive', ! b);
  },
  //
  $delete_onclick:function() {
    this.ondelete(this.entry.rec);
  },
  clear:function() {
    this.table.clear();
  },
  edit:function(rec, $tr) {
    if (this.enabled && ! this.editing) {
      this.$delete.toggleClass('invisible', rec == null);
      if (rec == null) {
        rec = this.NewRec();
      }
      this.$tr_edit = $tr;
      this.entry.load(rec);
      this.toggle(1);
    }    
  },
  row:function(rec, texts/*[]*/, inactive) {
    $tr = this.table.$tr();
    if (inactive) {
      $tr.addClass('notactive');
    }
    if (this.editable) {
      $tr.hover(function() {
        $(this).addClass('hover');
      }, function() {
        $(this).removeClass('hover');
      })
      this.on$($tr, 'click', this.edit, rec, $tr);
    }
    each(texts, this, function(text) {
      this.table.$td(text);
    })
    this.table.$td().html("<a class='act el' href='javascript:void(0)'><span class='check'>&#9998;</span>Edit </a>"); 
  },
  toggle:function(b) {
    if (this.editing != undef && this.editing != b) {
      this.$this.toggleClass('editing', !! b);
      this.ontoggle(b);
    }
    this.editing = b;
    if (b) {
      this.$edit.find('.actions').hide();
      if (this.$tr_edit) {
        this.$edit.toggleClass('off', this.$tr_edit.hasClass('off'));
        this.$tr_edit.hide();
        this.$edit.insertAfter(this.$tr_edit);
      } else {
        this.$edit.addClass('off').prependTo(this.table.$body);
      }
      this.entry.show();
      this.$edit.find('.actions').fadeIn();
      this.$edit.children().first().children().first().focus().select();
    } else {
      this.entry.hide();
      this.$edit.appendTo(this.table.$head);
      this.$tr_edit && this.$tr_edit.show();
    }    
  },
  entry_oncancel:function() {
    this.reset();
  },
  entry_onsave:function(o) {
    this.onsave(o);
  }
})
Page.HistTable = Ui({
  init:function($this) {
    this.table = Page.Table($this);   
    this.table.$headtr.html("<th class='pl'>Feed: Timestamp</th><th>Customer</th><th>User</th><th>Action</th><th width='40%'>Auth/Comment</th>");
  },
  load:function(recs) {
    this.recs = recs;
    this.draw('arv().hasFeed(),arv().feed().name(),-timesort(),-arvhid');
  },
  draw:function(sort) {
    this.recs.sort(sort);
    this.table.clear();
    var feed, arv, last;
    this.recs.each(this, function(hist) {
      arv = hist.arv();
      feed = arv && arv.feed();
      if (feed != last) {
        last = feed;
        this.table.$tr();
        FeedLink(this.table.$td().attr('colspan', 5).addClass('cat'), feed);
      }
      this.table.$tr();
      this.table.$td(hist.timeText()).addClass('pl');
      CustomerLink(this.table.$td(), hist.arv().route());
      this.table.$td(hist.user);
      EntityLink(this.table.$td(hist.actionArvText()), hist.entity, hist.entityRec(), 2);
      this.table.$td(hist.authText());
    })
    this.table.color();
  }
})
Page.ReqTable = Ui({
  onsaved:function(rec) {},
  //
  init:function($this) {
    this.table = Page.Table($this);      
    this.$reqwarn = $('#reqwarn');
  },
  load:function(recs) {
    this.recs = recs;
    this.draw();
    this.setReqwarn(recs.lowstat());
  },
  draw:function() {
    this.table.clear();
    var cat;
    this.recs.defsort().each(this, function(rec) {
      var rd = rec.reqdef();
      if (rd.reqcatName() != cat) {
        cat = rd.reqcatName();
        this.table.$tr();
        this.table.$td(cat).attr('colspan', 5).addClass('cat');
      }
      var $tr = this.table.$tr();
      ReqLink(this.table.$td().addClass('pl'), rec, this.onsaved.bind(this));
      this.table.$td(rec.statusText());
      this.table.$td(rec.scoreText());
      this.table.$td(rec.doc());
      this.table.$td();
    })
    this.table.color();
  },
  setReqwarn:function(lowstat) {
    switch (lowstat) {
    case Req.STATUS_NOT_DONE:
      this.$reqwarn.attr('class', 'warn');
      return;
    case Req.STATUS_IN_PROG:
      this.$reqwarn.attr('class', 'warnyellow');
      return;
    default:
      this.$reqwarn.attr('class', 'hide');
    }
  }
})  
/** Links */
function EntityLink($into, entity, rec, nodeOnly) {
  switch (entity) {
  case Hist.ENTITY_PRODUCT:
    return ProductLink($into, rec);
  case Hist.ENTITY_FEED:
    return FeedLink($into, rec);
  case Hist.ENTITY_CUST:
    return CustomerLink($into, rec);
  case Hist.ENTITY_ARV:
    return ArvLink($into, rec, 1, nodeOnly);
  }
}
var ProductLink = Ui({
  init:function($into, rec, big, arvid) {
    var dcls = 'arv p' + (big ? ' maxh' : '');
    var scls = big ? 'pb' : 'p';
    var url;
    if (rec == null) {
      dcls += ' dashed';
      url = 'product.csp?id=&arvid=' + arvid;
    }
    $('<div class="' + dcls + '"><span class="' + scls + '">' + (rec ? rec.name : '(Not Assigned)') + '</span></div>')
      .appendTo($into)
      .on('click', function() {location.href = (url || 'product.csp?id=' + (rec ? rec.id : ''))});
  }
})
var ProductLinks = Ui({
  init:function($into, recs) {
    recs.each(function(rec) {
      ProductLink($into, rec);
    })
  }
})
var FeedLink = Ui({
  init:function($into, rec, pid, small, feedpagealways) {
    var onclick;
    if (rec.id) {
      onclick = (function() {location.href = 'feed.csp?id=' + rec.id});
    } else {
      onclick = (feedpagealways) ? (function() {location.href = 'feed.csp?aid=' + rec.aid + '&vid=' + rec.vid + '&pid=' + (pid ? pid : '')}) : (function() {location.href = 'arv.csp?id=' + rec.arv().arvid}); 
    }
    var cls = rec.unassigned() ? 'arv feed dashed' : 'arv feed';
    if (small) {
      cls += ' small';
    }
    var $this = $('<div class="' + cls + '">').appendTo($into).on('click', onclick);
    AppLink($this, rec.app(), onclick);
    VendorLink($this, rec.vendor(), onclick);
  }
})
var FeedLinks = Ui({
  init:function($into, recs, pid) {
    recs.each(function(rec) {
      FeedLink($into, rec, pid, 1);
      $into.append($('<span class="ct"> ' + rec.activeRoutes().length + '</span><br>'));
    })
  }
})
var ArvLink = Ui({
  init:function($into, rec, withNode, nodeOnly) {
    withNode = 1;
    var onclick = function() {location.href = 'arv.csp?id=' + rec.arvid};
    var cls = rec.active ? 'arv a3' : 'arv a3 inactive';
    var $this = $('<div class="' + cls + '">').appendTo($into).on('click', onclick);
    if (! nodeOnly) {
      AppLink($this, rec.app(), onclick);
      RouteLink($this, rec.route(), onclick);
      VendorLink($this, rec.vendor(), onclick);
    }
    if (nodeOnly == 2) {
      RouteLink($this, rec.route(), onclick);
    }
    withNode && rec.node() && NodeLink($this, rec.node(), onclick);
  }
})
var AppLink = Ui({
  init:function($into, rec, onclick) {
    var dcls = rec.isNotFound() ? 'arv a inactive' : 'arv a';
    $('<div class="' + dcls + '"><span class="a">' + rec.name + '</span></div>').appendTo($into).on('click', onclick || function() {location.href = 'application.csp?id=' + rec.aid});
  }
})
var AppLinks = Ui({
  init:function($into, recs) {
    recs.each(function(rec) {
      AppLink($into, rec);
    })
  }
})
var VendorLink = Ui({
  init:function($into, rec, onclick) {
    var dcls = rec.isNotFound() ? 'arv v inactive' : 'arv v';
    $('<div class="' + dcls + '"><span class="v">' + rec.name + '</span></div>').appendTo($into).on('click', onclick || function() {location.href = 'vendor.csp?id=' + rec.vid});
  }
})
var VendorLinks = Ui({
  init:function($into, recs) {
    recs.each(function(rec) {
      VendorLink($into, rec);
    })
  }
})
var RouteLink = Ui({
  init:function($into, rec, onclick) {
    var dcls = rec.isNotFound() ? 'arv r inactive' : 'arv r';
    var cls = rec.isProd() ? 'rp' : 'rpt';
    $('<div class="' + dcls + '"><span class="' + cls + '">' + rec.short() + '</span></div>').appendTo($into).on('click', onclick || function() {location.href = 'route.csp?id=' + rec.rid});
  }
})
var RouteLinks = Ui({
  init:function($into, recs) {
    recs.each(function(rec) {
      RouteLink($into, rec);
    })
  }
})
var CustomerLink = Ui({
  init:function($into, rec, onclick) {
    var dcls = rec.isNotFound() ? 'arv rc inactive' : 'arv rc';
    var cls = 'rpc';
    $('<div class="' + dcls + '"><span class="' + cls + '">' + rec.short() + '</span></div>').appendTo($into).on('click', onclick || function() {location.href = 'customer.csp?id=' + rec.rid});
  }
})
var NodeLink = Ui({
  init:function($into, rec) {
    var dcls = rec.active ? 'arv n' : 'arv n inactive';
    var cls = rec.isNew() ? 'np' : 'npt';
    $('<div class="' + dcls + '"><span class="' + cls + '">' + rec.name + '</span></div>').appendTo($into); //.on('click', function() {location.href = 'node.csp'});
  }
})
var ReqdefLink = Ui({
  init:function($into, rec) {
    var dcls = rec.active ? 'arv req' : 'arv req inactive';
    $('<div class="' + dcls + '"><span><span class="req"><b>&#10003;</b></span> ' + rec.name + '</span></div>').appendTo($into).on('click', function() {location.href = 'requirement.csp?id=' + rec.id});
  }
})
var ReqLink = Ui({
  init:function($into, rec, onsave) {
    var dcls = 'arv req ', icon;
    switch (rec.status) {
    case Req.STATUS_IN_PROG:
      dcls += 'inprog';
      icon = '&#10033;';
      break;
    case Req.STATUS_DONE:
      dcls += 'done';
      icon = '&#10004;';
      break;
    default:
      dcls += 'notdone';
    icon = '&#10006;'
    }
    var pop = ReqPop.singleton();
    $('<div class="' + dcls + '"><span><span class="req">' + icon  +'</span> ' + rec.reqdef().name + '</span></div>').appendTo($into).on('click', pop.show.bind(pop, rec, onsave));
  }
})
var HistLink = Ui({
  init:function($into, hists) {
    if (hists.length) {
      var pop = HistPop.singleton();
      $into.html('');
      $("<a class='act' href='javascript:void(0)'>&#128336; " + hists.lastUpdatedText() + "</a>").appendTo($into).on('click', pop.show.bind(pop, hists));
    }
  }
})
var SortLink = Ui({
  init:function($into) {
    $("<span class='sort' draggable='true'> &#9776; </span>").appendTo($into);
  }
})
/** Tabbar */
var Tabbar = Ui({
  onchange:function(index) {},
  //
  init:function($e/*<div>*/) {
    this.$this = $e;
    var $t = $e.find('.tabs').addClass('unsel');
    this.$t = $t;
    if ($e.find('.tabsbottom').length == 0) {
      $("<div class='tabsbottom'></div>").insertAfter($t);
    }    
    this.$tabs = $e.find('.tabs > INPUT');
    this.$divs = $e.find('.tabcontent');
    var me = this, i;
    this.$tabs.change(function() {
      i = me.$tabs.index(this);
      me.$divs.hide().eq(i).show();
      me.onchange(i);
    })
  },
  set:function(i) {
    this.$tabs.eq(i).prop('checked', true).change();
  },
  enable:function(b) {
    this.enabled = b;
    this.$t.toggleClass('inactive', ! b);
  }
})
/** Popups */
var HistPop = Ui({
  //
  init:function() {
    this.dialog = UiDialog('IAM - History');
    this.$body = $("<div class='histbody'>");
    this.dialog.body(this.$body);
    this.dialog.button('Close', this, this.close);
    this.table = HistPop.Table(this.$body);
  },
  show:function(hists) {
    this.table.load(hists);
    this.dialog.show(1);
  },
  close:function() {
    this.dialog.close();
  }
}).stat({
  Table:Ui({
    init:function($container) {
      this.table = Page.Table($("<table class='a w100'><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Auth/Comment</th><th class='hist' width='25%'>Before</th><th class='hist' width='25%'>After</th></tr></thead><tbody></table>").appendTo($container));
    },
    load:function(hists) {
      this.table.clear();
      hists.each(this, function(hist) {
        this.table.$tr();
        this.table.$td(hist.timeText());
        this.table.$td(hist.user);
        this.table.$td(hist.actionText());
        this.table.$td(hist.authText());
        this.table.$td(hist.beforeHtml());
        this.table.$td(hist.afterHtml());
      })
      this.table.color();
    }
  })
})
var ReqcatsPop = Ui({
  //
  init:function() {
    this.dialog = UiDialog('IAM - Requirement Categories')
      .on('cancel', this, this.dialog_onclose);
    this.$body = $('#reqcats_pop');
    this.dialog.body(this.$body);
    this.dialog.button('Close', this, this.close);
    this.table = ReqcatsPop.Table($('#reqcats_table'), $('#reqcats_new'));
  },
  show:function(callback) {
    this.table.load();
    this.callback = callback;
    this.dialog.show();
  },
  close:function() {
    this.dialog.close();
    this.dialog_onclose();
  },
  //
  dialog_onclose:function() {
    this.callback && this.callback();
  }  
}).stat({
  Table:Ui({
    //
    init:function($this, $new) {
      this.entry = Page.EntryTable($this, $new)
        .on('save', this, this.entry_onsave);
    },
    load:function(recs) {
      var recs = my.lists.reqcats.sort('name');
      var NewRec = Reqcat.asNew;
      this.entry.load(NewRec, recs, function(rec) {
        return [rec.name, rec.desc];
      })
    },
    //
    entry_onsave:function(o) {
      Reqcat.save(this, o, function() {
        this.load();
      })      
    }
  })  
})
var DataflowsPop = Ui({
  //
  init:function() {
    this.dialog = UiDialog('IAM - Data Flows')
      .on('cancel', this, this.dialog_onclose);
    this.$body = $('#dataflows_pop');
    this.dialog.body(this.$body);
    this.dialog.button('Close', this, this.close);
    this.table = DataflowsPop.Table($('#dataflows_table'), $('#dataflows_new'));
  },
  show:function(callback) {
    this.table.load();
    this.callback = callback;
    this.dialog.show(1);
  },
  close:function() {
    this.dialog.close();
    this.dialog_onclose();
  },
  //
  dialog_onclose:function() {
    this.callback && this.callback();
  }  
}).stat({
  Table:Ui({
    //
    init:function($this, $new) {
      this.entry = Page.EntryTable($this, $new)
        .on('save', this, this.entry_onsave);
    },
    load:function(recs) {
      var recs = my.lists.dataflows.sort('name');
      var NewRec = Dataflow.asNew;
      this.entry.load(NewRec, recs, function(rec) {
        return [rec.name, rec.desc];
      })
    },
    //
    entry_onsave:function(o) {
      Dataflow.save(this, o, function() {
        this.load();
      })      
    }
  })  
})
var NamespacesPop = Ui({
  //
  init:function() {
    this.dialog = UiDialog('IAM - Namespaces')
      .on('cancel', this, this.dialog_onclose);
    this.$body = $('#namespaces_pop');
    this.dialog.body(this.$body);
    this.dialog.button('Close', this, this.close);
    this.table = NamespacesPop.Table($('#namespaces_table'), $('#namespaces_new'));
  },
  show:function(callback) {
    this.table.load();
    this.callback = callback;
    this.dialog.show();
  },
  close:function() {
    this.dialog.close();
    this.dialog_onclose();
  },
  //
  dialog_onclose:function() {
    this.callback && this.callback();
  }  
}).stat({
  Table:Ui({
    //
    init:function($this, $new) {
      this.entry = Page.EntryTable($this, $new)
        .on('save', this, this.entry_onsave);
    },
    load:function(recs) {
      var recs = my.lists.namespaces.sort('name');
      var NewRec = Namespace.asNew;
      this.entry.load(NewRec, recs, function(rec) {
        return [rec.name];
      })
    },
    //
    entry_onsave:function(o) {
      Namespace.save(this, o, function() {
        this.load();
      })      
    }
  })  
})
var ReqPop = Ui({
  //
  init:function() {
    this.dialog = UiDialog('IAM - Requirement');
    this.$body = $('#req_pop');
    this.dialog.body(this.$body);
    this.dialog.button('&#128190; Save', this, this.save_onclick);
    this.dialog.button('Cancel', this, this.cancel_onclick);
    this.entry = ReqPop.Entry($('#rp_entry'));
  },
  show:function(rec, onsave) {
    this.rec = rec;
    this.onsave = onsave;
    this.entry.load(rec);
    this.dialog.show(1);
  },
  close:function() {
    this.dialog.close();
  },
  //
  save_onclick:function() {
    var o = this.entry.get();
    Req.save(this, o, function(rec) {
      this.close();
      this.onsave && this.onsave(rec);
    })
  },
  cancel_onclick:function() {
    this.close();
  }
}).stat({
  Entry:Ui({
    init:function($this) {
      this.entry = Page.Entry($this);
    },
    load:function(rec) {
      this.entry.load(rec);
      this.rec = rec;
      $('#rp_title').text(rec.title());
      $('#rp_subtitle').html(rec.reqdef().desc);
      $('#rp_score').toggle(rec.reqdef().scorecard == 1);
    },
    get:function() {
      return this.entry.get();
    }
  })
})
var SelFeedPop = Ui({
  //
  init:function() {
    this.dialog = UiDialog('IAM - Select Feed');
    this.$body = $('#selfeed_pop');
    this.dialog.body(this.$body);
    this.dialog.button('Close', this, this.close);
    this.table = SelFeedPop.Table($('#selfeed_table'));
  },
  show:function(pid) {
    this.table.load(pid);
    this.dialog.show();
  },
  close:function() {
    this.dialog.close();
  }  
}).stat({
  Table:Ui({
    //
    init:function($this, $new) {
      this.table = Page.Table($this);
    },
    load:function(pid) {
      this.table.clear();
      var recs = my.lists.feeds.filterUnassigned().sort('name()');
      recs.each(this, function(rec) {
        this.table.$tr();
        FeedLink(this.table.$td(), rec, pid, 1, 1);
      })
    }
  })  
})

