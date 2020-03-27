class PageUi extends Ui {
  //
  init() {
    this.board = new Board();
    this.uiboard = new PageUi.Board(this.board);
    this.uiscore = new PageUi.Score(this.board);
    this.uinav = new PageUi.Nav(this.board)
      .on('change', () => this.uinav_onchange());
  }
  uinav_onchange() {
    this.uiboard.test();
  }
}
PageUi.Nav = class extends Ui {
  onchange() {}
  //
  init(board) {
    this.board = board;
    this.$move = $('#navmove');
    this.$buttons = $$('.mbut>span')
      .on('click', e => this.$button_onclick(e));
    on('keydown', e => this.onkeydown(e));
    this.reset();
  }
  reset() {
    this.$move.innerText = '';
  }
  $button_onclick(e) {
    this.nav(e.target.id);
  }
  nav(id) {
    switch (id) {
      case 'mfirst':
        break;
      case 'mprev':
        break;
      case 'mnext':
        break;
      case 'mlast':
        break;
    }
    this.onchange();    
  }
  onkeydown(e) {
    switch (e.keyCode) {
      case 39:
        this.nav('mnext');
        break;
    }
  }
}
PageUi.Board = class extends Ui {
  //
  init(board) {
    this.board = board;
    this.uisquares = new PageUi.Board.Squares();
    this.$$players = $$('.player');
    this.reset();
  }
  reset() {
    this.uisquares.reset(this.board);
    this.$$players[0].innerText = '';
    this.$$players[1].innerText = '';
  }
  test() {
    if (! this.testi) {
      this.testi = 0;
    }
    this.testi++;
    var mc;
    switch (this.testi) {
      case 1:
        mc = this.board.move_byAlgebra(1, 'e4');
        break;
      case 2:
        mc = this.board.move_byAlgebra(-1, 'e5');
        break;        
      case 3:
        mc = this.board.move_byAlgebra(1, 'Bb5');
        break;        
    }
    this.uisquares.move(mc);
  }
}
PageUi.Board.Squares = class extends Array {
  //
  constructor() {
    super();
    this.map = {};
    var $td, sq;
    Coords.all().forEach(c => {
      $td = $('#' + c.toString());
      sq = new PageUi.Board.Square($td, c);
      this.push(sq);
      this.map[c.toString()] = sq;
    })
  }
  get(e/*e.g. 'e4' or Coord*/) {
    var key = String.isString(e) ? e : e.toString();
    return this.map[key];
  }
  reset(board) {
    var p;
    this.forEach(sq => {
      p = board.at(sq.pos);
      if (p) {
        if (! sq.has(p)) {
          sq.put(p);
        }
      } else {
        sq.clear();
      }
    })
  }
  move(/*Move_Coords*/mc) {
    this.animate(mc.from, mc.to.captures_on || mc.to);
  }
  animate(/*Coord*/from, /*Coord*/to) {
    var sq_from = this.get(from);
    var sq_to = this.get(to);
    var $piece = sq_from.$piece;
    var bt = sq_to.getBounds(sq_from.piece);
    var bf = $piece.getBoundingClientRect();
    var x = bt.x - bf.x, y = bt.y - bf.y;
    $piece.on_once('transitionend', e => {
      $piece.style.transform = '';
      sq_to.moveFrom(sq_from);
    })
    $piece.style.zIndex = 999;
    $piece.style.transform = 'translate(' + x +'px,' + y + 'px)';
  }
}
PageUi.Board.Square = class extends Ui {
  //
  init($td, coord) {
    this.$td = $td;
    this.pos = coord;
    this.piece = null;
    this.$piece = null;
  }
  put(piece) {
    if (! this.empty()) {
      this.clear();
    }
    this.piece = piece;
    this.$piece = this.make_$piece(piece);
    this.$td.appendChild(this.$piece);
  }
  moveFrom(sq) {
    this.clear();
    this.piece = sq.piece;
    this.$piece = sq.$piece;
    this.$td.appendChild(this.$piece);
    sq.clear();
  }
  clear() {
    if (! this.empty()) {
      while (this.$td.firstChild) {
        this.$td.removeChild(this.$td.firstChild);
      }
      this.piece = null;
      this.$piece = null;
    }
  }
  getBounds(piece) {
    var $p = this.make_$piece(piece, 1);
    this.$td.appendChild($p);
    var bcr = $p.getBoundingClientRect();
    var bounds = {x:bcr.x, y:bcr.y};
    this.$td.removeChild($p);
    return bounds;
  }
  has(piece) {
    return this.piece && (this.piece.char2 == this.$td.className);
  }
  empty() {
    return this.piece == null;
  }
  make_$piece(piece, invisible) {
    var $piece = document.createElement("div");
    $piece.className = piece.char2;
    if (invisible) {
      $piece.style.visibility = 'invisible';
    } 
    return $piece;
  }
}
PageUi.Score = class extends Ui {
  //
  init(board) {
    this.board = board;
    this.$pgn = $('#pgn');
    this.reset();
  }
  reset() {
    this.$pgn.innerHTML = "";
  }
}

function old() {
  $$('.wb').on('transitionend', (e) => {
    e.target.style.transform = ''; 
    if(e.target.de) {
      e.target.destSquare.removeChild(e.target.de);
    } 
    e.target.destSquare.appendChild(e.target)
  })
  old2();
}
function old2() {
  var to = $('#a8');
  var from = $('#h1');
  var e = from.firstElementChild;
  var de = to.firstElementChild;
  var ne = document.createElement('DIV');
  ne.className = e.className;
  ne.style.visibility = 'invisible';
  to.appendChild(ne);
  var x = to.offsetLeft - from.offsetLeft;
  var y = to.offsetTop - from.offsetTop;
  x = ne.getBoundingClientRect().x - e.getBoundingClientRect().x;
  y = ne.getBoundingClientRect().y - e.getBoundingClientRect().y;
  to.removeChild(ne);
  e.style.zIndex = 999;
  e.destSquare = to;
  e.de = de;
  e.style.transform = 'translate(' + x +'px,' + y + 'px)';          
}
function old3() {
  var to = $('#g2');
  var from = $('#a8');
  var e = from.firstElementChild;
  var de = to.firstElementChild;
  var ne = document.createElement('DIV');
  ne.className = e.className;
  ne.style.visibility = 'invisible';
  to.appendChild(ne);
  var x = to.offsetLeft - from.offsetLeft;
  var y = to.offsetTop - from.offsetTop;
  x = ne.getBoundingClientRect().x - e.getBoundingClientRect().x;
  y = ne.getBoundingClientRect().y - e.getBoundingClientRect().y;
  to.removeChild(ne);
  e.style.zIndex = 999;
  e.destSquare = to;
  e.de = de;
  e.style.transform = 'translate(' + x +'px,' + y + 'px)';          
}