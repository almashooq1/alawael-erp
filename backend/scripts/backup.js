#!/usr/bin/env node

/**
 * النسخ الاحتياطي التلقائي لقاعدة البيانات
 * Automatic Database Backup Script
 *
 * الاستخدام:
 * node scripts/backup.js
 *
 * أو لجدولة يومية:
 * node scripts/backup.js --schedule daily
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ============================================
// Configuration
// ============================================
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 7; // Keep last 7 backups
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

// ============================================
// Utility Functions
// ============================================
function generateBackupId() {
  const date = new Date();
  return `backup_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// Backup Functions
// ============================================

/**
 * Create backup directory if not exists
 */
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('✅ Created backup directory:', BACKUP_DIR);
  }
}

/**
 * Get database name from MongoDB URI
 */
function getDatabaseName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'alawael-erp';
}

/**
 * Perform MongoDB backup using mongodump
 */
async function performMongoBackup() {
  const backupId = generateBackupId();
  const timestamp = new Date().toISOString();
  const dbName = getDatabaseName(MONGODB_URI);
  const backupPath = path.join(BACKUP_DIR, backupId);

  console.log('🔄 Starting MongoDB backup...');
  console.log('📅 Timestamp:', timestamp);
  console.log('🗄️  Database:', dbName);
  console.log('📁 Backup path:', backupPath);

  try {
    // Check if mongodump is available
    try {
      await execAsync('mongodump --version');
    } catch (error) {
      console.warn('⚠️  mongodump not found. Installing alternative backup method...');
      return await performManualBackup(backupId, dbName);
    }

    // Perform mongodump
    const command = `mongodump --uri="${MONGODB_URI}" --out="${backupPath}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.warn('⚠️  Backup warnings:', stderr);
    }

    // Get backup size
    const stats = await getDirectorySize(backupPath);

    console.log('✅ Backup completed successfully!');
    console.log('📊 Backup size:', formatBytes(stats.size));
    console.log('📄 Files:', stats.files);

    // Save backup metadata
    await saveBackupMetadata({
      backupId,
      timestamp,
      path: backupPath,
      size: stats.size,
      files: stats.files,
      dbName,
      status: 'completed',
    });

    return { success: true, backupId, path: backupPath };
  } catch (error) {
    console.error('❌ Backup failed:', error.message);

    // Save error metadata
    await saveBackupMetadata({
      backupId,
      timestamp,
      path: backupPath,
      dbName,
      status: 'failed',
      error: error.message,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Manual backup method (JSON export)
 */
async function performManualBackup(backupId, dbName) {
  console.log('📦 Using manual backup method (JSON export)...');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    const backupPath = path.join(BACKUP_DIR, backupId);
    await fs.mkdir(backupPath, { recursive: true });

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📚 Found ${collections.length} collections`);

    let totalDocs = 0;
    let totalSize = 0;

    // Export each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = mongoose.connection.db.collection(collectionName);

      // Get documents
      const documents = await collection.find({}).toArray();

      // Save to JSON file
      const filename = path.join(backupPath, `${collectionName}.json`);
      const data = JSON.stringify(documents, null, 2);
      await fs.writeFile(filename, data);

      const fileStats = await fs.stat(filename);
      totalDocs += documents.length;
      totalSize += fileStats.size;

      console.log(`  ✓ ${collectionName}: ${documents.length} documents (${formatBytes(fileStats.size)})`);
    }

    await mongoose.disconnect();

    console.log('✅ Manual backup completed!');
    console.log('📊 Total:', totalDocs, 'documents');
    console.log('📊 Size:', formatBytes(totalSize));

    // Save metadata
    await saveBackupMetadata({
      backupId,
      timestamp: new Date().toISOString(),
      path: backupPath,
      size: totalSize,
      documents: totalDocs,
      collections: collections.map(c => c.name),
      dbName,
      method: 'manual',
      status: 'completed',
    });

    return { success: true, backupId, path: backupPath };
  } catch (error) {
    console.error('❌ Manual backup failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;

  async function traverse(currentPath) {
    const items = await fs.readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(currentPath, item.name);

      if (item.isDirectory()) {
        await traverse(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
        fileCount++;
      }
    }
  }

  await traverse(dirPath);
  return { size: totalSize, files: fileCount };
}

/**
 * Save backup metadata to JSON file
 */
async function saveBackupMetadata(metadata) {
  const metadataPath = path.join(BACKUP_DIR, 'backups.json');

  let backups = [];
  try {
    const data = await fs.readFile(metadataPath, 'utf-8');
    backups = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }

  backups.push(metadata);
  await fs.writeFile(metadataPath, JSON.stringify(backups, null, 2));
}

/**
 * Clean old backups (keep only MAX_BACKUPS)
 */
async function cleanOldBackups() {
  try {
    const items = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    const backupDirs = items
      .filter(item => item.isDirectory() && item.name.startsWith('backup_'))
      .map(item => ({
        name: item.name,
        path: path.join(BACKUP_DIR, item.name),
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Sort by date (newest first)

    if (backupDirs.length > MAX_BACKUPS) {
      console.log(`🧹 Cleaning old backups (keeping last ${MAX_BACKUPS})...`);

      for (let i = MAX_BACKUPS; i < backupDirs.length; i++) {
        const backupToDelete = backupDirs[i];
        await fs.rm(backupToDelete.path, { recursive: true, force: true });
        console.log(`  🗑️  Deleted: ${backupToDelete.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Error cleaning old backups:', error.message);
  }
}

/**
 * List all backups
 */
async function listBackups() {
  try {
    const metadataPath = path.join(BACKUP_DIR, 'backups.json');
    const data = await fs.readFile(metadataPath, 'utf-8');
    const backups = JSON.parse(data);

    console.log('\n📋 Available Backups:\n');
    console.log('═'.repeat(80));

    backups
      .slice(-10)
      .reverse()
      .forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.backupId}`);
        console.log(`   Date: ${new Date(backup.timestamp).toLocaleString()}`);
        console.log(`   Size: ${formatBytes(backup.size || 0)}`);
        console.log(`   Status: ${backup.status}`);
        console.log(`   Path: ${backup.path}`);
        console.log('─'.repeat(80));
      });
  } catch (error) {
    console.log('📭 No backups found');
  }
}

// ============================================
// Main Function
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   📦 نظام النسخ الاحتياطي - Backup System          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Ensure backup directory exists
    await ensureBackupDir();

    if (command === 'list') {
      await listBackups();
    } else {
      // Perform backup
      const result = await performMongoBackup();

      if (result.success) {
        // Clean old backups
        await cleanOldBackups();

        console.log('\n✅ Backup process completed successfully!');
        console.log('📁 Backup ID:', result.backupId);
        console.log('📂 Location:', result.path);
      } else {
        console.error('\n❌ Backup process failed!');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// ============================================
// Run
// ============================================
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Done!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { performMongoBackup, performManualBackup, listBackups };
