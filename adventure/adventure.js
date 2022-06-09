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
    this.wordlen = this.file.header.wordlen;
    this.rooms = this.file.rooms;
    this.items = this.file.items;
    this.actions = this.file.actions;
    this.messages = this.file.messages;
    this.bits = new Array(32);
    this.ctrs = new Array(32);
    this.ctr = 0;
    this.score = 0;
    this.moves = 0;
    this.lampleft = this.file.header.lightlen;
    this.go(this.file.header.startroom);
    this.look();
    this.doAutos();
  }
  submit(s) {
    this.parse(s);
    this.checkLampLife();
    this.doAutos();
  }
  parse(s) {
    //log(s);
    let overb, onoun, verb, noun, a = s.trim().split(' ').filter(w => w.length);
    if (a.length) {
      overb = a[0], onoun = (a.length > 1) ? a[1] : '';
      verb = overb.substring(0, this.wordlen), noun = onoun.substring(0, this.wordlen);
      if (verb == 'I') {
        verb = 'INV';
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
        log(action.toString(this.file));
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
        log(action.toString(this.file));
        action.continuation.forEach(act => {
          if (this.allTrue(act.conds)) {
            this.doAll(act.dos, onoun);
            log(act.toString(this.file));
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
        // TODO swaploc
        return this.onsay('swaploc');
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
        // TODO swaploc2
        return this.onsay('swaploc2');
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
SA.File = class {
  /**
   * Header header
   * Actions actions
   * Words verbs, nouns
   * Rooms rooms
   * Messages messages
   * i version, number
   */
  constructor(/*string*/file) {
    let raw = new SA.Raw(file);
    this.header = new SA.File.Header(raw);
    this.actions = new SA.File.Actions(this.header.actions, raw);
    let verbs = [], nouns = [];
    this.extractWords(verbs, nouns, raw, this.header.nounverbs);
    this.verbs = new SA.File.Words(verbs);
    this.nouns = new SA.File.Words(nouns);
    this.rooms = new SA.File.Rooms(this.header.rooms, raw);
    this.messages = new SA.File.Messages(this.header.messages, raw);
    this.items = new SA.File.Items(this.header.items, raw);
    this.actions.applyComments(raw);
    this.version = raw.next();
    this.number = raw.next();
    this._unknown = raw.next();
    this.rooms.applyAliases(raw);
    this.items.applyAliases(raw);
    log(this.actions.toString(this));
  }
  //
  extractWords(verbs, nouns, raw, count) {
    for (let i = 0; i < count; i++) {
      verbs.push(raw.next());
      nouns.push(raw.next());
    }
  }
  argText(i, type) {
    switch (type) {
      case 'I':
        return this.items[i].alias;
      case 'R':
        return this.rooms[i] ? this.rooms[i].alias : 'R' + i;
      case 'B':
        return 'bit' + i;
      case 'C':
        return 'ctr' + i;
      case 'M':
        return this.messages[i];
      case '#':
        return i;
      default:
        return '';
    }
  }
}
SA.File.Header = class {
  //
  constructor(raw) {
    this._unknown = raw.next();
    this.items = raw.next() + 1;
    this.actions = raw.next() + 1;
    this.nounverbs = raw.next() + 1;
    this.rooms = raw.next() + 1;
    this.carrymax = raw.next();
    this.startroom = raw.next();
    this.treasures = raw.next();
    this.wordlen = raw.next();
    this.lightlen = raw.next();
    this.messages = raw.next() + 1;
    this.treasureroom = raw.next();
  }
}
SA.File.AliasArray = class extends Array {
  //
  applyAliases(raw) {
    this.forEach(e => {
      if (raw.length) {
        e.alias = raw.next();
      } else {
        e.alias = e.text;
      }
    })
  }
}
SA.File.Items = class extends SA.File.AliasArray {
  //
  constructor(count, raw) {
    super();
    for (let i = 0; i < count; i++) {
      let item = new SA.File.Item(raw, i);
      this.push(item);
    }
  }
  inventory() {
    return this.filter(item => item.held());
  }
  named(noun) {
    return this.filter(item => item.noun == noun);
  }
  at(rx) {
    return this.filter(item => item.rx == rx);
  }
}
SA.File.Item = class {
  /**
   * s text
   * s noun (if gettable)
   * i rx (room index: 0=out-of-play, -1=inventory)
   */
  constructor(raw, i) {
    let a = raw.next().split('"');
    let t = a[1].split('/');
    this.ix = i;
    this.text = t[0];
    this.noun = t[1];
    this.rx = parseInt(a[2]);
  }
  inplay() {
    return this.rx !== 0;
  }
  held() {
    return this.rx == -1;
  }
}
SA.File.Rooms = class extends SA.File.AliasArray {
  //
  constructor(count, raw) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(new SA.File.Room(raw, i));
    }
  }
}
SA.File.Room = class {
  /**
   * s text
   * rx[] exits
   */
  constructor(raw, i) {
    this.rx = i;
    this.exits = [];
    for (let i = 0; i < 6; i++) {
      this.exits.push(raw.next());
    }
    let t = raw.next();
    this.text = t.substring(0, 1) == '*' ? t.substring(1) : 'I am in a ' + t;
  }
  exit(dir) {
    switch(dir.substring(0, 1)) {
      case 'N':
        return this.exits[0];
      case 'S':
        return this.exits[1];
      case 'E':
        return this.exits[2];
      case 'W':
        return this.exits[3];
      case 'U':
        return this.exits[4];
      case 'D':
        return this.exits[5];
    }
    return 0;
  }
}
SA.File.Words = class extends Array {
  //
  constructor(list) {
    super();
    this.map = {/*'word':index*/};
    let index;
    list.forEach(w => {
      if (w.length) {
        if (w.substring(0, 1) != '*') {
          index = this.length;
        } else {
          w = w.substring(1);
        }
        this.push(w);
        if (! this.map[w]) {
          this.map[w] = index;
        }
      }
    })
  }
  indexOf(word) {
    return word == '' ? 0 : this.map[word];
  }
  synonym(word) {
    return this[this.indexOf(word)];
  }
}
SA.File.Actions = class extends Array {
  //
  constructor(count, raw) {
    //
    super();
    let action, last;
    for (let i = 0; i < count; i++) {
      action = new SA.File.Action(raw);
      if (action.verb && ! this.cmdix) {
        this.cmdix = this.length;
      }
      if (action.cont) {
        last.continuation.push(action);
      } else {
        last = action;
      }
      this.push(action);
    }
  }
  forEachAuto(fn) {
    this.forEachAction(fn, 0, this.cmdix);
  }
  forEachCommand(fn) {
    this.forEachAction(fn, this.cmdix, this.length);
  }
  matching(verb, noun) {
    let a = [];
    this.forEachCommand(action => {
      if (action.verb == verb && (! action.noun || action.noun == noun)) {
        a.push(action);
      }
    })
    return a;
  }
  toString(file) {
    let a = [];
    this.forEach(action => a.push(action.toString(file)));
    return a.join("\n\n");
  }
  //
  forEachAction(fn, start, end) {
    for (let i = start; i < end; i++) {
      if (! this[i].cont) {
        fn(this[i], i);
      }
    }
  }
  applyComments(raw) {
    this.forEach(action => action.comment = raw.next());
  }
}
SA.File.Action = class {
  /**
   * i auto (% occurs)
   * i cont (if a continuation of prior action)
   * i verb, noun (if neither of above)
   * s comment (optional)
   * Conds conds
   * Dos dos
   * Action[] continuation (if exists for this action)
   */
  constructor(raw) {
    let doargs = [];
    let r = raw.next();
    if (r <= 100) {
      if (r == 0) {
        this.cont = 1;
      } else {
        this.auto = r;
      }
    } else {
      this.verb = Math.floor(r / 150);
      this.noun = r % 150;
    }
    this.conds = new SA.File.Conds(raw, doargs);
    this.dos = new SA.File.Dos(raw, doargs);
    this.continuation = [];
  }
  toString(file) {
    let a = [], s;
    if (this.cont) {
      s = 'continue';
    } else if (this.auto) {
      s = 'auto(' + this.auto + '%' + ')';
    } else {
      s = 'action(' + file.verbs[this.verb];
      if (this.noun > 0) {
        s += ' ' + file.nouns[this.noun];
      }
      s += ')';
    }
    if (this.comment.length) {
      s += '  // ' + this.comment;
    }
    a.push(s);
    this.conds.length && a.push(this.conds.toString(file));
    a.push(this.dos.toString(file));
    return a.join("\n");
  }
}
SA.File.Conds = class extends Array {
  //
  constructor(raw, doargs) {
    super();
    for (let i = 0; i < 5; i++) {
      let r = raw.next();
      let arg = Math.floor(r / 20);
      let cond = r % 20;
      if (cond == 0) {
        doargs.push(arg);
      } else {
        this.push(new SA.File.Cond(cond, arg));
      }
    }
  }
  toString(file) {
    let a = [];
    this.forEach(cond => a.push(cond.toString(file)));
    return '  if ' + a.join(" & ");
  }
}
SA.File.Cond = class {
  /**
   * i cond
   * i arg
   * s argtype ('I'tem, 'R'oom, 'B'it, '#' integer, '' none)
   */
  constructor(cond, arg) {
    this.cond = cond;
    this.arg = arg;
    this.argtype = SA.File.Cond.TEXT[cond][1];
  }
  toString(file) {
    let text = SA.File.Cond.TEXT[this.cond][0];
    let arg = file.argText(this.arg, this.argtype);
    return this.argtype == 'B' || this.argtype == '#' ? text + arg : text + '(' + arg + ')';
  }
  static TEXT = [
    ['',''],
    ['holds','I'],
    ['here','I'],
    ['with','I'],
    ['at','R'],
    ['! here','I'],
    ['! holds','I'],
    ['! at','R'],
    ['','B'],
    ['! ','B'],
    ['holds',''],
    ['! holds',''],
    ['! with','I'],
    ['live','I'],
    ['! live','I'],
    ['ctr <= ','#'],
    ['ctr > ','#'],
    ['! moved',''],
    ['moved',''],
    ['ctr = ','#']
  ]
}
SA.File.Dos = class extends Array {
  //
  constructor(raw, doargs) {
    super();
    for (let i = 0; i < 2; i++) {
      let r = raw.next();
      if (r) {
        let dos = [Math.floor(r / 150)];
        let d = r % 150;
        d && dos.push(d);
        dos.forEach(action => this.push(new SA.File.Do(action, doargs)));
      }
    }
  }
  toString(file) {
    let a = [];
    this.forEach(action => a.push(action.toString(file)));
    return a.join("\n");
  }
}
SA.File.Do = class {
  /**
   * i action
   * i argct (number of args)
   * i arg1, arg2
   * s argtype1, argtype2 ('M'essage, 'I'tem, 'R'oom, 'B'it, 'C'ounter, '#' integer, '' none)
   */
  //
  constructor(action, doargs) {
    this.action = action;
    let at = SA.File.Do.TEXT[action][1];
    this.argct = at.length;
    if (at == '') {
      return;
    }
    if (at == 'M') {
      this.arg1 = action <= 51 ? action : action - 50;
      this.argtype1 = at;
      return;
    } 
    this.arg1 = doargs.shift();
    this.argtype1 = at[0];
    if (this.argct == 2) {
      this.arg2 = doargs.shift();
      this.argtype2 = at[1];
    }
  }
  toString(file) {
    let text = SA.File.Do.TEXT[this.action][0];
    let arg1 = file.argText(this.arg1, this.argtype1);
    let s = '    ' + text;
    if (this.argct) {
      if (this.argtype1 != '#') {
        s += '(';
      }
      s += arg1;
      if (this.argct == 2) {
        s += ', ' + file.argText(this.arg2, this.argtype2);
      }
      if (this.argtype1 != '#') {
        s += ')';
      }
    } 
    return s;
  }
  static TEXT = [
    ['',''],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['get','I'],
    ['drop','I'],
    ['go','R'],
    ['remove','I'],
    ['dark',''],
    ['cleardark',''],
    ['set','B'],
    ['remove2','I'],
    ['clear','B'],
    ['die',''],
    ['dropat','IR'],
    ['gameover',''],
    ['look',''],
    ['score',''],
    ['inventory',''],
    ['set(0)',''],
    ['reset(0)',''],
    ['getfreshlamp',''],
    ['cls',''],
    ['save',''],
    ['swap','II'],
    ['continue',''],
    ['superget','I'],
    ['dropwith','II'],
    ['look2',''],
    ['ctr--',''],
    ['sayctr',''],
    ['ctr = ','#'],
    ['swaploc',''],
    ['swapct','C'],
    ['ctr += ','#'],
    ['ctr -= ','#'],
    ['saynoun',''],
    ['saynouncr',''],
    ['cr',''],
    ['swaploc2','#'],
    ['wait',''],
    ['saga',''],
    ['',''],['',''],['',''],['',''],['',''],['',''],['',''],['',''],['',''],['',''],['',''],['',''],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],
    ['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M'],['say','M']
  ]
}
SA.File.Messages = class extends Array {
  //
  constructor(count, raw) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(raw.next());
    }
  }
}
SA.Raw = class extends Array {
  //
  constructor(data) {
    super(...data.split('\n').map(v => v.trim()));
  }
  next() {
    let s = this.shift();
    while (s.split('"').length == 2) {
      s += '|' + this.shift();
    }
    let v;
    if (s.substring(0, 1) == '"') {
      v = s.substring(s.length - 1) == '"' ? s.substring(1, s.length - 1) : s;
    } else {
      v = parseInt(s);
    }  
    return v;
  }
}
