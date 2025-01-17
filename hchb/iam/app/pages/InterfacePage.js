var ProductPage = Ui({
	init:function($this) {
		this.id = Ui.Page.getQueryValue('id');
		this.arvid = Ui.Page.getQueryValue('arvid');
		this.tab = Ui.Page.getQueryValue('tab'); 
		this.page = Page($this)
			.on('load', this, this.page_onload);
		this.$new = $this.find('#a_new');
		this.form = ProductPage.Form($('#form'));
		this.feedtable = ProductPage.FeedTable($('#feedtable'));
		this.conftable = ProductPage.ConfTable($('#conftable'));
		this.histtable = Page.HistTable($('#histtable'));
		this.reqtable = Page.ReqTable($('#reqtable'))
			.on('saved', this, this.req_onsaved);
		this.tabbar = Tabbar($('#tabs'));
		if (my.manager) {
			$this.find('#f_edit').on('click', this.edit.bind(this));
		}
		this.ckeditor = CKEDITOR.replace('i_desc', {on:{instanceReady:this.ckeditor_onready.bind(this)}});
		this.entry = ProductPage.Entry($('#entry'), this.ckeditor)
			.on('cancel', this, this.entry_oncancel)
			.on('save', this, this.entry_onsave);
	},
	page_onload:function() {
		this.loaded = 1;
		if (this.ckready) {
			this.page_ready();
		}
	}, 
	ckeditor_onready:function() {
		this.ckready = 1;
		if (this.loaded) {
			this.page_ready();
		}
	},
	page_ready:function() {
		if (! this.id) {
			this.load(EditProduct.asNew());
		} else {
			EditProduct.fetch(this, this.id, function(rec) {
				this.load(rec, this.tab);
			})
		}	  
	},
	title:function() {
		var title = 'Interface : ' + (this.rec ? this.rec.name() : 'New Record');
		this.page.title(title);
	},
	load:function(rec, tab) {
		this.rec = rec;
		if (rec.product.id) {
			//this.$new.attr('href', 'feed.csp?pid=' + rec.product.id);
			this.$new.on('click', function() {
				SelFeedPop.singleton().show(rec.product.id);
			})
		}
		this.title();
		this.form.load(rec.product, rec.hists);
		this.entry.load(rec.product);
		this.feedtable.load(rec.feeds.sort('name()'), this.id);
		this.conftable.load(rec);
		this.histtable.load(rec.arvhists);
		this.reqtable.load(rec.reqs);
		this.tabbar.set(tab || 0);
		$('#tabcontents').fadeIn();
		this.page.offwork();
		if (rec.isNew()) {
			this.edit(1);
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
			location.href = this.arvid ? 'arv.csp?id=' + this.arvid : 'products.csp';
		} else {
			this.edit(0);
		}
	},
	entry_onsave:function(o) {
		EditProduct.save(this, o, function(rec) {
			this.load(rec);
			this.edit(0);
		})
	},
	req_onsaved:function(rec) {
		this.load(rec, 3);
		this.edit(0);
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
			$('#f_name').text(rec.name);
			$('#f_desc').html(rec.desc || '<p>&nbsp;</p>');
			$('#f_active').text(Page.yesno(rec.active));
			if (rec.id == 1013) $('#f_sku').text('P00031-03');
			if (rec.id == 1012) $('#f_sku').text('P00031-01');
			HistLink($('#f_updated'), hists);
			this.$this.removeClass('loading');
		}
	}),
	Entry:Ui({
		oncancel:function() {},
		onsave:function(rec) {},
		//
		init:function($this, ckeditor) {
			this.$this = $this;
			this.ckeditor = ckeditor;
			this.entry = Page.Entry($this)
			.bubble('cancel', this)
				.on('save', this, this.entry_onsave);
		},
		load:function(rec) {
			this.entry.load(rec);
			this.ckeditor.setData(rec.desc);
			this.rec = rec;
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
		entry_onsave:function(rec) {
			rec.desc = this.ckeditor.getData();
			this.onsave(rec);
		}
	}),
	FeedTable:Ui({
		init:function($this) {
			this.table = Page.Table($this);	    
		},
		load:function(recs, pid) {
			this.table.clear();
			recs.each(this, function(rec) {
				this.table.$tr();
				FeedLink(this.table.$td(), rec);
				this.table.$td(rec.req ? '<span class="yes">&#10003;</span> Yes' : '').addClass('cj');
				this.table.$td(rec.dataflowName());
				this.table.$td(rec.platformHtml()).addClass('nw');
				this.table.$td();
			})
			this.table.color();
		}
	}),
	ConfTable:Ui({
		init:function($this) {
			this.table = Page.Table($this);	    
		},
		load:function(rec) {
			var recs = rec.routefeeds();
			this.table.clear();
			this.table.$headtr.html("<th class='empty'></th>");
			rec.feeds.each(this, function(feed) {
				this.table.$th(feed.name().split(' - ').join('<br>'));
			})
			each(recs, this, function(rec) {
				this.table.$tr();
				CustomerLink(this.table.$td().addClass('lj'), rec.route);
				each(rec.feeds, this, function(b) {
					this.table.$td(b == 1 ? '<span class="yes">&#10003;</span>' : (b == -1 ? '<span class="no">&#10005;</span>' : ''));
				})
			})
			var feeds = rec.product.feeds()
			this.table.$tr();
			this.table.$td();
			each(feeds, this, function(feed) {
				this.table.$td('<b>' + feed.activeRoutes().length + '</b>');
			})
			this.table.color();
		}
	})
})
