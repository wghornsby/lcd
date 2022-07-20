/** YOHO UI */
YOHO = window.YOHO || {}, YU = YOHO.UI = {};
//
YU.Page$ = class extends Obj {
  /**
   * YC.Compiler compiler
   * YC.Result result
   */
  constructor() {
    super();
    this.compiler = new YC.Compiler();
    this.output$ = new YU.Output$();
    this.editor$ = new YU.Editor$();
    this.items$ = new YU.Items$();
    this.load(src());
  }
  load(raw) {
    this.result = this.compiler.load(raw);
    this.output$.log(this.result.message);
    this.editor$.load(raw);
    this.items$.load(this.compiler.game);
  }
}
YU.Items$ = class extends Obj {
  //
  constructor() {
    super();
    this.$items = $('#items');
    this.reset();
  }  
  reset() {
    this.$items.innerHTML = '';
  }
  load(game) {
    this.game = game;
    this.items = new YU.ItemRooms(game);
    this.draw();
  }
  draw() {
    this.reset();
    this.$items.innerHTML = this.items.html();
  }
}
YU.ItemRooms = class extends Array {
  //
  constructor(game) {
    super();
    this.game = game;
    game.items.forEach(item => {
      if (item.id) {
        this.push(new YU.ItemRoom(item, this.rid(item)));
      }
    })
    this.sort(0, 1);
  }
  sort(ir/*0=item,1=room*/, dir/*1=asc,-1=desc*/) {
    let f1 = ir ? 'rid' : 'iid';
    let f2 = ir ? 'iid' : 'rid';
    super.sort((a, b) => {
      if (a[f1] > b[f1]) {
        return dir;
      }
      if (a[f1] < b[f1]) {
        return -dir;
      }
      return a[f2] > b[f2] ? dir : -dir;
    })
  }
  html() {
    let h = [];
    this.forEach(ir => h.push(ir.html()));
    return h.join('');
  }
  rid(item) {
    switch (item.rx) {
      case -1:
        return '< inventory >';
      case 0:
        return '{ out-of-play }';
      default:
        return this.game.rooms.getByRx(item.rx).id;
    }
  }
}
YU.ItemRoom = class extends Obj {
  /**
   * Item item
   * s iid
   * s rid
   */
  constructor(item, rid) {
    super();
    this.item = item;
    this.iid = item.id;
    this.rid = rid;
    this.oop = item.rx == 0;
  }
  html() {
    let h = [];
    let hi = this.span(this.iid, this.oop ? 'ioop' : 'item');
    let hr = this.span(this.rid, this.oop ? 'roop' : 'room');
    h.push('<div>', hi, hr, '</div>');
    return h.join('');
  }
  span(id, cls) {
    return '<span class="' + cls + '">' + id + '</span>';
  }  
}
YU.Output$ = class extends Obj {
  //
  constructor() {
    super();
    this.$out = $('#output');
    this.reset();
  }
  reset() {
    this.$out.innerHTML = '';
  }
  log(text) {
    this.$out.innerHTML += this.$out.innerHTML.length ? '<br>' + text : text;
  }
}
YU.Editor$ = class extends Obj {
  /**
   * YU.Source src
   */
  constructor() {
    super();
    this.$edit = $('#editor')
      .on('input', () => this.oninput())
      .on('keydown', e => this.onkeydown(e))
      //.on('keyup', e => this.onkeyup(e))
    this.reset();
  }
  load(raw) {
    this.src = new YU.Source(raw);
    this.reset(this.src.html());
  }
  //
  reset(html) {
    if (html) {
      this.$edit.innerHTML = html;
      this.src.lines.forEach((line, i) => {
        this.$edit.children[i].line = line;
      })
    } else {
      this.$edit.innerHTML = '<div class="t0"><br></div>';
    } 
    this.setRange(this.$edit.firstElementChild);
    this.log();
  }
  oninput() {
    let h = this.$edit.innerHTML;
    if (h == '' || h == '<br>') {
      this.reset();
    } else {
      let n = this.line();
      let offset = this.getCursorOffset(n);
      let line = n.line;
      if (line) {
        n.innerHTML = line.setText(n.innerText).innerHtml();
        this.setCursor(n, offset);
      }
    }
    this.log();
  }
  onkeydown(e) {    
    if (e.keyCode == 9) {
      this.setTab(this.line(), e.shiftKey ? -1 : 1);
      e.preventDefault();
      return;
    }
    if (e.keyCode == 8) {
      let div = this.line();
      if (this.getCursorOffset(div) == 0 && this.getTab(div) > 0) {
        this.setTab(div, -1);
        e.preventDefault();
        return;
      }
    }    
  }
  reformat(n) {
    let offset = this.getCursorOffset(this.$edit);
    this.src = new YU.Source(this.text());
    this.$edit.innerHTML = this.src.html();
    this.setCursor(this.$edit, offset);
  }
  text() {
    let a = [];
    for (let i = 0, j = this.$edit.children.length; i < j; i++) {
      let n = this.$edit.children[i], t = '';
      if (n.innerText != '\n') {
        t = '  '.repeat(this.getTab(n)) + n.innerText;
      }
      a.push(t);
    }
    return a.join('\n');
  }
  line() {
    let node = window.getSelection().anchorNode;
    while (node.tagName != 'DIV') {
      node = node.parentElement;
    }
    return node;
  }
  setRange(node, offset = 0) {
    let sel = window.getSelection();
    let range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  setTab(div, offset) {
    if (div) {
      let tab = this.getTab(div) + offset;
      div.className = 't' + ((tab > 0) ? tab : 0); 
      this.log();
    }
  }
  setCursor(node, offset, cp = 0) {
    if (! node) {
      return;
    }
    const go = (node, n, offset) => n ? this.setCursor(n, offset) : this.setCursor(node.parentElement, offset, 1);
    if (node.nodeType == 1) {
      if (cp) {
        return go(node, node.nextSibling, offset);
      } else {
        return go(node, node.firstChild, offset);
      }
    }
    if (node.nodeType == 3) {
      let len = node.textContent.length;
      if (offset > len) {
        offset -= len;
        return go(node, node.nextSibling, offset);
      }
      this.setRange(node, offset);
    }
  }
  getTab(div) {
    if (div && div.className) {
      return +div.className.substring(1);
    } else {
      return 0;
    }
  }
  getCursorOffset(node, range, offset = 0, cp = 0) {
    if (! node) {
      node = this.line();
    }
    if (! range) {
      range = window.getSelection().getRangeAt(0);
    }
    if (node == range.startContainer) {
      return offset + range.startOffset;
    }
    if (node.nodeType == 1) {
      let next;
      if (! cp) {
        next = node.firstChild, cp = 0;
      }
      if (! next) {
        next = node.nextSibling, cp = 0;
      }
      if (! next) {
        next = node.parentElement, cp = 1;
      }
      return next ? this.getCursorOffset(next, range, offset, cp) : null;
    }
    if (node.nodeType == 3) {
      offset += node.textContent.length;
      if (node.nextSibling) {
        return this.getCursorOffset(node.nextSibling, range, offset);
      } else if (node.parentElement) {
        return this.getCursorOffset(node.parentElement, range, offset, 1);
      }
    }
  }
  log() {
    //$('#output').innerText = editor.innerHTML;
  }
}
YU.Source = class {
  /**
   * Line[] lines
   */
  constructor(raw) {
    let rawlines = raw.split('\n');
    this.lines = [];
    let section, ri;
    rawlines.forEach((s, i) => {
      let line = new YU.Source.Line(s, i);
      if (line.sx) {
        section = line;
      } else {
        line.section = section;
      }
      if (line.isRoom()) {
        if (line.indent == 2) {
          ri = line.text == 'items' || line.text == 'out-of-play';
        } else {
          if (ri) {
            line.ri = ri;
          }
        }
      }
      this.lines.push(line);
    })
  }
  html() {
    let a = [];
    this.lines.forEach(line => a.push(line.html()));
    return a.join('');
  }
}
YU.Source.Line = class {
  /**
   * s text
   * i indent
   * i x
   * i sx (section index)
   * Line section
   * b ri (room item)
   */
  constructor(s, x) {
    s = s.replaceAll('\t', '  ').trimEnd();
    this.text = s.trimStart();
    this.indent = Math.floor((s.length - this.text.length) / 2 + .5);
    this.x = x;
    this.sx = this.isSection();
  }
  setText(s) {
    this.text = s;
    return this;
  }
  html() {
    return '<div class="t' + this.indent + '">' + this.innerHtml() + '</div>';
  }
  innerHtml() {
    let t = this.text;
    let comment = '';
    if (t.trim()) {
      let a = t.split('//');
      if (a.length > 1) {
        t = a.shift();
        comment = '<comment>//' + a.join('//') + '</comment>';
      }
      if (this.sx) {
        t = '<section>' + t + '</section>';
      } else {
        switch (this.section?.sx) {
          case 1:
            t = this.htmlAbout(t);
            break;
          case 2: 
          case 3:
            t = this.htmlWords(t);
            break;
          case 4:
            t = this.htmlItem(t);
            break;
          case 5:
          case 7:
            t = this.htmlAction(t);
            break;
          case 6:
            t = this.htmlRoom(t);
            break;
        }
      }
    }
    t += comment;
    return t || '<br>';
  }
  //
  htmlRoom(t) {
    if (this.indent == 1) {
      let a = t.split('"');
      a[0] = a[0].tag('room');
      if (a.length > 1) {
        a[1] = a[1].tag('rdesc');
      }
      if (a.length > 2) {
        a[2] = a[2].tag('cmd');
      }
      return a.join('"');        
    }
    if (t == 'exits') {
      return t.tag('exits');
    }
    if (t == 'items' || t == 'out-of-play') {
      return t.tag('items');
    }
    if (this.ri) {
      return this.htmlItem(t);
    } else {
      return this.htmlAction(t);
    }
  }
  htmlAction(t) {
    if (t == 'auto') {
      return t.tag('auto');
    }
    if (t.substring(0, 4) == 'cmd(') {
      return this.htmlCmd(t);
    }
    let q = t.split('"'), o = [];
    for (let qi = 0; qi < q.length; qi++) {
      if (qi % 2 == 0) {
        let qw = q[qi].replaceAll(', ', ',~');
        let a = qw.split(' ');
        a.forEach((w, i) => {
          a[i] = this.htmlActionWord(w);
        })
        o.push(a.join(' ').replaceAll('~', ' '));
      } else {
        o.push(q[qi].tag('string'));
      }
    }
    return o.join('"');
  }
  htmlActionWord(w) {
    if (w == '') {
      return w;
    }
    if (w == 'if' || w == 'elseif' || w == 'else:') {
      return w.tag('if');
    }
    let semi = '';
    if (w.slice(-1) == ':' || w.slice(-1) == ';') {
      semi = w.slice(-1).tag('semi');
      w = w.slice(0, -1);
    }
    if (w == 'say' || w == 'ok' || w == 'saynoun' || w == 'cr' || w == 'inventory' || w == 'swaploc' || w == 'recharge' || w == 'cls' || w == 'die' || w == 'gameover') {
      return w.tag('method') + semi;
    }
    //
    let bang = '';
    if (w.substring(0, 1) == '!') {
      bang = '!'.tag('bang');
      w = w.substring(1);
    }
    let a = w.split(')');
    if (a.length > 1) {
      let b = a[0].split('(');
      if (b.length == 2) {
        b[1] = this.htmlArg(b[1], b[0]);
        b[0] = b[0].tag('method');
      }
      a[0] = b.join('(');
      w = a.join(')');
    }
    return bang + w + semi;
  }
  htmlArg(arg, m) {
    let args = arg.split(','), tag = 'arg', tag2;
    switch (m) {
      case 'n': case 's': case 'e': case 'w': case 'u': case'd':
      case 'at':
      case 'go':
      case 'saveloc':
        tag = 'room';
        break;
      case 'holds':
      case 'here':
      case 'with':
      case 'get':
      case 'forceget':
      case 'drop':
      case 'remove':
      case 'gowith':
      case 'putwith':
      case 'swap':
        tag = 'item';
        break;
      case 'inplay':
      case 'put':
        tag = 'item';
        tag2 = 'room'
        break;
      case 'rnd':
        tag = null;
      break;
    }
    args.forEach((a, i) => {
      if (i == 1 && tag2) {
        args[i] = args[i].tag(tag2);
      } else if (tag) {
        args[i] = args[i].tag(tag);
      }
    })
    return args.join(',');
  }
  htmlCmd(t) {
    let o = [];
    let a = (t + ' ').split(') ');
    a.forEach(s => {
      let b = s.split('(');
      if (b.length == 1) {
        o.push(s);
      } else {
        b[0] = b[0].tag('cmd');
        b[1] = b[1].tag('word');
        o.push(b.join('(') + ') ');
      }
    })
    return o.join('');
  }
  htmlItem(t) {
    let a = t.split('"');
    a[0] = a[0].tag('item');
    if (a.length > 1) {
      a[1] = a[1].tag('idesc');
    }
    if (a.length > 2) {
      a[2] = a[2].tag('word');
    }
    return a.join('"');
  }
  htmlWords(t) {
    let o = [];
    let a = t.split(' ');
    a.forEach(s => {
      let b = s.split('=');
      for (let i = 0; i < b.length; i++) {
        b[i] = b[i].tag('word');
      }
      o.push(b.join('='));
    })
    return o.join(' ');
  }
  htmlAbout(t) {
    let o = [];
    let a = (t + ' ').split(') ');
    a.forEach(s => {
      let b = s.split('(');
      if (b.length == 1) {
        o.push(s);
      } else {
        let k = b[0].trim();
        if (YU.Source.Line.ABOUTS.indexOf(k) >= 0) {
          b[0] = b[0].replace(k, '<about>' + k + '</about>(');
        }
        b[1] = '<string>' + b[1] + '</string>';
        o.push(b.join('') + ') ');
      }
    })
    return o.join('');
  }
  isSection() {
    if (this.indent == 0) {
      let i = YU.Source.Line.SECTIONS.indexOf(this.text.trim());
      if (i > 0) {
        return i;
      }
    }
  }
  isRoom() {
    return this.section?.sx == 6;
  }
  static SECTIONS = ['','about','verbs','nouns','inventory','autos','rooms','commands'];
  static ABOUTS = ['title','author','version','date','wordlen','carrymax','lightlen'];
}
String.prototype.tag = function(t) {return this.trim() ? '<' + t + '>' + this + '</' + t + '>' : this;}