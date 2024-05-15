JUM = window.JUM || {};
//
JUM.Table$ = class extends Obj {
  //
  constructor() {
    super();
    this.$me = $('table');
    window.on('keyup', e => this.onkeyup(e));
  }
  load(board) {
    this.board = board;
    this.reset();
  }
  reset() {
    this.$me.innerHTML = '';
    this.board.reset();
    let $tr;
    this.board.rows.forEach(row => {
      $tr = this.$tr();
      row.forEach(cell => {
        new JUM.Cell$(cell, $tr)
          .on('toggle', cell$ => this.cell$_ontoggle(cell$));
      })
      new JUM.SumCell$(row, $tr)
        .on('include', group => this.sumcell$_onclick(group, 1))
        .on('exclude', group => this.sumcell$_onclick(group, 0));
      new JUM.SumOffCell$(row, $tr);
    })
    $tr = this.$tr();
    this.board.cols.forEach(col => {
      new JUM.SumCell$(col, $tr)
        .on('include', group => this.sumcell$_onclick(group, 1))
        .on('exclude', group => this.sumcell$_onclick(group, 0));
    })
    $tr = this.$tr();
    this.board.cols.forEach(col => {
      new JUM.SumOffCell$(col, $tr);
    })
    this.snaps = new JUM.Snapshots();
    this.setBySnap();
  }
  onkeyup(e) {
    switch (e.key) {
      case 'C':
      case 'c':
        this.check();
        break;
      case 'Z':
      case 'z':
        this.undo();
        break;
      case 'Y':
      case 'y':
        this.redo();
        break;
      }
  }
  $tr() {
    let $tr = document.createElement('tr');
    this.$me.appendChild($tr);
    return $tr;
  }
  cell$_ontoggle(cell$) {
    this.snaps.do(this.snap());
    this.refresh();
  }
  sumcell$_onclick(group, include) {
    group.forEach(cell => {
      if (cell.isUnmarked()) {
        if (include) {
          cell.include();
        } else {
          cell.exclude();
        }
        cell.cell$.refresh();
      }
    })
    this.snaps.do(this.snap());
    this.refresh();
  }
  refresh() {
    this.board.forEachGroup(group => {
      group.sumcell$.refresh();
      group.sumoffcell$.refresh();
    })
  }
  snap() {
    let a = [];
    this.forEachCell$(cell$ => {
      a.push(cell$.snap());
    })
    return a;
  }
  setBySnap() {
    let a = this.snaps.current();
    this.forEachCell$(cell$ => {
      if (a) {
        cell$.setBySnap(a.shift());
      } else {
        cell$.setBySnap(0);
      }
    })
    this.refresh();
  }
  forEachCell$(fn) {
    this.board.forEachCell(cell => fn(cell.cell$));
  }
  check() {
    this.board.forEachCell(cell => cell.cell$.check());
  }
  undo() {
    this.snaps.undo();
    this.setBySnap();
  }
  redo() {
    this.snaps.redo();
    this.setBySnap();
  }
}
JUM.Snapshots = class extends StorableObj {
//  onget() {/*return snap*/}
//  onset(snap) {}
  //
  constructor() {
    super('JUM.Snapshots');
    if (this.snaps === undefined) {
      this.snaps = [];
      this.ix = -1;
    } else {
      this.snaps.length = this.ix + 1;
    }
  }
  // on(event, fn) {
  //   super.on(event, fn);
  //   if (event == 'set') {
  //     this.onset(this.current());
  //   }
  // }
  current() {
    if (this.ix >= 0) {
      return jscopy(this.snaps[this.ix]);
    }
  }
  do(snap) {
    this.ix++;
    this.snaps.length = this.ix;
    this.snaps[this.ix] = snap;
    this.save();
  }
  undo() {
    if (this.ix < 0) {
      return;
    }
    this.ix--;
    this.save();
  }
  redo() {
    if (this.ix >= this.snaps.length - 1) {
      return;
    }
    this.ix++;
    this.save();
  }
  save() {
    super.save();
  }
}
JUM.Cell$ = class extends Obj {
  ontoggle(this$) {}
  //
  constructor(cell, $tr) {
    super();
    this.cell = cell;
    this.$me = document.createElement('td');
    this.$me.innerText = cell.val;
    $tr.appendChild(this.$me);
    this.$me
      .on('click', () => this.toggle());
    cell.cell$ = this;
  }
  toggle() {
    this.cell.toggle();
    this.refresh();
    this.ontoggle(this);
  }
  check() {
    this.$me.classList.toggle('error', this.cell.isIncorrect());
  }
  refresh() {
    this.$me.classList.toggle('included', this.cell.included);
    this.$me.classList.toggle('excluded', this.cell.excluded);
    this.$me.classList.remove('error');
  }
  setBySnap(i) {
    if (i == 1 && ! this.cell.included) {
      this.cell.include();
      this.refresh();
    } else if (i == 2 && ! this.cell.excluded) {
      this.cell.exclude();
      this.refresh();
    } else if (i == 0 && ! this.cell.isUnmarked()) {
      this.cell.reset();
      this.refresh();
    }
  }
  snap(i) {
    return this.cell.included ? 1 : (this.cell.excluded ? 2 : 0);
  }  
}
JUM.SumCell$ = class extends Obj {
  oninclude(group) {}
  onexclude(group) {}
  //
  constructor(group, $tr) {
    super();
    this.group = group;
    this.$me = document.createElement('th');
    this.$me.innerText = group.target;
    $tr.appendChild(this.$me);
    this.$me
      .on('click', () => this.$me_onclick());
    group.sumcell$ = this;
    this.refresh();
  }
  refresh() {
    let off = this.group.off();
    this.$me.classList.toggle('correct', off.lose == 0 && off.need == 0);
    this.$me.classList.toggle('almost', (off.lose == 0 || off.need == 0) && off.lose + off.need);
  }
  $me_onclick() {
    let off = this.group.off();
    if (off.need && off.lose) {
      return;
    }
    if (off.need) {
      this.oninclude(this.group);
    } else if (off.lose) {
      this.onexclude(this.group);
    }
  }
}
JUM.SumOffCell$ = class extends Obj {
  //
  constructor(group, $tr) {
    super();
    this.group = group;
    this.$me = document.createElement('th');
    this.$me.className = 'off';
    $tr.appendChild(this.$me);
    group.sumoffcell$ = this;
    this.refresh();
  }
  refresh() {
    let off = this.group.off();
    this.$me.innerHTML = '+' + off.need + '<br>' + '-' + off.lose;
    this.$me.classList.toggle('hide', off.lose == 0 && off.need == 0);
    this.$me.classList.toggle('bad', off.lose < 0 || off.need < 0);
  }
}