class Radar extends Obj {
  //
  constructor() {
    super();
    this.clockspeed = 2;
    this.tracers = new Tracers()
      .on('start', jet => this.tracer_onstart(jet))
      .on('dock', jet => this.tracer_ondock(jet))
      .on('donedraw', () => this.tracer_ondonedraw());
    $('#radar')
      .on('mousemove', e => this.tracers.mousemove(e))
      .on('mouseup', e => this.tracers.mouseup(e));
    this.jets = new Jets()
      .on('mousedown', (jet, e) => this.tracers.jet_onclick(jet, e))
      .on('dot', (jet, dot) => this.jet_ondot(jet, dot))
      .on('landing', jet => this.jet_onlanding(jet))
      .on('land', jet => this.jet_onland(jet));
    this.scoreboard = new Scoreboard();
    this.oort = new Oort(this.jets);
    this.$speed = $('#speed')
      .on('click', () => this.$speed_onclick());
    this.$pause = $('#pause')
      .on('click', () => this.$pause_onclick());
    $$('.dock')
      .on('mouseover', e => this.pad_onmouseover(e));
    //this.advance(34);
    this.start();
  }
  start(unhide) {
    if (unhide) {
      this.jets.unhide();
      this.tracers.show(1);
    }
    this.clock = setInterval(() => this.step(), this.clockspeed);
  }
  advance(to) {
    let score = this.oort.advance(to);
    this.scoreboard.set(score);
  }
  $speed_onclick() {
    if (! this.speed) {
      this.speed = 1;
    } else {
      this.speed = 0;
    }
    this.oort.speed(this.speed);
    //this.$speed.innerText = 'x' + (this.speed + 1);
  }
  $pause_onclick() {
    let s = this.$pause.innerText;
    if (s == '| |') {
      this.pause(1);
      s = '>';
    } else {
      this.start(1);
      s = '| |';
    }
    this.$pause.innerText = s;
  }
  pause(hide) {
    this.jets.freeze(hide);
    this.tracers.show(0);
    clearInterval(this.clock);
  }
  step() {
    var d = new Date();
    var ms = '00' + d.getMilliseconds();
    log(d.getMinutes() + ':' + d.getSeconds() + '.' + ms.substring(ms.length - 3));
    this.oort.step();
    let dead = this.jets.step();
    if (dead) {
      $$('.dot').forEach($d => $d.remove());
      this.pause();
    }
  }
  pad_onmouseover(e) {
    e = e.srcElement;
    while (! e.id) {
      e = e.parentElement;
    }
    this.tracers.mouseoverdock(e.id);
  }
  tracer_onstart(jet) {
    this.resetDocks();
    $('#' + jet.pad).className = 'chevs flash';
    this.jet_ondot(jet);
  }
  tracer_ondock(jet) {
    jet.land();
  }
  tracer_ondonedraw() {
    this.resetDocks();
  }
  resetDocks() {
    $$('.chevs').forEach($pad => $pad.className = 'chevs');
  }
  jet_ondot(jet, dot) {
    dot = this.tracers.ondot(jet, dot);
    if (dot) {
      jet.headToDot(dot);
    }
  }
  jet_onlanding(jet) {
    this.scoreboard.onlanding();
  }
  jet_onland(jet) {
    this.scoreboard.onland();
  }
}
class Oort extends Obj {
  onspawn(jet) {}
  //
  constructor(jets) {
    super();
    this.is = 0;
    this.elapsed = 0;
    this.freq = 125;  // 0.5 seconds
    this.jets = jets;
    this.alerts = [];
    this.script = new Script();
    //$('#test2').innerText = '';
    this.test2 = [];
    this.test2ix = 0;
  }
  advance(to) {
    this.test2ix = to;
    return this.script.advance(to);    
  }
  step() {
    this.is++;
    if (this.is >= this.freq) {
      this.elapsed += 0.5;
      this.is = 0;
      let line = this.script.next();
      if (line.map) {
        if (this.test2.length == 3) {
          this.test2.shift();
        }
        this.test2.push((line.mi + this.test2ix) + ': ' + js(line.map));
        //$('#test2').innerText = this.test2.join("\n");
      }
      line.types.forEach(type => {
        this.spawn(type, line.sf);
      })
    }
  }
  speed(b) {
    this.ff = b;
    this.freq = b ? this.freq / 2 : this.freq * 2;
    this.jets.forEach(jet => jet.setSpeed(b ? jet.speed * 2 : jet.speed / 2));
  } 
  spawn(type, sf) {
    let pos = this.getPos();
    let jet = this.jets.newJet(pos.x, pos.y, pos.heading, sf, type)
      .on('spawning', jet => jet.alert.refresh())
      .on('visible', jet => jet.alert = jet.alert.erase());
    jet.alert = new Alert(jet, pos.wall);
    if (this.ff) {
      jet.setSpeed(jet.speed * 2);
    }
    this.alerts.push(jet.alert);
  }
  getPos() {
    let pos = {};
    pos.wall = rnd(4);
    switch (pos.wall) {
      case 0:
        pos.x = 200 + rnd(window.innerWidth - 400);        
        pos.y = -300;
        pos.ax = pos.x;
        pos.ay = -10;
        pos.heading = rnd(100) + 220;
        break;
      case 1:
        pos.x = window.innerWidth + 250;
        pos.y = 100 + rnd(window.innerHeight - 200);
        pos.ax = window.innerWidth - 22;
        pos.ay = pos.y;
        pos.heading = rnd(60) + 150;
        break;
      case 2:
        pos.x = 200 + rnd(window.innerWidth - 400);
        pos.y = window.innerHeight + 250;
        pos.ax = pos.x;
        pos.ay = window.innerHeight - 22;
        pos.heading = rnd(100) + 40;
        break;
      case 3:
        pos.x = -300;
        pos.y = 100 + rnd(window.innerHeight - 200);
        pos.ax = -10;
        pos.ay = pos.y;
        pos.heading = rnd(60) + 330;  // TODO be smarter
        break;
    }
    pos.heading = fixHeading(pos.heading);
    let collides;
    this.alerts.forEach(alert => {
      let d = Math.sqrt(Math.pow(alert.x - pos.x, 2) + Math.pow(alert.y - pos.y, 2));
      if (d < 100) {
        collides = 1;
      }
    })
    //if (collides) {
    //  return this.getPos();
    //}
    return pos;
  }
}
class Script extends Obj {
  /**
   * Line lines[]
   */
  constructor() {
    super();
    this.build();
  }
  next() {
    return this.lines.shift();
  }
  //
  build() {
    this.lines = [];
    Script.MAP.forEach((map, i) => {
      var a = Script.Line.from(map, i);
      this.lines = this.lines.concat(a);
    })
  }
  advance(to) {
    let score = 0;
    for (let i = 0; i < to; i++) {
      score += Script.MAP.shift()[1];
    }
    this.build();
    return score;
  }
  static MAP = [
    [1,1,1,0],
    [50,5,1,0],
    [10,0,0,0],
    [60,12,1,0],
    [15,0,0,0],
    [30,9,1,0],
    [15,0,0,0],
    [60,12,1,0],
    [15,0,0,0],
    [60,18,1,0],
    [20,0,0,0],
    [30,9,1,0],
    [30,9,1,0],
    [20,0,0,0],
    [30,9,1,0],
    [30,9,1,0],
    [30,9,1,0],
    [20,0,0,0],
    [30,10,1,0],
    [30,10,1,0],
    [30,9,1,0],
    [30,9,1,0],
    [30,0,0,0],
    [30,8,1.3,0],
    [60,16,1.3,0],
    [15,0,0,0],
    [30,9,1.3,0],
    [30,10,1.3,0],
    [30,8,1.3,0],
    [10,0,0,0],
    [30,10,1.3,0],
    [30,9,1.3,0],
    [30,10,1.3,0],
    [15,0,0,0],
    [30,10,1.5,0],
    [30,11,1.5,0],
    [30,7,1.5,0],
    [10,0,0,0],
    [30,10,1.5,0],
    [30,11,1.5,0],
    [30,11,1.5,0],
    [10,0,0,0],
    [30,13,1.5,0],
    [30,10,1.5,0],
    [30,12,1.5,0],
    [15,0,0,0],
    [30,11,2,0],
    [30,11,2,0],
    [10,0,0,0],
    [30,11,2,0],
    [30,11,2,0],
    [10,0,0,0],
    [30,11,2,0],
    [30,12,2,0],
    [30,10,2,0],
    [10,0,0,0],
    [30,11,2,0],
    [30,12,2,0],
    [30,8,2,0],
    [30,12,2,0],
    [10,0,0,0],
    [30,12,2,0],
    [30,12,2,0],
    [10,0,0,0],
    [30,13,2,0],
    [30,13,2,0],
    [10,0,0,0],
    [30,14,2,0],
    [30,14,2,0],
    [10,0,0,0],
    [30,15,2,0],
    [30,15,2,0],
    [10,0,0,0],
    [30,16,2,0],
    [30,17,2,0],
    [30,18,2,0],
    [30,19,2,0],
    [30,20,2,0]
  ];
}
Script.Line = class extends Obj {
  /**
   * i types[]
   * i sf
   */
  constructor() {
    super();
    this.types = [];
  }
  static from(map, i) {
    var len = map[0] * 2, total = map[1], sf = map[2], type = map[3];
    var lines = this.asArray(len);
    lines[0].map = map;
    lines[0].mi = i;
    for (let i = 0; i < total; i++) {
      let li = rnd(len);
      lines[li].types.push(type ? type : rnd(Jet.TYPES.length));
      lines[li].sf = sf;
    }
    return lines;
  }
  static asArray(len) {
    var us = [];
    for (let i = 0; i < len; i++) {
      us.push(new Script.Line());
    }
    return us;
  }
}
class Alert extends Obj {
  //
  constructor(jet, wall) {
    super();
    this.jet = jet;
    this.wall = wall;
    this.$createAlert();
    this.x = 0;
    this.y = 0;
  }
  erase() {
    this.$alert.remove();
  }
  show() {
    this.$alert.classList.remove('paused');
  }
  hide() {
    this.$alert.classList.add('paused');
  }
  refresh() {
    var jb = this.jet.getBounds();
    switch (this.wall) {
      case 0:
        this.x = jb.x;
        this.y = 0;
        break;
      case 1:
        this.x = window.innerWidth - 32;
        this.y = jb.y;
        break;
      case 2:
        this.x = jb.x;
        this.y = window.innerHeight - 32;
        break;
      case 3:
        this.x = 0;
        this.y = jb.y;
        break;
    }
    this.$alert.style.left = this.x;
    this.$alert.style.top = this.y;
  }
  $createAlert() {
    this.$alert = document.createElement('div');
    this.$alert.className = 'alert';
    this.$alert.innerHTML = $('.alert.blueprint').innerHTML;
    $('#radar').appendChild(this.$alert);
    this.refresh();
  }
}
class Tracers extends Obj {
  onstart(jet) {}
  ondock(jet) {}
  ondonedraw() {}
  //
  constructor() {
    super();
    this.reset();  
  }
  reset() {
    this.tracers = {};
    this.tracer = null;
  }
  show(b) {
    for (let id in this.tracers) {
      if (this.tracers[id]) {
        this.tracers[id].show(b);
      }
    }
  }
  jet_onclick(jet, e) {
    e.preventDefault();
    if (this.tracers[jet.id]) {
      this.tracers[jet.id] = this.tracers[jet.id].clear();
    }
    this.tracer = new Tracer(jet, e)
      .on('start', jet => this.onstart(jet))
      .on('docked', jet => this.tracer_ondock(jet))
      .on('donedraw', () => this.ondonedraw());
    this.tracers[jet.id] = this.tracer;
  }
  ondot(jet, dot) {
    if (dot) {
      dot.hide();
    }
    let tracer = this.tracers[jet.id];
    if (tracer) {
      dot = tracer.next(dot);
      return dot;
    }
  }
  mousemove(e) {
    this.tracer && this.tracer.mousemove(e);
  }
  mouseup() {
    if (this.tracer) {
      this.tracer.mouseup(0);
      this.tracer = null;
    }
  }
  mouseoverdock(id) {
    if (this.tracer) {
      if (this.tracer.jet.dock == id || (this.tracer.jet.type.id == 'chopper' && id == 'chopperpad')) {
        this.tracer.mouseup(1);
        this.tracer = null;
      }
    }
  }
  tracer_ondock(jet) {
    this.tracers[jet.id] = null;
    this.ondock(jet);
  }
}
class Tracer extends Obj {
  onstart(jet) {}
  ondocked(jet) {}
  ondonedraw() {}
  //
  constructor(jet, e) {
    super();
    this.dots = [];
    this.di = 0;
    this.jet = jet;
    this.sx = e.clientX;
    this.sy = e.clientY;
    this.drawing = 1;
    this.docked = 0;
    this.onstarted = 0;
    this.mousemove(e);
  }
  mouseup(docked) {
    this.drawing = 0;
    this.docked = docked;
    if (docked) {
      this.dots.forEach(dot => dot.dock());
    }
    this.ondonedraw();
  }
  clear() {
    this.dots.forEach(dot => dot.remove());
  }
  show(b) {
    this.dots.forEach(dot => {
      if (b) {
        dot.$dot.classList.remove('paused');
      } else {
        dot.$dot.classList.add('paused');
      }
    })
  }
  next(dot) {
    if (! this.onstarted && dot) {
      return;
    }
    dot = this.dots[this.di++];
    if (this.di == this.dots.length) {
      this.clear();
      if (this.docked) {
        this.ondocked(this.jet);
      }
    } else if (this.di < this.dots.length) {
      for (let i = 0; i < this.di; i++) {
        this.dots[i].hide();
      }
    }
    return dot;
  }
  mousemove(e) {
    if (Math.abs(e.clientX - this.sx) > 7 || Math.abs(e.clientY - this.sy) > 7) {
      if (this.dots.length == 0) {
        let b = this.jet.getBounds();
        if (e.clientX >= b.x && e.clientX <= b.x2 && e.clientY >= b.y && e.clientY <= b.y2) {
          return;
        }
      }
      let dot = new Dot(this.jet, e, this.dots.length);
      this.dots.push(dot);
      this.sx = dot.cx;
      this.sy = dot.cy;
      if (! this.onstarted) {
        this.onstart(this.jet);
        this.onstarted = 1;
      }
    }
  }
}
class Dot extends Obj {
  //
  constructor(jet, e, ix) {
    super();
    this.jet = jet;
    this.ix = ix;
    this.$dot = this.$createDot(e);
    var bcr = this.$dot.getBoundingClientRect();
    this.cx = bcr.x + 3;
    this.cy = bcr.y + 3;
  }
  dock() {
    this.$dot.className = 'dot docked';
    return this;
  }
  hide() {
    this.$dot.className = 'dot hide';
    return this;
  }
  remove() {
    this.$dot.remove();
  }
  $createDot(e) {
    let $dot = document.createElement('div');
    $dot.className = 'dot';
    $('#radar').appendChild($dot);
    $dot.style.left = e.clientX;
    $dot.style.top = e.clientY;
    return $dot;
  }
}
class Jets extends ObjArray {
  onmousedown(jet, e) {}
  ondot(jet, $dot) {}
  onlanding(jet) {}
  onland(jet) {}
  //
  newJet(x, y, heading, sfactor, type) {
    let jet = new Jet(this.length, x, y, heading, sfactor, type)
      .on('mousedown', (jet, e) => this.onmousedown(jet, e))
      .on('dot', (jet, dot) => this.ondot(jet, dot))
      .on('landing', jet => this.onlanding(jet))
      .on('land', jet => this.onland(jet));
    this.push(jet);
    return jet;
  }
  step() {
    let dead = 0;
    this.forEach(jet => {
      if (jet.step(this)) {
        dead = 1;
      }
    })
    return dead;
  }
  freeze(hide) {
    this.forEach(jet => {
      jet.$jet.classList.remove('blink');
      jet.$jet.classList.remove('glow');
      hide && jet.$jet.classList.add('paused');
      jet.alert && jet.alert.hide();
    })
  }
  unhide() {
    this.forEach(jet => {
      jet.$jet.classList.remove('paused');
      jet.alert && jet.alert.show();
    })
  }
  get(id) {
    return this.find(jet => jet.id == id);
  }
  static clean(jets) {
    return new Jets(...jets.filter(jet => ! jet.landing));
  }
}
class Jet extends Obj {
  ondead(jet) {}
  onmousedown(jet, e) {}
  ondot(jet, dot) {}
  onlanding(jet) {}
  onland(jet) {}
  onspawning(jet) {}
  onvisible(jet) {}
  //
  constructor(i, x, y, heading, sfactor, type = 0) {
    super();
    let me = Jet.TYPES[type];
    this.type = me;
    this.id = me.id + i;
    this.pad = me.id + 'pad';
    this.dock = me.id + 'dock';
    this.x = x;
    this.y = y;
    this.ix = 0;
    this.iy = 0;
    this.setHeading(heading);
    this.sf = sfactor;
    this.setSpeed(me.speed * sfactor);
    this.is = 0;
    this.landing = 0;
    this.landed = 0;
    this.lx = me.lx;
    this.ly = me.ly;
    this.lx2 = me.lx2;
    this.ly2 = me.ly2;
    this.spawned = 0;
    this.visible = 0;
    this.$createJet();
  }
  setSpeed(s) {
    this.speed = s;
    this.freq = 1000 / this.speed;
  }
  step(jets) {
    if (this.landed) {
      return;
    }
    if (! this.landing && this.spawned == 2 && this.deadCheck(jets)) {
      return 1;
    }
    this.is++;
    if (this.is >= this.freq) {
      this.is = 0;
      this.ix += Math.cos(this.rad);
      this.iy -= Math.sin(this.rad);
      this.$jet.style.transform = this.getTranslate();
      let me = this.getBounds();
      if (! this.spawned) {
        if (me.x > 10 && me.x < window.innerWidth - me.width - 10 && me.y > 10 && me.y < window.innerHeight - me.height - 10) {
          this.spawned = 1;
        }
        if (! this.visible && me.x > -me.width && me.x < window.innerWidth && me.y >= -me.height && me.y < window.innerHeight) {
          this.visible = 1; 
          this.onvisible(this);
        }
        if (! this.visible) {
          this.onspawning(this);
        }
      } else if (this.spawned == 1) {
        if (me.x > 160 && me.x < window.innerWidth - me.width - 160 && me.y > 160 && me.y < window.innerHeight - me.height - 160) {
          this.spawned = 2;
        }
      }
      if (this.dot && this.over(this.dot.cx, this.dot.cy, me)) {
        let dot = this.dot;
        this.dot = null;
        this.ondot(this, dot);
      }
      if (! this.spawned) {
        return;
      }
      if (this.landing == 1 && (! this.lx || (me.cx * this.type.compx > this.lx * this.type.compx))) {
        this.landing = 2;
        this.freq = 1;
        this.$svg.style.animation = this.type.lanim;
        this.$svg.style.transform = this.getRotate();
        if (this.type.id == 'chopper') {
          this.$svg.style.transition = '';
        }
        this.headTo(this.lx2, this.ly2, me);
        this.onlanding(this);
      }
      if (this.landing == 2 && ((this.lx && me.cx * this.type.compx > this.lx2 * this.type.compx) || (! this.lx && (Math.abs(me.cx - this.lx2) < 45 && Math.abs(me.cy - this.ly2) < 45)))) {
        this.$jet.remove();
        this.landed = 1;
        this.onland(this);
      }
      if (! this.dot) {
        let h = window.innerHeight - me.height, w = window.innerWidth - me.width;
        if (me.y > 0 && me.y < h && me.x > 0 && me.x < w) {
          this.bouncing = 0;
        }
        if (! this.bouncing) {
          if (me.y <= 0 || me.y >= h) {
            this.bounce(0);
          } else if (me.x <= 0 || me.x >= w) {
            this.bounce(1);
          }
        }
      }
    }
  }
  over(x, y, me) {
    me = me || this.getBounds();
    return Math.abs(me.cx - x) <= 2 && Math.abs(me.cy - y) <= 2;
  }
  getBounds() {
    var b = this.$jet.getBoundingClientRect();
    b.cx = Math.floor(b.x + (b.width / 2));
    b.cy = Math.floor(b.y + (b.height / 2));
    b.x2 = b.x + b.width;
    b.y2 = b.y + b.height;
    return b;
  }
  deadCheck(jets) {
    if (this.dead) {
      return 1;
    }
    if (! this.spawned) {
      return 0;
    }
    let me = this.getBounds();
    let blinking = 0;
    jets.forEach(jet => {
      if (jet.id != this.id && jet.spawned && ! jet.hidden && ! jet.landing) {
        let you = jet.getBounds();
        let minw = me.width <= you.width ? me.width : you.width;
        let blinkw = minw * 2.5;
        let d = Math.sqrt(Math.pow(you.cx - me.cx, 2) + Math.pow(you.cy - me.cy, 2));
        if (d < minw) {
          this.dead = 1;
        } else if (d < blinkw) {
          this.$jet.classList.add('blink');
          jet.$jet.classList.add('blink');
          blinking = 1;
        }
      }
    })
    if (this.dead) {
      this.$jet.classList.remove('blink');
      this.pow();
    } else if (! blinking) {
      this.$jet.classList.remove('blink');
    }
  }
  pow() {
    let $e = document.createElement('div');
    $e.className = 'kapow';
    $e.innerHTML = $('.pow.blueprint').innerHTML;
    $('#radar').appendChild($e);
    $e.style.left = this.x + this.ix - 40;
    $e.style.top = this.y + this.iy - 40;
    this.$jet.className = 'jet dead';
    this.$svg.on('animationend', () => {
      this.$jet.className = 'hide';
      this.hidden = 1;
      this.ondead(this);
    });
  }
  headToDot(dot) {
    if (! this.landing) {
      this.dot = dot;
      this.headTo(dot.cx, dot.cy);
    }
  }
  land() {
    this.landing = 1;
    this.freq = 2;
    if (this.lx) {
      this.headTo(this.lx, this.ly);
    }
    this.$jet.classList.remove('blink');
  }
  headTo(x, y, me) {
    me = me || this.getBounds();
    let rad = Math.atan2(me.cy - y, x - me.cx);
    let heading = Math.round(rad * (180 / Math.PI));
    this.setHeading(heading);
  }
  bounce(vert) {
    this.bouncing = 1;
    this.setHeading(this.heading + (vert ? 180 : 360) - 2 * this.heading);
  }
  setHeading(heading) {    
    this.heading = fixHeading(heading);
    this.rad = this.heading * (Math.PI / 180);
    if (this.$svg) {
      this.$svg.style.transform = this.getRotate();
    }
  }
  glowing() {
    return this.$jet.classList.contains('glow');
  }
  //
  $createJet() {
    this.$jet = document.createElement('div');
    this.$jet.id = this.id;
    this.$jet.className = this.type.id;
    this.$jet.innerHTML = $('.' + this.type.id + '.blueprint').innerHTML;
    $('#radar').appendChild(this.$jet);
    this.$jet.style.left = this.x;
    this.$jet.style.top = this.y;
    this.$svg = this.$jet.$('svg');
    this.$jet.style.transition = 'transform ease-in-out';
    this.$jet.style.transform = this.getTranslate();
    this.$svg.style.transform = this.getRotate();
    let s = 1 / this.sf;
    this.$svg.style.transition = 'all ' + s + 's ease';
    this.$jet
      .on('mousedown', e => this.onmousedown(this, e))
      .on('mouseover', () => this.$jet.classList.add('glow'))
      .on('mouseout', () => this.$jet.classList.remove('glow'));
  }
  getTranslate() {
    return 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  getRotate() {
    if (this.type.id == 'chopper') {
      return this.heading > 90 && this.heading < 270 ? '' : 'scaleX(-1)';
    }
    let nr = this.type.irot - this.heading;
    if (nr < 360) {
      nr += 360;
    }
    let rot = this.prevRot || 0;
    let ar = rot % 360;
    if (ar < 0) {
      ar += 360;
    }
    if (ar < 180 && (nr > (ar + 180))) { 
      rot -= 360; 
    }
    if (ar >= 180 && (nr <= (ar - 180))) {
      rot += 360; 
    }
    rot += (nr - ar);
    this.prevRot = rot;
    return 'rotate(' + (rot) + 'deg) ';
  }
  static TYPES = [
    {id:'jet', speed:280, irot:45, lx:725, ly:483, lx2:1101, ly2:121, compx:1, lanim:'jetlanding 3.5s'},
    {id:'plane', speed:200, irot:90, lx:1230, ly:327, lx2:871, ly2:183, compx:-1, lanim:'planelanding 3s'},
    {id:'chopper', speed:140, irot:0, lx2:1243, ly2:794, lanim:'chopperlanding 2.5s'},
  ];
}
class Scoreboard extends Obj {
  //
  constructor() {
    super();
    this.$score = $('#score span');
    this.score = 0;
  }
  set(score) {
    this.score = score;
    this.$score.innerText = this.score;
  }
  onlanding() {
    this.set(this.score + 1);
    this.$score.className = 'bulge';
  }
  onland() {
    this.$score.className = '';
  }
}
function fixHeading(heading) {
  heading = heading > 359 ? heading - 360 : heading;
  heading = heading < 0 ? heading + 360 : heading;
  return heading;
}
