var ReqsPage = Ui({
  //
  init:function($this) {
    this.tabindex = this.asTabIndex(Ui.Page.getQueryValue('e')) || 0;
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.tabbar = Tabbar($('#entities'));
    this.prodtable = ReqsPage.Table($('#prodtable'));
    this.feedtable = ReqsPage.Table($('#feedtable'));
    this.custtable = ReqsPage.Table($('#custtable'));
    this.arvtable = ReqsPage.Table($('#arvtable'));
    this.prodetable = ReqsPage.EntityTable($('#prodetable'));
    this.feedetable = ReqsPage.EntityTable($('#feedetable'));
    this.custetable = ReqsPage.EntityTable($('#custetable'));
    this.arvetable = ReqsPage.EntityTable($('#arvetable'));
  },
  page_onload:function() {
	  ViewReqdefs.fetch(this, this.load);
  },
  load:function(rec) {
	  var recs = rec.reqdefs;
	  recs.prods = recs.filterProd();
	  recs.feeds = recs.filterFeed();
	  recs.custs = recs.filterCust();
	  recs.arvs = recs.filterArv();
	  this.recs = recs;
	  this.prodtable.load(recs.prods);
	  this.feedtable.load(recs.feeds);
	  this.custtable.load(recs.custs);
	  this.arvtable.load(recs.arvs);
	  this.prodetable.load(recs.prods, rec.reqs);
	  this.feedetable.load(recs.feeds, rec.reqs);
	  this.custetable.load(recs.custs, rec.reqs);
	  this.arvetable.load(recs.arvs, rec.reqs);
	  this.tabbar.set(this.tabindex);
	  this.page.title();
	  this.page.offwork();
  },
  //
  asTabIndex:function(entity) {
	  if (entity) {
		  switch (+entity) {
		  case Reqdef.ENTITY_PROD:
		  	return 0;
		  case Reqdef.ENTITY_FEED:
		  	return 1;
		  case Reqdef.ENTITY_CUST:
		  	return 2;
		  case Reqdef.ENTITY_ARV:
		  	return 3;		  	
		  }
	  }
  }
}).stat({
  Table:Ui({
    init:function($this/*<table>*/) {
      this.table = Page.Table($this);
    },
    load:function(recs) {
      this.recs = recs;
      this.draw();
    },
    //
    draw:function() {
      this.table.clear();
	    var cat, $td;
      this.recs.defsort().each(this, function(rec) {
	      if (rec.reqcatName() != cat) {
		      cat = rec.reqcatName();
			    this.table.$tr();
			    this.table.$td(cat).attr('colspan', 3).addClass('cat');
	      }
        this.table.$tr();
        $td = this.table.$td();
        //SortLink($td);
        ReqdefLink($td, rec);
        this.table.$td(Page.yesno(rec.scorecard));
        this.table.$td(rec.desc);
      })
      this.table.color();
      $('.sort').on('dragstart', dstart);
    }
  }),
 	EntityTable:Ui({
	  init:function($this) {
	    this.table = Page.Table($this);	    
	  },
	  load:function(reqdefs, reqs) {
	    this.table.clear();
	    this.table.$headtr.html("<th class='empty'></th>");
	    var entity = reqdefs[0].entity;
	    var entities = reqdefs[0].entities();
	    reqdefs.each(this, function(reqdef) {
		    reqdef.reqs = reqs.filterReqdef(reqdef.id);
		    this.table.$th(reqdef.name);
	    })
	    entities.each(this, function(rec) {
		    this.table.$tr();
		    EntityLink(this.table.$td().addClass('lj rp'), entity, rec);
		    var req;
		    reqdefs.each(this, function(reqdef) {
			    req = reqdef.reqs.getByEntityid(rec.entityid());
			    this.table.$td(req.statusHtml());
		    })
	    })
	    this.table.color();
	  }
	})
})
function dstart(e) {
	console.log('dstart');
}