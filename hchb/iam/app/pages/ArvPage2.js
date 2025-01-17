var ArvPage = Ui(UiPage, {
  init:function($this) {
	  this.aid = this.getQueryValue('aid');
	  this.vid = this.getQueryValue('vid');
	  this.id = this.getQueryValue('id');
    this.$this = $this;
    this.form = ArvPage.Form($('#form'));
    this.entry = ArvPage.Entry($('#entry'))
    	.on('cancel', this, this.entry_oncancel)
    	.on('save', this, this.entry_onsave);
    this.mtable = ArvPage.MatchTable($('#matchtable'), $('#a_newmatch'))
    	.on('save', this, this.match_onsave);
    this.atable = ArvPage.AssignTable($('#assigntable'), $('#a_newassign'))
    	.on('save', this, this.assign_onsave);
    $('#f_edit').on('click', this.edit.bind(this));
		Lists.fetchToGlobal(this, function() {
			this.fetch();
		})
  },
  fetch:function() {
	  if (! this.id) {
		  this.load(EditArv.asNew(this.aid, this.vid));
	  } else {
		  EditArv.fetch(this, this.id, this.load);
	  }
  },
  title:function() {
	  var title = this.rec ? this.rec.name() : 'New Record';
    document.title = 'IAM2 : ' + title;
    $('#h1').text('ARV : ' + title);	  
  },
	load:function(rec) {
		this.rec = rec;
		this.title();
		my.working(this, function() {
	    this.form.load(rec.arv);
	    if (rec.isNew()) {
			  this.entry.loadLists();
		    this.entry.load(rec.arv);
		    this.edit(1);
	    } else {
			  this.entry.loadLists(1/*all tiers*/);
		    this.entry.load(rec.arv);
		    this.mtable.load(rec.arv.arvid, rec.matches.sort('field', 'value'));
		    this.atable.load(rec.arv.arvid, rec.assigns.sort('field', 'value'));
		    $('#extra').fadeIn();
	    }    
	    my.working(0);
		})
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
			location.href = 'application.csp?id=' + this.aid;
		} else {
			this.edit(0);
		}
	},
	entry_onsave:function(o) {
		EditArv.save(this, o, function(rec) {
			Lists.fetchToGlobal(this, function() {
				this.load(rec);
				this.edit(0);
			})
		})
	},
	match_onsave:function(o, callback) {
		EditArv.saveMatch(this, o, function(rec) {
			this.load(rec);
			callback();
		})
	},
	assign_onsave:function(o, callback) {
		EditArv.saveAssign(this, o, function(rec) {
			this.load(rec);
			callback();
		})
	}
}).stat({
	Form:Ui({
		init:function($this) {
			this.$this = $this;
		},
		reset:function() {
			this.$this.find('.f,.farv').html('&nbsp;');
		},
		load:function(rec) {
			this.reset();
			AppLink($('#f_app'), rec.app());
			if (rec.arvid) {
				//$('#f_vendor').text(rec.vendor().name);
				//$('#f_route').text(rec.route().short());
				//$('#f_node').text(rec.node().name);
				VendorLink($('#f_vendor'), rec.vendor());
				RouteLink($('#f_route'), rec.route());
				NodeLink($('#f_node'), rec.node());
				$('#f_active').text(my.yesno(rec.active));
			}
			$('#f_id').text(rec.arvid);
			this.$this.removeClass('loading');
		}
	}),
	Entry:Ui(UiEntry, {
		oncancel:function() {},
		onsave:function(rec) {},
		//
		init:function() {
			this.$tiers = this.$this.find('#i_rid_tiers');
			this.on$(this.$tiers, 'click', this.$tiers_onclick);
		},
		onload:function() {
			var showTiers = MyEnv.tier < 3 && this.rec.isNew();
			this.$this.find('#i_app').text(this.rec.app().name);
			this.$tiers.toggle(showTiers).next().toggle(showTiers);
		},
		onget:function(o) {
			if (this.rec.aid) {
				delete o.newid;
			}
			if (o.rid == '0') {
				o.rid = '';
				o.database = this.$this.find('#i_rid option:selected').text();
			}
			return o;
		},
		onshow:function() {
			this.$save.removeClass('click');
			if (this.rec.aid) {
				$('#i_rid').focus();
			} else {
				$('#i_aid').focus();
			}
			this.$this.find('.actions').fadeIn();
		},
		onhide:function() {
			this.$this.find('.actions').hide();
		},
		$tiers_onclick:function($this) {
			this.loadRoutes($this.prop('checked'));
		},
		loadLists:function(allTiers) {
			this.loadSelect(this.$this.find('#i_aid'), my.lists.apps.sort('name'), 'aid', 'name');
			this.loadSelect(this.$this.find('#i_vid'), my.lists.vendors.sort('name'), 'vid', 'name');
			this.loadSelect(this.$this.find('#i_nid'), my.lists.nodes.active().sort('name'), 'nid', 'name');
			this.loadRoutes(allTiers);
		},
		loadRoutes:function(all) {
			this.loadSelect(this.$this.find('#i_rid'), my.lists.routes.forEntry(all).sort('database'), 'rid', 'database');
		}
	}),
	MatchTable:Ui(UiEditTable, {
		onsave:function(rec, callback) {},
		//
		load:function(arvid, recs) {
			this.reset();
			this.arvid = arvid;
			var $tr;
			recs.each(this, function(rec) {
				$tr = this.$tr(rec);
				$('<td>').text(rec.field).appendTo($tr);
				$('<td>').text(rec.value).appendTo($tr);
				$('<td>').text(rec.activeText()).appendTo($tr);
				this.action($tr);
			})
			this.$this.removeClass('loading');
			this.color();
		},
		onedit:function(rec, $tr) {
			if (! this.editing) {
				if (rec == null) {
					rec = Match.asNew(this.arvid);
				}
				this.$tr_edit = $tr;
				this.entry.load(rec);
				this.edit(1);
			}
		},
		Entry:Ui(UiEntry, {
			oncancel:function() {},
			onsave:function(rec) {},
			//
			onshow:function() {
				this.$this.fadeIn();
				this.$save.removeClass('click');
				this.$this.find('#i_field').select();
				this.$this.find('.actions').show();
			},
			onhide:function() {
				this.$this.find('.actions').hide();
			}
		})
	}),	
	AssignTable:Ui(UiEditTable, {
		onsave:function(rec, callback) {},
		//
		load:function(arvid, recs) {
			this.reset();
			this.arvid = arvid;
			var $tr;
			recs.each(this, function(rec) {
				$tr = this.$tr(rec);
				$('<td>').text(rec.field).appendTo($tr);
				$('<td>').text(rec.value).appendTo($tr);
				$('<td>').text(rec.activeText()).appendTo($tr);
				this.action($tr);
			})
			this.$this.removeClass('loading');
			this.color();
		},
		onedit:function(rec, $tr) {
			if (! this.editing) {
				if (rec == null) {
					rec = Assign.asNew(this.arvid);
				}
				this.$tr_edit = $tr;
				this.entry.load(rec);
				this.edit(1);
			}
		},
		Entry:Ui(UiEntry, {
			oncancel:function() {},
			onsave:function(rec) {},
			//
			onshow:function() {
				this.$this.fadeIn();
				this.$save.removeClass('click');
				this.$this.find('#i_field').select();
				this.$this.find('.actions').show();
			},
			onhide:function() {
				this.$this.find('.actions').hide();
			}
		})
	})
})
