/* Ember Court — tiny WebAudio synth. One job: sounds, no audio files. */
let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, dur, type = 'triangle', gain = 0.08, when = 0) {
  if (muted) return;
  try {
    const ac = audioCtx();
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type; osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ac.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur);
  } catch (err) { /* audio is decoration; never break the game */ }
}

export function playCardSound() { blip(520, 0.12); blip(780, 0.1, 'triangle', 0.06, 0.05); }
export function dealSound() { blip(340, 0.08, 'sine', 0.05); }
export function winLaneSound() { blip(660, 0.12); blip(880, 0.14, 'triangle', 0.07, 0.08); }
export function loseLaneSound() { blip(220, 0.18, 'sawtooth', 0.04); }
export function winGameSound() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.08, i * 0.12)); }
export function loseGameSound() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.04, i * 0.14)); }
export function errorSound() { blip(140, 0.12, 'square', 0.04); }
