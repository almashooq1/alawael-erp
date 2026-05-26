/**
 * W455 — close final 2 path-traversal sites on the file-serving surface.
 *
 *   media.routes.js GET /:id/download
 *     `const filePath = media.filePath || path.join(uploadsDir, media.fileName);`
 *     `res.download(filePath, ...);`
 *     NO boundary check. If `media.filePath` was ever set to an
 *     absolute path outside uploadsDir (via direct DB write or future
 *     schema regression), download serves arbitrary file. Add
 *     resolvedFile + path.sep boundary check, then download resolvedFile.
 *
 *   reports-analytics-module.routes.js GET /jobs/:id/download
 *     Had path-traversal guard but used `.startsWith(reportsDir)`
 *     without `+ path.sep` — prefix-shared-sibling
 *     `/generated_reports-evil/file` matched `/generated_reports`.
 */

const fs = require('fs');
const path = require('path');

describe('W455 — final path-boundary closures', () => {
  describe('media.routes.js /:id/download', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'media.routes.js'), 'utf8');

    test('download handler computes resolvedFile and checks path.sep boundary', () => {
      const dlIdx = src.indexOf("router.get('/:id/download'");
      expect(dlIdx).toBeGreaterThan(-1);
      const nextIdx = src.indexOf('router.', dlIdx + 50);
      const block = src.slice(dlIdx, nextIdx > 0 ? nextIdx : dlIdx + 3000);
      expect(block).toMatch(/const\s+resolvedFile\s*=\s*path\.resolve\(filePath\)/);
      expect(block).toMatch(
        /resolvedFile\.startsWith\(path\.resolve\(uploadsDir\)\s*\+\s*path\.sep\)/
      );
    });

    test('res.download uses resolvedFile (not raw filePath)', () => {
      const dlIdx = src.indexOf("router.get('/:id/download'");
      const nextIdx = src.indexOf('router.', dlIdx + 50);
      const block = src.slice(dlIdx, nextIdx > 0 ? nextIdx : dlIdx + 3000);
      expect(block).toMatch(/res\.download\(resolvedFile/);
      // NO raw `res.download(filePath, ...)` in this handler
      expect(block).not.toMatch(/res\.download\(filePath,/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/media.routes')).not.toThrow();
    });
  });

  describe('reports-analytics-module.routes.js /jobs/:id/download', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'reports-analytics-module.routes.js'),
      'utf8'
    );

    test('startsWith uses path.sep boundary (not bare reportsDir prefix)', () => {
      expect(src).toMatch(/filePath\.startsWith\(reportsDir\s*\+\s*path\.sep\)/);
    });

    test('no bare filePath.startsWith(reportsDir) without path.sep (code, not comments)', () => {
      const code = src
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, ''))
        .join('\n');
      expect(code).not.toMatch(/filePath\.startsWith\(\s*reportsDir\s*\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/reports-analytics-module.routes')).not.toThrow();
    });
  });
});
