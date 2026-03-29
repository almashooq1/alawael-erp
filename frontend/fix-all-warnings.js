/**
 * Comprehensive ESLint warning fixer
 * Handles: unused imports (named + standalone), prefer-const, unused destructured vars
 */
const fs = require('fs');
const path = require('path');
const base = __dirname;

function fix(filePath, fn) {
  const fullPath = path.join(base, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const before = content;
  content = fn(content);
  if (content !== before) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  ✓ FIXED: ${filePath}`);
  } else {
    console.log(`  = NO CHANGE: ${filePath}`);
  }
}

function removeNamedImports(content, symbols) {
  for (const sym of symbols) {
    content = content.replace(new RegExp(`,\\s*\\b${sym}\\b`, 'g'), '');
    content = content.replace(new RegExp(`\\b${sym}\\b,\\s*`, 'g'), '');
  }
  return content;
}

function removeStandaloneImports(content, symbols) {
  for (const sym of symbols) {
    content = content.replace(new RegExp(`^import ${sym} from ['"'][^'"]+['"];?\\r?\\n`, 'm'), '');
  }
  return content;
}

// ─── 1. ProDashboardLayout.jsx ───────────────────────────────────────
fix('src/components/dashboard/AdvancedDashboard/ProDashboardLayout.jsx', c => {
  // Remove lazy and Suspense from React import
  c = removeNamedImports(c, ['lazy', 'Suspense']);
  // Remove statusColors from theme/palette import
  c = removeNamedImports(c, ['statusColors']);
  // Fix unused arg: ({ id, ... }) → ({ _id, ... }) only if it's a function param destructure
  c = c.replace(/\(\{\s*id\s*,/, '({ _id,');
  // Fix isDark: const isDark = ... → const _isDark = ...
  c = c.replace(/\bconst isDark\b/, 'const _isDark');
  return c;
});

// ─── 2. AdvancedAnalyticsPanel.jsx ──────────────────────────────────
fix('src/components/dashboard/pro/AdvancedAnalyticsPanel.jsx', c => {
  // Fix unused arg i: (_, i) or (item, i) → (item, _i)
  c = c.replace(/\(([^,)]+),\s*i\s*\)/g, '($1, _i)');
  // Fix destructured: const { ..., finance, ..., charts } = ...
  c = c.replace(/\bfinance\b([^:])/, '_finance$1');
  c = c.replace(/\bcharts\b([^:])/, '_charts$1');
  return c;
});

// ─── 3. CalendarEventsWidget.jsx ────────────────────────────────────
fix('src/components/dashboard/pro/CalendarEventsWidget.jsx', c => {
  // Remove chartColors from theme import
  c = removeNamedImports(c, ['chartColors']);
  // Fix useMemo missing dep 'today' — add today to dependency arrays
  // Pattern: useMemo(..., []) missing today
  c = c.replace(/(useMemo\([^)]+\),\s*\[)(\])/g, '$1today$2');
  return c;
});

// ─── 4. DashboardCustomizer.jsx ─────────────────────────────────────
fix('src/components/dashboard/pro/DashboardCustomizer.jsx', c => {
  c = removeNamedImports(c, ['Chip', 'statusColors']);
  return c;
});

// ─── 5. NotificationCenter.jsx ──────────────────────────────────────
fix('src/components/dashboard/pro/NotificationCenter.jsx', c => {
  c = removeNamedImports(c, ['FormControlLabel', 'brandColors']);
  c = removeStandaloneImports(c, ['DeleteSweepIcon', 'FilterListIcon', 'CloseIcon']);
  return c;
});

// ─── 6. TaskManagerWidget.jsx ───────────────────────────────────────
fix('src/components/dashboard/pro/TaskManagerWidget.jsx', c => {
  c = removeNamedImports(c, ['Tooltip', 'Avatar', 'AvatarGroup', 'Badge', 'Menu', 'MenuItem']);
  c = removeStandaloneImports(c, [
    'FilterListIcon',
    'MoreVertIcon',
    'FlagIcon',
    'CalendarTodayIcon',
    'EditIcon',
    'DragIndicatorIcon',
  ]);
  return c;
});

// ─── 7. UserProductivityWidget.jsx ──────────────────────────────────
fix('src/components/dashboard/pro/UserProductivityWidget.jsx', c => {
  c = removeNamedImports(c, ['useState', 'IconButton']);
  c = removeStandaloneImports(c, ['TrendingUpIcon', 'CalendarMonthIcon']);
  return c;
});

// ─── 8. useDocumentListLocal.js ─────────────────────────────────────
fix('src/components/documents/useDocumentListLocal.js', c => {
  c = c.replace(/\blet filtered\b/, 'const filtered');
  return c;
});

// ─── 9. AdminCorrespondence.js ──────────────────────────────────────
fix('src/pages/Admin/AdminCorrespondence.js', c => {
  c = removeNamedImports(c, ['Card', 'CardContent']);
  return c;
});

console.log('\n✅ All fixes applied!');
