class Page extends Obj {
  //
  constructor() {
    super();
    this.jets = [];
    this.clockspeed = 10;
    for (let i = 0; i < 20; i++) {
      this.jets.push(new Jet(i, rnd(1600), rnd(1000), rnd(361), 200, this.clockspeed));
    }
    this.start();
  }
  start(ms) {
    this.clock = setInterval(() => this.step(), this.clockspeed);
  }
  pause() {
    clearInterval(this.clock);
  }
  //
  step() {
    this.jets.forEach(jet => jet.step());
  }
}
class Jet extends Obj {
  //
  constructor(i, x, y, heading, speed, clockspeed) {
    super();
    this.x = x;
    this.y = y;
    this.ix = 0;
    this.iy = 0;
    this.setHeading(heading);
    this.cycle = 1000 / speed;
    this.is = 0;
    this.createJet(i, clockspeed);
    this.iz = 0;
    this.izm = 100 + rnd(500);
  }
  step() {
    if (this.dead) {
      return;
    }
    if (this.headingAdj) {
      this.setHeading(this.heading + this.headingAdj);
      this.$svg.style.transform = this.getRotate();
      if (this.heading == this.headingTo) {
        this.headingAdj = 0;
      } else {
        return;
      }
    }
    this.is++;
    this.iz++;
    if (this.is >= this.cycle) {
      if (this.iz > this.izm) {
        this.pow();
        return;
        this.iz = 0;
        this.izm = 100 + rnd(500);
        this.bounce(1);
      } 
      this.is = 0;
      this.ix += Math.sin(this.rad);
      this.iy -= Math.cos(this.rad);
      this.$e.style.transform = this.getTranslate();
    }
  }
  pow() {
    let $e = document.createElement('div');
    $e.className = 'kapow';
    $e.innerHTML = $('.pow.blueprint').innerHTML;
    $('#radar').appendChild($e);
    $e.style.left = this.x;
    $e.style.top = this.y;
    $e.style.transform = 'translate(' + (this.ix - 45) + 'px,' + (this.iy - 45) + 'px)';
    this.$e.className = 'dead';
    this.dead = 1;
  }
  bounce(vert) {
    this.adjustHeading(rnd(361));
    //this.adjustHeading(this.heading + (vert ? 360 : 180) - 2 * this.heading);
  }
  adjustHeading(headingTo) {
    this.headingTo = headingTo;
    let delta = this.headingTo - this.heading;
    if (Math.abs(delta) > 180) {
      delta = (360 - Math.abs(delta)) * -Math.sign(delta)
    }
    this.headingAdj = Math.sign(delta);
  }
  setHeading(heading) {
    heading = heading > 360 ? heading - 360 : heading;
    heading = heading < 0 ? heading + 360 : heading;
    this.heading = heading;
    this.rad = this.heading * (Math.PI / 180);
  }
  //
  createJet(i, clockspeed) {
    this.$e = document.createElement('div');
    this.$e.id = 'jet' + i;
    this.$e.className = 'jet';
    this.$e.innerHTML = $('.jet.blueprint').innerHTML;
    $('#radar').appendChild(this.$e);
    this.$e.style.left = this.x;
    this.$e.style.top = this.y;
    this.$svg = this.$e.$('svg');
    this.$e.style.transition = 'transform ' + this.cycle * clockspeed + 'ms ease-in-out';
    this.$e.style.transform = this.getTranslate();
    this.$svg.style.transform = this.getRotate();
  }
  getTranslate() {
    return 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  getRotate() {
    return 'rotate(' + (this.heading - 45) + 'deg)';
  }
}