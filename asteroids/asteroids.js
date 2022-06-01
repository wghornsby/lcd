class Controller extends LG.Controller {
  /**
   * i mx, my
   * Sprites sprites (ship, rocks, ship shots, ufo, ufo shot)
   * Mode mode 
   * Ship ship
   * Rocks rocks
   * Ufo ufo (while active)
   * Zone zone (ship spawning zone, to be clear of rocks)
   * Scoreboard scoreboard
   * Script script
   * Scores highscores 
   * i rocksleft
   * i halfrocks (to identify when half the rocks are cleared)
   * i ufos (number of ufos spawned on this board)
   * i lastufo (fix of last ufo shot)
   * i lastrock (fix of last rock shot)
   */
  constructor() {
    super();
    this.mx = window.innerWidth;
    this.my = window.innerHeight;
    this.zone = new Zone(this.mx, this.my);
    this.highscores = new Scores();
    this.scoreboard = new Scoreboard(5, this.highscores.topScore());
    this.highscorelist = new HighScoreList(this.highscores);
    this.entry = new ScoreEntry();
    this.script = new Script();
    this.ship = new Ship()
      .on('explode', () => this.ship_onexplode())
      .on('dead', () => this.ship_ondead());
    this.mode = new Mode()
      .on('nextboard', () => this.nextBoard());
    window
      .on('keydown', e => this.onkeydown(e))
      .on('keyup', e => this.onkeyup(e))
      .on('resize', e => {
        this.mx = window.innerWidth;
        this.my = window.innerHeight;
      })
    this.demo();
  }
  demo(showHighScores = false) {
    this.mode.setDemo(showHighScores);
    $('#copy').innerHTML = '&copy;2022 by Warren';
    this.ship.dead = 1;
    this.script.reset();
    this.killSprites();
    this.sprites = new LG.Sprites();
    this.scoreboard.show(0);
    this.highscorelist.show(1);
    this.start(1);
    this.nextBoard();
  }
  newGame() {
    this.mode.start();
    this.ship.reset(this.mx, this.my);
    this.script.reset();
    this.scoreboard.show(1).reset();
    this.highscorelist.show(0);
    this.killSprites();
    this.sprites = new LG.Sprites(this.ship);
    this.start(1);
    $('#start').style.display = 'block';
    animate($('#start'), 'textgrow 3s 1', () => {
      $('#start').style.display = '';
    })
  }
  nextBoard() {
    this.mode.set(Mode.GAME_IN_PROGRESS);
    this.lastufo = this.fix;
    this.lastrock = this.fix;
    this.ufos = 0;
    this.ufo = null;
    if (this.mode.demo && this.script.rocks == 12) {
      this.script.reset();
    }
    this.script.next();
    if (! this.mode.demo) {
      let i = this.script.board < 15 ? this.script.board - 1 : 14;
      $('#copy').innerHTML = Script.LEVELS[i] + '<br>' + Script.AUS[i];
    }
    this.rocks = Rock.asBigs(this.script, this.mx, this.my);
    this.rocksleft = this.totalRocksLeft();
    this.halfrocks = this.rocksleft / 2;
    this.sprites.append(this.rocks);
  }
  enterScore(fn) {
    this.mode.entering = 1;
    this.entry.show((inits) => fn(inits));
  }
  step(fix) {
    if (this.rocksleft && fix > 50) {
      let b = Math.floor(this.rocksleft / this.halfrocks * 25) + 10;
      if (fix % b == 0) {
        Sounds.beat();
      }
    }
    super.step(fix);
    this.mode.step();
    if (this.mode.is(Mode.GAME_STARTING) || this.mode.is(Mode.BOARD_FINISHING)) {
      this.wrap(this.ship);
      return;
    }
    this.checkUfoSpawn();
    this.checkCollisions();
    this.sprites = this.sprites.filter(sprite => ! sprite.dead);
    this.sprites.forEach(sprite => this.wrap(sprite));
    if (this.rocksleft == 0 && ! this.ufo) {
      this.board_onfinish();
    }
    this.checkZone();
  }
  killSprites() {
    this.sprites.forEach(sprite => {
      if (Rock.is(sprite)) {
        sprite.kill();
      } else if (Ufo.is(sprite) || Shot.is(sprite)) {
        sprite.kill(1);
      }
    })
  }
  ship_ondead() {
    if (this.scoreboard.gameover()) {
      Sounds.mute();
      $('#gameover').style.display = 'block';
      let nhs = this.highscores.qualifies(this.scoreboard.score);
      animate($('#gameover'), 'textgrow 3s 1', () => {
        if (! nhs) {
          wait(3000, () => {
            $('#gameover').style.display = '';
            this.demo(1);  
          })
        }
      })
      if (nhs) {
        this.enterScore(inits => {
          $('#gameover').style.display = '';
          this.highscores.record(this.scoreboard.score, inits);
          this.scoreboard.highscore(this.highscores.topScore());
          this.highscorelist.draw();
          this.demo(1);    
        })
      }
    } else {
      this.checkZoneClear = 1;
    }
  }
  ship_onexplode() {
    this.scoreboard.die();
  }
  zone_onsafe() {
    this.sprite(this.ship.reset(this.mx, this.my));
  }
  board_onfinish() {
    this.mode.finish();
  }
  totalRocksLeft() {    
    let left = 0;
    this.rocks.forEach(rock => left = left + (rock.type == 'rb' ? 7 : (rock.type == 'rm' ? 3 : 1)));
    return left;
  }
  checkUfoSpawn() {
    if (this.ufo) {
      return;
    }
    if (! this.mode.demo && ! this.ship.alive()) {
      return;
    }
    let mar = this.script.board < 5 ? 250 : this.script.board < 7 ? 200 : 150;
    if (this.lastufo && this.fix - this.lastufo < mar) {
      return;
    }
    let cls;
    if ((this.fix - this.lastrock > mar) || (this.ufos == 0 && this.rocksleft <= this.halfrocks) || (this.script.board >= 5 && this.rocksleft <= 4)) {
      cls = 'ub';
      if (this.rocksleft <= 6 || this.scoreboard.score > 40000) {
        cls = 'us';
      }
      if (this.script.board > 1 && this.ufos > 3) {
        cls = 'us';
      }
      if (this.script.board > 4 && this.ufos > 2) {
        cls = 'us';
      }
      if (this.script.board == 1 && this.ufos < 3) {
        cls = 'ub';
      }
      if (this.scoreboard.gameover()) {
        cls = 'us';
      }
      if (this.mode.demo) {
        cls = rnd(4) == 0 ? 'ub' : 'us';
      }
    }
    if (cls) {
      this.ufos++;
      this.ufo = this.sprite(Ufo.create(this.ship, this.rocks, cls, this.mx, this.my, this.script.sf, this.mode.demo)
        .on('shoot', shot => this.sprite(shot)));
    }
  }
  checkCollisions() {
    let newRocks = [];
    let rockhit = 0;
    this.sprites.of(Shot).forEach(shot => {
      let target = this.checkShot(shot);
      if (target) {
        if (shot.type == 1) {
          this.scoreboard.add(target.worth());
        }
        shot.kill(1);
        if (Rock.is(target)) {
          target.kill(newRocks);
          rockhit = 1;
          if (shot.type == 1) {
            this.lastrock = this.fix;
          }
        } else {
          target.kill();
        }
      }        
    })
    let sb = this.ship.bounds();
    if (this.ufo) {
      if (this.ship.alive() && this.ufo.withinCircle(sb.cx, sb.cy)) {
        this.scoreboard.add(this.ufo.worth());
        this.ufo.kill();
        this.ship.kill();
      } else {
        let b = this.ufo.bounds();
        let rock = this.checkRocks(b);
        if (rock) {
          this.ufo.kill(rock);
          rock.kill(newRocks);
          rockhit = 1;
        }
      }
      if (this.ufo.dead) {
        this.ufo = null;
        this.lastufo = this.fix;
      }
    }
    if (this.ship.alive()) {
      let rock = this.checkRocks(sb);
      if (rock) {
        this.scoreboard.add(rock.worth());
        this.ship.kill(rock);
        rock.kill(newRocks);
        rockhit = 1;
      }
    }
    if (newRocks.length) {
      this.sprites = this.sprites.concat(newRocks);
    }
    if (rockhit) {
      this.rocks = this.sprites.alive(Rock);
      this.rocksleft = this.totalRocksLeft();
      if (this.ufo) {
        this.ufo.loadRocks(this.rocks);
      }
    }
  }
  checkRocks(b) {
    let hit = 0;
    this.sprites.alive(Rock).forEach(rock => {
      if (! hit && rock.withinCircle(b.cx, b.cy)) {
        hit = rock;
      }
    })
    return hit;
  }
  checkShot(shot) {
    let b = shot.bounds(), target;
    this.sprites.alive().forEach(s => {
      if (s.contains(b.cx, b.cy)) {
        if (Rock.is(s) || (Ship.is(s) && shot.type == 2) || (Ufo.is(s) && shot.type == 1)) {
          target = s;
        }
      }
    })
    return target;
  }
  checkZone() {
    if (! this.checkZoneClear || (this.ufo && this.ufo.type == 2)) {
      return;
    }
    let safe = true;
    this.sprites.of(Rock).forEach(rock => {
      if (this.zone.contains(rock)) {
        safe = false;
      }
    })
    if (safe) {
      this.checkZoneClear = 0;
      this.zone_onsafe();
    }
  }
  wrap(sprite) {
    let b = sprite.bounds();
    if (! Ufo.is(sprite)) {
      if (b.x < 0) {
        sprite.moveTo(this.mx - b.width, b.y);
      } else if (b.x2 > this.mx) {
        sprite.moveTo(0, b.y);
      }
    }
    if (b.y < 0) {
      sprite.moveTo(b.x, this.my - b.height);
    } else if (b.y2 > this.my) {
      sprite.moveTo(b.x, 0);
    }
  }
  onkeydown(e) {
    if (this.mode.demo || this.mode.entering) {
      return;
    }
    switch (e.key) {
      case 'A':
      case 'a':
      case 'ArrowLeft':
        this.ship.turn(-1);
        break;
      case 'S':
      case 's':
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
      case 'ArrowDown':
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
        this.pause();
        break;
    }
  }
  onkeyup(e) {
    if (this.mode.demo) {
      switch (e.key) {
        case '1':
          Sounds.start();
          this.newGame();
      }
      return;
    }
    if (this.mode.entering) {
      this.entry.onkeyup(e);
      return;
    }
    switch (e.key) {
      case 'A':
      case 'a':
      case 'S':
      case 's':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.ship.turn(0);
        break;
      case 'K':
      case 'k':
      case 'ArrowUp':
        this.ship.thrust(0);
        break;
      //case '/':
        //this.killSprites();
        //this.nextBoard();
        //break;
      }
  }
}
class Mode extends Obj {
  onnextboard() {}
  //
  constructor() {
    super();
    this.reset();
  }
  reset() {
    this.mode = 0;
    this.demo = 0;
    this.entering = 0;
    this.starting = 0;
    this.finishing = 0;
  }
  set(mode) {
    this.mode = mode;
  }
  setDemo(showHighScores = false) {
    this.demo = 1;
    this.entering = 0;
    this.demob = ! showHighScores;
    this.showDemoScreen();
  }
  is(mode) {
    return this.mode == mode;
  }
  start() {
    this.reset();
    this.mode = Mode.GAME_STARTING;
    this.starting = 1;
    $('#welcome').className = '';
    $('#highscores').className = '';
}
  finish() {
    this.mode = Mode.BOARD_FINISHING;
    this.finishing = 1;
  }
  showDemoScreen() {
    $('#welcome').classList.toggle('fadein', this.demob);
    $('#highscores').classList.toggle('fadein', ! this.demob);
  }
  step() {
    if (this.demo) {
      this.demo++;
      if (this.demo % 1000 == 0) {
        this.demob = ! this.demob;
        this.showDemoScreen();
      }
    }
    if (this.starting) {
      this.starting++;
      if (this.starting > 150) {
        this.starting = 0;
        this.onnextboard();
      }
      return;
    }
    if (this.finishing) {
      this.finishing++;
      if (this.finishing > 150) {
        this.finishing = 0;
        this.onnextboard();
      }
      return;
    }
  }
  //
  static GAME_STARTING = 1;
  static GAME_IN_PROGRESS = 2;
  static BOARD_FINISHING = 3;
}
class Scores extends StorableObj {
  /**
   * scores[] [{score:100,inits:'WGH'},..]
   */
  constructor() {
    super();
    this.scores = this.scores || Scores.CANNED;
  }
  topScore() {
    return this.scores[0]?.score;
  }
  bottomScore() {
    return this.scores.length < Scores.MAX ? 0 : this.scores[this.scores.length - 1].score;
  }
  forEach(fn) {
    this.scores.forEach((item, i) => fn(item, i));
  }
  qualifies(score) {
    if (score == 0) {
      return false;
    }
    let bs = this.bottomScore();
    return this.scores.length == Scores.MAX ? score > bs : score >= bs;
  }
  record(score, inits) {
    if (! this.qualifies(score)) {
      return;
    }
    let ins = 0;
    for (let i = this.scores.length - 1; i >= 0; i--) {
      if (score <= this.scores[i].score) {
        ins = i + 1;
        break;
      } 
    }
    if (ins < Scores.MAX) {
      this.scores.splice(ins, 0, {'score':score, 'inits':inits});
    }
    if (this.scores.length > Scores.MAX) {
      this.scores.length = Scores.MAX;
    }
    this.save();
  }
  static MAX = 10;
  static CANNED = [{score:990,inits:'UFO'},{score:520,inits:'ET'},{score:330,inits:'ALF'},{score:100,inits:'MTM'}]
}
class Script {
  /**
   * i board
   * d sf (speed factor, initially 1.0)
   * i rocks (initially 4)
   * i color (of rocks)
   */
  constructor() {
    this.reset();
  }
  reset() {
    this.board = 0;
    this.rocks = 2;
    this.sf = 1;
    this.color = 39;
    this.sat = 18;
    this.opac = '0.4';
  }
  next() {
    this.board++;
    this.ufos = 0;
    if (this.rocks < 12) {
      this.rocks += 2;
    } else if (this.sf == 1) {
      this.sf += 0.1;
      this.color = 96;
      this.sat = 20;
    } else if (this.sf < 1.2) {
      this.sf += 0.1;
      this.color += 50;
      this.sat += 30;
    } else if (this.sf < 1.6) {
      this.sf += 0.1;
      this.color += 50;
      this.sat += 30;
      this.inc = 30;
    } else if (this.sf < 1.7) {
      this.sf += 0.1;
      this.color += this.inc * 2.5;
      this.sat = 100;
      this.inc -= 33;
    } else if (this.sf < 1.8) {
      this.sf += 0.1;
      this.inc += 20;
      this.color += this.inc * 2.5;
      this.opac = '0.6';
      this.sat = 100;
    } else if (this.sf < 1.9) {
      this.sf += 0.1;
      this.color = 197;
      this.sat = 100;
      this.opac = '0.9';
    } else {
      this.color = '#000';
      this.sat = 0;
      this.rocks += 2;
      this.opac = '0.9';
      return;
    }
    if (this.color > 360) {
      this.color -= 360;
    }
  }
  static LEVELS = [
    'TRAINING LEVEL 1',
    'TRAINING LEVEL 2',
    'TRAINING LEVEL 3',
    'TRAINING LEVEL 4',
    'TRAINING LEVEL 5',
    'KIMBERLITE BELT',
    'MALACHITE BELT',
    'BORNITE BELT',
    'COBALT BELT',
    'SUGILITE BELT',
    'CORUNDUM BELT',
    'SULPHUR BELT',
    'EMERALD BELT',
    'DIAMOND BELT',
    'OORT CLOUD'
  ]
  static AUS = [
    '',
    '',
    '',
    '',
    '',
    '1.4 AU',
    '2.3 AU',
    '18 AU',
    '26 AU',
    '41 AU',
    '88 AU',
    '499 AU',
    '1,020 AU',
    '9,900 AU',
    '50,000 AU'
  ]
}
class Zone {
  //
  constructor(mx, my) {
    this.x = mx / 2;
    this.y = my / 2;
    this.r = 130;
  }
  contains(rock) {
    return rock.distanceFrom(this.x, this.y) <= this.r;
  }
}
class HighScoreList extends LG.Obj {
  //
  constructor(scores) {
    super();
    this.scores = scores;
    this.$highscores = $('#highscores');
    this.$list = $('#list');
    this.draw();
  }
  show(b) {
    this.$highscores.classList.toggle('hide', ! b);
    $('#press1').classList.toggle('hide', ! b);
  }
  draw() {
    var h = [];
    this.scores.forEach((e, i) => {
      h.push('<div><span class="rank">');
      h.push(i + 1);
      h.push('.</span><span class="score">');
      h.push(e.score);
      h.push('</span><span class="inits">');
      h.push(e.inits);
      h.push('</span>');
      h.push('</div>');
    })
    this.$list.innerHTML = h.join('');
  }
}
class Scoreboard extends LG.Obj {
  /**
   * i lives
   * i score
   */
  constructor(lives, highscore) {
    super();
    this.$score = $('#score');
    this.$highscore = $('#highscore');
    this.$highscore.innerText = '00';
    this._lives = lives;
    this.ships = [];
    this.reset();
    this.highscore(highscore);
  }
  show(b) {
    //this.$score.classList.toggle('hide', ! b);
    this.ships.forEach(life => life.show(b));
    return this;
  }
  reset() {
    this.score = 0;
    this.$score.innerText = '00';
    this.lb = 0;
    while (this.ships.length) {
      this.ships.pop().kill(1);
    }
    this.lives = this._lives;
    this.draw();
  }
  highscore(i) {
    if (i) {
      this.$highscore.innerText = i;
    }
  }
  add(i) {
    this.score += i;
    this.$score.innerText = this.score;
    if ((this.score - this.lb) >= 10000) {
      this.bonus();
      this.lb += 10000;
    }
  }
  bonus() {
    this.lives++;
    this.draw();
  }
  die() {
    this.lives--;
    this.draw();
  }
  gameover() {
    return this.lives == 0;
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
    super($('#screen'), $('#shipbp').innerHTML, 'life', x, y, 90, 90);
  }
}
class Ship extends LG.Sprite {
  onexplode() {}
  ondead() {}
  //
  constructor() {
    super($('#screen'), $('#shipbp').innerHTML, 'ship', 0, 0, 90);
    this.shots = [];
    this.show(0);
  }
  reset(mx, my) {
    this.moveTo(mx / 2 - 20, my / 2 - 20).heading(0);
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
  step(fix) {
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
    if (fix % 5 == 0) {
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
    Sounds.fireShip();
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
    Sounds.explodeBig();
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
  static ROTC = 5.6;
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
  static MAX = 20;
}
Ship.Acceleration = class extends Vector {
  //
  constructor() {
    super();
    this.reset();
  }
  reset() {
    super.reset();
    this.ac = 0.72;
  }
  thrust(compass) {
    let v = Vector.byRadians(compass.rad, this.ac);
    this.add(v, Ship.Acceleration.MAX);    
    this.ac = Ship.Acceleration.AC;
  }
  off() {
    this.reset();
  }
  static MAX = 20;
  static AC = 0.2;
}
class Shot extends LG.Sprite {
  /**
   * i type 1=ship 2=ufo
   */
  constructor(bounds, speed, rad, type, max, ufo) {
    super($('#screen'), null, 'shot ' + (type == 1 ? 'sshot' : 'ushot'), bounds.cx - 2, bounds.cy - 2);
    this.velocity = new Shot.Velocity(rad, speed, ufo);
    this.type = type;
    this.steps = 0;
    this.max = max || Shot.STEPS;
  }
  step() {
    this.moveByVector(this.velocity);
    this.steps++;
    if (this.steps > this.max) {
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
    let max = ufo.type == 1 ? 48 : 54;
    return new Shot(ufo.bounds(), null, rad, 2, max, ufo);
  }
  static STEPS = 45;
}
Shot.Velocity = class extends Vector {
  //
  constructor(rad, shipv, ufo) {
    super();
    if (shipv) {
      let v = Vector.byRadians(rad, Shot.Velocity.FROM_SHIP);
      this.x = this.merge(v.x, shipv.x * 1.2);
      this.y = this.merge(v.y, shipv.y * 1.2);
    } else {
      let v = Vector.byRadians(rad, ufo.type == 1 ? 16 : 20);
      this.x = v.x;
      this.y = v.y;
    }
  }
  merge(m, s) {
    return (Math.abs(m + s) < Math.abs(m)) ? m + s : m;
  }
  static FROM_SHIP = 24;
}
class Thruster extends LG.Sprite {
  //
  constructor(x, y) {
    super($('#screen'), $('#thrustbp').innerHTML, 'thrust', x, y, 90);
    this.thrust(0);
  }
  thrust(on) {
    this.$e.className = on ? 'thrust thrusting' : 'thrust hide';
  }
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
    let deg = minHead + rnd(maxHead - minHead + 1);
    let html = $('#rockbp1').innerHTML.replace('39', Rock.color).replace('18', Rock.sat).replace('0.4', Rock.opac);
    super($('#screen'), html, fcls, x, y);
    this.type = cls;
    this.sf = sf;
    this.rotate(deg);
    r = 1 + ((rnd(vmin + vmax) - vmin) / 100);
    this.speed = speed * r * sf * 1.5;
  }
  step(fix) {
    this.advance(this.speed);
  }
  kill(newRocks) {
    if (newRocks) {
      let b = this.bounds();
      this.shot(b, newRocks);
      this.explode(b);
    }
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
    Sounds.explode(this.type);
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
  static asBigs(script, mx, my) {
    let us = [], x, y, min, max, edge;
    Rock.color = script.color;
    Rock.sat = script.sat;
    Rock.opac = script.opac;
    for (let i = 0; i < script.rocks; i++) {
      edge = (rnd(mx + my) < mx) ? rnd(2) * 2 : rnd(2) * 2 + 1;
      switch (edge) {
        case 0:
          x = rnd(mx - 120), y = 0;
          min = 210, max = 330;
          break;
        case 1:
          x = mx - 120, y = rnd(my - 120);
          min = 120, max = 240;
          break;
        case 2:
          x = rnd(mx - 120), y = my - 120;
          min = 30, max = 150;
          break;
        case 3:
          x = 0, y = rnd(my - 120);
          min = 300, max = 60;
          break;
      }
      us.push(Rock.asBig(x, y, script.sf, min, max));
    }
    return us;
  }
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
class Ufo extends LG.Sprite {
  onshoot(shot) {}
  //
  constructor(ship, rocks, x, y, cls, speed, x1, y1, x2, demo) {
    super($('#screen'), $('#ufobp').innerHTML, 'ufo ' + cls, x, y);
    this.ship = ship;
    this.demo = demo;
    this.shooting = 0;
    this.type = cls == 'ub' ? 1/*big*/ : 2/*small*/;
    this.shootmod = this.type == 1 ? 50 : 5;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.xdir = (x == 0) ? 1 : -1;
    this.ydir = (y <= y1) ? 1 : -1;
    let r = this.ydir == 1 ? 1 : 0;
    let n = (x == 0) ? 1 + r * 10 : 5 + r * 2, rad = (n * Math.PI) / 6;
    this.v0 = new Vector(speed * this.xdir, 0);
    this.v1 = Vector.byRadians(rad, speed);
    this.v = this.v0;
    this.mode = 0/*heading horizontally to x1*/;
    this.rocks = rocks;
  }
  step(fix) {
    if (this.fix0 == null) {
      this.fix0 = fix;
    }
    this.moveByVector(this.v);
    let b = this.bounds();
    switch (this.mode) {
      case 0:
        if (this.past(this.xdir, b.cx, this.x1)) {
          this.mode = 1;
          this.v = this.v1;
        }
        break;
      case 1:
        if (this.past(this.ydir, b.cy, this.y1)) {
          this.mode = 2;
          this.v = this.v0;
        }
        break;
    }
    if (this.past(this.xdir, b.cx, this.x2)) {
      this.kill(1);
    }
    if (! this.shooting) {
      if (fix % this.shootmod == 0 && fix - this.fix0 > 50) {
        this.shoot();
      }
    } else {
      if (this.shooting.dead) {
        this.shooting = null;
      }
    }
  }
  loadRocks(rocks) {
    this.rocks = rocks;
  }
  shoot() {
    if (! this.alive() || this.shooting) {
      return;
    }
    if (! this.ship.alive()) {
      if (this.type == 1 && ! this.demo) {
        return;
      }
      this.rockmode = 1;
    } else {
      this.rockmode = 0;
    }
    let rad;
    if (this.type == 1) {
      rad = rnd(628) / 100;
    } else {
      let ub = this.bounds(), sb, fudge;
      if (this.rockmode && this.rocks.length == 0) {
        animate(this.$frame, 'ufobulge 0.5s linear 1');  // flex :)
        return; 
      } else {
        if (this.rocks.length && (this.rockmode || rnd(4) == 1)) {
          let md = 2000, d, rb, rs;
          this.rocks.forEach(rock => {
            rb = rock.bounds();
            d = this.distanceFrom(rb.cx, rb.cy, ub);
            if (d < md) {
              sb = rb;
              md = d;
              rs = rock.speed;
            }
          })
          fudge = (md / 1000) * 0.05 * (rnd(2) * -2 + 1);
          fudge *= rs;
        } else {
          sb = this.ship.bounds();
          fudge = (rnd(30) - 15) / 50;
        }
        rad = LG.Compass.radTo(ub.cx, ub.cy, sb.cx, sb.cy) + fudge;
      }
    }
    this.shooting = Shot.fromUfo(this, rad);
    animate(this.$frame, 'ufobulge 0.5s linear 1');
    Sounds.fireUfo();
    this.onshoot(this.shooting);
  }
  kill(rock) {
    if (rock == 1/*ufo went off screen*/) {
      return super.kill(1);
    }
    if (rock) {
      let sf = rock.type == 'rb' ? 4 : rock.type == 'rm' ? 2 : 1;
      this.v.add(Vector.byRadians(rock.compass.rad, rock.speed * sf));
    }
    this.explode(() => {
      super.kill(1);
    })
  }
  explode(ondone) {
    this.dead = 1;
    let b = this.bounds();
    let $e = document.createElement('div');
    $e.className = 'pow ' + (this.type == 1 ? 'xufob' : 'xufos');
    $e.innerHTML = $('#ufopowbp').innerHTML;
    $('#screen').appendChild($e);
    $e.style.left = b.x - (this.type == 1 ? 20 : 10);
    $e.style.top = b.y - (this.type == 1 ? 20 : 10);
    this.show(0);
    Sounds.explodeMedium();
    wait(1000, () => {
      $e.remove();
      ondone();
    })
  }
  worth() {
    return this.type == 1 ? 200 : 1000;
  }
  past(dir, bval, val) {
    return dir == 1 ? bval >= val : bval <= val;
  }
  //
  static create(ship, rocks, cls, mx, my, sf, demo) {
    let w = cls == 'ub' ? 60 : 30;
    let edge = rnd(2) * 2 + 1;
    let x, y, x1, y1, x2;
    switch (edge) {
      case 1:
        x = mx - w, y = rnd(my - w);
        x1 = mx - 200 - rnd(mx / 2), x2 = 0;
        break;
      case 3:
        x = 0, y = rnd(my - w);
        x1 = 200 + rnd(mx / 2), x2 = mx - w;
        break;
    }    
    y1 = rnd(my - 120);
    let speed = (cls == 'ub' ? 3 : 4) * sf;
    return new Ufo(ship, rocks, x, y, cls, speed, x1, y1, x2, demo);
  }
}
class ScoreEntry extends Obj {
  //
  constructor() {
    super();
    this.$congrats = $('#congrats');
    this.$$inits = $$('#inits span');
  }
  reset() {
    this.ic = 0;
    this.$$inits.forEach($span => this.clear($span));
    this.cursor();
  }
  show(onenter) {
    this.reset();
    this.$congrats.style.display = 'block';
    animate(this.$congrats, 'textgrow 2s 1');
    this.onenter = onenter;
  }
  close() {
    this.$congrats.style.display = '';
  }
  onkeyup(e) {
    let s = e.key.toUpperCase();
    if (s == 'ENTER') {
      let inits = this.value();
      if (inits.length) {
        this.close();
        this.onenter(inits);
      }
      return;
    }
    if (s == 'BACKSPACE') {
      this.back();
      return;
    }
    if (this.ic > 3) {
      return;
    }
    if (s == ' ') {
      if (this.ic > 0) {
        this.set(s);
      }
      return;
    }
    if (s.length == 1) {
      let c = s.charCodeAt(0);
      if (c >= 65 && c <= 90) {
        this.set(s);
        return;
      }
    }
  }
  set(s) {
    if (this.ic < 3) {
      this.$$inits[this.ic].innerText = s;
      this.ic++;
      this.cursor();
    }
  }
  back() {
    if (this.ic > 0) {
      this.ic--;
      this.clear(this.$$inits[this.ic]);
      this.cursor();
    }
  }
  value() {
    let v = '';
    this.$$inits.forEach($span => {
      if ($span.innerText.length == 1) {
        v += $span.innerText;
      }
    })
    return v.trim();
  }
  clear($span) {
    $span.innerHTML = '&nbsp;';
  }
  cursor() {
    this.$$inits.forEach(($span, i) => $span.classList.toggle('curs', this.ic == i));
  }
}
Sounds = {
  BEAT1:new Audio('audio/BEAT11.wav'),
  BEAT2:new Audio('audio/BEAT21.wav'),
  YOURFIRE:new Audio('audio/YOURFIRE1.wav'),
  UFOFIRE:new Audio('audio/UFOFIRE1.wav'),
  LARGEXPL:new Audio('audio/LARGEXPL1.wav'),
  MEDUMXPL:new Audio('audio/MEDUMXPL1.wav'),
  SMALLXPL:new Audio('audio/SMALLXPL1.wav'),
  LSAUCER:new Audio('audio/LSAUCER.wav'),
  SSAUCER:new Audio('audio/SSAUCER.wav'),
  //
  start:function() {
    if (! this._muted) {
      this._started = 1;
    }
  },
  mute:function(b) {
    this._muted = 1;
  },
  unmute:function() {
    this._muted = 0;
  },
  beat:function() {
    this._b = ! this._b;
    this.play(this._b ? Sounds.BEAT2 : Sounds.BEAT1);
  },
  fireShip:function() {
    this.play(Sounds.YOURFIRE);
  },
  fireUfo:function() {
    this.play(Sounds.UFOFIRE);
  },
  explodeBig:function() {
    this.play(Sounds.LARGEXPL);
  },
  explodeMedium:function() {
    this.play(Sounds.MEDUMXPL);
  },
  explodeSmall:function() {
    this.play(Sounds.SMALLXPL);
  },
  ufoBig() {
    Sounds.SSAUCER.loop = true;
    Sounds.SSAUCER.play();
  },
  explode:function(type) {
    switch (type) {
      case 'rb':
        return this.explodeBig();
      case 'rm':
        return this.explodeMedium();
      case 'rs':
        return this.explodeSmall();
    }
  },
  //
  play:function(a) {
    return;
    if (! this._started || this._muted) {
      return;
    }
    a.pause();
    a.currentTime=0;
    a.play();
  }
}
function cleanup() {
  let e = $('#screen').nextElementSibling;
  while (e && e.nonce != 'wghornsby') {
    e.remove();
    e = $('#screen').nextElementSibling;
  }
}