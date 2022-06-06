SA = {}
SA.Game = class {
  //
  constructor(file) {
    this.file = file;
    this.flags = new Array(32);
    this.count = new Array(32);

  }
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
  //
  constructor(/*string*/data) {
    let raw = new SA.Raw(data);
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
        return this.rooms[i].alias;
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
      this.push(new SA.File.Item(raw));
    }
  }
}
SA.File.Item = class {
  /**
   * s text
   * s noun (if gettable)
   * i start (room)
   */
  constructor(raw) {
    let a = raw.next().split('"');
    let t = a[1].split('/');
    this.text = t[0];
    this.noun = t[1];
    this.start = parseInt(a[2]);
  }
}
SA.File.Rooms = class extends SA.File.AliasArray {
  //
  constructor(count, raw) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(new SA.File.Room(raw));
    }
  }
}
SA.File.Room = class {
  /**
   * s text
   * i[] exits
   */
  constructor(raw) {
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
    list.forEach(w => {
      let index;
      if (w.length) {
        if (w.substring(0, 1) != '*') {
          index = this.length;
        } else {
          w = w.substring(1);
        }
        this.push(w);
        this.map[w] = index;
      }
    })
  }
  indexOf(word) {
    return this.map[word];
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
    for (let i = 0; i < count; i++) {
      this.push(new SA.File.Action(raw));
    }
  }
  applyComments(raw) {
    this.forEach(action => action.comment = raw.next());
  }
  toString(file) {
    let a = [];
    this.forEach(action => a.push(action.toString(file)));
    return a.join("\n\n");
  }
}
SA.File.Action = class {
  /**
   * i auto (% occurs)
   * i continue (if a continuation of prior action)
   * i verb, noun (if neither of above)
   * s comment (optional)
   * Conds conds
   * Dos dos
   */
  constructor(raw) {
    let doargs = [];
    let r = raw.next();
    if (r <= 100) {
      if (r == 0) {
        this.continue = 1;
      } else {
        this.auto = r;
      }
    } else {
      this.verb = Math.floor(r / 150);
      this.noun = r % 150;
    }
    this.conds = new SA.File.Conds(raw, doargs);
    this.dos = new SA.File.Dos(raw, doargs);
  }
  toString(file) {
    let a = [], s;
    if (this.continue) {
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
   * Cond cond
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
    return this.argtype == 'B' ? text + arg : text + '(' + arg + ')';
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
    let s = '    ' + text + '(' + arg1;
    if (this.argct == 2) {
      s += ', ' + file.argText(this.arg2, this.argtype2);
    }
    s += ")";
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
    ['put','IR'],
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
    ['put2','IR'],
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
