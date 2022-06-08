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
      .on('light', () => this.dark(0));
    this.header$ = new SA.Header$();
    this.output$ = new SA.Output$();
    this.entry$ = new SA.Entry$()
      .on('enter', text => this.enter(text));
    this.wraplen = 72;
    this.darkness = 0;
    this.reset();
  }
  enter(text) {
    this.say('&nbsp;-------> Tell me what to do? ' + text);
    this.game.submit(text);
  }
  reset() {
    this.game.load(game());
    this.replay(`
    N
    E
    E
    GET AX
    W
    S
    E
    GO HOLE
    GET FLINT
    U
    W
    CLIMB TREE
    GET KEYS
    D
    CHOP TREE
    GO STUMP
    GET LAMP
    GET BOTTLE
    D
    GO HOLE
    UNLOCK DOOR`);
  }
  replay(s) {
    let a = s.split("\n");
    a.forEach(cmd => this.enter(cmd));
  }
  say(msg) {
    msg = this.br(msg);
    this.output$.say(msg);
  }
  sayinv(msg, items) {
    items = this.wrap(items) || 'Nothing At All';
    this.say(msg);
    this.say(items);
  }
  dark(b) {
    this.darkness = b;
  }
  cls() {
    // this.output$.reset();
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
    return s.replace(/\|/g, '<br>');
  }
  wrap(items) {
    let a = [], s = '';
    items.forEach(item => {
      if (s.length + item.text.length > this.wraplen) {
        a.push(s);
        s = '';
      }
      s += item.text + '. ';
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
    let s = e.key.toUpperCase();
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