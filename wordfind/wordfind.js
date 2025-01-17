var WF = window.WF || {};
//
WF.PLAYBOOK = {
  crossEvery:3, /*attempt to cross on every 3rd word*/
  crossMax:2 /*no more than 2 crossings in a cell*/
}
WF.DIRS = {
  E:0,
  SE:7,
  IX_R:[0, -1, -1, -1, 0, 1, 1, 1],
  IX_C:[1, 1, 0, -1, -1, -1, 0, 1],
  polarity:[0, 1, 2, 3, 0, 1, 2, 3]
}
WF.Board = class {
  /**
   * Cells[] rows
   */
  constructor(rows, cols) {
    this.rows = new Array(rows);
    for (let r = 0; r < rows; r++) {
      this.rows[r] = WF.Cells.asRow(cols, r);
    }
  }
  load(words) {
    words.forEach(word => {
      this.set(word.play(this));
    })
    return this;
  }
  //
  cell(r, c) {
    let row = this.rows[r];
    if (row) {
      return row[c];
    }
  }
  cells(r, c, dir, len) {
    return WF.Cells.extract(this, r, c, dir, len);
  }
  forEach(fn) {
    this.rows.forEach(cells => cells.forEach(cell => fn(cell)));
  }
  set(play) {
    play.cells.forEach((cell, i) => {
      cell.set(play.word.value[i], play.dir);
    })
  }
  fill() {
    this.forEach(cell => cell.fill());
  }
  crossings() {
    let c = 0;
    this.forEach(cell => {
      if (cell.tiles.length > 1) {
        c++;
      }
    })
    return c;
  }
  toString() {
    return this.rows.map(cells => cells.toString()).join('\n');
  }
  //
  static DIR_R = [0, -1, -1, -1, 0, 1, 1, 1];
  static DIR_C = [1, 1, 0, -1, -1, -1, 0, 1];
}
WF.Cells = class extends Array {
  //
  tileCount() {
    let c = 0;
    this.forEach(cell => {
      if (cell.tiles.length) {
        c++;
      }
    })
    return c;
  }
  //
  static asRow(cols, r) {
    let me = new WF.Cells(cols);
    for (let c = 0; c < cols; c++) {
      me[c] = new WF.Cell(r, c);
    }
    return me;
  }
  static extract(board, r, c, dir, len) {
    let me = new WF.Cells();
    for (let i = 0; i < len; i++) {
      let cell = board.cell(r, c);
      if (! cell) {
        return;
      }
      me.push(cell);
      r += WF.DIRS.IX_R[dir];
      c += WF.DIRS.IX_C[dir];
    }
    return me;    
  }
  //
  toString() {
    return this.map(cell => cell.toString()).join(' ');
  }
}
WF.Cell = class {
  /**
   * i row
   * i col
   * Tile[] tiles
   */
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.tiles = [];
  }
  set(letter, dir) {
    let tile = new WF.Tile(letter, dir);
    this.tiles.push(tile);
  }
  value() {
    if (this.tiles.length) {
      return this.tiles[0].value;
    }
    return null;
  }
  fill() {
    if (this.tiles.length == 0) {
      this.set(String.fromCharCode(65 + rnd(26)));
    }
  }
  toString() {
    return this.value() || '.';
  }
}
WF.Tile = class {
  /**
   * s letter
   * i dir
   */
  constructor(letter, dir) {
    this.value = letter;
    this.dir = dir;
  }
}
WF.Words = class extends Array {
  //
  static fromString(s) {
    return WF.Words.from(s.split(','), (word, i) => new WF.Word(i + 1, word));
  }
  //
  shuffle(n = 1000) {
    for (let i = 0; i < n; i++) {
      let a = rnd(this.length);
      let b = rnd(this.length);
      let word = this[a];
      let ix = word.index;
      this[a] = this[b];
      this[b] = word;
      this[b].index = this[a].index;
      this[a].index = ix;
    }
  }
  toString() {
    return this.map(word => word.index + ' ' + word.value).join('\n');
  }
}
WF.Word = class {
  /**
   * i index (1-based)
   * s value
   */
  constructor(index, word) {
    this.index = index;
    this.value = word;
  }
  play(board) {
    let plays = this.plays(board);
    if (plays.length) {
      return plays[rnd(plays.length)];
    }
  }
  //
  plays(board) {
    let plays = [], crossings = 0;
    board.forEach(cell => {
      for (let dir = WF.DIRS.E; dir <= WF.DIRS.SE; dir++) {
        let play = new WF.Play(this, board, cell, dir);
        if (play.valid()) {
          if (this.index % WF.PLAYBOOK.crossEvery == 0) {
            if (play.crossings > crossings) {
              crossings = play.crossings;
              plays = [];
            }
          }
          if (play.crossings >= crossings) {
            plays.push(play);
          }
        }
      }
    })
    return plays;
  }
}
WF.Play = class { 
  /**
   * i row
   * i col
   * i dir (0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, 7=SE)
   * Word word
   * Cells cells
   * i crossings
   * b invalid
   */
  constructor(word, board, cell, dir) {
    this.word = word;
    this.row = cell.row;
    this.col = cell.col;
    this.dir = dir;
    this.cells = board.cells(cell.row, cell.col, dir, word.value.length);
    if (! this.cellsOk()) {
      this.invalid = true;
      return;
    }
    this.crossings = this.cells.tileCount();
  }
  cellsOk() {
    if (! this.cells) {
      return;
    }
    let polarity = WF.DIRS.polarity[this.dir];
    for (let i = 0; i < this.cells.length; i++) {
      let cell = this.cells[i];
      if (cell.tiles.length) {
        if (cell.value() != this.word.value[i]) {
          return; /*tile doesn't match*/
        }
        if (cell.tiles.length >= WF.PLAYBOOK.crossMax) {
          return; /*too many crossings*/
        }
        for (let t = 0; t < cell.tiles.length; t++) {
          if (WF.DIRS.polarity[cell.tiles[t].dir] == polarity) {
            return; /*can't cross on same line*/
          }          
        }
      }      
    }
    return true;
  } 
  valid() {
    return ! this.invalid;
  }
}
