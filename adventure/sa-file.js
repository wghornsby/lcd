SA = window.SA || {};
//
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
    this.header = new SA.File.Header(raw, this);
    this.actions = new SA.File.Actions(this.header.actions, raw, this);
    let verbs = [], nouns = [];
    this.extractWords(verbs, nouns, raw, this.header.nounverbs);
    this.verbs = new SA.File.Words(verbs, this.header.wordlen);
    this.nouns = new SA.File.Words(nouns, this.header.wordlen);
    this.rooms = new SA.File.Rooms(this.header.rooms, raw, this);
    this.messages = new SA.File.Messages(this.header.messages, raw, this);
    this.items = new SA.File.Items(this.header.items, raw, this);
    this.actions.applyComments(raw);
    this.actions.fixVerbNouns();
    this.version = raw.next();
    this.number = raw.next();
    this._unknown = raw.next();
    this.rooms.applyAliases(raw);
    this.items.applyAliases(raw);
    log(this.toString());
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
  toString() {
    let a = [];
    a.push('/** ADVENTURE ' + this.number + ' v ' + this.version + ' */\n');
    a.push(this.header.toString());
    a.push('\n/** VOCABULARY */\n');
    a.push(this.verbs.toString('verbs'));
    a.push('');
    a.push(this.nouns.toString('nouns'));
    a.push('\n/** ROOMS */\n');
    a.push(this.rooms.toString());
    a.push('\n/** ITEMS */\n');
    a.push(this.items.toString());
    a.push('\n/** AUTOS/COMMANDS */\n');
    a.push(this.actions.toString());
    return a.join("\n");
  }
}
SA.File.Header = class {
  //
  constructor(raw, file) {
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
    privset(this, 'file', file);
  }
  applyVersion(raw) {
  }
  toString() {
    let a = [];
    a.push('wordlen = ' + this.wordlen);
    a.push('carrymax = ' + this.carrymax);
    a.push('lightlen = ' + this.lightlen);
    a.push('nounverbs = ' + this.nounverbs);
    a.push('messages = ' + this.messages);
    a.push('actions = ' + this.actions);
    a.push('items = ' + this.items);
    a.push('rooms = ' + this.rooms);
    a.push('startroom(' + this.file.rooms[this.startroom].alias + ')');
    if (this.treasures) {
      a.push('treaasures = ' + this.treasures);
      a.push('treasureroom(' + this.file.rooms[this.treasureroom].alias + ')');
    }
    return a.join("\n");
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
  constructor(count, raw, file) {
    super();
    for (let i = 0; i < count; i++) {
      let item = new SA.File.Item(raw, i, file);
      this.push(item);
    }
    privset(this, 'file', file);
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
  toString() {
    let a = [];
    this.forEach(item => a.push(item.toString()));
    return a.join('\n\n');
  }
}
SA.File.Item = class {
  /**
   * s text
   * s noun (if gettable)
   * i rx (room index: 0=out-of-play, -1=inventory)
   */
  constructor(raw, i, file) {
    let a = raw.next().split('"');
    let t = a[1].split('/');
    this.ix = i;
    this.text = t[0];
    this.noun = t[1];
    this.rx = parseInt(a[2]);
    privset(this, 'file', file);
  }
  inplay() {
    return this.rx !== 0;
  }
  held() {
    return this.rx == -1;
  }
  toString() {
    let a = [], alias = '';
    if (this.alias != this.text) {
      alias = this.alias + ': ';
    }
    a.push('item(' + alias + this.text + ')');
    if (this.noun) {
      a.push('  noun(' + this.noun + ')');
    }
    a.push('  at(' + this.file.rooms.alias(this.rx) + ')');
    return a.join('\n');
  }
}
SA.File.Rooms = class extends SA.File.AliasArray {
  //
  constructor(count, raw, file) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(new SA.File.Room(raw, i, file));
    }
    privset(this, 'file', file);
  }
  toString() {
    let a = [];
    this.forEach((room, i) => i && a.push(room.toString()));
    return a.join('\n\n');
  }
  //
  alias(rx) {
    switch (rx) {
      case -1:
        return 'inventory';
      case 0:
        return 'out-of-play';
      default:
        return this[rx].alias;
    }
  }
}
SA.File.Room = class {
  /**
   * s text
   * rx[] exits
   */
  constructor(raw, i, file) {
    this.rx = i;
    this.exits = [];
    for (let i = 0; i < 6; i++) {
      this.exits.push(raw.next());
    }
    let t = raw.next();
    this.text = t.substring(0, 1) == '*' ? t.substring(1) : 'I am in a ' + t;
    privset(this, 'file', file);
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
  toString() {
    let a = [], alias = '';
    if (this.alias != this.text) {
      alias = this.alias + ': ';
    }
    a.push('room(' + alias + this.text + ')');
    this.exits.forEach((rx, i) => {
      if (rx) {
        a.push('  ' + SA.File.Room.DIRS[i] + '(' + this.file.rooms[rx].alias + ')');
      }
    })
    return a.join('\n');
  }
  //
  static DIRS = ['N','S','E','W','U','D'];
}
SA.File.Words = class extends Array {
  //
  constructor(list, wordlen) {
    super();
    this.wordlen = wordlen;
    this.word2index = {};
    this.index2words = {};
    let index;
    list.forEach(w => {
      if (w.substring(0, 1) != '*') {
        index = this.length;
        this.index2words[index] = [w];
      } else {
        w = w.substring(1);
        this.index2words[index].push(w);
      }
      this.push(w);
      if (! this.word2index[w]) {
        this.word2index[w] = index;
      }
    })
  }
  indexOf(word) {
    return word == '' ? 0 : this.word2index[word];
  }
  synonym(word) {
    return this[this.indexOf(word.substring(0, this.wordlen))];
  }
  toString(pre) {
    let a = [], w = [];
    each(this.index2words, (words, index) => {
      if (index != '0') {
        let ws = words.join('=');
        if (ws != '' && ws != '.') {
          if (words.length > 1) {
            a.push(pre + '(' + ws + ')');
          } else {
            w.push(ws);
          }
        }
      }
    })
    while (w.length) {
      let ws = w.splice(0, 30);
      a.push(pre + '(' + ws.join(',') + ')');
    }
    return a.join('\n');
  }
}
SA.File.Actions = class extends Array {
  //
  constructor(count, raw, file) {
    //
    super();
    privset(this, 'file', file);
    let action, last;
    for (let i = 0; i < count; i++) {
      action = new SA.File.Action(raw, file);
      if (! action.empty) {
        if (action.verb && ! this.cmdix) {
          this.cmdix = this.length;
        }
        if (action.cont) {
          last.continuation.push(action);
        } else {
          last = action;
        }
      }
      this.push(action);
    }
  }
  forEachAuto(fn) {
    this.forEachAction(fn, 0, this.cmdix);
  }
  autos() {
    let a = [];
    this.forEachAuto(action => {
      a.push(action);
    })
    return a;
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
  toString() {
    let a = [];
    this.forEach(action => {
      let s = action.toString();
      s && a.push(s);
    })
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
  fixVerbNouns() {
    this.forEachCommand(action => action.fixVerbNoun());
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
  constructor(raw, file) {
    privset(this, 'file', file);
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
    this.conds = new SA.File.Conds(raw, doargs, file);
    this.dos = new SA.File.Dos(raw, doargs, file);
    if (this.conds.length == 0 && this.dos.length == 0) {
      this.empty = 1;
    } else {
      this.continuation = [];
    }
  }
  fixVerbNoun() {
    this.verb = this.file.verbs.indexOf(this.file.verbs[this.verb]);
    this.noun = this.file.nouns.indexOf(this.file.nouns[this.noun]);
  }
  toString() {
    let a = [], s;
    if (! this.empty) {
      if (this.cont) {
        s = 'continue';
      } else if (this.auto) {
        s = 'auto(' + this.auto + '%' + ')';
      } else {
        s = 'action(' + this.file.verbs[this.verb];
        if (this.noun > 0) {
          s += ' ' + this.file.nouns[this.noun];
        }
        s += ')';
      }
      if (this.comment.length) {
        s += '  // ' + this.comment;
      }
      a.push(s);
      this.conds.length && a.push(this.conds.toString());
      a.push(this.dos.toString());
      return a.join("\n");
    }
  }
}
SA.File.Conds = class extends Array {
  //
  constructor(raw, doargs, file) {
    super();
    for (let i = 0; i < 5; i++) {
      let r = raw.next();
      let arg = Math.floor(r / 20);
      let cond = r % 20;
      if (cond == 0) {
        doargs.push(arg);
      } else {
        this.push(new SA.File.Cond(cond, arg, file));
      }
    }
    privset(this, 'file', file);
  }
  toString() {
    let a = [];
    this.forEach(cond => a.push(cond.toString()));
    return '  if ' + a.join(" & ");
  }
}
SA.File.Cond = class {
  /**
   * i cond
   * i arg
   * s argtype ('I'tem, 'R'oom, 'B'it, '#' integer, '' none)
   */
  constructor(cond, arg, file) {
    this.cond = cond;
    this.arg = arg;
    this.argtype = SA.File.Cond.TEXT[cond][1];
    privset(this, 'file', file);
  }
  toString() {
    let text = SA.File.Cond.TEXT[this.cond][0];
    let arg = this.file.argText(this.arg, this.argtype);
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
  constructor(raw, doargs, file) {
    super();
    for (let i = 0; i < 2; i++) {
      let r = raw.next();
      if (r) {
        let dos = [Math.floor(r / 150)];
        let d = r % 150;
        d && dos.push(d);
        dos.forEach(action => this.push(new SA.File.Do(action, doargs, file)));
      }
    }
    privset(this, 'file', file);
  }
  toString() {
    let a = [];
    this.forEach(action => a.push(action.toString()));
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
  constructor(action, doargs, file) {
    this.action = action;
    let at = SA.File.Do.TEXT[action][1];
    this.argct = at.length;
    privset(this, 'file', file);
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
  toString() {
    let text = SA.File.Do.TEXT[this.action][0];
    let arg1 = this.file.argText(this.arg1, this.argtype1);
    let s = '    ' + text;
    if (this.argct) {
      if (this.argtype1 != '#') {
        s += '(';
      }
      s += arg1;
      if (this.argct == 2) {
        s += ', ' + this.file.argText(this.arg2, this.argtype2);
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
