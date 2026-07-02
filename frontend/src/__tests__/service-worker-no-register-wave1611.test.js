/**
 * W1611 — service-worker NO-REGISTRATION guard.
 *
 * WHY: the legacy frontend registered a service worker at the ROOT scope ('/')
 * via THREE independent paths — (1) vite-plugin-pwa `injectRegister:'script'`
 * (→ /sw.js), (2) src/registerServiceWorker.js (→ /service-worker.js), and
 * (3) an inline registerServiceWorker() in src/index.js (→ /service-worker.js).
 * An old cache-first version of that SW served the STALE legacy app-shell for
 * EVERY navigation — including sibling apps like /rehab and /admin — so the
 * legacy SPA rendered its own 404 for any route it does not own. That was the
 * root of the recurring "404 on most of the site".
 *
 * The companion W1586 guard checks the SW FILE contents (public/*.js). This
 * guard checks the REGISTRATION side: no source path may register a controlling
 * SW again. If a legit SW is ever reintroduced, it MUST be scoped to a specific
 * sub-path (never '/') — update this guard deliberately when that happens.
 *
 * Static: reads the source files as text (no app import, no DOM).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');
const FRONTEND = path.resolve(SRC, '..');

// Strip block + line comments so a doc-comment that DESCRIBES the old pattern
// (this file's own header, or the source files' explanatory comments) can never
// trip the code-pattern checks below.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function readCode(p) {
  return stripComments(fs.readFileSync(p, 'utf8'));
}

// Any `navigator.serviceWorker.register(` OR `.serviceWorker\n.register(` call.
const REGISTER_RE = /serviceWorker\s*(?:\r?\n\s*)?\.\s*register\s*\(/;

describe('service-worker NO registration in source (W1611)', () => {
  test('vite.config.js does NOT inject a SW-registration script (injectRegister must be false)', () => {
    const code = readCode(path.join(FRONTEND, 'vite.config.js'));
    // The offending value was 'script'. 'auto' would also inject. Require false.
    expect(code).not.toMatch(/injectRegister\s*:\s*['"](script|auto)['"]/);
    expect(code).toMatch(/injectRegister\s*:\s*false/);
  });

  test('src/registerServiceWorker.js registers NO SW (cleanup only)', () => {
    const code = readCode(path.join(SRC, 'registerServiceWorker.js'));
    expect(code, 'must not call navigator.serviceWorker.register(')
      .not.toMatch(REGISTER_RE);
    // Positive: it must actively unregister existing SWs.
    expect(code).toMatch(/getRegistrations\s*\(/);
    expect(code).toMatch(/\.unregister\s*\(/);
  });

  test('src/index.js bootstrap registers NO SW (cleanup only)', () => {
    const code = readCode(path.join(SRC, 'index.js'));
    expect(code, 'index.js must not call navigator.serviceWorker.register(')
      .not.toMatch(REGISTER_RE);
  });

  test('no other src file registers a service worker', () => {
    const offenders = [];
    const walk = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(full);
        } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          if (REGISTER_RE.test(readCode(full))) {
            offenders.push(path.relative(FRONTEND, full));
          }
        }
      }
    };
    walk(SRC);
    // If this fails: a source file reintroduced SW registration. Root-scope SW
    // registration is the stale-shell-404 root cause — remove it, or (if truly
    // needed) scope it to a sub-path and update this guard on purpose.
    expect(offenders).toEqual([]);
  });
});
