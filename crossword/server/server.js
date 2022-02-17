var MyDb;
var MyClient;
var MySession;
var MyUser;
//
class CrosswordDb extends LocalDb {
  //
  static open() {
    return LocalDb.open('Crossword-WGH');
  }
  setup() {
    this.createTables({
        'USERS':'id',
        'CROSSWORDS':'id',
        'CROSSWORD':'id'
    });
    this.insert('USERS').values({'name':'me'});
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
  async getCrosswords() {
    return await this.ajax_get('getMyCrosswords');
  }
  async getMyLastCrossword() {
    return await this.ajax_get('getMyLastCrossword');
  }
  async getCrossword(id) {
    return await this.ajax_get('getCrossword', id);
  }
  async saveCrossword(rec) {
    return await this.ajax_post('saveCrossword', rec);
  }
}
var CrosswordServer = {
  //
  process(action, data) {
    try {
      var o;
      if (action == 'login') {
        var user = MyDb.select('USERS').pk(1);
        if (user) {
          o = MySession.erase().set('user', user).fetch();
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
          case 'getMyCrosswords':
            o = MyDb.select('CROSSWORDS').where(row => row.uid == MyUser.id);
            break;
          case 'getMyLastCrossword':
            o = MyDb.select('CROSSWORDS').where(row => row.uid == MyUser.id).pop();
            break;
          case 'getCrossword':
            o = MyDb.select('CROSSWORDS').where(row => row.uid == MyUser.id && row.id == data.id);
            break;
          case 'saveCrossword':
            o = MyDb.insertOrUpdate('CROSSWORDS').values(data);
            break;
        }
      }
      return LocalResponse.asOK(o);
    } catch (e) {
      log(e);
      return LocalResponse.asServerError();
    }
  }
}
MyDb = CrosswordDb.open();
MyClient = new CrosswordClient();
MySession = CrosswordSession.open();
