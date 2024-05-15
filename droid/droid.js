class DroidRescue extends LG.Controller {
  //
  constructor() {
    super();
    new Stars(LG.Screen.tw * LG.Screen.th / 5000);
    this.script = new Script().start().next().next().next();
    this.mom$ = this.register(new Mom());
    this.ship$ = this.register(new Ship(this.mom$));
    this.pads$ = new Pads();
    this.mode = new Mode();
    this.keyboard = new Keyboard(this.mode)
      .on('left', b => this.key_onleft(b))
      .on('right', b => this.key_onright(b))
      .on('fire', b => this.key_onfire(b))
      .on('start', () => this.key_onstart())
      .on('pause', () => this.key_onpause())
      .on('entering', key => this.key_onentering(key));   
    this.newGame();
  }
  newGame() {
    this.mode.set(Mode.GAME_STARTING);
    this.start();
  }
  newBoard() {
    this.killSprites(Rock, Droid);
    this.rocks$ = this.register(new Rocks(this.script));
    this.droids$ = this.register(new Droids());
    this.pads$.reset();
  }
  step(fix) {
    if (fix == 0) { // 80) {
      this.mom$.show().scan();
      this.mode.set(Mode.GAME_IN_PROGRESS);
      this.newBoard();
    }
    if (fix > 100 && fix % 100 == 0) {
      this.droids$.jump();
    }
    if (this.ship$.mode == Ship.FALLING) {
      let b = this.ship$.bounds();
      let rock = this.rocks$.collidingWith(b);
      if (rock) {
        // todo - kill rock and ship
      }
      let pad = this.pads$.isLanded(b);
      if (pad) {
        this.ship$.land(pad.vy);
      }
    }
    super.step();
  }
  key_onfire(b) {
    if (b) {
      this.mom$.stop();
      this.ship$.undock();
    }
  }
  key_onleft(b) {
    this.ship$.left(b);
  }
  key_onright(b) {
    this.ship$.right(b);
  }
}
class Pads extends Array {
  constructor() {
    super(
      new Pad('left'),
      new Pad('middle'),
      new Pad('right')
    );
  }
  reset() {
    this.forEach($pad => $pad.reset());
  }
  isLanded(b) {
    let landed = null;
    this.forEach(pad => {
      if (pad.isLanded(b)) {
        landed = pad;
      }
    })
    return landed;
  }
}
class Pad {
  /**
   * i top (top tier top)
   * i left (top tier left x)
   * i right (top tier right x)
   */
  constructor(cls) {
    this.$me = $('landingpad.' + cls);
    this.$$tiers = this.$me.$$('pad');
  }
  reset() {
    this.$$tiers.forEach($tier => {
      $tier.classList.toggle('hide', 0);
    })
    this.tt = -1;
    this.pop();
  } 
  isEmpty() {
    return this.tt == 3;
  }
  pop() {
    this.tt++;
    if (this.tt == 3) {
      return;
    }
    let $tier = this.$$tiers[this.tt];
    let b = $tier.getBoundingClientRect();
    let fudge = b.width * 0.2;
    this.top = b.top;
    this.left = b.left - fudge;
    this.right = b.right + fudge;
    let vpos = LG.Screen.vpos(this.left, this.top);
    this.vy = vpos.vy;
    $tier.classList.toggle('lit', 1);
    if (this.tt > 0) {
      this.$$tiers[this.tt - 1].classList.toggle('hide', 1);
    }
  }
  isLanded(b) {
    return b.left >= this.left && b.right <= this.right && Math.abs(b.bottom - this.top) < 5
  }
  //
  static SCORES = [100, 200, 300];
}
class Droids extends LG.Sprites {
  //
  constructor() {
    super(
      new Droid('lt'), 
      new Droid('lm'),
      new Droid('lb'),
      new Droid('rt'), 
      new Droid('rm'),
      new Droid('rb')      
    );
  }
  jump() {
    if (this.jumper) {
      this.jumper.jump(0);
      this.jumper = null;
      return;
    }
    this.jumper = this[rnd(this.length)];
    this.jumper.jump(1);
  }
}
class Droid extends LG.Sprite {
  //
  constructor(cls) {
    super('droid').setClass(cls);
  }
  jump(i) {
    this.toggleClass('jump', i);
  }
}
class Rocks extends LG.Sprites {
  //
  constructor(script) {
    super();
    this.add(Rock.asBig, script.bigs);
    this.add(Rock.asMedium, script.meds);
    this.add(Rock.asSmall, script.lils);
  }
  collidingWith(b) {
    let hit = 0;
    this.alive().forEach(rock => {
      if (! hit && rock.withinCircle(b.cx, b.cy)) {
        hit = rock;
      }
    })
    return hit;
  }
  //
  add(rockf, ct) {
    for (let i = 0; i < ct; i++) {
      this.push(rockf());
    }
  }
}
class Rock extends LG.Sprite {
  //
  constructor(cls, speed) {
    let heading = 180 * rnd(2);
    super('rock').setClass(cls).setHeading(heading);
    let zone = rnd(5);
    let vb = this.vbounds();
    let vw = LG.Screen.vw - vb.vwidth;
    let vx = rnd(vw);
    let py = cls == 'med' ? 18 : cls == 'lil' ? 36 : 0;
    let vy = 115 + 103 * zone + py + (rnd(10) - 5);
    this.setPos(vx, vy).toggleClass('show', 1).toggleClass('ccw', heading == 180);
    this.x0 = heading == 180 ? vw : 0;
    this.x1 = heading == 180 ? 0 : vw;
    let fudge = 0.8 + rnd(400) / 1000;
    this.speed = speed * fudge;
    this.heading = heading;
  }
  step(fix) {
    this.move(this.speed);
    let vb = this.vbounds(), wrap;
    if (this.heading == 0) {
      wrap = vb.vx >= this.x1;
    } else {
      wrap = vb.vx <= this.x1;
    }
    if (wrap) {
      this.setPos(this.x0, vb.vy);
    }
  }
  //
  static asBig() {
    return new Rock('big', 0.66);
  }
  static asMedium() {
    return new Rock('med', 0.8);
  }
  static asSmall() {
    return new Rock('lil', 1.3);
  }
}
class Ship extends LG.Sprite {
  //
  constructor(mom$) {
    super('ship');
    this.mom$ = mom$;
    this.lvector0 = new LG.Vector(-2.5, 0);
    this.rvector0 = new LG.Vector(2.5, 0);
    this.dvector = new Ship.VelocityDown();
    this.daccel = new Ship.AccelDown();
    this.reset();
  }
  reset() {
    this.mode = Ship.RESET;
    this.lvector = null;
    this.rvector = null;
    this.hide();
    return this;
  }
  step() {
    switch (this.mode) {
      case Ship.FALLING:
        this.daccel.thrust(0);
        this.dvector.accelerate(this.daccel);
        this.moveByVector(this.dvector);
        if (this.lvector) {
          this.moveByVector(this.lvector);
        }
        if (this.rvector) {
          this.moveByVector(this.rvector);
        }
        break;
    }
  }
  left(b) {
    this.lvector = b ? this.lvector0 : null;
  }
  right(b) {
    this.rvector = b ? this.rvector0 : null;
  }
  undock() {
    this.mode = Ship.FALLING;
    this.toggleClass('thrusting', 1);
    let b = this.mom$.vbounds();
    this.setPos(b.vx + 43, b.vy + 47).setHeading(270).show();
  }
  land(vy) {
    this.mode = Ship.LANDED;
    let vb = this.vbounds();
    vy -= vb.vheight;    
    this.setPos(vb.vx, vy);
  }
  //
  static RESET = 1;
  static FALLING = 2;
  static LANDED = 3;
  static RISING = 4;
  static DOCKED = 5;
}
Ship.VelocityDown = class extends LG.Vector {
  //
  accelerate(accel) {
    this.add(accel, Ship.VelocityDown.MAX);
  }
  static MAX = 7;
}
Ship.AccelDown = class extends LG.Vector {
  //
  constructor() {
    super();
    this.reset();
  }
  reset() {
    super.reset();
    this.ac = 0.02;
  }
  thrust(b) {
    let v = new LG.Vector(0, this.ac);
    this.add(v, Ship.AccelDown.MAX);
  }
  off() {
    this.reset();
  }
  static MAX = 0.1;
}
class Mom extends LG.Sprite {
  //
  constructor() {
    super('ufo');
    this.reset();
  }
  reset() {
    this.mode = 0;
    this.stop().setPos(25, 3).hide();
    return this;
  }
  scan() {
    this.mode = Mom.SCANNING;
    this.toggleClass('moving', 1);
    return this;
  }
  stop() {
    this.mode = Mom.STOPPED;
    let b = this.vbounds();
    this.setPos(b.vx, b.vy);
    this.toggleClass('moving', 0);
    return this;
  }
  release() {
    // todo
  }
  open() {
    // todo
  }
  //
  static STOPPED = 1;
  static SCANNING = 2;
  static RELEASING = 3;
  static DOCKING = 4;
  static DOCKED = 5;
}
class Mode {
  //
  constructor() {
    this.reset();
  }
  is(mode) {
    return this.mode == mode;
  }
  isDemo() {
    return this.mode <= Mode.DEMO_SCORES;
  }
  isEnteringScore() {
    return this.mode == Mode.ENTERING_SCORE;
  }
  set(mode) {
    this.mode = mode;
  }
  start() {
    this.set(Mode.GAME_STARTING);
  }
  demo() {
    this.set(Mode.DEMO);
  }
  next() {
    this.set(this.mode + 1);
  }
  //
  reset() {
    this.mode = 0;
  }
  //
  static DEMO_WELCOME = 1;
  static DEMO_SCORES = 2;
  static GAME_STARTING = 3;
  static GAME_IN_PROGRESS = 4;
  static GAME_OVER = 5;
  static ENTERING_SCORE = 6;
}
class Script {
  //
  reset() {
    this.board = 0;
    this.round = 0;
    this.bigs = 0;
    this.meds = 0;
    this.lils = 0;
    return this;
  }
  start() {
    this.reset().next();
    return this;
  }  
  next() {
    this.round = (this.board++ / 6 | 0) + 1;
    let nobigs = this.round == 1 && this.board <= 2;
    let rocks = 0;
    switch (this.round) {
      case 1:
        if (this.board < 3) {
          rocks = 8;
        } else if (this.board < 4) {
          rocks = 9;
        } else if (this.board < 6) {
          rocks = 10;
        } else {
          rocks = 11;
        }
        break;
      case 2:
        if (this.board < 1) {
          rocks = 12;
        } else if (this.board < 3) {
          rocks = 13;
        } else {
          rocks = 14;
        }
      default:
        rocks = 12 + this.board;
    }
    this.bigs = nobigs ? 0 : rnd(rocks / 3) + 1;
    this.lils = rnd(rocks / 3) + 2;
    this.meds = rocks - this.bigs - this.lils;
    return this;
  }
}
class Stars {
  //
  constructor(count) {
    for (let i = 0; i < count; i++) {
      let cls = 'c' + rnd(6) + ' ' + 'h' + rnd(3);
      let x = rnd(10000) / 100 + '%';
      let y = rnd(10000) / 100 + '%';
      let $star = document.createElement('star');
      $('screen').appendChild($star);
      $star.className = cls;
      $star.style.left = x;
      $star.style.top = y;
    }
  }
}
class Keyboard extends Obj {
  onleft(b) {}
  onright(b) {}
  onfire(b) {}
  onstart() {}
  onpause() {}
  onentering(key) {}
  //
  constructor(mode) {
    super();
    this.mode = mode;
    window
      .on('keydown', e => this.onkeydown(e))
      .on('keyup', e => this.onkeyup(e))
  }
  //
  onkeydown(e) {
    if (this.mode.isDemo()) {
      return;
    }
    switch (e.key) {
      case 'A':
      case 'a':
      case 'ArrowLeft':
        this.onleft(1);
        break;
      case 'S':
      case 's':
      case 'ArrowRight':
        this.onright(1);
        break;
      case 'K':
      case 'k':
      case 'L':
      case 'l':
      case ' ':
        this.onfire(1);
        break;
      case 'P':
      case 'p':
        this.onpause();
        break;
    }
  }
  onkeyup(e) {
    if (this.mode.isDemo()) {
      switch (e.key) {
        case '1':
          this.onstart();
          this.newGame();
      }
      return;
    }
    if (this.mode.isEnteringScore()) {
      this.onentering(e.key);
      return;
    }
    switch (e.key) {
      case 'A':
      case 'a':
      case 'ArrowLeft':
        this.onleft(0);
        break;
      case 'S':
      case 's':
      case 'ArrowRight':
        this.onright(0);
        break;
      case 'K':
      case 'k':
      case 'L':
      case 'l':
      case ' ':
        this.onfire(0);
        break;
    }
  }
}