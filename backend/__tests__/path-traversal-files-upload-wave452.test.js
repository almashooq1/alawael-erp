/**
 * W452 — close path-traversal in files.routes.js upload destination.
 *
 * Pre-W452 the multer destination function did:
 *
 *   const purpose = String(req.body?.purpose || 'other');
 *   const dir = path.join(UPLOAD_ROOT, purpose, dateDir);
 *
 * with NO validation. An authenticated attacker could send
 *   purpose: '../../../public/uploads-public'
 * and the file would land OUTSIDE the intended UPLOAD_ROOT. The
 * POST handler later validates `purpose` against UploadedFile.PURPOSES
 * but by then multer has already created the directory and written
 * the file. The post-write unlink only removes the file, not the
 * escaped directory; and the file could land in a web-accessible
 * location if the attacker picks the right traversal target.
 *
 * Fix — two layers:
 *   (1) Validate `raw` against UploadedFile.PURPOSES at multer time;
 *       fall back to 'other' if invalid (which IS in PURPOSES, so
 *       the file lands in the intended dir even if attacker sends junk).
 *   (2) Compute path.resolve(dir) and verify it stays within
 *       path.resolve(UPLOAD_ROOT) + sep — defensive against bugs in
 *       PURPOSES allowlist or future regressions that re-allow user
 *       input. Reject via cb(error) if the resolved path escapes.
 */

const fs = require('fs');
const path = require('path');

describe('W452 — path-traversal defense on files.routes.js upload', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'files.routes.js'), 'utf8');

  test('purpose validated against PURPOSES at multer destination', () => {
    // The fix shape: `UploadedFile.PURPOSES.includes(raw) ? raw : 'other'`
    expect(src).toMatch(/UploadedFile\.PURPOSES\.includes\(raw\)\s*\?\s*raw\s*:\s*['"]other['"]/);
  });

  test('resolved dir checked to stay within UPLOAD_ROOT', () => {
    expect(src).toMatch(/path\.resolve\(dir\)/);
    expect(src).toMatch(/startsWith\(path\.resolve\(UPLOAD_ROOT\)\s*\+\s*path\.sep\)/);
    expect(src).toMatch(/invalid upload path/);
  });

  test('NO unvalidated path.join(UPLOAD_ROOT, purpose) without allowlist check', () => {
    // The anti-pattern: directly using purpose from String(req.body?.purpose ...).
    // After W452 the value flowing into path.join must be the validated
    // `purpose` local, not the raw String(req.body...) — so the previous
    // shape `const purpose = String(req.body?.purpose || 'other'); const dir = path.join(UPLOAD_ROOT, purpose,` is gone.
    expect(src).not.toMatch(
      /const\s+purpose\s*=\s*String\(req\.body\?\.purpose[\s\S]{0,80}path\.join\(UPLOAD_ROOT,\s*purpose/
    );
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/files.routes')).not.toThrow();
  });
});
