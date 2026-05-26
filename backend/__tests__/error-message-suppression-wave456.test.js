/**
 * W456 — close 500-error err.message info-disclosure on 10 sites.
 *
 * `safeError` (utils/safeError.js) was introduced specifically to
 * suppress err.message in production responses while still logging
 * the full err.stack for ops. 10 sites still returned err.message
 * inline:
 *
 *   routes/openapi-integration.routes.js  6 sites (PUBLIC endpoints
 *                                                  — partners can
 *                                                  read internal file
 *                                                  paths via spec-load
 *                                                  errors)
 *   routes/quality/therapistWorkload.routes.js     1 site
 *   routes/quality/executiveOnePage.routes.js      1 site
 *   routes/quality/branchQualityHeatmap.routes.js  1 site
 *   routes/notificationLog.routes.js               1 site (require()
 *                                                  failure leak)
 *
 * Risk: err.message can carry internal paths, DB query strings,
 * library internals, env-var names, etc. In production this hands
 * an attacker a free reconnaissance channel via 500 responses.
 *
 * Fix: replace `res.status(500).json({ ..., message: err.message })`
 * with `safeError(res, err, '<context>')`. In production safeError
 * returns the generic Arabic message + logs err.stack; in dev it
 * returns err.message for debuggability.
 *
 * notificationLog had a literal `bus_unavailable: ${err.message}`
 * concatenation — fixed by logging err.stack via logger.error and
 * returning bare `bus_unavailable` code.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  'routes/openapi-integration.routes.js',
  'routes/quality/therapistWorkload.routes.js',
  'routes/quality/executiveOnePage.routes.js',
  'routes/quality/branchQualityHeatmap.routes.js',
  'routes/notificationLog.routes.js',
];

describe('W456 — error-message suppression on 500 responses', () => {
  for (const rel of FILES) {
    describe(rel, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

      test('imports safeError (or uses logger.error for bus require)', () => {
        // openapi + quality routes import safeError; notificationLog uses
        // logger.error inline for the bus require failure.
        if (rel === 'routes/notificationLog.routes.js') {
          expect(src).toMatch(/logger\.error\(['"]?\[notificationLog\] bus unavailable/);
        } else {
          expect(src).toMatch(/safeError/);
          expect(src).toMatch(/require\(['"][\.\/]+utils\/safeError['"]\)/);
        }
      });

      test('NO res.status(500).json with message: err.message remains', () => {
        // The anti-pattern.
        expect(src).not.toMatch(/res\.status\(500\)\.json\(\{[^}]*message:\s*err\.message/);
      });

      test('NO bare ${err.message} interpolation in 500 response body', () => {
        // notificationLog had `bus_unavailable: ${err.message}` — strip
        // err.message from any literal string used in a 500 res.
        // Conservative check: just ensure no `err.message}` shows up
        // inside a backtick-quoted literal that's passed to res.status(500)
        // (we strip line comments first to avoid drift).
        const code = src
          .split('\n')
          .map(line => line.replace(/\/\/.*$/, ''))
          .join('\n');
        // Find every res.status(500) ... json call, check that the
        // following ~200 chars don't include `err.message}` or
        // `error.message}` (template-literal interpolation).
        const re = /res\.status\(500\)/g;
        let m;
        while ((m = re.exec(code)) !== null) {
          const next200 = code.slice(m.index, m.index + 300);
          expect(next200).not.toMatch(/\$\{err\.message\}/);
          expect(next200).not.toMatch(/\$\{error\.message\}/);
        }
      });

      test('module loads without throwing', () => {
        const modPath = '../' + rel.replace(/\.js$/, '');
        expect(() => require(modPath)).not.toThrow();
      });
    });
  }
});
