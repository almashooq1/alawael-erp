#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Cleanup Utility
 * نظام الأوائل — أداة التنظيف
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/cleanup.js                    # Show what would be cleaned (dry run)
 *   node scripts/cleanup.js --run              # Actually clean
 *   node scripts/cleanup.js --run --logs       # Clean logs only
 *   node scripts/cleanup.js --run --temp       # Clean temp/upload files only
 *   node scripts/cleanup.js --run --cache      # Clean jest & node caches only
 *   node scripts/cleanup.js --run --all        # Clean everything
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = !args.includes('--run');
const cleanLogs = args.includes('--logs') || args.includes('--all');
const cleanTemp = args.includes('--temp') || args.includes('--all');
const cleanCache = args.includes('--cache') || args.includes('--all');
const cleanAll = !cleanLogs && !cleanTemp && !cleanCache; // default: clean all

let totalFiles = 0;
let totalSize = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getDirectorySize(dirPath) {
  let size = 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        size += stat.size;
        count++;
      } else if (entry.isDirectory()) {
        const sub = getDirectorySize(fullPath);
        size += sub.size;
        count += sub.count;
      }
    }
  } catch {
    /* ignore access errors */
  }
  return { size, count };
}

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function cleanDirectory(dirPath, extensions = null, maxAgeDays = null) {
  if (!fs.existsSync(dirPath)) return;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        // Skip .gitkeep files
        if (entry.name === '.gitkeep') continue;

        const stat = fs.statSync(fullPath);

        // Filter by extension
        if (extensions && !extensions.some(ext => entry.name.endsWith(ext))) continue;

        // Filter by age
        if (maxAgeDays) {
          const ageMs = now - stat.mtimeMs;
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          if (ageDays < maxAgeDays) continue;
        }

        totalFiles++;
        totalSize += stat.size;
        if (!dryRun) fs.unlinkSync(fullPath);
      }
    }
  } catch {
    /* ignore */
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
function main() {
  console.log(`\n${C.bold}${C.cyan}🧹 Al-Awael ERP — Cleanup Utility${C.reset}`);
  console.log(
    `   ${dryRun ? `${C.yellow}DRY RUN — no files will be deleted${C.reset}` : `${C.red}LIVE MODE — files will be deleted${C.reset}`}\n`
  );

  // ─── Logs ─────────────────────────────────────────────────────────────────
  if (cleanAll || cleanLogs) {
    console.log(`${C.bold}📋 Log Files${C.reset}`);
    const logDirs = [path.join(ROOT, 'logs')];
    for (const dir of logDirs) {
      if (fs.existsSync(dir)) {
        const { size, count } = getDirectorySize(dir);
        console.log(`   ${path.relative(ROOT, dir)}/ — ${count} files, ${formatSize(size)}`);
        cleanDirectory(dir, ['.log', '.txt'], 7); // clean logs older than 7 days
      }
    }
    console.log('');
  }

  // ─── Temp Files ───────────────────────────────────────────────────────────
  if (cleanAll || cleanTemp) {
    console.log(`${C.bold}📁 Temp & Upload Files${C.reset}`);
    const tempDirs = [path.join(ROOT, 'uploads', 'temp')];
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        const { size, count } = getDirectorySize(dir);
        console.log(`   ${path.relative(ROOT, dir)}/ — ${count} files, ${formatSize(size)}`);
        cleanDirectory(dir, null, 1); // clean temp older than 1 day
      }
    }
    console.log('');
  }

  // ─── Cache ────────────────────────────────────────────────────────────────
  if (cleanAll || cleanCache) {
    console.log(`${C.bold}💾 Cache & Build Artifacts${C.reset}`);
    const cacheDirs = [
      { dir: path.join(ROOT, '.jest-cache'), label: 'Jest Cache' },
      { dir: path.join(ROOT, 'coverage'), label: 'Coverage Reports' },
    ];

    for (const { dir, label } of cacheDirs) {
      if (fs.existsSync(dir)) {
        const { size, count } = getDirectorySize(dir);
        console.log(
          `   ${label} (${path.relative(ROOT, dir)}/) — ${count} files, ${formatSize(size)}`
        );
        totalFiles += count;
        totalSize += size;
        if (!dryRun) removeDir(dir);
      }
    }

    // Clean stale txt report files in root
    const rootReportFiles = fs.readdirSync(ROOT).filter(f => {
      return f.startsWith('_') && (f.endsWith('.txt') || f.endsWith('.js')) && !f.startsWith('__');
    });

    if (rootReportFiles.length > 0) {
      console.log(`\n${C.bold}📝 Stale Report/Debug Files${C.reset}`);
      for (const file of rootReportFiles) {
        const fullPath = path.join(ROOT, file);
        const stat = fs.statSync(fullPath);
        console.log(`   ${C.dim}${file} — ${formatSize(stat.size)}${C.reset}`);
        totalFiles++;
        totalSize += stat.size;
        if (!dryRun) fs.unlinkSync(fullPath);
      }
    }
    console.log('');
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`${C.bold}━━━ Summary ━━━${C.reset}`);
  console.log(`   Files: ${totalFiles}`);
  console.log(`   Size:  ${formatSize(totalSize)}`);

  if (dryRun) {
    console.log(
      `\n${C.yellow}This was a dry run. Use ${C.bold}--run${C.reset}${C.yellow} to actually delete files.${C.reset}\n`
    );
  } else {
    console.log(`\n${C.green}${C.bold}✅ Cleanup complete!${C.reset}\n`);
  }
}

main();
