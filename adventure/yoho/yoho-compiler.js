YOHO = window.YOHO || {};
//
YOHO.Compiler = class {
  //
  /*YC.Result*/load(raw) {
    YC.Errors = [];
    this.src = new YC.Source(raw);
    this.game = new YC.Game(this.src);     
    return new YC.Result(this.game);
  }
}
YC = YOHO.Compiler;
//
YC.Result = class {
  /**
   * YC.Error[] errors
   * YC.Error[] warnings
   * s bytecode
   */
  constructor(game) {
    this.errors = YC.Errors.filter(e => e.severity == 1);
    this.warnings = YC.Errors.filter(e => e.severity == 0);
    if (this.errors.length == 0) {
      this.bytecode = game.toString();
    }
  }
}
YC.Errors = [];
//
YC.Game = class {
  /**
   * About about
   * Wordlist wordlist
   * Rooms rooms
   * Items items
   * Commands commands
   */
  constructor(src) {
    this.about = new YC.About(src);
    this.wordlist = new YC.Wordlist(src);
    this.rooms = new YC.Rooms(src);
    this.items = new YC.Items(src, this.wordlist.nouns);
    this.commands = new YC.Commands(src, this.wordlist, this.rooms, this.items);
    this.checkBitCtrs();
  }
  toString() {
    let a = [];
    a.push(this.about.toString());
    a.push(this.wordlist.toString());
    a.push(this.rooms.toString());
    a.push(this.items.toString());    
    a.push(this.commands.toString());
    return a.join('\n');
  }
  //
  checkBitCtrs() {
    this.checkVars(1);
    this.checkVars(0);
  }
  checkVars(bits) {
    let s, vars;
    if (bits) {
      vars = this.commands.bits;
      s = 'b(';
    } else {
      vars = this.commands.ctrs;
      s = 'c(';
    }
    vars.anyNonGet(vars).forEach(bad => {
      YC.Errors.push(new YC.Warning('No condition references for ' + s + bad.id + ')', bad.line));
    })
    vars.anyNonSet(vars).forEach(bad => {
      YC.Errors.push(new YC.Warning('No action references for ' + s + bad.id + ')', bad.line));
    })    
  }
}
YC.Commands = class {
  /**
   * Vars bits, ctrs
   * Messages messages
   * Lines lines
   */
  constructor(src, wordlist, rooms, items) {
    this.wordlist = wordlist;
    this.rooms = rooms;
    this.items = items;
    this.bits = new YC.Vars();
    this.ctrs = new YC.Vars();
    let lines = src.linesCommands();
    this.messages = new YC.Messages(lines);
    this.lines = YC.Source.Lines.splitCommands(lines);
    this.tokenize();
  }
  tokenize() {
    this.lines.forEach(line => {
      if (line.indent == 0) {
        this.tokeCommand(line);
      } else if (line.colon) {
        this.tokeIfElse(line);
      } else {
        this.tokeThen(line);
      }
    })    
  }
  tokeCommand(line) {
    if (line.text == 'auto') {
      line.toke(1, 0, 0);
      return;
    }
    line.toke(line.vx.length);
    for (let i = 0; i < line.vx.length; i++) {
      line.toke(line.vx[i], line.nx[i]);
    }
  }
  tokeIfElse(line) {
    let t, conds;
    if (line.text.substring(0, 3) == 'if ') {
      t = 100 + line.indent;
      conds = line.text.substring(3).trim();
    } else if (line.text.substring(0, 7) == 'elseif ') {
      t = 200 + line.indent;
      conds = line.text.substring(7).trim();
    } else if (line.text.substring(0, 4) == 'else') {
      t = 300 + line.indent;
    }
    if (! t) {
      YC.Errors.push(new YC.Error('Expected if/else/elseif', line));
    }
    line.toke(t);
    if (t >= 200) {
      if (! line.prev || (line.prev.tokens[0] != 100 + line.indent && line.prev.tokens[0] != 200 + line.indent)) {
        YC.Errors.push(new YC.Error('Missing previous if/elseif statement', line));
      }
    }
    if (t < 300) {
      if (conds.length == 0) {
        YC.Errors.push(new YC.Error('Expected if condition', line));
      }
      let a = conds.split(' & ');
      line.toke(a.length);
      a.forEach(cond => this.tokeIfCond(line, cond.trim()));
    }
  }
  tokeIfCond(line, ifcond) {
    let bang = 1;
    if (ifcond.substring(0, 1) == '!') {
      bang = -1;
      ifcond = ifcond.substring(1).trim();
    }
    let x = this.explode(ifcond, line);
    let op, arg1 = 0, arg2 = 0, argct, nobang;
    switch (x.op) {
      case 'at':
        op = 1 * bang, argct = 1, arg1 = this.rooms.get(x.arg1, line)?.rx;
        break;
      case 'holds':
        if (arg1 == '*') {
          op = 2 * bang, argct = 1, arg1 = 0;
        } else {
          op = 3 * bang, argct = 1;
          arg1 = this.items.get(x.arg1, line)?.ix;
        }
        break;
      case 'here':
        op = 4 * bang, argct = 1, arg1 = this.items.get(x.arg1, line)?.ix;
        break;
      case 'with':
        op = 5 * bang, argct = 1, arg1 = this.items.get(x.arg1, line)?.ix;
        break;
      case 'inplay':
        op = 6 * bang, argct = 1, arg1 = this.items.get(x.arg1, line)?.ix;
        if (x.arg2) {
          argct = 2, arg2 = this.rooms.get(x.arg2, line)?.rx;
        }
        break;
      case 'dark':
        op = 7 * bang, argct = 0;
        break;
      case 'rnd':
        op = 8, argct = 1, nobang = 1;
        let val = Number.isInteger(+x.arg1) ? parseInt(x.arg1) : -1;
        if (val <= 0 || val > 100) {
          YC.Errors.push(new YC.Error.InvalidArg(line, x.arg1));
        }
        arg1 = val;
        break;
      case 'b':
        op = 9 * bang, argct = 1, arg1 = this.bits.fromCond(x.arg1, line);
        break;
      case 'c':
        argct = 2, nobang = 1, arg1 = this.ctrs.fromCond(x.arg1, line);
        let r2 = x.rest.substring(0, 2), r1 = x.rest.substring(0, 1), i;
        if (r2 == '>=') {
          op = 12;
        } else if (r2 == '<=') {
          op = -12;
        } else if (r2 == '!=') {
          op = -10;
        } else {
          switch (r1) {
            case '=':
              op = 10;
              break;
            case '>':
              op = 11;
              break;
            case '<':
              op = -11;
              break;
          }
        }
        i = (op == 12 || op == -12 || op == -10) ? x.rest.substring(2).trim() : x.rest.substring(1).trim();
        if (! Number.isInteger(+i)) {
          YC.Errors.push(new YC.Error.InvalidArg(line, i));
        }
        arg2 = i
        break;
      default:
        YC.Errors.push(new YC.Error('Unknown condition: ' + x.op, line));
    }
    if (argct == 0 && x.arg1 || argct == 1 && x.arg2) {
      YC.Errors.push(new YC.Error.TooManyArgs(line));
    }
    if (nobang && bang == -1) {
      YC.Errors.push(new YC.Error('Invalid bang operator (!)', line));
    }
    line.toke(op, arg1, arg2);
  }
  tokeThen(line) {
    let a = line.text.split('(');
    let op = a[0];
    switch (op) {
      case 'get':
      case 'forceget':
      case 'drop':
      case 'remove':
        break;
      default:
        this.tokeThenDo(line, line.text);
        return;
    }
    let args = a[1].split(')')[0].split(',');
    args.forEach(arg => this.tokeThenDo(line, op + '(' + arg.trim() + ')'));
  }
  tokeThenDo(line, action) {
    let x = this.explode(action, line);
    let op, arg1 = 0, arg2 = 0, argct;
    if (x.op.substring(0, 4) == 'say ') {
      x.arg1 = x.op.substring(4).trim();
      x.op = 'say';
    }    
    switch (x.op) {
      case 'say':
        op = 1, argct = 1, arg1 = x.arg1;
        break;
      case 'ok':
        op = 1, argct = 1, arg1 = 0;
        break;
      case 'sayc':
        op = 2, argct = 1, arg1 = this.ctrs.fromAction(x.arg1, line);
        break;
        case 'saynoun':
        op = 3, argct = 0;
        break;
      case 'cr':
        op = 4, argct = 0;
        break;
      case 'get':
        op = 5, argct = 1, arg1 = this.items.get(x.arg1, line)?.ix;
        break;
      case 'forceget':
        op = 5, argct = 2, arg1 = this.items.get(x.arg1, line)?.ix, arg2 = 1;
        break;
      case 'inventory':
        op = 6, argct = 1, arg1 = this.items.get(x.arg1, line)?.ix;
        break;
      case 'drop':
        op = 7, argct = 1, arg1 = this.items.get(x.arg1, line)?.ix;
        break;
      case 'remove':
        op = 8, argct = 2, arg1 = this.items.get(x.arg1, line)?.ix, arg2 = 0;
        break;
      case 'put':
        op = 8, argct = 2, arg1 = this.items.get(x.arg1, line)?.ix, arg2 = this.rooms.get(x.arg2, line)?.rx;
        break;
      case 'putwith':
        op = 9, argct = 2, arg1 = this.items.get(x.arg1, line)?.ix, arg2 = this.items.get(x.arg2, line)?.ix;
        break;
      case 'swap':
        op = 10, argct = 2, arg1 = this.items.get(x.arg1, line)?.ix, arg2 = this.items.get(x.arg2, line)?.ix;
        break;
      case 'go':
        op = 11, argct = 1, arg1 = this.rooms.get(x.arg1, line)?.rx;
        break;
      case 'gowith':
        op = 12, argct = 2, arg1 = this.items.get(x.arg1, line)?.ix, arg2 = this.rooms.get(x.arg2, line)?.rx;
        break;
      case 'saveloc':
        op = 13, argct = 1, arg1 = this.rooms.get(x.arg1, line)?.rx;
        break;
      case 'swaploc':
        op = 13, argct = 1, arg1 = 0;
        break;
      case 'light':
        op = 14, argct = 1, arg1 = x.arg1;
        if (arg1 != '0' && arg1 != '1') {
          YC.Errors.push(new YC.Error.InvalidArg(line, x.arg1));
        }
        break
      case 'recharge':
        op = 15, argct = 0;
        break;
      case 'wait':
        op = 16, argct = 1;
        arg1 = Number.isInteger(+x.arg1) ? parseInt(x.arg1) : 0;
        if (arg1 <= 0 || arg1 > 10) {
          YC.Errors.push(new YC.Error.InvalidArg(line, x.arg1));
        }
        break
      case 'b':
        argct = 1, arg1 = this.bits.fromAction(x.arg1, line);
        let a = x.rest.split('=');
        if (a.length != 2 || a[0] != '') {
          YC.Errors.push(new YC.Error.BadSyntax(line));
        }
        let val = a[1].trim();
        if (val != '0' && val != '1') {
          YC.Errors.push(new YC.Error.InvalidArg(line, val));
        } 
        op = val == '0' ? -17 : 17;
        break;
      case 'c':
        argct = 2, arg1 = this.ctrs.fromAction(x.arg1, line);
        let b = x.rest.split('=');
        let b1 = b[0].trim();
        if (b.length == 1) {
          switch (b1) {
            case '++':
              op = 19;
              arg2 = 1;
              break;
            case '--':
              op = -19;
              arg2 = 1;
              break;
            default:
              YC.Errors.push(new YC.Error.BadSyntax(line));
          }
        } else {
          let b2 = b[1].trim();
          arg2 = Number.isInteger(+b2) ? parseInt(b2) : null;
          if (arg2 == null) {
            YC.Errors.push(new YC.Error.BadSyntax(line));
          }
          switch (b1) {
            case '':
              op = 18;
              break;
            case '+':
              op = 19;
              break;
            case '-':
              op = -19;
              break;
            default:
              YC.Errors.push(new YC.Error.BadSyntax(line));
          }
        }
        break;
      case 'cls':
        op = 20, argct = 0;
        break;
      case 'die':
        op = 21, argct = 0;
        break;
      case 'gameover':
        op = 22, argct = 0;
        break;
      default:
        YC.Errors.push(new YC.Error('Unknown action: ' + x.op, line));
      }
    if (argct == 0 && x.arg1 || argct == 1 && x.arg2) {
      YC.Errors.push(new YC.Error.TooManyArgs(line));
    }
    let t = 400 + line.indent;
    line.toke(t, op, arg1, arg2);
  }
  explode(text, line) {
    let r = {op:null, arg1:null, arg2:null, rest:null};
    let a = text.split('(');
    if (a.length == 1) {
      r.op = text;
      return r;
    }
    if (a.length != 2) {
      YC.Errors.push(new YC.Error('Too many parentheses', line));
    }
    r.op = a[0].trim();
    let b = a[1].split(')');
    let args = b[0].split(',')
    if (b.length != 2 || args.length > 2) {
      YC.Errors.push(new YC.Error('Bad argument syntax', line));
    }
    r.arg1 = args[0].trim();
    r.arg2 = args.length == 2 ? args[1].trim() : null;
    r.rest = b[1].trim();
    return r;
  }
  get(a, id) {
    let x = a.indexOf(id);
    if (x == -1) {
      x = a.length;
      a.push(id);
    }
    return x;
  }
  toString() {
    let a = [], b = [];
    a.push(this.messages.join('\\'));
    this.lines.forEach(line => {
      if (line.indent == 0) {
        if (b.length) {
          a.push(b.join(' '));
        }
        b = [];
      }
      b.push(...line.tokens);
    })
    return a.join('\n');
  }
}
YC.Vars = class extends Array {
  //
  constructor() {
    super();
    this.map = {};
  }
  fromCond(id, line) {
    return this.from(id, line, 1, 0);
  }
  fromAction(id, line) {
    return this.from(id, line, 0, 1);
  }
  anyNonGet() {
    return this.filter(v => v.get == 0);
  }
  anyNonSet() {
    return this.filter(v => v.set == 0);
  }
  //
  from(id, line, get, set) {
    let v = this.map[id];
    if (! v) {
      v = new YC.Var(id, this.length + 1, line, get, set);
      this.push(v);
    } else {
      v.setGetSet(get, set);
    }
    return v.x;
  }
  push(v) {
    super.push(v);
    this.map[v.id] = v;
  }
}
YC.Var = class {
  //
  constructor(id, x, line, get, set) {
    this.id = id;
    this.x = x;
    this.line = line;
    this.get = get;
    this.set = set;
  }
  setGetSet(get, set) {
    if (get) {
      this.get = 1;
    } else {
      this.set = 1;
    }
  }
}
YC.Messages = class extends Array {
  //
  constructor(lines) {
    super('OK');
    lines.forEach(line => {
      let a = line.text.split('"');
      for (let i = 1; i < a.length; i+=2) {
        let mx = this.indexOf(a[i]);
        if (mx == -1) {
          mx = this.push(a[i]);
        }
        a[i] = mx;
      }
      line.text = a.join('');
    })
  }
  push(msg) {
    super.push(msg);
    return this.length - 1;
  }
}
YC.About = class {
  /**
   * s title
   * s author
   * s version
   * s date
   * i wordlen
   * i carrymax
   * i lightlen
   * i lightitem
   * i startroom
   * i treasureroom
   */
  constructor(src) {
    let lines = src.linesInSection('about');
    let sl = lines.parent;
    let o = this.toObj(lines);
    this.set(o, 'title', sl, '');
    this.set(o, 'author', sl, '');
    this.set(o, 'version', sl, '');
    this.set(o, 'date', sl, '');
    this.set(o, 'wordlen', sl);
    this.set(o, 'carrymax', sl);
    this.set(o, 'lightlen', sl, 0);
    console.log(this);
  }
  toString() {
    let a = [this.title, this.author, this.version, this.date, this.wordlen, this.carrymax, this.lightlen];
    return a.join('^');
  }
  //
  set(o, fid, line, df) {
    if (o[fid] == undefined) {
      if (df == undefined) {
        YC.Errors.push(new YC.Error('Missing value "' + fid + '"', line));
      } else {
        this[fid] = df;
      }
    } else {
      this[fid] = o[fid];
    }
  }
  toObj(lines) {
    let o = {};
    lines.forEach(line => line.toObj(o));
    return o;
  }
}
YC.Wordlist = class {
  /**
   * Words verbs
   * Words nouns
   */
  constructor(src) {
    this.verbs = new YC.Words();
    this.nouns = new YC.Words();
    this.parseSynonyms(src);
    this.parseCommands(src);
  }
  toString() {
    let a = [];
    a.push(this.verbs.toString());
    a.push(this.nouns.toString());
    return a.join('_');
  }
  //
  parseSynonyms(src) {
    this.parseSynLines(src.linesInSection('verbs', 0), this.verbs);
    this.parseSynLines(src.linesInSection('nouns', 0), this.nouns);
  }
  parseSynLines(lines, vn) {
    if (lines) {
      lines.forEach(line => {
        let a = line.text.toUpperCase().split(' ');
        vn.push(...a);
      })
    }
  }
  parseCommands(src) {
    let lines = src.linesOf('cmd(', 1);
    this.parseCmdLines(lines, this.verbs, 0);
    this.parseCmdLines(lines, this.nouns, 1);
  }
  parseCmdLines(lines, vn, x) {
    if (lines) {
      lines.forEach(line => {
        let a = (') ' + line.text + ' cmd(').split(') cmd(');
        a.forEach(s => {
          if (s) {
            let w = s.split(' ')[x], wx = 0;
            if (w) {
              wx = vn.index(w);
              if (wx == -1) {
                wx = vn.push(w);
              }
            }
            line[x == 0 ? 'vx' : 'nx'].push(wx);
          }
        })
      })
    }
  }
}
YC.Words = class extends Array {
  //
  constructor() {
    super();
    this._all = '';
  }
  push(...args) {
    super.push(...args);
    this._all += args.join('=') + '=';
    return this.length;
  }
  has(word) {
    return this._all.indexOf(word + '=') > -1;
  }
  index(word) {
    let x = -1, w = word + '=';
    for (let i = 0; i < this.length; i++) {
      if ((this[i] + '=').indexOf(w) > -1) {
        x = i + 1;
      }
    }
    return x;
  }
  toString() {
    return this.join('\\');
  }
}
YC.Rooms = class extends Array {
  /**
   * i rxStart 
   * i rxTreasure
   */
  constructor(src) {
    super();
    src.linesInSection('rooms');
    this.map = {};
    let lines = src.linesIn('rooms');
    lines.forEach(line => {
      let room = new YC.Room(line, this.length + 1);
      line.room = room;
      this.push(room);
      this.map[room.id] = room;
    })
    this.forEach(room => {
      let k = room.line.children;
      let exits = [0,0,0,0,0,0];      
      if (k.length && k[0].text == 'exits') {
        k = k[0].children[0];
        let dirs = k.toObj();
        for (let dir in dirs) {
          let room = this.get(dirs[dir], k);
          let i = 'NSEWUD'.indexOf(dir.toUpperCase().substring(0, 1));
          if (i == -1) {
            YC.Errors.push(new YC.Error("Unknown direction: " + dir, k));
          }
          exits[i] = room.rx;
        }
      }
      room.exits = exits;
    })
  }
  get(id, line) {
    let room = this.map[id];
    if (! room) {
      YC.Errors.push(new YC.Error.UnknownRoom(line, id));
    }
    return room;
  }
  toString() {
    let a = [];
    this.forEach(room => a.push(room.toString()));
    return a.join('\\');
  }
}
YC.Room = class {
  /**
   * i rx
   * s id
   * s desc
   * b start
   * b treasure
   * i[] exits
   */
  constructor(line, rx) {
    this.rx = rx;
    let a = line.text.split('"');
    if (a.length != 3) {
      YC.Errors.push(new YC.Error.BadFormat(line));
    }
    this.id = a[0].trim();
    this.desc = a[1];
    a[2] = a[2].trim();
    if (a[2] == 'start-room') {
      this.start = 1;
    }
    if (a[2] == 'treasure-room') {
      this.treasure = 1;
    }
    this.line = line;
  }
  toString() {
    return this.desc + '^' + this.exits.join('^');
  }
}
YC.Items = class extends Array {
  //
  constructor(src, nouns) {
    super();
    this.map = {};
    this.nouns = nouns;
    let lines;
    lines = src.linesInSection('inventory', 0,);
    lines.forEach(line => this.addItem(line, -1));
    lines = src.linesIn('out-of-play');
    lines.forEach(line => this.addItem(line, 0));
    lines = src.linesIn('items');
    lines.forEach(line => {
      if (line.parent.parent.room == undefined) {
        YC.Errors.push(new YC.Error('Room not defined for item', line));
      }
      this.addItem(line, line.parent.parent.room.rx);
    })
  }
  get(id, line) {
    let item = this.map[id];
    if (! item) {
      YC.Errors.push(new YC.Error.UnknownItem(line, id));
    }
    return item;
  }
  toString() {
    let a = [];
    this.forEach(item => a.push(item.toString()));
    return a.join('\\');
  }
  //
  addItem(line, rx) {
    let item = new YC.Item(line, this.length + 1, rx, this.nouns);
    line.item = item;
    this.map[item.id] = item;
    this.push(item);
  }
}
YC.Item = class {
  /**
   * i ix
   * s id
   * s desc
   * s noun
   * i nx
   * i rx
   */
  constructor(line, ix, rx, nouns) {
    this.ix = ix;
    this.rx = rx;
    let a = line.text.split('"');
    if (a.length != 3) {
      YC.Errors.push(new YC.Error.BadFormat(line));
    }
    this.id = a[0].trim();
    this.desc = a[1];
    a[2] = a[2].trim();
    let nx = '';
    if (a[2].length) {
      nx = nouns.index(a[2]);
      if (nx == -1) {
        nx = nouns.push(a[2]);
      }
    }
    this.nx = nx;
    this.line = line;
  }
  toString() {
    let a = [];
    a.push(this.desc);
    a.push(this.nx);
    a.push(this.rx);
    return a.join('^');
  }
}
YC.Source = class {
  /**
   * sections {name:lines[]} 
   */
  constructor(src) {
    let raw = src.split('\n');
    this.lines = [];
    raw.forEach((s, i) => this.add(s, i));
    this.sections = this.mapSections();
  }
  linesInSection(name, required = 1) {
    let lines = this.sections[name];
    if (lines == undefined && required) {
      YC.Errors.push(new YC.Error('Missing section: ' + name));
    }
    return lines || [];
  }
  linesIn(text) {
    let a = [];
    this.lines.forEach(line => {
      if (line.text == text) {
        a.push(...line.children);
      }
    })
    return a;
  }
  linesCommands() {
    let lines = this.linesOf('auto');
    lines.push(...this.linesOf('cmd(', 1));
    let all = [];
    lines.forEach(line => {
      let ind = line.indent;
      let ls = line.all();
      ls.forEach(l => l.adjIndent(-ind));
      all.push(...ls);
    })
    return all;
  }
  linesOf(text, startsWith = 0) {
    let a = [];
    this.lines.forEach(line => {
      if ((startsWith && line.startsWith(text)) || (line.text == text)) {
        a.push(line);
      }
    })
    return a;
  }
  //
  mapSections() {
    let sections = {}, name;
    this.lines.forEach(line => {
      if (line.indent == 0) {
        name = line.text;
        sections[name] = new YC.Source.Lines(line);
      } else {
        if (! name) {
          YC.Errors.push(new YC.Error.BadIndentation(line));
        }
        sections[name].push(line);
      }
    })
    for (let name in sections) {
      sections[name].buildTree();
    }
    return sections;
  }
  add(s, i) {
    let line = YC.Source.Line.create(s, i);
    line && this.lines.push(line);
  }
}
YC.Source.Lines = class extends Array {
  //
  constructor(line) {
    super();
    this.parent = line;
  }
  buildTree() {
    let parents = [], i = 1, last;
    this.forEach(line => {
      if (line.indent > i && last) {
        if ((line.indent - i) > 1) {
          YC.Errors.push(new YC.Error.BadIndentation(line));
        }
        parents[line.indent - 1] = last;
      }
      i = line.indent;
      line.parent = parents[i - 1] || this.parent;
      line.parent?.children.push(line);
      last = line;
    })
  }
  static splitCommands(lines) {
    let nlines = new YC.Source.Lines(new YC.Source.Line());
    lines.forEach(line => nlines.push(...line.split()));
    nlines.buildTree();
    nlines.parent.children.forEach(line => line.buildNextPrev());
    return nlines;
  }
}
YC.Source.Line = class {
  /**
   * s text
   * i indent
   * i srcix
   * Line parent
   * Line[] children
   * Line[] all (all descendents)
   * i[] tokens (for commands)
   * i[] vx, nx (for commands)
   * b colon (when found during split)
   */
  constructor(text, indent, srcix) {
    this.text = text;
    this.indent = indent;
    this.srcix = srcix;
    this.children = new YC.Source.Lines(this);
    this.tokens = [], this.vx = [], this.nx = [];
  }
  startsWith(text) {
    return this.text.substring(0, text.length) == text;
  }
  buildNextPrev() {
    const sibref = (line, ci) => {
      if (line.children.length) {
        sibref(line.children[0], 0);
      }
      let sibs = line.parent.children;
      if (ci >= sibs.length) {
        return;
      }
      if (ci > 0) {
        line.prev = sibs[ci - 1];
      }
      if (ci < sibs.length - 1) {
        ci++;
        line.next = sibs[ci];
        sibref(sibs[ci], ci);
      }
    }
    sibref(this);
  }
  all() {
    this.buildNextPrev();
    let a = [];
    const accum = (line, indent) => {
      a.push(line);
      if (line.children.length) {
        accum(line.children[0], indent);
      }
      if (line.indent > indent && line.next) {
        accum(line.next, indent);
      }
    }
    accum(this, this.indent);
    return a;
  }
  adjIndent(i) {
    this.indent += i;
  }
  toke(...args) {
    this.tokens.push(...args);
  }
  split() {
    let indent = this.indent;
    let a = this.text.split(':');
    let lines = [];
    if (a.length > 2) {
      YC.Errors.push(new YC.Error('Extraneous colon', this));
    }
    if (a.length == 2) {
      let line = new YC.Source.Line(a.shift().trim(), indent++, this.srcix);
      line.colon = 1;
      lines.push(line);
    } else {
      if (this.text.indexOf(';') == -1) {
        return [this];
      }
    }
    let s = a.shift().trim();
    if (s.length) {
      a = s.split(';');
      a.forEach(t => lines.push(new YC.Source.Line(t.trim(), indent, this.srcix)));
    }
    return lines;
  }
  toObj(o) {
    o = o || {};
    let a = (this.text + ' ').split(') ');
    a.forEach(s => {
      if (s) {
        let b = s.split('(');
        if (b.length != 2) {
          YC.Errors.push(new YC.Error('Invalid value: ' + s + ')', this));
        }
        o[b[0].trim()] = b[1].trim();
      }
    })
    return o;
  }
  //
  static create(s, srcix) {
    s = s.replaceAll('\t', '  ');
    s = s.split('//')[0].trimEnd();
    let st = s.trimStart();
    if (st.length) {
      return new this(st, Math.floor((s.length - st.length) / 2 + .5), srcix);
    }
  }
}
YC.Error = class extends Error {
  /**
   * s msg
   * Line line
   * i severity 0=warning, 1=error
   */
  constructor(msg, line, severity = 1) {
    super(msg);
    this.line = line;
    this.severity = severity;
  }
  toString() {
    let a = [];
    a.push(this.severity == 1 ? 'Error: ' : 'Warning: ');
    a.push(this.message);
    a.push(' @ line ' + this.line.srcix + ': ');
    a.push(this.line.text);
    return a.join('');
  }
}
YC.Warning = class extends YC.Error {
  constructor(msg, line) {
    super(msg, line, 0);
  }
}
YC.Error.BadFormat = class extends YC.Error {
  constructor(line) {
    super('Bad format', line);
  }
}
YC.Error.BadIndentation = class extends YC.Error {
  constructor(line) {
    super('Bad indentation', line);
  }
}
YC.Error.BadSyntax = class extends YC.Error {
  constructor(line) {
    super('Bad syntax', line);
  }
}
YC.Error.UnknownRoom = class extends YC.Error {
  constructor(line, id) {
    super('Undefined room: ' + id, line);
  }
}
YC.Error.UnknownItem = class extends YC.Error {
  constructor(line, id) {
    super('Undefined item: ' + id, line);
  }
}
YC.Error.TooManyArgs = class extends YC.Error {
  constructor(line) {
    super('Too many arguments', line);
  }
}
YC.Error.InvalidArg = class extends YC.Error {
  constructor(line, arg) {
    super('Invalid argument: ' + arg, line);
  }
}
