/** 
 * Unit tests of TicTacToe data model
 */
function test_TicTacToe() {
  //
  logg('Tester');
  //
  var ss, p;
  var board = new Board().on('change', function() {
    ss = {
      cells:/*int[3][3]*/this.cells,
      moves:/*int*/this.moves,
      turn:/*int*/this.turn/*1=X,-1=O*/,
      winner:/*int*/this.winner/*null=none,1=X,-1=O,99=cat*/
    }
  })
  //
  board.reset();
  log(ss);
  assert(ss.moves, 0, 'ss.moves');
  assert(ss.winner, null, 'ss.winner');
  //
  p = board.play(0, 0);
  log(ss);
  assert(p, true, 'p');
  assert(ss.moves, 1, 'ss.moves');
  assert(ss.cells[0][0], 1, 'ss.cells[0][0]');  
  assert(ss.winner, null, 'ss.winner');
  //
  p = board.play(1, 1);
  log(ss);
  assert(p, true, 'p');
  assert(ss.moves, 2, 'ss.moves');
  assert(ss.cells[1][1], -1, 'ss.cells[1][1]');  
  assert(ss.winner, null, 'ss.winner');
  //
  p = board.play(1, 0);
  log(ss);
  assert(p, true, 'p');
  assert(ss.moves, 3, 'ss.moves');
  assert(ss.cells[1][0], 1, 'ss.cells[1][0]');  
  assert(ss.winner, null, 'ss.winner');
  //
  p = board.play(1, 0);
  log(ss);
  assert(p, false, 'p');
  assert(ss.moves, 3, 'ss.moves');
  assert(ss.cells[1][0], 1, 'ss.cells[1][0]');  
  assert(ss.winner, null, 'ss.winner');
  //
  p = board.play(1, 2);
  log(ss);
  assert(p, true, 'p');
  assert(ss.moves, 4, 'ss.moves');
  assert(ss.cells[1][2], -1, 'ss.cells[1][2]');  
  assert(ss.winner, null, 'ss.winner');
  //
  p = board.play(2, 0);
  log(ss);
  assert(p, true, 'p');
  assert(ss.moves, 5, 'ss.moves');
  assert(ss.cells[2][0], 1, 'ss.cells[2][0]');  
  assert(ss.winner, 1, 'ss.winner');
  //
  logg(true);
} 