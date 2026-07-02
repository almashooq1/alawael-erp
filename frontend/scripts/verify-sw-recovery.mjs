/**
 * verify-sw-recovery.mjs — on-demand E2E PROOF of the service-worker "404 on
 * most routes" bug and its kill-switch fix (W1582 → W1586 → W1596 → W1611).
 *
 * The stale-shell-404 class has been re-investigated across several sessions.
 * This script settles it empirically in a REAL headless Chrome, against a
 * self-contained local fixture (no network, no prod dependency):
 *
 *   phase 1  register an aggressive cache-first, root-scope ('/') service worker
 *            that precaches a v1 app-shell and serves it for every navigation
 *   phase 2  "deploy" v2 (which adds /new-route) but leave the aggressive SW →
 *            /new-route is served the STALE cached shell → the SPA renders 404
 *            (this is exactly the reported /rehab, /admin, … 404)
 *   phase 3  "deploy" the KILL-SWITCH SW (public/service-worker.js in this repo)
 *            → the browser unregisters it + purges caches + reloads → /new-route
 *            now loads fresh (recovered)
 *
 * It is NOT wired into CI (that would add flaky puppeteer infra with no gain
 * over the static drift guards service-worker-safety-wave1586.test.js +
 * service-worker-no-register-wave1611.test.js and the runtime health-check
 * `sw_guard` job). Run it by hand when you need the proof:
 *
 *   cd frontend
 *   npm i -D puppeteer-core            # uses your installed Chrome, no download
 *   node scripts/verify-sw-recovery.mjs
 *   # optionally: CHROME_PATH="/path/to/chrome" node scripts/verify-sw-recovery.mjs
 *
 * Exit 0 = all 4 assertions passed (bug reproduced AND fix recovers).
 */
import http from 'node:http';
import fs from 'node:fs';

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('puppeteer-core not installed. Run: cd frontend && npm i -D puppeteer-core');
  process.exit(2);
}
const chrome = findChrome();
if (!chrome) {
  console.error('No Chrome/Edge found. Set CHROME_PATH=/path/to/chrome and re-run.');
  process.exit(2);
}

const state = { sw: 'aggressive', shell: 'v1' };

const AGGRESSIVE_SW = `
const CACHE='v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/index.html'])).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.mode === 'navigate') e.respondWith(caches.match('/index.html').then(r => r || fetch(e.request))); });`;

// Mirror of frontend/public/service-worker.js (the shipped kill-switch).
const KILLSWITCH_SW = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil((async () => {
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  await self.clients.claim(); await self.registration.unregister();
  const wins = await self.clients.matchAll({ type:'window' });
  for (const c of wins) { try { c.navigate(c.url); } catch {} }
})()); });
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));`;

function shell(version) {
  const knowsNewRoute = version === 'v2' ? "|| p==='/new-route'" : '';
  const label = version === 'v2' ? "p==='/new-route' ? 'NEW ROUTE OK' :" : '';
  const register = version === 'v1' ? "if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');" : '';
  return `<!doctype html><html><head><title>${version}</title></head><body>
<div id="ver">${version}</div><div id="app"></div>
<script>
  var p = location.pathname;
  var known = (p==='/'||p==='/index.html'||p==='/known' ${knowsNewRoute});
  var el = document.createElement('h1'); el.id='result';
  el.textContent = ${label} known ? 'HOME ${version}' : '404';
  document.getElementById('app').appendChild(el);
  ${register}
</script></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/service-worker.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' });
    return res.end(state.sw === 'killswitch' ? KILLSWITCH_SW : AGGRESSIVE_SW);
  }
  res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
  res.end(shell(state.shell));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pollResult(page, want, timeoutMs = 8000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const txt = await page.$eval('#result', (el) => el.textContent).catch(() => null);
    if (txt === want) return true;
    await sleep(200);
  }
  return false;
}
const regCount = (page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);

const results = [];
const assert = (name, ok) => { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name); };

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
console.log('fixture server:', base, '\nchrome:', chrome, '\n');

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();

  await page.goto(base + '/', { waitUntil: 'networkidle2' });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  const controlled = await page.evaluate(async () => {
    for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
    return !!navigator.serviceWorker.controller;
  });
  assert('phase1: aggressive SW registered & controlling', controlled && (await regCount(page)) === 1);

  state.shell = 'v2';
  await page.goto(base + '/new-route', { waitUntil: 'networkidle2' });
  const bugText = await page.$eval('#result', (el) => el.textContent).catch(() => '(none)');
  const verText = await page.$eval('#ver', (el) => el.textContent).catch(() => '(none)');
  assert('phase2: BUG reproduced — /new-route serves stale shell → 404', bugText === '404' && verText === 'v1');

  state.sw = 'killswitch';
  await page.evaluate(async () => {
    const rs = await navigator.serviceWorker.getRegistrations();
    for (const r of rs) { try { await r.update(); } catch {} }
  }).catch(() => {});
  await sleep(3500); // kill-switch: activate → purge → unregister → reload

  await page.goto(base + '/new-route', { waitUntil: 'networkidle2' });
  assert('phase3: kill-switch unregistered the SW (0 registrations)', (await regCount(page).catch(() => -1)) === 0);
  const recovered = await pollResult(page, 'NEW ROUTE OK');
  const verNow = await page.$eval('#ver', (el) => el.textContent).catch(() => '(none)');
  assert('phase3: RECOVERED — /new-route now loads fresh (NEW ROUTE OK, ver v2)', recovered && verNow === 'v2');
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log('\n=== ' + (failed.length ? `FAILED (${failed.length})` : 'ALL PASSED') + ` — ${results.length} assertions ===`);
process.exit(failed.length ? 1 : 0);
