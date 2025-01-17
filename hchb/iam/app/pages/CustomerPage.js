var CustomerPage = Ui({
  init:function($this) {
    this.id = Ui.Page.getQueryValue('id');
    this.tab = Ui.Page.getQueryValue('tab');
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.form = CustomerPage.Form($('#form'));
    this.entry = CustomerPage.Entry($('#entry'))
      .on('cancel', this, this.entry_oncancel)
      .on('save', this, this.entry_onsave);
    this.table = CustomerPage.Table($('#table'));
    this.histtable = Page.HistTable($('#histtable'));
    this.reqtable = Page.ReqTable($('#reqtable'))
      .on('saved', this, this.req_onsaved);
    this.tabbar = Tabbar($('#tabs'));
    if (my.editor) {
	  $this.find('#form').on('click', this.edit.bind(this));
    }
  },
  page_onload:function() {
    if (! this.id) {
      var name = Ui.Page.getQueryValue('name');
      if (name) {
        var r = my.lists.routes.byName(name);
        this.id = r && r.rid;
      }
    }
    EditRoute.fetch(this, this.id, function(rec) {
       this.load(rec, this.tab);
    })
  },
  title:function() {
    var title = 'Customer : ' + this.rec.route.short();
    this.page.title(title);
  },
  load:function(rec, tab) {
    this.rec = rec;
    this.title();
	this.form.load(rec.route);
	this.entry.load(rec.route);
    this.table.load(rec.route.rid, rec.route.products(), rec.arvhists);
    this.histtable.load(rec.arvhists);
    this.reqtable.load(rec.reqs);
    this.tabbar.set(tab || 0);
    this.page.offwork();
    $('#tabcontents').fadeIn();
    $('#viewarvs').attr('href', 'route.csp?id=' + rec.route.rid);
  },
  edit:function(b) {
    if (b) {
      $('#form').hide();
      this.entry.show();
    } else {
      this.entry.hide();    
      $('#form').show();
    }
  },
  entry_oncancel:function() {
    this.edit(0);
  },
  entry_onsave:function(o) {
    EditRoute.save(this, o, function(rec) {
      this.load(rec);
      this.edit(0);
    })
  },
  req_onsaved:function(rec) {
    this.load(rec, 2);
  }
}).stat({
  Form:Ui({
    init:function($this) {
      this.$this = $this;
    },
    clear:function() {
      this.$this.find('.f').html('&nbsp');
    },
    load:function(rec) {
      this.clear();
      $('#f_acctno').text(rec.acctno || '(None)');
      this.$this.removeClass('loading');
    }
  }),
  Entry:Ui({
    oncancel:function() {},
    onsave:function(rec) {},
    //
    init:function($this) {
      this.$this = $this;
      this.entry = Page.Entry($this)
        .bubble('cancel', this)
        .on('save', this, this.entry_onsave);
    },
    load:function(rec) {
      this.entry.load(rec);
      this.rec = rec;
    },
    show:function() {
      this.entry.show();
      $('#i_acctno').select();
      this.$this.find('.actions').fadeIn();
    },
    hide:function() {
      this.$this.find('.actions').hide();
      this.entry.hide();
    },
    //
    entry_onsave:function(o) {
      this.onsave(o);
    }
  }),  
  Table:Ui({
    init:function($this) {
      this.table = Page.Table($this);
      this.histpop = HistPop();
    },
    load:function(rid, recs, arvhists) {
      this.table.clear();
      var feeds, arv, hists;
      recs.each(this, function(rec) {
        this.table.$tr();
        feeds = rec.feedsForRoute(rid);
        ProductLink(this.table.$td().attr('rowspan', feeds.length), rec, 1);
        feeds.each(this, function(feed, i) {
          i && this.table.$tr();            
          FeedLink(this.table.$td(), feed);
          arv = feed.arv(rid);
          ArvLink(this.table.$td(), arv, 1, 2);
          hists = arvhists.filterArv(arv.arvid);
          HistLink(this.table.$td(), hists); 
          this.table.$td(hists.lastAuthText());
        })
      })
      this.table.color();
    }
  }),
  HistTable:Ui({
    init:function($this) {
      this.table = Page.Table($this);      
    },
    load:function(recs) {
      this.recs = recs;
      this.draw('arv().feed().name(),-timesort()');
    },
    draw:function(sort) {
      this.recs.sort(sort);
      this.table.clear();
      var feed, cust, last;
      this.recs.each(this, function(hist) {
        feed = hist.arv().feed();
        if (feed) {
          if (feed != last) {
            last = feed;
            this.table.$tr();
            FeedLink(this.table.$td().attr('colspan', 7).addClass('cat'), feed);
          }
          this.table.$tr();
          this.table.$td(hist.time).addClass('pl');
          CustomerLink(this.table.$td(), hist.arv().route());
          this.table.$td(hist.user);
          this.table.$td(hist.actionText());
          this.table.$td(hist.authText());
          this.table.$td(hist.beforeHtml());
          this.table.$td(hist.afterHtml());
        }
      })
      this.table.color();
    }
  })    
})
