const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function(event, fn, options) {
  this.addEventListener(event, fn, options);
  return this;
}
Node.prototype.on_once = window.on_once = function(event, fn) {
  this.addEventListener(event, fn, {once:true});
  return this;
}
NodeList.prototype.on = function(name, fn, options) {
  this.forEach((elem, i) => {elem.on(name, fn, options)});
  return this;
}
class Ui {
  on(event, fn) {
    var _events = Symbol.for('Ui.events');
    if (this[_events] === undefined) {
      this[_events] = {};
    }
    if (this[_events][event]) {
      this[_events][event].push(fn);
    } else {
      this[_events][event] = [fn];
      this['on' + event] = function() {
        var r;
        for (var i = 0; i < this[_events][event].length; i++) {
          r = this[_events][event][i](...arguments);
        }
        return r;
      }.bind(this);
    }
    return this;
  }
  bubble(event, ctx, targetevent) {
    return this.on(event, function(...args) {
      this[targetevent || ('on' + event)](...args)
    }.bind(ctx))
  }
}
function delay(ms, fn) {
  setTimeout(fn, ms);
}
function pct(n, d) {
  return round(n / d * 100.);
}
function round(x) {
  return (Math.round(x * 100) / 100).toFixed(2);
}
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
    return this.result(tray, r);
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
            tile.setColor(2);
            yellows[i] = ' ';
          }
        }
      })
    }
  }
  airedo() {
    var guess = this.tray().getGuess();
    this.tray().reset();
    return {
      error:'Not in word list',
      guess:guess};
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
  constructor() {
    super();
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
  constructor(len, ix) {
    this.ix = ix;
    this.tiles = Yordle.Tiles.create(len, ix);
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
  tile(id) {
    return this.tiles.byId(id);
  }
}
Yordle.Tiles = class extends Array {
  /**
   * i ix
   */
  constructor() {
    super();
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
  constructor(ix, iy) {
    this.ix = ix;
    this.iy = iy;
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
class UiPage extends Ui {
  /**
   * UiBoard uiboard
   */
  constructor(aimode) {
    super();
    this.yordle = Yordle.hardMode();
    this.uiboard = new UiBoard(this.yordle, aimode);
    this.uikeyboard = new UiKeyboard(aimode)
      .on('click', text => this.uikeyboard_onclick(text));
    if (aimode) {
      this.ai = new YordleAi();
      this.resetTitle();
      this.playai();
    } else {
      window.on('keydown', e => this.onkeydown(e));
    }
  }
  reset() {
    this.uiboard.reset();
    this.uikeyboard.reset(this.ai);
    if (this.ai) {
      this.resetTitle();
      this.ai.reset();
      this.playai();
    }
  }
  resetTitle() {
    $('.title').innerText = 'YORDLE AI';
  }
  playself(result) {
    setTimeout(() => {
      var guess = this.ai.play(result);
      this.uiboard.setGuess(guess);
      let r = this.uiboard.enter();
      if (! r.error) {
        this.uikeyboard.setColors(r.tray);
      }
      if (r.retry) {
        this.playself(r);
      }
      this.winlose(r);
    }, 100);
  }
  playai(result) {
    var guess = this.ai.play(result);
    if (guess == null) {
      if (confirm('i don\'t know your word, so i suspect you messed up the colors')) {
        this.reset();
      }
    } else {
      this.uiboard.setGuess(guess);
      var trays = 5 - this.yordle.tray().ix;
      var words = this.ai.wordlist.length - 1;
      var left = words - trays;
      var odds = left <= trays ? 100. : pct(trays, left);
      if (odds == 100) {
        $('.title').innerText = words == 0 ? 'I WON' : 'RESISTANCE IS FUTILE';
      } else if (odds >= 70 && trays >= 2) {
        $('.title').innerText = 'NEARLY THERE';
      } else if (odds >= 50 && trays >= 2) {
        $('.title').innerText ='GETTING CLOSE NOW';
      } else if (odds >= 30 && trays >= 3) {
        $('.title').innerText = 'THE END IS IN SIGHT';
      } else if (odds >= 10 && trays >= 3) {
        $('.title').innerText = 'GETTING WARM';
      } else {
        $('.title').innerText = odds + '%';
      }
      if (this.ai.redo) {
        $('.title').innerText = 'REDONE, ' + odds + '%';
        return;
      }
      if (words == 0) {
        this.uiboard.win();
        delay(1100, () => this.winlose({win:1}));
      }  
    }
  }
  onkeydown(e) {
    var r;
    switch (e.key) {
      case 'Backspace':
        this.uiboard.backspace();
        return;
      case 'Enter':
        r = this.uiboard.enter();
        if (! r) {
          return;
        }
        if (r.error) {
          alert(r.error);
        } else {
          this.uikeyboard.setColors(r.tray);
          this.winlose(r);
        }
        return;
      case 'OK !':
        r = this.yordle.aiok();
        this.winlose(r);
        if (r.retry) {
          this.playai(r);          
        }
        break;
      case 'REDO':
        r = this.yordle.airedo();
        this.playai(r);
        break;
    }
    var s = e.key.toUpperCase();
    var i = s.charCodeAt(0);
    if (s.length == 1 && i >= 65 && i <= 90) {
      let r = this.uiboard.set(s);
    }
  }
  winlose(r) {
    if (r.win) {
      if (this.ai) {
        if (confirm('we have a weiner')) {
          this.reset();
        } 
      } else {
        delay(500, () => this.uiboard.win());
        delay(1100, () => {
          if (confirm('we have a weiner')) {
            this.reset();
          }
        });
      }
    }
    if (r.lose) {
      if (this.ai) {
        if (confirm('i am such a pathetic loser')) {
          this.reset();
        }
      } else {
        delay(50, () => {
          if (confirm('you are such a pathetic loser! ' + r.word)) {
            this.reset();
          }  
        })
      }
    }
  }
  uikeyboard_onclick(text) {
    var e = {};
    switch (text) {
      case 'ENTER':
        e.key = 'Enter';
        break;
      case '⌫':
        e.key = 'Backspace';
        break;
      default:
        e.key = text;
    }
    this.onkeydown(e);
  }
}
class UiBoard extends Ui {
  /**
   * Yordle yordle
   */
  constructor(yordle, aimode) {
    super();
    this.yordle = yordle;
    this.$grid = $('#grid');
    if (aimode) {
      this.$grid.on('click', e => this.$grid_onclick(e));
    }
    this.reset();
  }
  reset() {
    this.yordle.reset();
    this.$grid.innerHTML = '';
    this.yordle.trays.forEach(tray => {
      var $tr = this.$grid.insertRow();
      tray.tiles.forEach(tile => {
        var $td = $tr.insertCell();
        $td.id = tile.id;
      })
    })
    this.refresh();
  }
  setGuess(guess) {
    var tray = this.yordle.tray();
    for (var i = 0; i < guess.length; i++) {
      this.set(guess.substring(i, i + 1));
    }
    this.yordle.aicolor();
    this.refresh();
  }
  set(letter) {
    this.yordle.set(letter);
    this.refresh();
  }
  enter() {
    var r = this.yordle.enter();
    this.refresh();
    return r;
  }
  backspace() {
    this.yordle.backspace();
    this.refresh();
  }
  win() {
    this.yordle.tray().tiles.forEach(tile => {
      var $td = $('#' + tile.id);
      $td.className = 'win';
    })
  }
  refresh() {
    var tray = this.yordle.tray();
    this.yordle.tiles(tile => {
      var $td = $('#' + tile.id);
      $td.innerText = tile.guess;
      $td.className = 'c' + tile.color;
      if (tile.in(tray)) {
        $td.className += ' pointer';
      }
    })
  }
  $grid_onclick(e) {
    var $td = e.srcElement, tile;
    if ($td.classList.contains('pointer')) {
      this.yordle.aitoggle($td.id);
      this.refresh();
    }
  }
}
class UiKeyboard extends Ui {
  onclick(text) {}
  //
  constructor(aimode) {
    super();
    aimode ? $('#ai').style.display = 'block' : $('#keyboard').style.display = 'block';
    this.$buttons = $$('button')
      .on('click', e => this.onclick(e.srcElement.innerText));
    this.mapButtons();
  }
  reset() {
    this.$buttons.forEach($b => {
      $b.classList.remove('c1', 'c2', 'c3');
    })    
  }
  setColors(tray) {
    tray.tiles.forEach(tile => {
      let $b = this.$map[tile.guess];
      let cn = 'c' + tile.color;
      if (cn > $b.className) {
        $b.className = cn;
      }
    })
  }
  mapButtons() {
    this.$map = {};
    this.$buttons.forEach($b => {
      this.$map[$b.innerText] = $b;
    })
  }
}
class YordleAi {
  /**
   * Wordlist wordlist
   */
  constructor() {
    this.reset();
  }
  reset() {
    this.wordlist = YordleAi.Wordlist.create();
    this.tray = null;
    this.vows = '';
    this.cons = '';
    this.both = '';
    this.played = 0;
    this.redo = 0;
    this.candidates = null;
    YordleAi.VOWS = YordleAi.Letters.asVowels();
    YordleAi.CONS = YordleAi.Letters.asConsonants();
  }
  play(result) {
    if (result) {
      if (result.error && result.guess) {
        this.redo = 1;
        return this.invalid(result.guess);
      }
      this.redo = 0;
      this.process(result);
    }
    if (! this.played) {
      this.played = 1;
      return 'STAND'; // current leader
    }
    return this.guess();
  }
  //
  process(result) {
    this.candidates = null;
    this.tray = result.tray;
    this.counts = this.count(this.tray.tiles);
    this.wordlist.removeWord(this.tray.getGuess());
    this.tray.tiles.forEach(tile => {
      this.wordlist.removeTile(tile, this.counts[tile.guess].count, this.counts[tile.guess].max);
      if (! tile.isWrong()) {
        this.save(tile.guess);
      }
      this.remove(tile.guess);
    })
  }
  guess() {
    if (! this.candidates) {
      this.setCandidates();
    }
    return this.candidates.length == 0 ? null : this.bestCandidate();
  }
  //
  count(tiles) {
    var c = {};
    tiles.forEach(tile => {
      if (c[tile.guess] === undefined) {
        c[tile.guess] = {count:0};
      }
      if (! tile.isWrong()) {
        c[tile.guess].count = c[tile.guess].count + 1;
      }
    })
    tiles.forEach(tile => {
      if (tile.isWrong()) {
        c[tile.guess].max = 1;
      }
    })
    return c;
  }
  setCandidates() {
    var filter = this.filter();
    var i = 3;
    var cands = this.wordlist.permutations(filter.substring(0, i));
    while (i < filter.length) {
      i++;
      cands = [...new Set([...cands, ...this.wordlist.permutations(filter.substring(0, i))])];
    }
    this.candidates = cands;
  }
  bestCandidate() {
    if (this.tray.ix < 2) {
      this.bcs_letterCount();
    } else {
      this.bcs_common();
    }
    return this.candidates[0];
  }
  bcs_letterCount() {
    var good = [];
    var bad = [];
    this.candidates.forEach(word => {
      var c = {};
      for (let j = 0; j < word.length; j++) {
        if (c[word[j]] === undefined) {
          c[word[j]] = 0;
        }
        c[word[j]] = c[word[j]] + 1;
      }
      var b = 0;
      for (const [letter, count] of Object.entries(c)) {
        if (this.counts[letter] === undefined) {
          if (count > 1) {
            b = 1;
          }
        } else {
          if (count > this.counts[letter].count) {
            b = 1;
          }
        }
      }
      b ? bad.push(word) : good.push(word);
    })
    this.candidates = good.concat(bad);
  }
  bcs_common() {
    var bcs = this.candidates.filter(word => this.wordlist.isCommon(word));
    this.candidates = bcs.length ? bcs : this.candidates;
  }
  filter() {
    var f = this.both;
    if (this.vows.length == 0) {
      f += YordleAi.VOWS[0] + YordleAi.VOWS[1]; 
    }
    if (this.vows.length == 1) {
      f += YordleAi.VOWS[0];
    }
    for (let i = 0; i < YordleAi.CONS.length; i++) {
      f += YordleAi.CONS[i];
    }
    for (let i = 0; i < YordleAi.VOWS.length; i++) {
      f += YordleAi.VOWS[i];
    }  
    return f;
  }
  invalid(guess) {
    this.wordlist.removeWord(guess);
    this.candidates = null;
    var guess = this.play();
    return guess;
  }
  save(s) {
    if (this.both.indexOf(s) == -1) {
      this.both += s;
      if (this.isVowel(s)) {
        this.vows += s;
      } else {
        this.cons += s;
      }  
    }
  }
  remove(s) {
    if (this.isVowel(s)) {
      YordleAi.VOWS.remove(s);
    } else {
      YordleAi.CONS.remove(s);
    }
  }
  isVowel(s) {
    return 'AEIOU'.indexOf(s) > -1;
  }
  vowelCount(word) {
    return this.lc(word, 'A') + this.lc(word, 'E') + this.lc(word, 'I') + this.lc(word, 'O') + this.lc(word, 'U');
  }
  lc(word, letter) {
    return word.split(letter).length - 1;
  }
}
YordleAi.Wordlist = class extends Array {
  //
  constructor() {
    super();
    this.common = words[5];
  }
  permutations(filter) {
    return this.filter(w => {
      let hit = 0;
      for (let i = 0; i < filter.length; i++) {
        hit += this.count(w, filter[i]);
      }
      return hit >= 5;
    });
  }
  removeTile(tile, count, max) {
    if (tile.isWrong() && count == 0) {
      this.filterThis(w => w.indexOf(tile.guess) == -1);
    } else if (tile.isYellow()) {
      this.filterThis(w => w.substring(tile.ix, tile.ix + 1) != tile.guess);
    } else if (tile.isGreen()) {
      this.filterThis(w => w.substring(tile.ix, tile.ix + 1) == tile.guess);
    }
    if (count > 0) {
      this.removeMinCount(tile.guess, count, max);
    }
  }
  removeMinCount(letter, count, max) {
    if (max) {
      this.filterThis(w => this.count(w, letter) == count);
    } else {
      this.filterThis(w => this.count(w, letter) >= count);
    }
  }
  removeWord(word) {
    var i = this.indexOf(word);
    if (i > -1) {
      this.splice(i, 1);
    }
  }
  isCommon(word) {
    return this.common.find(w => w == word);
  }
  count(word, letter) {
    return word.split(letter).length - 1;
  }
  indexOf(word) {
    return this.findIndex(w => w == word);
  }
  filterThis(cond) {
    let j = 0;
    this.forEach((w, i) => {
      if (cond(w)) {
        if (j < i) {
          this[j] = w;
        }
        j++;
      }
    })
    this.length = j;
  }
  static create() {
    return YordleAi.Wordlist.from(validwords);
  }
}
YordleAi.Letters = class extends Array {
  constructor() {
    super();
  }
  remove(letter) {
    var i = this.indexOf(letter);
    if (i > -1) {
      this.splice(i, 1);
    }
  }
  static asVowels() {
    return YordleAi.Letters.from(VOWS);
  }
  static asConsonants() {
    return  YordleAi.Letters.from(CONS);
  }
}
const VOWS = ['E','A','I','O','U'];
const CONS = ['R','T','N','S','L','C','D','P','M','H','G','B','F','Y','W','K','V','X','Z','J','Q'];
const FREQ = ['E','A','R','I','O','T','N','S','L','C','U','D','P','M','H','G','B','F','Y','W','K','V','X','Z','J','Q'];

