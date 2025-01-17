var RoutesPage = Ui({
  //
  init:function($this) {
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.table = RoutesPage.Table($('#table'))
      .on('draw', this, this.table_ondraw);
    this.$bar = $('.bar');
  },
  page_onload:function() {
    this.table.load(my.lists.routes);
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
		  this.draw('database');
		},
		draw:function(sort) {
		  Page.working(this, function() {
		    this.table.clear();
		    this.sort = sort;
	      this.recs.sort(sort).each(this, function(rec) {
	        var apps = rec.arvs().apps().sort('name');
	        var vendors = rec.arvs().vendors().sort('name');
	        if (apps.length || vendors.length) {
	          $tr = this.table.$tr();
	          RouteLink(this.table.$td(), rec);
            AppLinks(this.table.$td(), apps);
            VendorLinks(this.table.$td(), vendors);
	        }
	      })
	      this.table.color();
	      this.ondraw();
		  })
		}
	})
})

