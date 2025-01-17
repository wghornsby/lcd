var FeedPage = Ui({
	init:function($this) {
		this.id = Ui.Page.getQueryValue('id'); 
		this.pid = Ui.Page.getQueryValue('pid');
		this.aid = Ui.Page.getQueryValue('aid');
		this.vid = Ui.Page.getQueryValue('vid');
		this.tab = Ui.Page.getQueryValue('tab'); 
		this.page = Page($this)
			.on('load', this, this.page_onload);
		this.$new = $this.find('#a_new');
		this.form = FeedPage.Form($('#form'));
		this.entry = FeedPage.Entry($('#entry'))
			.on('cancel', this, this.entry_oncancel)
			.on('save', this, this.entry_onsave);
		this.table = FeedPage.ArvTable($('#arvtable'));
		this.histtable = Page.HistTable($('#histtable'));
		this.reqtable = Page.ReqTable($('#reqtable'))
			.on('saved', this, this.req_onsaved);
		this.tabbar = Tabbar($('#tabs'));
		if (my.manager) {
			$this.find('#f_edit').on('click', this.edit.bind(this));
			$this.find('#editdataflows').on('click', this.editdataflows_onclick.bind(this));
			$this.find('#editnamespaces').on('click', this.editnamespaces_onclick.bind(this));
		}
	},
	page_onload:function() {
		if (! this.id) {
			this.load(EditFeed.asNew(this.pid, this.aid, this.vid));
		} else {
			EditFeed.fetch(this, this.id, function(rec) {
				this.load(rec, this.tab);
			})
		}
		this.page.offwork();
	},
	title:function() {
		var title = 'Feed : ' + (this.rec ? this.rec.name() : 'New Record');
		this.page.title(title);
	},
	load:function(rec, tab) {
		this.rec = rec;
		this.title();
		this.form.load(rec.feed, rec.hists);
		this.entry.loadLists();
		this.entry.load(rec.feed);
		this.tabbar.set(tab || 0);
		$('#tabcontents').fadeIn();
		if (rec.isNew()) {
			this.edit(1);
		} else {
			this.table.load(rec.arvs().active().sort('app().name, route().short(), vendor().name'), rec.arvhists);
			this.histtable.load(rec.arvhists);
			this.reqtable.load(rec.reqs);
		}
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
	entry_oncancel:function() {
		if (this.rec.isNew()) {
			if (this.rec.product) {
				location.href = 'product.csp?id=' + this.rec.product.id;
			} else {
				location.href = 'products.csp';
			}
		} else {
			this.edit(0);
		}
	},
	entry_onsave:function(o) {
		EditFeed.save(this, o, function(rec) {
			this.load(rec);
			this.edit(0);
		})
	},
	req_onsaved:function(rec) {
		this.load(rec, 2);
		this.edit(0);
	},
	editdataflows_onclick:function() {
		this.entry.editdataflows();
	},
	editnamespaces_onclick:function() {
		this.entry.editnamespaces();
	}	
}).stat({
	Form:Ui({
		init:function($this) {
			this.$this = $this;
			this.histpop = HistPop();
		},
		clear:function() {
			this.$this.find('.f').html('&nbsp');
		},
		load:function(rec, hists) {
			this.clear();
			rec.ipid && ProductLink($('#f_product'), rec.product());
			rec.aid && AppLink($('#f_app'), rec.app());
			! rec.vendor().isNotFound() && VendorLink($('#f_vendor'), rec.vendor());
			$('#f_dataflow').text(rec.dataflowName());
			$('#f_namespace').text(rec.namespaceName());
			$('#f_platform').html(rec.platformHtml());
			$('#f_req').text(Page.yesno(rec.req));
			$('#f_totalCost').html(Page.nbsp(rec.totalCost));
			$('#f_configCost').html(Page.nbsp(rec.configCost));
			$('#f_active').text(Page.yesno(rec.active));
			HistLink($('#f_updated'), hists);
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
			.bubble('save', this);
		},
		load:function(rec) {
			this.entry.load(rec);
			this.rec = rec;
		},
		loadLists:function() {
			this.entry.loadSelect(this.$this.find('#i_aid'), my.lists.apps.sort('name'), 'aid', 'name');
			this.entry.loadSelect(this.$this.find('#i_vid'), my.lists.vendors.sort('name'), 'vid', 'name');
			this.entry.loadSelect(this.$this.find('#i_ipid'), my.lists.products.sort('name'), 'id', 'name');
			this.entry.loadSelect(this.$this.find('#i_iptid'), my.lists.platforms.sort('name'), 'id', 'name');
			this.loadDataflows();
			this.loadNamespaces();
		},
		loadDataflows:function() {
			var orig = this.$this.find('#i_idftid').val();
			this.entry.loadSelect(this.$this.find('#i_idftid'), my.lists.dataflows.sort('name'), 'id', 'name');
			if (orig) {
				this.$this.find('#i_idftid').val(orig);
			}	    
		},
		loadNamespaces:function() {
			var orig = this.$this.find('#i_iinid').val();
			this.entry.loadSelect(this.$this.find('#i_iinid'), my.lists.namespaces.sort('name'), 'id', 'name');
			if (orig) {
				this.$this.find('#i_iinid').val(orig);
			}	    
		},
		show:function() {
			this.entry.show();
			$('#i_name').select();
			this.$this.find('.actions').fadeIn();
		},
		hide:function() {
			this.$this.find('.actions').hide();
			this.entry.hide();
		},
		editdataflows:function() {
			var me = this;
			DataflowsPop.singleton().show(function() {
				me.loadDataflows();
			})
		},
		editnamespaces:function() {
			var me = this;
			NamespacesPop.singleton().show(function() {
				me.loadNamespaces();
			})
		}    
	}),
	ArvTable:Ui({
		init:function($this) {
			this.table = Page.Table($this);	    
		},
		load:function(recs, arvhists) {
			this.table.clear();
			var hists;
			recs.each(this, function(rec) {
				this.table.$tr();
				CustomerLink(this.table.$td(), rec.route());
				hists = arvhists.filterArv(rec.arvid);
				HistLink(this.table.$td(), hists);
				this.table.$td(hists.lastAuthText());
			})
			this.table.color();
		}
	})
})
