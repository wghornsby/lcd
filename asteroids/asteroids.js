class Controller extends LG.Controller {
  //
  constructor() {
    super();
    this.reset();
    this.mx = window.innerWidth;
    this.my = window.innerHeight;
    this.ship = this.add(new Ship(this.mx / 2 - 20, this.my / 2 - 20));
    window
      .on('keydown', e => this.onkeydown(e))
      .on('keyup', e => this.onkeyup(e));
    this.start();
  }
  onkeydown(e) {
    switch (e.key) {
      case 'S':
      case 's':
      case 'ArrowLeft':
        this.ship.turn(-1);
        break;
      case 'D':
      case 'd':
      case 'ArrowRight':
        this.ship.turn(1);
        break;
      case 'K':
      case 'k':
      case 'ArrowUp':
        this.ship.thrust(1);
        break;
        }
  }
  onkeyup(e) {
    switch (e.key) {
      case 'S':
      case 's':
      case 'D':
      case 'd':
      case 'ArrowLeft':
      case 'ArrowRight':
            this.ship.turn(0);
        break;
      case 'K':
      case 'k':
      case 'ArrowUp':
        this.ship.thrust(0);
        break;
      }
  }
}
class Ship extends LG.RotatingSprite {
  //
  constructor(x, y) {
    super($('#screen'), $('#shipbp'), 'ship', x, y, 90);
    this.rot = 0;
    this.accel = new Acceleration();
    this.speed = new Velocity();
  }
  turn(dir/*-1=left, +1=right, 0=off*/) {
    this.rot = -dir;
  }
  thrust(on/*1=on, 0=off*/) {
    this.thrusting = on;
  }
  step(ms) {
    if (this.rot) {
      this.rotate(this.rot * 3);
    }
    this.forward();
    if (ms % 100 == 0) {
      if (this.thrusting) {
        this.accel.thrust(this.compass);
        this.speed.accelerate(this.accel);
      } else {
        this.accel.off();
      }
      if (this.speed.nonzero()) {
        this.speed.friction();
      }
    }
  }
  forward() {
    if (this.speed.nonzero()) {
      this.ix += this.speed.x;
      this.iy += this.speed.y;
      this.setTranslateCss();
    }
  }
}
class Vector {
  //
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  nonzero() {
    return this.x || this.y;
  }
  reset() {
    this.x = 0;
    this.y = 0;
  }
  add(that, max) {
    this.x += that.x;
    this.y += that.y;
    if (max) {
      if (Math.abs(this.x) > max) {
        this.x = Math.sign(this.x) * max;
      }
      if (Math.abs(this.y) > max) {
        this.y = Math.sign(this.y) * max;
      }  
    }
  }
}
class Velocity extends Vector {
  //
  constructor() {
    super();
  }
  accelerate(accel) {
    this.add(accel, Velocity.MAX);
  }
  friction() {
    this.x = this.dimin(this.x);
    this.y = this.dimin(this.y);
  }
  dimin(e) {
    if (e == 0 || Math.abs(e) < 0.1) {
      return 0;
    }
    return e *  Velocity.FC;
  }
  static FC = 0.84;
  static MAX = 13;
}
class Acceleration extends Vector {
  //
  constructor() {
    super();
    this.reset();
  }
  reset() {
    super.reset();
    this.ac = Acceleration.AC;
  }
  thrust(compass) {
    let v = new Vector(this.ac * Math.cos(compass.rad), this.ac * -Math.sin(compass.rad));
    this.add(v, Acceleration.MAX);    
  }
  off() {
    this.reset();
  }
  static MAX = 13;
  static AC = 0.16;
}
