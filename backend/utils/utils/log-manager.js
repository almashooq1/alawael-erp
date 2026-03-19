/**
 * Log Management & Rotation System
 * Handles log file rotation, compression, and cleanup
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class LogManager {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(__dirname, '../../logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10 MB default
    this.maxDays = options.maxDays || 7; // Keep logs for 7 days
    this.compressOldLogs = options.compressOldLogs !== false; // Compress by default
    this.cleanupInterval = options.cleanupInterval || 3600000; // Every hour
    this.monitoringInterval = null;
    this.stats = {
      filesRotated: 0,
      filesCompressed: 0,
      filesDeleted: 0,
      diskSpaceSaved: 0,
    };

    this.ensureLogDir();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        console.log(`📁 Log directory created: ${this.logDir}`);
      }
    } catch (error) {
      console.error('❌ Failed to create log directory:', error.message);
    }
  }

  /**
   * Start log monitoring and rotation
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.rotateAndCleanup();
    }, this.cleanupInterval);

    console.log(`✅ Log monitoring started (interval: ${this.cleanupInterval}ms)`);

    // Run once immediately
    this.rotateAndCleanup();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Rotate log files by size or date
   */
  rotateAndCleanup() {
    try {
      const files = fs.readdirSync(this.logDir);

      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        // Rotate by size
        if (stats.size > this.maxFileSize) {
          this.rotateFile(filePath, file);
        }

        // Rotate by age (daily)
        const ageMS = Date.now() - stats.mtimeMs;
        const ageDays = ageMS / (1000 * 60 * 60 * 24);

        if (ageDays > 1 && !file.includes('.gz') && !file.includes('_archived')) {
          this.archiveFile(filePath, file);
        }
      });

      // Cleanup old files
      this.cleanupOldFiles();

      // Log statistics
      this.logStats();
    } catch (error) {
      console.error('❌ Log rotation error:', error.message);
    }
  }

  /**
   * Rotate a file by appending timestamp
   */
  rotateFile(filePath, filename) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);

      const rotation = `${basename}_${timestamp}${ext}`;
      const rotatedPath = path.join(this.logDir, rotation);

      fs.renameSync(filePath, rotatedPath);
      this.stats.filesRotated++;

      console.log(`🔄 Rotated log: ${filename} → ${rotation}`);

      // Create empty new file
      fs.writeFileSync(filePath, '');

      // Compress if needed
      if (this.compressOldLogs) {
        this.compressFile(rotatedPath, rotation);
      }
    } catch (error) {
      console.error(`❌ Failed to rotate ${filename}:`, error.message);
    }
  }

  /**
   * Archive a file (compress and timestamp)
   */
  archiveFile(filePath, filename) {
    try {
      if (filename.includes('_archived') || filename.includes('.gz')) {
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);

      const archive = `${basename}_archived_${timestamp}${ext}`;
      const archivePath = path.join(this.logDir, archive);

      // Only archive if file has changed since yesterday
      const stats = fs.statSync(filePath);
      const ageMS = Date.now() - stats.mtimeMs;
      const ageDays = ageMS / (1000 * 60 * 60 * 24);

      if (ageDays > 0.5) {
        // More than 12 hours old
        if (!fs.existsSync(archivePath)) {
          fs.copyFileSync(filePath, archivePath);
          this.stats.filesRotated++;
        }
      }
    } catch (error) {
      console.error(`⚠️ Failed to archive ${filename}:`, error.message);
    }
  }

  /**
   * Compress a log file
   */
  compressFile(filePath, filename) {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const stats = fs.statSync(filePath);
      const originalSize = stats.size;

      const gzipPath = `${filePath}.gz`;

      // Don't compress if already exists
      if (fs.existsSync(gzipPath)) {
        return;
      }

      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(gzipPath);

      input.pipe(zlib.createGzip()).pipe(output);

      output.on('finish', () => {
        const compressedStats = fs.statSync(gzipPath);
        const compressedSize = compressedStats.size;
        const saved = originalSize - compressedSize;

        this.stats.filesCompressed++;
        this.stats.diskSpaceSaved += saved;

        console.log(
          `📦 Compressed: ${filename} (${(originalSize / 1024).toFixed(2)}KB → ${(compressedSize / 1024).toFixed(2)}KB, saved: ${(saved / 1024).toFixed(2)}KB)`,
        );

        // Delete original after successful compression
        try {
          setTimeout(() => {
            if (fs.existsSync(filePath) && fs.existsSync(gzipPath)) {
              fs.unlinkSync(filePath);
            }
          }, 1000);
        } catch (e) {
          // Ignore deletion errors
        }
      });

      output.on('error', (error) => {
        console.error(`❌ Compression error for ${filename}:`, error.message);
      });
    } catch (error) {
      console.error(`❌ Failed to compress ${filename}:`, error.message);
    }
  }

  /**
   * Cleanup old files based on maxDays
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        const ageMS = now - stats.mtimeMs;
        const ageDays = ageMS / (1000 * 60 * 60 * 24);

        if (ageDays > this.maxDays) {
          try {
            fs.unlinkSync(filePath);
            this.stats.filesDeleted++;
            console.log(`🗑️ Deleted old log: ${file} (${ageDays.toFixed(1)} days old)`);
          } catch (error) {
            console.error(`❌ Failed to delete ${file}:`, error.message);
          }
        }
      });
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }

  /**
   * Get current log directory size
   */
  getDirectorySize() {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(this.logDir);

      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Log statistics
   */
  logStats() {
    const dirSize = this.getDirectorySize();
    const dirSizeMB = (dirSize / (1024 * 1024)).toFixed(2);

    if (this.stats.filesRotated > 0 || this.stats.filesCompressed > 0 || this.stats.filesDeleted > 0) {
      console.log(`
📊 Log Management Statistics:
   Directory Size: ${dirSizeMB} MB
   Files Rotated: ${this.stats.filesRotated}
   Files Compressed: ${this.stats.filesCompressed}
   Files Deleted: ${this.stats.filesDeleted}
   Total Saved: ${(this.stats.diskSpaceSaved / (1024 * 1024)).toFixed(2)} MB
      `);
    }
  }

  /**
   * Get detailed statistics
   */
  getStats() {
    const dirSize = this.getDirectorySize();
    const files = fs.readdirSync(this.logDir);

    const fileStats = files.map((file) => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: (stats.size / 1024).toFixed(2) + 'KB',
        modified: new Date(stats.mtime).toISOString(),
        age: ((Date.now() - stats.mtimeMs) / (1000 * 60 * 60)).toFixed(1) + 'h',
      };
    });

    return {
      directory: this.logDir,
      totalSize: (dirSize / (1024 * 1024)).toFixed(2) + 'MB',
      fileCount: files.length,
      files: fileStats,
      stats: this.stats,
      config: {
        maxFileSize: (this.maxFileSize / (1024 * 1024)).toFixed(1) + 'MB',
        maxDays: this.maxDays,
        cleanupInterval: this.cleanupInterval,
      },
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopMonitoring();
    console.log('✅ Log manager stopped');
  }
}

module.exports = LogManager;
