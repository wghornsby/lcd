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
    this.reset();
  }
  reset(word) {
    this.word = word || this.wordlist.random();
    this.trays.reset(this.word);
    this.keyboard.reset();
    return this;
  }
  set(letter) {
    return this.tray().set(letter); // true if letter set
  }
  backspace() {
    this.tray().backspace();
  }
  enter() {
    var tray = this.tray();
    if (tray.isFull()) {
      if (this.mode == 3 && this.prevTray) {
        let err = this.hardVerify(tray);
        if (err) {
          return {error:err};
        }
      }
      if (this.mode >= 2) {
        let guess = tray.getWord();
        if (guess != this.word && ! this.wordlist.verify(guess)) {
          return {error:"Not in word list"};
        }
      }
      let r = this.trays.enter(); // 1=try again, 2=win, 3=lose
      this.keyboard.setFromTray(tray);
      this.prevTray = tray;
      return {
        tray:tray,
        win:r == 2,
        lose:r == 3
      };
    }
  }
  getKeyColor(letter) {
    return this.keyboard.get(letter); // 0=unused, 1=wrong, 2=yellow, 3=green
  }
  tiles(fn) {
    this.trays.forEach(tray => tray.tiles.forEach(tile => fn(tile)));
  }
  //
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
}
Yordle.Trays = class extends Array {
  /**
   * i ix
   */
  constructor() {
    super();
  }
  reset(word) {
    this.ix = 0;
    this.forEach(tray => tray.reset(word));
  }
  active() {
    return this[this.ix];
  }
  enter() {
    var r = this.active().enter();
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
  //
  static create(len, tries) {
    return Yordle.Trays.from({length:tries}, (v, i) => new Yordle.Tray(len, i));
  }
}
Yordle.Tray = class {
  /**
   * Tiles tiles 
   * i ix
   * s word
   */
  constructor(len, ix) {
    this.ix = ix;
    this.tiles = Yordle.Tiles.create(len, ix);
  }
  reset(word) {
    this.word = word;
    this.tiles.reset(word);
    this.done = null;
  }
  set(letter) {
    return this.tiles.set(letter);
  }
  backspace() {
    this.tiles.backspace();
  }
  enter() {
    if (this.tiles.enter()) {
      this.done = true;
      return this.isCorrect() ? 2 : 1;
    }
  }
  getWord() {
    return this.tiles.getWord();
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
}
Yordle.Tiles = class extends Array {
  /**
   * i ix
   * s word
   */
  constructor() {
    super();
  }
  reset(word) {
    this.word = word;
    this.ix = 0;
    this.forEach((tile, i) => tile.reset(word));
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
  enter() {
    if (this.isFull()) {
      var word = this.word.split('');
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
  getWord() {
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
  //
  static create(len, ix) {
    return Yordle.Tiles.from({length:len}, (v, i) => new Yordle.Tile(i, ix));
  }
}
Yordle.Tile = class {
  /**
   * i ix
   * s id
   * s guess
   * i color (0=none, 1=wrong, 2=yellow, 3=green)
   */
  constructor(ix, iy) {
    this.ix = ix;
    this.id = 'T' + iy + 'x' + ix;
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
  isGreen() {
    return this.color == 3;
  }
  isYellow() {
    return this.color == 2;
  }
  isEmpty() {
    return this.guess == '';
  }
}
Yordle.Wordlist = class extends Array {
  constructor() {
    super();
  }
  random() {
    var i = Math.floor(Math.random() * Math.floor(this.length));
    return this[i].toUpperCase();
  }
  verify(guess) {
    return validwords.findIndex(word => word == guess) > -1;
  }
  //
  static create(len) {
    return Yordle.Wordlist.from(words[len]);
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