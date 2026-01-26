const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AuditService = require('./audit.service');

// Resolve a writable backup directory and fall back gracefully if the first choice fails.
const DEFAULT_BACKUP_DIR = path.join(__dirname, '../../backups/auto');
const FALLBACK_BACKUP_DIR = '/tmp/backups/auto';

const ensureBackupDir = targetDir => {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    return targetDir;
  } catch (err) {
    console.error(`⚠️  Backup dir not writable (${targetDir}): ${err.message}`);
    return null;
  }
};

let BACKUP_DIR = process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR;
BACKUP_DIR = ensureBackupDir(BACKUP_DIR) || ensureBackupDir(FALLBACK_BACKUP_DIR);

if (!BACKUP_DIR) {
  console.error('❌ Backup directory unavailable; backup operations will be disabled.');
}

class BackupService {
  /**
   * Create a backup of the MongoDB database
   * @returns {Promise<string>} Path to the backup file
   */
  static async createBackup(triggeredBy = 'SYSTEM') {
    if (!BACKUP_DIR) {
      return Promise.reject(new Error('Backup directory unavailable'));
    }
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${timestamp}.gz`;
      const filePath = path.join(BACKUP_DIR, fileName);

      // MONGODB URI Parser (Simple extraction)
      // Assumes process.env.MONGODB_URI format: mongodb://host:port/dbname
      // For production with Auth, this needs better parsing
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db';

      // Construct mongodump command
      // Note: mongodump must be installed on the host system
      const args = [`--uri=${uri}`, `--archive=${filePath}`, '--gzip'];

      const mongodump = spawn('mongodump', args);

      mongodump.stderr.on('data', data => {
        // mongodump outputs progress to stderr
        // console.log(`Backup: ${data}`);
      });

      mongodump.on('close', async code => {
        if (code === 0) {
          await AuditService.log(
            { user: { role: 'SYSTEM', id: triggeredBy } }, // Mock req context
            'CREATE_BACKUP',
            'SYSTEM',
            { type: 'Backup', id: fileName },
            null,
            'SUCCESS',
            `Backup created successfully: ${fileName}`
          );
          resolve({ fileName, filePath, size: fs.statSync(filePath).size });
        } else {
          reject(new Error(`mongodump process exited with code ${code}`));
        }
      });

      mongodump.on('error', err => {
        reject(new Error(`Failed to start mongodump: ${err.message}`));
      });
    });
  }

  /**
   * List all available backups
   */
  static async listBackups() {
    if (!BACKUP_DIR || !fs.existsSync(BACKUP_DIR)) return [];

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.gz'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first

    return files;
  }

  /**
   * Delete a backup
   */
  static async deleteBackup(fileName) {
    if (!BACKUP_DIR) return false;
    const filePath = path.join(BACKUP_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

module.exports = BackupService;
module.exports.instance = new BackupService();
