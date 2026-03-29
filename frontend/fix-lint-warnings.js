/**
 * Fix ESLint unused-import warnings automatically
 * Removes specific unused imports from listed files
 */
const fs = require('fs');
const path = require('path');

const base = __dirname;

function removeUnusedImport(filePath, symbolName) {
  const fullPath = path.join(base, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${filePath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const before = content;

  // Remove from import line: { A, B, Unused, C } -> { A, B, C }
  // Handle: "Unused, " at start or middle
  content = content.replace(new RegExp(`\\b${symbolName}\\b,\\s*`, 'g'), '');
  // Handle: ", Unused" at end
  content = content.replace(new RegExp(`,\\s*\\b${symbolName}\\b`, 'g'), '');
  // Handle: "{ Unused }" alone -> entire import line removed
  content = content.replace(
    new RegExp(`import\\s*\\{\\s*\\b${symbolName}\\b\\s*\\}[^;]+;\\n?`, 'g'),
    ''
  );
  // Handle standalone variable usage if it's just a standalone symbol after assignment
  // e.g. const { x, unused } = ... -> const { x } = ...
  content = content.replace(new RegExp(`\\b${symbolName}\\b,\\s*`, 'g'), '');
  content = content.replace(new RegExp(`,\\s*\\b${symbolName}\\b`, 'g'), '');

  if (content !== before) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  FIXED: ${filePath} (removed ${symbolName})`);
  } else {
    console.log(
      `  NO CHANGE: ${filePath} (${symbolName} - pattern not matched, may need manual fix)`
    );
  }
}

const fixes = [
  // sidebarNavConfig.jsx
  ['src/components/Layout/sidebar/sidebarNavConfig.jsx', 'InvoiceIcon'],
  // SignaturePad.jsx
  ['src/components/common/SignaturePad.jsx', 'ButtonGroup'],
  // DashboardSections.jsx
  ['src/components/dashboard/AdvancedDashboard/DashboardSections.jsx', 'Typography'],
  ['src/components/dashboard/AdvancedDashboard/DashboardSections.jsx', 'Chip'],
  ['src/components/dashboard/AdvancedDashboard/DashboardSections.jsx', 'Stack'],
  ['src/components/dashboard/AdvancedDashboard/DashboardSections.jsx', 'AutoAwesomeIcon'],
  // ProDashboardLayout.jsx
  ['src/components/dashboard/AdvancedDashboard/ProDashboardLayout.jsx', 'Paper'],
  ['src/components/dashboard/AdvancedDashboard/ProDashboardLayout.jsx', 'Zoom'],
  // AdvancedAnalyticsPanel.jsx
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'LinearProgress'],
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'PieChartIcon'],
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'RadarIcon'],
  ['src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', 'FullscreenIcon'],
  // CalendarEventsWidget.jsx
  ['src/components/dashboard/pro/CalendarEventsWidget.jsx', 'Button'],
  ['src/components/dashboard/pro/CalendarEventsWidget.jsx', 'Badge'],
  ['src/components/dashboard/pro/CalendarEventsWidget.jsx', 'ListItemSecondaryAction'],
  ['src/components/dashboard/pro/CalendarEventsWidget.jsx', 'TodayIcon'],
  // DashboardCustomizer.jsx
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'Paper'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'Tooltip'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'Select'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'MenuItem'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'AnimatePresence'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'VisibilityIcon'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'VisibilityOffIcon'],
  ['src/components/dashboard/pro/DashboardCustomizer.jsx', 'DragIndicatorIcon'],
  // NotificationCenter.jsx
  ['src/components/dashboard/pro/NotificationCenter.jsx', 'Switch'],
  ['src/components/dashboard/pro/NotificationCenter.jsx', 'NotifIcon'],
  // CreditDebitNotes.js
  ['src/pages/finance/CreditDebitNotes.js', 'NoteIcon'],
];

console.log('Fixing ESLint unused-import warnings...\n');
for (const [filePath, symbol] of fixes) {
  removeUnusedImport(filePath, symbol);
}
console.log('\nDone!');
