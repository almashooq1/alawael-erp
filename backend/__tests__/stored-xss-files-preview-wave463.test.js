/**
 * W463 — extend W462's stored-XSS defense to files.routes.js.
 *
 * routes/files.routes.js `GET /:id/download` actually serves the file
 * INLINE (Content-Disposition: inline — the route name is misleading).
 * Its current ALLOWED_MIMES excludes text/html, text/xml,
 * application/xml, image/svg+xml — so this is NOT currently
 * exploitable. But if a future maintainer adds any of those (e.g., to
 * support HTML report uploads or SVG icons), the inline render would
 * instantly become stored-XSS.
 *
 * Fix: same shape as W462 — detect script-bearing mimes + force
 * attachment + sandbox CSP. Regression-proof against future allowlist
 * expansion.
 */

const fs = require('fs');
const path = require('path');

describe('W463 — defense-in-depth stored-XSS guard on files.routes.js preview', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'files.routes.js'), 'utf8');

  const dlIdx = src.indexOf("router.get('/:id/download'");
  expect(dlIdx).toBeGreaterThan(-1);
  const nextIdx = src.indexOf('router.', dlIdx + 50);
  const block = src.slice(dlIdx, nextIdx > 0 ? nextIdx : dlIdx + 3000);

  test('detects executable-script mimes (HTML / XML / SVG)', () => {
    expect(block).toMatch(/isExecutableScript/);
    expect(block).toMatch(/text\\\/\(html\|xml\)/);
    expect(block).toMatch(/application\\\/xml/);
    expect(block).toMatch(/image\\\/svg/);
  });

  test('forces attachment disposition for executable mimes (defense-in-depth)', () => {
    expect(block).toMatch(/isExecutableScript\s*\?\s*['"]attachment['"]\s*:\s*['"]inline['"]/);
  });

  test('sets X-Frame-Options + CSP sandbox for executable mimes', () => {
    expect(block).toMatch(/X-Frame-Options['"]\s*,\s*['"]DENY['"]/);
    expect(block).toMatch(/Content-Security-Policy['"]\s*,\s*['"]sandbox/);
  });

  test('no longer hardcodes inline disposition (regression sentinel)', () => {
    expect(block).not.toMatch(/['"]Content-Disposition['"]\s*,\s*`inline;\s*filename=/);
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/files.routes')).not.toThrow();
  });
});
