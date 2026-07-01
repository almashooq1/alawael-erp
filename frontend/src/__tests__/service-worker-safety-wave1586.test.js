/**
 * W1586 — service-worker safety guard (no stale app-shell).
 *
 * WHY: `public/service-worker.js` used to precache `/index.html` under a
 * FIXED cache name (`alawael-v1`) and serve navigation **cache-first**. Because
 * the version string never changed, once a browser registered it every later
 * deploy's new routes 404'd (it kept serving the old shell + old chunk hashes;
 * e.g. the `/student-management` "404"). It was replaced with a kill-switch SW
 * that purges all caches + unregisters. This guard stops that class from ever
 * shipping again.
 *
 * Static: reads the public/ SW scripts as text.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '..', '..', 'public'); // frontend/public

// Strip block + line comments so a SW's own doc-comment (which may DESCRIBE the
// old bad pattern) can't trip the code-pattern checks below.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function swScripts() {
  return fs
    .readdirSync(PUBLIC)
    .filter((f) => f.endsWith('.js'))
    .map((f) => {
      const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
      return { name: f, src, code: stripComments(src) };
    })
    .filter((f) => /self\.addEventListener\(\s*['"](install|activate|fetch)['"]/.test(f.code));
}

describe('service-worker safety — no stale app-shell (W1586)', () => {
  const files = swScripts();

  test('sanity: found the public/ service-worker scripts', () => {
    const names = files.map((f) => f.name).sort();
    expect(names).toEqual(expect.arrayContaining(['service-worker.js', 'sw.js']));
  });

  test('no SW caches /index.html AND serves navigation cache-first (the stale-shell class)', () => {
    const offenders = files
      .filter(
        (f) =>
          /['"`]\/index\.html['"`]/.test(f.code) && /cacheFirst|cache-first/i.test(f.code)
      )
      .map((f) => f.name);
    // If this fails: that SW pins a cached app shell and will 404 routes added
    // in later deploys. Serve navigation network-first (or don't cache HTML).
    expect(offenders).toEqual([]);
  });

  test('service-worker.js is a kill-switch — purges caches + unregisters (recovers stuck clients)', () => {
    const sw = files.find((f) => f.name === 'service-worker.js');
    expect(sw).toBeTruthy();
    expect(sw.code).toMatch(/caches\.delete/);
    expect(sw.code).toMatch(/registration\.unregister/);
    // must not reintroduce the old permanent named app-shell cache
    expect(sw.code).not.toMatch(/CACHE_NAME\s*=\s*['"]alawael-v1['"]/);
  });
});
