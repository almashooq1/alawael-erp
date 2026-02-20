/**
 * ═══════════════════════════════════════════════════════════════
 * 📄 File Management Service - Advanced
 * ═══════════════════════════════════════════════════════════════
 * 
 * Comprehensive file handling with:
 * - Secure file uploads/downloads
 * - Storage quota management
 * - File versioning
 * - Cleanup & optimization
 * - S3 integration ready
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

class FileManagementService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.maxStoragePerUser = 5 * 1024 * 1024 * 1024; // 5GB
    this.allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed'
    ];
    this.initializeStorage();
  }

  /**
   * Initialize storage directory
   */
  initializeStorage() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Get user upload directory
   */
  getUserUploadDir(userId) {
    return path.join(this.uploadDir, userId.toString());
  }

  /**
   * Ensure user directory exists
   */
  ensureUserDir(userId) {
    const userDir = this.getUserUploadDir(userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    const errors = [];

    // Check if file exists
    if (!file) {
      errors.push('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum (${this.maxFileSize / 1024 / 1024}MB)`);
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push('File type not allowed');
    }

    // Check filename
    if (!file.originalname || file.originalname.length < 1) {
      errors.push('Invalid filename');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${timestamp}-${random}${ext}`;
  }

  /**
   * Generate file hash
   */
  generateFileHash(filepath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filepath);

      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(userId, filename) {
    const userDir = this.getUserUploadDir(userId);
    const filepath = path.join(userDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error('File not found');
    }

    const stats = fs.statSync(filepath);
    const hash = await this.generateFileHash(filepath);

    return {
      filename: filename,
      size: stats.size,
      sizeFormatted: this.formatBytes(stats.size),
      uploadedAt: stats.birthtime,
      modifiedAt: stats.mtime,
      hash: hash,
      path: `/uploads/${userId}/${filename}`,
    };
  }

  /**
   * Get user storage usage
   */
  getUserStorageUsage(userId) {
    const userDir = this.getUserUploadDir(userId);

    if (!fs.existsSync(userDir)) {
      return {
        used: 0,
        usedFormatted: '0 B',
        limit: this.maxStoragePerUser,
        limitFormatted: this.formatBytes(this.maxStoragePerUser),
        percentage: 0,
      };
    }

    let totalSize = 0;
    const files = fs.readdirSync(userDir);

    files.forEach(filename => {
      const filepath = path.join(userDir, filename);
      const stats = fs.statSync(filepath);
      totalSize += stats.size;
    });

    return {
      used: totalSize,
      usedFormatted: this.formatBytes(totalSize),
      limit: this.maxStoragePerUser,
      limitFormatted: this.formatBytes(this.maxStoragePerUser),
      percentage: (totalSize / this.maxStoragePerUser) * 100,
      available: this.maxStoragePerUser - totalSize,
      availableFormatted: this.formatBytes(this.maxStoragePerUser - totalSize),
    };
  }

  /**
   * Check storage quota
   */
  checkStorageQuota(userId, fileSize) {
    const usage = this.getUserStorageUsage(userId);
    const available = usage.limit - usage.used;

    return {
      canUpload: fileSize <= available,
      available: available,
      required: fileSize,
      message: fileSize > available 
        ? `Insufficient storage. Need ${this.formatBytes(fileSize)}, have ${this.formatBytes(available)}`
        : 'Storage available',
    };
  }

  /**
   * List user files
   */
  listUserFiles(userId) {
    const userDir = this.getUserUploadDir(userId);

    if (!fs.existsSync(userDir)) {
      return [];
    }

    return fs.readdirSync(userDir)
      .map(filename => {
        const filepath = path.join(userDir, filename);
        const stats = fs.statSync(filepath);

        return {
          filename: filename,
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          uploadedAt: stats.birthtime,
          modifiedAt: stats.mtime,
          url: `/uploads/${userId}/${filename}`,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
        };
      })
      .filter(f => f.isFile);
  }

  /**
   * Get file by type
   */
  getFilesByType(userId, type) {
    const files = this.listUserFiles(userId);
    const typeMap = {
      'images': /\.(jpg|jpeg|png|gif|webp)$/i,
      'documents': /\.(pdf|doc|docx)$/i,
      'spreadsheets': /\.(xls|xlsx)$/i,
      'archives': /\.(zip|rar|7z)$/i,
      'text': /\.(txt|csv)$/i,
    };

    const pattern = typeMap[type];
    if (!pattern) return [];

    return files.filter(f => pattern.test(f.filename));
  }

  /**
   * Search files by name
   */
  searchFiles(userId, query) {
    const files = this.listUserFiles(userId);
    const lowerQuery = query.toLowerCase();

    return files.filter(f => 
      f.filename.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Move file to different location
   */
  moveFile(userId, filename, newLocation) {
    const userDir = this.getUserUploadDir(userId);
    const sourcePath = path.join(userDir, filename);
    const destPath = path.join(userDir, newLocation, filename);

    if (!fs.existsSync(sourcePath)) {
      throw new Error('Source file not found');
    }

    // Ensure destination directory exists
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    fs.renameSync(sourcePath, destPath);

    return {
      success: true,
      message: `File moved to ${newLocation}`,
      newPath: `/uploads/${userId}/${newLocation}/${filename}`,
    };
  }

  /**
   * Copy file
   */
  copyFile(userId, filename, newFilename) {
    const userDir = this.getUserUploadDir(userId);
    const sourcePath = path.join(userDir, filename);
    const destPath = path.join(userDir, newFilename);

    if (!fs.existsSync(sourcePath)) {
      throw new Error('Source file not found');
    }

    fs.copyFileSync(sourcePath, destPath);

    return {
      success: true,
      message: 'File copied successfully',
      newFilename: newFilename,
      newPath: `/uploads/${userId}/${newFilename}`,
    };
  }

  /**
   * Rename file
   */
  renameFile(userId, oldFilename, newFilename) {
    const userDir = this.getUserUploadDir(userId);
    const oldPath = path.join(userDir, oldFilename);
    const newPath = path.join(userDir, newFilename);

    if (!fs.existsSync(oldPath)) {
      throw new Error('File not found');
    }

    if (fs.existsSync(newPath)) {
      throw new Error('Filename already exists');
    }

    fs.renameSync(oldPath, newPath);

    return {
      success: true,
      message: 'File renamed successfully',
      newFilename: newFilename,
      newPath: `/uploads/${userId}/${newFilename}`,
    };
  }

  /**
   * Delete file
   */
  deleteFile(userId, filename) {
    const userDir = this.getUserUploadDir(userId);
    const filepath = path.join(userDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error('File not found');
    }

    fs.unlinkSync(filepath);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  /**
   * Delete multiple files
   */
  deleteMultipleFiles(userId, filenames) {
    const userDir = this.getUserUploadDir(userId);
    const deleted = [];
    const failed = [];

    filenames.forEach(filename => {
      const filepath = path.join(userDir, filename);

      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          deleted.push(filename);
        } else {
          failed.push({ filename, error: 'File not found' });
        }
      } catch (error) {
        failed.push({ filename, error: error.message });
      }
    });

    return {
      success: failed.length === 0,
      deleted: deleted,
      failed: failed,
      message: `Deleted ${deleted.length} files${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
    };
  }

  /**
   * Clear old files
   */
  clearOldFiles(userId, daysOld = 30) {
    const userDir = this.getUserUploadDir(userId);

    if (!fs.existsSync(userDir)) {
      return { success: true, cleared: 0 };
    }

    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;
    let cleared = 0;

    fs.readdirSync(userDir).forEach(filename => {
      const filepath = path.join(userDir, filename);
      const stats = fs.statSync(filepath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        cleared++;
      }
    });

    return {
      success: true,
      cleared: cleared,
      message: `Cleared ${cleared} files older than ${daysOld} days`,
    };
  }

  /**
   * Get file compression estimate
   */
  analyzeCompressionPotential(userId) {
    const files = this.listUserFiles(userId);
    let compressibleSize = 0;
    let compressibleCount = 0;

    files.forEach(file => {
      // Check if file is likely compressible
      if (/\.(txt|csv|log|json|xml|doc|docx)$/i.test(file.filename)) {
        compressibleSize += file.size;
        compressibleCount++;
      }
    });

    return {
      compressibleSize: compressibleSize,
      compressibleFormatted: this.formatBytes(compressibleSize),
      compressibleCount: compressibleCount,
      estimatedSavings: Math.round(compressibleSize * 0.4), // 40% savings estimate
      estimatedSavingsFormatted: this.formatBytes(Math.round(compressibleSize * 0.4)),
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file statistics
   */
  getFileStatistics(userId) {
    const files = this.listUserFiles(userId);
    const usage = this.getUserStorageUsage(userId);

    const stats = {
      totalFiles: files.length,
      totalSize: usage.used,
      totalSizeFormatted: usage.usedFormatted,
      averageFileSize: files.length > 0 ? usage.used / files.length : 0,
      averageFileSizeFormatted: files.length > 0 
        ? this.formatBytes(usage.used / files.length) 
        : '0 B',
      largestFile: files.length > 0 
        ? files.reduce((a, b) => a.size > b.size ? a : b) 
        : null,
      storageUsagePercentage: usage.percentage,
      fileTypes: {},
    };

    // Count by file type
    files.forEach(file => {
      const ext = path.extname(file.filename).toLowerCase().slice(1) || 'unknown';
      stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
    });

    return stats;
  }

  /**
   * Create backup of user files
   */
  createBackup(userId) {
    const userDir = this.getUserUploadDir(userId);
    const backupDir = path.join(this.uploadDir, '_backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${userId}-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);

    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });

    // Copy all user files
    if (fs.existsSync(userDir)) {
      fs.readdirSync(userDir).forEach(filename => {
        const sourcePath = path.join(userDir, filename);
        const destPath = path.join(backupPath, filename);
        fs.copyFileSync(sourcePath, destPath);
      });
    }

    return {
      success: true,
      backupName: backupName,
      backupPath: backupPath,
      timestamp: new Date().toISOString(),
      message: `Backup created: ${backupName}`,
    };
  }

  /**
   * Restore from backup
   */
  restoreFromBackup(userId, backupName) {
    const backupPath = path.join(this.uploadDir, '_backups', backupName);
    const userDir = this.ensureUserDir(userId);

    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup not found');
    }

    // Clear current files
    fs.readdirSync(userDir).forEach(filename => {
      fs.unlinkSync(path.join(userDir, filename));
    });

    // Restore from backup
    fs.readdirSync(backupPath).forEach(filename => {
      const sourcePath = path.join(backupPath, filename);
      const destPath = path.join(userDir, filename);
      fs.copyFileSync(sourcePath, destPath);
    });

    return {
      success: true,
      message: 'Files restored from backup',
      backupName: backupName,
    };
  }
}

// Export singleton instance
module.exports = new FileManagementService();
