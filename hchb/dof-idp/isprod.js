class PageUi {
  //
  constructor() {
    this.$before = $('#tbefore');
    this.$after = $('#tafter');
    this.$before.on('click', e => {
      if (this.$before.value == 'Paste production class here') {
        this.$before.value = '';
      }
      this.select();
    })
    this.$after.on('click', e => this.convert());
    this.reset();
  }
  reset() {
    this.$before.value = 'Paste production class here';
    this.$after.value = 'Click on this side to convert';
    this.select();
  }
  select() {
    this.$before.focus();
    this.$before.select();    
  }
  convert() {
    this.$after.value = '';
    var prod = new XProd(this.$before.value);
    var items = prod.items.filterClass('HchbLib.Customer.Operations.DOFHTTPOp');
    items.forEach(item => {
      if (! item.getSetting('AgencyServiceOp')) {
        item.setSetting('UseIDPToken', '1');
        let cat = item.getCategory();
        let np = item.namePrefix();
        let nameagencyop = np + ' - Get Agency Op';
        let nameidpop = np + ' - Get IDP Op';
        item.setSetting('AgencyServiceOp', nameagencyop);
        item.setSetting('IDPServiceOp', nameidpop);
        prod.items.addAgencyOp(nameagencyop, cat);
        prod.items.addIDPOp(nameidpop, cat);
      }
    })
    this.$after.value = prod.toString();
    this.$before.scrollTop = 0;
    this.$after.focus();
    this.$after.select();
  }
}
//
class XProd {
  //
  constructor(s) {
    var a = s.split('<Production ');
    this._pre = a[0];
    s = a[1];
    a = s.split('</Production>');
    this._post = a[1];
    s = a[0].replace(/\]\]><!\[CDATA\[>/g, 'BE2LQMG]]>');
    this._xml = new Jxml('<Production ' + s + '</Production>');
    this.items = XItems.from(this._xml);
  }
  getName() {
    return this._xml.attr.Name;
  }
  getEnv() {
    return this.getName().split('.').pop();
  }
  toString() {
    return this._pre + this._xml.toString().replace(/BE2LQMG\]\]>/g, ']]><![CDATA[>') + this._post;
  }
}
class XItems extends Array {
  //
  constructor() {
    super();
  }
  byName(s) {
    return each(this, xi => {
      if (xi._xml.attr.Name == s) {
        return xi;
      }
    })
  }
  filterClass(s) {
    var a = [];
    this.each(xi => {
      if (xi._xml.attr.ClassName == s) {
        a.push(xi);
      }
    })
    return a;
  }
  addAgencyOp(name, category) {
    if (! this.byName(name)) {
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Interface.IDP.InteropTokenRestAPIOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule=""></Item>`;
      this.add(s);
    }
  }
  addIDPOp(name, category) {
    if (! this.byName(name)) {
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Interface.AgencyState.AgencyStateServiceRestApiOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule=""></Item>`;
      this.add(s);
    }
  }
  add(s) {
    var xi = new Jxml(s);
    this._xml.inners.push(xi);
    this.push(new XItem(xi));
  }
  fixEnv(env, blankProd) {
    switch (env.toUpperCase().substr(0, 3)) {
      case 'DEV':
        return 'dev';
      case 'QA':
        return 'qa';
      case 'TRA':
        return 'training';
      default:
        return blankProd ? '' : 'prod';
    }
  }
  static from(x) {
    var me = new XItems();
    me._xml = x;
    x.inners.forEach(xi => {
      if (xi.tag == 'Item') {
        me.push(new XItem(xi));
      }
    })
    return me;
  }
}
class XItem {
  //
  constructor(x) {
    this._xml = x;
    this.settings = {};
    x.inners.forEach(xi => {
      if (xi.tag == 'Setting') {
        this.settings[xi.attr.Name] = xi;
      }
    })
  }
  namePrefix() {
    return this._xml.attr.Name.split(' - ')[0];
  }
  getCategory() {
    return this._xml.attr.Category;
  }
  hasSetting(name) {
    return this.settings[name] !== undefined;
  }
  getSetting(name) {
    if (this.hasSetting(name)) {
      return this.settings[name].text;  
    }
  }
  setSetting(name, value) {
    if (this.hasSetting(name)) {
      this.settings[name].text = value;
    } else {
      this.addSetting(name, value);
    }
  }
  addSetting(name, value) {
    var xi = new Jxml(`<Setting Target="Host" Name="${name}">${value}</Setting>`);
    this._xml.inners.push(xi);
    this.settings[xi.attr.Name] = xi;
  }
  copySetting(from, name) {
    var value = from.getSetting(name);
    if (value !== undefined) {
      this.addSetting(name, value);
    }
  }
  removeSettings() {
    let a = [];
    this._xml.inners.forEach(xi => {
      if (xi.tag != 'Setting') {
        a.push(xi);
      }
    })
    this._xml.inners = a;
    this.settings = {};
  }
}
