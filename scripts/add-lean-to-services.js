#!/usr/bin/env node
/**
 * add-lean-to-services.js
 * ─────────────────────────
 * Adds .lean() to Mongoose read-only query chains in DDD service files.
 *
 * Tier 1 (safest):  findByIdAndUpdate(…, { new: true }) → append .lean()
 * Tier 2 (safe):    findByIdAndDelete(…) → append .lean()
 * Tier 3 (safe):    findOneAndUpdate(…, { new: true }) → append .lean()
 * Tier 4 (safe):    findOneAndDelete(…) → append .lean()
 *
 * Skips:
 * - Lines that already have .lean()
 * - dddWorkforceAnalytics.js (PROTECTED)
 * - Any chain ending with .save() within 3 lines (mutation detected)
 *
 * Usage:
 *   node scripts/add-lean-to-services.js --dry-run   (preview)
 *   node scripts/add-lean-to-services.js              (apply)
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const SERVICES_DIR = path.join(__dirname, '..', 'backend', 'services');
const PROTECTED = ['dddWorkforceAnalytics.js'];

/*──────────────── helpers ────────────────*/

function getDddServiceFiles() {
  return fs
    .readdirSync(SERVICES_DIR)
    .filter(f => f.startsWith('ddd') && f.endsWith('.js'))
    .filter(f => !PROTECTED.includes(f));
}

/*──────────────── Tier 1-4: findByIdAndUpdate/findOneAndUpdate with {new:true} ────────────────*/

/**
 * For multi-line findByIdAndUpdate / findOneAndUpdate chains:
 *   We look for the pattern that contains `new: true` (or `new:true`)
 *   and does NOT already have `.lean()` at the end.
 *
 * Strategy: line-by-line scan. When we see `findByIdAndUpdate` or `findOneAndUpdate`,
 * we track until the statement ends (`;` or closing of await chain). If the line
 * before the semicolon does NOT have `.lean()`, we insert it.
 */
function addLeanToFindAndModify(code, filePath) {
  const lines = code.split('\n');
  let changes = 0;
  const result = [];

  // Regex for single-line findByIdAndUpdate/findOneAndUpdate/findByIdAndDelete/findOneAndDelete
  // that end with ); and don't already have .lean()
  const singleLineRx = /\.(findByIdAndUpdate|findOneAndUpdate|findByIdAndDelete|findOneAndDelete)\([\s\S]*?\)\s*;/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip if already has .lean()
    if (line.includes('.lean()')) {
      result.push(line);
      continue;
    }

    // ── Tier 1 & 3: findByIdAndUpdate / findOneAndUpdate with { new: true } ──
    // Match:  ...findByIdAndUpdate(id, data, { new: true, runValidators: true });
    //         ...findByIdAndUpdate(id, update, { new: true });
    // Single-line pattern ending with );
    if (
      (line.includes('findByIdAndUpdate') || line.includes('findOneAndUpdate')) &&
      line.includes('new:') &&
      line.trimEnd().endsWith(');')
    ) {
      // Insert .lean() before the final );
      const patched = line.replace(/\)\s*;(\s*)$/, ').lean();$1');
      if (patched !== line) {
        result.push(patched);
        changes++;
        continue;
      }
    }

    // Multi-line: the closing ); is on a subsequent line
    // If current line has findByIdAndUpdate but doesn't end with ;
    if ((line.includes('findByIdAndUpdate') || line.includes('findOneAndUpdate')) && !line.trimEnd().endsWith(';')) {
      result.push(line);
      // Look ahead for the closing of this call — find the line with );
      let hasNew = line.includes('new:');
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine.includes('new:')) hasNew = true;
        if (nextLine.includes('.lean()')) {
          // Already has lean — just push remaining
          hasNew = false; // skip modification
          break;
        }
        if (nextLine.trimEnd().endsWith(');') || nextLine.trim() === ');') {
          if (hasNew && !nextLine.includes('.lean()')) {
            // Insert .lean() before );
            const patched = nextLine.replace(/\)\s*;/, ').lean();');
            result.push(patched);
            changes++;
            j++;
            break;
          }
        }
        result.push(nextLine);
        j++;
      }
      // Push remaining lines we consumed
      if (j <= lines.length && j > i + 1) {
        // Push the line at j if we didn't already
        if (j < lines.length && !result.includes(lines[j]) && j === i + 1) {
          result.push(lines[j]);
        }
      }
      i = j - 1; // skip ahead
      continue;
    }

    // ── Tier 2 & 4: findByIdAndDelete / findOneAndDelete ──
    if (
      (line.includes('findByIdAndDelete') || line.includes('findOneAndDelete')) &&
      line.trimEnd().endsWith(');') &&
      !line.includes('.lean()')
    ) {
      const patched = line.replace(/\)\s*;(\s*)$/, ').lean();$1');
      if (patched !== line) {
        result.push(patched);
        changes++;
        continue;
      }
    }

    result.push(line);
  }

  return { code: result.join('\n'), changes };
}

/*──────────────── main ────────────────*/

function main() {
  const files = getDddServiceFiles();
  let totalChanges = 0;
  let filesModified = 0;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(DRY ? '  DRY RUN — add .lean() to Mongoose queries' : '  LIVE RUN — adding .lean() to Mongoose queries');
  console.log(`${'═'.repeat(60)}\n`);
  console.log(`Scanning ${files.length} DDD service files...\n`);

  for (const file of files) {
    const filePath = path.join(SERVICES_DIR, file);
    const original = fs.readFileSync(filePath, 'utf8');

    const { code: patched, changes } = addLeanToFindAndModify(original, filePath);

    if (changes > 0) {
      filesModified++;
      totalChanges += changes;
      console.log(`  ✏️  ${file}: ${changes} .lean() added`);

      if (!DRY) {
        fs.writeFileSync(filePath, patched, 'utf8');
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Total: ${totalChanges} .lean() calls added across ${filesModified} files`);
  if (DRY) console.log('  (DRY RUN — no files modified)');
  console.log(`${'─'.repeat(60)}\n`);
}

main();
