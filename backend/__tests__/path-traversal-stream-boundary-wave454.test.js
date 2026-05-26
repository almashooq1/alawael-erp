/**
 * W454 — close two more path-boundary gaps in the file-serving surface.
 *
 *   media.routes.js:793
 *     `path.resolve(filePath).startsWith(path.resolve(uploadsDir))`
 *     — same prefix-shared-sibling escape as W453 (no `+ path.sep`).
 *
 *   documents.routes.js (preview + download)
 *     `fs.createReadStream(doc.filePath)` with NO boundary check at
 *     all. `doc.filePath` is currently server-controlled (from
 *     saveToDisk) and PUT /:id uses an allowlist, so today this is
 *     safe. But defense-in-depth: add an explicit
 *     `path.resolve(doc.filePath).startsWith(path.resolve(UPLOADS_ROOT) + path.sep)`
 *     check before streaming, with a logger.warn on violation so any
 *     future regression (direct DB write, migration, schema change)
 *     gets flagged in ops logs before it's exploited.
 */

const fs = require('fs');
const path = require('path');

describe('W454 — strict path-boundary on stream-serving handlers', () => {
  describe('media.routes.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'media.routes.js'), 'utf8');

    test('path.resolve(filePath).startsWith uses path.sep boundary', () => {
      expect(src).toMatch(
        /path\.resolve\(filePath\)\.startsWith\(path\.resolve\(uploadsDir\)\s*\+\s*path\.sep\)/
      );
    });

    test('no bare startsWith(path.resolve(uploadsDir)) without path.sep', () => {
      const code = src
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, ''))
        .join('\n');
      expect(code).not.toMatch(/\.startsWith\(\s*path\.resolve\(uploadsDir\)\s*\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/media.routes')).not.toThrow();
    });
  });

  describe('documents.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'documents.routes.js'),
      'utf8'
    );

    test('preview handler computes resolvedPath + UPLOADS_ROOT boundary', () => {
      // Find the preview block + verify path-boundary check exists
      const previewIdx = src.indexOf("router.get(\n  '/:id/preview'");
      expect(previewIdx).toBeGreaterThan(-1);
      const nextHandlerIdx = src.indexOf('router.get(\n', previewIdx + 1);
      const block = src.slice(previewIdx, nextHandlerIdx);
      expect(block).toMatch(/path\.resolve\(doc\.filePath\)/);
      expect(block).toMatch(/startsWith\(path\.resolve\(UPLOADS_ROOT\)\s*\+\s*path\.sep\)/);
    });

    test('download handler computes resolvedPath + UPLOADS_ROOT boundary', () => {
      const dlIdx = src.indexOf("router.get(\n  '/:id/download'");
      expect(dlIdx).toBeGreaterThan(-1);
      const nextHandlerIdx = src.indexOf('router.', dlIdx + 50);
      const block = src.slice(dlIdx, nextHandlerIdx > 0 ? nextHandlerIdx : dlIdx + 2000);
      expect(block).toMatch(/path\.resolve\(doc\.filePath\)/);
      expect(block).toMatch(/startsWith\(path\.resolve\(UPLOADS_ROOT\)\s*\+\s*path\.sep\)/);
    });

    test('createReadStream uses resolvedPath, not raw doc.filePath', () => {
      // The two preview/download handlers must pass resolvedPath
      // (validated) to createReadStream, not doc.filePath directly.
      // Count occurrences.
      const streamCalls = src.match(/fs\.createReadStream\(([^)]+)\)/g) || [];
      const docFilePathStreamCalls = streamCalls.filter(s => /doc\.filePath/.test(s));
      expect(docFilePathStreamCalls.length).toBe(0);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/documents.routes')).not.toThrow();
    });
  });
});
