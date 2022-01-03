class UiEditor extends Ui {
  //
  constructor() {
    super();
    this.board = new Board();
    this.uiboard = new UiEditor.Board(this.board);
    this.uicursor = new UiEditor.Cursor(this.board.cursor);
    on('keydown', e => this.onkeydown(e));
    on('beforeunload', e => {
      e.preventDefault();
      e.returnValue = '';
    })
  }
  onkeydown(e) {
    if (e.ctrlKey) {
      switch (e.key.toUpperCase()) {
        case 'L':
          this.board.toggleLock();
          break;
        case 'S':
          this.board.selWord();
          break;
        case 'K':
          this.board.toggleCircle();
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
    this.$cursor.className = this.cursor.dir == 1 ? 'h' : 'v';
    this.moveTo(this.cursor.x, this.cursor.y);
  }
  moveTo(x, y) {
    var px = x * 37;
    var py = y * 36;
    this.$cursor.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0px)';
  }
}
UiEditor.Board = class extends Ui {
  //
  constructor(board) {
    super();
    this.board = board;
    this.uicells = new UiEditor.Cells(board);
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
UiEditor.Cells = class {
  //
  constructor(board) {
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