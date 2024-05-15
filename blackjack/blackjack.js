B = window.B || {};
//
B.Dealer = class extends Obj {
  onwagered() {}
  onshuffled() {}
  ondealt() {}
  oninsured() {}
  onplaying(player, hand) {}
  onaction(player, hand, action) {}
  ondone(player, hand) {}
  ondealerplaying(dealer, hand) {}
  ondealeraction(dealer, hand, action) {}
  onsettled() {}
  onexposed(card) {}
  //
  constructor(table) {
    super();
    this.name = 'Dealer';
    this.table = table;
    this.chips = new B.Chips();
    this.hand = new B.Hand(this);
  }
  using(Strategy) {
    this.strategy = new Strategy(this);
    return this;
  }
  async start() {
    await this.getWagers();
    if (this.table.activePlayers().length == 0) {
      throw 'No one playing';
    }
    this.deal();
    if (this.table.rules.surrender_early) {
      this.getSurrenders();
    }
    if (this.upCard.ace()) {
      this.getInsurances();
    }
    if (this.hand.blackjack()) {
      this.holeCard.up();
      this.onexposed(this.holeCard);
      this.payInsurances();
    } else {
      this.payBlackjacks();
      this.play();
      this.holeCard.up();
      this.onexposed(this.holeCard);
      this.playDealer();
    }
    this.settleUp();
    this.collect();
  }
  playDealer() {
    let hand = this.hand;
    this.ondealerplaying(this, hand);  
    while (hand) {
      let action = this.strategy.action(hand);
      if (action.type == B.Action.HIT) {
        let card = this.table.shoe.draw().up();
        this.hand.add(card);
        this.onexposed(card);
      }
      this.ondealeraction(this, action, hand);
      if (this.hand.busted()) {
        this.hand.lose();
        hand = null;
      }
      if (action.type == B.Action.STAND) {
        this.hand.stand();
        hand = null;
      }
    }
  }
  play() {
    this.table.activePlayers().forEach(player => {
      let hand = player.hands.hand(), last;
      while (hand) {
        if (hand != last) {
          this.onplaying(player, hand);
          last = hand;
        }
        let action = player.getAction(hand);
        switch (action.type) {
          case B.Action.STAND:
            player.stand();
            this.onaction(player, hand, action);
            hand = player.hands.next();
            break;
          case B.Action.DOUBLEDOWN:
            if (! this.table.rules.double_after_split && player.hands.splitCount() > 0) {
              throw 'Double down disallowed after split';
            }
            if (this.table.rules.double_10_11_only && (player.hands.hand().score < 10 || player.hands.hand().score > 11)) {
              throw 'Double down allowed on 10 and 11 only';
            }
          case B.Action.HIT:
            let card = this.table.shoe.draw().up();
            player.receive(card);
            this.onexposed(card);
            this.onaction(player, hand, action);
            if (hand.busted()) {
              hand.lose().scoop(this.chips);
              this.ondone(player, hand);
              hand = player.hands.next();
            } else if (action.type == B.Action.DOUBLEDOWN) {
              hand = player.hands.next();
            }
            break;
          case B.Action.SURRENDER:
            if (! this.table.rules.surrender_late) {
              throw 'No late surrender allowed';
            }
            player.surrender();
            this.onaction(player, hand, action);
            hand.lose().scoop(this.chips);
            this.ondone(player, hand);
            hand = player.hands.next();
            break;
          case B.Action.SPLIT:
            if (this.table.rules.split_limit > 0 && player.hands.splitCount() >= this.table.rules.split_limit) {
              throw `Split limit of ${this.table.rules.split_limit} reached`;
            }
            let card1 = this.table.shoe.draw().up();
            let card2 = this.table.shoe.draw().up();
            player.split(card1, card2);
            this.onaction(player, hand, action);
            this.onexposed(card1);
            this.onexposed(card2);
            break;
        }
      }
    })
  }
  async getWagers() {
    let players = this.table.seats.players();
    for await (let player of players) {
      let wager = await player.getWager();
      log('&&& ' + player.name + ' wagers ' + wager);
      if (wager) {
        this.chips.add(wager);
      }
    }
    this.onwagered();
  }
  deal() {
    let shoe = this.table.shoe;
    let discards = this.table.discards;
    if (shoe.percentUsed() >= this.table.rules.shuffle_at) {
      shoe.collect(discards).shuffle();
      this.onshuffled();
    }
    this.dealToPlayers();
    this.upCard = shoe.draw().up();
    this.holeCard = shoe.draw().down();
    this.hand.add(this.upCard).add(this.holeCard);
    this.onexposed(this.upCard);
    this.dealToPlayers();
    this.ondealt();
  }
  dealToPlayers() {
    let players = this.table.activePlayers();
    players.forEach(player => {
      let card = this.table.shoe.draw().upIf(this.table.rules.shoe);
      player.receive(card);
      if (card.showing) {
        this.onexposed(card);
      }
    })
  }
  payBlackjacks() {
    this.table.activePlayers().forEach(player => {
      player.hands.active().forEach(hand => {
        if (hand.blackjack()) {
          player.win(hand.wager * 1.5);
          hand.win().scoop(player.chips);
          this.ondone(player, hand);
        }
      })
    })
  }
  getInsurances() {
    this.table.activePlayers().forEach(player => {
      let insurance = player.getInsurance();
      if (insurance) {
        let expected = player.hands.wager / 2;
        if (insurance != expected) {
          throw `Expected insurance of ${expected}, but received ${insurance}`;
        }
      }
    })
    this.oninsured();
  }
  payInsurances() {
    this.table.activePlayers().forEach(player => {
      let amount = player.hands.insurance * 2;
      if (amount) {
        player.payInsurance(amount);
      }
    })
  }
  getSurrenders() {
    this.table.activePlayers().forEach(player => {
      let surrender = player.getSurrender(player.hands.hand());
      if (surrender) {
        let expected = player.hands.hand().wager / 2;
        if (surrender != expected) {
          throw `Expected surrender of ${expected}, but received ${surrender}`;
        }
        player.hands.hand().lose().scoop(this.chips);
        this.ondone(player, hand);
        if (player.active()) {
          throw 'Must be inactive after surrender';
        }
      }
    })
  }
  settleUp() {
    this.table.activePlayers().forEach(player => {
      player.hands.active().forEach(hand => {
        if (this.hand.busted() || hand.score > this.hand.score) {
          player.win(hand.wager);
          hand.win().scoop(player.chips);
        } else if (hand.score == this.hand.score) {
          hand.tie().scoop(player.chips);
        } else {
          hand.lose().scoop(this.chips);
        }
        this.ondone(player, hand);
      })
    })
    this.onsettled();
  }
  collect() {
    this.table.seats.players().forEach(player => {
      player.collect(this.table.discards);
    })
    this.hand.collect(this.table.discards);
  }
}
B.Cards = class extends Array {
  //
  toString() {
    let a = [];
    this.forEach(card => a.push(card.toString()));
    return a.join(',');
  }
  up() {
    this.forEach(card => card.down());
    return this;
  }
  down() {
    this.forEach(card => card.down());
    return this;
  }
}
B.Deck = class extends B.Cards {
  //
  constructor() {
    super();
    for (let suit = 0; suit <= 3; suit++) {
      for (let spot = 1; spot <= 13; spot++) {
        this.push(new B.Card(spot, suit));
      }
    }
  }
}
B.Shoe = class extends B.Cards {
  //
  constructor(count = 1) {
    super();
    for (let i = 0; i < count; i++) {
      this.push(...new B.Deck());
    }
    this._len = this.length;
  }
  draw() {
    let card = this.shift();
    return card;
  }
  burn(discards) {
    discards.add(this.draw());
  }
  collect(discards) {
    let card = discards.pop();
    while (card) {
      this.push(card);
      card = discards.pop();
    }
    return this;
  }
  percentUsed() {
    return (this._len - this.length) / this._len * 100;
  }
  full() {
    return this.length == this._len;
  }
  shuffle() {
    if (! this.full()) {
      throw 'Missing card(s)';
    }
    this.down();
    let n = this.length;
    for (let i = 0; i < this.length - 2; i++) {
      let j = Math.floor(Math.random() * n--) + i;
      [this[i], this[j]] = [this[j], this[i]];
    }
    return this;
  }
}
B.Discards = class extends B.Cards {
  //
  add(card) {
    this.push(card);
  }
}
B.Seats = class extends Array {
  //
  constructor(total) {
    super();
    for (let i = 0; i < total; i++) {
      this.push(new B.Seat(i));
    }
  }
  players() {
    let players = [];
    [...this].filter(seat => seat.player).forEach(seat => players.push(seat.player));
    return players;
  }
  sit(player, pos/*0=first base, -1=first avail*/) {
    if (pos == -1) {
      pos = this.firstEmpty().pos;
    }
    if (pos < 0 || pos >= this.length) {
      throw 'Invalid position';
    }
    this[pos].sit(player);
  }
  leave(player) {
    let seat = this.find(s => s.player == player);
    if (! seat) {
      throw 'Player not found';
    }
    seat.leave();
  }
  empty() {
    return this.players().length == 0;
  }
  firstEmpty() {
    return this.find(s => s.empty());
  }
  toString() {
    let a = [];
    this.forEach(s => a.push(s.toString()));
    return a.join('\n');
  }
}
B.Seat = class {
  //
  constructor(pos/*0=first base*/) {
    this.pos = pos;
    this.player = null;
  }
  sit(player) {
    if (this.player) {
      throw 'Seat taken';
    }
    this.player = player;
  }
  leave() {
    this.player = null;
  }
  empty() {
    return this.player == null;
  } 
  toString() {
    let p = this.player ? this.player.toString() : '(Empty)';
    return `[${p}]`;
  }
}
B.Table = class {
  onsit(player, pos) {}
  onleave(player) {}
  /**
   * rules
   * dealer
   * seats
   * shoe
   * discards
   */
  constructor(rules) {
    this.rules = rules;
    this.dealer = new B.Dealer(this).using(B.Strategy_Dealer);
    this.seats = new B.Seats(this.rules.seats);
    this.shoe = new B.Shoe(this.rules.decks).shuffle();
    this.discards = new B.Discards();
  }
  activePlayers() {
    return this.seats.players().filter(player => player.active());
  }
  sit(player, pos) {
    this.seats.sit(player, pos);
    this.onsit(player, pos);
  }
  leave(player) {
    this.seats.leave(player);
    this.onleave(player);
  }
  start() {
    this.dealer.start();
  }
}
B.Card = class {
  /**
   * i spot (1=A,2,3,..,10,11=J,12=Q,13=K)
   * i suit (0=H,1=D,2=S,3=C)
   * b showing (face up)
   */
  constructor(spot, suit) {
    this.spot = spot;
    this.suit = suit;
    this.showing = false;
  }
  up() {
    return this.upIf(true);
  }
  down() {
    return this.upIf(false);
  }
  upIf(b) {
    this.showing = b;
    return this;
  }
  value() {
    return this.spot < 10 ? this.spot : 10;
  }
  hardValue() {
    return this.spot == 1 ? 11 : this.value();
  }
  ten() {
    return this.spot >= 10;
  }
  ace() {
    return this.spot == 1;
  }
  toString() {
    if (this.showing) {
      return B.Card.SPOTS[this.spot] + B.Card.SUITS[this.suit];
    } else {
      return '##';
    }
  }
  //
  static SPOTS = [,'A','2','3','4','5','6','7','8','9','T','J','Q','K'];
  static SUITS = ['h','d','s','c'];
}
B.Chips = class {
  //
  constructor(value) {
    this.value = value || 0;
    this.hi = this.value;
    this.lo = this.value;
  }
  add(amt) {
    this.value += amt;
    if (this.value > this.hi) {
      this.hi = this.value;
    }
    return amt;
  }
  lose(amt) {
    if (this.value < amt) {    
      throw 'Not enough chips';
    }
    this.value -= amt;
    if (this.value < this.lo) {
      this.lo = this.value;
    }
    return amt;
  }
  has(amt) {
    return this.value >= amt;
  }
  toString() {
    return '$' + this.value + ' (' + this.lo + '-' + this.hi + ')';
  }
}
B.Hands = class extends Array {
  /**
   * Player owner
   * i wager
   * i insurance
   */
  constructor(owner, wager) {
    super();
    this.owner = owner;
    this.wager = wager;
    this.insurance = 0;
    this.push(new B.Hand(owner, wager));
    this.pix = 0;
  }
  active() {
    return [...this].filter(hand => hand.active());
  }
  hand() {
    return this[this.pix];
  }
  next() {
    this.pix++;
    if (this.pix < this.length) {
      return this.hand();
    }
  }
  insure(wager) {
    this.insurance = wager;
  }
  split(card1, card2, wager) {
    let card0 = this.hand().split().replace(card1);
    let newHand = new B.Hand(this.owner, wager).split().add(card0).add(card2);
    this.splice(this.pix + 1, 0, newHand);
  }
  splitCount() {
    return this.length - 1;
  }
  collect(discards) {
    this.forEach(hand => hand.collect(discards));
  }
}
B.Hand = class extends B.Cards {
  /**
  * owner
  * i wager
  * i score
  * b soft
  * b doublingDown
  * b surrendering
  * i result
   */  
  constructor(owner, wager = 0/*dealer's*/) {
    super();
    this.owner = owner;
    this.wager = wager;
    this.score = 0;
    this.soft = false;
    this.standing = false;
    this.doublingDown = false;
    this.surrendering = false;
    this.result = null;
    this.splitting = false;
  }
  add(card) {
    this.push(card);
    this.sum();
    return this;
  }
  replace(card) {
    let ocard = this[1];
    this[1] = card;
    this.sum();
    return ocard;
  }
  blackjack() {
    return ! this.splitting && this.length == 2 && this.score == 21;
  }
  busted() {
    return this.score > 21;
  }
  pair() {
    return this.length == 2 && this[0].spot == this[1].spot;
  }
  stand() {
    this.standing = true;
  }
  surrender(wager) {
    this.wager = wager;
    this.surrendering = true;
  }
  doubleDown(wager) {
    this.wager = wager;
    this.doublingDown = true;
  }
  collect(discards) {
    let card = this.pop();
    while (card) {
      discards.add(card);
      card = this.pop();
    }
    return this;
  }
  scoop(chips) {
    chips.add(this.wager);
    this.wager = 0;
    return this;
  }
  split() {
    this.splitting = true;
    return this;
  }
  active() {
    return this.wager > 0;
  }
  win() {
    this.result = B.Hand.WIN;
    return this;
  }
  lose() {
    this.result = B.Hand.LOSE;
    return this;
  }
  tie() {
    this.result = B.Hand.PUSH;
    return this;
  }
  sum() {
    this.soft = false;
    let sum = 0;
    this.forEach(card => {
      if (! card.ace()) {
        sum += card.value();
        if (sum > 21 && this.soft) {
          sum -= 10;
          this.soft = false;
        }
      } else {
        if (sum < 11) {
          sum += 11;
          this.soft = true;
        } else {
          sum += 1;
        }  
      }
    })
    this.score = sum;
    return sum;
  }
  resultText() {
    if (this.blackjack()) {
      return 'BLACKJACK';
    }
    if (this.result) {
      return B.Hand.RESULTS[this.result];
    }
    if (this.standing) {
      return 'STANDING';
    }
  }
  toString() {
    let a = [];
    this.forEach(card => {
      a.push(card.toString() + ' ');
    })
    return a.join('');
  }
  //
  static WIN = 1;
  static LOSE = 2;
  static PUSH = 3;
  //
  static RESULTS = [,'WIN','LOSE','PUSH'];
}
B.Rules = class {
  //
  seats = 7;
  bet_min = 25;
  bet_max = 5000;
  shoe = true;
  decks = 4;
  shuffle_at = 80/*percent used*/;
  dealer_hits_soft_17 = false;
  double_10_11_only = false;
  double_after_split = true;
  resplits_limit = 0/*no limit*/;
  surrender_early = true;
  surrender_late = true;
  insurance = true;
}
B.Action = class {
  //
  constructor(type) {
    this.type = type;
  }
  toString() {
    return B.Action.TYPES[this.type];
  }
  //
  static HIT = 1;
  static STAND = 2;
  static DOUBLEDOWN = 3;
  static SPLIT = 4;
  static SURRENDER = 5;
  //
  static TYPES = [,'HIT','STAND','DOUBLEDOWN','SPLIT','SURRENDER'];
}
B.Player = class extends Obj {
  onsit(table) {}
  /**
   * s name
   * chips
   * hands
   * strategy
   * table
   */
  constructor(name, bankroll) {
    super();
    this.name = name;
    this.chips = new B.Chips(bankroll);
  }
  buy(amount) {
    this.chips.add(amount);
    return this;
  }
  sit(table, pos = -1/*first avail*/) {
    if (this.table) {
      throw 'Already seated';
    }
    this.table = table;
    this.table.sit(this, pos);
    this.onsit(table);
    return this;
  }
  using(Strategy) {
    this.strategy = new Strategy(this);
    return this;
  }
  async getWager() {
    await $('body').await_on('click');
    let wager = this.strategy.wager();
    if (! this.chips.has(wager)) {
      this.leave();
      return 0;
    }
    this.hands = new B.Hands(this, this.chips.lose(wager));
    return wager;
  }
  getAction(hand) {
    let action = this.strategy.action(hand);
    return action;
  }
  getInsurance() {
    if (this.strategy.insurance()) {
      let wager = this.hands.wager / 2;
      if (this.chips.has(wager)) {
        this.hands.insure(this.chips.lose(wager));
        return wager;
      }
    }
  }
  getSurrender(hand) {
    if (this.strategy.surrender(hand)) {
      return this.surrender();
    }
  }
  payInsurance(amount) {
    this.chips.add(amount);
    this.hands.insure(0);
  }
  surrender() {
    let wager = this.hands.hand().wager / 2;
    this.hands.hand().surrender(this.chips.add(wager));
    return wager;        
  }
  split(card1, card2) {
    let wager = this.hands.hand().wager;
    this.hands.split(card1, card2, this.chips.lose(wager));
  }
  receive(card) {
    this.hands.hand().add(card);
  }
  stand() {
    this.hands.hand().stand();
  }
  leave() {
    if (! this.table) {
      throw 'Not sitting';
    }
    this.table.leave(this);
  }
  busted() {
    return this.bankroll < this.table.rules.bet_min;
  }
  active() {
    return this.hands.active().length > 0;
  }
  insured() {
    return this.hands.insurance > 0;
  }
  win(amount) {
    this.chips.add(amount);
  }
  collect(discards) {
    this.hands.collect(discards);
  }
  toString() {
    return this.name + ',' + this.chips.toString();
  }
}
B.Strategy_Dealer = class {
  //
  constructor(me) {
    this.me = me;
  }
  action(hand) {
    let score = hand.score;
    if (hand.soft && hand.score < 18 && this.me.table.rules.dealer_hits_soft_17) {
      score -= 10;
    }
    let type = (score < 17) ? B.Action.HIT : B.Action.STAND;
    return new B.Action(type);
  }
}
B.Strategy_Player_Dumb = class {
  //
  constructor(me) {
    this.me = me;
  }
  wager() {
    return this.me.table.rules.bet_min;
  }
  insurance() {
    return true;
  }
  surrender() {
    return false;
  }
  action(hand) {
    let type = (hand.score < 17) ? B.Action.HIT : B.Action.STAND;
    return new B.Action(type);
  }
}
B.Strategy_Player_Basic = class {
  //
  constructor(me) {
    this.me = me;
  }
  wager() {
    return this.me.table.rules.bet_min;
  }
  insurance() {
    return false; //todo
  }
  surrender() {
    return false; //todo
  }
  action(hand) {
    let di = this.me.table.dealer.upCard.hardValue(), pi, TABLE;
    if (hand.pair()) {
      TABLE = this.me.table.rules.double_after_split ? B.Strategy_Player_Basic.PAIR_DD_AFTER_SPLIT : B.Strategy_Player_Basic.PAIR_NO_DD_AFTER_SPLIT; 
      pi = hand[0].hardValue();
    } else {
      if (hand.length == 2) {
        pi = hand[0].ace() ? hand[1].hardValue() : (hand[1].ace() ? hand[0].hardValue() : 0);
      }
      if (pi) {
        TABLE = B.Strategy_Player_Basic.ACE_NO_PAIR;
      } else {
        TABLE = B.Strategy_Player_Basic.BASIC;
        pi = hand.score;
      }
    }
    let type = B.Strategy_Player_Basic.STRING_TO_ACTION_TYPE[TABLE[pi][di]];
    return new B.Action(type);
  }
  //
  static BASIC = [0,1,2
    ,[0,1, 'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ] //3
    ,[0,1, 'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ] //4
    ,[0,1, 'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ] //5
    ,[0,1, 'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ] //6
    ,[0,1, 'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ] //7
    ,[0,1, 'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ,'H' ] //8
    ,[0,1, 'H' ,'DD','DD','DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //9
    ,[0,1, 'DD','DD','DD','DD','DD','DD','DD','DD','H' ,'H' ] //10
    ,[0,1, 'DD','DD','DD','DD','DD','DD','DD','DD','DD','H' ] //11
    ,[0,1, 'H' ,'H' ,'S' ,'S' ,'S' ,'H' ,'H' ,'H' ,'H' ,'H' ] //12
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'H' ,'H' ,'H' ,'H' ,'H' ] //13
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'H' ,'H' ,'H' ,'H' ,'H' ] //14
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'H' ,'H' ,'H' ,'SR','H' ] //15
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'H' ,'H' ,'H' ,'SR','SR'] //16
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //17
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //18
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //19
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //20
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //21
  ];
  static ACE_NO_PAIR = [0,1
    ,[0,1, 'H' ,'H' ,'H' ,'DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //A2
    ,[0,1, 'H' ,'H' ,'H' ,'DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //A3
    ,[0,1, 'H' ,'H' ,'DD','DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //A4
    ,[0,1, 'H' ,'H' ,'DD','DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //A5
    ,[0,1, 'H' ,'DD','DD','DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //A6
    ,[0,1, 'H' ,'DD','DD','DD','DD','H' ,'H' ,'H' ,'H' ,'H' ] //A7
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //A8
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //A9
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //AT (after split)
  ]; 
  static PAIR_DD_AFTER_SPLIT = [0,1
    ,[0,1, 'SP','SP','SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ] //22
    ,[0,1, 'SP','SP','SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ] //33
    ,[0,1, 'H' ,'H' ,'H' ,'SP','SP','H' ,'H' ,'H' ,'H' ,'H' ] //44
    ,[0,1, 'DD','DD','DD','DD','DD','DD','DD','DD','H' ,'H' ] //55
    ,[0,1, 'SP','SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ,'H' ] //66
    ,[0,1, 'SP','SP','SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ] //77
    ,[0,1, 'SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'] //88
    ,[0,1, 'SP','SP','SP','SP','SP','S', 'SP','SP','S' ,'S' ] //99
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //TT
    ,[0,1, 'SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'] //AA
  ];
  static PAIR_NO_DD_AFTER_SPLIT = [0,1
    ,[0,1, 'H' ,'H' ,'SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ] //22
    ,[0,1, 'H' ,'H' ,'SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ] //33
    ,[0,1, 'H' ,'H' ,'H' ,'H', 'H', 'H' ,'H' ,'H' ,'H' ,'H' ] //44
    ,[0,1, 'DD','DD','DD','DD','DD','DD','DD','DD','H' ,'H' ] //55
    ,[0,1, 'H' ,'SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ,'H' ] //66
    ,[0,1, 'SP','SP','SP','SP','SP','SP','H' ,'H' ,'H' ,'H' ] //77
    ,[0,1, 'SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'] //88
    ,[0,1, 'SP','SP','SP','SP','SP','S', 'SP','SP','S' ,'S' ] //99
    ,[0,1, 'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ,'S' ] //TT
    ,[0,1, 'SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'] //AA
  ];
  static STRING_TO_ACTION_TYPE = {'H':1,'S':2,'DD':3,'SP':4,'SR':5};
}
B.Strategy_Player_Basic_Uston = class extends B.Strategy_Player_Basic {
  //
  constructor(me) {
    super(me);
    me.on('sit', (table) => this.onsit(table));
    this.reset();
  }
  reset() {
    this.running = 0;
    this.aces = 0;
  }
  insurance() {
    return this.count().true >= 3;
  }
  action(hand) {
    let count = this.count();
    let type, vs;
    if (hand[0].spot == 10 && hand.pair()) {
      vs = '1010v' + this.table.dealer.upCard.hardValue();
    } else {
      vs = hand.score + 'v' + this.table.dealer.upCard.hardValue();
    }
    switch (vs) {
      case '1010v6':
      case '1010v5':
        if (count >= 6) {
          type = B.Action.SPLIT;
        }
        break;
      case '16v10':
        if (count >= 0) {
          type = B.Action.STAND;
        }
        break;
      case '16v9':
        if (count >= 6) {
          type = B.Action.STAND;
        }
        break;
      case '15v10':
        if (count >= 4) {
          type = B.Action.STAND;
        }
        break;
      case '13v2':
        if (count < 0) {
          type = B.Action.HIT;
        }
        break;
      case '13v3':
        if (count < -1) {
          type = B.Action.HIT;
        }
        break;
      case '12v2':
        if (count >= 4) {
          type = B.Action.STAND;
        }
        break;
      case '12v3':
        if (count >= 2) {
          type = B.Action.STAND;
        }
        break;
      case '12v4':
        if (count < 0) {
          type = B.Action.HIT;
        }
        break;
      case '12v5':
        if (count < -1) {
          type = B.Action.HIT;
        }
        break;
      case '12v6':
        if (count < 0) {
          type = B.Action.HIT;
        }
        break;
      case '11v11':
        if (count >= 1) {
          type = B.Action.DOUBLEDOWN;
        }
        break;
      case '10v11':
      case '10v10':
      case '9v7':
        if (count >= 5) {
          type = B.Action.DOUBLEDOWN;
        }
        break;
      case '15v11':
        if (count > 2) {
          type = B.Action.SURRENDER;
        }
        break;
      case '15v10':
        if (count > 0) {
          type = B.Action.SURRENDER;
        }
        break;
      case '15v9':
      case '14v10':
        if (count > 3) {
          type = B.Action.SURRENDER;
        }
        break;
    }
    return type ? new B.Action(type) : super.action(hand);
  }
  wager() {
    let wager = this.table.rules.bet_min;
    let count = this.bettingCount();
    if (count >= 3) {
      wager *= (count - 1);
      if (wager > this.table.rules.bet_max) {
        wager = this.table.rules.bet_max;
      }
    }
    return wager;
  }
  //
  count(forBetting = false) {
    let halfDecksLeft = Math.round((100 - this.table.shoe.percentUsed()) / 100 * this.halfDecks);
    let trueCount = Math.round(this.running / halfDecksLeft);
    log('>>> count: hdl=' + halfDecksLeft + ',run=' + this.running + ',true=' + trueCount);
    if (forBetting) {
      let expectedAces = 2 * (this.halfDecks - halfDecksLeft);
      let aceAdjust = (expectedAces - this.aces) * 3;
      trueCount = Math.round((this.running + aceAdjust) / halfDecksLeft);
      log('>>> aces: expected=' + expectedAces + ',adjust=' + aceAdjust+',true=' + trueCount);
    }
    return trueCount;
  }
  bettingCount() {
    return this.count(true);
  }
  onsit(table) {
    this.table = table;
    this.halfDecks = table.rules.decks * 2;
    this.me.table.dealer
      .on('exposed', (card) => this.onexposed(card))
      .on('shuffled', () => this.onshuffled());
  }
  onexposed(card) {
    if (card.ace()) {
      this.aces++;
    } else {
      this.running += B.Strategy_Player_Basic_Uston.CARD_COUNTS[card.value()];
    }
    log('>>> exposed: ' + card.toString() + ',aces=' + this.aces + ',running=' + this.running);
  }
  onshuffled() {
    this.reset();
  }
  //
  static CARD_COUNTS = [0,0,1,2,2,3,2,2,1,-1,-3];
}
