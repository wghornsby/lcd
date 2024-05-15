JUM = {};
//
JUM.Board = class extends Obj {
  //
  constructor(size) {
    super();
    this.size = size;
    this.trans = 0;
  }
  load(a/*[[v,v,v,rtarget],[v,v,v,rtarget],[v,v,v,rtarget],[ctarget,ctarget,ctarget]]*/) {
    this.rows = JUM.CellGroup.asRows(a, this.size);
    this.cols = JUM.CellGroup.asCols(this.rows, a, this.size);
    this.updatedCells = [];
  }
  startTrans() {
    this.updatedCells = [];
    this.trans = 1;
  }
  analyze() {
    let loops = 0, dirty;
    logg('analysis', 1);
    do {
      dirty = 0;
      loops++;
      logg('loop ' + loops, 1);
      this.forEachGroup(g => {
        g.dirty = 0;
        logg(g.outCells());
        let analysis = new JUM.Analysis(g, JUM.Analysis.TYPE_EXCLUDE_TARGET);
        logg('exclude target: ' + analysis.target);
        log(analysis.winners);
        if (analysis.winners.length == 0) {
          let cells = g.excludeUnincluded();
          if (cells.length) {
            this.updatedCells.push(...cells);
            log(null, 'dirty0');
            g.dirty = 1;  
          }
        }
        log(analysis.losers);
        if (analysis.losers.length) {
          let cells = g.excludeByValues(analysis.losers);
          if (cells.length) {
            this.updatedCells.push(...cells);
            log(null, 'dirty1');
            g.dirty = 1;  
          }
        }
        logg();
        analysis = new JUM.Analysis(g, JUM.Analysis.TYPE_INCLUDE_SUM_TARGET_DIFF);
        logg('include sum-target: ' + analysis.target);
        log(analysis.winners);
        if (analysis.winners.length == 1) {
          let cells = g.excludeByValues(analysis.winners[0]);
          if (cells.length) {
            this.updatedCells.push(...cells);
            log(null, 'dirty2');
            g.dirty = 1;
          }
        } 
        log(analysis.losers);
        if (analysis.losers.length) {
          let cells = g.includeByValues(analysis.losers);
          if (cells.length) {
            this.updatedCells.push(...cells);
            log(null, 'dirty3');
            g.dirty = 1;
          }
        }
        if (g.isCorrect()) {
          let cells = g.includeUnexcluded();
          if (cells.length) {
            this.updatedCells.push(...cells);
            log(null, 'dirty4');
            g.dirty = 1;
          }
        }
        if (g.dirty) {
          dirty = 1;
        }
        log('dirty=' + g.dirty);
        logg();
        logg();
      })
      log(this.out());
      log('dirty=' + dirty);
      logg();
    } while (dirty && loops < 55);
    logg();
  }
  forEachGroup(fn, nolog) {
    this.rows.forEach((row, i) => {
      ! nolog && log('ROW ' + i);
      fn(row);
    })
    this.cols.forEach((col, i) => {
      ! nolog && log('COL ' + i);
      fn(col);
    })
  }
  cell(ri, ci) {
    return this.rows[ri][ci];
  }
  isCorrect() {
    let correct = 1;
    this.forEachGroup(g => {
      if (correct == 1) {
        if (! g.isComplete()) {
          correct = -1;
        } else if (! g.isCorrect()) {
          correct = 0;
        }
      }
    }, 1)
    return correct;
  }
  rollbackTrans() {
    if (this.updatedCells.length) {
      this.resetAll(this.updatedCells);
    }
    this.updatedCells = [];
    this.trans = 0;
  }
  exclude(ri, ci) {
    let cell = this.cell(ri, ci);
    if (cell.isUnmarked()) {
      cell.exclude();
      if (this.trans) {
        this.updatedCells.push(cell);
      }
    }
    return this;
  }
  include(ri, ci) {
    let cell = this.cell(ri, ci);
    if (cell.isUnmarked()) {
      cell.include();
      if (this.trans) {
        this.updatedCells.push(cell);
      }
    }
    return this;
  }
  reset(ri, ci) {
    this.cell(ri, ci).reset();
    return this;
  }
  resetAll(cells) {
    cells.forEach(c => c.reset());
  }
  out() {
    let a = [];
    this.rows.forEach(row => {
      a.push(row.outCells() + '    ' + row.outTarget() + ' ');
    })
    let ca = ['\n'];
    this.cols.forEach(col => {
      ca.push(col.outTarget());
    })
    a.push(ca.join(' '));
    return a.join('\n');
  }
}
JUM.CellGroup = class extends ObjArray {
  /**
   * i target
   */
  constructor(target, vals, cells) {
    super();
    this.target = target;
    if (vals) {
      vals.forEach(v => {
        this.push(new JUM.Cell(v));
      })
    } else {
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
  outCells() {
    let a = [];
    this.forEach(cell => a.push(cell.out()));
    return a.join(' ');
  }
  outTarget() {
    let s = this.isCorrect() ? '*' : ' ';
    return JUM.CellGroup.pad(this.target) + s + '  ';
  }
  includeByValues(vs) {
    let a = [];
    vs.forEach(v => {
      this.cellsByValue(v).forEach(cell => {
        if (! cell.included) {
          cell.include();
          a.push(cell);
        }  
      })
    })
    return a;
  }
  excludeByValues(vs) {
    let a = [];
    vs.forEach(v => {
      let count = vs.filter(vv => vv == v).length;
      let cells = this.cellsByValue(v, count);
      cells.forEach(cell => {
        cell.exclude();
        a.push(cell);
      })
    })
    return a;
  }
  includeUnexcluded() {
    let a = [];
    this.forEach(cell => {
      if (cell.isUnmarked()) {
        cell.include();
        a.push(cell);
      }
    })
    return a;
  }
  excludeUnincluded() {
    let a = [];
    this.forEach(cell => {
      if (cell.isUnmarked()) {
        cell.exclude();
        a.push(cell);
      }
    })
    return a;
  }
  //
  cellsByValue(v, requireCount) {
    let a = [];
    this.forEach(c => {
      if (c.val == v && ! c.excluded) {
        if (! requireCount || ! c.included) {
          a.push(c);
        }
      }
    })
    if (requireCount && a.length != requireCount) {
      a = [];
    }
    return a;
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
  static pad(v) {
    let pad = ' '.repeat(v < 10 ? 1 : 0);
    return pad + v;
  }
}
JUM.Cell = class extends Obj {
  /**
   * i val
   * b excluded
   * b included
   */
  constructor(v) {
    super();
    this.val = v;
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
  out() {
    let s1 = '  ', s2 = '  ';
    if (this.excluded) {
      s1 = ' >', s2 = '< ';
    } else if (this.included) {
      s1 = ' (', s2 = ') ';
    }
    return s1 + this.val + s2;
  }
  //
  reset() {
    this.excluded = 0;
    this.included = 0;
  }
}
JUM.Analysis = class {
  //
  static TYPE_EXCLUDE_TARGET = 1;
  static TYPE_INCLUDE_SUM_TARGET_DIFF = 2;
  //
  constructor(group, type) {
    this.type = type;
    this.vals = [], this.includes = [];
    if (type == JUM.Analysis.TYPE_EXCLUDE_TARGET) {
      this.target = group.target;
    } else {
      this.target = group.sum() - group.target;
    }
    group.forEach(cell => {
      if (type == JUM.Analysis.TYPE_EXCLUDE_TARGET) {
        if (cell.isUnmarked()) {
          this.vals.push(cell.val);  
        } else if (cell.included) {
          this.target -= cell.val;
        }
      } else {
        if (! cell.excluded) {
          this.vals.push(cell.val);  
        } 
        // if (cell.included) {
        //   this.includes.push(cell.val);
        // }
      }
    })
    this.vals.sort((a, b) => b - a);
    this.winners = [];
    this.losers = [];
    if (this.target == 0) {
      return;
    }
    this.i0 = -1;
    this.iz = this.vals.length;
    this.next0();
    this.losers = this.vals.slice();
    this.winners.forEach(winners => {
      winners.forEach(w => {
        this.losers = this.losers.filter(l => l != w);
      })
    })
  }
  //
  next0() {
    this.i0++;
    if (this.i0 < this.iz) {
      this.i1 = this.i0;
      let v = this.vals[this.i0];
      this.u = [v];
      this.ui = [this.i0];
      this.sum = v;
      this.next1();
    }
  }
  next1() {
    if (this.sum == this.target) {
      this.win();
      return;
    }
    this.i1++;
    if (this.i1 > this.iz) {
      this.pop();
      return;
    }
    let v = this.vals[this.i1];
    let s = this.sum + v;
    if (s <= this.target) {
      this.u.push(v);
      this.ui.push(this.i1);
      this.sum += v;
    }
    this.next1();
  }
  win() {
    let u = this.u.slice();
    let good = this.type == JUM.Analysis.TYPE_EXCLUDE_TARGET;
    if (! good) {
      good = 1;
      this.includes.forEach(i => {
        if (! u.has(i)) {
          good = 0;
        }
      })
    }
    if (good) {
      let ju = js(u);
      let jw = js(this.winners);
      if (! jw.includes(ju)) {
        this.winners.push(u);
      }
    }
    this.pop();
  }
  pop() {
    this.sum -= this.u.pop();
    if (this.u.length == 0) {
      this.next0();
      return;
    }
    this.i1 = this.ui.pop();
    this.next1();
  }
}