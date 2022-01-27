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
    this.candidates = null;
    YordleAi.VOWS = YordleAi.Letters.asVowels();
    YordleAi.CONS = YordleAi.Letters.asConsonants();
  }
  play(result) {
    if (result) {
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
    if (result.error && result.guess) {
      return this.invalid(result.guess);
    }
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
    return this.bestCandidate();
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
    if (cands.length == 0) breakme(); // TODO
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
    return this.play();
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