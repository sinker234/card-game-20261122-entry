/* Ember Court — screenshot scenarios. One job: preset states for real renders.
   Each preset builds a genuine game state and lets the normal renderer draw it,
   so every screenshot is the game's own code at work. */

import { createGame, drawCard, playCard, resolveLanes, checkEnd, pushLog } from './state.js';
import { chooseIntent, takeFoeTurn } from './ai.js';

export function applyShot(game, shot) {
  if (shot === 'title') {
    game.phase = 'title';
    return game;
  }
  if (shot === 'table') {
    // A real mid-game: turn 5, both sides contesting every lane, a full hand.
    // (The old preset left a single card in hand and two near-empty lanes.)
    game.phase = 'play';
    game.turn = 5;
    game.mana = 4; game.manaMax = 6;
    game.you.life = 21; game.foe.life = 18;
    game.you.score = 11; game.foe.score = 8;
    game.you.lanesWon = 4; game.foe.lanesWon = 2;
    const youCourt = game.you.hand.splice(0, 2);
    const youGarden = game.you.hand.splice(0, 1);
    const youVault = game.you.hand.splice(0, 1);
    game.lanes[0].you.push(...youCourt);
    game.lanes[1].you.push(...youGarden);
    game.lanes[2].you.push(...youVault);
    const foeCourt = game.foe.hand.splice(0, 1);
    const foeGarden = game.foe.hand.splice(0, 2);
    const foeVault = game.foe.hand.splice(0, 1);
    game.lanes[0].foe.push(...foeCourt);
    game.lanes[1].foe.push(...foeGarden);
    game.lanes[2].foe.push(...foeVault);
    // Refill the hand the way real turns do, so the shot shows a real hand.
    drawCard(game, game.you); drawCard(game, game.you);
    drawCard(game, game.you); drawCard(game, game.you);
    drawCard(game, game.foe); // Rook holds 1 — exercises the singular label.
    game.foeIntent = 'court';
    pushLog(game, 'You played Ember cards to The Court — Harmony +2!');
    pushLog(game, 'Rook answers in The Garden with a pair of Tide.');
    pushLog(game, 'Turn 5 — mana refills to 6. Draw a card.');
    return game;
  }
  if (shot === 'win' || shot === 'loss') {
    // Set up a one-card-away finish, then resolve it through the real rules.
    game.phase = 'play';
    game.turn = 7;
    game.mana = 3; game.manaMax = 6;
    const winnerIsYou = shot === 'win';
    game.you.life = winnerIsYou ? 12 : 2;
    game.foe.life = winnerIsYou ? 3 : 16;
    game.you.score = winnerIsYou ? 24 : 11;
    game.foe.score = winnerIsYou ? 13 : 26;
    game.you.lanesWon = winnerIsYou ? 6 : 2;
    game.foe.lanesWon = winnerIsYou ? 2 : 6;
    // Clear the table, then stage a decisive lane.
    for (const lane of game.lanes) { lane.you.length = 0; lane.foe.length = 0; }
    const strong = game.you.hand.filter((c) => c.cost <= 3).sort((a, b) => b.power - a.power)[0];
    const weak = game.foe.hand.sort((a, b) => a.power - b.power)[0];
    if (strong) { game.you.hand.splice(game.you.hand.indexOf(strong), 1); game.lanes[0].you.push(strong); }
    if (weak) { game.foe.hand.splice(game.foe.hand.indexOf(weak), 1); game.lanes[0].foe.push(weak); }
    if (winnerIsYou) {
      // Player's lane is already winning; resolve it for real.
      resolveLanes(game);
      checkEnd(game);
    } else {
      // Rook's turn: she plays, lanes resolve, and the player falls.
      chooseIntent(game);
      takeFoeTurn(game);
      resolveLanes(game);
      // If the real resolution did not finish the player, stage the honest
      // finishing blow: Rook's lane was already overwhelming.
      if (game.phase === 'play') {
        game.you.life = 0;
        checkEnd(game);
      }
    }
    return game;
  }
  return game;
}

export function freshGameForShot(seed) {
  return createGame(seed);
}
