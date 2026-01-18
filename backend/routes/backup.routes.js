const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Directory for backups
const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * @route POST /api/backup/create
 * @desc Create a new backup of the database
 */
router.post('/create', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // Simple in-memory backup for development
    const backupData = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        type: 'alawael-erp-backup',
        version: '2.1.0',
        database: 'in-memory',
        status: 'completed',
        collections: {
          users: { count: 0, size: 0 },
          organizations: { count: 0, size: 0 },
          documents: { count: 0, size: 0 },
        },
      },
      null,
      2,
    );

    fs.writeFileSync(backupPath, backupData);
    const stats = fs.statSync(backupPath);

    res.json({
      success: true,
      message: 'Backup created successfully',
      filename: filename,
      path: backupPath,
      size: stats.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating backup',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/backup/list
 * @desc List all available backups
 */
router.get('/list', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({
        success: true,
        backups: [],
        message: 'No backups found',
      });
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .map(filename => {
        const filepath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      });

    res.json({
      success: true,
      backups: files,
      total: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing backups',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/backup/restore/:filename
 * @desc Restore from a specific backup
 */
router.post('/restore/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const backupPath = path.join(BACKUP_DIR, filename);

    // Security: prevent directory traversal
    if (!backupPath.startsWith(BACKUP_DIR)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup file',
      });
    }

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found',
      });
    }

    res.json({
      success: true,
      message: 'Restore functionality available via backend',
      backup: filename,
      path: backupPath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accessing backup',
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/backup/delete/:filename
 * @desc Delete a specific backup
 */
router.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const backupPath = path.join(BACKUP_DIR, filename);

    // Security: prevent directory traversal
    if (!backupPath.startsWith(BACKUP_DIR)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup file',
      });
    }

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found',
      });
    }

    fs.unlinkSync(backupPath);
    res.json({
      success: true,
      message: 'Backup deleted successfully',
      deleted: filename,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting backup',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/backup/stats
 * @desc Get backup statistics
 */
router.get('/stats', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({
        success: true,
        stats: {
          totalBackups: 0,
          totalSize: 0,
          oldestBackup: null,
          latestBackup: null,
        },
      });
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(filename => {
        const filepath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
        };
      });

    const sortedByDate = files.sort((a, b) => a.created - b.created);

    res.json({
      success: true,
      stats: {
        totalBackups: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        oldestBackup: sortedByDate.length > 0 ? sortedByDate[0] : null,
        latestBackup: sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1] : null,
        averageSize: files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.size, 0) / files.length) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting backup stats',
      error: error.message,
    });
  }
});

module.exports = router;
