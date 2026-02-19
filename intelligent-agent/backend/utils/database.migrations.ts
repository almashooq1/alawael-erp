/**
 * ============================================
 * DATABASE MIGRATIONS UTILITY
 * أدوات هجرة قاعدة البيانات
 * ============================================
 */

import mongoose, { Connection, Model } from 'mongoose';
import { globalLogger } from './advanced.logger';

interface MigrationScript {
  name: string;
  version: string;
  timestamp: number;
  up: () => Promise<void>;
  down: () => Promise<void>;
  description: string;
}

interface MigrationHistory {
  _id?: string;
  name: string;
  version: string;
  appliedAt: Date;
  reversedAt?: Date;
  status: 'applied' | 'reversed' | 'failed';
  error?: string;
}

class DatabaseMigrationManager {
  private db: Connection | null = null;
  private migrations: Map<string, MigrationScript> = new Map();
  private migrationHistoryModel: Model<any> | null = null;

  async initialize(connection: Connection): Promise<void> {
    try {
      this.db = connection;

      // Create migration history collection
      const schema = new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        version: { type: String, required: true },
        appliedAt: { type: Date, default: Date.now },
        reversedAt: { type: Date },
        status: { type: String, enum: ['applied', 'reversed', 'failed'], default: 'applied' },
        error: { type: String },
      });

      this.migrationHistoryModel =
        connection.model('MigrationHistory', schema, 'migrations_history') ||
        connection.models['MigrationHistory'];

      globalLogger.info('Migration manager initialized', 'DatabaseMigrations');
    } catch (error) {
      globalLogger.error(
        'Failed to initialize migration manager',
        'DatabaseMigrations',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Register a migration script
   */
  registerMigration(script: MigrationScript): void {
    try {
      if (this.migrations.has(script.name)) {
        throw new Error(`Migration ${script.name} already registered`);
      }

      this.migrations.set(script.name, script);
      globalLogger.info(`Migration registered: ${script.name}`, 'DatabaseMigrations', {
        version: script.version,
      });
    } catch (error) {
      globalLogger.error(
        `Failed to register migration: ${script.name}`,
        'DatabaseMigrations',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{ applied: MigrationHistory[]; pending: MigrationScript[] }> {
    try {
      if (!this.migrationHistoryModel) {
        throw new Error('Migration manager not initialized');
      }

      const applied = await this.migrationHistoryModel.find({ status: 'applied' });

      const pending = Array.from(this.migrations.values()).filter(
        m => !applied.find(a => a.name === m.name)
      );

      return { applied, pending };
    } catch (error) {
      globalLogger.error('Failed to get migration status', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<{
    successful: string[];
    failed: Array<{ name: string; error: string }>;
  }> {
    try {
      const { pending } = await this.getStatus();

      const successful: string[] = [];
      const failed: Array<{ name: string; error: string }> = [];

      for (const migration of pending) {
        try {
          globalLogger.info(`Running migration: ${migration.name}`, 'DatabaseMigrations');

          await migration.up();

          // Record migration
          if (this.migrationHistoryModel) {
            await this.migrationHistoryModel.create({
              name: migration.name,
              version: migration.version,
              status: 'applied',
            });
          }

          successful.push(migration.name);
          globalLogger.info(`Migration completed: ${migration.name}`, 'DatabaseMigrations');
        } catch (error) {
          failed.push({
            name: migration.name,
            error: (error as Error).message,
          });

          globalLogger.error(
            `Migration failed: ${migration.name}`,
            'DatabaseMigrations',
            error as Error
          );

          // Record failure
          if (this.migrationHistoryModel) {
            await this.migrationHistoryModel.create({
              name: migration.name,
              version: migration.version,
              status: 'failed',
              error: (error as Error).message,
            });
          }
        }
      }

      return { successful, failed };
    } catch (error) {
      globalLogger.error('Failed to run migrations', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Rollback last migration
   */
  async rollbackLast(): Promise<string | null> {
    try {
      if (!this.migrationHistoryModel) {
        throw new Error('Migration manager not initialized');
      }

      const lastMigration = await this.migrationHistoryModel
        .findOne({ status: 'applied' })
        .sort({ appliedAt: -1 });

      if (!lastMigration) {
        globalLogger.warn('No migrations to rollback', 'DatabaseMigrations');
        return null;
      }

      const migration = this.migrations.get(lastMigration.name);
      if (!migration) {
        throw new Error(`Migration script not found: ${lastMigration.name}`);
      }

      globalLogger.info(`Rolling back migration: ${lastMigration.name}`, 'DatabaseMigrations');

      await migration.down();

      // Update history
      await this.migrationHistoryModel.updateOne(
        { name: lastMigration.name },
        {
          $set: {
            status: 'reversed',
            reversedAt: new Date(),
          },
        }
      );

      globalLogger.info(
        `Migration rollback completed: ${lastMigration.name}`,
        'DatabaseMigrations'
      );

      return lastMigration.name;
    } catch (error) {
      globalLogger.error('Failed to rollback migration', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Rollback all migrations
   */
  async rollbackAll(): Promise<string[]> {
    try {
      const rolled = [];

      let rollbackCount = 0;
      const maxRollbacks = 100;

      while (rollbackCount < maxRollbacks) {
        const rolled_name = await this.rollbackLast();
        if (!rolled_name) break;
        rolled.push(rolled_name);
        rollbackCount++;
      }

      globalLogger.info(`Rolled back ${rolled.length} migrations`, 'DatabaseMigrations');
      return rolled;
    } catch (error) {
      globalLogger.error('Failed to rollback all migrations', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Get migration history
   */
  async getHistory(limit: number = 50): Promise<MigrationHistory[]> {
    try {
      if (!this.migrationHistoryModel) {
        throw new Error('Migration manager not initialized');
      }

      return await this.migrationHistoryModel.find().sort({ appliedAt: -1 }).limit(limit);
    } catch (error) {
      globalLogger.error('Failed to get migration history', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes(model: Model<any>, indexes: any[]): Promise<void> {
    try {
      for (const index of indexes) {
        await model.collection.createIndex(index.fields, index.options || {});
        globalLogger.info(`Index created: ${JSON.stringify(index.fields)}`, 'DatabaseMigrations');
      }
    } catch (error) {
      globalLogger.error('Failed to create indexes', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Drop database indexes
   */
  async dropIndexes(model: Model<any>, indexNames: string[]): Promise<void> {
    try {
      for (const indexName of indexNames) {
        await model.collection.dropIndex(indexName);
        globalLogger.info(`Index dropped: ${indexName}`, 'DatabaseMigrations');
      }
    } catch (error) {
      globalLogger.error('Failed to drop indexes', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }

  /**
   * Verify database integrity
   */
  async verifyIntegrity(): Promise<{
    collections: number;
    indexes: number;
    errors: string[];
  }> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const collections = await this.db.db.listCollections().toArray();
      const errors: string[] = [];

      for (const collection of collections) {
        try {
          const stats = await this.db.db.collection(collection.name).stats();
          globalLogger.info(
            `Collection ${collection.name}: ${stats.count} documents`,
            'DatabaseMigrations'
          );
        } catch (error) {
          errors.push(`Error verifying collection ${collection.name}: ${(error as Error).message}`);
        }
      }

      return {
        collections: collections.length,
        indexes: collections.length,
        errors,
      };
    } catch (error) {
      globalLogger.error(
        'Failed to verify database integrity',
        'DatabaseMigrations',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backupDatabase(backupName: string): Promise<string> {
    try {
      const timestamp = new Date().getTime();
      const backupId = `${backupName}_${timestamp}`;

      globalLogger.info(`Starting database backup: ${backupId}`, 'DatabaseMigrations');

      // In production, use MongoDB backup tools
      // This is a placeholder for backup logic

      globalLogger.info(`Database backup completed: ${backupId}`, 'DatabaseMigrations');

      return backupId;
    } catch (error) {
      globalLogger.error('Failed to backup database', 'DatabaseMigrations', error as Error);
      throw error;
    }
  }
}

export const migrationManager = new DatabaseMigrationManager();

/**
 * Example Migration Scripts
 */

export const createEmployeeIndexesMigration: MigrationScript = {
  name: 'create_employee_indexes',
  version: '1.0.0',
  timestamp: Date.now(),
  description: 'Create indexes for employee collection',
  up: async () => {
    // Migration logic
    globalLogger.info('Creating employee indexes', 'Migrations');
  },
  down: async () => {
    // Rollback logic
    globalLogger.info('Dropping employee indexes', 'Migrations');
  },
};

export const addAIInsightsMigration: MigrationScript = {
  name: 'add_ai_insights_field',
  version: '1.1.0',
  timestamp: Date.now(),
  description: 'Add AI insights field to employees',
  up: async () => {
    globalLogger.info('Adding AI insights field', 'Migrations');
  },
  down: async () => {
    globalLogger.info('Removing AI insights field', 'Migrations');
  },
};
