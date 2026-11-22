/* Ember Court — the opponent. One job: Rook's readable strategy. */
import { BEATS } from './config.js';
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

/**
 * Rook's turn: for each lane, in order of threat, spend mana on the cheapest
 * card that flips the lane, preferring a suit that beats the player's dominant
 * suit there. She keeps one mana in reserve when she already leads two lanes.
 */
export function takeFoeTurn(game) {
  const foe = game.foe;
  let mana = Math.min(game.turn + 1, 6);
  const played = [];
  const lanesByThreat = [...game.lanes].sort((a, b) => {
    const pa = lanePower(a.you, a.foe).power - lanePower(a.foe, a.you).power;
    const pb = lanePower(b.you, b.foe).power - lanePower(b.foe, b.you).power;
    return pb - pa;
  });
  for (const lane of lanesByThreat) {
    const leading = game.lanes.filter((l) => lanePower(l.foe, l.you).power > lanePower(l.you, l.foe).power).length;
    if (leading >= 2 && mana <= 1) break;
    const yourSuit = dominantSuitName(lane.you);
    const counterSuit = yourSuit ? Object.keys(BEATS).find((s) => BEATS[s] === yourSuit) : null;
    const candidates = foe.hand
      .filter((c) => c.cost <= mana)
      .sort((a, b) => {
        const aCounter = counterSuit && a.suit === counterSuit ? 0 : 1;
        const bCounter = counterSuit && b.suit === counterSuit ? 0 : 1;
        if (aCounter !== bCounter) return aCounter - bCounter;
        return (a.power / a.cost) - (b.power / b.cost) || a.cost - b.cost;
      });
    for (const card of candidates) {
      const before = lanePower(lane.foe, lane.you).power;
      const after = lanePower([...lane.foe, card], lane.you).power;
      const youNow = lanePower(lane.you, [...lane.foe, card]).power;
      if (after <= youNow && lane.you.length > 0) continue; // would still lose: save the card
      if (after === before && lane.foe.length > 0) continue; // adds nothing
      foe.hand.splice(foe.hand.indexOf(card), 1);
      lane.foe.push(card);
      mana -= card.cost;
      played.push({ card, laneId: lane.id });
      break;
    }
    if (mana <= 0) break;
  }
  return played;
}

function dominantSuitName(cards) {
  if (cards.length === 0) return null;
  const counts = {};
  for (const card of cards) counts[card.suit] = (counts[card.suit] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function suitName(suit) { return SUITS[suit].name; }
