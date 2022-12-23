class UiPage extends Ui {
  //
  constructor() {
    super();
    this.yordle = Yordle.hardMode();
    this.ai = new YordleAi();
    this.uiboardh = new UiBoard(this.yordle, HUMAN);
    this.uiboarda = new UiBoard(this.yordle, AI);
    this.uiscore = new UiScore();
    this.uidotsh = new UiDots(HUMAN);
    this.uidotsa = new UiDots(AI);
    this.uikeyboard = new UiKeyboard()
      .on('click', text => this.uikeyboard_onclick(text));
    window.on('keydown', e => this.onkeydown(e));    
    this.chat = ['STARTING TO FEEL IT','GETTING WARM','CLOSING IN','THE END IS NIGH','RESISTANCE IS FUTILE'];
    this.reset();
  }
  reset() {
    this.uiscore.reset();
    this.titles();
    this.round();
  }
  round() {
    let i = Math.floor(Math.random() * Math.floor(wordles.length));
    let word = wordles.splice(i, 1)[0];
    this.yordle.reset(word);
    this.ai.reset();
    this.uiboardh.reset();
    this.uiboarda.reset();
    this.uikeyboard.reset();
    this.turn = HUMAN;
    this.h = 0;
    this.a = 0;
    this.word = this.yordle.word;
  }
  //
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
  onkeydown(e) {
    var r;
    if (this.turn == AI) {
      return;
    }
    switch (e.key) {
      case 'Backspace':
        this.uiboardh.backspace();
        return;
      case 'Enter':
        r = this.uiboardh.enter();
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
    }
    var s = e.key.toUpperCase();
    var i = s.charCodeAt(0);
    if (s.length == 1 && i >= 65 && i <= 90) {
      let r = this.uiboardh.set(s);
    }
  }
  winlose(r) {
    if (! r.win && ! r.lose) {
      return 0;
    }
    if (r.win) {
      if (this.turn == HUMAN) {
        this.h = this.yordle.tray().ix;
        this.uiboarda.background(this.h);
        delay(500, () => this.uiboardh.win());
        delay(1500, () => this.aiturn());
      } else {
        this.a = this.yordle.tray().ix;
        delay(500, () => {
          this.uiboarda.win();
          this.score();
        });
      }
    }
    if (r.lose) {
      if (this.turn == HUMAN) {
        this.h = 8;
        this.uiboarda.background(5);
        delay(800, () => this.aiturn());
      } else {
        this.a = 8;
        this.score();
      }
    }
    return 1;
  }
  score() {
    let r = this.uiscore.record(this.h, this.a, this.word);
    this.uidotsh.score(this.uiscore.h);
    this.uidotsa.score(this.uiscore.a);
    delay(1500, () => {
      this.titles();
      if (r == NO_WINNER) {
        this.round();
      } else {
        r ? this.uidotsh.dead() : this.uidotsa.dead();
      }
    })
  }
  titles() {
    $('#titleh').innerText = this.uiscore.title(HUMAN);
    $('#titlea').innerText = this.uiscore.title(AI);
  }
  aiturn() {
    this.turn = AI;
    this.yordle.reset(this.word);
    this.playai();
  }
  playai(result) {
    var guess = this.ai.play(result);
    this.setTitle();
    this.uiboarda.setGuess(guess);
    var r = this.uiboarda.enter();
    if (! this.winlose(r)) {
      delay(1100, () => this.playai(r));
    }
  }
  setTitle() {
    var ix = this.yordle.tray().ix;
    var trays = 5 - ix;
    var words = this.ai.wordlist.length - 1;
    var left = trays - words;
    var odds = left >= 0 ? 100. : pct(trays, words);
    if (odds == 100) {
      if (words == 0) {
        this.title('GOT IT');
      } else {
        this.title(this.chat[5 - words] + '!');
      }
    } else if (odds >= 50 && trays >= 1) {
      this.title(this.chat[3]);
    } else if (odds >= 30 && trays >= 2) {
      this.title(this.chat[2]);
    } else if (odds >= 20 && trays >= 3) {
      this.title(this.chat[1]);
    } else if (odds >= 10 && trays >= 3) {
      this.title(this.chat[0]);
    } else {
      this.title(this.yordle.tray().ix == 0 ? "LET'S GO" : 'HMMM' + '.'.repeat(ix + 2));
    }
  }
  title(s) {
    $('#titlea').innerText = s;
  }
}
class UiBoard extends Ui {
  //
  constructor(yordle, aimode) {
    super();
    this.yordle = yordle;
    this.$grid = aimode ? $('#grida') : $('#gridh');
    this.aimode = aimode;
  }
  reset() {
    this.$grid.innerHTML = '';
    this.yordle.trays.forEach(tray => {
      var $tr = this.$grid.insertRow();
      tray.tiles.forEach(tile => {
        var $td = $tr.insertCell();
        $td.id = this.cellid(tile);
      })
    })
    this.refresh();    
  }
  background(rows) {
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < 5; c++) {
        let id = '#AT' + r + 'x' + c;
        $(id).className = 'bf';
      }
    }
  }
  setGuess(guess) {
    var tray = this.yordle.tray();
    for (var i = 0; i < guess.length; i++) {
      this.set(guess.substring(i, i + 1), 1);
    }
    this.refresh();
  }
  set(letter, norefresh) {
    this.yordle.set(letter);
    ! norefresh && this.refresh();
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
      var $td = $('#' + this.cellid(tile));
      $td.className = 'win';
    })
  }
  //
  refresh() {
    var tray = this.yordle.tray();
    this.yordle.tiles(tile => {
      var $td = $('#' + this.cellid(tile));
      $td.innerText = tile.guess;
      if (tile.guess) {
        $td.className = 'c' + tile.color;
      }
      if (! this.aimode && tile.in(tray)) {
        $td.className += ' pointer';
      }
    })
  }
  cellid(tile) {
    return (this.aimode ? 'A' : 'H') + tile.id;
  }
}
class UiKeyboard extends Ui {
  onclick(text) {}
  //
  constructor() {
    super();
    $('#keyboard').style.display = 'block';
    this.$buttons = $$('button')
      .on('click', e => this.$key_onclick(e.srcElement));
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
  //
  $key_onclick($e) {
    this.onclick($e.innerText);
  }
  mapButtons() {
    this.$map = {};
    this.$buttons.forEach($b => {
      this.$map[$b.innerText] = $b;
    })
  }
}
class UiScore extends Ui {
  //
  constructor(pts = 10) {
    super();
    this.$score = $('#score');
    this.pts = pts;
  }
  reset() {
    this.$score.innerHTML = '<tr><td class="spc"></td></tr>';
    this.h = 0;
    this.ht = 0;
    this.a = 0;
    this.at = 0;
    this.round = 0;
  }
  record(h, a, word) {
    this.round++;
    let d = h - a, winner = NO_WINNER;
    h++;
    a++;
    this.ht += h;
    this.at += a;
    if (d == 0) {
      this.tie(word, h, a);
    } else if (d < 0) {
      winner = this.win_h(word, Math.abs(d), h, a);
    } else {
      winner = this.win_a(word, d, h, a);
    }
    return winner;
  }
  // title(of) {
  //   if (this.round == 0) {
  //     return of == HUMAN ? 'YOU' : 'ME';
  //   }
  //   if (this.a >= this.pts) {
  //     return of == HUMAN ? 'WINNER' : 'LOSER';
  //   }
  //   if (this.h >= this.pts) {
  //     return of == HUMAN ? 'LOSER' : 'WINNER';
  //   }
  //   let t = of == HUMAN ? this.ht : this.at;
  //   return (t / this.round).toFixed(2);
  // }
  title(of) {
    let title = of == HUMAN ? 'YOU' : 'ME';
    let d = this.h - this.a;
    if (d == 0) {
      return title + '=';
    }
    if (this.a >= this.pts) {
      return of == HUMAN ? 'WINNER' : 'LOSER';
    }
    if (this.h >= this.pts) {
      return of == HUMAN ? 'LOSER' : 'WINNER';
    }
    if (of == AI) {
      d = -d;
    }
    if (d > 0) {
      title += '+' + d;
    }
    return title;
  }
  tie(word = '', h, a) {
    if (word.length) {
      word = h + ' ' + word + ' ' + a;
    }
    let ch = this.a < this.h ? 'r' : '';
    let ca = this.h < this.a ? 'r' : '';
    this.$score.innerHTML += '<tr><td class="' + ch + '">' + this.h + '</td><td>' + word + '</td><td class="' + ca + '">' + this.a + '</td>';
    return NO_WINNER;
  }
  win_h(word, pts, h, a) {
    this.a += pts;
    let ch = this.a < this.h ? 'r' : '';
    let ca = this.h < this.a ? 'r' : '';
    word = h + ' ' + word + ' ' + a;
    this.$score.innerHTML += '<tr><td class="' + ch + '">' + this.h + '</td><td class="h">' + word + '</td><td class="' + ca + '">' + this.a + '</td>';
    return this.a >= this.pts ? HUMAN : NO_WINNER;
  }
  win_a(word, pts, h, a) {
    this.h += pts;
    let ch = this.a < this.h ? 'r' : '';
    let ca = this.h < this.a ? 'r' : '';
    word = h + ' ' + word + ' ' + a;
    this.$score.innerHTML += '<tr><td class="' + ch + '">' + this.h + '</td><td class="a">' + word + '</td><td class="' + ca + '">' + this.a + '</td>';
    return this.h >= this.pts ? AI : NO_WINNER;
  }
}
class UiDots extends Ui {
  constructor(who) {
    super();
    this.who = who;
    let id = who ? '#dotsa' : '#dotsh';
    this.$$dots = $$(id + ' .dot');
  }
  score(pts) {
    for (let i = 0; i < pts && i < 10; i++) {
      this.$$dots[i].className = 'dot on';
    }
  }
  dead() {
    for (let i = 0; i < 10; i++) {
      this.$$dots[i].className = 'dot dead';
    }
  }
}
const NO_WINNER = -1;
const HUMAN = 0;
const AI = 1;
