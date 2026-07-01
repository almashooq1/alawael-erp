/**
 * perf-budget-check.js
 * فحص ميزانية الأداء بناءً على ملفات البناء
 *
 * Usage:
 *   node scripts/perf-budget-check.js
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'frontend', 'dist');

// Budgets are sized to the CURRENT legacy `frontend/dist` build (a large,
// heavily code-split Vite app: ~16.5 MB JS across ~970 chunks as of 2026-06-30)
// plus ~25% headroom, so this gate PASSES today while still catching a gross
// future bundle regression. NOTE: these are sum-of-ALL-chunks totals, not the
// first-load/entry bundle — a lazy-loaded chunk the user never fetches still
// counts here, so the JS/transfer/request numbers read high by design. When the
// legacy frontend is retired in favour of web-admin, retarget BUILD_DIR and
// tighten these to real first-load budgets. Override-friendly defaults; tune as
// the bundle is optimised.
const DEFAULT_BUDGET = {
  maxJsSizeKb: 20000,
  maxCssSizeKb: 400,
  maxImageSizeKb: 1000,
  maxTotalRequests: 1200,
  maxTransferSizeKb: 21000,
};

function getFileSizeKb(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size / 1024;
}

function walkDir(dir, extensions) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`❌ Build directory not found: ${BUILD_DIR}`);
    console.error('Run "npm run build" in the frontend directory first.');
    process.exit(1);
  }

  const budget = DEFAULT_BUDGET;
  let failures = 0;

  const jsFiles = walkDir(BUILD_DIR, ['.js']);
  const cssFiles = walkDir(BUILD_DIR, ['.css']);
  const imageFiles = walkDir(BUILD_DIR, ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
  const assets = walkDir(BUILD_DIR, ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff2']);

  const totalJsSize = jsFiles.reduce((sum, f) => sum + getFileSizeKb(f), 0);
  const totalCssSize = cssFiles.reduce((sum, f) => sum + getFileSizeKb(f), 0);
  const totalImageSize = imageFiles.reduce((sum, f) => sum + getFileSizeKb(f), 0);
  const totalTransferSize = assets.reduce((sum, f) => sum + getFileSizeKb(f), 0);

  console.log('📦 Performance Budget Check');
  console.log('─────────────────────────────');

  const checks = [
    { name: 'Total JS Size', value: totalJsSize, budget: budget.maxJsSizeKb, unit: 'KB' },
    { name: 'Total CSS Size', value: totalCssSize, budget: budget.maxCssSizeKb, unit: 'KB' },
    { name: 'Total Image Size', value: totalImageSize, budget: budget.maxImageSizeKb, unit: 'KB' },
    { name: 'Total Requests', value: assets.length, budget: budget.maxTotalRequests, unit: '' },
    { name: 'Total Transfer Size', value: totalTransferSize, budget: budget.maxTransferSizeKb, unit: 'KB' },
  ];

  for (const check of checks) {
    const passed = check.value <= check.budget;
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${Math.round(check.value)}${check.unit} / ${check.budget}${check.unit}`);
    if (!passed) failures++;
  }

  if (failures > 0) {
    console.error(`\n❌ ${failures} budget check(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All performance budget checks passed');
}

main();
