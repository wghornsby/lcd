var VendorPage = Ui({
  init:function($this) {
    this.id = Ui.Page.getQueryValue('id');
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.$new = $this.find('#a_newarv');
    this.form = VendorPage.Form($('#form'));
    this.entry = VendorPage.Entry($('#entry'))
    	.on('cancel', this, this.entry_oncancel)
    	.on('save', this, this.entry_onsave);
    this.atable = VendorPage.ArvTable($('#arvtable'));
    if (my.manager) {
    	$this.find('#form').on('click', this.edit.bind(this));
    }
  },
  page_onload:function() {
	  if (! this.id) {
		  this.load(EditVendor.asNew());
	  } else {
		  EditVendor.fetch(this, this.id, this.load);
	  }
  },
  title:function() {
	  var title = 'Vendor : ' + (this.rec ? this.rec.name() : 'New Record');
	  this.page.title(title);
  },
	load:function(rec) {
		this.rec = rec;
		this.title();
		if (rec.vendor.vid) {
    	this.$new.attr('href', 'arv.csp?vid=' + rec.vendor.vid);
		}
    this.form.load(rec.vendor);
    this.entry.load(rec.vendor);
    if (rec.isNew()) {
	    this.edit(1);
    } else {
	    this.atable.load(rec.vendor.arvs().sort('-active, app().name, route().short(), vendor().name'));
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
			location.href = 'vendors.csp';
		} else {
			this.edit(0);
		}
	},
	entry_onsave:function(o) {
		EditVendor.save(this, o, function(rec) {
			this.load(rec);
			this.edit(0);
		})
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
			$('#f_name').text(rec.name);
			$('#f_desc').html(Page.nbsp(rec.desc));
			$('#f_active').text(Page.yesno(rec.active));
			$('#f_id').text(rec.vid);
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
			  .on('save', this, this.entry_onsave);
		},
    load:function(rec) {
      this.entry.load(rec);
      this.rec = rec;
      if (this.rec.vid) {
        this.$this.find('#line_id').hide();
        this.$this.find('#i_newid').val('NA');
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
		//
    entry_onsave:function(o) {
      if (this.rec.aid) {
        delete o.newid;
      }
      this.onsave(o);
    }		
	}),
	ArvTable:Ui({
		init:function($this) {
		  this.table = Page.Table($this);
		},
		load:function(recs) {
			this.table.clear();
			recs.each(this, function(rec) {
			  this.table.$tr();
				ArvLink(this.table.$td(), rec, 1);
			})
			this.table.color();
		}
	})
})
