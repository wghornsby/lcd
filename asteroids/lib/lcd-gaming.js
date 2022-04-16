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
    this.reset();
  }
  frequency() {
    return 100;
  }
  reset() {
    this.elapsed = 0;
    this.ms = -this.periodms;
  }
  start() {
    this.clock = setInterval(() => this.step(), this.periodms);
  }
  pause() {
    clearInterval(this.clock);
  }
  add(sprite) {
    this.sprites.push(sprite);
    return sprite;
  }
  step() {
    this.elapsed += this.period;
    this.ms = (this.ms + this.periodms) % 1000;
    this.sprites.forEach(sprite => sprite.step(this.ms));
  }
}
LG.RotatingSprite = class extends Obj {
  /**
   * i x, y, ihead
   * Compass compass
   * $e <div>
   * $svg
   */
  //
  constructor($screen, $svg, className, x, y, iheading = 0, heading = 0) {
    super();
    this.iheading = iheading || 0;
    this.compass = new LG.Compass();
    this.$create($svg, $screen, className);
    this.moveTo(x, y).heading(heading);
  }
  step(ms) {
    // TODO
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
  advance(steps = 1) {
    this.ix = this.compass.advanceX(this.ix, steps); 
    this.iy = this.compass.advanceY(this.iy, steps);
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
    this.$e.innerHTML = $svg.innerHTML;
    this.$svg = this.$e.$('svg');
    this.setTransitionCss();
    $screen.appendChild(this.$e);
  }
  setTransitionCss() {
    this.$e.style.transition = 'transform 0s ease-in-out';
    this.$svg.style.transition = 'all 0.1s ease';
  }
  setTranslateCss() {
    this.$e.style.transform = 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  setRotateCss() {
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