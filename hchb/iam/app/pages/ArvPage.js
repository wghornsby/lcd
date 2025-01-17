var ArvPage = Ui({
  init:function($this) {
    this.aid = Ui.Page.getQueryValue('aid');
    this.vid = Ui.Page.getQueryValue('vid');
    this.rid = Ui.Page.getQueryValue('rid');
    this.tab = Ui.Page.getQueryValue('tab'); 
    this.id = Ui.Page.getQueryValue('id');
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.form = ArvPage.Form($('#form'));
    this.entry = ArvPage.Entry($('#entry'))
      .on('cancel', this, this.entry_oncancel)
      .on('save', this, this.entry_onsave);
    this.mtable = ArvPage.MatchTable($('#matchtable'), $('#a_newmatch'))
      .on('toggle', this, this.match_ontoggle)
      .on('save', this, this.match_onsave)
      .on('delete', this, this.match_ondelete);
    this.atable = ArvPage.AssignTable($('#assigntable'), $('#a_newassign'))
      .on('toggle', this, this.assign_ontoggle)
      .on('save', this, this.assign_onsave);
    this.histtable = Page.HistTable($('#histtable'));
    this.reqtable = Page.ReqTable($('#reqtable'))
    	.on('saved', this, this.req_onsaved);
    $('#f_edit').on('click', this.edit.bind(this));
		this.tabbar = Tabbar($('#tabs'));
  },
  page_onload:function() {
    if (! this.id) {
      this.load(EditArv.asNew(this.aid, this.vid, this.rid));
    } else {
      EditArv.fetch(this, this.id, function(rec) {
			  this.load(rec, this.tab);
		  })
    }
  },
  title:function() {
    var title = 'ARV : ' + (this.rec ? this.rec.name() : 'New Record');
    this.page.title(title);
  },
  load:function(rec, tab) {
    this.rec = rec;
    this.title();
    this.form.load(rec.arv, rec.hists);
    this.tabbar.set(tab || 0);
    this.page.offwork();
    if (rec.isNew()) {
      this.entry.loadLists();
      this.entry.load(rec.arv);
      this.edit(1);
    } else {
      this.entry.loadLists(1/*all tiers*/);
      this.entry.load(rec.arv);
      this.mtable.load(rec.arv.arvid, rec.matches.sort('-active,field,value'));
      this.atable.load(rec.arv.arvid, rec.assigns.sort('-active,field,value'));
	    this.histtable.load(rec.hists.filter({'entity':3}));
    	this.reqtable.load(rec.reqs);      
      $('#tabcontents').fadeIn();
    }    
    $('#key .arv').toggleClass('inactive', ! rec.arv.active);
  },
  edit:function(b) {
    if (b) {
      $('#form').hide();
      $('#tabs').hide();
      this.entry.show();
    } else {
      this.entry.hide();    
      $('#form').show();
      $('#tabs').fadeIn();
    }
  },
	req_onsaved:function(rec) {
		this.load(rec, 2);
		this.edit(0);
	},
  entry_oncancel:function() {
    if (this.rec.isNew()) {
      if (this.aid) {
        location.href = 'application.csp?id=' + this.aid;
      } else {
        location.href = 'vendor.csp?id=' + this.vid;
      }
    } else {
      this.edit(0);
    }
  },
  entry_onsave:function(o) {
    EditArv.save(this, o, function(rec) {
      this.load(rec);
      this.edit(0);
    })
  },
  match_ontoggle:function(editing) {
    this.atable.enable(! editing);
    this.form.enable(! editing);
    this.tabbar.enable(! editing);
  },
  match_onsave:function(o) {
    EditArv.saveMatch(this, o, function(rec) {
      this.load(rec);
    })
  },
  match_ondelete:function(rec) {
    Page.msgbox.show('Confirm you wish to delete this match.', this, function() {
      EditArv.deleteMatch(this, rec.arvmid, function(rec) {
        this.load(rec);
      })      
    })
    this.load(this.rec);
  },
  assign_ontoggle:function(editing) {
    this.mtable.enable(! editing);
    this.form.enable(! editing);
    this.tabbar.enable(! editing);
  },
  assign_onsave:function(o) {
    EditArv.saveAssign(this, o, function(rec) {
      this.load(rec);
    })
  },
  assign_ondelete:function(rec) {
    EditArv.deleteMatch(this, rec.arvaid, function(rec) {
      this.load(rec);
    })
  }  
}).stat({
  Form:Ui({
    init:function($this) {
      this.$this = $this;
      this.enabled = 1;
      this.histpop = HistPop();
    },
    load:function(rec, hists) {
      this.clear();
      AppLink($('#f_app'), rec.app());
      if (rec.arvid) {
        VendorLink($('#f_vendor'), rec.vendor());
        RouteLink($('#f_route'), rec.route());
        NodeLink($('#f_node'), rec.node());
        var feed = rec.feed();
        if (feed) {
	        ProductLink($('#f_product'), feed.unassigned() ? null : rec.feed().product(), null, rec.arvid);
        	FeedLink($('#f_feed'), rec.feed(), null, null, 1);
        }
        CustomerLink($('#f_cust'), rec.route());
        $('#f_active').text(Page.yesno(rec.active));
        $('#f_dbId').text(rec.dbId);
        $('#f_dbHash').text(rec.dbHash);
        HistLink($('#f_updated'), hists);
      }
      $('#f_id').text(rec.arvid);
      this.$this.removeClass('loading');
    },
    enable:function(b) {
      this.enabled = b;
      this.$this.toggleClass('inactive', ! b);
    },
    //
    clear:function() {
      this.$this.find('.f,.farv').html('&nbsp;');
    }
  }),
  Entry:Ui({
    oncancel:function() {},
    onsave:function(rec) {},
    //
    init:function($this) {
      this.$this = $this;
      this.$tiers = $this.find('#i_rid_tiers')
        .on('click', this.$tiers_onclick.bind(this));
      this.entry = Page.Entry($this)
        .bubble('cancel', this)
        .on('save', this, this.entry_onsave);
    },
    load:function(rec) {
      this.entry.load(rec);
      this.rec = rec;
      var showTiers = my.env.tier < 3 && this.rec.isNew();
      this.$this.find('#i_app').text(this.rec.app().name);
      this.$tiers.toggle(showTiers).next().toggle(showTiers);
    },
    loadLists:function(allTiers) {
      this.entry.loadSelect(this.$this.find('#i_aid'), my.lists.apps.sort('name'), 'aid', 'name');
      this.entry.loadSelect(this.$this.find('#i_vid'), my.lists.vendors.sort('name'), 'vid', 'name');
      this.entry.loadSelect(this.$this.find('#i_nid'), my.lists.nodes.active().sort('name'), 'nid', 'name');
      this.loadRoutes(allTiers);
    },
    show:function() {
      this.entry.show();
      if (this.rec.aid) {
        $('#i_rid').focus();
      } else {
        $('#i_aid').focus();
      }
      this.$this.find('.actions').fadeIn();
    },
    hide:function() {
      this.$this.find('.actions').hide();
      this.entry.hide();
    },
    //
    entry_onsave:function(o) {
      if (o.rid == '0') {
        o.rid = '';
        o.database = this.$this.find('#i_rid option:selected').text();
      }
      this.onsave(o);      
    },
		$tiers_onclick:function() {
			this.loadRoutes(this.$tiers.prop('checked'));
		},
    loadRoutes:function(all) {
      this.entry.loadSelect(this.$this.find('#i_rid'), my.lists.routes.forEntry(all).sort('database'), 'rid', 'database');
    }
  }),
  MatchTable:Ui({
    ontoggle:function(editing) {},
    onsave:function(rec) {},
    ondelete:function(rec) {},
    //
    init:function($this, $new) {
      this.entry = Page.EntryTable($this, $new)
        .bubble('toggle', this)
        .bubble('save', this)
        .bubble('delete', this);
    },
    load:function(arvid, recs) {
      var NewRec = Match.asNew.curry(arvid);
      this.entry.load(NewRec, recs, function(rec) {
        return {row:[rec.field, rec.value, rec.activeText()],active:rec.active};
      })
    },
    enable:function(b) {
      this.entry.enable(b);
    }
  }),
  AssignTable:Ui({
    ontoggle:function(editing) {},
    onsave:function(rec) {},
    //
    init:function($this, $new) {
      this.entry = Page.EntryTable($this, $new)
        .bubble('toggle', this)
        .bubble('save', this);
    },
    load:function(arvid, recs) {
      var NewRec = Assign.asNew.curry(arvid);
      this.entry.load(NewRec, recs, function(rec) {
        return {row:[rec.field, rec.value, rec.activeText()],active:rec.active};
      })
    },
    enable:function(b) {
      this.entry.enable(b);
    }
  })
})
