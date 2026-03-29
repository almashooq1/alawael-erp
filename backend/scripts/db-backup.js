#!/usr/bin/env node
/**
 * @file db-backup.js
 * @description نظام النسخ الاحتياطي والاسترداد لقاعدة البيانات
 * Database Backup & Restore System for Al-Awael ERP
 *
 * الاستخدام / Usage:
 *   node backend/scripts/db-backup.js backup                   # full backup
 *   node backend/scripts/db-backup.js backup --collections users,employees
 *   node backend/scripts/db-backup.js list                     # list backups
 *   node backend/scripts/db-backup.js restore --file backup_2025-01-01.gz
 *   node backend/scripts/db-backup.js cleanup --keep 7         # keep last 7 days
 */

'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const BACKUP_CONFIG = {
  backupDir: process.env.DB_BACKUP_DIR || path.join(__dirname, '../../backups/mongodb'),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp',
  dbName: process.env.DB_NAME || 'alawael-erp',
  keepDays: parseInt(process.env.DB_BACKUP_KEEP_DAYS) || 30,
  compress: process.env.DB_BACKUP_COMPRESS !== 'false',
  maxBackupSizeMB: parseInt(process.env.DB_BACKUP_MAX_SIZE_MB) || 5000,
};

// Collections to always include in minimal backup
const CRITICAL_COLLECTIONS = [
  'users',
  'branches',
  'roles',
  'permissions',
  'systemsettings',
  'subscriptionplans',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
    fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
    console.log(`  📁 Created backup directory: ${BACKUP_CONFIG.backupDir}`);
  }
}

function checkMongodump() {
  try {
    execSync('mongodump --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkMongorestore() {
  try {
    execSync('mongorestore --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Parse MongoDB URI components
function parseMongoUri(uri) {
  try {
    const url = new URL(uri);
    return {
      host: url.hostname,
      port: url.port || '27017',
      username: url.username || null,
      password: url.password || null,
      dbName: url.pathname.replace('/', '') || BACKUP_CONFIG.dbName,
      authSource: url.searchParams.get('authSource') || 'admin',
    };
  } catch {
    return {
      host: 'localhost',
      port: '27017',
      username: null,
      password: null,
      dbName: BACKUP_CONFIG.dbName,
      authSource: 'admin',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build mongodump command
// ─────────────────────────────────────────────────────────────────────────────
function buildMongodumpArgs(options = {}) {
  const { collections, outputPath } = options;
  const parsed = parseMongoUri(BACKUP_CONFIG.mongoUri);

  const args = [
    '--uri',
    BACKUP_CONFIG.mongoUri,
    '--db',
    parsed.dbName,
    '--out',
    outputPath,
    '--numParallelCollections',
    '4',
  ];

  if (collections && collections.length > 0) {
    // Multiple collections - run separate dumps
    // This is handled by the caller
  }

  if (BACKUP_CONFIG.compress) {
    args.push('--gzip');
  }

  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP
// ─────────────────────────────────────────────────────────────────────────────
async function createBackup(options = {}) {
  const { collections = null, label = 'full' } = options;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║        Al-Awael ERP - Database Backup            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!checkMongodump()) {
    console.error('❌ mongodump not found. Install MongoDB Database Tools.');
    console.error('   https://www.mongodb.com/try/download/database-tools');
    process.exit(1);
  }

  ensureBackupDir();

  const timestamp = getTimestamp();
  const backupName = `backup_${label}_${timestamp}`;
  const backupPath = path.join(BACKUP_CONFIG.backupDir, backupName);
  const metaPath = path.join(BACKUP_CONFIG.backupDir, `${backupName}.meta.json`);

  console.log(`  📦 Backup name  : ${backupName}`);
  console.log(`  📁 Output path  : ${backupPath}`);
  console.log(`  🗜️  Compression  : ${BACKUP_CONFIG.compress ? 'enabled (gzip)' : 'disabled'}`);
  console.log(`  📋 Collections  : ${collections ? collections.join(', ') : 'all'}\n`);

  const startTime = Date.now();
  const parsed = parseMongoUri(BACKUP_CONFIG.mongoUri);

  try {
    if (collections && collections.length > 0) {
      // Backup specific collections
      for (const col of collections) {
        console.log(`  ▶️  Backing up collection: ${col}`);
        const args = [
          '--uri',
          BACKUP_CONFIG.mongoUri,
          '--db',
          parsed.dbName,
          '--collection',
          col,
          '--out',
          backupPath,
        ];
        if (BACKUP_CONFIG.compress) args.push('--gzip');

        await runCommand('mongodump', args);
      }
    } else {
      // Full backup
      const args = buildMongodumpArgs({ outputPath: backupPath });
      await runCommand('mongodump', args);
    }

    const elapsed = Date.now() - startTime;

    // Calculate backup size
    let backupSize = 0;
    if (fs.existsSync(backupPath)) {
      backupSize = getDirSize(backupPath);
    }

    // Write metadata
    const meta = {
      backupName,
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed,
      label,
      collections: collections || 'all',
      dbName: parsed.dbName,
      host: parsed.host,
      sizeBytes: backupSize,
      sizeFormatted: formatBytes(backupSize),
      compressed: BACKUP_CONFIG.compress,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    console.log(`\n  ✅ Backup completed successfully!`);
    console.log(`  ⏱️  Duration: ${(elapsed / 1000).toFixed(2)}s`);
    console.log(`  💾 Size: ${formatBytes(backupSize)}`);
    console.log(`  📍 Location: ${backupPath}`);

    return { success: true, backupPath, meta };
  } catch (err) {
    console.error(`\n  ❌ Backup failed: ${err.message}`);
    // Cleanup partial backup
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST BACKUPS
// ─────────────────────────────────────────────────────────────────────────────
function listBackups() {
  ensureBackupDir();

  const files = fs
    .readdirSync(BACKUP_CONFIG.backupDir)
    .filter(f => f.startsWith('backup_') && !f.endsWith('.meta.json'));

  if (files.length === 0) {
    console.log('\n  📭 No backups found.\n');
    return [];
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          Al-Awael ERP - Backup List              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`  Found ${files.length} backup(s) in: ${BACKUP_CONFIG.backupDir}\n`);

  const backups = [];

  files
    .sort()
    .reverse()
    .forEach((file, idx) => {
      const fullPath = path.join(BACKUP_CONFIG.backupDir, file);
      const metaPath = path.join(BACKUP_CONFIG.backupDir, `${file}.meta.json`);
      const stat = fs.statSync(fullPath);

      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch {}
      }

      const sizeStr = formatBytes(stat.isDirectory() ? getDirSize(fullPath) : stat.size);
      const dateStr = meta.timestamp || stat.mtime.toISOString();

      console.log(`  [${idx + 1}] ${file}`);
      console.log(`       Date    : ${dateStr}`);
      console.log(`       Size    : ${sizeStr}`);
      console.log(`       Label   : ${meta.label || 'unknown'}`);
      console.log(`       DB      : ${meta.dbName || 'unknown'}\n`);

      backups.push({ file, fullPath, meta, size: sizeStr, date: dateStr });
    });

  return backups;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP OLD BACKUPS
// ─────────────────────────────────────────────────────────────────────────────
function cleanupOldBackups(keepDays = BACKUP_CONFIG.keepDays) {
  ensureBackupDir();

  const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
  let deleted = 0;
  let freed = 0;

  files.forEach(file => {
    const fullPath = path.join(BACKUP_CONFIG.backupDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.mtime < cutoffDate) {
      const size = stat.isDirectory() ? getDirSize(fullPath) : stat.size;
      fs.rmSync(fullPath, { recursive: true, force: true });
      freed += size;
      deleted++;
      console.log(`  🗑️  Deleted: ${file}`);
    }
  });

  console.log(`\n  ✅ Cleanup complete: ${deleted} items removed, ${formatBytes(freed)} freed`);
  return { deleted, freed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const fp = path.join(dirPath, file);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) size += getDirSize(fp);
      else size += stat.size;
    });
  } catch {}
  return size;
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    proc.stdout.on('data', data => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) console.log(`     ${line}`);
      });
    });

    proc.stderr.on('data', data => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line.trim() && !line.includes('DeprecationWarning')) {
          console.log(`     ${line}`);
        }
      });
    });

    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });

    proc.on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const command = process.argv[2] || 'help';
  const args = process.argv.slice(3);

  switch (command) {
    case 'backup': {
      const colIdx = args.indexOf('--collections');
      const collections = colIdx !== -1 ? args[colIdx + 1].split(',') : null;
      const labelIdx = args.indexOf('--label');
      const label = labelIdx !== -1 ? args[labelIdx + 1] : 'full';
      await createBackup({ collections, label });
      break;
    }

    case 'list':
      listBackups();
      break;

    case 'cleanup': {
      const keepIdx = args.indexOf('--keep');
      const keepDays = keepIdx !== -1 ? parseInt(args[keepIdx + 1]) : BACKUP_CONFIG.keepDays;
      console.log(`\n  🗑️  Cleaning backups older than ${keepDays} days...`);
      cleanupOldBackups(keepDays);
      break;
    }

    case 'critical':
      await createBackup({ collections: CRITICAL_COLLECTIONS, label: 'critical' });
      break;

    default:
      console.log(`
╔══════════════════════════════════════════════════╗
║       Al-Awael ERP - DB Backup Tool              ║
╚══════════════════════════════════════════════════╝

Usage:
  node backend/scripts/db-backup.js backup                    Full backup
  node backend/scripts/db-backup.js backup --collections users,employees
  node backend/scripts/db-backup.js critical                  Critical collections only
  node backend/scripts/db-backup.js list                      List all backups
  node backend/scripts/db-backup.js cleanup --keep 7          Remove backups > 7 days

Environment Variables:
  MONGODB_URI           MongoDB connection string
  DB_BACKUP_DIR         Backup directory (default: ../../backups/mongodb)
  DB_BACKUP_KEEP_DAYS   Auto-cleanup after N days (default: 30)
  DB_BACKUP_COMPRESS    Enable gzip compression (default: true)
      `);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});

module.exports = { createBackup, listBackups, cleanupOldBackups };
