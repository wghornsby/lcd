class Radar extends Obj {
  //
  constructor() {
    super();
    this.clockspeed = 5;
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
    $$('.dock')
      .on('mouseover', e => this.pad_onmouseover(e));
    
    // --- temp code
    for (let i = 0; i < 5; i++) {
      this.jets.newJet(50 + rnd(window.innerWidth - 50), 50 + rnd(window.innerHeight - 50), rnd(361), 200);
    }
    // --- temp code
    
    this.start();
  }
  start(ms) {
    this.clock = setInterval(() => this.step(), this.clockspeed);
  }
  pause() {
    clearInterval(this.clock);
  }
  step() {
    let dead = this.jets.step();
    if (dead) {
      $$('.dot').forEach($d => $d.remove());
      this.pause();
    }
  }
  pad_onmouseover(e) {
    log(e.clientX + ',' + e.clientY);
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
class Scoreboard extends Obj {
  //
  constructor() {
    super();
    this.$score = $('#score span');
    this.score = 0;
  }
  onlanding() {
    this.score++;
    this.$score.innerText = this.score;
    this.$score.className = 'bulge';
  }
  onland() {
    this.$score.className = '';
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
  jet_onclick(jet, e) {
    e.preventDefault();
    if (this.tracers[jet.id]) {
      this.tracers[jet.id].clear();
    }
    this.tracer = new Tracer(jet, e)
      .on('start', jet => this.onstart(jet))
      .on('docked', jet => this.ondock(jet))
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
      if (this.tracer.jet.dock == id) {
        this.tracer.mouseup(1);
        this.tracer = null;
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
    }
    return dot; // && dot.hide();
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
class Jets extends ObjArray {
  onmousedown(jet, e) {}
  ondot(jet, $dot) {}
  onlanding(jet) {}
  onland(jet) {}
  //
  newJet(x, y, heading, speed) {
    let jet = new Jet(this.length, x, y, heading, speed)
      .on('mousedown', (jet, e) => this.onmousedown(jet, e))
      .on('dot', (jet, dot) => this.ondot(jet, dot))
      .on('landing', jet => this.onlanding(jet))
      .on('land', jet => this.onland(jet));
    this.push(jet);
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
  get(id) {
    return this.find(jet => jet.id == id);
  }
}
class Jet extends Obj {
  ondead(jet) {}
  onmousedown(jet, e) {}
  ondot(jet, dot) {}
  onlanding(jet) {}
  onland(jet) {}
  //
  constructor(i, x, y, heading, speed) {
    super();
    this.id = 'jet' + i;
    this.pad = 'jetpad';
    this.dock = 'jetdock';
    this.x = x;
    this.y = y;
    this.ix = 0;
    this.iy = 0;
    this.setHeading(heading);
    this.cycle = 1000 / speed;
    this.is = 0;
    this.landing = 0;
    this.landed = 0;
    this.lx = 725;
    this.ly = 483;
    this.lx2 = 1101;
    this.ly2 = 121;
    this.$createJet(i);
  }
  step(jets) {
    if (this.landed) {
      return;
    }
    if (! this.landing && this.deadCheck(jets)) {
      return 1;
    }
    this.is++;
    if (this.is >= this.cycle) {
      this.is = 0;
      this.ix += Math.cos(this.rad);
      this.iy -= Math.sin(this.rad);
      this.$jet.style.transform = this.getTranslate();
      let me = this.getBounds();
      if (this.dot && this.over(this.dot.cx, this.dot.cy, me)) {
        let dot = this.dot;
        this.dot = null;
        this.ondot(this, dot);
      }
      if (this.landing == 1 && (me.cx > this.lx || me.cy < this.ly)) {
        this.landing = 2;
        this.$svg.style.animation = 'landing 4s 1';
        this.headTo(this.lx2, this.ly2, me);
        this.onlanding(this);
      }
      if (this.landing == 2 && (me.cx > this.lx2 || me.cy < this.ly2)) {
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
    return Math.abs(me.cx - x) <= 1 && Math.abs(me.cy - y) <= 1;
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
    let me = this.getBounds();
    jets.forEach(jet => {
      if (jet.id != this.id && ! jet.hidden && ! jet.landing) {
        let you = jet.getBounds();
        if (Math.abs(me.x - you.x) < me.width && Math.abs(me.y - you.y) < me.height) {
          this.dead = 1;
        }
      }
    })
    if (this.dead) {
      this.pow();
    }
  }
  pow() {
    let $e = document.createElement('div');
    $e.className = 'kapow';
    $e.innerHTML = $('.pow.blueprint').innerHTML;
    $('#radar').appendChild($e);
    $e.style.left = this.x + this.ix - 45;
    $e.style.top = this.y + this.iy - 45;
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
    this.cycle = 1;
    this.headTo(this.lx, this.ly);
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
    this.heading = this.fixHeading(heading);
    this.rad = this.heading * (Math.PI / 180);
    if (this.$svg) {
      this.$svg.style.transform = this.getRotate();
    }
  }
  fixHeading(heading) {
    heading = heading > 359 ? heading - 360 : heading;
    heading = heading < 0 ? heading + 360 : heading;
    return heading;
  }
  glowing() {
    return this.$jet.classList.contains('glow');
  }
  //
  $createJet(i) {
    this.$jet = document.createElement('div');
    this.$jet.id = 'jet' + i;
    this.$jet.className = 'jet';
    this.$jet.innerHTML = $('.jet.blueprint').innerHTML;
    $('#radar').appendChild(this.$jet);
    this.$jet.style.left = this.x;
    this.$jet.style.top = this.y;
    this.$svg = this.$jet.$('svg');
    this.$jet.style.transition = 'transform ease-in-out';
    this.$jet.style.transform = this.getTranslate();
    this.$svg.style.transform = this.getRotate();
    this.$svg.style.transition = 'all 1s ease';
    this.$jet
      .on('mousedown', e => this.onmousedown(this, e))
      .on('mouseover', () => this.$jet.classList.add('glow'))
      .on('mouseout', () => this.$jet.classList.remove('glow'));
  }
  getTranslate() {
    return 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  getRotate() {
    let nr = 45 - this.heading;
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
}