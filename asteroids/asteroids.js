class Controller extends LG.Controller {
  //
  constructor() {
    super();
    window
      .on('keydown', e => this.onkeydown(e))
      .on('keyup', e => this.onkeyup(e));
    this.mx = window.innerWidth;
    this.my = window.innerHeight;
    this.ship = new Ship(this.mx / 2 - 20, this.my / 2 - 20);
    this.reset();
    this.start();
  }
  reset() {
    this.sprites = [this.ship];
    for (let i = 0; i < 3; i++) {
      this.sprite(Rock.asBig(rnd(window.innerWidth), rnd(window.innerHeight)));
    }
    for (let i = 0; i < 2; i++) {
      this.sprite(Rock.asMedium(rnd(window.innerWidth), rnd(window.innerHeight)));
    }
    for (let i = 0; i < 4; i++) {
      this.sprite(Rock.asSmall(rnd(window.innerWidth), rnd(window.innerHeight)));
    }
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
      case 'L':
      case 'l':
      case 'SpaceBar':
        this.ship.shoot();
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
  step() {
    super.step();
    this.sprites.forEach(sprite => {
      let b = sprite.bounds();
      if (b.x < 0) {
        sprite.moveTo(this.mx - b.width, b.y);
      } else if (b.x2 > this.mx) {
        sprite.moveTo(0, b.y);
      }
      if (b.y < 0) {
        sprite.moveTo(b.x, this.my - b.height);
      } else if (b.y2 > this.my) {
        sprite.moveTo(b.x, 0);
      }
    })
  }
}
class Rock extends LG.Sprite {
  //
  constructor(x, y, cls, speed, vmin, vmax) {
    super($('#screen'), $('#rockbp1'), cls, x, y, rnd(360));
    this.rotate(rnd(360));
    let sf = 1 + ((rnd(vmin + vmax) - vmin) / 100);
    this.speed = speed * sf;
  }
  step(ms) {
    this.advance(this.speed);
  }
  //
  static asBig(x, y, sf = 1) {
    return new Rock(x, y, 'rock rb', sf * 0.7, 30, 50);
  }
  static asMedium(x, y, sf = 1) {
    return new Rock(x, y, 'rock rm', sf * 1, 60, 80);
  }
  static asSmall(x, y, sf = 1) {
    return new Rock(x, y, 'rock rs', sf * 1.5, 80, 100);
  }
}
class Ship extends LG.Sprite {
  //
  constructor(x, y) {
    super($('#screen'), $('#shipbp'), 'ship', x, y, 90);
    this.rot = 0;
    this.accel = new Ship.Acceleration();
    this.speed = new Ship.Velocity();
    this.thruster = new Thruster(x, y);
    this.shots = [];
  }
  turn(dir/*-1=left, +1=right, 0=off*/) {
    this.rot = -dir;
  }
  thrust(on/*1=on, 0=off*/) {
    this.thrusting = on;
    this.thruster.thrust(on);
  }
  shoot() {
    if (this.shots.length < 4) {
      this.shots.push(new Shot(this.bounds(), this.speed, this.compass.rad));
    }
  }
  step(ms) {
    if (this.rot) {
      let deg = this.rot * Ship.ROTC;
      this.rotate(deg);
      this.thruster.rotate(deg);
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
    this.shots.forEach(shot => shot.step());
    this.shots = this.shots.filter(shot => shot.active);
  }
  forward() {
    if (this.speed.nonzero()) {
      this.moveByVector(this.speed);
      this.thruster.moveByVector(this.speed);
    }
  }
  moveTo(x, y) {
    this.thruster && this.thruster.moveTo(x, y);
    return super.moveTo(x, y);
  }
  //
  static ROTC = 2.8;
}
Ship.Velocity = class extends Vector {
  //
  constructor() {
    super();
  }
  accelerate(accel) {
    this.add(accel, Ship.Velocity.MAX);
  }
  friction() {
    this.x = this.dimin(this.x);
    this.y = this.dimin(this.y);
  }
  dimin(e) {
    if (e == 0 || Math.abs(e) < 0.1) {
      return 0;
    }
    return e * Ship.Velocity.FC;
  }
  static FC = 0.95;
  static MAX = 10;
}
Ship.Acceleration = class extends Vector {
  //
  constructor() {
    super();
    this.reset();
  }
  reset() {
    super.reset();
    this.ac = 0.36;
  }
  thrust(compass) {
    let v = Vector.byRadians(compass.rad, this.ac);
    this.add(v, Ship.Acceleration.MAX);    
    this.ac = Ship.Acceleration.AC;
  }
  off() {
    this.reset();
  }
  static MAX = 10;
  static AC = 0.1;
}
class Shot extends LG.Sprite {
  //
  constructor(bounds, speed, rad) {
    super($('#screen'), null, 'shot', bounds.cx, bounds.cy);
    this.velocity = new Shot.Velocity(rad, speed);
    this.x0 = this.x;
    this.y0 = this.y;
    this.steps = 0;
  }
  dead() {
    super.dead();
    this.$e.classList.add('hide');
  }
  step() {
    if (this.active) {
      this.moveByVector(this.velocity).wrap();
      this.steps++;
      if (this.steps > Shot.STEPS) {
        this.dead();
        return 1;
      }
    }
  }
  wrap() {
    let b = this.bounds();
    if (b.x < 0) {
      this.moveTo(window.innerWidth - b.width, b.y);
    } else if (b.x2 > window.innerWidth) {
      this.moveTo(0, b.y);
    }
    if (b.y < 0) {
      this.moveTo(b.x, window.innerHeight - b.height);
    } else if (b.y2 > window.innerHeight) {
      this.moveTo(b.x, 0);
    }
  }
  static STEPS = 70;
}
Shot.Velocity = class extends Vector {
  //
  constructor(rad, shipv) {
    super();
    let v = Vector.byRadians(rad, Shot.Velocity.MAX);
    this.x = this.merge(v.x, shipv.x * 1.2);
    this.y = this.merge(v.y, shipv.y * 1.2);
  }
  merge(m, s) {
    return (Math.abs(m + s) < Math.abs(m)) ? m + s : m;
  }
  static MAX = 12;
}
class Thruster extends LG.Sprite {
  //
  constructor(x, y) {
    super($('#screen'), $('#thrustbp'), 'thrust', x, y, 90);
    this.thrust(0);
  }
  thrust(on) {
    this.$e.className = on ? 'thrust thrusting' : 'thrust hide';
  }
}
