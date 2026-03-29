/**
 * Fix ESLint unused standalone import lines
 * Removes full `import X from '...'` lines for unused symbols
 */
const fs = require('fs');
const path = require('path');

const base = __dirname;

function removeStandaloneImport(filePath, symbolName) {
  const fullPath = path.join(base, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${filePath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const before = content;

  // Match: import SymbolName from '...anything...';  (whole line)
  const re = new RegExp(`^import ${symbolName} from ['"'][^'"]+['"'];?\\r?\\n`, 'm');
  content = content.replace(re, '');

  if (content !== before) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  FIXED: ${filePath} (removed standalone import ${symbolName})`);
  } else {
    console.log(`  NO CHANGE: ${filePath} (${symbolName})`);
  }
}

function removeNamedImportEntry(filePath, symbolName) {
  const fullPath = path.join(base, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${filePath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const before = content;

  // Remove from named imports line: { A, NoteAdd, B } or { NoteAdd }
  // Try removing ", NoteAdd" first (not at start)
  content = content.replace(new RegExp(`,\\s*${symbolName}\\b`, 'g'), '');
  // Then "NoteAdd, " (at start of named imports)
  content = content.replace(new RegExp(`\\b${symbolName},\\s*`, 'g'), '');

  if (content !== before) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  FIXED: ${filePath} (removed named import entry ${symbolName})`);
  } else {
    console.log(`  NO CHANGE: ${filePath} (${symbolName})`);
  }
}

const standaloneImports = [
  // DashboardSections.jsx
  ['src/components/dashboard/AdvancedDashboard/DashboardSections.jsx', 'AutoAwesomeIcon'],
  // AdvancedAnalyticsPanel.jsx
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'PieChartIcon'],
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'RadarIcon'],
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'FullscreenIcon'],
  // CalendarEventsWidget.jsx
  ['src/components/dashboard/pro/CalendarEventsWidget.jsx', 'TodayIcon'],
  // DashboardCustomizer.jsx
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'VisibilityIcon'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'VisibilityOffIcon'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'DragIndicatorIcon'],
  // NotificationCenter.jsx
  ['src/components/dashboard/pro/NotificationCenter.jsx', 'NotifIcon'],
];

// CreditDebitNotes - NoteAdd is named import entry
const namedImportFixes = [['src/pages/finance/CreditDebitNotes.js', 'NoteAdd']];

console.log('Fixing standalone import lines...\n');
for (const [filePath, symbol] of standaloneImports) {
  removeStandaloneImport(filePath, symbol);
}

console.log('\nFixing named import entries...\n');
for (const [filePath, symbol] of namedImportFixes) {
  removeNamedImportEntry(filePath, symbol);
}

console.log('\nDone!');
