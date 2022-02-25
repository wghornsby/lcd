class Theme extends Obj {
  /**
   * i id
   * i uid
   * s title
   * s desc
   * i width, height
   * i symmetry
   * i minWordLen
   * i targetDay (1=Sun,..7=Sat)
   * i cids[]
   * i cid (when finalized)
   * Crossword crossword (currently editing)
   */
  constructor(id, title, desc, width, height, symmetry, minWordLen, targetDay, cids, cix, crossword) {
    super();
    this.id = id;
    this.uid = MyUser.id;
    this.setTitle(title);
    this.desc = desc || '';
    this.width = width || 15;
    this.height = height || 15;
    this.symmetry = symmetry || Board.SYMMETRY.ROTATIONAL;
    this.minWordLen = minWordLen = 3;
    this.targetDay = targetDay || 0;
    this.cids = cids || [];
    this.cix = cix;
    crossword && this.setCrossword(crossword);
    MyClient
      .on('error', (msg) => alert(msg))
      .on('expired', () => alert('expired'));
  }
  async save(o = null) {
    if (o) {
      Object.assign(this, o);
      this.crossword.board.minWordLen = o.minWordLen;
      this.crossword.board.symmetry = o.symmetry;
    } else {
      var cid = this.crossword.id;
      await this.crossword.save();
      if (! cid) {
        this.cids.unshift(this.crossword.id);
      }
    }
    this.id = (await MyClient.saveTheme(this.toPojo())).id;
    Editing.save(this.id);
  }
  setTitle(title) {
    this.title = title || 'Untitled';
  }
  setCrossword(crossword) {
    this.crossword = crossword
      .on('update', () => this.save());
  }
  async setVersion(cix) {
    var crossword = await MyClient.getCrossword(this.cids[cix]);
    this.cix = cix;
    this.setCrossword(Crossword.fromPojo(crossword, this.symmetry, this.minWordLen));
    await this.save({});
  }
  newCrossword() {
    this.setCrossword(Crossword.asNew(this.width, this.height, this.symmetry, this.minWordLen));
  }
  toPojo() {
    var o = pojo(this);
    delete o.crossword;
    return o;
  }
  //
  static async fetch(id) {
    var o = await MyClient.getTheme(id);
    var cix = o.cix || 0;
    o.crossword = await MyClient.getCrossword(o.cids[cix]);
    return this.fromPojo(o);
  }
  static fromPojo(o) {
    return new this(o.id, o.title, o.desc, o.width, o.height, o.symmetry, o.minWordLen, o.targetDay, o.cids, o.cix, 
      Crossword.fromPojo(o.crossword, o.symmetry, o.minWordLen));
  }
  static asNew(title, desc, width, height, symmetry, minWordLen, targetDay) {
    return (new this(null, title, desc, width, height, symmetry, minWordLen, targetDay)).newCrossword();
  }
}
class Crossword extends Obj {
  onupdate() {}
  /**
   * i id
   * i uid
   * Board board
   */
  constructor(id, board) {
    super();
    this.id = id;
    this.uid = MyUser.id;
    this.board = board
      .on('update', () => this.onupdate());
  }
  async save() {
    this.id = (await MyClient.saveCrossword(this.toPojo())).id;
  }
  toPojo() {
    return pojo(this);
  }
  //
  static async fetchMyLast() {
    var o = await MyClient.getMyLastCrossword();
    return o ? this.fromPojo(o) : this.asNew();
  }
  static async fetch(id) {
    var o = await MyClient.getCrossword(id);
    return this.fromPojo(o);
  }
  static asNew(width, height, symmetry, minWordLen) {
    return new this(null, Board.asNew(width, height, symmetry, minWordLen));
  }
  static fromPojo(o, symmetry, minWordLen) {
    o.board.symmetry = symmetry;
    o.board.minWordLen = minWordLen;
    return new this(o.id, Board.fromPojo(o.board));
  }
}
class Board extends Obj {
  onupdate() {}
  /**
   * i width, height
   * i symmetry
   * i minWordLen
   * Cursor cursor
   * Cell[][] cells
   */
  constructor(width = 15, height = 15, symmetry = Board.SYMMETRY.ROTATIONAL, minWordLen = 3) {
    super();
    this.width = width;
    this.height = height;
    this.symmetry = symmetry;
    this.minWordLen = minWordLen;
    this.cursor = new Board.Cursor(this.width, this.height);
    this.cells = Board.Cells.create(this.width, this.height);
    this.mx = this.width - 1;
    this.my = this.height - 1;
  }
  set(text, refresh = 1) {
    this.setCell(this.cursor.x, this.cursor.y, text);
    this.cursor.advance();
    refresh && this.refresh(1);
  }
  clear(hard) {
    this.getSel().forEach(cell => {
      cell.set();
      if (hard) {
        if (cell.isBlack()) {
          this.toggleCell(cell);
        } else if (cell.isCircle()) {
          cell.toggleCircle();
        }
      }
    })
    this.cursor.resetSel();
    this.refresh(1);
  }
  backspace() {
    var del = this.hasText();
    if (del) {
      this.setCell(this.cursor.x, this.cursor.y, null);
    }
    this.cursor.retreat();
    if (! del) {
      this.setCell(this.cursor.x, this.cursor.y, null);
    }
    this.refresh(1);
  }
  goUp(shift) {
    this.cursor.move(0, -1, shift);
    this.refresh();
  }
  goDown(shift) {
    this.cursor.move(0, 1, shift);
    this.refresh();
  }
  goLeft(shift) {
    this.cursor.move(-1, 0, shift);
    this.refresh();
  }
  goRight(shift) {
    this.cursor.move(1, 0, shift);
    this.refresh();
  }
  goHome(shift) {
    this.cursor.moveHome(shift);
    this.refresh();
  }
  goEnd(shift) {
    this.cursor.moveEnd(shift);
    this.refresh();
  }
  goSym() {
    var sym = this.getSym(this.cursor.x, this.cursor.y);
    this.cursor.moveTo(sym.x, sym.y);
    this.refresh();
  }
  toggle() {
    this.getSel().forEach(cell => this.toggleCell(cell));
    this.cursor.advance();
    this.refresh(1);
  }
  toggleCircle() {
    this.getSel().forEach(cell => cell.toggleCircle());
    this.cursor.advance();
    this.refresh(1);
  }
  toggleLock() {
    this.getSel().forEach(cell => cell.toggleLock());
    this.cursor.resetSel();
    this.refresh(1);
  }
  toggleCursor() {
    this.cursor.toggle();
    this.refresh();
  }
  selAll() {
    this.cursor.selAll();
    this.refresh();
  }
  selWord() {
    var line = this.cells.line(this.cursor.x, this.cursor.y, this.cursor.dir);
    var word = line.getWord(this.cursor.x, this.cursor.y);
    if (word) {
      this.cursor.selCells(word);
      this.refresh();
      return word;
    }
  }
  moveTo(x, y) {
    this.cursor.moveTo(x, y);
    this.refresh();
  }
  forEach(fn/*(row, y)*/) {
    this.cells.forEach(fn);
  }
  all(fn/*(cell, x, y)*/) {
    this.cells.all(fn);
  }
  undo() {
    this._actions.undo();
  }
  redo() {
    this._actions.redo();
  }
  setSelText(text) {
    if (text.length) {
      var cell = this.getSel()[0];
      this.cursor.resetSel().moveTo(cell.x, cell.y);
      for (var i = 0, j = 0; i < text.length; i++) {
        if (this.cursor.atMax()) {
          j++;
          if (j == 2) {
            break;
          }
        }
        this.set(text[i] == '?' ? '' : text[i], 0);
      }
      this.refresh(1);
    }
  }
  getSelText() {
    var s = '';
    this.getSel().forEach(cell => {s += cell.text ? cell.text : '?'});
    return s;
  }
  //
  hasText() {
    return this.getCell(this.cursor.x, this.cursor.y).text?.length;
  }
  refresh(save) {
    this.cells.refresh(this.cursor, this.minWordLen);
    if (save) {
      this._actions.save();
      this.onupdate();
    }
  }
  /*Cell*/getCell(x, y) {
    return this.cells.get(x, y);
  }
  /*Cells*/getSel() {
    return this.cells.fromCursor(this.cursor);
  }
  setCell(x, y, text) {
    this.getCell(x, y).set(text);
  }
  toggleCell(cell) {
    var sym = this.getSym(cell.x, cell.y);
    cell.toggle();
    if (sym && ! sym.equals(cell)) {
      sym.toggle();
    }
  }
  /*Cell*/getSym(x, y) {
    switch (this.symmetry) {
      case Board.SYMMETRY.ROTATIONAL:
        return this.getCell(this.mx - x, this.my - y);
      case Board.SYMMETRY.MIRROR_VERTICAL:
        return this.getCell(this.mx - x, y);
      case Board.SYMMETRY.MIRROR_HORIZONTAL:
        return this.getCell(x, this.my - y);
      case Board.SYMMETRY.MIRROR_NW_TO_SE:
        return this.getCell(y, x);
      case Board.SYMMETRY.MIRROR_SW_TO_NE:
        return this.getCell(this.mx - y, this.my - x);
      default:
        return null;
    }
  }
  toPojo() {
    var o = pojo(this);
    delete o.mx;
    delete o.my;
    delete o.cursor;
    return o;
  }
  loadAction(o) {
    this.cursor.loadAction(o.cursor);
    this.cells.loadAction(o.cells);
  }
  toAction() {
    return clone(this, 'toAction');
  }
  init() {
    this.refresh();
    this._actions = new Board.Actions(this);
    this.priv('_actions');
  }
  //
  static fromPojo(o) {
    var me = new this(o.width, o.height, o.symmetry, o.minWordLen);
    me.cells.loadPojo(o.cells);
    me.init();
    return me;
  }
  static asNew(width, height, symmetry, minWordLen) {
    var me = new Board(width, height, symmetry, minWordLen);
    me.init();
    return me;
  }
  static SYMMETRY = {
    'ROTATIONAL':1,
    'MIRROR_VERTICAL':2,
    'MIRROR_HORIZONTAL':3,
    'MIRROR_NW_TO_SE':4,
    'MIRROR_SW_TO_NE':5,
    'NONE':-1
  }
  static SYMMETRY_OPTIONS = ['', 'Rotational', 'Vertical', 'Horizontal', 'NW-to-SE', 'SW-to-NE', 'None'];
  static DAY_OPTIONS = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
}
Board.Cells = class extends Array {
  //
  constructor() {
    super();
  }
  /*Cell*/get(x, y) {
    return this[y][x];
  }
  all(fn/*(cell, x, y))*/) {
    this.forEach((row, y) => row.forEach((cell, x) => fn(cell, x, y)));
  }
  /*Cells*/filter(fn) {
    return Board.Cells.from([].filter.call(this.flat(), fn));
  }
  /*Cells*/fromCursor(cursor) {
    var sel = cursor.getSel();
    if (sel) {
      return this.filter(cell => sel.within(cell.x, cell.y));
    } else {
      return Board.Cells.from([this.get(cursor.x, cursor.y)]);
    }
  }
  refresh(cursor, min) {
    this.setCss(cursor);
    this.setErr(min);
    this.setNum();
  }
  toString() {
    var s = '\n';
    this.forEach((row, y) => {
      row.forEach((cell, x) => {
        s += cell.toString() + ' ';
      })
      s += '\n';
    })
    return s;
  }
  //
  setNum() {
    this.all(cell => cell.resetNum());
    this.words().forEach(word => word[0].setNum('#'));
    var i = 1;
    this.all(cell => {
      if (cell.num == '#') {
        cell.num = i++;
      }
    })
  }
  setCss(cursor) {
    this.all(cell => cell.setCss(cursor.css(cell.x, cell.y)));
  }
  setErr(min) {
    var lines = new Board.Cells.Lines(this);
    lines.setErr(min);
  }
  /*Line*/line(x, y, dir) {
    return Board.Cells.Line.create(this, x, y, dir);
  }
  /*Word[]*/words() {
    var lines = new Board.Cells.Lines(this);
    return lines.words();
  }
  loadPojo(a) {
    this.forEach((row, y) => row.forEach((cell, x) => cell.loadPojo(a[y][x])));
  }
  loadAction(a) {
    this.forEach((row, y) => row.forEach((cell, x) => cell.loadAction(a[y][x])));
  }
  //
  static create(width, height) {
    var me = Board.Cells.from(
      {length:height}, (v, y) => Array.from(
        {length:width}, (v, x) => new Board.Cell(x, y)));
    me.lines = new Board.Cells.Lines(me);
    return me;
  }
}
Board.Cells.Lines = class extends Array {
  //
  constructor(cells) {
    super();
    for (var i = 0; i < cells.length; i++) {
      this.push(Board.Cells.Line.create(cells, 0, i, 1));  //rows
    }
    for (var i = 0; i < cells[0].length; i++) {
      this.push(Board.Cells.Line.create(cells, i, 0, -1));  //cols
    }
  }
  setErr(min) {
    this.forEach(line => line.words.setErr(min));
  }
  words() {
    var words = [];
    this.forEach(line => {
      words = words.concat(line.words);
    })
    return words;
  }
}
Board.Cells.Line/*Cell[]*/ = class extends Array {
  /**
   * i x, y
   * Word[] words
   */
  constructor() {
    super();
  }
  getWord(x, y) {
    return this.words.get(x, y);
  }
  setErr(min) {
    this.words.setErr(min);
  }
  //
  static create(cells, x, y, dir/*1=horz, -1=vert*/) {
    var fn = dir == 1 ? (cell => cell.y == y) : (cell => cell.x == x);
    var me = Board.Cells.Line.from(cells.filter(fn));
    me.x = x;
    me.y = y;
    me.words = new Board.Cells.Words(me);
    return me;
  }
}
Board.Cells.Words = class extends Array {
  //
  constructor(line) {
    super();
    if (line) {
      var word  = new Board.Cells.Word();
      line.forEach(cell => {
        if (cell.isBlack() && word.length > 0) {
          this.push(word);
          word = new Board.Cells.Word();
        }
        if (! cell.isBlack()) {
          word.push(cell);
        }
      })
      if (word.length > 0) {
        this.push(word);
      }
    }
  }
  get(x, y) {
    var words = this.filter(word => word.within(x, y));
    if (words.length) {
      return words[0];
    }
  }
  setErr(min) {
    this.forEach(word => {
      if (word.length < min) {
        word.setErr();
      }
    })    
  }
}
Board.Cells.Word/*Cell[]*/ = class extends Array {
  constructor() {
    super();
  }
  within(x, y) {
    var x0 = this[0].x;
    var y0 = this[0].y;
    var x1 = this[this.length - 1].x;
    var y1 = this[this.length - 1].y;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }
  setErr() {
    this.forEach(cell => cell.setErr());
  }
}
Board.Cell = class {
  /**
   * i x, y
   * s id
   * s text
   * i fill
   * b locked
   * s css
   * s num
   */
  constructor(x, y, text, fill, locked) {
    this.x = x;
    this.y = y;
    this.id = 'c' + x + 'x' + y;
    this.text = text;
    this.fill = fill;
    this.locked = locked;
  }
  set(text) {
    if (! this.locked && ! this.isBlack()) {
      this.text = text || '';
    }
  }
  setCss(css) {
    this.css = css;
    if (this.locked) {
      this.css += ' lock';
    }
    if (this.fill) {
      this.css += ' f' + this.fill;
    }
  }
  resetErr() {
    this.css = this.css.replace('err', '');
  }
  setErr() {
    this.css = (this.css + ' err').trim();
  }
  setNum(s) {
    this.num = s;
  }
  resetNum() {
    this.num = '';
  }
  toggle() {
    if (this.isBlack()) {
      this.fill = Board.Cell.FILL.NONE;
    } else {
      this.fill = Board.Cell.FILL.BLACK;
      this.resetErr();
    }
  }
  toggleCircle() {
    if (! this.locked) {
      this.fill = this.isCircle() ? Board.Cell.FILL.NONE : Board.Cell.FILL.CIRCLE;
    }
  }
  toggleLock() {
    this.locked = ! this.locked;
  }
  isBlack() {
    return this.fill == Board.Cell.FILL.BLACK;
  }
  isCircle() {
    return this.fill == Board.Cell.FILL.CIRCLE;
  }
  equals(that) {
    return this.x == that.x && this.y == that.y;
  }
  toString() {
    var text = String.denull(this.text).padEnd(1);
    var css = this.css.padEnd(12);
    switch (this.fill) {
      case Board.Cell.FILL.BLACK:
        return '#####' + css;
      case Board.Cell.FILL.GRAY:
        return '==' + text + '==' + css;
      case Board.Cell.FILL.CIRCLE:
        return '( ' + text + ' )' + css;
      default:
        switch (text.trim().length) {
          case 0:
            return '.....' + css;
          case 1:
            return '  ' + text + '  ' + css;
          default:
            return text.padEnd(5) + css;
        }
    }
  }
  toPojo() {
    var o = pojo(this);
    delete o.x;
    delete o.y;
    delete o.id;
    delete o.css;
    delete o.num;
    return o;
  }
  loadPojo(o) {
    this.text = o.text;
    this.fill = o.fill;
    this.locked = o.locked;
  }
  loadAction(o) {
    this.text = o.text;
    this.fill = o.fill;
    this.locked = o.locked;
    this.css = o.css;
    this.num = o.num;
  }
  //
  static FILL = {
    'NONE':0,
    'BLACK':1,
    'CIRCLE':2,
    'GRAY':3
  }
}
Board.Cursor = class {
  /**
   * i x, y
   * i dir (1=horizontal, -1=vertical);
   * i tran (1=apply motion css transition)
   */
  constructor(width, height) {
    if (width) {
      this.mx = width - 1;
      this.my = height - 1;
      this.reset();
    }
  }
  reset() {
    this.x = 0;
    this.y = 0;
    this.dir = 1;
    this.resetSel();
  }
  resetSel() {
    this._sel = null;
    return this;
  }
  advance(i = 1) {
    if (this.dir == 1) {
      this.move(i, 0);
    } else {
      this.move(0, i);
    }
    return this;
  }
  retreat() {
    this.advance(-1);
    return this;
  }
  toggle() {
    this.dir = -this.dir;
    this._sel = null;
    return this;
  }
  atMax() {
    return (this.dir == 1) ? this.x == this.mx : this.y == this.my;
  }
  move(dx, dy, shift) {
    var x, y;
    x = this.x + dx;
    y = this.y + dy;
    x = (x < 0) ? 0 : x;
    x = (x > this.mx) ? this.mx : x;
    y = (y < 0) ? 0 : y;
    y = (y > this.my) ? this.my : y;
    return this.moveTo(x, y, shift, 1);
  }
  moveHome(shift) {
    if (this.dir == 1) {
      if (this.x > 0) {
        return this.moveTo(0, this.y, shift);
      }
    } else {
      if (this.y > 0) {
        return this.moveTo(this.x, 0, shift);
      }
    }
    return this.moveTo(0, 0, shift);
  }
  moveEnd(shift) {
    if (this.dir == 1) {
      if (this.x < this.mx) {
        return this.moveTo(this.mx, this.y, shift);
      }
    } else {
      if (this.y < this.my) {
        return this.moveTo(this.x, this.my, shift);
      }
    }
    return this.moveTo(this.mx, this.my, shift);
  }
  moveTo(x, y, shift, tran) {
    this.tran = tran;
    if (shift && ! this._sel) {
      this._sel = new Board.Cursor.Sel(this.x, this.y);
    }
    this.x = x;
    this.y = y;
    if (shift) {
      this._sel.moveTo(x, y);
    } else {
      this.resetSel();
    }
    return this;
  }
  sel(x0, y0, x1, y1) {
    this._sel = new Board.Cursor.Sel(x0, y0, x1, y1);
    this.x = x0;
    this.y = y0;
    this.tran = null;
    return this;
  }
  selAll() {
    return this.sel(0, 0, this.mx, this.my);
  }
  selCells(cells) {
    var x0 = cells[0].x;
    var y0 = cells[0].y;
    var x1 = cells[cells.length - 1].x;
    var y1 = cells[cells.length - 1].y;
    return this.sel(x0, y0, x1, y1);
  }
  css(x, y) {
    var css = this._sel ? this._sel.css(x, y) : '';
    if (this.x == x && this.y == y) {
      css += ' c' + (this.dir == 1 ? 'h' : 'v');
    }
    return css;
  }
  /*Sel*/getSel() {
    return this._sel;
  }
  loadAction(o) {
    this.x = o.x;
    this.y = o.y;
    if (o._sel) {
      this._sel = new Board.Cursor.Sel(o._sel.x0, o._sel.y0, o._sel.x1, o._sel.y1);
    }
    this.tran = null;
  }
}
Board.Cursor.Sel = class {
  /**
   * i x0, y0
   * i x1, y1
   */
  constructor(x0, y0, x1/*=x0*/, y1/*=y0*/) {
    this.x0 = x0;
    this.y0 = y0;
    if (x1 !== undefined) {
      this.x1 = x1;
      this.y1 = y1;  
    } else {
      this.x1 = x0;
      this.y1 = y0;
    }
    this.xi = x0;
    this.yi = y0;
  }
  moveTo(x, y) {
    if (x >= this.xi && y >= this.yi) {
      this.x0 = this.xi;
      this.y0 = this.yi;
      this.x1 = x;
      this.y1 = y;
      return;
    }
    if (x >= this.xi && y < this.yi) {
      this.x0 = this.xi;
      this.y0 = y;
      this.x1 = x;
      this.y1 = this.yi;
      return;
    }
    if (x < this.xi && y <= this.yi) {
      this.x0 = x;
      this.y0 = y;
      this.x1 = this.xi;
      this.y1 = this.yi;
      return;
    }
    this.x0 = x;
    this.y0 = this.yi;
    this.x1 = this.xi;
    this.y1 = y;
  }
  within(x, y) {
    return x >= this.x0 && x <= this.x1 && y >= this.y0 && y <= this.y1;
  }
  css(x, y) {
    var css = '';
    if (this.within(x, y)) {
      css += 'sel ';
      if (x >= this.x0 && x <= this.x1 && y == this.y0) {
        css += 'n ';
      }
      if (x >= this.x0 && x <= this.x1 && y == this.y1) {
        css += 's ';
      }
      if (y >= this.y0 && y <= this.y1 && x == this.x0) {
        css += 'w ';
      }
      if (y >= this.y0 && y <= this.y1 && x == this.x1) {
        css += 'e ';
      }
    }
    return css.trim();
  }
}
Board.Actions = class {
  //
  constructor(/*Board*/board) {
    this.board = board;
    this.a = [];
    this.save();
  }
  save() {
    this.a.push(this.board.toAction());
    this.i = this.a.length - 1;
  }
  undo() {
    if (this.i > 0) {
      this.i--;
      this.load();
    }
  }
  redo() {
    if (this.i < this.a.length - 1) {
      this.i++;
      this.load();
    }
  }
  load() {
    this.board.loadAction(this.a[this.i]);
  }
}
class Editing extends Obj {
  /**
   * i id
   * i uid
   * i tid
   */
  constructor(id, tid) {
    super();
    this.id = id;
    this.uid = MyUser.id;
    this.tid = tid;
  }
  //
  static async fetch() {
    var o = await MyClient.getEditing();
    return o ? new this(o.id, o.tid) : new this();
  }
  static async fetchTid() {
    var o = await MyClient.getEditing();
    return o && o.tid;
  }
  static async save(tid) {
    var me = await Editing.fetch();
    me.tid = tid;
    await MyClient.saveEditing(me);
  }
}