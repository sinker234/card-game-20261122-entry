/* Ember Court — rendering. One job: turn game state into DOM. */
import { START_LIFE, SUITS } from './config.js';
import { lanePower } from './state.js';

const $ = (id) => document.getElementById(id);

export function cardElement(card, opts = {}) {
  const suit = SUITS[card.suit];
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}${opts.small ? ' small' : ''}${opts.faceDown ? ' face-down' : ''}${opts.selected ? ' selected' : ''}${opts.justPlayed ? ' just-played' : ''}`;
  el.dataset.uid = card.uid;
  if (opts.faceDown) {
    el.innerHTML = '<div class="card-back">★</div>';
    return el;
  }
  el.innerHTML = `
    <div class="card-cost">${'●'.repeat(card.cost)}</div>
    <div class="card-glyph" style="color:${suit.color}">${suit.glyph}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-suit">${suit.name}</div>
    <div class="card-power">${card.power}</div>`;
  el.title = `${card.name} — ${suit.name}, cost ${card.cost}, power ${card.power}`;
  return el;
}

export function render(game, ui) {
  $('turn-label').textContent = `Turn ${game.turn}`;
  $('mana-label').textContent = `Mana ${game.mana}/${game.manaMax} ●`;
  $('score-label').textContent = `Score ${game.you.score} · Rook ${game.foe.score}`;
  $('you-life-text').textContent = `${Math.max(0, game.you.life)} HP`;
  $('foe-life-text').textContent = `${Math.max(0, game.foe.life)} HP`;
  $('you-life-fill').style.width = `${Math.max(0, game.you.life) / START_LIFE * 100}%`;
  $('foe-life-fill').style.width = `${Math.max(0, game.foe.life) / START_LIFE * 100}%`;
  $('foe-hand-label').textContent = `Hand: ${game.foe.hand.length} cards`;
  $('deck-label').textContent = `Deck: ${game.you.deck.length} cards · Discard: ${game.you.discard.length}`;
  $('foe-intent').textContent = game.foeIntent
    ? `Rook is eyeing ${laneName(game, game.foeIntent)} — counter her there!`
    : 'Rook is studying the table…';
  $('battle-log').innerHTML = game.log.map((line) => `<div>• ${escapeHtml(line)}</div>`).join('');
  $('end-turn-btn').disabled = game.phase !== 'play';
  renderLanes(game, ui);
  renderHand(game, ui);
  renderOverlay(game, ui);
  // A just-played card lands once, on the first render after the play.
  ui.lastPlayed = null;
}

function laneName(game, laneId) {
  const lane = game.lanes.find((l) => l.id === laneId);
  return lane ? lane.name : laneId;
}

function renderLanes(game, ui) {
  const lanesEl = $('lanes');
  lanesEl.innerHTML = '';
  for (const lane of game.lanes) {
    const you = lanePower(lane.you, lane.foe);
    const foe = lanePower(lane.foe, lane.you);
    const col = document.createElement('section');
    col.dataset.lane = lane.id;
    const winnerMark = game.lastResolution
      ? (game.lastResolution.find((r) => r.laneId === lane.id)?.winner ?? null) : null;
    col.className = `lane${ui.selectedLane === lane.id ? ' lane-target' : ''}${game.foeIntent === lane.id ? ' lane-threat' : ''}${winnerMark === 'you' ? ' lane-won-you' : winnerMark === 'foe' ? ' lane-won-foe' : ''}`;
    col.innerHTML = `
      <div class="lane-head">
        <div class="lane-name">${lane.name}</div>
        <div class="lane-blurb">${lane.blurb}</div>
        <div class="lane-score foe-score">${foe.power}<span class="lane-notes">${foe.notes.join(' ')}</span></div>
        <div class="lane-vs">${winnerMark === 'you' ? '★ YOU' : winnerMark === 'foe' ? '★ ROOK' : '— vs —'}</div>
        <div class="lane-score you-score">${you.power}<span class="lane-notes">${you.notes.join(' ')}</span></div>
      </div>
      <div class="lane-cards foe-cards"></div>
      <div class="lane-divider"></div>
      <div class="lane-cards you-cards"></div>`;
    const foeBox = col.querySelector('.foe-cards');
    const youBox = col.querySelector('.you-cards');
    const justPlayed = ui.lastPlayed?.uid;
    for (const card of lane.foe) foeBox.appendChild(cardElement(card, { small: true, justPlayed: card.uid === justPlayed }));
    for (const card of lane.you) youBox.appendChild(cardElement(card, { small: true, justPlayed: card.uid === justPlayed }));
    if (lane.foe.length === 0) foeBox.innerHTML = '<div class="lane-empty">Rook has nothing here</div>';
    if (lane.you.length === 0) youBox.innerHTML = '<div class="lane-empty">Play a card here</div>';
    lanesEl.appendChild(col);
  }
}

function renderHand(game, ui) {
  const handEl = $('hand');
  handEl.innerHTML = '';
  game.you.hand.forEach((card, index) => {
    const el = cardElement(card, { selected: ui.selectedCard === card.uid });
    el.dataset.index = index;
    if (card.cost > game.mana) el.classList.add('unaffordable');
    handEl.appendChild(el);
  });
  if (game.you.hand.length === 0) handEl.innerHTML = '<div class="lane-empty">Hand empty — draw next turn.</div>';
}

function renderOverlay(game, ui) {
  const overlay = $('overlay');
  if (ui.showHelp) {
    overlay.className = '';
    overlay.innerHTML = `
      <div class="panel help-panel">
        <h1>How to Play</h1>
        <p>Each turn you gain mana and draw a card. Click a card, then click a lane to play it.
        When you are done, press <b>End Turn</b> — Rook plays, then every lane resolves.</p>
        <p><b>Lane power</b> = card powers + Harmony (+2 for two of a suit) + Lone Star (+1) + Suit edge (+2 when your suit beats hers).</p>
        <p><b>Suit cycle:</b> Ember ▲ burns Leaf ◆ · Leaf ◆ drinks Tide ● · Tide ● drowns Ember ▲ · Star ★ stands apart.</p>
        <p><b>Win:</b> bring Rook to 0 life. <b>Score:</b> damage dealt + 2 per lane won.</p>
        <button id="close-help-btn" type="button" class="big-btn">Back to the Table</button>
      </div>`;
    $('close-help-btn').addEventListener('click', () => ui.onCloseHelp());
    return;
  }
  if (game.phase === 'title') {
    overlay.className = '';
    overlay.innerHTML = `
      <div class="panel title-panel">
        <div class="title-flame">▲ ● ◆ ★</div>
        <h1>EMBER COURT</h1>
        <p class="tagline">A lane-battle card duel against Rook, the Clockwork Duchess.</p>
        <p class="rules">Three lanes. One hand. Outplay her suit for suit.<br>
        Play cards into lanes — higher power takes the lane and deals the difference as damage.<br>
        Same suit twice in a lane: <b>Harmony +2</b>. A lone Star: <b>+1</b>. Beat her suit: <b>+2</b>.<br>
        Ember burns Leaf · Leaf drinks Tide · Tide drowns Ember.<br>
        First to 0 life loses. 30 life each. Good luck, Envoy.</p>
        <button id="start-btn" type="button" class="big-btn">Take Your Seat ▶</button>
        <p class="keys-hint">Mouse or keyboard: ← → pick a card · ↑ ↓ pick a lane · Enter play · E end turn</p>
      </div>`;
    $('start-btn').addEventListener('click', () => ui.onStart());
    return;
  }
  if (game.phase === 'won' || game.phase === 'lost') {
    const won = game.phase === 'won';
    overlay.className = '';
    overlay.innerHTML = `
      <div class="panel ${won ? 'win-panel' : 'loss-panel'}">
        <div class="end-glyph">${won ? '★' : '✕'}</div>
        <h1>${won ? 'VICTORY!' : 'DEFEAT'}</h1>
        <p class="tagline">${won
          ? 'The Court is yours. Rook bows, and the candles burn gold.'
          : 'Rook takes the Court. The candles gutter out — but the table is still warm.'}</p>
        <div class="final-stats">
          <div><span class="stat-num">${game.you.life > 0 ? game.you.life : 0}</span><span class="stat-label">Your life</span></div>
          <div><span class="stat-num">${game.foe.life > 0 ? game.foe.life : 0}</span><span class="stat-label">Rook's life</span></div>
          <div><span class="stat-num">${game.you.score}</span><span class="stat-label">Your score</span></div>
          <div><span class="stat-num">${game.you.lanesWon}</span><span class="stat-label">Lanes won</span></div>
          <div><span class="stat-num">${game.turn}</span><span class="stat-label">Turns</span></div>
        </div>
        <button id="again-btn" type="button" class="big-btn">${won ? 'Play Again ▶' : 'Demand a Rematch ▶'}</button>
      </div>`;
    $('again-btn').addEventListener('click', () => ui.onRestart());
    return;
  }
  overlay.className = 'hidden';
  overlay.innerHTML = '';
}

export function showToast(text) {
  const toast = $('toast');
  toast.textContent = text;
  toast.className = '';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.className = 'hidden'; }, 2200);
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
