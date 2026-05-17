/**
 * migrate-date-calls.js
 * Replaces hardcoded ar-SA date formatting calls with formatDate/formatDateTime
 * from utils/dateUtils across the React frontend pages and components.
 *
 * Run: node scripts/migrate-date-calls.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', 'frontend', 'src');
const DIRS = ['pages', 'components'];

// Regex patterns for date calls (not number formatting)
// Only match: new Date(...).toLocaleDateString('ar...') and new Date(...).toLocaleString('ar-SA')
const DATE_CALL = /new Date\(([^)]+)\)\.toLocaleDateString\('ar(?:-SA)?(?:-u-ca-[^']+)?'(?:,\s*\{[^}]*\})?\)/g;
const DATETIME_CALL = /new Date\(([^)]+)\)\.toLocaleString\('ar-SA'\)/g;

// Simple fmt helper patterns
const FMT_HELPER_DATE = /\bnew Date\(v\)\.toLocaleDateString\('ar-SA'\)/g;
const FMT_HELPER_DATE2 = /\bnew Date\(d\)\.toLocaleDateString\('ar-SA'\)/g;

// The import line to add
const IMPORT_DATE = "import { formatDate as _fmtDate, formatDateTime as _fmtDT } from 'utils/dateUtils';";
const IMPORT_DATE_ONLY = "import { formatDate as _fmtDate } from 'utils/dateUtils';";
const IMPORT_DT_ONLY = "import { formatDateTime as _fmtDT } from 'utils/dateUtils';";

function getAllFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(full));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function hasImportAlready(content) {
  return content.includes("from 'utils/dateUtils'") || content.includes('from "utils/dateUtils"');
}

function addImport(content, needsDate, needsDT) {
  if (hasImportAlready(content)) {
    // Check if _fmtDate/_fmtDT already imported
    const hasDate = content.includes('formatDate') || content.includes('_fmtDate');
    const hasDT = content.includes('formatDateTime') || content.includes('_fmtDT');
    if (hasDate && hasDT) return content;

    // Try to extend existing import
    content = content.replace(/import \{([^}]+)\} from 'utils\/dateUtils';/, (match, inner) => {
      const parts = inner
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (needsDate && !parts.some(p => p.includes('formatDate'))) parts.push('formatDate as _fmtDate');
      if (needsDT && !parts.some(p => p.includes('formatDateTime'))) parts.push('formatDateTime as _fmtDT');
      return `import { ${parts.join(', ')} } from 'utils/dateUtils';`;
    });
    return content;
  }

  // Find a good insertion point: after last import line
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportIdx = i;
  }

  let importLine;
  if (needsDate && needsDT) importLine = IMPORT_DATE;
  else if (needsDate) importLine = IMPORT_DATE_ONLY;
  else importLine = IMPORT_DT_ONLY;

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }
  return lines.join('\n');
}

let totalFixed = 0;
let filesChanged = 0;

for (const dir of DIRS) {
  const files = getAllFiles(path.join(ROOT, dir));

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Count what needs to be replaced
    const dateMatches = content.match(DATE_CALL) || [];
    const dtMatches = content.match(DATETIME_CALL) || [];

    // Filter out number toLocaleString (not new Date wrapped)
    // DATETIME_CALL already requires new Date() prefix

    if (dateMatches.length === 0 && dtMatches.length === 0) continue;

    // Skip blockchain pages that use 'ar-SA-u-ca-gregory' intentionally
    // (those are explicitly Gregorian overrides, leave them)

    // Replace toLocaleDateString calls
    content = content.replace(DATE_CALL, (match, inner) => {
      // Extract options if present
      const optMatch = match.match(/toLocaleDateString\('[^']+',\s*(\{[^}]*\})\)/);
      if (optMatch) {
        return `_fmtDate(${inner.trim()}, ${optMatch[1]})`;
      }
      return `_fmtDate(${inner.trim()})`;
    });

    // Replace toLocaleString date calls
    content = content.replace(DATETIME_CALL, (match, inner) => {
      return `_fmtDT(${inner.trim()})`;
    });

    if (content === original) continue;

    // Add imports if needed
    const needsDate = dateMatches.length > 0;
    const needsDT = dtMatches.length > 0;
    content = addImport(content, needsDate, needsDT);

    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ ${path.relative(ROOT, file)} (${dateMatches.length} date, ${dtMatches.length} datetime)`);
    totalFixed += dateMatches.length + dtMatches.length;
    filesChanged++;
  }
}

console.log(`\nDone: ${filesChanged} files, ${totalFixed} replacements`);
