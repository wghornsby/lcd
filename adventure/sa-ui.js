SA = window.SA || {};
//
SA.Screen$ = class extends Obj {
  //
  constructor() {
    super();
    this.game = new SA.Game()
      .on('say', msg => this.say(msg))
      .on('sayinv', (msg, items) => this.sayinv(msg, items))
      .on('cls', () => this.cls())
      .on('look', (room, items) => this.look(room, items))
      .on('dark', () => this.dark(1))
      .on('light', () => this.dark(0))
      .on('gameover', () => this.gameover());
    this.header$ = new SA.Header$();
    this.output$ = new SA.Output$();
    this.entry$ = new SA.Entry$()
      .on('enter', text => this.enter(text));
    this.wraplen = 64;
    this.darkness = 0;
    this.reset();
  }
  enter(text) {
    this.say('&nbsp;-------> Tell me what to do? ' + text);
    this.game.submit(text);
  }
  reset() {
    this.game.load(game());
    return;
    this.replay(`
    GET TAPE
    W
    S
    SIT
    PRESS WHITE
    PRESS RED
    PRESS WHITE
    GET UP
    GET PIC
    WAIT
    WAIT
    N
    D
    N
    FRISK SABO
    GET PIC
    GET SABO
    S
    U
    N
    W
    N
    SHOW PIC
    DROP SABO
    BREAK WINDOW
    WITH TAPE
    SHOW PIC
    PRESS WHITE
    S
    D
    S
    SIT
    PRESS WHITE
    GET UP
    N
    N
    N
    W
    S
    W
    N
    SHOW PIC
    GO WINDOW
    GET KEY
    GET GLASS
    GO WINDOW
    PRESS WHITE
    S
    D
    D
    N
    S
    U
    S
    SIT
    UNLOCK YELLOW
    PRESS YELLOW
    PRESS RED
    PRESS WHITE
    GET UP
    GET PIC
    N
    D
    N
    SHOW PIC
    W
    FRISK MOP
    GET KEY
    GET CUTTERS
    U
    D
    E
    PRESS YELLOW
    S
    U
    S
    SIT
    UNLOCK BLUE
    PRESS BLUE
    PRESS RED
    PRESS WHITE
    GET UP
    GET PIC
    N
    I
    DROP KEY
    DROP KEY
    DROP PIC
    DROP PIC
    DROP PIC
    DROP PIC
    GET PIC
    N
    N
    SHOW PIC
    PUSH HARD`)
  }
  replay(s) {
    let a = s.split("\n");
    a.forEach(cmd => this.enter(cmd));
  }
  say(msg, nobr) {
    msg = nobr ? msg : this.br(msg);
    this.output$.say(msg);
  }
  sayinv(msg, items) {
    items = this.wrap(items) || 'Nothing At All';
    this.say(msg);
    this.say(items, 1);
  }
  dark(b) {
    this.darkness = b;
  }
  cls() {
    // this.output$.reset();
  }
  gameover() {
    this.say('GAME OVER');
  }
  look(room, items) {
    if (this.darkness && ! this.game.litlamp()) {
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
    this.$entry = $('footer entry');
    this.$cursor = $('footer cursor');
    window.on('keydown', e => this.type(e));
    this.reset();
  }
  reset() {
    this.$entry.innerText = '';
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
    if (e.keyCode == 13) {
      return this.enter();
    }
    let s = e.key.toUpperCase();
    if (s == 'Z' && e.ctrlKey) {
      this.$entry.innerText = 'UNDO';
      this.enter();
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
  say(msg) {
    let html = this.html();
    html += html.length ? '<br>' + msg : msg;
    html = html.split('<br>').splice(-this.lines).join('<br>');
    this.$output.innerHTML = html;
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