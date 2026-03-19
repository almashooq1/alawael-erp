/**
 * Migration System Index
 * Central export point for all migration utilities
 */

const CSVProcessor = require('./CSVProcessor');
const DatabaseMigration = require('./DatabaseMigration');
const MigrationManager = require('./MigrationManager');

/**
 * Export all migration utilities
 */
module.exports = {
  CSVProcessor,
  DatabaseMigration,
  MigrationManager,

  /**
   * Factory function to create migration manager
   */
  createMigrationManager: (config) => new MigrationManager(config),

  /**
   * Factory function to create CSV processor
   */
  createCSVProcessor: (options) => new CSVProcessor(options),

  /**
   * Factory function to create database migration
   */
  createDatabaseMigration: (sourceDB, targetDB, logger) =>
    new DatabaseMigration(sourceDB, targetDB, logger),
};
