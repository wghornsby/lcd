var ProductsPage = Ui({
  //
  init:function($this) {
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.table = ProductsPage.Table($('#table'))
      .on('draw', this, this.table_ondraw);
    this.$bar = $('.bar');
  },
  page_onload:function() {
    this.table.load(my.lists.products);
  },
  table_ondraw:function() {
    this.page.title('Products');
    this.$bar.removeClass('loading');
    $('#tbody').fadeIn();    
  }
}).stat({
  Table:Ui({
    ondraw:function() {},
    //
    init:function($this/*<table>*/) {
      this.table = Page.Table($this);
    },
    load:function(recs) {
      this.recs = recs;
      this.draw('name');
    },
    //
    draw:function(sort) {
      Page.working(this, function() {
        this.table.clear();
        this.sort = sort;
        this.recs.sort(sort).each(this, function(rec) {
          this.table.$tr();
          ProductLink(this.table.$td(), rec, 1);
          this.table.$td(rec.desc).addClass('desc');
          if (rec.feeds().length) {
          	FeedLinks(this.table.$td(), rec.feeds().sort('name()'));
          } else {
	          this.table.$td().addClass('nofeed');
          }
        })
        var feeds = my.lists.feeds.filterUnassigned();
        if (feeds.length) {
        	this.table.$tr();
        	this.table.$td();
        	this.table.$td();
        	FeedLinks(this.table.$td(), feeds.sort('name()'));
        }
        this.table.color();
        this.ondraw();
      })
    }
  })
})
