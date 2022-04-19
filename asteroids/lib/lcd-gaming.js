/** 
 * LCD gaming
 * JavaScript library (c)2022 Warren Hornsby 
 **/
LG = {};
//
LG.Controller = class extends Obj {
  /**
   * i elapsed - total elapsed seconds
   * i ms - elapsed ms within sec (0 <= ms <= 999)
   */
  constructor() {
    super();
    this.period = 1 / this.frequency();
    this.periodms = this.period * 1000;
    this.sprites = [];
    this.elapsed = 0;
    this.ms = -this.periodms;
  }
  frequency() {
    return 100;
  }
  start() {
    this.clock = setInterval(() => this.step(), this.periodms);
  }
  pause() {
    clearInterval(this.clock);
  }
  step() {
    this.elapsed += this.period;
    this.ms = (this.ms + this.periodms) % 1000;
    this.sprites.forEach(sprite => sprite.step(this.ms));
    this.sprites = this.sprites.filter(sprite => sprite.active);
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
LG.Sprite = class extends Obj {
  /**
   * i x, y, iheading
   * b active
   * Compass compass
   * $e <div>
   * $svg
   */
  //
  constructor($screen, $svg, className, x, y, iheading = 0, heading = 0) {
    super();
    this.iheading = iheading || 0;
    this.active = 1;
    this.compass = new LG.Compass();
    this.$create($svg, $screen, className);
    this.moveTo(x, y).heading(heading);
  }
  step(ms) {
    // called from controller
  }
  dead() {
    this.active = 0;
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
    var b = this.$e.getBoundingClientRect();
    b.cx = Math.floor(b.x + (b.width / 2));
    b.cy = Math.floor(b.y + (b.height / 2));
    b.x2 = b.x + b.width;
    b.y2 = b.y + b.height;
    return b;
  }
  //
  $create($svg, $screen, className) {
    this.$e = document.createElement('div');
    this.$e.className = className;
    if ($svg) {
      this.$e.innerHTML = $svg.innerHTML;
      this.$svg = this.$e.$('svg');  
    }
    this.setTransitionCss();
    $screen.appendChild(this.$e);
  }
  setTransitionCss() {
    this.$e.style.transition = 'transform 0s ease-in-out';
    if (this.$svg) {
      this.$svg.style.transition = 'all ease';
    }
  }
  setTranslateCss() {
    this.$e.style.transform = 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  setRotateCss() {
    if (! this.$svg) {
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
    this.prevRot = rot;
    this.$svg.style.transform = 'rotate(' + rot + 'deg) ';
  }
}
LG.Compass = class {
  /**
   * i heading (degrees)
   * i rad
   */
  //
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
  headTo(fx, fy, tx, ty) {
    this.setHeading(Math.round(Math.atan2(fy - y, x - fx) * (180 / Math.PI)));
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