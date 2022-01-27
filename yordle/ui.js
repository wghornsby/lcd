const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function(event, fn, options) {
  this.addEventListener(event, fn, options);
  return this;
}
Node.prototype.on_once = window.on_once = function(event, fn) {
  this.addEventListener(event, fn, {once:true});
  return this;
}
NodeList.prototype.on = function(name, fn, options) {
  this.forEach((elem, i) => {elem.on(name, fn, options)});
  return this;
}
class Ui {
  on(event, fn) {
    var _events = Symbol.for('Ui.events');
    if (this[_events] === undefined) {
      this[_events] = {};
    }
    if (this[_events][event]) {
      this[_events][event].push(fn);
    } else {
      this[_events][event] = [fn];
      this['on' + event] = function() {
        var r;
        for (var i = 0; i < this[_events][event].length; i++) {
          r = this[_events][event][i](...arguments);
        }
        return r;
      }.bind(this);
    }
    return this;
  }
  bubble(event, ctx, targetevent) {
    return this.on(event, function(...args) {
      this[targetevent || ('on' + event)](...args)
    }.bind(ctx))
  }
}
function delay(ms, fn) {
  setTimeout(fn, ms);
}