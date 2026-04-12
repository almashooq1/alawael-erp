/**
 * Archive Dead Small Files (50–1000 lines, 0 references)
 * ══════════════════════════════════════════════════════════════════════════
 * Priority #21 — Finds unreferenced JS files in backend/ and archives them.
 *
 * Usage:
 *   node scripts/archive-dead-small-files.js              # dry-run (report)
 *   node scripts/archive-dead-small-files.js --archive    # actually archive
 *
 * Safety: Excludes node_modules, _archived, .git, tests/unit/ (active tests),
 *         and any file whose basename appears in another file.
 * ══════════════════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'backend');
const ARCHIVE_DIR = path.join(ROOT, '_archived', 'dead-small-files');
const doArchive = process.argv.includes('--archive');

// Directories to skip entirely
const SKIP_DIRS = new Set(['node_modules', '_archived', '.git', 'coverage']);

// Directories whose files should NEVER be archived (critical infrastructure)
const PROTECTED_DIRS = new Set([
  'tests', // active test suites in tests/unit/
  'startup', // app startup modules
  'config', // configuration
  'base', // BaseCrudService, BaseDomainModule
]);

// Specific files to never archive
const PROTECTED_FILES = new Set([
  'app.js',
  'server.js',
  'jest.setup.js',
  'jest.config.js',
  '_registry.js',
  'ddd-loader.js',
  'platform.routes.js',
  'auth.js',
  'validate.js',
  'validateObjectId.js',
  'safeError.js',
  'database.js',
  'database.optimization.js',
  'dddWorkforceAnalytics.js', // user-protected file
]);

function walk(dir) {
  let files = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        files = files.concat(walk(fp));
      } else if (entry.name.endsWith('.js')) {
        files.push(fp);
      }
    }
  } catch (e) {
    /* permission errors etc */
  }
  return files;
}

// Build file list
const allFiles = walk(ROOT);
console.log(`Total active JS files: ${allFiles.length}`);

// Build global reference index: for each file, index all tokens that could be references
console.log('Building reference index...');
const refIndex = new Map(); // basename-without-ext → Set of files that mention it
for (const fp of allFiles) {
  const content = fs.readFileSync(fp, 'utf8');
  // We'll check candidates against this content later
  refIndex.set(fp, content);
}

// Find dead candidates
const candidates = [];
for (const fp of allFiles) {
  const rel = path.relative(ROOT, fp);
  const dirParts = rel.split(path.sep);
  const basename = path.basename(fp);
  const nameNoExt = basename.replace(/\.js$/, '');

  // Skip protected directories
  if (dirParts.some(d => PROTECTED_DIRS.has(d))) continue;

  // Skip protected files
  if (PROTECTED_FILES.has(basename)) continue;

  // Only consider files 50–1000 lines
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n').length;
  if (lines < 50 || lines > 1000) continue;

  // Check if any other file references this one
  let refs = 0;
  for (const [otherFp, otherContent] of refIndex) {
    if (otherFp === fp) continue;
    // Check if the basename (without .js) appears anywhere in the other file
    if (otherContent.includes(nameNoExt)) {
      refs++;
      break; // one ref is enough to mark as live
    }
  }

  if (refs === 0) {
    candidates.push({ fp, rel, lines });
  }
}

candidates.sort((a, b) => b.lines - a.lines);
const totalLines = candidates.reduce((s, c) => s + c.lines, 0);
console.log(`\nDead small files found: ${candidates.length} (${totalLines} lines)`);

// Group by top-level directory
const byDir = {};
for (const c of candidates) {
  const topDir = c.rel.split(path.sep)[0];
  if (!byDir[topDir]) byDir[topDir] = { count: 0, lines: 0 };
  byDir[topDir].count++;
  byDir[topDir].lines += c.lines;
}
console.log('\n=== BY DIRECTORY ===');
Object.entries(byDir)
  .sort((a, b) => b[1].lines - a[1].lines)
  .forEach(([d, s]) => console.log(`  ${d}: ${s.count} files, ${s.lines} lines`));

if (doArchive) {
  console.log('\n=== ARCHIVING ===');
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  let archived = 0,
    errors = 0;
  for (const c of candidates) {
    try {
      const dest = path.join(ARCHIVE_DIR, path.basename(c.fp));
      // Handle name collisions by prefixing with directory
      let finalDest = dest;
      if (fs.existsSync(dest)) {
        const prefix = c.rel.split(path.sep).slice(0, -1).join('_');
        finalDest = path.join(ARCHIVE_DIR, `${prefix}_${path.basename(c.fp)}`);
      }
      fs.renameSync(c.fp, finalDest);
      archived++;
    } catch (e) {
      errors++;
      console.error(`  FAIL: ${c.rel} — ${e.message}`);
    }
  }
  console.log(`Archived: ${archived}, Errors: ${errors}, Lines removed: ${totalLines}`);
} else {
  console.log('\n=== DRY RUN — use --archive to actually move files ===');
  console.log('Top 30 by size:');
  candidates.slice(0, 30).forEach(c => console.log(`  ${c.rel} (${c.lines}L)`));
}
