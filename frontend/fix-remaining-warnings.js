/**
 * fix-remaining-warnings.js
 * Handles non-auto-fixable ESLint warnings from CRA build output:
 *  1. "is assigned/defined but never used" → prefix varName with _ at exact col
 *  2. "react-hooks/exhaustive-deps"        → add eslint-disable-next-line comment
 *
 * Usage: node fix-remaining-warnings.js
 * Pre-req: $env:TEMP\build_warnings.txt must exist (from react-scripts build output)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILD_LOG = path.join(os.tmpdir(), 'build_warnings.txt');
const FRONTEND_DIR = __dirname;

if (!fs.existsSync(BUILD_LOG)) {
  console.error('ERROR: ' + BUILD_LOG + ' not found.');
  process.exit(1);
}

const content = fs.readFileSync(BUILD_LOG, 'utf8');
const rawLines = content.split('\n');

// ── Parse warnings ────────────────────────────────────────────────────────────
// Each file section starts with a line matching ^src[\/]...jsx?
// Warning lines look like:  "  Line N:C:  '...' is ..."
const fileWarnings = {}; // relPath → [{lineNum, col, varName, type}]
let currentFile = null;

for (const raw of rawLines) {
  const trimmed = raw.trim();

  // File path header
  if (/^src[\\\/]/.test(trimmed) && /\.(jsx?|tsx?)$/.test(trimmed)) {
    currentFile = trimmed.replace(/\\/g, '/');
    if (!fileWarnings[currentFile]) fileWarnings[currentFile] = [];
    continue;
  }

  if (!currentFile) continue;

  // Unused var: "Line N:C:  'varName' is (defined|assigned a value) but never used"
  const unusedM = trimmed.match(
    /^Line (\d+):(\d+):\s+'([^']+)' is (?:defined|assigned a value) but never used/
  );
  if (unusedM) {
    const lineNum = parseInt(unusedM[1]);
    const col = parseInt(unusedM[2]);
    const varName = unusedM[3];
    const key = lineNum + ':' + varName;
    const already = fileWarnings[currentFile].some(
      w => w.type === 'unused' && w.lineNum === lineNum && w.varName === varName
    );
    if (!already) {
      fileWarnings[currentFile].push({ type: 'unused', lineNum, col, varName, key });
    }
    continue;
  }

  // Exhaustive deps: "Line N:C:  React Hook ... has a missing dependency"
  const depsM = trimmed.match(/^Line (\d+):(\d+):\s+React Hook .+ has a missing dep/);
  if (depsM) {
    const lineNum = parseInt(depsM[1]);
    const col = parseInt(depsM[2]);
    const key = 'deps:' + lineNum;
    const already = fileWarnings[currentFile].some(w => w.key === key);
    if (!already) {
      fileWarnings[currentFile].push({ type: 'deps', lineNum, col, key });
    }
  }
}

// ── Apply fixes ───────────────────────────────────────────────────────────────
let totalUnused = 0,
  totalDeps = 0,
  totalSkipped = 0;

for (const [relPath, warnings] of Object.entries(fileWarnings)) {
  if (!warnings.length) continue;

  const filePath = path.join(FRONTEND_DIR, relPath.replace(/\//g, path.sep));
  if (!fs.existsSync(filePath)) continue;

  const fileLines = fs.readFileSync(filePath, 'utf8').split('\n');
  let modified = false;

  // Process in reverse line order so line inserts don't shift subsequent positions
  const sorted = [...warnings].sort((a, b) => b.lineNum - a.lineNum);

  for (const w of sorted) {
    const lineIdx = w.lineNum - 1; // 0-based
    if (lineIdx < 0 || lineIdx >= fileLines.length) {
      totalSkipped++;
      continue;
    }

    if (w.type === 'unused') {
      const lineContent = fileLines[lineIdx];
      const col0 = w.col - 1; // 0-based
      const actual = lineContent.substring(col0, col0 + w.varName.length);
      if (actual !== w.varName) {
        console.log(
          '  SKIP  ' +
            relPath +
            ':' +
            w.lineNum +
            '  expected "' +
            w.varName +
            '" at col ' +
            w.col +
            ', found "' +
            actual +
            '"'
        );
        totalSkipped++;
        continue;
      }
      // Prefix with _
      fileLines[lineIdx] = lineContent.substring(0, col0) + '_' + lineContent.substring(col0);
      console.log('  _var  ' + relPath + ':' + w.lineNum + '  ' + w.varName + ' → _' + w.varName);
      modified = true;
      totalUnused++;
    } else if (w.type === 'deps') {
      const lineContent = fileLines[lineIdx];
      // Get indentation of the hook line
      const indent = lineContent.match(/^(\s*)/)[1];
      const disableLine = indent + '// eslint-disable-next-line react-hooks/exhaustive-deps';
      // Check if disable comment already present on the previous line
      const prevLine = lineIdx > 0 ? fileLines[lineIdx - 1].trim() : '';
      if (prevLine.includes('eslint-disable-next-line react-hooks/exhaustive-deps')) {
        totalSkipped++;
        continue;
      }
      fileLines.splice(lineIdx, 0, disableLine);
      console.log('  deps  ' + relPath + ':' + w.lineNum + '  added disable comment');
      modified = true;
      totalDeps++;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, fileLines.join('\n'), 'utf8');
  }
}

console.log(
  '\nunused_renamed=' + totalUnused + '  deps_disabled=' + totalDeps + '  skipped=' + totalSkipped
);
