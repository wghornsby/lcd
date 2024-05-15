/*LCD Core 4.0, UI 1.0*/function log(t,e){e&&console.warn(e),console.log("object"==typeof t?js(t):t)}function logg(t,e){t&&t.length?(e?console.groupCollapsed(t):console.group(t),logg.timer=logg.timer||[],logg.timer.push(Date.now())):(logg.timer&&t&&log("["+(Date.now()-logg.timer.pop())/1e3+"]"),console.groupEnd())}function loggg(t,e){logg(t,1),e(),logg()}function assert(t,e,o=null){o=o?o+": ":"";var s=(t=js(t))==(e=js(e));return s?console.log("%c"+o+t,"color:green"):console.error(o+t+", expected: "+e),s}Object.assign(Object,{isObject:t=>t&&"object"==typeof t&&!Array.isArray(t),isEmpty:t=>0===Object.keys(t).length}),Object.assign(Function,{isFunction:t=>"function"==typeof t}),Object.assign(String,{isString:t=>"string"==typeof t,denull:t=>null==t?"":t+"",isEmpty:t=>null==t||0==(t+"").trim().length,nullify:t=>null==t||""==(t+"").trim()?null:t}),Object.assign(Array.prototype,{findValue:function(e){return this.findIndex(t=>t==e)},has:function(t){return-1<this.findValue(t)},pushIf:function(t,e){t&&this.push(void 0===e?t:e)}});const guid=()=>crypto.randomUUID(),wait=(t,e)=>setTimeout(e,t),priv=(e,...t)=>{t.forEach(t=>Object.defineProperty(e,t,{enumerable:!1}))},rnd=t=>Math.floor(Math.random()*Math.floor(t)),js=JSON.stringify,jscopy=t=>JSON.parse(js(t)),pojo=t=>clone(t,"toPojo"),clone=(t,o)=>{let s=Array.isArray(t)?[]:{};return each(t,(t,e)=>{Array.isArray(t)?s[e]=clone(t,o):Object.isObject(t)?s[e]=t[o]?t[o]():clone(t,o):Array.isArray(t)?s[e]=clone(t,o):s[e]=t}),s},qs=()=>{var t,e,o={};for([t,e]of new URLSearchParams(window.location.search).entries())o[t]=e;return o},each=(t,e)=>{let o;if(t)if(Array.isArray(t))for(var s=0;s<t.length&&!(o=e.call(t,t[s],s));s++);else for(var s in t)if(!Function.isFunction(t[s])&&(o=e.call(t,t[s],s)))break;return o};class Obj{on(t,e){return this["on"+t]=e,this}priv(...t){t.forEach(t=>Object.defineProperty(this,t,{enumerable:!1}))}}class ObjArray extends Array{on(t,e){return this["on"+t]=e,this}}class Storage{constructor(t){this.key=t}save(t){localStorage.setItem(this.key,js(t))}fetch(){var t=localStorage.getItem(this.key);return t&&JSON.parse(t)}erase(){localStorage.removeItem(this.key)}}class StorableObj extends Obj{constructor(t,e=0){super(),this._storage=new Storage(t||window.location),this.priv("_storage"),e?this.erase():this.fetch()}fetch(){var t=this._storage.fetch();this.mix(t)}mix(t){t&&Object.assign(this,t)}save(){this._storage.save(pojo(this))}erase(){this._storage.erase()}}const $=document.querySelector.bind(document),$$=document.querySelectorAll.bind(document);Node.prototype.on=window.on=function(t,e,o){return this._events=this._events||{},this._events[t]=this._events[t]||[],this._events[t].push(e),this.addEventListener(t,e,o),this},Node.prototype.on_once=window.on_once=function(t,e){return this.addEventListener(t,e,{once:!0}),this},NodeList.prototype.on=function(o,s,n){return this.forEach((t,e)=>{t.on(o,s,n)}),this},HTMLElement.prototype.$=HTMLElement.prototype.querySelector,HTMLElement.prototype.$$=HTMLElement.prototype.querySelectorAll;class Dialog extends Obj{constructor(t,e){super(),this.$dialog=document.createElement("dialog").on("close",()=>this.$dialog_onclose()),this.$dialog.className="dialog",this.$dialog.tabIndex=1,this.$dialog.innerHTML="<form method='dialog'><div class='dtitle'>"+(e||"")+"</div><div class='dbody'></div><div class='dact'></div></form>",$("body").append(this.$dialog),this.$body=this.$dialog.$(".dbody"),this.$actions=this.$dialog.$(".dact"),t.forEach(t=>{let e=t.toLowerCase();var o=document.createElement("button").on("click",t=>this.onclick("on"+e));o.innerText=t,o.className=e,o.value=t,this.$actions.append(o)})}show(){return this.$dialog.classList.add("dshow"),this.$dialog.showModal(),window._events.blur&&window._events.blur[0](),this}onclick(t){this[t]&&this[t]()}$dialog_onclose(){this.$dialog.classList.remove("dshow"),document.activeElement.blur(),window._events.focus&&window._events.focus[0]()}static loadSelect(o,t){t.forEach((t,e)=>o[e]=new Option(t,e))}static asMsg(t,e,o){t=new this(t,o);return t.$body.innerHTML='<div class="msg">'+e+"</div>",t}static asMsgOk(t,e){return this.asMsg(["OK"],t,e)}static asMsgOkCancel(t,e){return this.asMsg(["OK","Cancel"],t,e)}static withBody(t,e,o){t=new this(t,e);return t.$body.append(o),t}static asSaveCancel(t,e){return this.withBody(["Save","Cancel"],t,e)}}