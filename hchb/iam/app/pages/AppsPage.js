var AppsPage = Ui({
  //
  init:function($this) {
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.table = AppsPage.Table($('#table'))
      .on('draw', this, this.table_ondraw);
    this.$bar = $('.bar');
  },
  page_onload:function() {
    this.table.load(my.lists.apps);
  },
  table_ondraw:function() {
    this.page.title();
    this.page.offwork();
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
      this.draw('-aid');
    },
    //
    draw:function(sort) {
      Page.working(this, function() {
        this.table.clear();
        this.sort = sort;
        this.recs.sort(sort).each(this, function(rec) {
          var $tr = this.table.$tr();
          this.table.$td(rec.aid);
          AppLink(this.table.$td(), rec);
          this.table.$td(rec.dirText());
          RouteLinks(this.table.$td(), rec.arvs().routes().sort('isNotFound(), short()'));
          VendorLinks(this.table.$td(), rec.arvs().vendors().sort('name'));
        })
        this.table.color();
        this.ondraw();
      })
    }
  })
})
