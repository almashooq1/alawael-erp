import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const root = process.cwd() + '/frontend/src';
const results = [];
let totalFiles = 0;
let totalReplacements = 0;

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(js|jsx)$/.test(entry)) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');

  const errorCount = (content.match(/console\.error\(/g) || []).length;
  const warnCount = (content.match(/console\.warn\(/g) || []).length;

  if (errorCount === 0 && warnCount === 0) return;

  const hasLoggerImport = /import\s+logger\s+from\s+['"]/.test(content);

  // Replace console.error( with logger.error( and console.warn( with logger.warn(
  content = content.replace(/console\.error\(/g, 'logger.error(');
  content = content.replace(/console\.warn\(/g, 'logger.warn(');

  // Add import if not already present
  if (!hasLoggerImport) {
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s+/.test(lines[i])) {
        // Handle multi-line imports
        lastImportIndex = i;
        while (i < lines.length && !lines[i].includes(';') && !lines[i].includes("from '") && !lines[i].includes('from "')) {
          i++;
          lastImportIndex = i;
        }
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, "import logger from 'utils/logger';");
      content = lines.join('\n');
    }
  }

  writeFileSync(filePath, content, 'utf8');

  const rel = relative(root, filePath).replace(/\\/g, '/');
  totalFiles++;
  totalReplacements += errorCount + warnCount;
  results.push(`${rel}: errors=${errorCount} warns=${warnCount} import_added=${!hasLoggerImport}`);
}

// Process pages/ and components/
const pagesDir = join(root, 'pages');
const componentsDir = join(root, 'components');

try {
  walk(pagesDir);
} catch (e) {
  console.error('pages/ error:', e.message);
}
try {
  walk(componentsDir);
} catch (e) {
  console.error('components/ error:', e.message);
}

console.log(`Files modified: ${totalFiles}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('---');
results.forEach(r => console.log(r));
