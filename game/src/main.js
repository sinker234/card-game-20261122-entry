/* Ember Court — bootstrap. One job: wire state, AI, render and input together. */
import { createGame, playCard, resolveLanes, checkEnd, startNextTurn, pushLog } from './state.js';
import { chooseIntent, takeFoeTurn } from './ai.js';
import { render, showToast } from './render.js';
import { bindInput } from './input.js';
import * as sounds from './audio.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 20261122);
const shot = params.get('shot');

let game = createGame(seed);
if (shot) applyShot(game, shot);

const ui = {
  selectedCard: null,
  selectedLane: 'court',
  showHelp: false,
  lastPlayed: null, // { uid } of the card that just landed — render animates it once
  prevYouLife: null,
  prevFoeLife: null,
  seenGame: null,
  onStart() {
    game.phase = 'play';
    chooseIntent(game);
    pushLog(game, 'The duel begins. Rook eyes a lane — read her, and counter.');
    sounds.dealSound();
    draw();
  },
  onRestart() {
    game = createGame((seed + game.turn * 31 + Date.now()) % 2147483647);
    window.__game = game;
    ui.selectedCard = null;
    ui.selectedLane = 'court';
    ui.showHelp = false;
    game.phase = 'play';
    chooseIntent(game);
    pushLog(game, 'A fresh duel. Rook shuffles, smiling.');
    sounds.dealSound();
    draw();
  },
  onCloseHelp() { ui.showHelp = false; draw(); },
  onPlayCard(cardUid, laneId) {
    const result = playCard(game, cardUid, laneId);
    if (!result.ok) showToast(result.reason);
    else ui.lastPlayed = { uid: cardUid };
    return result;
  },
  onEndTurn() {
    if (game.phase !== 'play') return;
    game.phase = 'resolving';
    draw();
    chooseIntent(game);
    const played = takeFoeTurn(game);
    if (played.length > 0) ui.lastPlayed = { uid: played[played.length - 1].card.uid };
    for (const { card, laneId } of played) {
      const lane = game.lanes.find((l) => l.id === laneId);
      pushLog(game, `Rook plays ${card.name} (${card.power}) to ${lane.name}.`);
    }
    setTimeout(() => {
      const results = resolveLanes(game);
      const youWonLane = results.some((r) => r.winner === 'you');
      if (youWonLane) sounds.winLaneSound(); else sounds.loseLaneSound();
      if (checkEnd(game)) {
        if (game.phase === 'won') sounds.winGameSound(); else sounds.loseGameSound();
        draw();
        return;
      }
      startNextTurn(game);
      chooseIntent(game);
      draw();
    }, 650);
  },
};

function draw() {
  render(game, ui);
  // Damage flash: the life bars are static DOM, so a class here survives
  // re-renders; a fresh game resets the baseline without flashing.
  if (ui.seenGame !== game) {
    ui.seenGame = game;
    ui.prevYouLife = game.you.life;
    ui.prevFoeLife = game.foe.life;
    return;
  }
  flashIfHurt('you', game.you.life, ui.prevYouLife);
  flashIfHurt('foe', game.foe.life, ui.prevFoeLife);
  ui.prevYouLife = game.you.life;
  ui.prevFoeLife = game.foe.life;
}

function flashIfHurt(side, life, prevLife) {
  if (prevLife == null || life >= prevLife) return;
  const bar = document.querySelector(side === 'you' ? '#player-row .life-bar' : '#foe-row .life-bar');
  if (!bar) return;
  bar.classList.remove('hit');
  void bar.offsetWidth; // restart the animation
  bar.classList.add('hit');
  setTimeout(() => bar.classList.remove('hit'), 600);
}

// Expose the live game for play-testing and debugging in the browser console.
window.__game = game;
window.__ui = ui;

bindInput(game, ui, draw, sounds);
draw();
