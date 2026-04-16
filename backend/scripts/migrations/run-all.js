/**
 * Migration Runner — تشغيل كل سكربتات الترحيل بالترتيب
 *
 * يشغل جميع الترحيلات المرقمة (001, 002, 003, ...) بالترتيب.
 *
 * Usage:
 *   node backend/scripts/migrations/run-all.js
 *   node backend/scripts/migrations/run-all.js --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIGRATIONS_DIR = __dirname;
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Migration Runner — منصة الأوائل للتأهيل');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (لن يتم تنفيذ أي تغيير)' : 'LIVE'}`);
  console.log('');

  // Find all numbered migration files (001-xxx.js, 002-xxx.js, etc.)
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}-.*\.js$/.test(f) && f !== 'run-all.js')
    .sort();

  if (files.length === 0) {
    console.log('  No migration files found.');
    return;
  }

  console.log(`  Found ${files.length} migration(s):`);
  files.forEach(f => console.log(`    - ${f}`));
  console.log('');

  if (DRY_RUN) {
    console.log('  [DRY RUN] Exiting without running migrations.');
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    console.log(`\n▶ Running: ${file}`);
    console.log('─'.repeat(50));

    try {
      execSync(`node "${filePath}"`, {
        stdio: 'inherit',
        timeout: 120000, // 2 minutes per migration
      });
      passed++;
      console.log(`✓ ${file} — completed`);
    } catch (err) {
      failed++;
      console.error(`✗ ${file} — FAILED: ${err.message}`);
      console.error('  Stopping migration runner. Fix the issue and re-run.');
      process.exit(1);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
