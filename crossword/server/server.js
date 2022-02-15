class CrosswordDb extends LocalDb {
  //
  static open() {
    var me = LocalDb.open('Crossword-WGH');
    var initUser = ! me.table('USERS');
    me.createTables({
      'USERS':'id',
      'CROSSWORDS':'id',
      'CROSSWORD':'id'
    });
    if (initUser) {
      me.insert('USERS').values({'name':'me'});
    }
    return me;
  }
}
class CrosswordSession extends LocalSession {
  //
  static open() {
    return LocalSession.open('Crossword-WGH-Session');
  }
}
class CrosswordClient extends LocalClient {
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
    if (action == 'login') {
      var user = MyDb.select('USERS').pk(1);
      if (user) {
        return MySession.erase().set('user', user).fetch();
      } else {
        throw 'Invalid login';
      }
    }
    MySession.fetch();
    MyUser = MySession.get('user');
    switch (action) {
      case 'getMyCrosswords':
        return MyDb.select('CROSSWORDS').where(row => row.uid == MyUser.id);
      case 'getCrossword':
        return MyDb.select('CROSSWORDS').where(row => row.uid == MyUser.id && row.id == data.id);
      case 'saveCrossword':
        return MyDb.insertOrUpdate('Crossword').values(data);
      
    }
  }
}
var MyDb = CrosswordDb.open();
var MyClient = new CrosswordClient();
var MySession = CrosswordSession.open();
var MyUser;