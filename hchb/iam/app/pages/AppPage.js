var AppPage = Ui({
  init:function($this) {
    this.id = Ui.Page.getQueryValue('id'); 
    this.page = Page($this)
      .on('load', this, this.page_onload);
    this.$new = $this.find('#a_newarv');
    this.form = AppPage.Form($('#form'));
    this.entry = AppPage.Entry($('#entry'))
      .on('cancel', this, this.entry_oncancel)
      .on('save', this, this.entry_onsave);
    this.atable = AppPage.ArvTable($('#arvtable'));
    this.mtable = AppPage.MatchTable($('#matchtable'));
    if (my.manager) {
      $this.find('#form').on('click', this.edit.bind(this));
    }
  },
  page_onload:function() {
    if (! this.id) {
      this.load(EditApp.asNew());
    } else {
      EditApp.fetch(this, this.id, this.load);
    }
  },
  title:function() {
    var title = 'Application : ' + (this.rec ? this.rec.name() : 'New Record');
    this.page.title(title);
  },
  load:function(rec) {
    this.rec = rec;
    this.title();
    if (rec.app.aid) {
      this.$new.attr('href', 'arv.csp?aid=' + rec.app.aid);
    }
    this.form.load(rec.app);
    this.entry.load(rec.app);
    if (rec.isNew()) {
      this.edit(1);
    } else {
      this.atable.load(rec.arvs.sort('-active, app().name, route().short(), vendor().name'));
      this.mtable.load(rec.matches);
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
      location.href = 'applications.csp';
    } else {
      this.edit(0);
    }
  },
  entry_onsave:function(o) {
    EditApp.save(this, o, function(rec) {
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
      $('#f_dir').text(rec.dirText());
      $('#f_id').text(rec.aid);
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
      if (this.rec.aid) {
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
  }),
  MatchTable:Ui({
    init:function($this) {
      this.table = Page.Table($this);      
    },
    load:function(matches) {
      this.table.clear();
      var fields = matches.distinctFields();
      this.header(fields);
      var arvs = matches.arvs();
      each(arvs, this, function(rec) {
        this.table.$tr();
        each(fields, this, function(field) {
          this.table.$td(rec.map[field] || '&nbsp;');
        })
        ArvLink(this.table.$td(), rec);
      })
      this.table.color();      
    },
    //
    header:function(fields) {
      this.table.$head.html("");
      var $tr = $('<tr>').appendTo(this.table.$head);
      each(fields, this, function(field) {
        $('<th>"' + field + '"</th>').appendTo($tr);
      })
      $('<th>ARVN</th>').appendTo($tr);      
    }
  })
})
