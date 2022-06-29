YOHO = window.YOHO || {};
//
YOHO.Compiler = class {
  //
  load(raw) {
    this.src = new YC.Source(raw);
    this.game = new YC.Game(this.src);
    console.log(this.game.toString());
  }
}
YC = YOHO.Compiler;
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
  }
  toString() {
    let a = [];
    a.push(this.about.toString());
    a.push(this.wordlist.toString());
    a.push(this.rooms.toString());
    a.push(this.items.toString());    
    // todo
    return a.join('\n');
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
        throw new YC.Error('Missing value "' + fid + '"', line);
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
    return a.join('\n');
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
            line[x == 0 ? 'vx' : 'nx'] = wx;
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
          let room = this.get(dirs[dir]);
          if (! room) {
            throw new YC.Error("Unknown room: "  + dirs[dir], k);
          }
          let i = 'NSEWUD'.indexOf(dir.toUpperCase().substring(0, 1));
          if (i == -1) {
            throw new YC.Error("Unknown direction: " + dir, k);
          }
          exits[i] = room.rx;
        }
      }
      room.exits = exits;
    })
  }
  get(id) {
    return this.map[id];
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
      throw new YC.Error.BadFormat(line);
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
    this.nouns = nouns;
    let lines;
    lines = src.linesInSection('inventory', 0,);
    lines.forEach(line => this.addItem(line, -1));
    lines = src.linesIn('out-of-play');
    lines.forEach(line => this.addItem(line, 0));
    lines = src.linesIn('items');
    lines.forEach(line => {
      if (line.parent.parent.room == undefined) {
        throw new YC.Error('Room not defined for item', line);
      }
      this.addItem(line, line.parent.parent.room.rx);
    })
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
      throw new YC.Error.BadFormat(line);
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
YC.Commands = class {
  /**
   * Messages messages
   * Commands commands
   */
  constructor(src, wordlist, rooms, items) {
    let lines = src.linesCommands();
    this.messages = new YC.Messages(lines);
    lines = YC.Source.Lines.splitCommands(lines);
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
      throw new YC.Error('Missing section: ' + name);
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
      let ind = line.indent - 1;
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
          throw new YC.Error.BadIndentation(line);
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
    let parents = [this.parent], i = 1, last;
    this.forEach(line => {
      if (line.indent > i) {
        if ((line.indent - i) > 1) {
          throw new YC.Error.BadIndentation(line);
        }
        parents[line.indent - 1] = last;
      } else if (line.indent == i) {
        if (last) {
          last.next = line;
        }
      }
      i = line.indent;
      line.parent = parents[i - 1];
      line.parent?.children.push(line);
      last = line;
    })
  }
  static splitCommands(lines) {
    let nlines = new YC.Source.Lines(new YC.Source.Line());
    lines.forEach(line => nlines.push(...line.split()));
    nlines.buildTree();
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
   * i vx, nx (for commands)
   * b colon (when found during split)
   */
  constructor(text, indent, srcix) {
    this.text = text;
    this.indent = indent;
    this.srcix = srcix;
    this.children = new YC.Source.Lines(this);
  }
  startsWith(text) {
    return this.text.substring(0, text.length) == text;
  }
  all() {
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
  split() {
    let indent = this.indent;
    let a = this.text.split(':');
    let lines = [];
    if (a.length > 2) {
      throw new YC.Error('Extraneous colon', this);
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
          throw new YC.Error('Invalid value: ' + s + ')', this);
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
  //
  constructor(msg, line) {
    super(msg);
    this.line = line;
  }
}
YC.Error.BadFormat = class extends YC.Error {
  //
  constructor(line) {
    super('Bad format', line);
  }
}
YC.Error.BadIndentation = class extends YC.Error {
  //
  constructor(line) {
    super('Bad indentation', line);
  }
}