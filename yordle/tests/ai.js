class UiAiTester extends Ui {
  //
  constructor() {
    super();
    $('#ptitle').innerText = 'YORDLE AI TESTER';
    this.aitester = new AiTester()
      .on('start', word => this.onstart(word))
      .on('update', metrics => this.onupdate(metrics))
      .on('complete', metrics => this.oncomplete(metrics));
    this.$attempts = $('#attempts .a');
    this.attempts = new UiBar($('#attempts .bar'));
    this.$correct = $('#correct .a');
    this.$average = $('#average .a');
    this.$$tries = $$('.tries .a');
    this.tries = UiBar.array($$('.tries .bar'));
  }
  start() {
    delay(1000, () => this.aitester.start());
  }
  onstart(word) {
    $('#word').innerText = word;
  }
  onupdate(m) {
    this.$attempts.innerText = m.attempts;
    this.$correct.innerText = round(m.correctPct) + '%';
    this.$average.innerText = round(m.triesAvg);
    this.attempts.pct(m.attemptsPct);
    for (var i = 0; i < 7; i++) {
      this.$$tries[i].innerText = m.tries(i);
      this.tries[i].pct(m.triesPct(i));
    }
    $('#losers').innerText = m.triesWordMap[7].join(', ');
  }
  oncomplete(m) {
    $('#word').innerText = '';
  }
}
class UiBar extends Ui {
  //
  constructor($me) {
    super();
    this.$me = $me;
    this.reset();
  }
  reset() {
    this.$me.style.width = '0';
  }
  pct(x) {
    this.$me.style.width = x + '%';
  }
  //
  static array($$e) {
    var a = [];
    $$e.forEach($e => a.push(new UiBar($e)));
    return a;
  }
}
class AiTester extends Ui {
  onstart(word) {}
  onupdate(metrics) {}
  oncomplete() {}
  //
  constructor() {
    super();
    this.yordle = Yordle.hardMode();
    //this.words = this.yordle.wordlist.words;
    this.words = wordles;
    this.ix = 0;
    this.ai = new YordleAi(1);
    this.metrics = new AiTester.Metrics(this.words.length);
  }
  start() {
    this.iterate();
  }
  //
  iterate() {
    async(() => {
      this.word = this.words[this.ix++];
      this.onstart(this.word);
      this.yordle.reset(this.word);
      this.ai.reset();
      this.play();
      this.metrics.record(this.word, this.result);
      this.onupdate(this.metrics);
      if (this.ix == this.words.length) {
        this.oncomplete(this.metrics);
      } else {
        this.iterate();
      }
    })
  }
  play(result) {
    var guess = this.ai.play(result);
    var r = this.yordle.enter(guess);
    if (r.retry) {
      this.play(r);
    } else {
      this.result = r;
    }
  }
}
AiTester.Metrics = class {
  //
  constructor(total/*words*/) {
    this.total = total;
    this.attempts = 0;
    this.attemptsPct = 0.;
    this.correct = 0;
    this.correctPct = 0.;
    this.incorrect = 0;
    this.triesSum = 0;
    this.triesAvg = 0.;
    this.triesMin = 99;
    this.triesMax = 0;
    this.triesWordMap = {1:[],2:[],3:[],4:[],5:[],6:[],7:[]} // 7=fail
  }
  record(word, r) {
    var tries = r.lose ? 7 : r.tray.ix + 1;
    this.attempts++;
    this.attemptsPct = pct(this.attempts, this.total);
    this.correct = r.win ? this.correct + 1 : this.correct;
    this.correctPct = pct(this.correct, this.attempts);
    this.incorrect = r.lose ? this.incorrect + 1 : this.incorrect;
    this.triesSum = this.triesSum + tries;
    this.triesAvg = this.triesSum / this.attempts;
    this.triesMin = tries < this.triesMin ? tries : this.triesMin;
    this.triesMax = tries > this.triesMax ? tries : this.triesMax;
    this.triesWordMap[tries].push(word);
  }
  tries(i) {
    return this.triesWordMap[i + 1].length;
  }
  triesPct(i) {
    return pct(this.tries(i), this.total);
  }
}
function async(fn) {
  setTimeout(fn, 0);
}
function round(x) {
  return (Math.round(x * 100) / 100).toFixed(2);
}
function pct(n, d) {
  return n / d * 100.;
}