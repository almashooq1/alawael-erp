/**
 * W460 — defense-in-depth path boundary on case medical-file delete.
 *
 * routes/caseManagement.js DELETE /:caseId/medical-files/:fileId did:
 *
 *   const filePath = path.join(__dirname, '../', file.fileUrl);
 *   await fs.unlink(filePath);
 *
 * `file.fileUrl` is server-controlled today (line 449 sets it as
 * `/uploads/medical-files/${req.file.filename}` from the upload
 * handler), so this is not currently exploitable. But:
 *
 *   - Bare path.join + fs.unlink offers ZERO defense if a future
 *     route, bulk-update, migration, or schema change ever lets user
 *     input flow into file.fileUrl.
 *   - The pattern follows the same shape as W454/W455 — defense-in-depth
 *     boundary checks before destructive filesystem ops.
 *
 * Sibling fs.unlink calls in medicalFiles.js are already protected
 * (line 350 is gated by the W453 path-sep boundary check; lines
 * 184/241 take req.file.path which is multer-controlled).
 *
 * Fix:
 *   const resolvedPath = path.resolve(filePath);
 *   const uploadsBase  = path.resolve(__dirname, '..', 'uploads', 'medical-files');
 *   if (!resolvedPath.startsWith(uploadsBase + path.sep)) {
 *     logger.warn('Refused unlink — path escapes uploads dir', { ... });
 *   } else {
 *     try { await fs.unlink(resolvedPath); } catch (err) { ... }
 *   }
 */

const fs = require('fs');
const path = require('path');

describe('W460 — arbitrary-file-delete defense on case medical-file delete', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'caseManagement.js'), 'utf8');

  test('computes resolvedPath before unlink', () => {
    expect(src).toMatch(/const\s+resolvedPath\s*=\s*path\.resolve\(filePath\)/);
  });

  test('checks resolvedPath against uploads/medical-files base + path.sep', () => {
    expect(src).toMatch(/resolvedPath\.startsWith\(\s*uploadsBase\s*\+\s*path\.sep\s*\)/);
  });

  test('logs warning on boundary violation (ops observability)', () => {
    expect(src).toMatch(/Refused unlink/);
    expect(src).toMatch(/logger\.warn/);
  });

  test('uses resolvedPath in fs.unlink (not raw filePath)', () => {
    // The fixed shape: `await fs.unlink(resolvedPath)`. The previous
    // shape `await fs.unlink(filePath)` MUST NOT remain.
    expect(src).toMatch(/await\s+fs\.unlink\(resolvedPath\)/);
    // Anti-pattern check — no bare fs.unlink(filePath) in this file.
    const code = src
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/await\s+fs\.unlink\(filePath\)/);
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/caseManagement')).not.toThrow();
  });
});
