var ReqPage = Ui({
  init:function($this) {
    this.id = Ui.Page.getQueryValue('id'); 
    this.eid = Ui.Page.getQueryValue('eid'); 
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.form = ReqPage.Form($('#form'));
    this.entry = ReqPage.Entry($('#entry'))
    	.on('cancel', this, this.entry_oncancel)
    	.on('save', this, this.entry_onsave);
   	this.table = ReqPage.Table($('#reqtable'));
    if (my.manager) {
			$this.find('#f_edit').on('click', this.edit.bind(this));
		  $this.find('#editcats').on('click', this.editcats_onclick.bind(this));
    }
  },
  page_onload:function() {
	  if (! this.id) {
		  this.load(EditReqdef.asNew(this.eid));
	  } else {
		  EditReqdef.fetch(this, this.id, this.load);
	  }
  },
  title:function() {
	  this.page.title(this.rec.reqdef.entityName() + ' Requirement : ' + this.rec.name());
  },
	load:function(rec) {
		this.rec = rec;
		this.title();
    this.form.load(rec.reqdef);
    this.entry.loadLists();
    this.entry.load(rec.reqdef);
    if (rec.isNew()) {
	    this.edit(1);
    } else {
	    this.table.load(rec.reqs, rec.reqdef);
	    $('#extra').fadeIn();
    }    
	},
	edit:function(b) {
		if (b) {
			$('#form').hide();
			$('#extra').hide();
			this.entry.show();
		} else {
			this.entry.hide();		
			$('#form').show();
			$('#extra').fadeIn();
		}
	},
	entry_oncancel:function() {
		if (this.rec.isNew()) {
			location.href = 'requirements.csp?e=' + this.rec.reqdef.entity;
		} else {
			this.edit(0);
		}
	},
	entry_onsave:function(o) {
		EditReqdef.save(this, o, function(rec) {
			this.load(rec);
			this.edit(0);
		})
	},
	editcats_onclick:function() {
		this.entry.editcats();
	}
}).stat({
	Form:Ui({
		init:function($this) {
			this.$this = $this;
		},
		clear:function() {
			this.$this.find('.f').html('&nbsp');
		},
		load:function(rec, hists) {
			this.clear();
			$('#f_name').text(rec.name);
			$('#f_desc').html(Page.nbsp(rec.desc));
			$('#f_entity').text(rec.entityName());
			$('#f_ircatid').text(rec.reqcatName());
      $('#f_scorecard').text(Page.yesno(rec.scorecard));
      $('#f_active').text(Page.yesno(rec.active));
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
	    var orig = this.$this.find('#i_ircatid').val();
      this.entry.loadSelect(this.$this.find('#i_ircatid'), my.lists.reqcats.sort('name'), 'id', 'name');
      if (orig) {
	      this.$this.find('#i_ircatid').val(orig);
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
    editcats:function() {
	    var me = this;
	    ReqcatsPop.singleton().show(function() {
		    me.loadLists();
	    })
    }
	}),
	Table:Ui({
		//
	  init:function($this) {
	    this.table = Page.Table($this);
	    this.$th = $('#th-entity');
	  },
	  load:function(recs, reqdef) {
	    this.table.clear();
	    this.$th.text(Reqdef.ENTITY_NAMES[reqdef.entity]);
	    var entity;
	    recs.each(this, function(rec) {
		    entity = rec.entity();
		    if (entity.entityid()) {
			    this.table.$tr();
			    EntityLink(this.table.$td(), reqdef.entity, entity);
		      this.table.$td(rec.statusHtml());
		      this.table.$td(rec.scoreText());
		      this.table.$td(rec.doc());
		    }
	    })
	    this.table.color();
		}
	})
})
