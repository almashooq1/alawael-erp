/**
 * W442 — JWT algorithm pinning sweep.
 *
 * Two production paths verifying JWTs WITHOUT explicit
 * `{ algorithms: ['HS256'] }` allowlist:
 *
 *   - config/socket.config.js:55     (socket.io auth — full session impersonation)
 *   - middleware/maintenance.middleware.js:50  (admin lockout-override)
 *
 * Without the allowlist, jsonwebtoken trusts the JWT's own `alg`
 * header — opening:
 *   (a) alg=none bypass (older jsonwebtoken versions accept it)
 *   (b) RS256 → HS256 algorithm confusion — attacker signs HS256
 *       JWT using any reachable RS256 public key as the HMAC secret
 *       and the verify call accepts it
 *
 * Static drift guard so neither file can lose the allowlist again.
 * Also asserts the full backend production tree has zero remaining
 * unpinned jwt.verify calls (test files intentionally excluded).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('W442 — JWT algorithm pinning', () => {
  test('config/socket.config.js pins HS256', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'config', 'socket.config.js'), 'utf8');
    expect(src).toMatch(/jwt\.verify\([^)]*\{\s*algorithms:\s*\[\s*['"]HS256['"]\s*\]\s*\}/);
    // Specifically the wrapping call MUST have algorithms — not just
    // any other jwt.verify in the file.
    expect(src).not.toMatch(/jwt\.verify\(\s*token\s*,\s*jwtSecret\s*\)/);
  });

  test('middleware/maintenance.middleware.js pins HS256', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'maintenance.middleware.js'),
      'utf8'
    );
    expect(src).toMatch(/jwt\.verify\([^)]*\{\s*algorithms:\s*\[\s*['"]HS256['"]\s*\]\s*\}/);
    expect(src).not.toMatch(/jwt\.verify\(\s*token\s*,\s*process\.env\.JWT_SECRET\s*\)\s*;/);
  });

  test('no production jwt.verify call missing algorithms allowlist', () => {
    // Walk backend/ excluding tests + node_modules + frontend builds.
    // For each .js file, find `jwt.verify(...)` calls without
    // `algorithms:`. Report violations.
    const backendRoot = path.join(__dirname, '..');
    const excludeDirs = new Set([
      'node_modules',
      '__tests__',
      'tests',
      'coverage',
      '.git',
      'public',
      '_archived', // dead code, not loaded — out of scope for live audit
    ]);
    const violations = [];

    function walk(dir) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (excludeDirs.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          let src;
          try {
            src = fs.readFileSync(full, 'utf8');
          } catch {
            continue;
          }
          // Find jwt.verify( ... ) — including multi-line. Naive but
          // good enough: capture up to the matching paren count = 0.
          let i = 0;
          while ((i = src.indexOf('jwt.verify(', i)) !== -1) {
            // walk parens
            let depth = 1;
            let j = i + 'jwt.verify('.length;
            while (j < src.length && depth > 0) {
              const c = src[j];
              if (c === '(') depth++;
              else if (c === ')') depth--;
              j++;
            }
            const call = src.slice(i, j);
            // Allowed if it contains "algorithms:" or callsite is a
            // comment marker like "// jwt.verify(" (skip lines whose
            // call site is preceded by "// " on the same line).
            const lineStart = src.lastIndexOf('\n', i) + 1;
            const lineBeforeCall = src.slice(lineStart, i);
            const isCommented = /\/\//.test(lineBeforeCall);
            if (!isCommented && !/algorithms\s*:/.test(call)) {
              violations.push({
                file: path.relative(backendRoot, full),
                snippet: call.slice(0, 200).replace(/\s+/g, ' '),
              });
            }
            i = j;
          }
        }
      }
    }

    walk(backendRoot);

    // After W442, the only remaining production unpinned call is
    // expected to be ZERO. If new violations appear, fail with the
    // file list so the developer knows exactly what to fix.
    if (violations.length > 0) {
      const list = violations.map(v => `  ${v.file}: ${v.snippet}`).join('\n');
      throw new Error(
        `Found ${violations.length} production jwt.verify call(s) missing algorithms allowlist:\n${list}\n\nAdd { algorithms: ['HS256'] } (or RS256/etc as appropriate) to pin the algorithm and close the alg-none + RS256/HS256-confusion attacks.`
      );
    }
    expect(violations.length).toBe(0);
  });
});
