/**
 * W457 — refuse to fall back to known default secrets in production.
 *
 * 4 production-facing routes had `process.env.X || '<literal-default>'`
 * patterns where the literal was readable in source. An attacker with
 * source access (open-source clone, leaked repo, insider) could:
 *
 *   - visitor-auth.routes.js (2 sites: /verify-otp sign + /my-submissions verify)
 *     'dev-fallback' → forge any visitor JWT → impersonate any visitor
 *
 *   - nphies-webhook.routes.js
 *     'nphies-dev-secret-change-me' → forge HMAC on NPHIES webhook →
 *     mark a denied claim as approved (or vice versa), poisoning
 *     financial state
 *
 *   - transport-public-track.routes.js
 *     'transport-tracking-default-rotate-me' → forge tracking token
 *     for ANY child → scrape live GPS of the bus carrying them home.
 *     PUBLIC endpoint (no auth required), so attacker doesn't need to
 *     be a logged-in user.
 *
 *   - transport-module.routes.js
 *     Same secret as public-track (this is the SIGNER; public-track
 *     is the VERIFIER) — fix at both ends or signed tokens become
 *     out of sync.
 *
 * Fix shape (uniform across all 4 files):
 *
 *   const SECRET = (() => {
 *     const v = process.env.SECRET_ENV;
 *     if (v) return v;
 *     if (process.env.NODE_ENV === 'production') {
 *       throw new Error('SECRET_ENV is required in production — refusing to start with a known default');
 *     }
 *     console.warn('[<module>] SECRET_ENV unset — using non-prod fallback');
 *     return '<the-literal>';
 *   })();
 *
 * Production deploys missing the env now FAIL FAST (startup throw,
 * caught by k8s/pm2 → restart → eventually flagged as crash-looping
 * by ops). Dev/test continue to work with the fallback + a stderr
 * warning that lights up CI logs.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  'routes/visitor-auth.routes.js',
  'routes/nphies-webhook.routes.js',
  'routes/transport-public-track.routes.js',
  'routes/transport-module.routes.js',
];

describe('W457 — refuse known-default secret fallback in production', () => {
  for (const rel of FILES) {
    describe(rel, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

      test('refuses default secret in production (startup throw OR per-request 503)', () => {
        expect(src).toMatch(/NODE_ENV\s*===\s*['"]production['"]/);
        // Two acceptable shapes depending on code organization:
        //   (a) module-level IIFE throws — "required in production" string
        //   (b) per-request handler returns 503 — "AUTH_SECRET_MISSING" code
        const hasStartupThrow = /required in production/.test(src);
        const hasRequestRefusal = /AUTH_SECRET_MISSING|SECRET_MISSING/.test(src);
        expect(hasStartupThrow || hasRequestRefusal).toBe(true);
      });

      test('emits a non-prod warning when env var is unset (dev observability)', () => {
        // Either shape — module-level IIFE warns once, request handler
        // warns per-call. Both surface a console.warn so CI/dev logs
        // catch the missing env.
        expect(src).toMatch(/console\.warn\([^)]*(non-prod fallback|falling back to dev)/);
      });

      test("NO bare `|| '<literal-default>'` pattern remains for the protected secret", () => {
        // Specifically: each known default literal should NOT appear as
        // a bare `||` right-hand-side on the secret env var anymore.
        // (The literal CAN still appear inside the IIFE's `return`
        // — that's fine because the IIFE first checks NODE_ENV.)
        const code = src
          .split('\n')
          .map(line => line.replace(/\/\/.*$/, ''))
          .join('\n');

        // Forbidden patterns per file
        const forbidden = {
          'visitor-auth.routes.js': /process\.env\.AUTH_SECRET\s*\|\|\s*['"]dev-fallback['"]/,
          'nphies-webhook.routes.js':
            /process\.env\.NPHIES_WEBHOOK_SECRET\s*\|\|\s*['"]nphies-dev-secret-change-me['"]/,
          'transport-public-track.routes.js':
            /process\.env\.TRANSPORT_TRACKING_SECRET\s*\|\|\s*['"]transport-tracking-default-rotate-me['"]/,
          'transport-module.routes.js':
            /process\.env\.TRANSPORT_TRACKING_SECRET\s*\|\|\s*['"]transport-tracking-default-rotate-me['"]/,
        };

        const fname = rel.split('/').pop();
        const re = forbidden[fname];
        if (re) {
          expect(code).not.toMatch(re);
        }
      });

      test('module loads in NON-production (dev) environment', () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        try {
          delete require.cache[require.resolve('../' + rel.replace(/\.js$/, ''))];
          expect(() => require('../' + rel.replace(/\.js$/, ''))).not.toThrow();
        } finally {
          process.env.NODE_ENV = prev;
        }
      });
    });
  }
});
