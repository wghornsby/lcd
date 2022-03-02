class Yordle {
  /**
   * i len (word length)
   * i tries (how many attempts)
   * i mode (1=no word lookup, 2=normal, 3=revealed hints must be used in subsequent guesses)
   * s word
   * Trays trays
   */
  constructor(len, tries, mode) {
    this.len = len || 5;
    this.tries = tries || 6;
    this.mode = mode || 2;
    this.trays = Yordle.Trays.create(this.len, this.tries);
    this.wordlist = Yordle.Wordlist.create(this.len);
    this.keyboard = new Yordle.Keyboard();
  }
  reset(word) {
    this.word = word || this.wordlist.random();
    this.trays.reset();
    this.keyboard.reset();
    this.results = [];
    return this;
  }
  set(letter) {
    return this.tray().set(letter); // true if letter set
  }
  backspace() {
    this.tray().backspace();
  }
  enter(guess/*=null*/) {
    if (guess) {
      for (let i = 0; i < guess.length; i++) {
        this.set(guess[i]);
      }
    }
    var tray = this.tray();
    if (tray.isFull()) {
      if (this.mode == 3 && this.prevTray) {
        let err = this.hardVerify(tray);
        if (err) {
          return {error:err};
        }
      }
      if (this.mode >= 2) {
        let guess = tray.getGuess();
        if (guess != this.word && ! this.wordlist.verify(guess)) {
          return {
            error:'Not in word list',
            guess:guess};
        }
      }
      let r = this.trays.enter(this.word); // 1=try again, 2=win, 3=lose
      this.keyboard.setFromTray(tray);
      this.prevTray = tray;
      return this.result(tray, r);
    }
  }
  getKeyColor(letter) {
    return this.keyboard.get(letter); // 0=unused, 1=wrong, 2=yellow, 3=green
  }
  tiles(fn) {
    this.trays.forEach(tray => tray.tiles.forEach(tile => fn(tile)));
  }
  aitoggle(id) { 
    this.tray().tile(id)?.toggleColor();
  }
  aiok() {
    var tray = this.tray(), r;
    if (tray.isCorrect()) {
      r = 2;
    } else {
      if (tray.ix < this.trays.length - 1) {
        this.trays.next();
        r = 1;
      } else {
        r = 3;
      }
    }
    var result = this.result(tray, r);
    this.results.push(result);
    return result;
  }
  aicolor() {
    var tray = this.tray();
    tray.tiles.forEach(tile => tile.setColor(1));
    if (tray.ix == 0) {
      return;
    }
    var prev = this.trays[tray.ix - 1];
    var yellows = [];
    prev.tiles.forEach(tile => {
      if (tile.isYellow()) {
        yellows.push(tile.guess);
      } else if (tile.isGreen()) {
        tray.tiles[tile.ix].setColor(3);
      }
    })
    if (yellows.length) {
      tray.tiles.forEach(tile => {
        if (! tile.isGreen()) {
          var i = yellows.findIndex(s => s == tile.guess);
          if (i > -1) {
            let ambig = 0;
            tray.tiles.forEach((other, o) => {
              if (other.ix != tile.ix && ! other.isGreen() && other.guess == tile.guess) {
                ambig = 1;
              }
            })
            if (! ambig) {
              tile.setColor(2);
              yellows[i] = ' ';
            }
          }
        }
      })
    }
  }
  ainotfound() {
    if (this.tray().ix) {
      var guess = this.tray().getGuess();
      this.tray().reset();
      return {
        error:'Not in word list',
        guess:guess};  
    }
  }
  aiundo() {
    var ix = this.tray().ix - 1;
    if (ix < 0) {
      return;
    }
    this.tray().reset();
    this.trays.ix--;
    this.results = this.results.filter(r => r.tray.ix < ix);
    return this.results;
  }
  //
  result(tray, r) {
    let result = {
      tray:tray,
      win:r == 2,
      lose:r == 3,
      retry:r == 1
    }
    if (r.lose) {
      result.word = this.word;
    }
    return result;
  }
  tray() {
    return this.trays.active();
  }
  tile() {
    return this.tray().tiles.active();
  }
  hardVerify(tray) {
    var yellows = '';
    for (var i = 0; i < tray.tiles.length; i++) {
      let lt = this.prevTray.tiles[i];
      let t = tray.tiles[i];
      if (lt.isGreen() && lt.guess != t.guess) {
        return nth(i + 1) + ' letter must be ' + lt.guess;
      }
      if (lt.isYellow()) {
        yellows += lt.guess;
      }
    }
    tray.tiles.forEach(tile => yellows = yellows.replace(tile.guess, ''));
    if (yellows.length) {
      return 'Guess must contain ' + yellows.substring(0, 1);
    }
  }
  //
  static hardMode(len/*=5*/, tries/*=6*/) {
    return new Yordle(len, tries, 3);
  }
}
Yordle.Trays = class extends Array {
  /**
   * i ix
   */
  constructor(e) {
    super(e);
  }
  reset() {
    this.ix = 0;
    this.forEach(tray => tray.reset());
  }
  active() {
    return this[this.ix];
  }
  enter(word) {
    var r = this.active().enter(word);
    if (r == 2) {
      return 2/*win*/;
    }
    if (r == 1) {
      this.next();
      return this.isDone() ? 3/*lose*/ : 1/*try again*/;
    }
  }
  next() {
    if (this.ix < this.length - 1) {
      this.ix++;
    }
  }
  isDone() {
    return this[this.length - 1].isDone();
  }
  clone() {
    var trays = [];
    this.forEach(tray => trays.push(tray.clone()));
    trays = Yordle.Trays.from(trays);
    trays.ix = this.ix;
    return trays;
  }
  //
  static create(len, tries) {
    return Yordle.Trays.from({length:tries}, (v, i) => new Yordle.Tray(len, i));
  }
}
Yordle.Tray = class {
  /**
   * Tiles tiles 
   * i ix
   */
  constructor(len, ix, tiles/*=null*/) {
    this.ix = ix;
    this.tiles = tiles || Yordle.Tiles.create(len, ix);
  }
  reset() {
    this.tiles.reset();
    this.done = null;
  }
  set(letter) {
    return this.tiles.set(letter);
  }
  backspace() {
    this.tiles.backspace();
  }
  enter(word) {
    if (this.tiles.enter(word)) {
      this.done = true;
      return this.isCorrect() ? 2 : 1;
    }
  }
  getGuess() {
    return this.tiles.getGuess();
  }
  isCorrect() {
    return this.tiles.isCorrect();
  }
  isFull() {
    return this.tiles.isFull();
  }
  isDone() {
    return this.done;
  }
  totalWrong() {
    return this.tiles.filter(tile => tile.isWrong()).length;
  }
  tile(id) {
    return this.tiles.byId(id);
  }
  clone() {
    return new Yordle.Tray(null, this.ix, this.tiles.clone());
  }
}
Yordle.Tiles = class extends Array {
  /**
   * i ix
   */
  constructor(e) {
    super(e);
  }
  reset() {
    this.ix = 0;
    this.forEach((tile, i) => tile.reset());
  }
  set(letter) {
    var tile = this.active();
    if (tile.isEmpty()) {
      tile.set(letter);
      this.next();
      return true;
    }
  }
  backspace() {
    var tile = this.active();
    if (tile.isEmpty()) {
      this.prev().reset();
    } else {
      tile.reset();
    }
  }
  enter(word) {
    if (this.isFull()) {
      word = word.split('');
      this.forEach((tile, i) => {
        if (tile.guess == word[i]) {
          tile.setColor(3);
          word[i] = '/';
        }
      })
      this.forEach((tile, i) => {
        if (tile.color == 0) {
          word.forEach((letter, w) => {
            if (tile.color == 0 && tile.guess == letter) {
              tile.setColor(2);
              word[w] = '/';
            }
          })
          if (tile.color == 0) {
            tile.setColor(1);
          }
        }
      })
      return true;
    }
  }
  getGuess() {
    var word = '';
    this.forEach(tile => word += tile.guess);
    return word;
  }
  isCorrect() {
    return this.every(tile => tile.color == 3);
  }
  isFull() {
    return ! this[this.length - 1].isEmpty();
  }
  active() {
    return this[this.ix];
  }
  next() {
    if (this.ix < this.length - 1) {
      this.ix++;
    }
  }
  prev() {
    if (this.ix > 0) {
      this.ix--;
    }
    return this.active();
  }
  byId(id) {
    for (let i = 0; i < this.length; i++) {
      if (this[i].id == id) {
        return this[i];
      }
    }
  }
  clone() {
    var tiles = [];
    this.forEach(tile => tiles.push(tile.clone()))
    tiles = Yordle.Tiles.from(tiles);
    tiles.ix = this.ix;
    return tiles;
  }
  //
  static create(len, ix) {
    return Yordle.Tiles.from({length:len}, (v, i) => new Yordle.Tile(i, ix));
  }
}
Yordle.Tile = class {
  /**
   * i ix
   * i iy
   * s id
   * s guess
   * i color (0=none, 1=wrong, 2=yellow, 3=green)
   */
  constructor(ix, iy, guess/*=null*/, color/*=null*/) {
    this.ix = ix;
    this.iy = iy;
    this.id = 'T' + iy + 'x' + ix;
    this.guess = guess;
    this.color = color;
  }
  reset() {
    this.guess = '';
    this.color = 0;
  }
  set(guess) {
    this.guess = guess;
  }
  setColor(color) {
    this.color = color;
  }
  toggleColor() {
    this.color = this.color == 3 ? 1 : this.color + 1;
  }
  isGreen() {
    return this.color == 3;
  }
  isYellow() {
    return this.color == 2;
  }
  isWrong() {
    return this.color == 1;
  }
  isBlack() {
    return this.color == 0;
  }
  isEmpty() {
    return this.guess == '';
  }
  in(tray) {
    return this.iy == tray?.ix;
  }
  clone() {
    return new Yordle.Tile(this.ix, this.iy, this.guess, this.color);
  }
}
Yordle.Wordlist = class {
  constructor(words) {
    this.words = words;
  }
  random() {
    var i = Math.floor(Math.random() * Math.floor(this.words.length));
    var word = this.words[i];
    this.words.splice(i, 1);
    return word;
  }
  verify(guess) {
    return validwords.findIndex(word => word == guess) > -1;
  }
  //
  static create(len) {
    return new Yordle.Wordlist(words[len]);
  }
}
Yordle.Keyboard = class {
  constructor() {
    this.map = {};
  }
  reset() {
    for (var i = 65; i <= 90; i++) {
      this.map[String.fromCharCode(i)] = 0;
    }
  }
  get(letter) {
    return this.map[letter];
  }
  setFromTray(tray) {
    tray.tiles.forEach(tile => this.set(tile.guess, tile.color));
  }
  set(letter, color/*1=wrong, 2=yellow, 3=green*/) {
    this.map[letter] = color;   
  }
}
function nth(i) {
  switch (i) {
    case 1:
      return '1st';
    case 2:
      return '2nd';
    case 3:
      return '3rd';
    default:
      return i + 'th';
  }
}