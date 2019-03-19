/** 
 * TicTacToeBoard
 * UI controller
 */
class $Board extends _Obj {
  //
  init(div) {
    div.innerHTML = $Board.html();
    this.$grid = new $Grid(div)
      .on('click', (cell) => this.$grid_onclick(cell));
    this.board = new Board()
      .on('change', () => this.draw());
    this.reset();
  }
  //
  reset() {
    this.board.reset();
  }
  draw() {
    this.$grid.set(this.board);
    if (this.board.winner) {
      if (this.board.winner == 99) {
        this.$grid.cat();
      } else {
        this.$grid.win(this.board.wincells);
      }
    }
  }
  $grid_onclick(cell) {
    if (! this.board.winner) { 
      this.board.play(cell.row, cell.col);
    }
  }
  //
  static html() {
    return "<table><tr><td class='c00'>&nbsp;</td><td class='c01'><span class='x'>X</span></td><td class='c02'>&nbsp;</td></tr><tr><td class='c10'>&nbsp;</td><td class='c11'><span class='o'>O</span></td><td class='c12'>&nbsp;</td></tr><tr><td class='c20'>&nbsp;</td><td class='c21'>&nbsp;</td><td class='c22'>&nbsp;</td></tr></table>";    
  }
} 
class $Grid extends _Obj {
  onclick(cell) {}
  //
  init(div) {
    this.$cells = [[0,0,0],[0,0,0],[0,0,0]];
    for (var r = 0; r <= 2; r++) {
      for (var c = 0; c <= 2; c++) {
        var td = div.getElementsByClassName('c' + r + c)[0];
        this.$cells[r][c] = new $Cell(td, r, c)
          .bubble('click', this);
      }
    }
  }
  set(board) {
    board.each(this, function(val, r, c) {
      this.$cells[r][c].set(val);
    })
  }
  win(cells) {
    for (var i = 0; i < 3; i++) {
      var r = cells[i][0];
      var c = cells[i][1];
      this.$cells[r][c].win();
    }
  }
  cat() {
    for (var r = 0; r <= 2; r++) {
      for (var c = 0; c <= 2; c++) {
        this.$cells[r][c].win();
      }
    }
  }
}
class $Cell extends _Obj {
  onclick($cell) {}
  //
  init(td, r, c) {
    this.row = r;
    this.col = c;
    this.td = td
      .on('click', () => this.onclick(this));
  }
  set(val) {
    this.td.innerHTML = this.html(val);
  }
  win() {
    this.td.classList.add('win');
  }
  //
  html(val) {
    switch (val) {
    case 1:
      return "<span class='x'>X</span>";
    case -1:
      return "<span class='o'>O</span>";
    default:
      return "<span class='b'>&nbsp;</span>";
    }
  }  
}