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
      } else {
        this.aiundo()
      }
    } else {
      this.uiboard.setGuess(guess);
      this.setTitle();
    }
  }
  setTitle() {
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
      $('.title').innerText = 'THE END IS NIGH';
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
      case 'NOT IN WORDLIST':
        r = this.yordle.ainotfound();
        this.playai(r);
        break;
      case 'UNDO':
        this.aiundo();
        break;
    }
    var s = e.key.toUpperCase();
    var i = s.charCodeAt(0);
    if (s.length == 1 && i >= 65 && i <= 90) {
      let r = this.uiboard.set(s);
    }
  }
  aiundo() {
    var results = this.yordle.aiundo();
    this.ai.reset();
    this.ai.play();
    if (results) {
      results.forEach(r => this.ai.play(r));
    }
    this.uiboard.refresh();
    this.setTitle();
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
