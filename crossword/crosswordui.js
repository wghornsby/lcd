class UiCrossword extends Obj {
  //
  constructor() {
    super();
    this.uieditor = new UiEditor()
      .on('lookup', (text) => this.uibrowser.nav(text))
    this.uibrowser = new UiBrowser()
      .on('load', () => window.focus());
    this.setup();
  }
  async setup() {
    await MyClient.login('test', 'test');
    this.crossword = await Crossword.fetchMyLast();
    this.uieditor.load(this.crossword);
  }
}
class UiEditor extends Obj {
  onlookup(text) {}
  //
  constructor() {
    super();
    this.uiboard = new UiEditor.Board()
      .on('click', cell => this.uiboard_onclick(cell));
    this.uicursor = new UiEditor.Cursor();
    window
      .on('keydown', e => this.onkeydown(e));
  }
  load(crossword) {
    this.crossword = crossword;
    this.board = crossword.board;
    this.uiboard.load(this.board);
    this.uicursor.load(this.board.cursor);
    this._sel = null;
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
          this.onlookup(this.board.getSelText());
          break;
        case 'V':
          this.board.setSelText(this._sel);
          this._sel == null;
          break;
        case 'X':
          this._sel = this.board.getSelText();
          this.board.clear();
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
UiEditor.Cursor = class extends Obj {
  //
  load(cursor) {
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
UiEditor.Board = class extends Obj {
  onclick(cell) {}
  //
  constructor() {
    super();
    this.uicells = new UiEditor.Cells()
      .on('click', cell => this.onclick(cell));
  }
  load(board) {
    this.uicells.load(board);
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
UiEditor.Cells = class extends Obj {
  onclick(cell) {}
  //
  constructor() {
    super();
    this.$grid = $('#grid');
  }
  load(board) {
    this.board = board;
  }
  reset() {
    this.$grid.innerHTML = '';
    this.board.forEach(row => {
      var $tr = this.$grid.insertRow();
      row.forEach(cell => {
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
UiBrowser = class extends Obj {
  onload() {}
  //
  constructor(board) {
    super();
    this.$if = $('#if')
      .on('load', e => this.onload());
    this.$if.src = this.url();
  }
  nav(s) {
    this.$if.src = this.url() + '?w=' + s + '&ssbp=1';
  }
  //
  url() {
    return 'https://www.onelook.com';
  } 
}