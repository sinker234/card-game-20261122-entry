/* Ember Court — game state and rules. One job: the rules of the duel. */
import {
  BEATS, DECK_SPEC, HARMONY_BONUS, LANES, LANE_WIN_SCORE, LONE_STAR_BONUS,
  MAX_HAND, START_HAND, START_LIFE, SUITS, SUIT_EDGE_BONUS, SUIT_NAMES, manaForTurn,
} from './config.js';
import { mulberry32, shuffleInPlace } from './rng.js';

let cardUid = 1;

export function buildDeck(rand) {
  const deck = [];
  for (const suit of Object.keys(SUITS)) {
    DECK_SPEC.forEach(([cost, power], i) => {
      deck.push({
        uid: cardUid += 1, suit, cost, power,
        name: SUIT_NAMES[suit][i],
      });
    });
  }
  return shuffleInPlace(deck, rand);
}

export function createGame(seed) {
  const rand = mulberry32(seed);
  const game = {
    seed,
    turn: 1,
    phase: 'title', // title | play | resolving | won | lost
    mana: manaForTurn(1),
    manaMax: manaForTurn(1),
    you: { life: START_LIFE, score: 0, hand: [], deck: buildDeck(rand), discard: [], lanesWon: 0, damageDealt: 0 },
    foe: { life: START_LIFE, score: 0, hand: [], deck: buildDeck(rand), discard: [], lanesWon: 0, damageDealt: 0 },
    lanes: LANES.map((lane) => ({ ...lane, you: [], foe: [] })),
    log: [],
    foeIntent: null,
    winner: null,
    lastResolution: null,
  };
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(game, game.you);
    drawCard(game, game.foe);
  }
  return game;
}

export function drawCard(game, side) {
  if (side.hand.length >= MAX_HAND) return null;
  if (side.deck.length === 0) {
    if (side.discard.length === 0) return null;
    side.deck = shuffleInPlace(side.discard.splice(0), mulberry32(game.seed + game.turn * 7919));
  }
  const card = side.deck.pop();
  if (card) side.hand.push(card);
  return card;
}

export function canPlayCard(game, card) {
  return game.phase === 'play' && card.cost <= game.mana;
}

export function playCard(game, cardUidToPlay, laneId) {
  const handIndex = game.you.hand.findIndex((c) => c.uid === cardUidToPlay);
  if (handIndex < 0) return { ok: false, reason: 'That card is not in your hand.' };
  const card = game.you.hand[handIndex];
  if (game.phase !== 'play') return { ok: false, reason: 'Wait for your turn.' };
  if (card.cost > game.mana) return { ok: false, reason: 'Not enough mana.' };
  const lane = game.lanes.find((l) => l.id === laneId);
  if (!lane) return { ok: false, reason: 'No such lane.' };
  game.you.hand.splice(handIndex, 1);
  game.mana -= card.cost;
  lane.you.push(card);
  pushLog(game, `You played ${card.name} (${SUITS[card.suit].name} ${card.power}) to ${lane.name}.`);
  return { ok: true, card, lane };
}

export function dominantSuit(cards) {
  if (cards.length === 0) return null;
  const counts = {};
  for (const card of cards) counts[card.suit] = (counts[card.suit] || 0) + 1;
  let best = null; let bestCount = 0;
  for (const [suit, count] of Object.entries(counts)) {
    if (count > bestCount) { best = suit; bestCount = count; }
  }
  return best;
}

export function lanePower(cards, enemyCards) {
  let power = cards.reduce((sum, c) => sum + c.power, 0);
  const notes = [];
  const suits = {};
  for (const card of cards) suits[card.suit] = (suits[card.suit] || 0) + 1;
  for (const [suit, count] of Object.entries(suits)) {
    if (count >= 2) { power += HARMONY_BONUS; notes.push(`Harmony +${HARMONY_BONUS}`); break; }
  }
  if (cards.length === 1 && cards[0].suit === 'star') {
    power += LONE_STAR_BONUS; notes.push(`Lone Star +${LONE_STAR_BONUS}`);
  }
  const mine = dominantSuit(cards);
  const theirs = dominantSuit(enemyCards);
  if (mine && theirs && BEATS[mine] === theirs) {
    power += SUIT_EDGE_BONUS; notes.push(`Suit edge +${SUIT_EDGE_BONUS}`);
  }
  return { power, notes };
}

export function resolveLanes(game) {
  const results = [];
  for (const lane of game.lanes) {
    const you = lanePower(lane.you, lane.foe);
    const foe = lanePower(lane.foe, lane.you);
    let winner = null; let damage = 0;
    if (you.power > foe.power) { winner = 'you'; damage = Math.max(1, you.power - foe.power); }
    else if (foe.power > you.power) { winner = 'foe'; damage = Math.max(1, foe.power - you.power); }
    results.push({ laneId: lane.id, laneName: lane.name, you, foe, winner, damage });
    if (winner === 'you') {
      game.foe.life -= damage;
      game.you.score += damage + LANE_WIN_SCORE;
      game.you.lanesWon += 1; game.you.damageDealt += damage;
      pushLog(game, `You take ${lane.name} ${you.power}–${foe.power} — Rook loses ${damage} life.`);
    } else if (winner === 'foe') {
      game.you.life -= damage;
      game.foe.score += damage + LANE_WIN_SCORE;
      game.foe.lanesWon += 1; game.foe.damageDealt += damage;
      pushLog(game, `Rook takes ${lane.name} ${foe.power}–${you.power} — you lose ${damage} life.`);
    } else {
      pushLog(game, `${lane.name} is a draw (${you.power}–${foe.power}). No damage.`);
    }
    game.you.discard.push(...lane.you.splice(0));
    game.foe.discard.push(...lane.foe.splice(0));
  }
  game.lastResolution = results;
  return results;
}

export function checkEnd(game) {
  if (game.you.life <= 0 && game.foe.life <= 0) {
    game.winner = game.you.score >= game.foe.score ? 'you' : 'foe';
  } else if (game.foe.life <= 0) {
    game.winner = 'you';
  } else if (game.you.life <= 0) {
    game.winner = 'foe';
  } else {
    return false;
  }
  game.phase = game.winner === 'you' ? 'won' : 'lost';
  pushLog(game, game.winner === 'you'
    ? 'The Court is yours. Rook bows.'
    : 'Rook takes the Court. The candles gutter out.');
  return true;
}

export function startNextTurn(game) {
  game.turn += 1;
  game.manaMax = manaForTurn(game.turn);
  game.mana = game.manaMax;
  drawCard(game, game.you);
  drawCard(game, game.foe);
  game.foeIntent = null;
  game.phase = 'play';
  pushLog(game, `Turn ${game.turn} — mana refills to ${game.mana}. Draw a card.`);
}

export function pushLog(game, text) {
  game.log.unshift(text);
  game.log = game.log.slice(0, 6);
}
