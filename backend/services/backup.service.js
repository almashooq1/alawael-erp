const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AuditService = require('./audit.service');

const BACKUP_DIR = path.join(__dirname, '../../backups/auto');

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupService {
  /**
   * Create a backup of the MongoDB database
   * @returns {Promise<string>} Path to the backup file
   */
  static async createBackup(triggeredBy = 'SYSTEM') {
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
            `Backup created successfully: ${fileName}`,
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
    if (!fs.existsSync(BACKUP_DIR)) return [];

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
