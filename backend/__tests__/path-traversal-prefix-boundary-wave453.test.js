/**
 * W453 — close prefix-shared-sibling escape across all path-traversal
 * boundary checks.
 *
 * The W452 fix on files.routes.js upload-destination used the strict
 * `resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)` shape.
 * But 6 OTHER path-traversal boundary checks in the codebase still
 * used the loose `.startsWith(BASE_DIR)` form, which matches a
 * sibling directory whose name SHARES THE PREFIX:
 *
 *   BASE_DIR = '/path/uploads'
 *   '/path/uploads-evil/file'.startsWith('/path/uploads')  // → true
 *
 * Attacker who can store a path in `doc.storagePath` (via upload,
 * direct DB write, or schema field that defaults from user input)
 * could supply `/path/uploads-evil/file` and bypass the boundary
 * check, reading/deleting files outside the intended dir.
 *
 * Pre-W453:
 *   files.routes.js:252       (download stream)        — vulnerable
 *   files.routes.js:285       (hard-delete unlink)     — vulnerable
 *   medicalFiles.js:262,292,335,371 (4 sites)          — vulnerable
 *   administrative-communications-routes.js:659        — vulnerable
 *
 * Post-W453: all 7 sites use `path.resolve(BASE_DIR) + path.sep`
 * boundary, requiring the path to be STRICTLY inside the directory.
 *
 * Static drift guard: no .startsWith(BASE_DIR) without `+ path.sep`
 * may slip back into the canonical file-handling files.
 */

const fs = require('fs');
const path = require('path');

describe('W453 — strict path-sep boundary on path-traversal checks', () => {
  const FILES = [
    'routes/files.routes.js',
    'routes/medicalFiles.js',
    'communication/administrative-communications-routes.js',
  ];

  for (const rel of FILES) {
    describe(rel, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

      test('every startsWith(...resolve(<base>)) carries path.sep boundary', () => {
        // Find every `.startsWith(path.resolve(<base>))` call and
        // verify it is followed by `+ path.sep` either inside the
        // same expression or as the concluding `)` of a `+ path.sep)`
        // suffix.
        const re = /\.startsWith\(\s*path\.resolve\([^)]+\)([^)]*)\)/g;
        let m;
        while ((m = re.exec(src)) !== null) {
          const suffix = m[1];
          expect(suffix).toMatch(/\+\s*path\.sep/);
        }
      });

      test('no bare startsWith(<DIR_CONST>) without path.sep (code, not comments)', () => {
        // Strip line-comments so the historical "Pre-W453 the check was
        // `resolved.startsWith(UPLOAD_ROOT)` which..." comment doesn't
        // false-positive.
        const code = src
          .split('\n')
          .map(line => line.replace(/\/\/.*$/, ''))
          .join('\n');
        const bareRe = /\.startsWith\(\s*(UPLOAD_ROOT|uploadDir|baseDir|UPLOAD_DIR)\s*\)/;
        expect(code).not.toMatch(bareRe);
      });

      test('module loads without throwing', () => {
        const modulePath = rel.startsWith('routes/')
          ? `../${rel.replace(/\.js$/, '')}`
          : `../${rel.replace(/\.js$/, '')}`;
        expect(() => require(modulePath)).not.toThrow();
      });
    });
  }
});
