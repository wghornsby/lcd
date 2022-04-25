class Controller extends LG.Controller {
  //
  constructor() {
    super();
    this.mx = window.innerWidth;
    this.my = window.innerHeight;
    this.zone = new Zone(this.mx, this.my);
    this.ship = new Ship(this.mx / 2 - 20, this.my / 2 - 20)
      .on('explode', () => this.ship_onexplode())
      .on('dead', () => this.ship_ondead());
    this.scoreboard = new Scoreboard(3);
    window
      .on('keydown', e => this.onkeydown(e))
      .on('keyup', e => this.onkeyup(e));
    this.reset();
    this.start();
  }
  reset() {
    //let sf = 1;
    //let rocks = 4;
    let sf = 1;
    let rocks = 12;
    //let sf = 1.5;
    //let rocks = 12;
    //let sf = 1.65;
    //let rocks = 12;
    this.sprites = new LG.Sprites(this.ship);
    let x, y, min, max, edge;
    for (let i = 0; i < rocks; i++) {
      edge = (rnd(this.mx + this.my) < this.mx) ? rnd(2) * 2 : rnd(2) * 2 + 1;
      switch (edge) {
        case 0:
          x = rnd(this.mx - 120), y = 0;
          min = 210, max = 330;
          break;
        case 1:
          x = this.mx - 120, y = rnd(this.my - 120);
          min = 120, max = 240;
          break;
        case 2:
          x = rnd(this.mx - 120), y = this.my - 120;
          min = 30, max = 150;
          break;
        case 3:
          x = 0, y = rnd(this.my - 120);
          min = 300, max = 60;
          break;
      }
      this.sprite(Rock.asBig(x, y, sf, min, max));
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
      case ' ':
        this.ship.hyperspace();
        break;
      case 'P':
      case 'p':
        this.paused ? this.start() : this.pause();
        break;
      case 'u':
        this.ufo();
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
    let ship = this.ship.bounds();
    if (this.ufo) {
      if (this.ship.alive() && this.ufo.withinCircle(ship.cx, ship.cy)) {
        this.ufo.kill();
        this.ship.kill();
      } else {
        let b = this.ufo.bounds();
        if (this.checkRocks(b, newRocks)) {
          this.ufo.kill();
        }
      }
    }
    if (this.ship.alive()) {
      let rock = this.checkRocks(ship, newRocks);
      if (rock) {
        this.ship.kill(rock);
      }
    }
    if (newRocks.length) {
      this.sprites = this.sprites.concat(newRocks);
    }
    this.sprites = this.sprites.filter(sprite => ! sprite.dead);
    this.sprites.forEach(sprite => this.wrap(sprite));
    if (this.checkZone) {
      let safe = true;
      this.sprites.of(Rock).forEach(rock => {
        if (this.zone.contains(rock)) {
          safe = false;
        }
      })
      if (safe) {
        this.checkZone = 0;
        this.zone_onsafe();
      }
    } 
  }
  //
  ship_onexplode() {
    this.scoreboard.die();
  }
  ship_ondead() {
    if (this.scoreboard.gameover) {
      alert('gameover');
    } else {
      this.checkZone = 1;
    }
  }
  zone_onsafe() {
    this.sprite(this.ship.reset());
  }
  checkRocks(b, newRocks) {
    let hit = 0;
    this.sprites.alive(Rock).forEach(rock => {
      if (! hit && rock.withinCircle(b.cx, b.cy)) {
        rock.kill(newRocks);
        hit = rock;
      }
    })
    return hit;
  }
  checkShot(shot, newRocks) {
    let b = shot.bounds(), victim;
    this.sprites.alive().forEach(s => {
      if (s.contains(b.cx, b.cy)) {
        if (Rock.is(s) || (Ship.is(s) && shot.type == 2) || (Ufo.is(s) && shot.type == 1)) {
          victim = s;
        }
      }
    })
    if (victim) {
      this.scoreboard.add(victim.worth());
      shot.kill(1);
      if (Rock.is(victim)) {
        victim.kill(newRocks);
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
}
class Zone {
  //
  constructor(mx, my) {
    this.x = mx / 2;
    this.y = my / 2;
    this.r = 125;
  }
  contains(rock) {
    return rock.distanceFrom(this.x, this.y) <= this.r;
  }
}
class Scoreboard extends LG.Obj {
  /**
   * i lives
   * i score
   * b gameover
   */
  constructor(lives) {
    super();
    this.$score = $('#score');
    this.lives = lives;
    this.ships = [];
    this.reset();
  }
  reset() {
    this.gameover = 0;
    this.score = 0;
    this.$score.innerText = '00';
    this.draw();
  }
  add(i) {
    this.score += i;
    this.$score.innerText = this.score;
    if (this.score % 10000 == 0) {
      this.bonus();
    }
  }
  bonus() {
    this.lives++;
    this.draw();
  }
  die() {
    this.lives--;
    this.draw();
    this.gameover = this.lives == 0;
  }
  //
  draw() {
    var s = this.ships.length;
    var d = this.lives - s;
    if (d == -1) {
      this.ships.pop().kill(1);
    } else {
      for (var i = 0; i < d; i++) {
        let x = 220 + s * 25 + i * 25;
        this.ships.push(new Life(x, 25));
      }
    }
  }
}
class Life extends LG.Sprite {
  //
  constructor(x, y) {
    super($('#screen'), $('#shipbp'), 'life', x, y, 90, 90);
  }
}
class Ship extends LG.Sprite {
  onexplode() {}
  ondead() {}
  //
  constructor(x, y) {
    super($('#screen'), $('#shipbp'), 'ship', x, y, 90);
    this.x0 = x;
    this.y0 = y;
    this.shots = [];
    this.reset();
  }
  reset() {
    this.moveTo(this.x0, this.y0).heading(0);
    this.dead = 0;
    this.thrusting = 0;
    this.exploding = 0;
    this.hypering = 0;
    this.hypers = 0;
    this.accel = new Ship.Acceleration();
    this.speed = new Ship.Velocity();
    this.rot = 0;
    this.show(1);
    return this;
  }
  step(ms) {
    if (this.exploding) {
      this.forward();
      if (this.thrusting) {
        this.accel.off();
      }
      if (this.speed.nonzero()) {
        this.speed.friction();
      }
      return;
    }
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
    this.shots = this.shots.filter(shot => ! shot.dead);
  }
  alive() {
    return ! this.dead && ! this.exploding && ! this.hypering;
  }
  turn(dir/*-1=left, +1=right, 0=off*/) {
    this.rot = -dir;
  }
  thrust(on/*1=on, 0=off*/) {
    if (on && ! this.alive()) {
      return;
    }
    this.thrusting = on;
    this.$$frames[1].classList.toggle('thrusting', on);
  }
  shoot() {
    if (! this.alive() || this.shots.length >= 4) {
      return;
    }
    let shot = Shot.fromShip(this);
    this.shots.push(shot);
    return shot;
  }
  hyperspace() {
    if (! this.alive()) {
      return;
    }
    this.hypering = 1;
    animate(this.$frame, 'hyperout 0.4s normal 1', () => {
      this.show(0);
      this.moveTo(rnd(window.innerWidth), rnd(window.innerHeight));
      this.show(1);
      animate(this.$frame, 'hyperin 0.4s normal 1', () => {
        this.hypering = 0;
        this.hypers++;
        if (this.hypers > 2) {
          if (rnd(12 - this.hypers) == 0) {
            this.kill();
          }
        }    
      });
    });
  }
  kill(rock) {
    if (rock) {
      let sf = rock.type == 'rb' ? 4 : rock.type == 'rm' ? 2 : 1;
      this.speed.add(Vector.byRadians(rock.compass.rad, rock.speed * sf));
    }
    this.onexplode();
    this.explode(() => {
      super.kill();
      this.show(0);
      this.ondead();
    });
  }
  explode(ondone) {
    this.exploding = 1;
    this.thrust(0);
    let b = this.bounds();
    let $e = document.createElement('div');
    $e.className = 'pow xship';
    $e.innerHTML = $('#powbp').innerHTML;
    $('#screen').appendChild($e);
    $e.style.left = b.x - 25;
    $e.style.top = b.y - 25;
    animate(this.$frame, 'dive 4s normal 1', () => {
      $e.remove();
      ondone();
    })
  }
  worth() {
    return 0;
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
  static STEPS = 90;
}
Shot.Velocity = class extends Vector {
  //
  constructor(rad, shipv) {
    super();
    let v = Vector.byRadians(rad, Shot.Velocity.MAX);
    if (shipv) {
      this.x = this.merge(v.x, shipv.x * 1.2);
      this.y = this.merge(v.y, shipv.y * 1.2);
    }
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
class Ufo extends LG.Sprite {
  // TODO
}
class Rock extends LG.Sprite {
  /**
   * sf speed factor
   * type 'rb', 'rm', or 'rs'
   */
  constructor(x, y, cls, sf, speed, vmin, vmax, minHead = 0, maxHead = 359) {
    let r = rnd(2);
    let fcls = r == 0 ? 'rock ccw ' + cls : 'rock ' + cls;
    if (minHead > maxHead) {
      minHead = r ? minHead : 0;
      maxHead = r ? 359 : maxHead;
    }
    super($('#screen'), $('#rockbp1'), fcls, x, y, minHead + rnd(maxHead - minHead + 1));
    this.type = cls;
    this.sf = sf;
    this.rotate(rnd(360));
    r = 1 + ((rnd(vmin + vmax) - vmin) / 100);
    this.speed = speed * r * sf;
  }
  step(ms) {
    this.advance(this.speed);
  }
  kill(newRocks) {
    let b = this.bounds();
    this.shot(b, newRocks);
    this.explode(b);
    super.kill(1);
  }
  withinCircle(x, y) {
    return super.withinCircle(x, y, 1.5);
  }
  shot(b, newRocks) {
    if (this.type == 'rb') {
      newRocks.push(Rock.asMedium(b.cx - 30, b.cy - 30, this.sf));
      newRocks.push(Rock.asMedium(b.cx - 30, b.cy - 30, this.sf));
    } else if (this.type == 'rm') {
      newRocks.push(Rock.asSmall(b.cx - 15, b.cy - 15, this.sf));
      newRocks.push(Rock.asSmall(b.cx - 15, b.cy - 15, this.sf));
    }
  }
  explode(b) {
    let $e = document.createElement('div');
    $e.style.left = b.x;
    $e.style.top = b.y;
    $e.className = 'xrock x' + this.type;
    $e.innerHTML = $('#xrockbp').innerHTML;
    $('#screen').appendChild($e);
    animate($e, 'agrow 0.4s linear 1', () => $e.remove());
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
  static asBig(x, y, sf, minHead, maxHead) {
    return new Rock(x, y, 'rb', sf, 0.7, 30, 50, minHead, maxHead);
  }
  static asMedium(x, y, sf) {
    return new Rock(x, y, 'rm', sf, 1, 50, 70);
  }
  static asSmall(x, y, sf) {
    return new Rock(x, y, 'rs', sf, 1.5, 60, 80);
  }
}
