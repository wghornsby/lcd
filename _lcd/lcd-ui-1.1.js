/** 
 * LCD UI v1.1
 * (c)2023 Warren Hornsby 
 * Requires LCD Core 4.0+
 * 
 * 1.1 await_on
 **/

/** DOM */
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function(event, fn, options) {
  this._events = this._events || {};
  this._events[event] = this._events[event] || [];
  this._events[event].push(fn);
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
Node.prototype.await_on = window.await_on = function(event) {
  return new Promise(resolve => this.on_once(event, () => resolve()));
}
HTMLElement.prototype.$ = HTMLElement.prototype.querySelector;
HTMLElement.prototype.$$ = HTMLElement.prototype.querySelectorAll;

/** Dialog */
class Dialog extends Obj {
  /**
   * click events: 'on' + clicked button caption, e.g. onok(), oncancel()
   */
  //
  constructor(buttoncaps, title) {
    super();
    this.$dialog = document.createElement('dialog')
      .on('close', () => this.$dialog_onclose());
    this.$dialog.className = 'dialog';
    this.$dialog.tabIndex = 1;
    this.$dialog.innerHTML = "<form method='dialog'><div class='dtitle'>" + (title || '') + "</div><div class='dbody'></div><div class='dact'></div></form>";
    $('body').append(this.$dialog);
    this.$body = this.$dialog.$('.dbody');
    this.$actions = this.$dialog.$('.dact');
    buttoncaps.forEach(cap => {
      let lcap = cap.toLowerCase();
      let $b = document.createElement('button').on('click', e => this.onclick('on' + lcap));
      $b.innerText = cap;
      $b.className = lcap;
      $b.value = cap;
      this.$actions.append($b);
    })
  }
  show() {
    this.$dialog.classList.add('dshow');
    this.$dialog.showModal();
    window._events['blur'] && window._events['blur'][0]();
    return this;
  }
  onclick(event) {
    this[event] && this[event]();
  }
  $dialog_onclose() {
    this.$dialog.classList.remove('dshow');
    document.activeElement.blur();
    window._events['focus'] && window._events['focus'][0]();
  }
  //
  static loadSelect($select, a) {
    a.forEach((text, i) => $select[i] = new Option(text, i));
  }
  //
  static asMsg(buttoncaps, msg, title) {
    var me = new this(buttoncaps, title);
    me.$body.innerHTML = '<div class="msg">' + msg + '</div>';
    return me;
  }
  static asMsgOk(msg, title) {
    return this.asMsg(['OK'], msg, title);
  }
  static asMsgOkCancel(msg, title) {
    return this.asMsg(['OK', 'Cancel'], msg, title);
  }
  static withBody(buttoncaps, title, $body) {
    var me = new this(buttoncaps, title);
    me.$body.append($body);
    return me;
  }
  static asSaveCancel(title, $body) {
    return this.withBody(['Save','Cancel'], title, $body);
  }
}