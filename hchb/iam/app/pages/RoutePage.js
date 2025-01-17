var RoutePage = Ui({
	init:function($this) {
		this.id = Ui.Page.getQueryValue('id');
		this.page = Page($this)
			.on('load', this, this.page_onload);
		this.$new = $this.find('#a_newarv');
		this.form = RoutePage.Form($('#form'));
		this.atable = RoutePage.ArvTable($('#arvtable'));
	},
	page_onload:function() {
		EditRoute.fetch(this, this.id, this.load);
	},
	title:function() {
		var title = 'Route : ' + (this.rec ? this.rec.route.database : 'New Record');
		this.page.title(title);
	},
	load:function(rec) {
		this.rec = rec;
		this.title();
		this.$new.attr('href', 'arv.csp?rid=' + rec.route.rid);
		this.form.load(rec.route);
		this.atable.load(rec.route.arvs(1).sort('-active, app().name, route().short(), vendor().name'), rec.arvhists);
		$('#extra').fadeIn();
	},
	entry_oncancel:function() {
		if (this.rec.isNew()) {
			location.href = 'routes.csp';
		} else {
			this.edit(0);
		}
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
			$('#f_database').text(rec.database);
			$('#f_server').text(rec.server);
			$('#f_tier').text(rec.tier);
			$('#f_id').text(rec.rid);
			$('#f_oid').text(rec.oid());
			this.$this.removeClass('loading');
		}
	}),
	ArvTable:Ui({
		init:function($this) {
			this.table = Page.Table($this);
			this.histpop = HistPop();
		},
		load:function(recs, arvhists) {
			this.table.clear();
			var hists;
			recs.each(this, function(rec) {
				this.table.$tr();
				ArvLink(this.table.$td(), rec, 1);
				hists = arvhists.filterArv(rec.arvid);
				HistLink(this.table.$td(), hists); 
				this.table.$td(hists.lastAuthText());
			})
			this.table.color();
		}
	})
})
