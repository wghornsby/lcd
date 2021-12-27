class Board {
  /**
   * i width, height
   * i symmetry
   * i minWordLen
   * Cursor cursor
   * Cell[][] cells
   */
  constructor(width, height, symmetry/*=ROTATIONAL*/, minWordLen/*=3*/) {
    this.width = width;
    this.height = height;
    this.mx = width - 1;
    this.my = height - 1;
    this.symmetry = symmetry || Board.SYMMETRY.ROTATIONAL;
    this.minWordLen = minWordLen || 3;
    this.cursor = new Board.Cursor(this.width, this.height);
    this.cells = Board.Cells.create(width, height);
    this.refresh();
  }
  uiSet(text, fill/*=null*/) {
    this.set(cursor.x, cursor.y, text, fill);
    this.cursor.advance();
    this.refresh();
  }
  uiUp(shift) {
    this.cursor.move(0, -1, shift);
    this.refresh();
  }
  uiDown(shift) {
    this.cursor.move(0, 1, shift);
    this.refresh();
  }
  uiLeft(shift) {
    this.cursor.move(-1, 0, shift);
    this.refresh();
  }
  uiRight(shift) {
    this.cursor.move(1, 0, shift);
    this.refresh();
  }
  uiHome(shift) {
    this.cursor.moveHome(shift);
    this.refresh();
  }
  uiEnd(shift) {
    this.cursor.moveEnd(shift);
    this.refresh();
  }
  uiSym() {
    var sym = this.getSym(this.cursor.x, this.cursor.y);
    this.cursor.moveTo(sym.x, sym.y);
    this.refresh();
  }
  uiToggle() {
    this.getSel().each(cell => this.toggle(cell.x, cell.y));
    this.refresh();
  }
  uiToggleLock() {
    this.getSel().each(cell => this.toggleLock(cell.x, cell.y));
    this.refresh();
  }
  uiSelAll() {
    this.cursor.selAll();
    this.refresh();
  }
  uiSelWord() {
    var line = this.cells.line(this.cursor.x, this.cursor.y, this.cursor.dir);
    var word = line.getWord(this.cursor.x, this.cursor.y);
    this.cursor.selCells(word);
    this.refresh();
  }
  uiMoveTo(x, y) {
    this.cursor.moveTo(x, y);
    this.refresh();
  }
  //
  /*Cell*/get(x, y) {
    return this.cells.get(x, y);
  }
  /*Cells*/getSel() {
    return this.cells.fromCursor(this.cursor);
  }
  set(x, y, text, fill) {
    this.get(x, y).set(text, fill);
  }
  toggle(x, y) {
    this.get(x, y).toggle();
    this.getSym(x, y)?.toggle();
  }
  toggleLock(x, y) {
    this.get(x, y).toggleLock();
  }
  refresh() {
    this.cells.refresh(this.cursor, this.minWordLen);
  }
  /*Cell*/getSym(x, y) {
    switch (this.symmetry) {
      case Board.SYMMETRY.ROTATIONAL:
        return this.get(this.mx - x, this.my - y);
      case Board.SYMMETRY.MIRROR_VERTICAL:
        return this.get(this.mx - x, y);
      case Board.SYMMETRY.MIRROR_HORIZONTAL:
        return this.get(x, this.my - y);
      case Board.SYMMETRY.MIRROR_NW_TO_SE:
        return this.get(y, x);
      case Board.SYMMETRY.MIRROR_SW_TO_NE:
        return this.get(this.mx - y, this.my - x);
      default:
        return null;
    }
  }
  static SYMMETRY = {
    'ROTATIONAL':1,
    'MIRROR_VERTICAL':2,
    'MIRROR_HORIZONTAL':3,
    'MIRROR_NW_TO_SE':4,
    'MIRROR_SW_TO_NE':5,
    'NONE':-1
  }
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
    this.each((row, y) => row.each((cell, x) => fn(cell, x, y)));
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
    this.each((row, y) => {
      row.each((cell, x) => {
        s += cell.toString() + ' ';
      })
      s += '\n';
    })
    return s;
  }
  //
  setNum() {
    this.all(cell => cell.resetNum());
    this.words().each(word => word[0].setNum('#'));
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
    this.each(line => line.words.setErr(min));
  }
  words() {
    var words = [];
    this.each(line => {
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
      line.each(cell => {
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
    this.each(word => {
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
    this.each(cell => cell.setErr());
  }
}
Board.Cursor = class {
  /**
   * i x, y
   * i dir (1=horizontal, -1=vertical);
   */
  constructor(width, height) {
    this.mx = width - 1;
    this.my = height - 1;
    this.reset();
  }
  reset() {
    this.x = 0;
    this.y = 0;
    this.dir = 1;
    this.resetSel();
  }
  resetSel() {
    this._sel = null;
  }
  advance() {
    if (this.dir == 1) {
      this.move(1, 0);
    } else {
      this.move(0, 1);
    }
  }
  toggle() {
    this.dir = -this.dir;
    this._sel = null;
  }
  move(dx, dy, shift) {
    var x, y;
    x = this.x + dx;
    y = this.y + dy;
    x = (x < 0) ? this.mx : x;
    x = (x > this.mx) ? 0 : x;
    y = (y < 0) ? this.my : y;
    y = (y > this.my) ? 0 : y;
    this.moveTo(x, y, shift);
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
    this.moveTo(0, 0, shift);
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
    this.moveTo(this.mx, this.my, shift);
  }
  moveTo(x, y, shift) {
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
  }
  sel(x0, y0, x1, y1) {
    this._sel = new Board.Cursor.Sel(x0, y0, x1, y1);
    this.x = x0;
    this.y = y0;
  }
  selAll() {
    this.sel(0, 0, this.mx, this.my);
  }
  selCells(cells) {
    var x0 = cells[0].x;
    var y0 = cells[0].y;
    var x1 = cells[cells.length - 1].x;
    var y1 = cells[cells.length - 1].y;
    this.sel(x0, y0, x1, y1);
  }
  css(x, y) {
    var css = this._sel ? this._sel.css(x, y) : "";
    if (this.x == x && this.y == y) {
      css += ' c' + (this.dir == 1 ? 'h' : 'v');
    }
    return css;
  }
  /*Sel*/getSel() {
    return this._sel;
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
    if (x != this.xi) {
      if ((x < this.x0) || (x > this.x0 && x <= this.x1)) {
        this.x0 = x;
      }
      if (x > this.x1) {
        this.x1 = x;
      }  
    }
    if (y != this.yi) {
      if ((y < this.y0) || (y > this.y0 && y <= this.y1)) {
        this.y0 = y;
      }
      if (y > this.y1) {
        this.y1 = y;
      }  
    }
    this.xi = x;
    this.yi = y;
  }
  within(x, y) {
    return x >= this.x0 && x <= this.x1 && y >= this.y0 && y <= this.y1;
  }
  css(x, y) {
    var css = "";
    if (this.within(x, y)) {
      css += "sel ";
      if (x == this.x0 && y == this.y0) {
        css += "nw ";
      }
      if (x == this.x0 && y == this.y1) {
        css += "sw ";
      }
      if (x == this.x1 && y == this.y0) {
        css += "ne ";
      }
      if (x == this.x1 && y == this.y1) {
        css += "se ";
      }
      if (x > this.x0 && x < this.x1 && y == this.y0) {
        css += "n ";
      }
      if (x > this.x0 && x < this.x1 && y == this.y1) {
        css += "s ";
      }
      if (y > this.y0 && y < this.y1 && x == this.x0) {
        css += "w ";
      }
      if (y > this.y0 && y < this.y1 && x == this.x1) {
        css += "e ";
      }
    }
    return css.trim();
  }
}
Board.Cell = class {
  /**
   * i x
   * i y
   * s text
   * i fill
   * b locked
   * s css
   * i num
   */
  constructor(x, y, text, fill, locked) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.fill = fill;
    this.locked = locked;
  }
  set(text, fill) {
    if (! this.locked) {
      this.text = text;
      this.fill = fill;        
    }
  }
  setCss(css) {
    this.css = css;
    if (this.locked) {
      this.css += ' lock';
    }
  }
  setErr() {
    this.css = (this.css + ' err').trim();
  }
  setNum(i) {
    this.num = i;
  }
  resetNum() {
    delete this.num;
  }
  toggle() {
    if (this.isBlack()) {
      this.fill = Board.Cell.FILL.NONE;
    } else {
      this.fill = Board.Cell.FILL.BLACK;
    }
  }
  toggleLock() {
    this.locked = ! this.locked;
  }
  isBlack() {
    return this.fill == Board.Cell.FILL.BLACK;
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
  //
  static FILL = {
    'NONE':0,
    'BLACK':1,
    'GRAY':2,
    'CIRCLE':3
  }
}
