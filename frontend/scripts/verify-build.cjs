#!/usr/bin/env node
/**
 * Post-build renderability guard (runs automatically via the `postbuild`
 * npm hook after `npm run build`).
 *
 * WHY: 2026-06-30 prod outage — alaweal.org served HTTP 200 but rendered a
 * BLANK page for every visitor. `src/index.js` defined `async bootstrap()`
 * (createRoot().render() + import('./App')) but never CALLED it, so Rollup
 * tree-shook the entire app and emitted a near-empty build (7 JS chunks vs a
 * healthy ~950). The deploy's HTTP smoke passed because `/` still returns 200
 * with a valid (but empty) index.html. Nothing caught it until users did.
 *
 * WHAT: refuse to finish a build that cannot possibly render the app:
 *   - dist/index.html + dist/assets exist
 *   - index.html has a #root mount node and references a real entry chunk
 *   - the build emitted a sane number of JS chunks (a tree-shaken-app build
 *     collapses to <10; healthy is ~950 — we fail well below the floor)
 *
 * EFFECT: `npm run build` exits non-zero on a blank build → CI's build-frontend
 * job fails → the deploy step (which only ships dist/ when the build succeeds)
 * keeps the last-good frontend live instead of publishing a blank page.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const ASSETS = path.join(DIST, 'assets');
const INDEX_HTML = path.join(DIST, 'index.html');

// Healthy production build emits ~950 JS chunks; the tree-shaken-app failure
// mode emits ~7. 50 is a deliberately conservative floor with huge margin.
const MIN_JS_CHUNKS = 50;

function fail(msg) {
  console.error(`\n[verify-build] ❌ ${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(INDEX_HTML)) {
  fail('dist/index.html missing — the build produced no entry HTML.');
}
if (!fs.existsSync(ASSETS) || !fs.statSync(ASSETS).isDirectory()) {
  fail('dist/assets missing — the build produced no asset chunks.');
}

const jsChunks = fs
  .readdirSync(ASSETS)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.map'));

if (jsChunks.length < MIN_JS_CHUNKS) {
  fail(
    `only ${jsChunks.length} JS chunk(s) emitted (expected ≥ ${MIN_JS_CHUNKS}).\n` +
      '   This almost always means the app was tree-shaken out of the build —\n' +
      "   e.g. src/index.js defines bootstrap() but never calls it, so\n" +
      "   createRoot().render() and import('./App') are dropped and the site\n" +
      '   renders a blank page. Refusing to ship a blank build.'
  );
}

const html = fs.readFileSync(INDEX_HTML, 'utf8');

if (!/<div id="root">/.test(html)) {
  fail('dist/index.html has no <div id="root"> mount node — React cannot mount.');
}

const entryMatch = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
if (!entryMatch) {
  fail('dist/index.html references no /assets/index-*.js entry chunk.');
}
const entryFile = entryMatch[1];
if (!fs.existsSync(path.join(ASSETS, entryFile))) {
  fail(`entry chunk referenced by index.html is missing on disk: assets/${entryFile}`);
}

console.log(
  `[verify-build] ✓ ${jsChunks.length} JS chunks, entry assets/${entryFile}, ` +
    '#root present — build is renderable.'
);
