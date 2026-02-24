/**
 * Migration Service
 * Orchestrates the entire data migration process
 * Handles ETL, validation, duplicate detection, and rollback
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class MigrationService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      batchSize: options.batchSize || 100,
      validateBeforeMigrate: options.validateBeforeMigrate !== false,
      detectDuplicates: options.detectDuplicates !== false,
      logDir: options.logDir || path.join(__dirname, '..', 'logs', 'migrations'),
      backupDir: options.backupDir || path.join(__dirname, '..', 'backups'),
      timeout: options.timeout || 30000, // 30 seconds per batch
      ...options,
    };

    this.migrations = [];
    this.currentMigration = null;
    this.logger = null;
    this.validator = null;
    this.duplicateDetector = null;

    this.initializeDirs();
  }

  /**
   * Initialize required directories
   */
  initializeDirs() {
    [this.options.logDir, this.options.backupDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Register a data validator
   */
  setValidator(validator) {
    this.validator = validator;
    return this;
  }

  /**
   * Register a duplicate detector
   */
  setDuplicateDetector(detector) {
    this.duplicateDetector = detector;
    return this;
  }

  /**
   * Register a logger
   */
  setLogger(logger) {
    this.logger = logger;
    return this;
  }

  /**
   * Start a new migration
   */
  async startMigration(migrationConfig) {
    try {
      const migrationId = this.generateMigrationId();
      
      this.currentMigration = {
        id: migrationId,
        config: migrationConfig,
        status: 'in-progress',
        startTime: new Date(),
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        duplicateRecords: 0,
        errors: [],
        warnings: [],
        backupFile: null,
      };

      this.emit('migration:start', { migrationId, config: migrationConfig });
      this.log(`Migration ${migrationId} started`, 'info', migrationId);

      // Create backup if enabled
      if (this.options.createBackup) {
        await this.createBackup(migrationId);
      }

      return migrationId;
    } catch (error) {
      this.log(`Failed to start migration: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Process migration data in batches
   */
  async processMigrationBatch(migrationId, data) {
    try {
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      const migration = this.currentMigration;
      if (!migration || migration.id !== migrationId) {
        throw new Error(`Invalid migration ID: ${migrationId}`);
      }

      migration.totalRecords += data.length;

      // Validate data
      if (this.options.validateBeforeMigrate && this.validator) {
        const validationResult = await this.validator.validate(data);
        if (!validationResult.valid) {
          migration.warnings.push(...validationResult.errors);
          this.emit('validation:warning', validationResult);
        }
      }

      // Detect duplicates
      let processedData = data;
      if (this.options.detectDuplicates && this.duplicateDetector) {
        const duplicateResult = await this.duplicateDetector.detectDuplicates(data);
        migration.duplicateRecords += duplicateResult.count;
        processedData = duplicateResult.uniqueData;
        
        if (duplicateResult.duplicates.length > 0) {
          this.emit('duplicates:detected', duplicateResult);
          this.log(
            `Found ${duplicateResult.count} duplicate records`,
            'warning',
            migrationId
          );
        }
      }

      // Process each record
      const results = [];
      for (const record of processedData) {
        try {
          const result = await this.migrateRecord(migration.config, record, migrationId);
          results.push(result);
          migration.processedRecords++;
          
          this.emit('record:migrated', { migrationId, record, result });
        } catch (error) {
          migration.failedRecords++;
          migration.errors.push({
            record,
            error: error.message,
            timestamp: new Date(),
          });
          
          this.emit('record:failed', { migrationId, record, error });
          this.log(
            `Failed to migrate record: ${error.message}`,
            'error',
            migrationId
          );
        }
      }

      return {
        batchSize: processedData.length,
        successCount: migration.processedRecords,
        failureCount: migration.failedRecords,
        results,
      };
    } catch (error) {
      this.log(`Batch processing error: ${error.message}`, 'error', migrationId);
      throw error;
    }
  }

  /**
   * Migrate individual record (to be overridden)
   */
  async migrateRecord(config, record, migrationId) {
    // This should be implemented by subclasses or configured externally
    return {
      sourceId: record.id,
      migrated: true,
      timestamp: new Date(),
    };
  }

  /**
   * Complete migration
   */
  async completeMigration(migrationId) {
    try {
      const migration = this.currentMigration;
      if (!migration || migration.id !== migrationId) {
        throw new Error(`Invalid migration ID: ${migrationId}`);
      }

      migration.status = 'completed';
      migration.endTime = new Date();
      migration.duration = migration.endTime - migration.startTime;

      this.emit('migration:complete', {
        migrationId,
        summary: this.getMigrationSummary(migrationId),
      });

      this.log(
        `Migration completed. Processed: ${migration.processedRecords}, Failed: ${migration.failedRecords}`,
        'info',
        migrationId
      );

      return this.getMigrationSummary(migrationId);
    } catch (error) {
      this.log(`Failed to complete migration: ${error.message}`, 'error', migrationId);
      throw error;
    }
  }

  /**
   * Cancel migration
   */
  async cancelMigration(migrationId) {
    try {
      const migration = this.currentMigration;
      if (!migration || migration.id !== migrationId) {
        throw new Error(`Invalid migration ID: ${migrationId}`);
      }

      migration.status = 'cancelled';
      migration.endTime = new Date();

      this.emit('migration:cancelled', { migrationId });
      this.log('Migration cancelled by user', 'info', migrationId);

      return { status: 'cancelled', migrationId };
    } catch (error) {
      this.log(`Failed to cancel migration: ${error.message}`, 'error', migrationId);
      throw error;
    }
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(migrationId) {
    try {
      const migration = this.currentMigration;
      if (!migration || migration.id !== migrationId) {
        throw new Error(`Invalid migration ID: ${migrationId}`);
      }

      if (!migration.backupFile) {
        throw new Error('No backup available for rollback');
      }

      // Restore from backup
      await this.restoreFromBackup(migration.backupFile);

      migration.status = 'rolled-back';
      this.emit('migration:rolled-back', { migrationId });
      this.log('Migration rolled back successfully', 'info', migrationId);

      return { status: 'rolled-back', migrationId };
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error', migrationId);
      throw error;
    }
  }

  /**
   * Create backup before migration
   */
  async createBackup(migrationId) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        this.options.backupDir,
        `backup-${migrationId}-${timestamp}.json`
      );

      // In real implementation, would backup actual database
      // For now, just create the file path
      fs.writeFileSync(
        backupFile,
        JSON.stringify({
          migrationId,
          timestamp: new Date(),
          status: 'created',
        }, null, 2)
      );

      this.currentMigration.backupFile = backupFile;
      this.log(`Backup created at ${backupFile}`, 'info', migrationId);

      return backupFile;
    } catch (error) {
      this.log(`Backup creation failed: ${error.message}`, 'error', migrationId);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFile) {
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      // In real implementation, would restore actual database
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      this.log(`Database restored from ${backupFile}`, 'info');
      return backupData;
    } catch (error) {
      this.log(`Backup restoration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get migration summary
   */
  getMigrationSummary(migrationId) {
    const migration = this.currentMigration;
    if (!migration || migration.id !== migrationId) {
      return null;
    }

    return {
      id: migration.id,
      status: migration.status,
      totalRecords: migration.totalRecords,
      processedRecords: migration.processedRecords,
      failedRecords: migration.failedRecords,
      duplicateRecords: migration.duplicateRecords,
      successRate: migration.totalRecords > 0 
        ? ((migration.processedRecords / migration.totalRecords) * 100).toFixed(2) + '%'
        : '0%',
      duration: migration.duration ? `${(migration.duration / 1000).toFixed(2)}s` : 'N/A',
      startTime: migration.startTime,
      endTime: migration.endTime,
      errors: migration.errors.length,
      warnings: migration.warnings.length,
    };
  }

  /**
   * Get migration history
   */
  getMigrationHistory() {
    return this.migrations.map((m) => ({
      id: m.id,
      status: m.status,
      startTime: m.startTime,
      endTime: m.endTime,
      summary: this.getMigrationSummary(m.id),
    }));
  }

  /**
   * Generate unique migration ID
   */
  generateMigrationId() {
    return `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log migration activities
   */
  log(message, level = 'info', migrationId = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      migrationId,
    };

    if (this.logger) {
      this.logger.log(logEntry);
    }

    this.emit('log', logEntry);

    // Also write to file
    try {
      const logFile = path.join(
        this.options.logDir,
        `migration-${new Date().toISOString().split('T')[0]}.log`
      );
      
      fs.appendFileSync(
        logFile,
        `[${level.toUpperCase()}] ${logEntry.timestamp} - ${message}\n`
      );
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }
}

module.exports = MigrationService;
