/**
 * CI Route Mount Guard Tests
 * ══════════════════════════════════════════════════════════════════════════
 * Asserts:
 *   1. No duplicate mount paths across _registry.js + all sub-registries
 *   2. All DDD route files on disk are registered in ddd-loader.js
 *   3. All entries in ddd-loader.js have matching route files on disk
 *
 * Priority #18 — Architecture improvement
 * ══════════════════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', '..', 'routes');
const registriesDir = path.join(routesDir, 'registries');

/**
 * Extract mount paths from a source file.
 * Handles both:
 *   dualMount(app, 'path', ...)        → /api/path
 *   safeMount(app, ['/api/path', ...]) → /api/path
 */
function extractMountPaths(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const mounts = [];

  // dualMount(app, 'some-path', ...) — extracts the second argument string
  const dualRe = /dualMount\s*\(\s*app\s*,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = dualRe.exec(src)) !== null) {
    // Skip lines that are clearly comments
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const line = src.slice(lineStart, m.index + m[0].length);
    if (/^\s*\/\//.test(line)) continue;
    mounts.push({ path: `/api/${m[1]}`, file: filePath, raw: m[0] });
  }

  // safeMount(app, ['/api/xxx', '/api/v1/xxx'], ...) — extract first array element
  const safeRe = /safeMount\s*\(\s*app\s*,\s*\[\s*['"]([^'"]+)['"]/g;
  while ((m = safeRe.exec(src)) !== null) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const line = src.slice(lineStart, m.index + m[0].length);
    if (/^\s*\/\//.test(line)) continue;
    mounts.push({ path: m[1], file: filePath, raw: m[0] });
  }

  return mounts;
}

describe('Route Mount Guard', () => {
  // ─── Test 1: No duplicate mount paths ──────────────────────────────────
  describe('No duplicate mount paths', () => {
    it('should have no unexpected duplicate mount paths across all registries', () => {
      const allFiles = [path.join(routesDir, '_registry.js')];

      // Add all sub-registries
      if (fs.existsSync(registriesDir)) {
        fs.readdirSync(registriesDir)
          .filter(f => f.endsWith('.registry.js'))
          .forEach(f => allFiles.push(path.join(registriesDir, f)));
      }

      const allMounts = [];
      for (const file of allFiles) {
        if (fs.existsSync(file)) {
          allMounts.push(...extractMountPaths(file));
        }
      }

      // Normalize to base path: /api/v1/xxx → /api/xxx
      const normalize = p => p.replace(/^\/api\/v1\//, '/api/');

      // Count occurrences of each normalized path
      const pathCounts = {};
      for (const mount of allMounts) {
        const norm = normalize(mount.path);
        if (!pathCounts[norm]) pathCounts[norm] = [];
        pathCounts[norm].push(path.basename(mount.file));
      }

      // Known intentional multi-mounts (sub-router merging)
      const allowedDuplicates = new Set([
        '/api/dashboard', // 3 sub-routers intentionally merged
      ]);

      const duplicates = {};
      for (const [mountPath, sources] of Object.entries(pathCounts)) {
        if (sources.length > 1 && !allowedDuplicates.has(mountPath)) {
          duplicates[mountPath] = sources;
        }
      }

      if (Object.keys(duplicates).length > 0) {
        const details = Object.entries(duplicates)
          .map(([p, s]) => `  ${p} (${s.length}x): ${s.join(', ')}`)
          .join('\n');
        fail(`Found ${Object.keys(duplicates).length} duplicate mount paths:\n${details}`);
      }
    });
  });

  // ─── Test 2: All DDD route files on disk are in ddd-loader.js ─────────
  describe('DDD route file coverage', () => {
    const loaderPath = path.join(routesDir, 'ddd-loader.js');
    const loaderSrc = fs.existsSync(loaderPath) ? fs.readFileSync(loaderPath, 'utf8') : '';

    // Extract file references from ddd-loader.js
    const loaderEntries = [];
    const entryRe = /file:\s*['"]\.\/([^'"]+)['"]/g;
    let m;
    while ((m = entryRe.exec(loaderSrc)) !== null) {
      loaderEntries.push(m[1]);
    }

    // Get all DDD route files on disk
    const dddFilesOnDisk = fs.existsSync(routesDir)
      ? fs.readdirSync(routesDir).filter(f => /^ddd-.*\.routes\.js$/.test(f))
      : [];

    it('should have all on-disk DDD route files registered in ddd-loader.js', () => {
      const loaderFileSet = new Set(loaderEntries.map(e => e + '.js'));
      const missing = dddFilesOnDisk.filter(f => !loaderFileSet.has(f));

      if (missing.length > 0) {
        fail(
          `${missing.length} DDD route file(s) on disk are NOT in ddd-loader.js:\n` +
            missing.map(f => `  ${f}`).join('\n')
        );
      }
    });

    it('should not have ghost entries in ddd-loader.js (files that no longer exist)', () => {
      const diskSet = new Set(dddFilesOnDisk.map(f => f.replace(/\.js$/, '')));
      const ghosts = loaderEntries.filter(e => !diskSet.has(e));

      if (ghosts.length > 0) {
        fail(
          `${ghosts.length} ddd-loader.js entry(ies) have no matching file on disk:\n` +
            ghosts.map(e => `  ${e}`).join('\n')
        );
      }
    });

    it('should have matching counts (on-disk files === loader entries)', () => {
      expect(dddFilesOnDisk.length).toBe(loaderEntries.length);
    });
  });
});
