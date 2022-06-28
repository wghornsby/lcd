YOHO = window.YOHO || {};
//
YOHO.Compiler = class {
  //
  load(raw) {
    this.src = new YOHO.Compiler.Source(raw);
    this.game = new YOHO.Compiler.Game(this.src);
  }
}
YOHO.Compiler.Game = class {
  /**
   * About about
   * Wordlist verbs
   * Wordlist nouns
   * Items items
   * Rooms rooms
   * Commands commands
   */
  constructor(src) {
    this.about = new YOHO.Compiler.About(src.linesOfSection('about'));
  }
}
YOHO.Compiler.About = class {
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
  constructor(lines) {
    let o = this.toObj(lines);
    let sl = lines.parent;
    this.set(o, 'title', sl, '');
    this.set(o, 'author', sl, '');
    this.set(o, 'version', sl, '');
    this.set(o, 'date', sl, '');
    this.set(o, 'wordlen', sl);
    this.set(o, 'carrymax', sl);
    this.set(o, 'lightlen', sl, 0);
    console.log(this);
  }
  set(o, fid, line, df) {
    if (o[fid] == undefined) {
      if (df == undefined) {
        throw new YOHO.Compiler.Error('Missing value "' + fid + '"', line);
      } else {
        this[fid] = df;
      }
    } else {
      this[fid] = o[fid];
    }
  }
  toObj(lines) {
    let o = {};
    lines.forEach(line => {
      let a = (line.text + ' ').split(') ');
      a.forEach(s => {
        if (s) {
          let b = s.split('(');
          if (b.length != 2) {
            throw new YOHO.Compiler.Error('Invalid value: ' + s + ')', line);
          }
          o[b[0].trim()] = b[1].trim();
        }
      })
    })
    return o;
  }
}
YOHO.Compiler.Wordlist = class extends Array {
  //
}
YOHO.Compiler.Items = class extends Array {
  //
}
YOHO.Compiler.Item = class {
  /**
   * s id
   * s desc
   * s noun
   */
}
YOHO.Compiler.Rooms = class extends Array {
  //
}
YOHO.Compiler.Room = class {
  /**
   * s id
   * s desc
   * i[] exits
   */
}
YOHO.Compiler.Source = class {
  /**
   * sections {name:lines[]} 
   */
  constructor(src) {
    let raw = src.split('\n');
    this.lines = [];
    raw.forEach((s, i) => this.add(s, i));
    this.sections = this.mapSections();
  }
  linesOfSection(name) {
    let lines = this.sections[name];
    if (lines == undefined) {
      throw new YOHO.Compiler.Error('Missing section: ' + name);
    }
    return lines;
  }
  linesOf(text) {
    let a = [];
    this.lines.forEach(line => {
      if (line.text == text) {
        a = a.concat(line.children);
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
        sections[name] = new YOHO.Compiler.Source.Lines(line);
      } else {
        if (! name) {
          throw new YOHO.Compiler.Error.BadIndentation(line);
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
    let line = YOHO.Compiler.Source.Line.create(s, i);
    line && this.lines.push(line);
  }
}
YOHO.Compiler.Source.Lines = class extends Array {
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
          throw new YOHO.Compiler.Error.BadIndentation(line);
        }
        parents[line.indent - 1] = last;
      }
      i = line.indent;
      line.parent = parents[i - 1];
      line.parent.children.push(line);
      last = line;
    })
  }
}
YOHO.Compiler.Source.Line = class {
  /**
   * s text
   * i indent
   * i srcix
   * Line parent
   * Line[] children
   */
  constructor(text, spaces, srcix) {
    this.text = text;
    this.indent = Math.floor(spaces / 2 + .5);
    this.srcix = srcix;
    this.children = new YOHO.Compiler.Source.Lines(this);
  }
  //
  static create(s, srcix) {
    s = s.replaceAll('\t', '  ');
    s = s.split('//')[0].trimEnd();
    let st = s.trimStart();
    if (st.length) {
      return new this(st, s.length - st.length, srcix);
    }
  }
}
YOHO.Compiler.Error = class extends Error {
  //
  constructor(msg, line) {
    super(msg);
    this.line = line;
  }
}
YOHO.Compiler.Error.BadIndentation = class extends YOHO.Compiler.Error {
  //
  constructor(line) {
    super('Bad indentation', line);
  }
}