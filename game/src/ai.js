/* Ember Court — the opponent. One job: Rook's readable strategy. */
import { lanePower } from './state.js';
import { SUITS } from './config.js';

/** Rook telegraphs one lane she will fight for, so her plan can be read and countered. */
export function chooseIntent(game) {
  let bestLane = game.lanes[0]; let bestThreat = -1;
  for (const lane of game.lanes) {
    const you = lanePower(lane.you, lane.foe);
    if (you.power > bestThreat) { bestThreat = you.power; bestLane = lane; }
  }
  game.foeIntent = bestLane.id;
  return bestLane.id;
}

function laneWinner(youCards, foeCards) {
  const you = lanePower(youCards, foeCards).power;
  const foe = lanePower(foeCards, youCards).power;
  if (foe > you) return 'foe';
  if (you > foe) return 'you';
  return null;
}

/** Net life swing of a lane from Rook's side: damage she deals minus damage she takes. */
function laneNet(youCards, foeCards) {
  const you = lanePower(youCards, foeCards).power;
  const foe = lanePower(foeCards, youCards).power;
  if (foe > you) return foe - you;
  if (you > foe) return -(you - foe);
  return 0;
}

/**
 * Value of Rook playing `card` into `lane`: the change in this turn's life
 * swing, plus a bonus for flipping a lane. Harmony (+2) and suit edge (+2)
 * already live inside lanePower, so finishing a pair or countering a suit is
 * priced in automatically — she now plays for combos, not just raw power.
 */
function playValue(lane, card) {
  const before = laneNet(lane.you, lane.foe);
  const after = laneNet(lane.you, [...lane.foe, card]);
  let value = after - before;
  if (laneWinner(lane.you, lane.foe) === 'you' && laneWinner(lane.you, [...lane.foe, card]) === 'foe') {
    value += 2; // flipping a lane also denies the player its score
  }
  return { value, stillLosing: laneWinner(lane.you, [...lane.foe, card]) === 'you' };
}

/**
 * Rook's turn: one card per lane at most, each the best-value play for the
 * mana — she finishes Harmony pairs, counters suits, and banks damage in an
 * empty lane, but never spends a card on a lane she still loses: with the
 * player committing first and Rook answering with perfect information, a
 * Rook who could stack two cards into one lane won 75% of games against a
 * value-playing bot (simulated), which is no duel at all. She keeps one mana
 * in reserve when she already leads two lanes.
 */
export function takeFoeTurn(game) {
  const foe = game.foe;
  let mana = Math.min(game.turn + 1, 6);
  const played = [];
  const usedLanes = new Set();
  for (;;) {
    const leading = game.lanes.filter((l) => lanePower(l.foe, l.you).power > lanePower(l.you, l.foe).power).length;
    if (leading >= 2 && mana <= 1) break; // keep a mana in reserve while ahead
    let best = null;
    for (const card of foe.hand) {
      if (card.cost > mana) continue;
      for (const lane of game.lanes) {
        if (usedLanes.has(lane.id)) continue; // one card per lane a turn
        const { value, stillLosing } = playValue(lane, card);
        if (stillLosing) continue; // save the card: it wins no lane this turn
        const score = value - card.cost * 0.25; // small price for spending a card
        if (score <= 0) continue;
        if (!best || score > best.score) best = { score, card, lane };
      }
    }
    if (!best) break;
    foe.hand.splice(foe.hand.indexOf(best.card), 1);
    best.lane.foe.push(best.card);
    usedLanes.add(best.lane.id);
    mana -= best.card.cost;
    played.push({ card: best.card, laneId: best.lane.id });
  }
  return played;
}

export function suitName(suit) { return SUITS[suit].name; }
