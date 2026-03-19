/**
 * Database Migration Service
 * Manages data migration between databases
 */

class DatabaseMigration {
  constructor(sourceDB, targetDB, logger = console) {
    this.sourceDB = sourceDB;
    this.targetDB = targetDB;
    this.logger = logger;
    this.migrationLog = [];
    this.batchSize = 1000;
  }

  /**
   * Set batch size for migration
   */
  setBatchSize(size) {
    this.batchSize = size;
    return this;
  }

  /**
   * Copy table from source to target
   */
  async migrateTable(tableName, options = {}) {
    const startTime = Date.now();
    const migrationRecord = {
      table: tableName,
      startTime: new Date().toISOString(),
      status: 'in_progress',
    };

    try {
      this.logger.info(`Starting migration for table: ${tableName}`);

      // Get total record count
      const countResult = await this.sourceDB.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      const totalRecords = countResult[0]?.count || 0;

      if (totalRecords === 0) {
        this.logger.warn(`Table ${tableName} is empty`);
        migrationRecord.recordsMigrated = 0;
        migrationRecord.status = 'completed';
        this.migrationLog.push(migrationRecord);
        return migrationRecord;
      }

      let migratedCount = 0;
      let offset = 0;

      // Migrate in batches
      while (offset < totalRecords) {
        const rows = await this.sourceDB.query(
          `SELECT * FROM ${tableName} LIMIT ${this.batchSize} OFFSET ${offset}`,
        );

        if (rows.length === 0) break;

        // Insert batch into target
        await this.insertBatch(tableName, rows, options);

        migratedCount += rows.length;
        offset += this.batchSize;

        const progress = ((migratedCount / totalRecords) * 100).toFixed(2);
        this.logger.info(`Migration progress for ${tableName}: ${progress}%`);
      }

      migrationRecord.recordsMigrated = migratedCount;
      migrationRecord.status = 'completed';
      migrationRecord.duration = Date.now() - startTime;
      migrationRecord.endTime = new Date().toISOString();

      this.migrationLog.push(migrationRecord);
      this.logger.info(`Successfully migrated ${migratedCount} records from ${tableName}`);

      return migrationRecord;
    } catch (error) {
      migrationRecord.status = 'failed';
      migrationRecord.error = error.message;
      migrationRecord.duration = Date.now() - startTime;
      this.migrationLog.push(migrationRecord);

      this.logger.error(`Migration failed for table ${tableName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Insert batch of records
   */
  async insertBatch(tableName, rows, options = {}) {
    if (rows.length === 0) return;

    try {
      const columns = Object.keys(rows[0]);
      const placeholders = rows.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
      const values = rows.flatMap((row) => columns.map((col) => row[col]));

      const insertQuery = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${placeholders}`;

      if (options.skipDuplicates) {
        return await this.insertBatchIgnoreDuplicates(tableName, rows, columns);
      }

      await this.targetDB.query(insertQuery, values);
    } catch (error) {
      throw new Error(`Failed to insert batch into ${tableName}: ${error.message}`);
    }
  }

  /**
   * Insert batch ignoring duplicates
   */
  async insertBatchIgnoreDuplicates(tableName, rows, columns) {
    for (const row of rows) {
      try {
        const values = columns.map((col) => row[col]);
        const placeholders = columns.map(() => '?').join(',');
        const query = `INSERT IGNORE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
        await this.targetDB.query(query, values);
      } catch (error) {
        if (!error.message.includes('Duplicate')) {
          throw error;
        }
        // Skip duplicates
      }
    }
  }

  /**
   * Migrate multiple tables
   */
  async migrateTables(tableList, options = {}) {
    const results = [];

    for (const table of tableList) {
      try {
        const result = await this.migrateTable(table, options);
        results.push(result);
      } catch (error) {
        results.push({
          table,
          status: 'failed',
          error: error.message,
        });

        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Migrate with data transformation
   */
  async migrateTableWithTransform(tableName, transformFn, options = {}) {
    const startTime = Date.now();
    const migrationRecord = {
      table: tableName,
      startTime: new Date().toISOString(),
      status: 'in_progress',
    };

    try {
      this.logger.info(`Starting transformed migration for table: ${tableName}`);

      const countResult = await this.sourceDB.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      const totalRecords = countResult[0]?.count || 0;

      let migratedCount = 0;
      let offset = 0;

      while (offset < totalRecords) {
        const rows = await this.sourceDB.query(
          `SELECT * FROM ${tableName} LIMIT ${this.batchSize} OFFSET ${offset}`,
        );

        if (rows.length === 0) break;

        // Transform rows
        const transformedRows = rows.map((row) => transformFn(row));

        // Insert transformed batch
        await this.insertBatch(tableName, transformedRows, options);

        migratedCount += rows.length;
        offset += this.batchSize;
      }

      migrationRecord.recordsMigrated = migratedCount;
      migrationRecord.status = 'completed';
      migrationRecord.duration = Date.now() - startTime;

      this.migrationLog.push(migrationRecord);
      return migrationRecord;
    } catch (error) {
      migrationRecord.status = 'failed';
      migrationRecord.error = error.message;
      this.migrationLog.push(migrationRecord);
      throw error;
    }
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration(tableName) {
    try {
      const sourceCount = await this.sourceDB.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      const targetCount = await this.targetDB.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );

      const sourceRecords = sourceCount[0]?.count || 0;
      const targetRecords = targetCount[0]?.count || 0;

      return {
        table: tableName,
        sourceRecords,
        targetRecords,
        match: sourceRecords === targetRecords,
        discrepancy: Math.abs(sourceRecords - targetRecords),
      };
    } catch (error) {
      throw new Error(`Verification failed for table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Verify all tables
   */
  async verifyAllMigrations(tableList) {
    const results = [];

    for (const table of tableList) {
      try {
        const result = await this.verifyMigration(table);
        results.push(result);
      } catch (error) {
        results.push({
          table,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(tableName) {
    try {
      this.logger.info(`Rolling back migration for table: ${tableName}`);

      // Truncate target table
      await this.targetDB.query(`TRUNCATE TABLE ${tableName}`);

      this.logger.info(`Successfully rolled back table: ${tableName}`);

      return {
        table: tableName,
        status: 'rolled_back',
      };
    } catch (error) {
      throw new Error(`Rollback failed for table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Get migration log
   */
  getMigrationLog() {
    return this.migrationLog;
  }

  /**
   * Get migration summary
   */
  getMigrationSummary() {
    const log = this.migrationLog;
    const completed = log.filter((l) => l.status === 'completed');
    const failed = log.filter((l) => l.status === 'failed');
    const totalRecords = completed.reduce((sum, l) => sum + (l.recordsMigrated || 0), 0);
    const totalDuration = completed.reduce((sum, l) => sum + (l.duration || 0), 0);

    return {
      totalTables: log.length,
      completedTables: completed.length,
      failedTables: failed.length,
      totalRecordsMigrated: totalRecords,
      totalDuration,
      averageTimePerTable: completed.length > 0 ? totalDuration / completed.length : 0,
      migrations: log,
    };
  }

  /**
   * Clear migration log
   */
  clearLog() {
    this.migrationLog = [];
    return this;
  }
}

module.exports = DatabaseMigration;
