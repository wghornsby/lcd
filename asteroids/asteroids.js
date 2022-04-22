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
    this.score = 0;
    this.showScore();
    this.reset();
    this.start();
  }
  reset() {
    let sf = 1.5;
    this.sprites = new LG.Sprites(this.ship);
    for (let i = 0; i < 6; i++) {
      this.sprite(Rock.asBig(rnd(window.innerWidth), rnd(window.innerHeight), sf));
    }
    for (let i = 0; i < 0; i++) {
      this.sprite(Rock.asMedium(rnd(window.innerWidth), rnd(window.innerHeight), sf));
    }
    for (let i = 0; i < 0; i++) {
      this.sprite(Rock.asSmall(rnd(window.innerWidth), rnd(window.innerHeight), sf));
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
        let shot = this.ship.shoot();
        if (shot) {
          this.sprites.push(shot);
        }
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
    let newRocks = [];
    this.sprites.of(Shot).forEach(shot => this.checkShot(shot, newRocks));
    if (newRocks.length) {
      this.sprites = this.sprites.concat(newRocks);
    }
    this.sprites.forEach(sprite => this.wrap(sprite));
  }
  //
  checkShot(shot, newRocks) {
    let b = shot.bounds(), victim;
    this.sprites.forEach(s => {
      if (s.contains(b.cx, b.cy)) {
        if (Rock.is(s) || (Ship.is(s) && shot.type == 2) || (Ufo.is(s) && shot.type == 1)) {
          victim = s;
        }
      }
    })
    if (victim) {
      this.showScore(victim.worth());
      shot.kill(1);
      if (Rock.is(victim)) {
        victim.shot(newRocks);
      }
    }
  }
  wrap(sprite) {
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
  }
  showScore(inc) {
    if (inc) {
      this.score += inc;
    }
    $('#score').innerText = this.score == 0 ? '00' : this.score;
  }
}
class Ufo extends LG.Sprite {
  // TODO
}
class Rock extends LG.Sprite {
  /**
   * sf speed factor
   * type 'rb', 'rm', or 'rs'
   */
  constructor(x, y, cls, sf, speed, vmin, vmax) {
    super($('#screen'), $('#rockbp1'), 'rock ' + cls, x, y, rnd(360));
    this.type = cls;
    this.sf = sf;
    this.rotate(rnd(360));
    let r = 1 + ((rnd(vmin + vmax) - vmin) / 100);
    this.speed = speed * r * sf;
  }
  step(ms) {
    this.advance(this.speed);
  }
  shot(newRocks) {
    let b = this.bounds();
    if (this.type == 'rb') {
      newRocks.push(Rock.asMedium(b.cx - 30, b.cy - 30, this.sf));
      newRocks.push(Rock.asMedium(b.cx - 30, b.cy - 30, this.sf));
    } else if (this.type == 'rm') {
      newRocks.push(Rock.asSmall(b.cx - 15, b.cy - 15, this.sf));
      newRocks.push(Rock.asSmall(b.cx - 15, b.cy - 15, this.sf));
    }
    this.explode(b).kill(1);
  }
  explode(b) {
    let $e = document.createElement('div');
    $e.style.left = b.x;
    $e.style.top = b.y;
    $e.className = 'xrock x' + this.type;
    $e.innerHTML = $('#xrockbp').innerHTML;
    $('#screen').appendChild($e);
    return this;
  }
  worth() {
    switch (this.type) {
      case 'rb':
        return 20;
      case 'rm':
        return 50;
      case 'rs':
        return 100;
    }
  }
  //
  static asBig(x, y, sf = 1) {
    return new Rock(x, y, 'rb', sf, 0.7, 30, 50);
  }
  static asMedium(x, y, sf = 1) {
    return new Rock(x, y, 'rm', sf, 1, 50, 70);
  }
  static asSmall(x, y, sf = 1) {
    return new Rock(x, y, 'rs', sf, 1.5, 60, 80);
  }
}
class Ship extends LG.Sprite {
  //
  constructor(x, y) {
    super($('#screen'), $('#shipbp'), 'ship', x, y, 90);
    this.rot = 0;
    this.accel = new Ship.Acceleration();
    this.speed = new Ship.Velocity();
    this.shots = [];
  }
  turn(dir/*-1=left, +1=right, 0=off*/) {
    this.rot = -dir;
  }
  thrust(on/*1=on, 0=off*/) {
    this.thrusting = on;
    if (on) {
      this.$$frames[1].classList.add('thrusting');
    } else {
      this.$$frames[1].classList.remove('thrusting');
    }
  }
  shoot() {
    if (this.shots.length < 4) {
      let shot = Shot.fromShip(this);
      this.shots.push(shot);
      return shot;
    }
  }
  step(ms) {
    if (this.rot) {
      let deg = this.rot * Ship.ROTC;
      this.rotate(deg);
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
    this.shots = this.shots.filter(shot => ! shot.dead);
  }
  forward() {
    if (this.speed.nonzero()) {
      this.moveByVector(this.speed);
    }
  }
  moveTo(x, y) {
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
  /**
   * i type 1=ship 2=ufo
   */
  constructor(bounds, speed, rad, type) {
    super($('#screen'), null, 'shot ' + (type == 1 ? 'sshot' : 'ushot'), bounds.cx, bounds.cy);
    this.velocity = new Shot.Velocity(rad, speed);
    this.type = type;
    this.steps = 0;
  }
  step() {
    this.moveByVector(this.velocity);
    this.steps++;
    if (this.steps > Shot.STEPS) {
      this.kill(1);
    }
  }
  hits(sprites) {
    let b = this.bounds(), hit;
    return hit;
  }
  //
  static fromShip(ship) {
    return new Shot(ship.bounds(), ship.speed, ship.compass.rad, 1);
  }
  static fromUfo(ufo, rad) {
    return new Shot(ufo.bounds(), null, rad, 2);
  }
  static STEPS = 180;
}
Shot.Velocity = class extends Vector {
  //
  constructor(rad, shipv) {
    super();
    let v = Vector.byRadians(rad, Shot.Velocity.MAX);
    if (shipv) {
      this.x = this.merge(v.x, shipv.x * .8);
      this.y = this.merge(v.y, shipv.y * .8);
    }
  }
  merge(m, s) {
    return (Math.abs(m + s) < Math.abs(m)) ? m + s : m;
  }
  static MAX = 6;
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
