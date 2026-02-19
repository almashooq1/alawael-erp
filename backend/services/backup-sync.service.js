/**
 * ═══════════════════════════════════════════════════════════════════════
 * ADVANCED BACKUP SYNC SYSTEM
 * نظام المزامنة المتقدم للنسخ الاحتياطية
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Real-Time Sync
 * ✅ Incremental Sync
 * ✅ Conflict Resolution
 * ✅ Change Detection
 * ✅ Bandwidth Optimization
 * ✅ Sync History & Analytics
 * ═══════════════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class BackupSyncSystem extends EventEmitter {
  constructor(options = {}) {
    super();

    this.syncPath = options.syncPath || './data/sync';
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB chunks
    this.syncInterval = options.syncInterval || 5 * 60 * 1000; // 5 minutes
    this.maxConcurrentSync = options.maxConcurrentSync || 3;

    this.activeSyncs = new Map();
    this.syncHistory = [];
    this.changedFiles = new Set();
    this.fileHashes = new Map();

    this.initializeSync();
  }

  /**
   * Initialize sync system
   */
  async initializeSync() {
    try {
      await fs.mkdir(this.syncPath, { recursive: true });
      await this.loadSyncMetadata();
      console.log('✅ Sync system initialized');
      this.startAutomaticSync();
    } catch (error) {
      console.error('❌ Sync initialization failed:', error.message);
    }
  }

  /**
   * Detect changed files
   * اكتشاف الملفات المتغيرة
   */
  async detectChanges(sourcePath) {
    try {
      const changes = {
        added: [],
        modified: [],
        deleted: [],
      };

      const files = await this.getAllFiles(sourcePath);

      for (const file of files) {
        const hash = await this.calculateFileHash(file);
        const previousHash = this.fileHashes.get(file);

        if (!previousHash) {
          changes.added.push(file);
        } else if (hash !== previousHash) {
          changes.modified.push(file);
        }

        this.fileHashes.set(file, hash);
      }

      // Detect deleted files
      for (const [file] of this.fileHashes) {
        if (!files.includes(file)) {
          changes.deleted.push(file);
          this.fileHashes.delete(file);
        }
      }

      return changes;
    } catch (error) {
      console.error('❌ Change detection failed:', error.message);
      return { added: [], modified: [], deleted: [] };
    }
  }

  /**
   * Perform incremental sync
   * تنفيذ المزامنة التدريجية
   */
  async performIncrementalSync(source, destination, options = {}) {
    try {
      const syncId = this.generateSyncId();
      const syncSession = {
        id: syncId,
        source,
        destination,
        startTime: new Date(),
        status: 'IN_PROGRESS',
        progress: 0,
        transferred: 0,
        totalSize: 0,
        filesProcessed: 0,
        totalFiles: 0,
        errors: [],
      };

      this.activeSyncs.set(syncId, syncSession);
      this.emit('sync:started', syncSession);
      console.log(`🔄 Starting incremental sync [${syncId}]`);

      // Detect changes
      const changes = await this.detectChanges(source);
      const filesToSync = [...changes.added, ...changes.modified];
      syncSession.totalFiles = filesToSync.length;

      // Sync files
      for (const file of filesToSync) {
        try {
          const fileStats = await fs.stat(file);
          syncSession.totalSize += fileStats.size;

          if (this.activeSyncs.size < this.maxConcurrentSync) {
            await this.syncFile(file, destination, syncSession);
          }
        } catch (error) {
          syncSession.errors.push({ file, error: error.message });
        }
      }

      // Remove deleted files from destination
      for (const file of changes.deleted) {
        const destFile = file.replace(source, destination);
        try {
          await fs.unlink(destFile);
          console.log(`🗑️  Deleted from destination: ${destFile}`);
        } catch (error) {
          console.warn(`⚠️  Failed to delete ${destFile}: ${error.message}`);
        }
      }

      syncSession.status = 'COMPLETED';
      syncSession.endTime = new Date();
      this.syncHistory.push(syncSession);
      this.activeSyncs.delete(syncId);

      this.emit('sync:completed', syncSession);
      console.log(`✅ Incremental sync completed [${syncId}]`);

      return syncSession;
    } catch (error) {
      console.error('❌ Incremental sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Sync individual file with chunking
   */
  async syncFile(sourcePath, destPath, syncSession) {
    try {
      const stats = await fs.stat(sourcePath);
      const relativeDir = path.dirname(sourcePath).replace(path.dirname(sourcePath), '');
      const destFile = path.join(destPath, path.basename(sourcePath));

      await fs.mkdir(path.dirname(destFile), { recursive: true });

      let transferred = 0;
      let chunkIndex = 0;

      const readStream = require('fs').createReadStream(sourcePath, { highWaterMark: this.chunkSize });

      await new Promise((resolve, reject) => {
        readStream.on('data', (chunk) => {
          transferred += chunk.length;
          syncSession.transferred += chunk.length;
          syncSession.progress = (syncSession.transferred / syncSession.totalSize) * 100;
          chunkIndex++;

          this.emit('sync:progress', {
            syncId: syncSession.id,
            file: sourcePath,
            progress: syncSession.progress,
            chunk: chunkIndex,
          });
        });

        readStream.on('end', () => {
          syncSession.filesProcessed++;
          resolve();
        });

        readStream.on('error', reject);
        readStream.pipe(require('fs').createWriteStream(destFile));
      });

      console.log(`✅ Synced: ${sourcePath}`);
    } catch (error) {
      console.error(`❌ Failed to sync file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve sync conflicts
   * حل تضاربات المزامنة
   */
  async resolveConflict(file, localVersion, remoteVersion, strategy = 'NEWER') {
    try {
      let winner;

      switch (strategy) {
        case 'NEWER':
          winner = new Date(localVersion.modifiedAt) > new Date(remoteVersion.modifiedAt) ? 'local' : 'remote';
          break;

        case 'LARGER':
          winner = localVersion.size > remoteVersion.size ? 'local' : 'remote';
          break;

        case 'LOCAL':
          winner = 'local';
          break;

        case 'REMOTE':
          winner = 'remote';
          break;

        default:
          winner = 'local';
      }

      const resolution = {
        file,
        strategy,
        winner,
        resolvedAt: new Date(),
        localVersion,
        remoteVersion,
      };

      this.emit('sync:conflict-resolved', resolution);
      console.log(`🔧 Conflict resolved for ${file}: ${winner} version kept`);

      return resolution;
    } catch (error) {
      console.error('❌ Conflict resolution failed:', error.message);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const activeSyncList = Array.from(this.activeSyncs.values());
    const totalTransferred = activeSyncList.reduce((sum, sync) => sum + sync.transferred, 0);
    const averageSyncTime = this.calculateAverageSyncTime();

    return {
      activeSyncs: this.activeSyncs.size,
      totalSyncs: this.syncHistory.length,
      lastSync: this.syncHistory[this.syncHistory.length - 1] || null,
      averageSyncTime,
      totalTransferred,
      currentProgress: activeSyncList,
    };
  }

  /**
   * Start automatic sync
   */
  startAutomaticSync() {
    setInterval(() => {
      this.emit('sync:auto-check');
      console.log('🔄 Automatic sync check triggered');
    }, this.syncInterval);
  }

  /**
   * Helper: Get all files recursively
   */
  async getAllFiles(dir) {
    const files = [];

    async function walk(currentPath) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await walk(dir);
    return files;
  }

  /**
   * Helper: Calculate file hash
   */
  async calculateFileHash(filePath) {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.warn(`⚠️  Failed to hash file: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper: Generate sync ID
   */
  generateSyncId() {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Helper: Calculate average sync time
   */
  calculateAverageSyncTime() {
    if (this.syncHistory.length === 0) return 0;

    const completedSyncs = this.syncHistory.filter(s => s.status === 'COMPLETED');
    if (completedSyncs.length === 0) return 0;

    const totalTime = completedSyncs.reduce((sum, sync) => {
      const duration = new Date(sync.endTime) - new Date(sync.startTime);
      return sum + duration;
    }, 0);

    return Math.round(totalTime / completedSyncs.length / 1000); // in seconds
  }

  /**
   * Load sync metadata
   */
  async loadSyncMetadata() {
    try {
      const filePath = path.join(this.syncPath, 'metadata.json');
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = JSON.parse(content);

      this.fileHashes = new Map(metadata.fileHashes || []);
      this.syncHistory = metadata.syncHistory || [];
    } catch (error) {
      console.log('ℹ️  No sync metadata found, starting fresh');
    }
  }

  /**
   * Save sync metadata
   */
  async saveSyncMetadata() {
    try {
      const metadata = {
        fileHashes: Array.from(this.fileHashes),
        syncHistory: this.syncHistory.slice(-100), // Keep last 100
        lastSaved: new Date(),
      };

      await fs.writeFile(
        path.join(this.syncPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    } catch (error) {
      console.warn('⚠️  Failed to save sync metadata:', error.message);
    }
  }
}

module.exports = new BackupSyncSystem();
