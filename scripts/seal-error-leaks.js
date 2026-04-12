#!/usr/bin/env node
/**
 * Error Leak Sealer — Priority #33
 * Converts raw res.status(500).json(...) patterns to safeError(res, err, 'context')
 *
 * Handles 3 patterns:
 * A) logger.error('ctx', error); res.status(500).json({...}); → safeError(res, error, 'ctx');
 * B) res.status(500).json({ success: false, message: '...' }); → safeError(res, error, 'ctx');
 * C) res.status(500).json({ ..., message: safeError(err) }); → safeError(res, err, 'ctx');
 *
 * Usage: node scripts/seal-error-leaks.js [--dry-run] [--file path]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_FILE = process.argv.find((a, i) => process.argv[i - 1] === '--file');

function walk(dir) {
  let results = [];
  try {
    for (const entry of fs.readdirSync(dir)) {
      if (['_archived', '_backup_god_files', 'node_modules', '.git', 'tests'].includes(entry)) continue;
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) results = results.concat(walk(full));
      else if (entry.endsWith('.js')) results.push(full);
    }
  } catch (e) {
    /* skip */
  }
  return results;
}

function getContext(filePath) {
  const name = path.basename(filePath, '.js');
  // Extract meaningful context name
  if (name.includes('.routes')) return name.replace('.routes', '');
  if (name.includes('.controller')) return name.replace('.controller', '');
  if (name.includes('-routes')) return name.replace('-routes', '');
  return name;
}

function getErrorVarName(lines, lineIndex) {
  // Look at the catch block above to find the error variable name
  for (let i = lineIndex; i >= Math.max(0, lineIndex - 5); i--) {
    const m = lines[i].match(/}\s*catch\s*\(\s*(\w+)\s*\)/);
    if (m) return m[1];
  }
  return 'error'; // default
}

function processFile(filePath) {
  // Skip safeError.js itself — the res.status(500).json there is the IMPLEMENTATION
  if (path.basename(filePath) === 'safeError.js') return { changed: false };

  const content = fs.readFileSync(filePath, 'utf8');

  // Skip if no leaks
  if (!content.includes('res.status(500).json')) return { changed: false };

  const lines = content.split('\n');
  const ctx = getContext(filePath);
  const changes = [];
  let hasSafeErrorImport =
    content.includes('require') && (content.includes('safeError') || content.includes('safe-error') || content.includes('safeError.js'));

  let newLines = [...lines];
  let linesToRemove = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('res.status(500).json')) continue;

    const errorVar = getErrorVarName(lines, i);
    const indent = line.match(/^(\s*)/)[1];

    // Check if previous line has logger.error — if so, remove it (safeError does logging)
    const prevLine = i > 0 ? lines[i - 1] : '';
    let loggerContext = ctx;

    if (prevLine.trim().startsWith('logger.error(')) {
      // Extract context from logger.error('context:', ...)
      const logCtx = prevLine.match(/logger\.error\(\s*['"]([^'"]+)['"]/);
      if (logCtx) {
        loggerContext = logCtx[1].replace(/[:\s]+$/, '').replace(/^Error\s*/i, '');
      }
      linesToRemove.add(i - 1);
    }

    // Pattern C: message: safeError(err) — already using safeError but wrong
    if (line.includes('message: safeError(')) {
      const safeCallMatch = line.match(/safeError\((\w+)\)/);
      const errV = safeCallMatch ? safeCallMatch[1] : errorVar;
      newLines[i] = `${indent}safeError(res, ${errV}, '${loggerContext}');`;
      changes.push({ line: i + 1, type: 'C', old: line.trim() });
      continue;
    }

    // Pattern A & B: res.status(500).json({ success: false, message: '...' })
    newLines[i] = `${indent}safeError(res, ${errorVar}, '${loggerContext}');`;
    changes.push({ line: i + 1, type: prevLine.trim().startsWith('logger.error(') ? 'A' : 'B', old: line.trim() });
  }

  if (changes.length === 0) return { changed: false };

  // Remove logger.error lines (process in reverse order)
  const sortedRemoves = [...linesToRemove].sort((a, b) => b - a);
  for (const idx of sortedRemoves) {
    newLines.splice(idx, 1);
  }

  // Add safeError import if not present
  let finalContent = newLines.join('\n');
  if (!hasSafeErrorImport && changes.length > 0) {
    // Find a good place to add the import — after the last require statement
    const requireLines = [];
    const fl = finalContent.split('\n');
    for (let i = 0; i < Math.min(50, fl.length); i++) {
      if (fl[i].includes('require(')) requireLines.push(i);
    }
    if (requireLines.length > 0) {
      const lastReq = requireLines[requireLines.length - 1];
      fl.splice(lastReq + 1, 0, `const safeError = require('${getRelativeSafeErrorPath(filePath)}');`);
      finalContent = fl.join('\n');
    }
  }

  return { changed: true, content: finalContent, changes, loggerLinesRemoved: linesToRemove.size };
}

function getRelativeSafeErrorPath(filePath) {
  const fileDir = path.dirname(filePath);
  const safeErrorPath = path.join(process.cwd(), 'backend', 'utils', 'safeError');
  let rel = path.relative(fileDir, safeErrorPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// Main
const backendDir = path.join(process.cwd(), 'backend');
const files = SINGLE_FILE ? [path.resolve(SINGLE_FILE)] : walk(backendDir);

let totalChanges = 0;
let totalFiles = 0;
let totalLoggerRemoved = 0;

for (const file of files) {
  const result = processFile(file);
  if (result.changed) {
    totalFiles++;
    totalChanges += result.changes.length;
    totalLoggerRemoved += result.loggerLinesRemoved || 0;

    const rel = file.replace(process.cwd() + path.sep, '');
    console.log(
      `${DRY_RUN ? '[DRY] ' : ''}${rel}: ${result.changes.length} leaks sealed (${result.loggerLinesRemoved || 0} logger lines removed)`,
    );

    if (!DRY_RUN) {
      fs.writeFileSync(file, result.content, 'utf8');
    }
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files processed: ${totalFiles}`);
console.log(`Error leaks sealed: ${totalChanges}`);
console.log(`Logger lines consolidated: ${totalLoggerRemoved}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes written)' : 'LIVE (changes applied)'}`);
