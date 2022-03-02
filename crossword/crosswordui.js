class UiCrossword extends Obj {
  //
  constructor() {
    super();
    this.uitabs = new UiTabs();
    this.uieditor = new UiEditor()
      .on('lookup', (text) => this.uitabs.nav(text));
    this.uicluelist = new UiCluelist();
    this.setup();
  }
  async setup() {
    await MyClient.login();
    var tid = await Editing.fetchTid();
    this.theme = tid ? await Theme.fetch(tid) : Theme.asNew();
    this.uieditor.load(this.theme);
    this.uicluelist.load(this.theme.crossword);
  }
}
class UiTabs extends Obj {
  //
  constructor() {
    super();
    this.uibrowser = new UiBrowser()
      .on('load', () => window.focus());
    this.$$tabs = $$('#t2a span')
      .on('click', e => this.$$tabs_onclick(e.srcElement));
    this.$$frames = $$('.tile2 .tab');
    this.$$tabs.forEach(($tab, i) => $tab.innerText = UiTabs.CAPTIONS[i]);
    this._i = -1;
    this.select(0);
  }
  nav(text) {
    if (this._i == 1) {
      this.uibrowser.nav(text);
    }
  }
  select(i) {
    if (i != this._i) {
      this.$$tabs.forEach(($tab, j) => {
        $tab.className = i == j ? 'sel' : '';
        this.$$frames[j].className = i == j ? 'tab tsel' : 'tab';
      })
      this._i = i;
    }
  }
  $$tabs_onclick($tab) {
    this.select(UiTabs.CAPTIONS.findValue($tab.innerText));
  }
  //
  static CAPTIONS = ['Clue List', 'OneLook', 'Clever Clues'];
}
class UiCluelist extends Obj {
  //
  constructor() {
    super();
    this.$$lists = $$('#cluelist .list');
    this.$$clues = [this.$$lists[0].$$('div'), this.$$lists[1].$$('div')];
  }
  load(crossword) {
    this.cluelist = crossword.cluelist;
    this.draw();
  }
  draw() {
    this.cluelist.all((clue, ad, i) => {
      let $clue = this.$$clues[ad][i];
      $clue.classList.remove('h');
      $clue.$('span').innerText = clue.num;
      $clue.$('input').value = clue.text;
    })
  }
}
class UiEditor extends Obj {
  onlookup(text) {}
  onversion(i) {}
  onnewversion() {}
  //
  constructor() {
    super();
    this.uiboard = new UiEditor.Board()
      .on('click', cell => this.uiboard_onclick(cell));
    this.uiversions = new UiEditor.Versions()
      .on('change', cix => this.uiversions_onchange(cix));
    this.uicursor = new UiEditor.Cursor();
    this._blurred = 0;
    this.$title = $('#title')
      .on('click', e => this.$title_onclick());
  }
  load(theme) {
    this.theme = theme;
    this.uiversions.load(this.theme);
    this.loadCrossword(theme.crossword);
    this._sel = null;
    this.drawTheme();
    window
      .on('blur', () => this.blur())
      .on('focus', () => this.focus())
      .on('keydown', e => this.onkeydown(e));
  }
  loadCrossword(crossword) {
    this.crossword = crossword;
    this.board = crossword.board;
    this.uiboard.load(this.board);
    this.uicursor.load(this.board.cursor);
  }
  drawTheme() {
    this.$title.innerText = this.theme.title;
  }
  uiboard_onclick(cell) {
    this.board.moveTo(cell.x, cell.y);
    this.drawBoard();
    document.activeElement.blur();
    this.focus();
  }
  $title_onclick() {
    UiSettingsPop.show(this.theme.toPojo())
      .on('save', o => {
        this.theme.save(o);
        this.drawTheme();
        this.loadCrossword(this.theme.crossword);
      })
  }
  async uiversions_onchange(cix) {
    await this.theme.setVersion(cix);
    this.loadCrossword(this.theme.crossword);
  }
  blur() {
    this.uicursor.show(0);
    this._blurred = 1;
  }
  focus() {
    if (document.activeElement.tagName == 'BODY') {
      this.uicursor.show(1);
      this._blurred = 0;
    }
  }
  onkeydown(e) {
    if (this._blurred) {
      return;
    }
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
          if (this.board.selWord()) {
            this.onlookup(this.board.getSelText());
          }
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
      this.drawBoard();
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
    this.drawBoard();
  }
  drawBoard() {
    this.uicursor.refresh();
    this.uiboard.refresh();
  }
}
UiEditor.Versions = class extends Obj {
  onchange(cix) {}
  //
  constructor() {
    super();
    this.reset();
  }
  reset() {
    $('#xvers').innerHTML = '';
    this.$tabs = [];
  }
  load(theme) {
    this.theme = theme;
    theme.cids.forEach((cid, i) => this.createTab(i));
    this.createTab(-1);
    this.cix = theme.cix;
    this.$tab_onclick(this.cix);
  }
  createTab(i) {
    var $tab = document.createElement('span');
    $tab.innerText = i >= 0 ? 'v' + (i + 1) : '+';
    $tab.className = i == this.theme.cids.length - 1 ? 'sel' : '';
    $tab.on('click', e => this.$tab_onclick(i));
    $('#xvers').appendChild($tab);
    if (i >= 0) {
      this.$tabs.push($tab);
    }
  }
  $tab_onclick(i) {
    if (i >= 0) {
      $$('#xvers span').forEach($tab => $tab.className = '');
      this.$tabs[i].className = 'sel';
      if (i != this.cix) {
        this.cix = i;
        this.onchange(i);
      }
    }
  }
}
UiEditor.Cursor = class extends Obj {
  //
  load(cursor) {
    this.cursor = cursor;
    this.$cursor = $('#cursor');
    this.r = $('#c0x0').getBoundingClientRect();
    this.$cursor.style.top = this.r.top - 3;
    this.$cursor.style.left = this.r.left - 3;
    this.refresh();
  }
  show(b) {
    this.$cursor.style.display = b ? '' : 'none';
    log('cursor=' + this.$cursor.style.display);
  }
  refresh() {
    var tran = this.cursor.tran ? ' tran' : '';
    if (this.cursor.dir == 1) {
      this.$cursor.className = 'h' + tran;
      this.$cursor.style.height = this.r.height;
      this.$cursor.style.width = this.r.width + 6;
    } else {
      this.$cursor.className = 'v' + tran;
      this.$cursor.style.height = this.r.height + 6;
      this.$cursor.style.width = this.r.width;
    }
    this.moveTo(this.cursor.x, this.cursor.y);
  }
  moveTo(x, y) {
    var px = x * this.r.width;
    var py = y * this.r.height;
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
class UiSettingsPop extends Dialog {
  onsave(pojo) {}
  //
  init() {
    Dialog.loadSelect($('#dcs_symmetry'), Board.SYMMETRY_OPTIONS);
    Dialog.loadSelect($('#dcs_targetDay'), Board.DAY_OPTIONS);
    return this;
  }
  load(pojo) {
    this.pojo = pojo
    $('#dcs_title').value = pojo.title;
    $('#dcs_desc').value = pojo.desc || '';
    $('#dcs_minWordLen').value = pojo.minWordLen;
    $('#dcs_height').value = pojo.height;
    $('#dcs_width').value = pojo.width;
    $('#dcs_symmetry').selectedIndex = pojo.symmetry;
    $('#dcs_targetDay').selectedIndex = pojo.targetDay;
    return this;
  }
  show() {
    super.show();
    $('#dcs_title').select();
    return this;
  }
  get() {
    let o = {
      title:$('#dcs_title').value,
      desc:$('#dcs_desc').value,
      minWordLen:$('#dcs_minWordLen').value,
      height:$('#dcs_height').value,
      value:$('#dcs_width').value,
      symmetry:$('#dcs_symmetry').selectedIndex,
      targetDay:$('#dcs_targetDay').selectedIndex  
    }
    return Object.assign(this.pojo, o);
  }
  onclick(event) {
    if (event == 'onsave') {
      this.onsave(this.get());
    } else {
      super.onclick(event);
    }
  }
  loadSelect($select, a) {
    a.forEach((text, i) => $select[i] = new Option(text, i));
  }
  //
  static show(theme) {
    if (! this.me) {
      this.me = this.asSaveCancel('Crossword Settings', $('#dCrosswordSettings')).init();
    }
    return this.me.load(theme).show();
  }
}
