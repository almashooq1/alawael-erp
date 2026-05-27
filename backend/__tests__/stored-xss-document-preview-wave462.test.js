/**
 * W462 — stored-XSS defense on document preview.
 *
 * `routes/documents.routes.js` ALLOWED_MIMES includes:
 *   - `text/html`
 *   - `text/xml`
 *   - `application/xml`
 * (and historically image/svg+xml via the catch-all for legitimate
 * template/report uploads).
 *
 * `GET /:id/preview` set Content-Disposition: inline + Content-Type
 * from the stored doc.mimeType. Pre-W462 an authenticated attacker
 * could:
 *   1. Upload `evil.html` with `<script>fetch('/api/admin/users')...`
 *      contents (MIME passes the allowlist).
 *   2. Send the preview URL to an admin (chat / email / forum post).
 *   3. Admin clicks → browser renders the HTML in the application
 *      origin with the admin's session cookie/Authorization context
 *      → STORED XSS → session hijack / CSRF token theft / PHI exfil.
 *
 * `text/xml` and `application/xml` carry the same risk via inline
 * `<?xml-stylesheet?>` PIs (XSL processing can execute JS in some
 * browsers). `image/svg+xml` can carry inline `<script>` tags.
 *
 * Fix in the preview handler:
 *   - For mimes matching /^text\/(html|xml)/i, /^application\/xml/i,
 *     or /^image\/svg/i: force Content-Disposition: attachment.
 *   - Plus defense-in-depth: X-Frame-Options: DENY + Content-Security-
 *     Policy: sandbox header so even iframe embedding is blocked.
 *   - All other mimes (PDF / images / Word / Excel) continue to
 *     preview inline as before.
 *
 * Download path was already safe (Content-Disposition: attachment).
 */

const fs = require('fs');
const path = require('path');

describe('W462 — stored-XSS defense on document preview', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'documents.routes.js'), 'utf8');

  // Locate the preview handler block
  const previewIdx = src.indexOf("router.get(\n  '/:id/preview'");
  const downloadIdx = src.indexOf("router.get(\n  '/:id/download'");
  expect(previewIdx).toBeGreaterThan(-1);
  expect(downloadIdx).toBeGreaterThan(previewIdx);
  const previewBlock = src.slice(previewIdx, downloadIdx);

  test('preview detects executable-script mimes (HTML / XML / SVG)', () => {
    // The fix shape uses regex test on doc.mimeType:
    expect(previewBlock).toMatch(/\/\^text\\\/\(html\|xml\)/);
    expect(previewBlock).toMatch(/\/\^application\\\/xml/);
    expect(previewBlock).toMatch(/\/\^image\\\/svg/);
    expect(previewBlock).toMatch(/isExecutableScript/);
  });

  test('preview forces attachment disposition for executable mimes', () => {
    // The fix shape sets disposition = isExecutableScript ? 'attachment' : 'inline'
    expect(previewBlock).toMatch(
      /isExecutableScript\s*\?\s*['"]attachment['"]\s*:\s*['"]inline['"]/
    );
  });

  test('preview sets X-Frame-Options + CSP sandbox for executable mimes', () => {
    expect(previewBlock).toMatch(/X-Frame-Options['"]\s*,\s*['"]DENY['"]/);
    expect(previewBlock).toMatch(/Content-Security-Policy['"]\s*,\s*['"]sandbox/);
  });

  test('preview no longer hardcodes inline disposition (regression sentinel)', () => {
    // Pre-W462 had: `Content-Disposition', \`inline; filename=...\``
    // After W462: `Content-Disposition', \`${disposition}; filename=...\``
    // — disposition is a variable, not a literal.
    expect(previewBlock).not.toMatch(/['"]Content-Disposition['"]\s*,\s*`inline;\s*filename=/);
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/documents.routes')).not.toThrow();
  });
});
