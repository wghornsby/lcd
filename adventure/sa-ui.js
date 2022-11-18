SA = window.SA || {};
//
SA.Screen$ = class extends Obj {
  //
  constructor() {
    super();
    this.game = new SA.Game()
      .on('ready', () => this.ready())
      .on('say', (msg, nocr) => this.say(this.br(msg), nocr))
      .on('sayinv', (msg, items) => this.sayinv(msg, items))
      .on('cls', (hard) => this.cls(hard))
      .on('look', (room, items) => this.look(room, items))
      .on('replay', (snapshots) => this.replay(snapshots))
      .on('gameover', () => this.gameover())
      .on('swapctr', i => this.debug(i))
    this.header$ = new SA.Header$();
    this.output$ = new SA.Output$();
    this.entry$ = new SA.Entry$()
      .on('enter', text => this.enter(text));
    this.wraplen = 64;
    this.reset();
  }
  reset() {
    this.game.load(game());
  }
  ready() {
    this.entry$.ready();
    this.debug();
  }
  debug(i) {
    let b = '';
    //if (i !== undefined) {
      //b = 'swapping with ' + i;
    //}
    let s = ['ctr=', this.game.ctr, ' | '];
    this.game.ctrs.forEach((v, i) => {
      if (v !== null) {
        s.push('c[', i, ']=', v, '  ');
      }
    })
    //$('#debug').innerHTML = b + '<br>' + s.join('');
  }
  enter(text, nosubmit) {
    this.repeat('&nbsp;-------> Tell me what to do? ' + text);
    ! nosubmit && this.game.submit(text);
  }
  replay(snapshots) {
    snapshots.forEach((snap, i) => {
      i && this.enter(snap.cmd, 1);
      snap.says.forEach(s => this.say(this.br(s.msg), s.nocr));
      if (snap.sayinv) {
        this.sayinv(snap.sayinv.msg, snap.sayinv.items);
      }
    })
  }
  say(msg, nocr) {
    this.output$.say(msg, nocr);
  }
  repeat(msg) {
    this.output$.say('<span class="cmd">' + msg + '</span>');
  }
  sayinv(msg, items) {
    items = this.wrap(items) || 'Nothing At All';
    this.say(this.br(msg));
    this.say(items);
  }
  cls(hard) {
    hard && this.output$.reset();
  }
  gameover() {
    this.say('GAME OVER');
  }
  look(room, items) {
    if (this.game.isdark()) {
      this.header$.look('Its too dark to see!');
      return;
    }
    let a = [];
    room.exits.forEach((rx, i) => {
      if (rx) {
        a.push(SA.Game.LDIRS[i]);
      }
    })
    let exits = a.join(' ');
    room = this.br(room.text);
    items = this.wrap(items);
    this.header$.look(room, items, exits);
  }
  //
  br(s) {
    s = s.replace(/\|/g, '<br>');
    let a = s.split('<br>');
    for (let i = 0; i < a.length; i++) {
      if (a[i].length > 64) {
        a[i] = a[i].substring(0, 64) + '<br>' + a[i].substring(64);
      }
    }
    return a.join('<br>');
  }
  wrap(items) {
    let a = [], s = '';
    items.forEach(item => {
      let text = this.br(item.text);
      if (s.length + text.length > this.wraplen) {
        a.push(s);
        s = '';
      }
      s += text + '. ';
    })
    a.push(s);
    return a.join('<br>');
  }
}
SA.Entry$ = class extends Obj {
  onenter(text) {}
  //
  constructor() {
    super();
    this.$footer = $('footer');
    this.$entry = $('footer entry');
    this.$cursor = $('footer cursor');
    window
      .on('keydown', e => this.type(e))
      .on('keyup', e => this.keyup(e))
    this.reset();
  }
  reset() {
    this.$entry.innerText = '';
    this.$footer.style.visibility = 'hidden';
  }
  ready() {
    this.$footer.style.visibility = 'visible';
  }
  text() {
    return this.$entry.innerText;
  }
  enter() {
    let text = this.text();
    this.reset();
    this.onenter(text);
  }
  type(e) {
    let s = e.key.toUpperCase();
    if (s == 'Z' && e.ctrlKey) {
      return;
    }
    let len = this.text().length;
    if (e.keyCode == 8) {
      if (len) {
        this.$entry.innerText = this.text().substring(0, len - 1);
      }
      return;
    }
    if (len > 23) {
      return;
    }
    if (s.length == 1) {
      this.$entry.innerText += s;
    }
  }  
  keyup(e) {
    if (e.keyCode == 13) {
      this.enter();
      return;
    }
    let s = e.key.toUpperCase();
    if (s == 'Z' && e.ctrlKey) {
      this.$entry.innerText = 'UNDO';
      this.enter();
    }
  }
}
SA.Output$ = class extends Obj {
  //
  constructor() {
    super();
    this.$output = $('screen output');
    this.lines = 20;
    this.reset();
  }
  reset() {
    this.$output.innerHTML = '<br>'.repeat(this.lines);
  }
  html() {
    return this.$output.innerHTML;
  }
  say(msg, nocr) {
    let html = this.html();
    html += (html.length && ! this.nocr) ? '<br>' + msg : ' ' + msg;
    html = html.split('<br>').splice(-this.lines).join('<br>');
    this.$output.innerHTML = html;
    this.nocr = nocr;
  }
}
SA.Header$ = class extends Obj {
  //
  constructor() {
    super();
    this.$room = $('header room');
    this.$itemsc = $('header visible');
    this.$items = $('header items');
    this.$exitsc = $('header obvious');
    this.$exits = $('header exits');
    this.reset();
  }
  look(room, items, exits) {
    this.$room.innerHTML = room;
    this.set('$items', items);
    this.set('$exits', exits);
    $('header divider').style.display = 'inline';
  }
  reset() {
    this.$room.innerHTML = '';
    this.set('$items', '');
    this.set('$exits', '');
  }
  set(name, html) {
    this[name + 'c'].style.display = html ? 'inline' : 'none';
    this[name].innerHTML = html;
  }
}