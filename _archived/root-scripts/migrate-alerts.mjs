/**
 * Migration script: Replace alert() with useSnackbar() hook
 * Run: node migrate-alerts.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const root = process.cwd() + '/frontend/src';
const results = [];
let totalFiles = 0;
let totalReplacements = 0;

// Severity detection from message content
function detectSeverity(alertContent) {
  const s = alertContent.toLowerCase();
  if (s.includes('نجاح') || s.includes('success') || s.includes('تم ') || s.includes('تمت ')) return 'success';
  if (s.includes('فشل') || s.includes('خطأ') || s.includes('fail') || s.includes('error') || s.includes('invalid')) return 'error';
  if (s.includes('قيد التطوير') || s.includes('تنزيل') || s.includes('download')) return 'info';
  if (s.includes('يرجى') || s.includes('please')) return 'warning';
  return 'info';
}

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip _archive, __tests__, node_modules
      if (entry.startsWith('_') || entry === '__tests__' || entry === 'node_modules') continue;
      walk(full);
    } else if (/\.(js|jsx)$/.test(entry)) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');

  // Match alert('...') or alert("...") or alert(`...`) or window.alert(...)
  // But NOT setSelectedAlert or other function names containing 'alert'
  const alertRegex = /(?:window\.)?alert\s*\(/g;

  // Count real alert() calls (not property/method names that contain 'alert')
  let realAlerts = 0;
  const lines = content.split('\n');
  for (const line of lines) {
    // Skip lines where alert is part of a larger identifier (setSelectedAlert, sendAlert, etc)
    const trimmed = line.trim();
    if (
      /(?:^|[^a-zA-Z_$])(?:window\.)?alert\s*\(/.test(trimmed) &&
      !trimmed.includes('setSelectedAlert') &&
      !trimmed.includes('sendSecurityEmailAlert') &&
      !trimmed.includes('AlertTitle') &&
      !trimmed.includes('SecurityAlert')
    ) {
      realAlerts++;
    }
  }

  if (realAlerts === 0) return;

  const hasSnackbarImport = /import\s+\{[^}]*useSnackbar[^}]*\}\s+from/.test(content);

  // Replace alert() calls
  let replacementCount = 0;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Skip false positives
    if (trimmed.includes('setSelectedAlert') || trimmed.includes('sendSecurityEmailAlert') || trimmed.includes('AlertTitle')) {
      newLines.push(line);
      continue;
    }

    // Match alert('message') or alert("message") or alert(`message`)
    // Also handle window.alert(...)
    const alertMatch = line.match(/(?:window\.)?alert\s*\(([\s\S]*?)\)\s*;?/);
    if (alertMatch) {
      const fullMatch = alertMatch[0];
      const argContent = alertMatch[1].trim();

      // Determine severity from the alert message content
      const severity = detectSeverity(argContent);

      // Handle multi-arg or complex expressions
      // For simple string alerts: alert('msg') -> showSnackbar('msg', 'severity')
      // For expression alerts: alert(expr) -> showSnackbar(expr, 'severity')

      let replacement;
      if (fullMatch.endsWith(';')) {
        replacement = `showSnackbar(${argContent}, '${severity}');`;
      } else {
        replacement = `showSnackbar(${argContent}, '${severity}')`;
      }

      line = line.replace(/(?:window\.)?alert\s*\(([\s\S]*?)\)\s*;?/, replacement);
      replacementCount++;
    }

    newLines.push(line);
  }

  if (replacementCount === 0) return;

  content = newLines.join('\n');

  // Add import and hook declaration if not present
  if (!hasSnackbarImport) {
    // Add import after last import
    const contentLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < contentLines.length; i++) {
      if (/^\s*import\s+/.test(contentLines[i])) {
        lastImportIndex = i;
        // Handle multi-line imports
        while (
          i < contentLines.length &&
          !contentLines[i].includes(';') &&
          !contentLines[i].includes("from '") &&
          !contentLines[i].includes('from "')
        ) {
          i++;
          lastImportIndex = i;
        }
      }
    }

    if (lastImportIndex >= 0) {
      contentLines.splice(lastImportIndex + 1, 0, "import { useSnackbar } from 'contexts/SnackbarContext';");
      content = contentLines.join('\n');
    }

    // Add hook call inside the component function
    // Find the first line that matches: function ComponentName or const ComponentName =
    // and then find the first { or => { after it
    // Then add const showSnackbar = useSnackbar(); after the opening

    const hookLine = '  const showSnackbar = useSnackbar();';
    const funcPatterns = [
      // export default function Name() {
      /^(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/m,
      // function Name() {
      /^(function\s+\w+\s*\([^)]*\)\s*\{)/m,
      // const Name = () => {
      /^((?:export\s+)?const\s+\w+\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>\s*\{)/m,
    ];

    let hookInserted = false;
    for (const pattern of funcPatterns) {
      const match = content.match(pattern);
      if (match) {
        // Insert after the opening brace of the component
        const idx = content.indexOf(match[0]);
        const braceIdx = content.indexOf('{', idx);
        if (braceIdx !== -1) {
          // Find end of line after opening brace
          const endOfLine = content.indexOf('\n', braceIdx);
          if (endOfLine !== -1) {
            content = content.slice(0, endOfLine + 1) + hookLine + '\n' + content.slice(endOfLine + 1);
            hookInserted = true;
            break;
          }
        }
      }
    }

    // If no function pattern matched, try to find useState or useEffect as anchor
    if (!hookInserted) {
      const stateMatch = content.match(/^(\s*const\s+\[.*?\]\s*=\s*useState)/m);
      if (stateMatch) {
        const idx = content.indexOf(stateMatch[0]);
        content = content.slice(0, idx) + hookLine + '\n' + content.slice(idx);
        hookInserted = true;
      }
    }
  }

  writeFileSync(filePath, content, 'utf8');

  const rel = relative(root, filePath).replace(/\\/g, '/');
  totalFiles++;
  totalReplacements += replacementCount;
  results.push(`${rel}: ${replacementCount} alert(s) replaced`);
}

// Process pages/ and components/
const dirs = ['pages', 'components'];
for (const dir of dirs) {
  const fullDir = join(root, dir);
  try {
    walk(fullDir);
  } catch (e) {
    console.error(`${dir}/ error:`, e.message);
  }
}

console.log(`Files modified: ${totalFiles}`);
console.log(`Total alert() replaced: ${totalReplacements}`);
console.log('---');
results.forEach(r => console.log(r));
