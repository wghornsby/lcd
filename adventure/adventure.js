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
   */
  //
  constructor(/*string*/data) {
    let raw = data.split('\n').map(v => {
      v = v.trim();
      if (v.substring(0, 1) == '"') {
        return v.substring(v.length - 1) == '"' ? v.substring(0, v.length - 1) : v;
      } else {
        return parseInt(v);
      }
    })
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
  }
  //
  extractWords(verbs, nouns, raw, count) {
    for (let i = 0; i < count; i++) {
      verbs.push(raw.shift());
      nouns.push(raw.shift());
    }
  }
}
SA.File.Header = class {
  //
  constructor(raw) {
    this._unk1 = raw.shift();
    this.items = raw.shift() + 1;
    this.actions = raw.shift() + 1;
    this.nounverbs = raw.shift() + 1;
    this.rooms = raw.shift() + 1;
    this.carrymax = raw.shift();
    this.startroom = raw.shift();
    this.treasures = raw.shift();
    this.wordlen = raw.shift();
    this.lightlen = raw.shift();
    this.messages = raw.shift() + 1;
    this.treasureroom = raw.shift();
    this._unk2 = raw.shift();
  }
}
SA.File.Items = class extends Array {
  //
  constructor(count, raw) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(new SA.File.Room(raw));
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
    let a = raw.shift().split('"');
    let t = a[1].split('/');
    this.text = t[0];
    this.noun = t[1];
    this.start = parseInt(a[2]);
  }
}
SA.File.Messages = class extends Array {
  //
  constructor(count, raw) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(raw);
    }
  }
}
SA.File.Rooms = class extends Array {
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
    let t = raw.shift();
    this.text = t.substring(0, 1) == '*' ? t.substring(1) : 'I am in a ' + t;
    this.exits = [];
    for (let i = 0; i < 6; i++) {
      this.exits.push(raw.shift());
    }
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
    super('');
    this.syn = {/*'word':index*/};
    list.forEach(w => {
      if (w.length) {
        if (w.substring(0, 1) != '*') {
          this.push(w);
        } else {
          w = w.substring(1);
        }
        this.syn[w] = this.length - 1;
      }
    })
  }
  indexOf(word) {
    return this.syn[word];
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
    raw.forEach((comment, i) => {
      this[i].comment = comment;
    })
  }
}
SA.File.Action = class {
  /**
   * i auto (% occurs)
   * i continue (if a continuation of prior action)
   * i verb, noun (if neither of above)
   * s comment (optional)
   */
  constructor(raw) {
    let doargs = [];
    let r = raw.shift();
    if (r <= 100) {
      if (r == 0) {
        this.continue = 1;
      } else {
        this.auto = r;
      }
    } else {
      this.verb = Math.floor(r, 150);
      this.noun = r % 150;
    }
    this.conds = new SA.File.Conds(raw, doargs);
    this.dos = new SA.File.Dos(raw, doargs);
  }
}
SA.File.Conds = class extends Array {
  //
  constructor(raw, doargs) {
    super();
    for (let i = 0; i < 5; i++) {
      let r = raw.shift();
      if (r) {
        let arg = Math.floor(r, 20);
        let cond = r % 20;
        if (cond == 0) {
          doargs.push(arg);
        } else {
          this.push(new SA.File.Cond(cond, arg));
        }
      }
    }
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
    ['ct <= ','#'],
    ['ct > ','#'],
    ['! moved',''],
    ['moved',''],
    ['ct = ','#']
  ]
}
SA.File.Dos = class extends Array {
  //
  constructor(raw, doargs) {
    super();
    for (let i = 0; i < 2; i++) {
      let r = raw.shift();
      if (r) {
        let dos = [Math.floor(r, 150)];
        let d = r % 150;
        d && dos.push(d);
        dos.forEach(action => this.push(new SA.File.Do(action, doargs)));
      }
    }
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
      return;
    } 
    this.arg1 = doargs.shift();
    this.argtype1 = at[0];
    if (this.argct == 2) {
      this.arg2 = doargs.shift();
      this.argtype2 = at[1];
    }
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
    ['kill','I'],
    ['dark',''],
    ['! dark',''],
    ['set','B'],
    ['kill2','I'],
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
    ['ct--',''],
    ['sayct',''],
    ['ct = ','#'],
    ['swaploc',''],
    ['swapct','C'],
    ['ct += ','#'],
    ['ct -= ','#'],
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