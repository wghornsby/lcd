/** 
 * LCD gaming 
 * 1.1 (c)2023 Warren Hornsby 
 **/
var LG = {};
//
LG.Controller = class extends Obj {
  /**
   * Sprites sprites$
   * i sct (step count)
   */
  //
  constructor(frequency = 50) {
    super();
    this.sprites$ = new LG.Sprites();
    this.period = (1 / frequency) * 1000;
    this.sct = 0;
    LG.Screen.init();
  }
  register(s/*sprite$ or sprites$*/) {
    if (s.length) {
      this.sprites$ = this.sprites$.concat(s);
    } else {
      this.sprites$.push(s);
    }
    return s;
  }
  killSprites(...spritecls) {
    this.sprites$ = this.sprites$.kill(...spritecls);
  }
  cleanSprites() {
    this.sprites$ = this.sprites$.alive();
  }
  start() {
    this.sct = 0;
    this.paused = 0;
    if (this.clock) {
      clearInterval(this.clock);
    }
    this.clock = setInterval(() => this.step(this.sct++), this.period);
  }
  pause() {
    this.paused = ! this.paused;
    if (this.paused) {
      this.clock = clearInterval(this.clock);
    } else {
      let sct = this.sct;
      this.start();
      this.sct = sct;
    }
  }
  step(sct) {
    this.sprites$.forEach(sprite$ => sprite$.step(sct));
  }
}
LG.Sprites = class extends Array {
  //
  alive(...spritecls) {
    return this.filter(s$ => {
      if (! s$.alive()) {
        return false;
      }
      if (spritecls.length == 0) {
        return true;
      }
      if (this.matches(s$, ...spritecls)) {
        return true;
      }
    })
  }
  of(spritecls) {
    return this.filter(s$ => s$.is(spritecls));
  }
  append(sprites$) {
    this.splice(this.length, 0, ...sprites$);
  }
  kill(...spritecls) {
    this.forEach(s$ => {
      let match = spritecls.length ? this.matches(s$, ...spritecls) : true;
      if (match) {
        s$.kill().remove();
      }
    })
    return this.alive();
  }
  //
  matches(s$, ...spritecls) {
    let matched;
    spritecls.forEach(cls => {
      if (cls.is(s$)) {
        matched = true;
      }
    })
    return matched;
  }
}
LG.Sprite = class extends Obj {
  /**
   * i x, y (initial position)
   * i ix, iy (current position relative to initial)
   * i iheading (initial heading of design)
   * i heading (current heading)
   * Compass compass
   * $me (sprite HTML element)
   * $$cels ($me's <cel> children)
   */
  constructor(templateCls) {
    super();
    this.$me = document.createElement('sprite');
    $('screen').appendChild(this.$me);
    if (templateCls) {
      this.html($('template.' + templateCls).innerHTML).setClass(templateCls);
      this.templateCls = templateCls;
    }
    this.compass = new LG.Compass();
    this.dead = 0;
    this.iheading = 0;
  }
  html(html) {
    this.$me.innerHTML = html;
    this.$$rots = this.$me.$$('rotate');
    return this;
  }
  setClass(cls) {
    if (this.templateCls) {
      cls = this.templateCls + ' ' + cls;
    }
    this.$me.className = cls;
    return this;
  }
  toggleClass(cls, b) {
    this.$me.classList.toggle(cls, b);
    return this;
  }
  setSize(vw, vh) {
    let size = LG.Screen.tsize(vw, vh);  // todo, use percentage
    this.$me.style.width = size.tw;
    this.$me.style.height = size.th;
    return this;
  }
  setPos(vx, vy) {
    let pos = LG.Screen.tsize(vx, vy);
    this.x = pos.tw;
    this.y = pos.th;
    this.ix = 0;
    this.iy = 0;
    this.$me.style.left = this.x;
    this.$me.style.top = this.y;
    this.setTranslateCss();
    return this;
  }
  initHeading(deg) { /*if sprite design is not oriented at 0deg (facing east)*/
    this.iheading = deg;
    return this;
  }
  setHeading(heading) {
    this.compass.set(heading);
    this.setRotateCss();
    return this;
  }
  show(b = 1) {
    this.toggleClass('hide', ! b);
    return this;
  }
  hide() {
    return this.show(0);
  }
  //
  step(sct) {/*called from controller*/}
  //
  name() {
    return this.constructor.name;
  }
  alive() {
    return ! this.dead;
  }
  kill() {
    this.dead = 1;
    return this;
  }
  remove() {
    this.$me.remove();
    return this;
  }
  heading() {
    return this.compass.heading;
  }
  rotate(deg) {
    this.compass.rotate(deg);
    this.setRotateCss();
    return this;
  }
  move(offset) {
    offset *= LG.Screen.tvr;
    this.ix = this.compass.advanceX(this.ix, offset); 
    this.iy = this.compass.advanceY(this.iy, offset);
    this.setTranslateCss();
    return this;
  }
  moveByVector(v) {
    this.ix += v.x;
    this.iy += v.y;
    this.setTranslateCss();
    return this;
  }
  vbounds() {
    let b = this.$me.getBoundingClientRect();
    let vpos = LG.Screen.vpos(b.x, b.y);
    let vsize = LG.Screen.vsize(b.width, b.height);
    b.vx = vpos.vx;
    b.vy = vpos.vy;
    b.vwidth = vsize.vw;
    b.vheight = vsize.vh;
    return b;
  }
  /*remaining methods deal in true coords*/
  bounds() { 
    let b = this.$me.getBoundingClientRect();
    b.cx = Math.floor(b.x + (b.width / 2));
    b.cy = Math.floor(b.y + (b.height / 2));
    b.x2 = b.x + b.width;
    b.y2 = b.y + b.height;
    return b;
  }
  contains(tx, ty, b) {
    b = b || this.bounds();
    return tx >= b.x && tx <= b.x2 && ty >= b.y && ty <= b.y2;
  }
  withinCircle(tx, ty, fudge = 1.5) {
    let b = this.bounds();
    return this.distanceFrom(tx, ty, b) * fudge <= b.width;
  }
  distanceFrom(tx, ty, b) {
    b = b || this.bounds();
    return Math.sqrt(Math.pow(tx - b.cx, 2) + Math.pow(ty - b.cy, 2));
  }
  //
  setTranslateCss() {
    this.$me.style.transform = 'translate(' + this.ix + 'px,' + this.iy + 'px)';
  }
  setRotateCss() {
    if (! this.$$frames) {
      return;
    }
    let nr = this.iheading - this.compass.heading;
    if (nr < 360) {
      nr += 360;
    }
    let rot = this._rot || 0;
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
    this.$$rots.forEach($e => $e.style.transform = 'rotate(' + rot + 'deg)');
  }
  //
  static is(sprite) {
    return this.name == sprite.name();
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
LG.Vector = class {
  //
  constructor(vx = 0, vy = 0) {
    let p = LG.Screen.tsize(vx, vy);
    this.x = p.tw;
    this.y = p.th;
  }
  nonzero() {
    return this.x || this.y;
  }
  reset() {
    this.x = 0;
    this.y = 0;
  }
  add(that, max = 0) {
    let p = LG.Screen.tsize(that.x, that.y);
    let m = max * LG.Screen.tvr;
    log('max='+max+',m=' + m);
    this.x += p.tw;
    this.y += p.th;
    if (m) {
      if (Math.abs(this.x) > m) {
        this.x = Math.sign(this.x) * m;
      }
      if (Math.abs(this.y) > m) {
        this.y = Math.sign(this.y) * m;
      }  
    }
    log('x,y='+this.x+','+this.y);
  }
  toRad() {
    return Math.atan2(-this.y, this.x);
  }
  //
  static byRadians(rad, mag = 1) {
    return new Vector(mag * Math.cos(rad), mag * -Math.sin(rad));
  }
}
LG.Screen = class {
  //
  static vw/*virtual width*/;
  static vh/*virtual height*/;
  static tw/*true width*/;
  static th/*true height*/;
  static tvr/*true-to-virtual ratio*/;
  static sx/*screen top x*/;
  static sy/*screen top y*/;
  //
  static init() {
    let $s = $('screen');
    let b = $s.getBoundingClientRect();
    this.vw = parseInt($s.getAttribute('vw'));
    this.vh = parseInt($s.getAttribute('vh'));
    this.tw = b.width;
    this.th = b.height;
    this.tvr = this.tw / this.vw;
    this.sx = b.x;
    this.sy = b.y;
  }
  static translate(vx, vy) {
    return {
      x:this.pct(vx, this.vw),
      y:this.pct(vy, this.vh)
    }
  }
  static tsize(vw, vh) {
    return {
      tw:vw * this.tvr,
      th:vh * this.tvr
    }
  }
  static tpos(vx, vy) {
    return {
      tx:(vx * this.tvr) + this.sx,
      ty:(vy * this.tvr) + this.sy
    }
  }
  static vsize(tw, th) {
    return {
      vw:tw / this.tvr,
      vh:th / this.tvr
    }
  }
  static vpos(tx, ty) {
    return {
      vx:(tx - this.sx) / this.tvr,
      vy:(ty - this.sy) / this.tvr
    }
  }
  static pct(a, b) {
    return (a / b) * 100;
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
