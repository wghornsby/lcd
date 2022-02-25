var MyDb;
var MyClient;
var MySession;
var MyUser;
//
class CrosswordDb extends LocalDb {
  //
  static open() {
    return LocalDb.open('Crossword-WGH', me => {
      me.createTables({
        'USERS':'id',
        'CROSSWORDS':'id',
        'CROSSWORD':'id',
        'THEMES':'id',
        'EDITING':'id'
      });
      me.insert('USERS').values({'name':'me'});
    });
  }
}
class CrosswordSession extends LocalSession {
  /**
   * User user
   */
  static open() {
    return LocalSession.open('Crossword-WGH-Session');
  }
}
class CrosswordClient extends LocalClient {
  onworking(b) {}
  onexpired() {}
  onerror(msg) {}
  //
  constructor() {
    super(CrosswordServer);
  }
  async login(id, pw) {
    return await this.ajax_post('login', {id:id, pw:pw});
  }
  async getTheme(id) {
    return await this.ajax_get('getTheme', id);
  }
  async saveTheme(o) {  
    return await this.ajax_post('saveTheme', o);
  }
  async getEditing() {
    return await this.ajax_get('getEditing');  
  }
  async saveEditing(o) {  
    return await this.ajax_post('saveEditing', o);
  }
  async getCrosswords() {
    return await this.ajax_get('getMyCrosswords');
  }
  async getMyLastCrossword() {
    return await this.ajax_get('getMyLastCrossword');
  }
  async getCrossword(id) {
    return await this.ajax_get('getCrossword', id);
  }
  async saveCrossword(o) {
    return await this.ajax_post('saveCrossword', o);
  }
}
var CrosswordServer = {
  //
  process(action, data) {
    try {
      var o;
      if (action == 'login') {
        MyUser = MyDb.select('USERS').pk(1);
        if (MyUser) {
          o = MySession.erase().set('user', MyUser).fetch();
        } else {
          return LocalResponse.asBadLogin();
        }
      } else {
        MySession.fetch();
        MyUser = MySession?.get('user');
        if (! MySession || ! MyUser) {
          return LocalResponse.asExpired();
        }
        switch (action) {
          case 'getMyThemes':
            o = this.fetchMine('THEMES');
            break;
          case 'getTheme':
            o = this.fetchByPk('THEMES', data.id);
            break;
          case 'saveTheme':
            o = this.save('THEMES', data);
            break;
          case 'getEditing':
            o = this.fetchMine('EDITING').pop();
            break;
          case 'saveEditing':
            o = this.save('EDITING', data);
            break;
          case 'getMyCrosswords':
            o = this.fetchMine('CROSSWORDS');
            break;
          case 'getMyLastCrossword':
            o = this.fetchMine('CROSSWORDS').pop();
            break;
          case 'getCrossword':
            o = this.fetchByPk('CROSSWORDS', data.id);
            break;
          case 'getCrosswords':
            o = [];
            data.cids.forEach(cid => o.push(this.fetchByPk('CROSSWORDS', cid)));
            break;
          case 'saveCrossword':
            o = this.save('CROSSWORDS', data);
            break;
        }
      }
      return LocalResponse.asOK(o);
    } catch (e) {
      console.log(e);
      return LocalResponse.asServerError();
    }
  },
  fetchMine(table) {
    return MyDb.select(table).where(row => row.uid == MyUser.id);
  },
  fetchByPk(table, pk) {
    return MyDb.select(table).where(row => row.uid == MyUser.id && row.id == pk).pop();
  },
  save(table, data) {
    var o;
    if (data.id) {
      o = MyDb.select(table).pk(data.id);
    }
    if ((data.uid && data.uid != MyUser.id) || (o && o.uid && o.uid != MyUser.id)) {
      throw 'Forbidden to save, MyUser: ' + js(MyUser) + ', record: ' + js(data);
    }
    return MyDb.insertOrUpdate(table).values(data);
  }
}
MyDb = CrosswordDb.open();
MyClient = new CrosswordClient();
MySession = CrosswordSession.open();
