/** 
 * LCD JXML 3.2.1
 * JavaScript library (c)2019 Warren Hornsby 
 **/

/*  
 <person id="12"><name>Fred</name></person>

 {tag:"person",  
  attr:{"id":12},
  text:"",
  inners:[
   {tag:"name",
    attr:null,
    text:"Fred",
    inners:[]}]}
 */

class Jxml {
  //
  constructor(e) {
    this.tag = null;
    this.attr = null;
    this.text = "";
    this.cdata = "";
    this.inners = [];
    if (String.isString(e)) {
      e = new DOMParser().parseFromString(e, 'text/xml');
    }
    if (! (e && e.nodeType)) {
      return;  
    }
    if (e.nodeType == e.DOCUMENT_NODE) {
      e = e.documentElement;
    }
    var n = Jxml.clean(e);
    if (n) {
      this.tag = n.tagName;
      if (n.attributes.length) {
        this.attr = {};
        for (var i = 0; i < n.attributes.length; i++) {
          this.attr[n.attributes[i].nodeName] = String.denull(n.attributes[i].nodeValue);
        }
      }
      for (var i = 0; i < n.childNodes.length; i++) {
        let nc = n.childNodes[i];
        switch (nc.nodeType) {
          case nc.ELEMENT_NODE:
            this.inners.push(new Jxml(nc));
            break;
          case nc.TEXT_NODE:
            this.text += Jxml.escape(nc.nodeValue);
            break;
          case nc.CDATA_SECTION_NODE:
            this.cdata = Jxml.escape(nc.nodeValue);
        }
      }
    }    
  }
  each(ctx, fn) {
    return each(this.inners, ctx, fn);
  }
  toString(indent) {
    var a = [];
    if (indent) {
      a.push(' '.repeat(indent * 2));
    } else {
      indent = 0;
    }
    a.push('<' + this.tag);
    var attrs = 0;
    each(this.attr, (value, name) => {
      attrs++;
      a.push(' ' + name + '="' + value + '"');
    })
    if (this.text == "" && this.cdata == "" && this.inners.length == 0) {
      a.push('>');
      if (attrs > 2) {
        a.push('\n' + ' '.repeat(indent * 2));
      }
      a.push('</' + this.tag + '>');
    } else {
      a.push('>');
      if (this.inners.length) {
        this.inners.forEach(inner => {
          indent++;
          a.push('\n' + inner.toString(indent));
          indent--;
        })
        a.push('\n' + ' '.repeat(indent * 2));
      } else {
        if (this.cdata) {
          a.push("<![CDATA[" + Jxml.unescape(this.cdata) + "]]>");
        } else {
          a.push(Jxml.unescape(this.text));
        }
      }
      a.push('</' + this.tag + '>');
    }
    return a.join('');
  }
  static clean(e) {
    e.normalize();
    var n = e.firstChild;
    while (n) {
      switch (n.nodeType) {
      case n.ELEMENT_NODE:
        Jxml.clean(n);
        n = n.nextSibling;
        break;
      case n.TEXT_NODE:
        if (Jxml.hasNonWhitespace(n)) {
          n = n.nextSibling;
        } else {
          var next = n.nextSibling;
          e.removeChild(n);
          n = next;
        }
        break;
      default:
        n = n.nextSibling;
      }
    }
    return e;
  }
  static escape(s) {
    return s
      .replace(/[\\]/g, "\\\\")
      .replace(/[\"]/g, '\\"')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r');
  }
  static unescape(s) {
    return s
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r');    
  }
  static hasNonWhitespace(n) {
    return n.nodeValue.match(/[^ \f\n\r\t\v]/);
  }
  static encode(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
