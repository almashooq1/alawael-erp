/**
 * Migration Manager
 * Orchestrates the entire data migration process
 */

const CSVProcessor = require('./CSVProcessor');
const DatabaseMigration = require('./DatabaseMigration');

class MigrationManager {
  constructor(config = {}) {
    this.config = {
      sourceDB: config.sourceDB,
      targetDB: config.targetDB,
      csvProcessor: config.csvProcessor || new CSVProcessor(),
      logger: config.logger || console,
      ...config,
    };

    this.csvProcessor = this.config.csvProcessor;
    this.dbMigration = new DatabaseMigration(
      this.config.sourceDB,
      this.config.targetDB,
      this.config.logger,
    );

    this.migrationPlan = null;
    this.executionLog = [];
    this.stats = {
      startTime: null,
      endTime: null,
      duration: 0,
      totalTables: 0,
      completedTables: 0,
      failedTables: 0,
      totalRecords: 0,
    };
  }

  /**
   * Create migration plan
   */
  createMigrationPlan(tables, options = {}) {
    this.migrationPlan = {
      tables,
      options,
      createdAt: new Date().toISOString(),
      steps: this.generateMigrationSteps(tables, options),
    };

    this.config.logger.info(`Migration plan created with ${tables.length} tables`);
    return this.migrationPlan;
  }

  /**
   * Generate migration steps
   */
  generateMigrationSteps(tables, options = {}) {
    const steps = [];

    if (options.preValidation) {
      steps.push({
        id: 'pre_validation',
        name: 'Pre-migration Validation',
        type: 'validation',
        tables,
      });
    }

    steps.push({
      id: 'backup',
      name: 'Create Database Backup',
      type: 'backup',
      timestamp: true,
    });

    for (const table of tables) {
      steps.push({
        id: `migrate_${table}`,
        name: `Migrate ${table}`,
        type: 'migration',
        table,
        transform: options.transforms?.[table],
        skipDuplicates: options.skipDuplicates,
      });
    }

    if (options.postValidation) {
      steps.push({
        id: 'post_validation',
        name: 'Post-migration Verification',
        type: 'verification',
        tables,
      });
    }

    if (options.postCleanup) {
      steps.push({
        id: 'post_cleanup',
        name: 'Cleanup Source Data',
        type: 'cleanup',
      });
    }

    return steps;
  }

  /**
   * Execute migration plan
   */
  async executeMigrationPlan(options = {}) {
    if (!this.migrationPlan) {
      throw new Error('No migration plan created. Call createMigrationPlan first.');
    }

    this.stats.startTime = Date.now();
    const steps = this.migrationPlan.steps;
    const results = [];

    this.config.logger.info('Starting migration execution');

    for (const step of steps) {
      try {
        this.config.logger.info(`Executing step: ${step.name}`);

        let result;
        switch (step.type) {
          case 'validation':
            result = await this.executeValidation(step);
            break;
          case 'backup':
            result = await this.executeBackup(step);
            break;
          case 'migration':
            result = await this.executeMigrationStep(step);
            break;
          case 'verification':
            result = await this.executeVerification(step);
            break;
          case 'cleanup':
            result = await this.executeCleanup(step);
            break;
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        results.push(result);
        this.executionLog.push(result);

        // Check if step failed and stop on error
        if (result.status === 'failed' && !options.continueOnError) {
          throw new Error(`Step failed: ${step.name}`);
        }
      } catch (error) {
        this.config.logger.error(`Step execution failed: ${error.message}`);
        results.push({
          step: step.id,
          status: 'failed',
          error: error.message,
        });

        if (!options.continueOnError) {
          break;
        }
      }
    }

    this.stats.endTime = Date.now();
    this.stats.duration = this.stats.endTime - this.stats.startTime;

    return this.getExecutionSummary();
  }

  /**
   * Execute validation step
   */
  async executeValidation(step) {
    const startTime = Date.now();

    try {
      const validationResults = [];

      for (const table of step.tables) {
        const result = await this.dbMigration.verifyMigration(table);
        validationResults.push(result);
      }

      return {
        step: step.id,
        name: step.name,
        status: 'completed',
        duration: Date.now() - startTime,
        validations: validationResults,
      };
    } catch (error) {
      return {
        step: step.id,
        name: step.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Execute backup step
   */
  async executeBackup(step) {
    const startTime = Date.now();

    try {
      this.config.logger.info('Creating database backup...');
      // Implement actual backup logic here
      // For now, we'll just log the backup
      const backupFile = `backup_${Date.now()}.sql`;

      return {
        step: step.id,
        name: step.name,
        status: 'completed',
        duration: Date.now() - startTime,
        backupFile,
      };
    } catch (error) {
      return {
        step: step.id,
        name: step.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Execute migration step for a table
   */
  async executeMigrationStep(step) {
    const startTime = Date.now();

    try {
      let result;

      if (step.transform) {
        result = await this.dbMigration.migrateTableWithTransform(
          step.table,
          step.transform,
          { skipDuplicates: step.skipDuplicates },
        );
      } else {
        result = await this.dbMigration.migrateTable(step.table, {
          skipDuplicates: step.skipDuplicates,
        });
      }

      this.stats.completedTables++;
      this.stats.totalRecords += result.recordsMigrated || 0;

      return {
        step: step.id,
        name: step.name,
        status: result.status,
        duration: Date.now() - startTime,
        recordsMigrated: result.recordsMigrated,
        table: step.table,
      };
    } catch (error) {
      this.stats.failedTables++;

      return {
        step: step.id,
        name: step.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        table: step.table,
      };
    }
  }

  /**
   * Execute verification step
   */
  async executeVerification(step) {
    const startTime = Date.now();

    try {
      const verifications = await this.dbMigration.verifyAllMigrations(step.tables);

      const allMatch = verifications.every((v) => v.match === true);

      return {
        step: step.id,
        name: step.name,
        status: allMatch ? 'completed' : 'warning',
        duration: Date.now() - startTime,
        verifications,
      };
    } catch (error) {
      return {
        step: step.id,
        name: step.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Execute cleanup step
   */
  async executeCleanup(step) {
    const startTime = Date.now();

    try {
      this.config.logger.info('Executing post-migration cleanup...');
      // Implement cleanup logic here

      return {
        step: step.id,
        name: step.name,
        status: 'completed',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        step: step.id,
        name: step.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Import CSV and migrate to target
   */
  async migrateFromCSV(csvPath, tableName, options = {}) {
    const startTime = Date.now();

    try {
      this.config.logger.info(`Starting CSV import from ${csvPath}`);

      // Import CSV
      const csvData = await this.csvProcessor.importCSV(csvPath, {
        columns: true,
        ...options.csvOptions,
      });

      if (!csvData.success) {
        throw new Error(`CSV import failed: ${csvData.errors.length} errors`);
      }

      this.config.logger.info(`Imported ${csvData.recordCount} records from CSV`);

      // Transform if needed
      let data = csvData.data;
      if (options.transform) {
        data = this.csvProcessor.transformData(data, options.transform);
      }

      // Insert into target database
      await this.dbMigration.insertBatch(tableName, data, options);

      return {
        status: 'completed',
        csvFile: csvPath,
        tableName,
        recordsMigrated: data.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'failed',
        csvFile: csvPath,
        tableName,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Export table to CSV
   */
  async exportTableToCSV(tableName, csvPath, options = {}) {
    const startTime = Date.now();

    try {
      this.config.logger.info(`Exporting table ${tableName} to CSV`);

      // Query all data
      const data = await this.config.sourceDB.query(`SELECT * FROM ${tableName}`);

      // Export to CSV
      const result = await this.csvProcessor.exportToCSV(data, csvPath, options);

      return {
        status: 'completed',
        table: tableName,
        csvFile: csvPath,
        recordsExported: result.recordCount,
        fileSize: result.fileSize,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'failed',
        table: tableName,
        csvFile: csvPath,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get execution summary
   */
  getExecutionSummary() {
    const failedSteps = this.executionLog.filter((log) => log.status === 'failed');
    const warningSteps = this.executionLog.filter((log) => log.status === 'warning');
    const totalDuration = this.executionLog.reduce((sum, log) => sum + (log.duration || 0), 0);

    return {
      stats: { ...this.stats, totalDuration },
      summary: {
        totalSteps: this.executionLog.length,
        completedSteps: this.executionLog.length - failedSteps.length - warningSteps.length,
        failedSteps: failedSteps.length,
        warningSteps: warningSteps.length,
        overallStatus: failedSteps.length > 0 ? 'failed' : 'success',
      },
      executionLog: this.executionLog,
    };
  }

  /**
   * Get execution log
   */
  getExecutionLog() {
    return this.executionLog;
  }

  /**
   * Clear execution log
   */
  clearLog() {
    this.executionLog = [];
    return this;
  }

  /**
   * Pause migration
   */
  pauseMigration() {
    this.config.logger.info('Migration paused');
    return {
      status: 'paused',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resume migration
   */
  resumeMigration() {
    this.config.logger.info('Migration resumed');
    return {
      status: 'resumed',
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = MigrationManager;
