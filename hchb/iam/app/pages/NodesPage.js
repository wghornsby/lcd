var NodesPage = Ui({
  //
  init:function($this) {
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.table = NodesPage.Table($('#table'))
      .on('draw', this, this.table_ondraw);
    this.$bar = $('.bar');
  },
  page_onload:function() {
    this.table.load(my.lists.nodes);
  },
  table_ondraw:function() {
    this.page.title('Nodes');
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
			this.draw('-active, name');
		},
		draw:function(sort) {
		  Page.working(this, function() {
		    this.table.clear();
		    this.sort = sort;
        this.recs.sort(sort).each(this, function(rec) {
          var $tr = this.table.$tr();
          NodeLink(this.table.$td(), rec);
          this.table.$td(rec.typeText());
          this.table.$td(Page.yesno(rec.active));
          AppLinks(this.table.$td(), rec.apps());
        })
        this.table.color();
        this.ondraw();
		  })
		},
		reset:function() {
			this.$this.addClass('loading');
			this.$body.html('');
		}
	})
})

