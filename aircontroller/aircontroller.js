class Radar extends Obj {
  //
  constructor() {
    super();
    this.clockspeed = 10;
    this.tracer = new Tracer()
      .on('start', jet => this.jet_ondot(jet));
    $('#radar')
      .on('mousemove', e => this.tracer.mousemove(e))
      .on('mouseup', e => this.tracer.mouseup(e));
    this.jets = new Jets(this.clockspeed)
      .on('mousedown', (jet, e) => this.tracer.init(jet, e))
      .on('dot', jet => this.jet_ondot(jet));
    
    // --- temp code
    for (let i = 0; i < 20; i++) {
      this.jets.newJet(50 + rnd(window.innerWidth - 50 ), 50 + rnd(window.innerHeight - 50), rnd(361), 200);
    }
    
    this.jet = null;
    this.dragging = 0;
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
      //this.pause();
    }
  }
  jet_ondot(jet) {
    let $dot = this.tracer.shift(jet);
    if ($dot) {
      jet.headToDot($dot);
    }
  }
}
class Tracer extends Obj {
  onstart(jet) {}
  //
  constructor() {
    super();
    this.$dots = [];
  }
  init(jet, e) {
    if (this.$dots.length) {
      this.clear();
    }
    this.primed = 0;
    this.jet = jet;
    this.sx = e.clientX;
    this.sy = e.clientY;
    this.drawing = 1;
    this.first = 0;
    log('init ' + this.sx + ',' + this.sy);
    this.mousemove(e);
  }
  mouseup() {
    this.drawing = 0;
  }
  mousemove(e) {
    log('mousemove, drawing=' + this.drawing);
    if (! this.drawing) {
      return;
    }
    if (! this.primed) {
      let b = this.jet.getBounds();
      if (e.clientX >= b.x && e.clientX <= (b.x + b.width) && e.clientY >= b.y && e.clientY <= (b.y + b.height)) {
        this.primed = 1;
        log('primed');
        this.first = 0;
      } else {
        this.clear();
      }
    } else {
      if (Math.abs(e.clientX - this.sx) > 7 || Math.abs(e.clientY - this.sy) > 7) {
        log('mouse move ' + e.clientX + ',' + e.clientY);
        if (! this.first) {
          let b = this.jet.getBounds();
          if (e.clientX >= b.x && e.clientX <= (b.x + b.width) && e.clientY >= b.y && e.clientY <= (b.y + b.height)) {
            log('ignore, still in bounds');
            return;
          }
        }
        log('create dot');
        let $dot = document.createElement('div');
        $dot.className = 'dot';
        $('#radar').appendChild($dot);
        $dot.style.left = e.clientX;
        $dot.style.top = e.clientY;
        this.$dots.push($dot);
        this.sx = e.clientX;
        this.sy = e.clientY;
        if (! this.first) {
          this.onstart(this.jet);
          this.first = 1;
        }
      }
    }
  }
  shift(jet) {
    if (this.jet.id == jet.id && this.$dots.length) {
      return this.$dots.shift();
    }
  }
  clear() {
    this.$dots.forEach($dot => $dot.remove());
    this.$dots = [];
    this.jet = null;
    this.drawing = 0;
  }
}
class Jets extends ObjArray {
  onmousedown(jet, e) {}
  ondot(jet) {}
  //
  constructor(clockspeed) {
    super();
    this.clockspeed = clockspeed;
  }
  newJet(x, y, heading, speed) {
    let jet = new Jet(this.length, x, y, heading, speed, this.clockspeed)
      .on('mousedown', (jet, e) => this.onmousedown(jet, e))
      .on('dot', jet => this.ondot(jet));
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
  ondot() {}
  //
  constructor(i, x, y, heading, speed, clockspeed) {
    super();
    this.id = 'jet' + i;
    this.x = x;
    this.y = y;
    this.ix = 0;
    this.iy = 0;
    this.setHeading(heading);
    this.cycle = 1000 / speed;
    this.is = 0;
    this.$createJet(i, clockspeed);
  }
  step(jets) {
    if (this.deadCheck(jets)) {
      return 1;
    }
    this.is++;
    if (this.is >= this.cycle) {
      this.is = 0;
      this.ix += Math.cos(this.rad);
      this.iy -= Math.sin(this.rad);
      this.$jet.style.transform = this.getTranslate();
      let me = this.getBounds();
      if (this.dot) {
        if (Math.abs((me.x + 25) - (this.dot.x + 3)) <= 1 && Math.abs((me.y + 25) - (this.dot.y + 3)) <= 1) {
          this.dot = null;
          this.ondot(this);
        }
      }
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
  getBounds() {
    return this.$jet.getBoundingClientRect();
  }
  deadCheck(jets) {
    if (this.dead) {
      return 1;
    }
    let me = this.getBounds();
    jets.forEach(jet => {
      if (jet.id != this.id && ! jet.hidden) {
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
  headToDot($dot) {
    this.dot = $dot.getBoundingClientRect();
    let me = this.getBounds();
    let rad = Math.atan2((me.y + 25) - (this.dot.y + 3), (this.dot.x + 3) - (me.x + 25));
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
  $createJet(i, clockspeed) {
    this.$jet = document.createElement('div');
    this.$jet.id = 'jet' + i;
    this.$jet.className = 'jet';
    this.$jet.innerHTML = $('.jet.blueprint').innerHTML;
    $('#radar').appendChild(this.$jet);
    this.$jet.style.left = this.x;
    this.$jet.style.top = this.y;
    this.$svg = this.$jet.$('svg');
    this.$jet.style.transition = 'transform ' + this.cycle * clockspeed + 'ms ease-in-out';
    this.$jet.style.transform = this.getTranslate();
    this.$svg.style.transform = this.getRotate();
    this.$svg.style.transition = 'all 0.1s ease';
    this.$jet
      .on('mousedown', e => this.onmousedown(this, e))
      .on('mouseover', () => this.$jet.classList.add('glow'))
      .on('mouseout', () => this.$jet.classList.remove('glow'));
  }
  getTranslate() {
    return 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  getRotate() {
    return 'rotate(' + (45 - this.heading) + 'deg) ';
  }
}