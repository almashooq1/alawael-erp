/**
 * Migration System Usage Examples
 * Real-world examples of using the migration system
 */

const mysql = require('mysql2/promise');
const {
  MigrationManager,
  CSVProcessor,
  DatabaseMigration,
} = require('../services/migration');
const { getConfig, getMigrationPlan, getTransformationRules } = require('../config/migration.config');

/**
 * Example 1: Simple ERP Migration
 */
async function example1_SimpleERPMigration() {
  console.log('\n=== Example 1: Simple ERP Migration ===\n');

  try {
    // Get configuration
    const config = getConfig('development');

    // Create database connections
    const sourceDB = mysql.createPool(config.sourceDB);
    const targetDB = mysql.createPool(config.targetDB);

    // Create migration manager
    const manager = new MigrationManager({
      sourceDB,
      targetDB,
      logger: console,
    });

    // Create migration plan
    const tables = ['users', 'products', 'customers', 'orders'];
    const plan = manager.createMigrationPlan(tables, {
      preValidation: true,
      postValidation: true,
      skipDuplicates: false,
    });

    console.log('Migration plan created with steps:');
    plan.steps.forEach((step) => {
      console.log(`  - ${step.name}`);
    });

    // Execute migration
    console.log('\nExecuting migration...');
    const result = await manager.executeMigrationPlan();

    // Display results
    console.log('\nMigration Results:');
    console.log(`  Status: ${result.summary.overallStatus}`);
    console.log(`  Completed Tables: ${result.stats.completedTables}`);
    console.log(`  Total Records: ${result.stats.totalRecords}`);
    console.log(`  Duration: ${result.stats.duration}ms`);
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

/**
 * Example 2: CSV Import with Data Transformation
 */
async function example2_CSVImportWithTransformation() {
  console.log('\n=== Example 2: CSV Import with Data Transformation ===\n');

  try {
    const config = getConfig('development');
    const sourceDB = mysql.createPool(config.sourceDB);
    const targetDB = mysql.createPool(config.targetDB);

    const manager = new MigrationManager({
      sourceDB,
      targetDB,
      logger: console,
    });

    // Step 1: Validate CSV
    const csvProcessor = new CSVProcessor();
    console.log('1. Validating CSV structure...');
    const validation = await csvProcessor.validateCSVStructure(
      './data/users.csv',
      ['email', 'phone', 'status']
    );

    if (!validation.valid) {
      console.error('CSV validation failed:', validation.errors);
      return;
    }
    console.log('  ✓ CSV validation passed');

    // Step 2: Sample CSV
    console.log('\n2. Sampling CSV data...');
    const sample = await csvProcessor.sampleCSV('./data/users.csv', 5);
    console.log(`  Found ${sample.sampleSize} sample records`);

    // Step 3: Import with transformation
    console.log('\n3. Importing and transforming data...');
    const result = await manager.migrateFromCSV('./data/users.csv', 'users', {
      transform: getTransformationRules('users'),
    });

    console.log(`  ✓ Imported ${result.recordsMigrated} records`);
  } catch (error) {
    console.error('CSV import error:', error.message);
  }
}

/**
 * Example 3: Large File Migration with Chunks
 */
async function example3_LargeFileChunkedMigration() {
  console.log('\n=== Example 3: Large File Migration with Chunks ===\n');

  try {
    const config = getConfig('development');
    const sourceDB = mysql.createPool(config.sourceDB);
    const targetDB = mysql.createPool(config.targetDB);

    const csvProcessor = new CSVProcessor({
      maxRowsPerChunk: 10000,
    });

    const dbMigration = new DatabaseMigration(sourceDB, targetDB, console);

    // Get file info
    console.log('1. Getting file information...');
    const fileInfo = await csvProcessor.getCSVInfo('./data/large-orders.csv');
    console.log(`  File size: ${fileInfo.fileSizeKB} KB`);
    console.log(`  Row count: ${fileInfo.rowCount}`);

    // Import in chunks
    console.log('\n2. Importing in chunks...');
    const { chunks } = await csvProcessor.importCSVInChunks(
      './data/large-orders.csv',
      5000 // 5000 rows per chunk
    );
    console.log(`  Total chunks: ${chunks.length}`);

    // Process each chunk
    console.log('\n3. Processing chunks...');
    let totalProcessed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Transform data
      const transformed = csvProcessor.transformData(
        chunk,
        getTransformationRules('orders')
      );
      // Insert chunk
      await dbMigration.insertBatch('orders', transformed);
      totalProcessed += transformed.length;
      console.log(`  ✓ Processed chunk ${i + 1}/${chunks.length} (${totalProcessed} records)`);
    }
  } catch (error) {
    console.error('Large file migration error:', error.message);
  }
}

/**
 * Example 4: Full Migration with Validation and Backup
 */
async function example4_FullMigrationWithValidation() {
  console.log('\n=== Example 4: Full Migration with Validation ===\n');

  try {
    const config = getConfig('production');
    const sourceDB = mysql.createPool(config.sourceDB);
    const targetDB = mysql.createPool(config.targetDB);

    const manager = new MigrationManager({
      sourceDB,
      targetDB,
      logger: console,
    });

    // Get migration plan
    const plan = getMigrationPlan('fullERP');
    const migration = manager.createMigrationPlan(plan.tables, plan.options);

    console.log(`Created plan: ${plan.name}`);
    console.log(`Tables to migrate: ${plan.tables.length}`);

    // Execute with monitoring
    console.log('\nStarting migration...');
    const result = await manager.executeMigrationPlan({
      continueOnError: false,
    });

    // Display detailed results
    console.log('\n=== Migration Summary ===');
    console.log(`Status: ${result.summary.overallStatus}`);
    console.log(`Total Steps: ${result.summary.totalSteps}`);
    console.log(`Completed: ${result.summary.completedSteps}`);
    console.log(`Failed: ${result.summary.failedSteps}`);
    console.log(`Warnings: ${result.summary.warningSteps}`);

    // Show per-table results
    console.log('\n=== Per-Table Results ===');
    result.executionLog.forEach((log) => {
      if (log.table) {
        console.log(
          `${log.table}: ${log.status} (${log.recordsMigrated || 0} records, ${log.duration}ms)`
        );
      }
    });

    // Display statistics
    console.log('\n=== Statistics ===');
    console.log(`Total Duration: ${result.stats.duration}ms`);
    console.log(`Total Records: ${result.stats.totalRecords}`);
    console.log(`Completed Tables: ${result.stats.completedTables}`);
    console.log(`Failed Tables: ${result.stats.failedTables}`);
  } catch (error) {
    console.error('Full migration error:', error.message);
  }
}

/**
 * Example 5: Incremental Data Sync
 */
async function example5_IncrementalDataSync() {
  console.log('\n=== Example 5: Incremental Data Sync ===\n');

  try {
    const config = getConfig('development');
    const sourceDB = mysql.createPool(config.sourceDB);
    const targetDB = mysql.createPool(config.targetDB);

    const manager = new MigrationManager({
      sourceDB,
      targetDB,
      logger: console,
    });

    // Get incremental sync plan
    const plan = getMigrationPlan('incrementalSync');

    // Create plan with skipDuplicates to avoid duplicate key errors
    const migration = manager.createMigrationPlan(plan.tables, plan.options);

    console.log(`Syncing tables: ${plan.tables.join(', ')}`);
    console.log('Options: skipDuplicates=true, continueOnError=true');

    const result = await manager.executeMigrationPlan();

    console.log('\nSync Results:');
    console.log(`Status: ${result.summary.overallStatus}`);
    console.log(`Records processed: ${result.stats.totalRecords}`);
  } catch (error) {
    console.error('Sync error:', error.message);
  }
}

/**
 * Example 6: Data Backup to CSV
 */
async function example6_BackupToCSV() {
  console.log('\n=== Example 6: Data Backup to CSV ===\n');

  try {
    const config = getConfig('development');
    const sourceDB = mysql.createPool(config.sourceDB);
    const manager = new MigrationManager({
      sourceDB,
      targetDB: null,
      logger: console,
    });

    const tables = ['users', 'products', 'customers', 'orders'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log('Starting backup...');
    for (const table of tables) {
      const result = await manager.exportTableToCSV(
        table,
        `./backups/${table}_${timestamp}.csv`
      );

      console.log(
        `✓ Backed up ${table}: ${result.recordsExported} records (${result.fileSize} bytes)`
      );
    }

    console.log('\nBackup completed successfully');
  } catch (error) {
    console.error('Backup error:', error.message);
  }
}

/**
 * Example 7: Advanced CSV Processing with Filtering
 */
async function example7_AdvancedCSVProcessing() {
  console.log('\n=== Example 7: Advanced CSV Processing ===\n');

  try {
    const csvProcessor = new CSVProcessor();

    // Step 1: Import CSV
    console.log('1. Importing CSV...');
    const { data } = await csvProcessor.importCSV('./data/orders.csv', {
      columns: true,
    });
    console.log(`  Imported ${data.length} records`);

    // Step 2: Filter data (e.g., orders from last month)
    console.log('\n2. Filtering data...');
    const filtered = csvProcessor.filterData(data, (row) => {
      const orderDate = new Date(row.order_date);
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return orderDate >= lastMonth;
    });
    console.log(`  Filtered to ${filtered.length} records`);

    // Step 3: Map columns
    console.log('\n3. Mapping columns...');
    const mapped = csvProcessor.mapColumns(filtered, {
      'order_id': 'id',
      'customer_name': 'name',
      'order_total': 'amount',
    });
    console.log(`  Mapped ${mapped.length} records`);

    // Step 4: Transform data
    console.log('\n4. Transforming data...');
    const transformed = csvProcessor.transformData(mapped, {
      amount: { type: 'float' },
      order_date: { type: 'date' },
      status: { mapping: { 'P': 'pending', 'C': 'completed', 'X': 'cancelled' } },
    });

    // Step 5: Export
    console.log('\n5. Exporting to new CSV...');
    await csvProcessor.exportToCSV(transformed, './exports/processed_orders.csv');
    console.log('  ✓ Exported successfully');
  } catch (error) {
    console.error('CSV processing error:', error.message);
  }
}

/**
 * Example 8: Custom Migration with Progress Tracking
 */
async function example8_MigrationWithProgressTracking() {
  console.log('\n=== Example 8: Migration with Progress Tracking ===\n');

  try {
    const config = getConfig('development');
    const sourceDB = mysql.createPool(config.sourceDB);
    const targetDB = mysql.createPool(config.targetDB);

    const dbMigration = new DatabaseMigration(sourceDB, targetDB, {
      info: (msg) => console.log(`[INFO] ${msg}`),
      error: (msg) => console.error(`[ERROR] ${msg}`),
      warn: (msg) => console.warn(`[WARN] ${msg}`),
    });

    dbMigration.setBatchSize(1000);

    const tables = ['users', 'products', 'orders'];

    console.log(`Migrating ${tables.length} tables...\n`);

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      console.log(`[${i + 1}/${tables.length}] Migrating ${table}...`);

      const result = await dbMigration.migrateTable(table);

      console.log(
        `  ✓ Completed: ${result.recordsMigrated} records in ${result.duration}ms\n`
      );
    }

    // Verify
    console.log('Verifying migration...');
    const verifications = await dbMigration.verifyAllMigrations(tables);
    verifications.forEach((v) => {
      const status = v.match ? '✓' : '✗';
      console.log(
        `  ${status} ${v.table}: ${v.sourceRecords} source, ${v.targetRecords} target`
      );
    });

    // Summary
    const summary = dbMigration.getMigrationSummary();
    console.log('\nMigration Summary:');
    console.log(`  Total Tables: ${summary.totalTables}`);
    console.log(`  Completed: ${summary.completedTables}`);
    console.log(`  Failed: ${summary.failedTables}`);
    console.log(`  Total Records: ${summary.totalRecordsMigrated}`);
    console.log(`  Total Duration: ${summary.totalDuration}ms`);
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

/**
 * Main execution (if this file is run directly)
 */
async function main() {
  const example = process.argv[2] || '1';

  switch (example) {
    case '1':
      await example1_SimpleERPMigration();
      break;
    case '2':
      await example2_CSVImportWithTransformation();
      break;
    case '3':
      await example3_LargeFileChunkedMigration();
      break;
    case '4':
      await example4_FullMigrationWithValidation();
      break;
    case '5':
      await example5_IncrementalDataSync();
      break;
    case '6':
      await example6_BackupToCSV();
      break;
    case '7':
      await example7_AdvancedCSVProcessing();
      break;
    case '8':
      await example8_MigrationWithProgressTracking();
      break;
    default:
      console.log('Usage: node migration-examples.js [1-8]');
      console.log('\nAvailable examples:');
      console.log('  1 - Simple ERP Migration');
      console.log('  2 - CSV Import with Transformation');
      console.log('  3 - Large File Chunked Migration');
      console.log('  4 - Full Migration with Validation');
      console.log('  5 - Incremental Data Sync');
      console.log('  6 - Backup to CSV');
      console.log('  7 - Advanced CSV Processing');
      console.log('  8 - Migration with Progress Tracking');
  }
}

// Export examples for use in other modules
module.exports = {
  example1_SimpleERPMigration,
  example2_CSVImportWithTransformation,
  example3_LargeFileChunkedMigration,
  example4_FullMigrationWithValidation,
  example5_IncrementalDataSync,
  example6_BackupToCSV,
  example7_AdvancedCSVProcessing,
  example8_MigrationWithProgressTracking,
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
