/** 
 * TicTacToe 
 * UI data model
 */
class Board extends _Obj {
  /*
   int cells [[],[],[]]
   int moves
   int turn
   int winner 1=X,-1=O,99=CAT
   int wincells [[r,c],[r,c],[r,c]]
   */
  onchange() {}
  //
  reset() {
    this.cells = [[0,0,0],[0,0,0],[0,0,0]];
    this.moves = 0;
    this.turn = 1/*X*/;
    this.winner = null;
    this.wincells = null;
    this.onchange();    
  }
  play(x, y) {
    if (this.cells[x][y]) {
      return false/*illegal*/;
    } else {
      this.cells[x][y] = this.turn;
      this.moves++;
      this.turn = -this.turn;
      this.calcWinner(this.cells);
      this.onchange();
      return true;
    }    
  }
  each(ctx, fn/*(value,r,c)*/) {
    for (var r = 0; r <= 2; r++) {
      for (var c = 0; c <= 2; c++) {
        fn.call(ctx, this.cells[r][c], r, c);
      }
    }
  }
  //
  calcWinner(b) {
    this.wincells = this.calcWinCells(b);
    if (this.wincells) {
      this.winner = b[this.wincells[0][0]][this.wincells[0][1]];
    } else {
      this.winner = this.moves == 9 ? 99/*cat*/ : null;
    }
  }
  calcWinCells(b) {
    for (var r = 0; r <= 2; r++) {
      if (b[r][0] && b[r][0] == b[r][1] && b[r][1] == b[r][2]) {
        return [[r,0],[r,1],[r,2]]/*winner along row*/;
      }
    }
    for (var c = 0; c <= 2; c++) {
      if (b[0][c] && b[0][c] == b[1][c] && b[1][c] == b[2][c]) {
        return [[0,c],[1,c],[2,c]]/*winner along col*/;
      }
    }
    if (b[0][0] && b[0][0] == b[1][1] && b[1][1] == b[2][2]) {
      return [[0,0],[1,1],[2,2]]/*winner along diag*/;
    }
    if (b[2][0] && b[2][0] == b[1][1] && b[1][1] == b[0][2]) {
      return [[2,0],[1,1],[0,2]]/*winner along diag*/;
    }
  }
}
