/**
 * W458 — close brute-force window on 2 production login endpoints.
 *
 * Pre-W458 two POST /auth/login routes had NO rate limiter at all,
 * letting an attacker hammer credential guesses indefinitely against
 * any guardian phone or therapist email/username:
 *
 *   routes/parent-portal-v1.routes.js POST /auth/login
 *     Targets: any parent's guardian account (login by phone +
 *     password). Successful brute-force exposes all the parent's
 *     child PHI, financial records, consent toggles.
 *
 *   routes/therapist-portal.routes.js POST /auth/login
 *     Targets: any therapist's clinical account (login by email or
 *     username + password). Successful brute-force exposes assigned
 *     beneficiary caseload + clinical notes.
 *
 * Both other login endpoints in the codebase already gated:
 *   - routes/sso.routes.js POST /login          loginLimiter ✓
 *   - routes/montessoriAuth.js POST /login      loginLimiter ✓
 *
 * Fix: wire loginLimiter (same 5 req/15min per IP from
 * securityConfig.rateLimit.login) via lazy-require pattern so a
 * missing rateLimiter module doesn't crash route load.
 */

const fs = require('fs');
const path = require('path');

const FILES = ['routes/parent-portal-v1.routes.js', 'routes/therapist-portal.routes.js'];

describe('W458 — login rate-limit closure', () => {
  for (const rel of FILES) {
    describe(rel, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

      test('lazy-loads loginLimiter from middleware/rateLimiter', () => {
        expect(src).toMatch(/require\(['"]\.\.\/middleware\/rateLimiter['"]\)\.loginLimiter/);
        // Wrapper function defined (defends against missing dep)
        expect(src).toMatch(/function\s+loginLimiter\s*\(/);
      });

      test('POST /auth/login is gated by loginLimiter', () => {
        // Look for the exact handler signature with the middleware
        expect(src).toMatch(/router\.post\(\s*['"]\/auth\/login['"]\s*,\s*loginLimiter\s*,/);
      });

      test("NO bare router.post('/auth/login', async ... remains", () => {
        // The anti-pattern: handler without limiter as 2nd arg.
        expect(src).not.toMatch(/router\.post\(\s*['"]\/auth\/login['"]\s*,\s*async\s+\(/);
      });

      test('module loads without throwing', () => {
        expect(() => require(`../${rel.replace(/\.js$/, '')}`)).not.toThrow();
      });
    });
  }
});
