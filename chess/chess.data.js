class Board {
  /*
   cells[1..8][1..8]
   Pieces captured[]
   PGN pgn
   */
  constructor() {
    this.reset();
  }
  reset() {
    this.cells = Array.from({length:9}, (v, i) => [,,,,,,,,]);
    this.captured = new Pieces();
    this.undo = null;
    for (var r = 1; r <= 8; r++) {
      var color = (r <= 2) ? 1 : -1;
      for (var f = 1; f <= 8; f++) {
        switch (r) {
          case 2:
          case 7:
            this.cells[f][r] = new Piece.Pawn(color, f, r);
            break;
          case 1:
          case 8:
            switch (f) {
              case 1:
              case 8:
                this.cells[f][r] = new Piece.Rook(color, f, r);
                break;
              case 2:
              case 7:
                this.cells[f][r] = new Piece.Knight(color, f, r);
                break;
              case 3:
              case 6:
                this.cells[f][r] = new Piece.Bishop(color, f, r);
                break;
              case 4:
                this.cells[f][r] = new Piece.Queen(color, f, r);
                break;
              case 5:
                this.cells[f][r] = new Piece.King(color, f, r);
                break;
            }
            break;
        }
      }
    }
  }
  load(/*PGN*/pgn) {
    this.pgn = pgn;
    this.reset();
  }
  /*Move_Coords*/move(/*Coord*/from, /*Coord*/to, /*s*/promote) { 
    var p = this.piece_at(from);
    if (! p ) {
      throw "Invalid source";
    }
    to = p.hits(this).has(to);
    if (! to) {
      throw "Invalid destination";
    }
    this.undo = new Board.Undo(
      from.clone(), 
      to.clone(), 
      p, 
      to.captures, 
      to.captures_on, 
      to.castling,
      to.rook_from, 
      to.rook_to);
    this.set(from);
    if (to.captures) {
      this.captured.push(to.captures);
      if (to.captures_on) {
        this.set(to.captures_on);
      }
    }
    if (promote) {
      this.set(to, Piece.asPromotion(p.color, promote, to));
    } else {
      this.set(to, p.move(to));
    }
    if (to.castling) {
      var rook = this.piece_at(to.rook_from);
      this.set(to.rook_to, rook.move(to.rook_to));
      this.set(to.rook_from);
    }
    return new Move_Coords(from, to);
  }
  /*Move_Coords*/move_byAlgebra(/*i*/color, /*s*/move) {
    var m = new PGN.Move(color, move);
    return this.move_byPGNMove(m);
  }
  /*Move_Coords*/move_byPGNMove(/*PGN.Move*/m) {
    var pieces = this.pieces(p => 
      p.color == m.color && 
      p.char == m.piece && 
      p.hits(this).has(m.dest) && 
      p.pos.f == (m.disamb_f || p.pos.f) && 
      p.pos.r == (m.disamb_r || p.pos.r)
    )
    if (pieces.length > 1) {
      throw "Can't disambiguate";
    }
    if (pieces.length == 0) {
      throw "Source piece not found";
    }
    return this.move(pieces[0].pos, m.dest, m.promote);    
  }
  /*PGN.Move*/move_byString(/*s*/from, /*s*/to, /*s*/promote) {
    var from = Coord.fromString(from);
    var to = Coord.fromString(to);
    this.move(from, to, promote);
    return PGN.Move.fromBoardMove(this, promote);
  }
  move_undo() {
    var u = this.undo;
    if (u) {
      this.set(u.from, u.piece.move_undo());
      if (u.captures) {
        this.set(u.to, u.captures);
        if (u.captures_on) {
          this.set(u.captures_on);
        }
        this.captured.pop();
      } else {
        this.set(u.to);
      }
      if (u.rook_from) {
        this.set(u.rook_from, this.piece_at(u.rook_to));
        this.set(u.rook_to);
      }
      this.undo = null;
    }
  }
  /*Pieces|null*/inCheck(/*i*/color) {
    var king = this.king(/*i*/color);
    var pieces = this.pieces(p => p.color == -color && p.hits(this).has(king.pos));
    return pieces.length ? pieces : null;
  }
  /*b*/inMate(/*i*/color) {
    return this.inCheck(/*i*/color) && ! this.validMoves(/*i*/color);
  }
  /*Move[]|null*/validMoves(/*i*/color) {
    var moves = [];
    var pieces = this.pieces(p => p.color == color);
    var undo = this.undo;
    pieces.forEach(p => {
      p.hits(this).forEach(to => {
        if (to.castling) {
          this.move(p.pos, to.rookTo);
          this.move_undo();
          if (! this.inCheck(/*i*/color)) {
            this.move(p.pos, to);
            if (! this.inCheck(/*i*/color)) {
              moves.push(new Board.Move(p, to));
            }
            this.move_undo();
          }
        } else {
          this.move(p.pos, to);
          if (! this.inCheck(/*i*/color)) {
            moves.push(new Board.Move(p, to));
          }
          this.move_undo();          
        }
      })
    })
    this.undo = undo;
    return moves.length ? moves : null;
  }
  /*Piece|null*/at(/*Coord*/pos) {
    return this.cells[pos.f][pos.r];
  }
  /*b*/empty_at(/*Coord*/pos) {
    if (pos) {
      return ! this.at(pos);
    }
  }
  /*Piece|null*/piece_at(/*Coord*/pos) {
    if (pos) {
      return this.at(pos);
    }
  }
  /*Pieces*/pieces(/*fn*/filter) {
    var a = new Pieces();
    this.each((f, r, piece) => {
      if (piece && (! filter || filter && filter(piece))) {
        a.push(piece);
      }
    });
    return a;
  }
  /*King*/king(/*i*/color) {
    return this.pieces(p => p.color == color && p.king)[0];
  }
  toString() {
    var s = '', p;
    for (var r = 8; r >= 1; r--) {
      var color = (r <= 2) ? 1 : -1;
      for (var f = 1; f <= 8; f++) {
        p = this.cells[f][r];
        if (p) {
          s += p.char;
        } else {
          s += '.';
        }
        s += ' ';
      }
      s += '\n';
    }
    return s;
  }
  set(pos, value) {
    this.cells[pos.f][pos.r] = value;
  }
  each(fn/*(f, r, piece)*/) {
    this.cells.each((file, f) => file.each((piece, r) => fn(f, r, piece)));    
  }
}
Board.Undo = class {
  /*
   Coord from
   Coord to
   Piece piece
   Piece captures
   Coord captures_on
   i castling
   Coord rook_from
   Coord rook_to
   */
  constructor(from, to, piece, captures, captures_on, castling, rook_from, rook_to) {
    this.from = from;
    this.to = to;
    this.piece = piece;
    this.captures = captures;
    this.captures_on = captures_on;
    this.castling = castling
    this.rook_from = rook_from;
    this.rook_to = rook_to;
  }
}
Board.Move = class {
  /*
   Piece piece
   Coord to
   */
  constructor(piece, to) {
    this.piece = piece;
    this.to = to;
  }
}
class Coords extends Array {
  /*Coord*/has(coord) {
    return this.find(c => c.equals(coord));
  }
  static all() {
    var me = new Coords();
    for (var f = 1; f <= 8; f++) {
      for (var r = 1; r <= 8; r++) {
        me.push(new Coord(f, r));
      }
    }
    return me;
  }
}
class Move_Coords {
  constructor(/*Coord*/from, /*Coord*/to) {
    this.from = from;
    this.to = to;
  }
}
class Coord {
  /*
   i f
   i r
   Piece captures
   Coord captures_on (if enpassant)
   i castling (-2 if qs, +2 if ks)
   Coord rook_from (if castle)
   Coord rook_to (if castle)
   */
  constructor(f, r) {
    this.f = f;
    this.r = r;
  }
  inbounds() {
    return this.f > 0 && this.f < 9 && this.r > 0 && this.r < 9;
  }
  equals(that) {
    return this.f == that.f && this.r == that.r;
  }
  toString() {
    return Coord.fileAsChar(this.f) + this.r;
  }
  clone() {
    return new Coord(this.f, this.r);
  }
  //
  static fromString(s/*ex. e2*/) {
    return new Coord(s.charCodeAt(0) - 96, +s.substr(1));
  }
  static offset(coord, df, dr) {
    var dest = new Coord(coord.f + df, coord.r + dr);
    return dest.inbounds() && dest;
  }
  static asEnpassant(coord, df, dr, captures, captures_on) {
    var me = Coord.offset(coord, df, dr);
    me.captures = captures;
    me.captures_on = captures_on;
    return me;
  }
  static asCastle(coord, df, rook_from, rook_to) {
    var me = Coord.offset(coord, df, 0);
    me.castling = df;
    me.rook_from = rook_from;
    me.rook_to = rook_to;
    return me;
  }
  static asHit(board, piece, df, dr, coord/*=null*/) {
    var dpos = Coord.offset(coord || piece.pos, df, dr);
    if (dpos) {
      var dpiece = board.piece_at(dpos);
      if (dpiece && dpiece.color == -piece.color) {
        dpos.captures = dpiece;
      }
      if (! dpiece || dpos.captures) {
        return dpos;
      }
    }
  }
  static fileAsChar(f) {
    return String.fromCharCode(96 + f);
  }
  static fileAsInt(f) {
    return f.charCodeAt(0) - 96;
  }
}
class Delta {
  /*
   i f
   i r
   */
  constructor(f, r) {
    this.f = f;
    this.r = r;
  }
}
class Deltas extends Array {
  constructor(...a) {
    super();
    for (var i = 0; i < a.length; i = i + 2) {
      this.push(new Delta(a[i], a[i + 1]));
    }
  }
}
Deltas.KNIGHT = new Deltas(-1, 2, 1, 2, 2, 1, 2, -1, 1, -2, -1, -2, -2, -1, -2, 1);
Deltas.BISHOP = new Deltas(-1, 1, 1, 1, 1, -1, -1, -1);
Deltas.ROOK = new Deltas(0, 1, 1, 0, 0, -1, -1, 0);
Deltas.QUEEN = Deltas.BISHOP.concat(Deltas.ROOK);
//
class Pieces extends Array {
}
class Piece {
  /*
   Coord pos
   Coord initpos
   color
   moved
   */
  constructor(/*i*/color, /*i*/f, /*i*/r, /*s*/name) {
    this.color = color;
    this.initpos = new Coord(f, r);
    this.pos = this.initpos;
    if (color == Piece.BLACK) {
      this.black = 1;
    } else {
      this.white = 1;
    }
    this.name = name;
    this[name] = 1;
    this.char = this.toString();
    this.char2 = (this.black ? 'b' : 'w') + this.char.toLowerCase();
  }
  move(pos) {
    this.undo = new Piece.Undo(this.pos.clone(), this.moved);
    this.pos = pos;
    this.moved = 1;
    return this;
  }
  move_undo() {
    if (this.undo) {
      this.pos = this.undo.pos;
      this.moved = this.undo.move;
      this.undo = null;
    }
    return this;
  }
  hits(board, deltas, single) {
    var coords = new Coords(), c;
    deltas.forEach(delta => {
      c = Coord.asHit(board, this, delta.f, delta.r);
      while(c) {
        coords.push(c);
        c = single ? null : Coord.asHit(board, this, delta.f, delta.r, c);
      }      
    })
    return coords;    
  }
  toString() {
    if (this.pawn) {
      return this.black ? 'p' : 'P';
    }
    if (this.rook) {
      return this.black ? 'r' : 'R';
    }
    if (this.knight) {
      return this.black ? 'n' : 'N';
    }
    if (this.bishop) {
      return this.black ? 'b' : 'B';
    }
    if (this.queen) {
      return this.black ? 'q' : 'Q';
    }
    if (this.king) {
      return this.black ? 'k' : 'K';
    }    
  }
  static asPromotion(/*i*/color, /*s*/piece, /*Coord*/pos) {
    switch (piece) {
      case 'Q':
        return new Piece.Queen(color, pos.f, pos.r);
      case 'R':
        return new Piece.Rook(color, pos.f, pos.r);
      case 'N':
        return new Piece.Knight(color, pos.f, pos.r);
      case 'B':
        return new Piece.Bishop(color, pos.f, pos.r);     
    }
  }
}
Piece.Undo = class {
  /*
   Coord pos
   b moved
   */
  constructor(pos, moved) {
    this.pos = pos;
    this.moved = moved;
  }
}
Piece.BLACK = -1;
Piece.WHITE = 1;
//
Piece.Pawn = class extends Piece {
  constructor(color, f, r) {
    super(color, f, r, 'pawn');
  }
  move(pos) {
    super.move(pos);
    this.enpassantable = (pos.f == this.initpos.f && (pos.r - this.initpos.r) == 2 * this.color);
    return this;
  }
  hits(board) {
    var coords = new Coords(), c;
    if (! this.moved) {
      c = Coord.offset(this.pos, 0, 2 * this.color);
      coords.pushIf(c && board.empty_at(c), c);
    } else {
      c = this.coord_enpassant(board, -1);
      coords.pushIf(c);
      c = this.coord_enpassant(board, 1);
      coords.pushIf(c);      
    }
    c = Coord.offset(this.pos, 0, this.color);
    coords.pushIf(c && board.empty_at(c), c);
    c = Coord.asHit(board, this, -1, this.color);
    coords.pushIf(c && c.captures, c);
    c = Coord.asHit(board, this, 1, this.color);
    coords.pushIf(c && c.captures, c);
    return coords;
  }
  //
  coord_enpassant(board, df) {
    var ec = Coord.offset(this.pos, df, 0);
    var ep = board.piece_at(ec);
    if (ep && ep.color != this.color && ep.enpassantable) {
      return Coord.asEnpassant(this.pos, df, this.color, ep, ec);
    }
  }
}
Piece.Knight = class extends Piece {
  constructor(color, f, r) {
    super(color, f, r, 'knight');
  }
  hits(board) {
    return super.hits(board, Deltas.KNIGHT, true);
  }
}
Piece.Bishop = class extends Piece {
  constructor(color, f, r) {
    super(color, f, r, 'bishop');
  }
  hits(board) {
    return super.hits(board, Deltas.BISHOP);
  }  
}
Piece.Rook = class extends Piece {
  constructor(color, f, r) {
    super(color, f, r, 'rook');
  }
  hits(board) {
    return super.hits(board, Deltas.ROOK);
  }  
}
Piece.Queen = class extends Piece {
  constructor(color, f, r) {
    super(color, f, r, 'queen');
  }
  hits(board) {
    return super.hits(board, Deltas.QUEEN);
  }  
}
Piece.King = class extends Piece {
  constructor(color, f, r) {
    super(color, f, r, 'king');
  }
  hits(board) {
    var coords = super.hits(board, Deltas.QUEEN, true);
    if (! this.moved) {
      var c, rookFrom, rookTo, rook;
      rookFrom = Coord.offset(this.pos, -4, 0);
      rookTo = Coord.offset(this.pos, -1, 0);
      c = Coord.asCastle(this.pos, -2, rookFrom, rookTo);
      if (board.empty_at(c) && board.empty_at(rookTo) && board.empty_at(Coord.offset(this.pos, -3, 0))) {
        rook = board.piece_at(rookFrom);
        if (rook && ! rook.moved) {
          coords.push(c);
        }
      }
      rookFrom = Coord.offset(this.pos, 3, 0);
      rookTo = Coord.offset(this.pos, 1, 0);
      c = Coord.asCastle(this.pos, 2, rookFrom, rookTo);
      if (board.empty_at(c) && board.empty_at(rookTo)) {
        rook = board.piece_at(rookFrom);
        if (rook && ! rook.moved) {
          coords.push(c);
        }
      }
    }
    return coords;
  }  
}
class PGN {
  /*
   source
   Tags tags
   Plays plays
   */
  constructor(/*s*/source) {
    this.source = source;
    var s = this.removeLfs(this.source);
    var s = this.parseTags(s);
    this.parsePlays(s);
  }
  //
  parsePlays(s) {
    s = s.replace('1 - 0', '1-0');
    s = s.replace('0 - 1', '0-1');
    s = s.replace('1/2 - 1/2', '1/2-1/2');    
    var words = new PGN.Words(s.split(' '));
    var mi = 1;
    var color = 1;
    this.plays = new PGN.Plays(words, mi, color);
  }
  parseTags(s) {
    this.tags = new PGN.Tags();
    var a = s.split(']');
    for (var i = 0; i < a.length - 1; i++) {
      this.tags.add(a[i]);
    }
    s = a[a.length - 1].trim();
    return s;
  }
  removeLfs(s) {
    var a = s.split(/\r?\n/);
    s = '';
    a.forEach(line => s += line.trim() + ' ');
    return s;
  }
}
PGN.MoveIndex = class {
  /*
   i i
   i color
   */
  constructor(mi, color) {
    this.mi = mi || 1;
    this.color = color || 1;
  }
  next() {
    this.color = -this.color;
    if (this.color == 1) {
      this.mi++;
    }
  }
  toString(asStart) {
    var s = '';
    if (this.color == 1 || asStart) {
      s = this.mi + (this.color == 1) ? '.' : '...';
    }
    return s;
  }
}
PGN.Words = class extends Array {
  constructor(a) {
    super(...a);
    this.source = a;
    this.i = 0;
  }
  eof() {
    return this.i >= this.length;
  }
  get() {
    if (this.i < this.length) {
      if (this[this.i] == '') {
        return this.get_next();
      }
      return this[this.i]; 
    }
  }
  get_next() {
    this.i++;
    return this.get();
  }
  get_text() {
    if (this.eof()) {
      return;
    } 
    var s = this.get();
    if (s == '1-0' || s == '0-1' || s == '1/2-1/2') {
      this.i++;
      return s;
    }
    if (s.substr(0, 1) == '{') {
      var s = '';
      for (var j = this.i; j < this.length; j++) {
        s += this[j] + ' ';
        if (this[j].substr(-1) == '}') {
          break;
        }
      }
      if (j >= this.length) {
        throw 'Missing closing annotation tag';
      }
      this.i = j + 1;
      return s.replace(/{|}/g,'').trim();
    }
  }
  get_move() {
    if (this.eof()) {
      return;
    } 
    var a = this.get().split('.'), s;
    if (! Number.isNaN(a[0])) {
      if (a.length > 0 && a[a.length - 1].length) {
        s = a[a.length - 1];
      } else {
        s = this.get_next();
      }
      this.i++;
      return s;
    }
  }
  get_var() {
    if (this.eof()) {
      return;
    } 
    if (this.get().substr(0, 1) == '(') {
      var pc = 0;
      for (var j = this.i; j < this.length; j++) {
        if (this[j].substr(0, 1) == '(') {
          pc++;
        }
        for (var k = pc; k > 0; k--) {
          if (this[j].substr(-k, 1) == ')') {
            pc--;
          }
        }
        if (pc == 0) {
          break;            
        }
      }
      if (j >= this.length) {
        throw 'Missing closing variation tag';
      }
      this[this.i] = this[this.i].substr(1);
      this[j] = this[j].slice(0, -1);
      var a = this.slice(this.i, ++j);
      this.i = j;
      return a;
    }
  }
  slice(i, j) {
    var a = [];
    for (var k = i; k <= j; k++) {
      a.push(this[k]);
    }
    return new PGN.Words(a);
  }
}
PGN.Plays = class extends Array {
  constructor(words, mi, color) {
    super();
    this.words = words;
    this.mix = new PGN.MoveIndex(mi, color);
    this.parse();
  }
  parse() {
    if (! this.words.eof()) {
      var text = this.words.get_text();
      var play = new PGN.Play(this.mix, text);
      if (! this.words.eof()) {
        var s = this.words.get_move();
        if (! s) {
          throw 'Parse error: expected move';
        }
        play.move = new PGN.Move(this.mix.color, s);
        play.text = this.words.get_text();
        var plays = this.words.get_var();
        if (plays) {
          play.vars = new PGN.Plays(plays, this.mix.mi, this.mix.color);
        }
      }
      this.push(play);
      this.mix.next();
      this.parse();      
    }
  }
}
PGN.Play = class {
  /*
   i mi (move index)
   i color
   s beforeText
   Move move
   s text
   Plays var
   */
  constructor(mix, text) {
    this.mi = mix.mi;
    this.color = mix.color;
    this.beforeText = text;
  }
}
PGN.Tags = class extends Array {
  /*
   site
   date
   white
   black ..etc (whatever provided)
   */
  add(s) {
    var a = s.split('[');
    a = a[a.length - 1].split('"');
    if (a.length >= 2) {
      let tag = new PGN.Tag(a[0], a[1]);
      this.push(tag);
      this[tag.name.toLowerCase()] = tag.value;
    } else {
      throw "Invalid tag";
    }
  }
}
PGN.Tag = class {
  /*
   name
   value
   */
  constructor (name, value) {
    this.name = name.trim();
    this.value = value.trim();
  }
}
PGN.Move = class {
  /*
   s source // e.g. 'Bxe4+'
   i color
   s piece // case-sensitive, e.g. 'q'
   s disamb_f
   i disamb_r
   s castle // 'K' or 'Q' 
   s capture // case-sensitive, e.g. 'p'
   Coord dest
   s promote // e.g. 'Q'
   b check 
   b mate
   */
  constructor(/*i*/color, /*s*/move) {
    this.color = color;
    this.source = move;
    var s = move.replace(/\?|!/g,'');
    s = s.replace(/o|0/g,'O');
    if (s.substr(0, 5) == 'O-O-O') {
      this.castle = 'Q';
      this.dest = Coord.fromString(this.color == -1 ? 'c8' : 'c1');
      s = substr(5);
    }
    if (s.substr(0, 3) == 'O-O') {
      this.castle = 'K';
      this.dest = Coord.fromString(this.color == -1 ? 'g8' : 'g1');
      s = s.substr(3);
    }
    if (this.castle) {
      this.piece = color == -1 ? 'k' : 'K';
    }
    if (s.slice(-1) == '#') {
      this.mate = 1;
      s = s.slice(0, -1);
    }
    if (s.slice(-1) == '+') {
      this.check = 1;
      s = s.slice(0, -1);
    }
    if (s.slice(-2, -1) == '=') {
      this.promote = s.slice(-1);
      s = s.slice(0, -2);
    }
    if (s.length) {
      var d = s.slice(-2);
      this.dest = Coord.fromString(d);
      if (! this.dest.inbounds()) {
        throw "Invalid dest: " + d;
      }
      s = s.slice(0, -2);
      if (s.slice(-1) == 'x') {
        this.capture = 1;
        s = s.slice(0, -1);
      }
      if (s.charCodeAt(0) <= 82) {
        this.piece = s.substr(0, 1);
        s = s.substr(1);
      } else {
        this.piece = 'P';
      }
      if (color == -1) {
        this.piece = this.piece.toLowerCase();
      }
    }
    if (s.length == 2) {
      this.disamb_f = Coord.fileAsInt(s);
      this.disamb_r = s.substr(1, 1);
    } else if (s.length == 1) {
      if (s.charCodeAt(0) < 57) {
        this.disamb_r = s;
      } else {
        this.disamb_f = Coord.fileAsInt(s);
      }
    }
  }
  toString() {
    return this.source;
  }
  static fromBoardMove(/*Board*/board, /*s*/promote) {
    var u = board.undo;
    var piece = u.piece;
    var from = u.from;
    var to = u.to;
    var color = piece.color;
    var s = '';
    if (u.castling) {
      s += (u.castling < 0) ? 'O-O-O' : 'O-O';
    } else if (piece.pawn) {
      if (u.captures) {
        s = from.toString().substr(0, 1);
      }
    } else {      
      s += piece.char.toUpperCase();
      let others = board.pieces(p => p !== piece && p.color == color && p.hits(board).has(to));
      let fsame, rsame;
      others.forEach(p => {
        if (p.pos.f == from.pos.f) {
          fsame = true;
        }
        if (p.pos.r == from.pos.r) {
          rsame = true;
        }
      })
      if (rsame) {
        s += Coord.fileAsString(from.pos.f);
      }
      if (fsame) {
        s += from.pos.r;
      }
    }
    if (u.captures) {
      s += 'x';
    }
    s += u.captures_on ? u.captures_on.toString() : to.toString();
    if (promote) {
      s += '=' + promote;
    }
    if (board.inMate(-color)) {
      s += '#';
    } else if (board.inCheck(-color)) {
      s += '+';
    }
    return new PGN.Move(color, s);
  }
}