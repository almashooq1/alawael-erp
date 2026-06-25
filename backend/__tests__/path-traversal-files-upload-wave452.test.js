/**
 * W452 — close path-traversal in files.routes.js upload.
 *
 * Pre-W452 the multer destination function did:
 *
 *   const purpose = String(req.body?.purpose || 'other');
 *   const dir = path.join(UPLOAD_ROOT, purpose, dateDir);
 *
 * with NO validation. An authenticated attacker could send
 *   purpose: '../../../public/uploads-public'
 * and the file would land OUTSIDE the intended UPLOAD_ROOT.
 *
 * Current architecture (Wave 207b) uses `multer.memoryStorage()` so uploads are
 * buffered in memory and then handed to `documentUploadService` for persisted
 * storage. The user-supplied `purpose` is still validated against
 * `UploadedFile.PURPOSES` and falls back to `'other'` before it is used to
 * derive the destination folder / sourceModule, so the traversal class is
 * closed at both layers.
 */

const fs = require('fs');
const path = require('path');

describe('W452 — path-traversal defense on files.routes.js upload', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'files.routes.js'), 'utf8');

  test('upload uses memory storage (no attacker-controlled disk destination)', () => {
    expect(src).toMatch(/multer\.memoryStorage\(\)/);
    expect(src).toMatch(/storage:\s*memStorage/);
  });

  test('purpose validated against PURPOSES before being used', () => {
    // Accept either the legacy `raw` variable name or the current `rawPurpose`.
    expect(src).toMatch(
      /UploadedFile\.PURPOSES\.includes\((rawPurpose|raw)\)\s*\?\s*\1\s*:\s*['"]other['"]/
    );
  });

  test('NO unvalidated path.join(UPLOAD_ROOT, purpose) without allowlist check', () => {
    // The anti-pattern: directly using purpose from String(req.body?.purpose ...).
    expect(src).not.toMatch(
      /const\s+purpose\s*=\s*String\(req\.body\?\.purpose[\s\S]{0,80}path\.join\(UPLOAD_ROOT,\s*purpose/
    );
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/files.routes')).not.toThrow();
  });
});
