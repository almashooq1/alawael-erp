// W411 — defensive-guard drift guard for backend/models/.
//
// Ratchets in the cleanup landed in commits 1aa4c2457, dd3d9e31e,
// 0fe5dcc4b, 0e8e025c2 (May 2026): every Mongoose model exported from
// backend/models/ (any depth, any .js file) must use the defensive idiom
//
//     module.exports = mongoose.models.X || mongoose.model('X', schema);
//
// instead of the naked
//
//     module.exports = mongoose.model('X', schema);
//
// Why this matters:
//   - Test isolation + hot-reload can require the same model file twice in
//     one process. The naked form throws OverwriteModelError on the second
//     load. The defensive form is load-order-independent.
//   - This guard is the FORWARD-PROTECTION counterpart to W340 (which
//     catches duplicate registration ACROSS files). W340 catches the
//     OverwriteModelError class at the multi-file boundary; W411 catches
//     it at the single-file double-load boundary.
//
// SCOPE: only backend/models/ (the canonical models directory).
//   - supply-chain-management/backend/models/ is a separate sub-module
//     with its own loader pattern and is explicitly out of scope.
//   - Service-side inline `const X = mongoose.model(...)` registrations
//     (rehabilitation-services / etc.) are covered by W340's duplicate
//     detection and ratcheted manually per file.
//
// BASELINE: the current baseline is EMPTY. Adding ANY new naked
// `module.exports = mongoose.model(...)` in backend/models/ will fail CI
// immediately. If a file legitimately needs the naked form (very rare),
// add it to KNOWN_NAKED_EXPORTS below with a documented justification.

'use strict';

const fs = require('fs');
const path = require('path');

const MODELS_ROOT = path.resolve(__dirname, '..', 'models');

// Empty baseline — ratchet stays at zero post-cleanup. To add an entry,
// document WHY the naked form is required (e.g. dynamic schema, per-connection
// registration that's intentionally NOT cached on the global model registry).
const KNOWN_NAKED_EXPORTS = new Set([
  // (empty — keep it that way)
]);

const NAKED_EXPORT_RE = /^\s*module\.exports\s*=\s*mongoose\.model\s*\(/m;

/**
 * Recursively collect .js files under dir, skipping node_modules + dotdirs.
 */
function collectJsFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

describe('W411 — backend/models/** must use defensive guard idiom', () => {
  const modelFiles = collectJsFiles(MODELS_ROOT);

  it('finds at least 50 model files (sanity check)', () => {
    expect(modelFiles.length).toBeGreaterThanOrEqual(50);
  });

  it('no NEW naked `module.exports = mongoose.model(...)` outside baseline', () => {
    const violations = [];
    for (const file of modelFiles) {
      const rel = path.relative(MODELS_ROOT, file).replace(/\\/g, '/');
      if (KNOWN_NAKED_EXPORTS.has(rel)) continue;
      const src = fs.readFileSync(file, 'utf8');
      if (NAKED_EXPORT_RE.test(src)) {
        violations.push(rel);
      }
    }
    if (violations.length > 0) {
      const msg =
        `Found ${violations.length} naked \`module.exports = mongoose.model(...)\` ` +
        `registration(s) in backend/models/. Use the defensive idiom:\n` +
        `    module.exports = mongoose.models.X || mongoose.model('X', schema);\n` +
        `Files:\n  - ${violations.join('\n  - ')}`;
      throw new Error(msg);
    }
    expect(violations).toEqual([]);
  });

  it('every KNOWN_NAKED_EXPORTS entry still resolves to a real file', () => {
    const stale = [];
    for (const rel of KNOWN_NAKED_EXPORTS) {
      const full = path.join(MODELS_ROOT, rel);
      if (!fs.existsSync(full)) {
        stale.push(rel);
      }
    }
    if (stale.length > 0) {
      throw new Error(
        `KNOWN_NAKED_EXPORTS contains ${stale.length} stale entry/entries ` +
          `that no longer match a real file (remove them):\n  - ${stale.join('\n  - ')}`
      );
    }
    expect(stale).toEqual([]);
  });
});
