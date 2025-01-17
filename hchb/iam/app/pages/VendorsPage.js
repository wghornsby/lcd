var VendorsPage = Ui({
  init:function($this) {
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.table = VendorsPage.Table($('#table'))
      .on('draw', this, this.table_ondraw);
    this.$bar = $('.bar');
  },
  page_onload:function() {
    this.table.load(my.lists.vendors);
  },
  table_ondraw:function() {
    this.page.title();
    this.$bar.removeClass('loading');
  }
}).stat({
	Table:Ui(UiTable, {
    ondraw:function() {},
    //
		init:function($this) {
		  this.table = Page.Table($this);
		},
		load:function(recs) {
		  this.recs = recs;
		  this.draw('-vid');
		},
		draw:function(sort) {
		  Page.working(this, function() {
		    this.table.clear();
		    this.sort = sort;
		    var $tr;
		    this.recs.sort(sort).each(this, function(rec) {
		      $tr = this.table.$tr();
		      this.table.$td(rec.vid);
          VendorLink(this.table.$td(), rec);
          AppLinks(this.table.$td(), rec.arvs().apps().sort('name'));
          RouteLinks(this.table.$td(), rec.arvs().routes().sort('short()'));
		    })
		    this.table.color();
		    this.ondraw();
		  })
		}
	})
})

