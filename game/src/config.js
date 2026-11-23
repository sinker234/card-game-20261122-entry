/* Ember Court — configuration: suits, lanes, deck, tuning. One job: constants. */

export const START_LIFE = 30; // 30, not 20: at 20 the duel ended in ~5 turns
// (300-game sim: 72% over by turn 5, greedy player 35% wins) — too few
// decisions per game. At 30 it averages ~8 turns and only 7% end by turn 5.
export const MAX_HAND = 7;
export const START_HAND = 4;
export const MAX_MANA = 6;
export const HARMONY_BONUS = 2;   // two or more cards of one suit in a lane
export const LONE_STAR_BONUS = 1;  // a single Star card alone in a lane
export const SUIT_EDGE_BONUS = 2;  // your suit beats their dominant suit
export const LANE_WIN_SCORE = 2;   // score per lane won

// Suits are told apart by colour AND shape AND name, never by text alone.
export const SUITS = {
  ember: { name: 'Ember', glyph: '▲', color: '#e5484d', dark: '#8f1d22', bg: '#3a1214' },
  tide:  { name: 'Tide',  glyph: '●', color: '#3e9bff', dark: '#144a7d', bg: '#0e2237' },
  leaf:  { name: 'Leaf',  glyph: '◆', color: '#46a758', dark: '#1d5c2e', bg: '#12291a' },
  star:  { name: 'Star',  glyph: '★', color: '#f5b83d', dark: '#8a5f08', bg: '#33270a' },
};

// Ember burns Leaf, Leaf drinks Tide, Tide drowns Ember. Star stands apart.
export const BEATS = { ember: 'leaf', leaf: 'tide', tide: 'ember', star: null };

export const LANES = [
  { id: 'court',  name: 'The Court',  blurb: 'Where titles are won' },
  { id: 'garden', name: 'The Garden', blurb: 'Where roots run deep' },
  { id: 'vault',  name: 'The Vault',  blurb: 'Where fortunes sleep' },
];

// [cost, power, name] per suit — ten cards each, 40 in a deck.
export const DECK_SPEC = [
  [1, 2, 'Spark'], [1, 3, 'Kindle'], [1, 1, 'Cinder'], [2, 3, 'Flare'],
  [2, 4, 'Bonfire'], [2, 5, 'Wildfire'], [3, 5, 'Inferno'], [3, 6, 'Phoenix'],
  [2, 2, 'Emberling'], [3, 4, 'Magma'],
];

export const SUIT_NAMES = {
  ember: ['Spark Imp', 'Kindle Sprite', 'Cinder Wisp', 'Flare Knight', 'Bonfire Guard',
          'Wildfire Stag', 'Inferno Drake', 'Phoenix Heir', 'Emberling', 'Magma Golem'],
  tide: ['Ripple Imp', 'Brook Sprite', 'Dew Wisp', 'Wave Knight', 'Tide Guard',
         'Current Stag', 'Maelstrom Drake', 'Leviathan Heir', 'Droplet', 'Abyss Golem'],
  leaf: ['Sprout Imp', 'Seed Sprite', 'Pollen Wisp', 'Thorn Knight', 'Grove Guard',
         'Canopy Stag', 'Overgrowth Drake', 'Ancient Heir', 'Acornling', 'Root Golem'],
  star: ['Glimmer Imp', 'Comet Sprite', 'Dust Wisp', 'Nova Knight', 'Orbit Guard',
         'Meteor Stag', 'Supernova Drake', 'Crown Heir', 'Starling', 'Zenith Golem'],
};

export function manaForTurn(turn) {
  return Math.min(turn + 1, MAX_MANA);
}
