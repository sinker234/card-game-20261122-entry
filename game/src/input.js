/* Ember Court — input. One job: mouse and keyboard controls. */

export function bindInput(game, ui, render, sounds) {
  const handEl = document.getElementById('hand');
  const lanesEl = document.getElementById('lanes');

  handEl.addEventListener('click', (event) => {
    const cardEl = event.target.closest('.card');
    if (!cardEl) return;
    const uid = Number(cardEl.dataset.uid);
    const card = game.you.hand.find((c) => c.uid === uid);
    if (!card) return;
    if (ui.selectedCard === uid) { ui.selectedCard = null; }
    else {
      ui.selectedCard = uid;
      ui.selectedLane = ui.selectedLane || 'court';
      sounds.dealSound();
    }
    render();
  });

  lanesEl.addEventListener('click', (event) => {
    const laneEl = event.target.closest('.lane');
    if (!laneEl) return;
    const laneId = laneEl.dataset.lane;
    ui.selectedLane = laneId;
    if (ui.selectedCard != null) {
      const result = ui.onPlayCard(ui.selectedCard, laneId);
      if (result.ok) { ui.selectedCard = null; sounds.playCardSound(); }
      else { sounds.errorSound(); }
      render();
      return;
    }
    render();
  });

  document.getElementById('end-turn-btn').addEventListener('click', () => {
    if (game.phase === 'play') ui.onEndTurn();
  });
  document.getElementById('help-btn').addEventListener('click', () => { ui.showHelp = true; render(); });
  document.getElementById('mute-btn').addEventListener('click', () => {
    const muted = sounds.toggleMute();
    document.getElementById('mute-btn').textContent = muted ? '✕' : '♪';
    render();
  });

  document.addEventListener('keydown', (event) => {
    if (game.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); ui.onStart(); return;
    }
    if ((game.phase === 'won' || game.phase === 'lost') && event.key.toLowerCase() === 'r') {
      ui.onRestart(); return;
    }
    if (event.key.toLowerCase() === 'h') { ui.showHelp = !ui.showHelp; render(); return; }
    if (event.key.toLowerCase() === 'm') {
      const muted = sounds.toggleMute();
      document.getElementById('mute-btn').textContent = muted ? '✕' : '♪';
      return;
    }
    if (game.phase !== 'play') return;
    const hand = game.you.hand;
    let index = hand.findIndex((c) => c.uid === ui.selectedCard);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (hand.length === 0) return;
      index = index < 0 ? 0 : index + (event.key === 'ArrowRight' ? 1 : -1);
      index = (index + hand.length) % hand.length;
      ui.selectedCard = hand[index].uid;
      render();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const lanes = game.lanes.map((l) => l.id);
      let li = lanes.indexOf(ui.selectedLane || 'court');
      li = (li + (event.key === 'ArrowDown' ? 1 : -1) + lanes.length) % lanes.length;
      ui.selectedLane = lanes[li];
      render();
    } else if (event.key === 'Enter' && ui.selectedCard != null && ui.selectedLane) {
      event.preventDefault();
      const result = ui.onPlayCard(ui.selectedCard, ui.selectedLane);
      if (result.ok) { ui.selectedCard = null; sounds.playCardSound(); }
      else { sounds.errorSound(); }
      render();
    } else if (event.key.toLowerCase() === 'e') {
      ui.onEndTurn();
    } else if (event.key.toLowerCase() === 'r') {
      ui.onRestart();
    } else if (/^[1-7]$/.test(event.key)) {
      const i = Number(event.key) - 1;
      if (hand[i]) { ui.selectedCard = hand[i].uid; ui.selectedLane = ui.selectedLane || 'court'; render(); }
    }
  });
}
