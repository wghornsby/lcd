SA = window.SA || {};
//
SA.Game = class extends Obj {
  onsay(msg) {}
  onsayinv(msg, items) {}
  oncls() {}
  onlook(room, items) {}
  ongameover() {}
  ondark() {}
  onlight() {}
  //
  load(file) {
    this.file = new SA.File(file);
    this.reset();
  }
  reset() {
    this.wordlen = this.file.header.wordlen;
    this.rooms = this.file.rooms;
    this.items = this.file.items;
    this.actions = this.file.actions;
    this.messages = this.file.messages;
    this.locs = new Array(16);
    this.bits = new Array(32);
    this.ctrs = new Array(32);
    this.ctr = 0;
    this.lampleft = this.file.header.lightlen;
    this.snapshots = new SA.Game.Snapshots();
    this.oncls();
    this.go(this.file.header.startroom);
    this.look();
    this.doAutos();
  }
  submit(s) {
    if (s == 'UNDO') {
      return this.undo();
    }
    this.snapshots.take(this);
    this.parse(s);
    this.checkLampLife();
    this.doAutos();
  }
  undo() {
    let snap = this.snapshots.pop();
    if (! snap) {
      return this.reset();
    }
    this.restore(snap);
    this.look();
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
  parse(s) {
    //log(s);
    let overb, onoun, verb, noun, a = s.trim().split(' ').filter(w => w.length);
    if (a.length) {
      overb = a[0], onoun = (a.length > 1) ? a[1] : '';
      verb = overb.substring(0, this.wordlen), noun = onoun.substring(0, this.wordlen);
      if (verb == 'I') {
        this.inventory();
        return;
      }
      if (this.isDirection(verb, noun)) {
        return;
      }
      verb = this.file.verbs.synonym(verb);
      if (! verb) {
        return this.onsay("I don't know how to \"" + overb + "\" something");
      }
      if (noun) {
        noun = this.file.nouns.synonym(noun);
        if (! noun) {
          return this.onsay("I don't know what \"" + onoun + "\" is.");
        }
      }
      if (this.doCommands(verb, noun, onoun)) {
        return;
      }
      if (this.isGet(verb, noun) || this.isDrop(verb, noun) || this.isLook(verb, noun)) {
        return;
      }
    }
    this.onsay("|I must be stupid, but I just don't understand what you mean.");
  }
  // actions
  say(mx) {
    let msg = this.messages[mx];
    this.onsay(msg);
  }
  look() {
    let items = this.items.at(this.room.rx);
    this.onlook(this.room, items);
  }
  go(rx) {
    if (this.room && this.room.rx != rx) {
      this.moved = 1;
    }
    this.room = this.rooms[rx];
    this.look();
  }
  get(ix, always) {
    if (! always && this.items.inventory().length >= this.file.header.carrymax) {
      this.items[ix].rx = this.room.rx;
      return this.onsay("I'm carrying too much. Try: TAKE INVENTORY");
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
      this.onlight();
      this.look();
    }
  }
  dark() {
    if (! this.bits[15]) {
      this.bits[15] = 1;
      this.ondark();
      this.look();
    }
  }
  die() {
    this.go(this.rooms.length - 1);
    this.light();
    this.onsay("I'm DEAD!");
  }
  gameover() {
    this.ongameover();
  }
  showscore() {
    // TODO
    this.onsay('score');
  }
  inventory() {
    this.onsayinv("|I am carrying the following:", this.items.inventory());
  }
  freshLamp() {
    this.lampleft = this.file.header.lightlen;
    this.bits[16] = 0;
    this.get(9);
  }
  save() {
    // TODO
    this.onsay('save');
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
  }
  swaploc(i) {
    brx = this.locs[i];
    this.locs[i] = this.room.rx;
    if (this.brx) {
      this.go(brx);
    }
  }
  // conds
  holds(ix) {
    return ix ? this.items[ix].held() : this.items.inventory().length > 0;
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
        this.onsay('Light has run out');
        this.bits[16] = 1;
        return;
      }
      if (this.lampleft < 25) {
        this.onsay('Light runs out in ' + this.lampleft + '  turns');
      }
    }
  }
  doAutos() {
    this.actions.forEachAuto(action => {
      if (action.auto <= rnd(100)) {
        return;
      }
      if (this.allTrue(action.conds)) {
        this.doAll(action.dos);
        //log(action.toString());
      }
    })
  }
  doCommands(verb, noun, onoun) {
    let v = this.file.verbs.indexOf(verb), n = this.file.nouns.indexOf(noun);
    let done;
    let actions = this.actions.matching(v, n);
    if (actions.length == 0) {
      return;
    }
    actions.forEach(action => {
      if (! done && this.allTrue(action.conds)) {
        done = true;
        this.doAll(action.dos, onoun);
        //log(action.toString());
        action.continuation.forEach(act => {
          if (this.allTrue(act.conds)) {
            this.doAll(act.dos, onoun);
            //log(act.toString());
          }
        })
      }
    })
    if (! done) {
      this.onsay("|I can't do that...yet!");
    }
    return 1;
  }
  doAll(dos, onoun) {
    dos.forEach(d => {
      this.do(d, onoun);
    })
  }
  do(d, onoun) {
    let act = d.action; 
    if (act < 52) {
      return this.say(act);
    }
    if (act >= 102) {
      return this.say(act - 50);
    }
    let x = d.arg1;
    let x2 = d.arg2;
    switch (act) {
      case 52:
        return this.get(x);
      case 53:
        return this.drop(x);
      case 54:
        return this.go(x);
      case 55:
        return this.remove(x);
      case 56:
        this.dark();
        return;
      case 57:
        this.light();
        return;
      case 58:
        this.bits[x] = 1;
        return;
      case 59:
        return this.remove(x);
      case 60:
        this.bits[x] = 0;
        return;
      case 61:
        return this.die();
      case 62:
        return this.dropat(x, x2);
      case 63:
        return this.gameover();
      case 64:
        return this.look();
      case 65:
        return this.showscore();
      case 66:
        return this.inventory();
      case 67:
        this.bits[0] = 1;
        return;
      case 68:
        this.bits[0] = 0;
        return;
      case 69:
        return this.freshLamp();
      case 70:
        return this.oncls();
      case 71:
        return this.save();
      case 72:
        return this.swap(x, x2);
      case 73:
        return;  // continue
      case 74:
        return this.get(x, 1);
      case 75:
        return this.dropwith(x, x2);
      case 76:
        return this.look();
      case 77:
        this.ctr--;
        return;
      case 78:
        return this.onsay(this.ctr + '');
      case 79:
        this.ctr = x;
        return;
      case 80:
        return this.swaploc(0);
      case 81:
        return this.swapctr(x);
      case 82:
        this.ctr += x;
        return;
      case 83:
        this.ctr -= x;
        return;
      case 84:
        return this.onsay(n);  
      case 85:
        return this.onsay(onoun);
      case 86:
        return this.onsay('');
      case 87:
        return this.swaploc(x);
      case 88:
        // TODO wait
        return;
    }
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
    if (v != 'GET') {
      return;
    }
    if (! n) {
      this.onsay('HUH?');
      return 1;
    }
    let items = this.items.named(n);
    if (! items.length) {
      this.onsay('|Its beyond my power to do that.');
      return 1;
    }
    let ix, inv;
    items.forEach(item => {
      if (item.rx == this.room.rx && ! ix) {
        ix = item.ix;
      }
      if (item.held()) {
        inv = item.ix;
      }
    })
    if (ix) {
      this.get(ix);
      this.onsay('OK');
      return 1;
    }
    if (inv) {
      this.onsay("I already have it.");
      return 1;
    }
    this.onsay("|I don't see it here.");
    return 1;
  }
  isDrop(v, n) {
    if (v != 'DROP'.substring(0, this.wordlen)) {
      return;
    }
    if (! n) {
      this.onsay('HUH?');
      return 1;
    }
    let items = this.items.named(n);
    if (! items.length) {
      this.onsay('|Its beyond my power to do that.');
      return 1;
    }
    let inv;
    items.forEach(item => {
      if (item.held() && ! inv) {
        inv = item.ix;
      }
    })
    if (inv) {
      this.drop(inv);
      this.onsay('OK');
      return 1;
    }
    this.onsay("I'm not carrying it!");
    return 1;
  }
  isLook(v, n) {
    if (v == 'LOOK'.substring(0, this.wordlen)) {
      this.onsay('OK|I see nothing special');
      return 1;
    }
  }
  isDirection(v, n) {
    let dir;
    if (v == 'GO') {
      if (n == '') {
        this.onsay('I need a direction too|');
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
      this.onsay('Its dangerous to move in the dark!');
    }  
    let rx = this.room.exit(dir);
    if (rx == 0) {
      if (this.isdark()) {
        this.onsay("I fell & broke my neck! I'm DEAD!");
        this.die();
      } else {
        this.onsay("I can't go in THAT direction");
      }
    } else {
      this.onsay('OK');
      this.go(rx);
      this.look();
    }
    return 1;
  }
  static DIRS = ['N','S','E','W','U','D']
  static LDIRS = ['NORTH','SOUTH','EAST','WEST','UP','DOWN']
}
SA.Game.Snapshots = class extends Array {
  //
  take(game) {
    this.push(new SA.Game.Snapshot(game));
  }
}
SA.Game.Snapshot = class {
  //
  constructor(game) {
    this.locs = jscopy(game.locs);
    this.bits = jscopy(game.bits);
    this.ctrs = jscopy(game.ctrs);
    this.ctr = game.ctr;
    this.lampleft = game.lampleft;
    this.rx = game.room.rx;
    this.itemsrx = [];
    game.items.forEach(item => this.itemsrx.push(item.rx));
  }
}