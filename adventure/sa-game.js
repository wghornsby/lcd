SA = window.SA || {};
//
SA.Game = class extends Obj {
  onsay(msg) {}
  onsayinv(msg, items) {}
  oncls(hard) {}
  onlook(room, items) {}
  ongameover() {}
  onready() {}
  onreplay(snapshots) {}
  //
  load(data) {
    this._data = data;
    this.reset();
  }
  reset() {
    this.file = new SA.File(this._data);
    this.wordlen = this.file.header.wordlen;
    this.rooms = this.file.rooms;
    this.items = this.file.items;
    this.actions = this.file.actions;
    this.messages = this.file.messages;
    this.locs = new Array(16);
    this.bits = new Array(32);
    this.ctrs = new Array(16);
    this.ctr = 0;
    this.lampleft = this.file.header.lightlen;
    this.go(this.file.header.startroom);
    this.snapshots = new SA.Game.Snapshots(this);
    if (this.snapshots.length > 1) {
      this.replay();
      return;
    }
    this.oncls(1);
    this.look();
    this.doAutos(() => this.onready());
  }
  undo() {
    let snap = this.snapshots.pop();
    if (! snap) {
      this.snapshots.reset(this);
      this.reset();
      return;
    }
    this.replay();
  }
  replay() {
    let snap = this.snapshots.last();
    this.restore(snap);
    this.oncls(1);
    this.onreplay(this.snapshots);
    this.look();
    this.onready();
  }
  restore(snap) {
    this.locs = snap.locs;
    this.bits = snap.bits;
    this.ctrs = snap.ctrs;
    this.ctr = snap.ctr;
    this.lampleft = snap.lampleft;
    this.room = this.rooms[snap.rx];
    this.items.forEach((item, i) => item.rx = snap.itemsrx[i]);
  }
  submit(s) {
    log('> ' + s);
    if (s == 'UNDO') {
      this.undo();
      return;
    }
    if (s == 'QUIT') {
      this.snapshots.reset(this);
      this.reset();
      return;
    }
    this.snapshots.take(this, s);
    this.parse(s, () => {
      this.checkLampLife();
      this.doAutos(() => {
        this.snapshots.apply(this);
        this.onready();
      })
    })
  }
  parse(s, callback) {
    let overb, onoun, verb, noun, a = s.trim().split(' ').filter(w => w.length);
    if (a.length) {
      overb = a[0], onoun = (a.length > 1) ? a[1] : '';
      verb = overb.substring(0, this.wordlen), noun = onoun.substring(0, this.wordlen);
      if (verb == 'I') {
        verb = this.file.verbs.synonym('GET');
        noun = this.file.nouns.synonym('INVENTORY');
      }
      if (this.isDirection(verb, noun)) {
        return callback();
      }
      verb = this.file.verbs.synonym(verb);
      if (! verb) {
        this.say("I don't know how to \"" + overb + "\" something");
        return callback();
      }
      if (noun) {
        noun = this.file.nouns.synonym(noun);
        if (! noun) {
          this.say("I don't know what \"" + onoun + "\" is.");
          return callback();
        }
      }
      this.onoun = onoun;
      if (this.doCommands(verb, noun, callback) !== -1) {
        return;
      } else {
        if (this.isGet(verb, noun) || this.isDrop(verb, noun) || this.isLook(verb, noun)) {
          return callback();
        }
      }
    }
    this.say("|I must be stupid, but I just don't understand what you mean.");
    callback();
  }
  // actions
  saymsg(mx) {
    let msg = this.messages[mx];
    this.say(msg);
  }
  saynocr(msg) {
    this.say(msg, 1);
  }
  say(msg, nocr) {
    this.snapshots.say(msg, nocr);
    this.onsay(msg, nocr);
  }
  sayinv(msg, items) {
    this.snapshots.sayinv(msg, items);
    this.onsayinv(msg, items);
  }
  look() {
    let items = this.items.at(this.room.rx);
    this.onlook(this.room, items);
  }
  go(rx, nolook) {
    if (this.room && this.room.rx != rx) {
      this.moved = 1;
    }
    this.room = this.rooms[rx];
    !nolook && this.look();
  }
  get(ix, always) {
    if (! always && this.items.inventory().length >= this.file.header.carrymax) {
      this.items[ix].rx = this.room.rx;
      return this.say("I'm carrying too much. Try: TAKE INVENTORY");
    }
    this.items[ix].rx = -1;
    this.look();
  }
  drop(ix) {
    this.items[ix].rx = this.room.rx;
    this.look();
  }
  dropat(ix, rx) {
    this.items[ix].rx = rx;
    this.look();
  }
  dropwith(ix, ix2) {
    this.items[ix].rx = this.items[ix2].rx;
    this.look();
  }
  remove(ix) {
    this.items[ix].rx = 0;
    this.look();
  }
  light() {
    if (this.bits[15]) {
      this.bits[15] = 0;
      this.look();
    }
  }
  dark() {
    if (! this.bits[15]) {
      this.bits[15] = 1;
      this.look();
    }
  }
  die() {
    this.go(this.rooms.length - 1);
    this.light();
    this.say("I'm DEAD!");
  }
  gameover() {
    this.ongameover();
  }
  showscore() {
    let ts = this.items.treasuresStored().length;
    let s = Math.floor(100 / this.file.header.treasures * ts);
    this.say("I've stored " + ts + " treasures.  On a scale of 0 to 100 that rates: " + s);
    if (s == 100) {
      this.say("FANTASTIC! You've solved it ALL!");
      this.gameover();
    }
  }
  inventory() {
    this.sayinv("|I am carrying the following:", this.items.inventory());
  }
  freshLamp() {
    this.lampleft = this.file.header.lightlen;
    this.bits[16] = 0;
    this.get(9);
  }
  save() {
    // TODO
    this.say('save');
  }
  swap(ix1, ix2) {
    let rx = this.items[ix1].rx;
    this.items[ix1].rx = this.items[ix2].rx;
    this.items[ix2].rx = rx;
    this.look();
  }
  swapctr(i) {
    let c = this.ctr;
    this.ctr = this.ctrs[i];
    this.ctrs[i] = c;
    this.onswapctr(i);
  }
  swaploc(i) {
    let brx = this.locs[i];
    this.locs[i] = this.room.rx;
    if (brx) {
      this.go(brx, 1);
    }
  }
  // conds
  holds(ix) {
    return ix !== undefined ? this.items[ix].held() : this.items.inventory().length > 0;
  }
  here(ix) {
    return this.items[ix].rx == this.room.rx;
  }
  with(ix) {
    return this.holds(ix) || this.here(ix);
  }
  at(rx) {
    return this.room.rx == rx;
  }
  live(ix) {
    return this.items[ix].inplay();
  }
  litlamp() {
    return this.with(9) && this.lampleft;
  }
  isdark() {
    return this.bits[15] && ! this.litlamp();
  }
  //
  checkLampLife() {
    if (this.live(9) && this.lampleft > 0) {
      this.lampleft--;
      if (this.lampleft == 0) {
        this.say('Light has run out');
        this.bits[16] = 1;
        return;
      }
      if (this.lampleft < 25) {
        this.say('Light runs out in ' + this.lampleft + '  turns');
      }
    }
  }
  doAutos(callback) {
    this.doActions(this.actions.autos(), callback);
  }
  doCommands(verb, noun, callback) {
    let v = this.file.verbs.indexOf(verb), n = this.file.nouns.indexOf(noun);
    let matches = this.actions.matching(v, n);
    if (matches.length == 0) {
      return -1;
    }
    let action;
    matches.forEach(match => {
      if (! action && this.allTrue(match.conds)) {
        action = match;
      }
    })
    if (! action) {
      this.say("|I can't do that...yet!");
      callback();
      return;
    }
    this.doActions([action], callback);
  }
  doActions(actions, callback) {
    if (actions.length == 0) {
      return callback();
    }
    let action = actions.shift();
    if (action.auto && action.auto <= rnd(100)) {
      return this.doActions(actions, callback);
    }
    if (! this.allTrue(action.conds)) {
      return this.doActions(actions, callback);
    }
    if (action.continuation.length) {
      actions.splice(0, 0, ...action.continuation);
    }
    log(action.toString());
    let dos = [].concat(...action.dos);
    this.do(dos, () => this.doActions(actions, callback));
  }
  do(dos, callback) {
    if (dos.length == 0) {
      return callback();      
    }
    let d = dos.shift();
    let act = d.action, x = d.arg1, x2 = d.arg2;
    if (act < 52) {
      x = act;
      act = 1;
    } else if (act >= 102) {
      x = act - 50;
      act = 1;
    } 
    switch (act) {
      case 1:
        this.saymsg(x);
        break;
      case 52:
        this.get(x);
        break;
      case 53:
        this.drop(x);
        break;
      case 54:
        this.go(x);
        break;
      case 55:
        this.remove(x);
        break;
      case 56:
        this.dark();
        break;
      case 57:
        this.light();
        break;
      case 58:
        this.bits[x] = 1;
        break;
      case 59:
        this.remove(x);
        break;
      case 60:
        this.bits[x] = 0;
        break;
      case 61:
        this.die();
        break;
      case 62:
        this.dropat(x, x2);
        break;
      case 63:
        this.gameover();
        break;
      case 64:
        this.look();
        break;
      case 65:
        this.showscore();
        break;
      case 66:
        this.inventory();
        break;
      case 67:
        this.bits[0] = 1;
        break;
      case 68:
        this.bits[0] = 0;
        break;
      case 69:
        this.freshLamp();
        break;
      case 70:
        this.oncls();
        break;
      case 71:
        this.save();
        break;
      case 72:
        this.swap(x, x2);
        break;
      case 73:
        break;  // continue
      case 74:
        this.get(x, 1);
        break;
      case 75:
        this.dropwith(x, x2);
        break;
      case 76:
        this.look();
        break;
      case 77:
        this.ctr--;
        break;
      case 78:
        this.saynocr(this.ctr + '');
        break;
      case 79:
        this.ctr = x;
        break;
      case 80:
        this.swaploc(0);
        break;
      case 81:
        this.swapctr(x);
        break;
      case 82:
        this.ctr += x;
        break;
      case 83:
        this.ctr -= x;
        break;
      case 84:
        this.saynocr(this.onoun);  
        break;
      case 85:
        this.say(this.onoun);
        break;
      case 86:
        this.say('');
        break;
      case 87:
        this.swaploc(x);
        break;
      case 88:
        wait(1000, () => this.do(dos, callback));
        return;
    }
    this.do(dos, callback);
  }
  allTrue(conds) {
    let r = true;
    conds.forEach(cond => {
      if (! this.isTrue(cond)) {
        r = false;
      }
    })
    return r;
  }
  isTrue(cond) {
    let x = cond.arg;
    switch (cond.cond) {
      case 1:
        return this.holds(x);
      case 2:
        return this.here(x);
      case 3:
        return this.with(x);
      case 4:
        return this.at(x);
      case 5:
        return ! this.here(x);
      case 6:
        return ! this.holds(x);
      case 7:
        return ! this.at(x);
      case 8:
        return this.bits[x];
      case 9:
        return ! this.bits[x];
      case 10:
        return this.holds();
      case 11:
        return ! this.holds();
      case 12:
        return ! this.with(x);
      case 13:
        return this.live(x);
      case 14:
        return ! this.live(x);
      case 15:
        return this.ctr <= x;
      case 16:
        return this.ctr > x;
      case 17:
        return ! this.moved;
      case 18:
        return this.moved;
      case 19:
        return this.ctr == x;
    }
  }
  isGet(v, n) {
    if (this.file.verbs.synonym('GET') != v) {
      return;
    }
    if (! n) {
      this.say('HUH?');
      return 1;
    }
    let items = this.items.named(n);
    if (! items.length) {
      this.say('|Its beyond my power to do that.');
      return 1;
    }
    let ix, inv;
    items.forEach(item => {
      if (item.rx == this.room.rx && ! ix) {
        ix = item.ix;
      }
      if (item.held()) {
        inv = true;
      }
    })
    if (ix !== undefined) {
      this.get(ix);
      this.say('OK');
      return 1;
    }
    if (inv) {
      this.say("I already have it.");
      return 1;
    }
    this.say("|I don't see it here.");
    return 1;
  }
  isDrop(v, n) {
    if (this.file.verbs.synonym('DROP') != v) {
      return;
    }
    if (! n) {
      this.say('HUH?');
      return 1;
    }
    let items = this.items.named(n);
    if (! items.length) {
      this.say('|Its beyond my power to do that.');
      return 1;
    }
    let inv;
    items.forEach(item => {
      if (item.held() && ! inv) {
        inv = item.ix;
      }
    })
    if (inv !== undefined) {
      this.drop(inv);
      this.say('OK');
      return 1;
    }
    this.say("I'm not carrying it!");
    return 1;
  }
  isLook(v, n) {
    if (this.file.verbs.synonym('LOOK') == v) {
      this.say('OK|I see nothing special');
      return 1;
    }
  }
  isDirection(v, n) {
    let dir;
    if (v == 'GO') {
      if (n == '') {
        this.say('I need a direction too|');
        return 1;
      }
      let i = SA.Game.LDIRS.findIndex(d => d.substring(0, this.wordlen) == n);
      dir = i > -1 ? SA.Game.DIRS[i] : null;
    } else {
      dir = SA.Game.DIRS.find(d => d == v); 
    }
    if (! dir) {
      return;
    }
    if (this.isdark()) {
      this.say('Its dangerous to move in the dark!');
    }  
    let rx = this.room.exit(dir);
    if (rx == 0) {
      if (this.isdark()) {
        this.say("I fell & broke my neck! I'm DEAD!");
        this.die();
      } else {
        this.say("I can't go in THAT direction");
      }
    } else {
      this.say('OK');
      this.go(rx);
      this.look();
    }
    return 1;
  }
  static DIRS = ['N','S','E','W','U','D']
  static LDIRS = ['NORTH','SOUTH','EAST','WEST','UP','DOWN']
}
SA.Game.Snapshots = class extends StorableObj {
  //
  constructor(game) {
    super(game.file.filename());
    if (! this.snaps || this.snaps.length <= 1) {
      this.reset(game);
    }
    //log(this);
  }
  reset(game) {
    this.snaps = [];
    this.length = 0;
    this.take(game, '');
    this.save();
  }
  say(msg, nocr) {
    this.last().say(msg, nocr);
    this.save();
  }
  take(game, cmd) {
    this.snaps.push(new SA.Game.Snapshot(game, cmd));
    this.save();
  }
  apply(game) {
    this.last().apply(game);
    this.save();
  }
  pop() {
    if (this.snaps.length == 1) {
      return;
    }
    let snap = this.snaps.pop();
    this.save();
    return snap;
  }
  last() {
    return this.snaps[this.snaps.length - 1];
  }
  forEach(fn) {
    this.snaps.forEach((snap, i) => fn(snap, i));
  }
  sayinv(msg, items) {
    this.snaps[this.snaps.length - 1].sayinv = {msg:msg, items:jscopy(items)};
    this.save();
  }
  save() {
    this.length = this.snaps.length;
    //log(this);
    super.save();
  }
}
SA.Game.Snapshot = class {
  //
  constructor(game, cmd) {
    this.cmd = cmd;
    this.says = [];
    this.apply(game);
  }
  apply(game) {
    this.locs = jscopy(game.locs);
    this.bits = jscopy(game.bits);
    this.ctrs = jscopy(game.ctrs);
    this.ctr = game.ctr;
    this.lampleft = game.lampleft;
    this.rx = game.room.rx;
    this.itemsrx = [];
    game.items.forEach(item => this.itemsrx.push(item.rx));
  }
  say(msg, nocr) {
    this.says.push({msg:msg, nocr:nocr});
  }
}
