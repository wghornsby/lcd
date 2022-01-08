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
class UiPage extends Ui {
  /**
   * UiBoard uiboard
   */
  constructor() {
    super();
    this.uiboard = new UiBoard();
    this.uikeyboard = new UiKeyboard()
      .on('click', text => this.uikeyboard_onclick(text));
    window.on('keydown', e => this.onkeydown(e));
  }
  onkeydown(e) {
    switch (e.key) {
      case 'Backspace':
        this.uiboard.backspace();
        return;
      case 'Enter':
        let r = this.uiboard.enter();
        if (r.error) {
          alert(r.error);
        } else {
          this.uikeyboard.setColors(r.tray);
          if (r.win) {
            alert('we have a weiner');
          }
          if (r.lose) {
            alert('you are such a pathetic loser!');
          }
        }
        return;
    }
    var s = e.key.toUpperCase();
    var i = s.charCodeAt(0);
    if (s.length == 1 && i >= 65 && i <= 90) {
      let r = this.uiboard.set(s);
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
  constructor() {
    super();
    this.$grid = $('#grid');
    this.reset();
  }
  reset() {
    this.yordle = new Yordle(5, 6, 1);
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
  refresh() {
    this.yordle.tiles(tile => {
      var $td = $('#' + tile.id);
      $td.innerText = tile.guess;
      $td.className = 'C' + tile.color;
    })
  }
}
class UiKeyboard extends Ui {
  onclick(text) {}
  //
  constructor() {
    super();
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
    tray.tiles.forEach(tile => this.$map[tile.guess].className = 'c' + tile.color);
  }
  mapButtons() {
    this.$map = {};
    this.$buttons.forEach($b => {
      this.$map[$b.innerText] = $b;
    })
  }
}