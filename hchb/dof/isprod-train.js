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
    var items = prod.items.filterClass('HchbLib.Interface.GetCustomerTransactionsSvc');
    var env = prod.getEnv();
    items.forEach(item => {
      if (! item.getSetting('DOFEnabled')) {
        item.setSetting('DOFEnabled', '1');
        let target = prod.items.byName(item.getSetting('GetTransactionsOp Target'));
        item.importDOFSettings(target);
        let cat = item.getCategory();
        let np = item.namePrefix();
        let namevt = np + ' - DOF Get Vendor Transactions HTTP Op';
        let namehandle = np + ' - DOF Get Interface HandleId Op';
        let nametoken = np + ' - DOF Get Auth Token HTTP Op';
        item.setSetting('GetDOFVTOp Target', namevt);
        item.setSetting('InterfaceHandleIdOp Target', namehandle);
        prod.items.addDOFVendorTransactions(namevt, nametoken, cat, env);
        prod.items.addDOFToken(nametoken, cat, env); 
        prod.items.addDOFHandleId(namehandle, cat);
        let proc = target.getSetting('TransactionDeduplicationProc');
        if (proc) {
          let namededup = np + ' - DOF Dedup Vendor Transactions Op';
          item.setSetting('DedupSQLOp Target', namededup);
          let et = target.getSetting('TransactionDeduplicationEventType');
          prod.items.addDOFDedup(namededup, cat, proc, et);
        }
        let sqlop = item.getSetting('SqlDatabaseOp Target');
        if (! sqlop) {
          let namess = np + ' - DOF Get System Settings Op';
          item.setSetting('SqlDatabaseOp Target', namess);
          prod.items.addDOFSqlOp(namess, cat);
        }
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
  addDOFVendorTransactions(name, tokenname, category, env, dofname) {
    if (! this.byName(name)) {
      env = this.fixEnv(env);
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Customer.Operations.DOFHTTPOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">`;
      s += `<Setting Target="Adapter" Name="HTTPPort">443</Setting><Setting Target="Adapter" Name="HTTPServer">dof.k8s-${env}.hchb.local</Setting><Setting Target="Adapter" Name="SSLConfig">SSL Config</Setting><Setting Target="Adapter" Name="URL">/api/v1/GetGeneralVendorTransaction</Setting><Setting Target="Host" Name="GetUserTokenOp">${tokenname}</Setting><Setting Target="Host" Name="AlertOnError">1</Setting><Setting Target="Host" Name="ArchiveIO">1</Setting></Item>`;
      this.add(s);
    }
  }
  addDOFToken(name, category, env) {
    if (! this.byName(name)) {
      env = this.fixEnv(env, 1);
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Customer.Operations.TokenServiceHTTPOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">`;
      s += `<Setting Target="Adapter" Name="HTTPPort">443</Setting><Setting Target="Adapter" Name="HTTPServer">token${env}.hchb.com</Setting><Setting Target="Adapter" Name="URL">/connect/token</Setting><Setting Target="Adapter" Name="SSLConfig">SSL Config</Setting><Setting Target="Host" Name="clientID">dof${env}.client</Setting><Setting Target="Host" Name="clientsecret">TokenServiceClientSecretDOF</Setting><Setting Target="Host" Name="granttype">interop_auth</Setting><Setting Target="Host" Name="scope">dof${env}.hchb.com hchb.identity</Setting><Setting Target="Adapter" Name="Credentials"></Setting></Item>`;
      this.add(s);
    }
  }
  addDOFHandleId(name, category) {
    if (! this.byName(name)) {
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Interface.SqlDatabaseOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">`;
      s += `<Setting Target="Adapter" Name="DSN">INTERFACES</Setting></Item>`;
      this.add(s);
    }
  }
  addDOFDedup(name, category, proc, eventtype) {
    if (! this.byName(name)) {
      eventtype = eventtype || '';
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Customer.Operations.GetVendorTransactionsListOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule="">`;
      s += `<Setting Target="Host" Name="TransactionDeduplicationProc">${proc}</Setting><Setting Target="Host" Name="TransactionDeduplicationEventType">${eventtype}</Setting></Item>`;
      this.add(s);
    }
  }
  addDOFSqlOp(name, category) {
    if (! this.byName(name)) {
      var s = `<Item Name="${name}" Category="${category}" ClassName="HchbLib.Customer.SqlDatabaseOp" PoolSize="1" Enabled="true" Foreground="false" Comment="" LogTraceEvents="false" Schedule=""></Item>`;
      this.add(s);
    }
  }
  add(s) {
    var xi = new Jxml(s);
    this._xml.inners.push(xi);
    this.push(new XItem(xi));
  }
  fixEnv(env, blankProd) {
    return 'training';
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
  importDOFSettings(from) {
    this.copySetting(from, 'Suppress Early Updates');
    this.copySetting(from, 'TransactionTypeToSearch');
    this.copySetting(from, 'TransactionEntityTypeToSearch');
    this.copySetting(from, 'TransactionStatusToSearch');
    this.copySetting(from, 'TransactionStatusProcessing');
    this.copySetting(from, 'NumberOfRecordsToProcess');
  }
}
