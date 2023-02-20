/** 
 * LCD gaming
 * JavaScript library (c)2022 Warren Hornsby 
 **/
var LG = {};
//
LG.Obj = class extends Obj {}
LG.Array = class extends ObjArray {}
LG.Controller = class extends LG.Obj {
  //
  constructor() {
    super();
    this.period = 1 / this.frequency();
    this.periodms = this.period * 1000;
    this.sprites = new LG.Sprites();
    this.reset();
  }
  frequency() {
    return 100;
  }
  reset() {
    this.time0 = new Date().getTime();
    this.fix/*frame index*/ = 0;
  }
  start(reset) {
    if (reset) {
      this.reset();
    }
    this.paused = 0;
    this.timep0 = 0;
    if (this.clock) {
      clearInterval(this.clock);
    }
    this.clock = setInterval(() => this.step(this.fix++), this.periodms);
  }
  pause() {
    this.paused = ! this.paused;
    if (this.paused) {
      this.clock = clearInterval(this.clock);
      this.timep0 = new Date().getTime();
    } else {
      this.time0 += (new Date().getTime() - this.timep0);
      this.timep0 = 0;
      this.start();
    }
  }
  step(fix) {
    this.sprites.forEach(sprite => sprite.step(fix));
  }
  elapsed() {
    let ms = this.paused ? (this.timep0 - this.time0) : (new Date().getTime() - this.time0);
    return ms / 1000; // seconds
  }
  sprite(sprite) {
    if (sprite.length) {
      this.sprites = this.sprites.concat(sprite);
    } else {
      this.sprites.push(sprite);
    }
    return sprite;
  }
}
LG.Sprites = class extends LG.Array {
  //
  alive(classname) {
    return this.filter(s => s.alive() && (! classname || s.name() == classname.name));
  }
  of(classname) {
    return this.filter(s => s.name() == classname.name);
  }
  append(sprites) {
    this.splice(this.length, 0, ...sprites);
  }
}
LG.Sprite = class extends LG.Obj {
  /**
   * i x, y, iheading
   * b dead
   * Compass compass
   * $e outermost <div>
   * $$frames children of <$e>
   * $frame first frame (or $e if no frames)
   * $$rot rotatable elements (child of a frame)
   */
  //
  constructor($screen, html, className, x, y, iheading = 0, heading = 0) {
    super();
    this.iheading = iheading || 0;
    this.dead = 0;
    this.compass = new LG.Compass();
    this.$create(html, $screen, className);
    this.moveTo(x, y).heading(heading);
  }
  static is(sprite) {
    return this.name == sprite.name();
  }
  //
  alive() {
    return ! this.dead;
  }
  step(fix) {
    // called from controller
  }
  show(b) {
    this.$e.classList.toggle('hide', ! b);
    return this;
  }
  kill(remove) {
    this.dead = 1;
    remove && this.$e.remove();
  }
  name() {
    return this.constructor.name;
  }
  moveTo(x, y) {
    this.x = x;
    this.y = y;
    this.ix = 0;
    this.iy = 0;
    this.$e.style.left = this.x;
    this.$e.style.top = this.y;
    this.setTranslateCss();
    return this;
  }
  moveByVector(v) {
    this.ix += v.x;
    this.iy += v.y;
    this.setTranslateCss();
    return this;
  }
  heading(heading) {
    this.compass.set(heading);
    this.setRotateCss();
    return this;
  }
  rotate(deg) {
    this.compass.rotate(deg);
    this.setRotateCss();
    return this;
  }
  advance(speed = 1) {
    this.ix = this.compass.advanceX(this.ix, speed); 
    this.iy = this.compass.advanceY(this.iy, speed);
    this.setTranslateCss();
  }
  bounds() {
    let b = this.$e.getBoundingClientRect();
    b.height = this.bf.height;
    b.width = this.bf.width;
    b.cx = Math.floor(b.x + (b.width / 2));
    b.cy = Math.floor(b.y + (b.height / 2));
    b.x2 = b.x + b.width;
    b.y2 = b.y + b.height;
    return b;
  }
  contains(x, y, b) {
    b = b || this.bounds();
    return x >= b.x && x <= b.x2 && y >= b.y && y <= b.y2;
  }
  withinCircle(x, y, fudge = 1.5) {
    let b = this.bounds();
    return this.distanceFrom(x, y, b) * fudge <= b.width;
  }
  distanceFrom(x, y, b) {
    b = b || this.bounds();
    return Math.sqrt(Math.pow(x - b.cx, 2) + Math.pow(y - b.cy, 2));
  }
  //
  $create(html, $screen, className) {
    this.$e = document.createElement('div');
    this.$e.className = 'sprite ' + className;
    if (html) {
      this.$e.innerHTML = html;
      this.$$frames = this.$e.$$('.frame');
      this.$frame = this.$$frames ? this.$$frames[0] : this.$e;
      this.$$rots = this.$e.$$('.rot');
    } else {
      this.$frame = this.$e;
    }
    $screen.appendChild(this.$e);
    this.bf = this.$frame.getBoundingClientRect();
  }
  setTranslateCss() {
    this.$e.style.transform = 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  setRotateCss() {
    if (! this.$$rots) {
      return;
    }
    let nr = this.iheading - this.compass.heading;
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
    this._rot = rot;
    this.prevRot = rot;
    this.$$rots.forEach($e => $e.style.transform = 'rotate(' + rot + 'deg)');
  }
}
LG.Compass = class {
  /**
   * i heading (degrees)
   * i rad
   */
  constructor(heading = 0) {
    this.set(heading);
  }
  set(heading) {
    this.heading = LG.Compass.fix(heading);
    this.rad = this.heading * (Math.PI / 180);
  }
  rotate(deg) {
    this.set(this.heading + deg);
  }
  advanceX(x, steps) {
    return x + Math.cos(this.rad) * steps;
  }
  advanceY(y, steps) {
    return y - Math.sin(this.rad) * steps;
  }
  static radTo(fx, fy, tx, ty) {
    return Math.atan2(fy - ty, tx - fx);
  }
  static fix(heading) {
    heading = heading > 359 ? heading - 360 : heading;
    heading = heading < 0 ? heading + 360 : heading;
    return heading;    
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
  //
  static byRadians(rad, mag = 1) {
    return new Vector(mag * Math.cos(rad), mag * -Math.sin(rad));
  }
}
/**
 * ex. animate($e, 'dive 4s normal 1', () => this.ondone())
 */
function animate($e, css, onend) {
  $e.style.animation = css;
  $e.on_once('animationend', e => {
    $e.style.animation = '';
    onend && onend(e);
  })
}
