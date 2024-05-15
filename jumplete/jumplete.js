JUM = window.JUM || {};
//
JUM.Board = class extends Obj {
  /**
   * i size
   * CellGroup rows
   * CellGroup cols
   */
  constructor(size) {
    super();
    this.size = size;
  }
  load(a/*[[v,v,v,rtarget],[v,v,v,rtarget],[v,v,v,rtarget],[ctarget,ctarget,ctarget]]*/) {
    this.rows = JUM.CellGroup.asRows(a, this.size);
    this.cols = JUM.CellGroup.asCols(this.rows, a, this.size);
  }
  solution(a/*[v,v,v,v..] where v = 1(included) 2(excluded)*/) {
    this.forEachCell(cell => {
      cell.setSolution(a.shift());
    })
  }
  fromSumplete(s) {
    let s0 = s.split(':').pop();
    let a = [];
    let sa = s0.split(';');
    let sa0 = sa[0].split(',');
    let sa1 = sa[1].split(',');
    let sa2 = sa[2].split(',');
    let sa3 = sa[3].split(',');
    for (let r = 0; r < this.size; r++) {
      let ar = [];
      for (let c = 0; c < this.size; c++) {
        ar.push(+sa0.shift());
      }
      ar.push(+sa1.shift());
      a.push(ar);
    }
    let ar = [];
    for (let c = 0; c < this.size; c++) {
      ar.push(+sa2.shift());
    }
    a.push(ar);
    this.load(a);
    this.solution(sa3);
  }
  cell(ri, ci) {
    return this.rows[ri][ci];
  }
  forEachGroup(fn) {
    this.rows.forEach(row => fn(row));
    this.cols.forEach(col => fn(col));
  }
  forEachCell(fn) {
    this.rows.forEach(row => {
      row.forEach(cell => fn(cell));
    })
  }
  reset() {
    this.forEachCell(c => c.reset());
  }
}
JUM.CellGroup = class extends ObjArray {
  /**
   * i target
   * b row, col 
   */
  constructor(target, vals, cells) {
    super();
    this.target = target;
    if (vals) {
      this.row = 1;
      vals.forEach(v => {
        this.push(new JUM.Cell(v));
      })
    } else {
      this.col = 1;
      cells.forEach(cell => {
        this.push(cell);
      })
    }
  }
  isCorrect() {
    return this.sum() == this.target;
  }
  isComplete() {
    let complete = 1;
    this.forEach(cell => {
      if (cell.isUnmarked()) {
        complete = 0;
      }
    })
    return complete;
  }
  sum() {
    let sum = 0;
    this.forEach(cell => {
      if (! cell.excluded) {
        sum += cell.val;
      }
    })
    return sum;
  }
  off() {
    let unmarked = 0, included = 0;
    this.forEach(cell => {
      if (cell.included) {
        included += cell.val;
      } else if (cell.isUnmarked()) {
        unmarked += cell.val;
      }
    })
    let need = this.target - included;
    let lose = unmarked - need;
    return {
      need:need,
      lose:lose
    };
  }
  //
  static asRows(a, size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
      arr.push(JUM.CellGroup.asRow(a, i));
    }
    return arr;
  }
  static asCols(rows, a, size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
      arr.push(JUM.CellGroup.asCol(a, i, rows, size));
    }
    return arr;
  }
  static asRow(a, i) {
    let vals = a[i].slice();
    let target = vals.pop();
    return new JUM.CellGroup(target, vals);
  }
  static asCol(a, i, rows, size) {
    let cells = [];
    rows.forEach(row => cells.push(row[i]));
    let target = a[size][i];
    return new JUM.CellGroup(target, null, cells);
  }
}
JUM.Cell = class extends Obj {
  /**
   * i val
   * b excluded
   * b included
   * i solution (1=included, 2=excluded)
   */
  constructor(v) {
    super();
    this.val = v;
  }
  toggle() {
    if (this.excluded) {
      this.include();
    } else if (this.included) {
      this.reset();
    } else {
      this.exclude();
    }
  }
  include() {
    this.included = 1;
    this.excluded = 0;
  }
  exclude() {
    this.excluded = 1;
    this.included = 0;
  }
  isUnmarked() {
    return ! this.included && ! this.excluded;
  }
  setSolution(i) {
    this.solution = +i;
  }
  isIncorrect() {
    return (this.solution == 1 && this.excluded) || (this.solution == 2 && this.included);
  }
  //
  reset() {
    this.excluded = 0;
    this.included = 0;
  }
}
