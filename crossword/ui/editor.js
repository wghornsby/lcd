var file = '{"width":15,"height":15,"symmetry":1,"minWordLen":3,"cells":[[{"text":"A"},{"text":"S"},{"text":"D"},{"text":"A"},{"text":"S"},{"fill":1},{"text":"S"},{"text":"D"},{"text":"A"},{"text":"S"},{"text":"D"},{"fill":1},{"text":"A"},{"text":"S"},{"text":"S"}],[{},{},{},{},{"fill":0},{"fill":1},{},{},{},{},{},{},{},{},{}],[{},{},{},{},{},{"fill":1},{"fill":0},{},{},{},{},{},{},{},{}],[{},{},{},{},{},{},{"fill":1},{},{},{},{},{},{},{},{}],[{},{},{"text":"D"},{},{},{},{},{},{},{},{},{},{},{},{}],[{},{},{"text":"I"},{},{},{},{},{},{},{},{},{},{},{},{}],[{},{},{"text":"D"},{},{},{},{},{"fill":1},{"text":"L","locked":true},{"text":"O","locked":true},{"text":"C","locked":true},{"text":"K","locked":true},{"text":"E","locked":true},{"text":"D","locked":true},{"fill":1}],[{},{},{"text":"I"},{},{},{},{},{"fill":1},{},{},{},{},{},{},{}],[{"fill":1},{},{"text":"T"},{},{},{},{},{"fill":1},{},{},{},{},{},{},{}],[{},{},{"text":"W"},{},{},{},{},{},{},{},{},{},{},{},{}],[{},{},{"text":"O"},{},{},{},{},{},{},{},{},{},{},{},{}],[{},{},{"text":"R"},{},{},{},{},{},{"fill":1},{},{},{},{},{},{}],[{},{},{"text":"K"},{},{},{},{},{},{"fill":0},{"fill":1},{},{},{},{},{}],[{},{},{"text":"?"},{},{},{},{},{},{},{"fill":1},{"fill":0},{},{},{},{}],[{},{},{},{"fill":1},{},{},{},{},{},{"fill":1},{},{},{},{},{}]]}';

class UiEditor extends Ui {
  //
  constructor() {
    super();
    this.board = Board.asNew(15, 15);
    //this.board = Board.fromPojo(JSON.parse(file));
    this.uiboard = new UiEditor.Board(this.board)
      .on('click', cell => this.uiboard_onclick(cell));
    this.uicursor = new UiEditor.Cursor(this.board.cursor);
    window
      .on('keydown', e => this.onkeydown(e))
      .on('beforeunload', e => {
        e.preventDefault();
        e.returnValue = '';
      });
  }
  onkeydown(e) {
    if (e.ctrlKey) {
      switch (e.key.toUpperCase()) {
        case 'A':
          this.board.selAll();
          break;
        case 'K':
          this.board.toggleCircle();
          break;
        case 'L':
          this.board.toggleLock();
          break;
        case 'S':
          this.board.selWord();
          break;
        case 'Y':
          this.board.redo();
          break;
        case 'Z':
          this.board.undo();
          break;
      }
      e.preventDefault();
      this.refresh();
      return;
    }
    switch (e.key) {
      case 'ArrowLeft':
        this.board.goLeft(e.shiftKey);
        break;
      case 'ArrowUp':
        this.board.goUp(e.shiftKey);
        break;
      case 'ArrowRight':
        this.board.goRight(e.shiftKey);
        break;
      case 'ArrowDown':
        this.board.goDown(e.shiftKey);
        break;
      case 'Enter':
        this.board.toggleCursor();
        break;
      case 'Backspace':
        this.board.backspace();
        break;
      case 'Delete':
        this.board.clear(e.shiftKey);
        break;
      case 'Home':
        this.board.goHome(e.shiftKey);
        break;
      case 'End':
        this.board.goEnd(e.shiftKey);
        break;
      case ' ':
        this.board.toggle();
        break;
      default:
        if (e.key.length == 1) {
          this.board.set(e.key.toUpperCase());
        }
    }
    this.refresh();
  }
  refresh() {
    this.uicursor.refresh();
    this.uiboard.refresh();
  }
  uiboard_onclick(cell) {
    this.board.moveTo(cell.x, cell.y);
    this.refresh();
  }
}
UiEditor.Cursor = class extends Ui {
  //
  constructor(cursor) {
    super();
    this.cursor = cursor;
    this.$cursor = $('#cursor');
    this.refresh();
  }
  refresh() {
    this.$cursor.className = 
      (this.cursor.dir == 1 ? 'h' : 'v') + (this.cursor.tran ? ' tran' : '');
    this.moveTo(this.cursor.x, this.cursor.y);
  }
  moveTo(x, y) {
    var px = x * 38;
    var py = y * 36;
    this.$cursor.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0px)';
  }
}
UiEditor.Board = class extends Ui {
  onclick(cell) {}
  //
  constructor(board) {
    super();
    this.board = board;
    this.uicells = new UiEditor.Cells(board)
      .bubble('click', this);
    this.reset();
  }
  reset() {
    this.uicells.reset();
    this.refresh();
  }
  refresh() {
    this.uicells.refresh();
  }
}
UiEditor.Cells = class extends Ui {
  onclick(cell) {}
  //
  constructor(board) {
    super();
    this.board = board;
    this.$grid = $('#grid');
  }
  reset() {
    this.$grid.innerHTML = '';
    this.board.each(row => {
      var $tr = this.$grid.insertRow();
      row.each(cell => {
        var $td = $tr.insertCell();
        $td.x = cell.x;
        $td.y = cell.y;
        $td.id = cell.id;
        $td.on('mousedown', () => this.onclick(cell));
      })
    })
  }
  refresh() {
    this.board.all(cell => this.refreshCell(cell));
  }
  refreshCell(cell) {
    var $td = this.$get(cell);
    $td.className = cell.css;
    $td.innerHTML = '<span>' + cell.num + '</span>' + (cell.text ? cell.text : '&nbsp;');
  }
  $get(cell) {
    return $('#' + cell.id);
  }
}
