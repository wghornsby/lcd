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
  play(result/*=null on first turn*/) {
    if (result) {
      this.process(result);
    }
    if (! this.played) {
      this.played = 1;
      return 'STERN';
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
    var i = 5;
    var cands = this.wordlist.permutations(filter.substring(0, i));
    while (i < filter.length) {
      i++;
      cands = cands.concat(this.wordlist.permutations(filter.substring(0, i)));
    }
    this.candidates = cands;
    if (cands.length == 0) breakme();  // TODO
  }
  bestCandidate() {
    var bi = -1;
    for (let i = 0; i < this.candidates.length; i++) {
      var c = {};
      let word = this.candidates[i];
      for (let j = 0; j < word.length; j++) {
        if (c[word[j]] === undefined) {
          c[word[j]] = 0;
        }
        c[word[j]] = c[word[j]] + 1;
      }
      bi = i;
      for (const [letter, count] of Object.entries(c)) {
        if (this.counts[letter] === undefined) {
          if (count > 1) {
            bi = -1;
          }
        } else {
          if (count > this.counts[letter].count) {
            bi = -1;
          }
        }
      }
      if (bi > -1) {
        break;
      }
    }
    if (bi == -1) {
      bi = Math.floor(Math.random() * Math.floor(this.candidates.length));
    }
    return this.candidates[bi];
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
}
YordleAi.Wordlist = class extends Array {
  //
  constructor() {
    super();
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
