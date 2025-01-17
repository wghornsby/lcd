var CustomersPage = Ui({
  //
  init:function($this) {
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.table = CustomersPage.Table($('#table'))
      .on('draw', this, this.table_ondraw);
  },
  page_onload:function() {
    this.table.load(my.lists.routes.custs(1));
  },
  table_ondraw:function() {
    this.page.title('Customers');
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
      this.draw('short()');
    },
    //
    draw:function(sort) {
      Page.working(this, function() {
        this.table.clear();
        this.sort = sort;
        this.recs.sort(sort).each(this, function(rec) {
          this.table.$tr();
          CustomerLink(this.table.$td(), rec);
          ProductLinks(this.table.$td(), rec.products());
        })
        this.table.color();
        this.ondraw();
      })
    }
  })
})
