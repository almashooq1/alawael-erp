#!/usr/bin/env node
/**
 * Prune orphaned hashed assets from a Vite build/ dir.
 *
 * WHY: the Hostinger frontend deploy uses `rsync --delete`, but the VPS-SSH
 * step flakes (memory: GitHub->Hostinger:22 SYN-drop), so the file TRANSFER
 * lands new hashed chunks while the --delete phase sometimes never completes.
 * Old chunks accumulate (observed: 91 index-*.js + 3 AuthenticatedShell-*.js,
 * 184 MB) and can serve stale app shells (the W1572-adjacent student-management
 * "404" was a stale cached shell).
 *
 * mtime-based pruning is UNSAFE: rsync -a preserves source mtimes, so an
 * unchanged-but-still-referenced chunk keeps an old date. Instead we compute
 * the reachable closure from index.html (+ html/sw/manifest roots) and delete
 * only assets NOTHING reachable references. Over-approximate (any asset whose
 * exact filename appears as a token in a reachable file is KEPT), so a
 * referenced chunk can never be deleted.
 *
 * Usage:
 *   node prune-build-orphans.mjs <buildDir> [--delete]
 *   (default = dry-run: report only)
 */
import { readFileSync, readdirSync, statSync, rmSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = process.argv[2];
const doDelete = process.argv.includes('--delete');
const qIdx = process.argv.indexOf('--quarantine');
const quarantineDir = qIdx !== -1 ? process.argv[qIdx + 1] : null;
if (!buildDir || !existsSync(buildDir)) {
  console.error('usage: node prune-build-orphans.mjs <buildDir> [--delete]  (buildDir missing)');
  process.exit(2);
}
const assetsDir = join(buildDir, 'assets');
if (!existsSync(assetsDir)) {
  console.error('no assets/ dir under ' + buildDir + ' — nothing to prune');
  process.exit(0);
}

// All hashed asset filenames actually present.
const allAssets = readdirSync(assetsDir).filter((f) => statSync(join(assetsDir, f)).isFile());
const assetSet = new Set(allAssets);

// Token regex: a Vite hashed asset filename like `Name-HASH.ext`.
const TOKEN = /[A-Za-z0-9_$.]+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|webp|ico|json|map|mjs)/g;

function tokensIn(text) {
  const out = [];
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) out.push(m[0]);
  return out;
}

// Roots = every top-level entry that a browser/SW can load directly.
const rootFiles = readdirSync(buildDir).filter((f) => {
  const p = join(buildDir, f);
  return statSync(p).isFile() && /\.(html|js|json|webmanifest)$/.test(f);
});

const reachable = new Set();
const queue = [];
function seedFrom(text) {
  for (const t of tokensIn(text)) {
    if (assetSet.has(t) && !reachable.has(t)) { reachable.add(t); queue.push(t); }
  }
}
for (const rf of rootFiles) seedFrom(readFileSync(join(buildDir, rf), 'utf8'));

// BFS through chunk cross-references (only text assets can reference others).
while (queue.length) {
  const f = queue.pop();
  if (!/\.(js|css|mjs)$/.test(f)) continue;
  let content = '';
  try { content = readFileSync(join(assetsDir, f), 'utf8'); } catch { continue; }
  seedFrom(content);
}

const orphans = allAssets.filter((f) => !reachable.has(f));
let orphanBytes = 0;
for (const f of orphans) { try { orphanBytes += statSync(join(assetsDir, f)).size; } catch {} }

console.log(`assets total:     ${allAssets.length}`);
console.log(`reachable (keep): ${reachable.size}`);
console.log(`orphans:          ${orphans.length}  (${(orphanBytes / 1048576).toFixed(1)} MB)`);

// Safety rail: if the closure is implausibly small, refuse to delete (bug guard).
if (reachable.size < 10) {
  console.error('SAFETY ABORT: reachable set < 10 — closure computation looks broken; not deleting.');
  process.exit(3);
}

if (quarantineDir) {
  mkdirSync(quarantineDir, { recursive: true });
  let n = 0;
  for (const f of orphans) { try { renameSync(join(assetsDir, f), join(quarantineDir, f)); n++; } catch {} }
  console.log(`quarantined ${n} orphan asset(s) -> ${quarantineDir} (reversible: mv back to restore).`);
} else if (doDelete) {
  let n = 0;
  for (const f of orphans) { try { rmSync(join(assetsDir, f)); n++; } catch {} }
  console.log(`deleted ${n} orphan asset(s).`);
} else {
  console.log('(dry-run — pass --delete to remove; sample orphans:)');
  console.log('  ' + orphans.slice(0, 8).join('\n  '));
}
