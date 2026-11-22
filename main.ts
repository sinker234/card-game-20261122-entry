// Ember Court — the hand-in program (Node 22, standard library only).
//
// It stages the entry for the grader: the static game under game/ and the
// screenshots under screenshots/ are copied into the output directory, and
// dossier.json is written there with the vendored make.fun library so the
// judge can read the game. Run it twice and the bytes must match.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps for this bounty: game/ stays under 993 entries and
// 48 MiB, screenshots under 4 files of 256 KiB each, and the dossier text
// under 160 KiB. Enforcing the same limits here keeps a local run honest.
const dossierLimits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function stageGameFiles() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  const shotsOut = join(outputDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, 'screenshots');
  if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });
}

function writeDossier() {
  const dossier = buildDossier(outputDir, dossierLimits);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

stageGameFiles();
writeDossier();
