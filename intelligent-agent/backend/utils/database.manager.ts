/**
 * ============================================
 * DATABASE MIGRATION & MANAGEMENT SYSTEM
 * نظام إدارة وهجرة قاعدة البيانات
 * ============================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { globalLogger } from '../utils/advanced.logger';

/**
 * Migration Interface
 */
export interface Migration {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Migration History Entry
 */
interface MigrationHistory {
  id: string;
  name: string;
  appliedAt: Date;
  duration: number;
  status: 'success' | 'failed' | 'rolled_back';
}

/**
 * Database Migration Manager
 */
export class MigrationManager {
  private migrationsDir: string;
  private historyFile: string;
  private migrations: Migration[] = [];
  private history: MigrationHistory[] = [];

  constructor(migrationsDir: string = './migrations') {
    this.migrationsDir = migrationsDir;
    this.historyFile = path.join(migrationsDir, '.migration-history.json');
    this.loadHistory();
  }

  /**
   * Register migration
   */
  registerMigration(migration: Migration) {
    this.migrations.push(migration);
    globalLogger.debug(`Migration registered: ${migration.id}`);
  }

  /**
   * Run all pending migrations
   */
  async runPending(): Promise<{ successful: number; failed: number }> {
    const pending = this.getPending();
    let successful = 0;
    let failed = 0;

    globalLogger.info(`Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      try {
        const startTime = Date.now();
        await migration.up();
        const duration = Date.now() - startTime;

        this.recordHistory({
          id: migration.id,
          name: migration.name,
          appliedAt: new Date(),
          duration,
          status: 'success',
        });

        globalLogger.info(`Migration completed: ${migration.id}`, 'MigrationManager', {
          duration,
        });

        successful++;
      } catch (error) {
        this.recordHistory({
          id: migration.id,
          name: migration.name,
          appliedAt: new Date(),
          duration: 0,
          status: 'failed',
        });

        globalLogger.error(
          `Migration failed: ${migration.id}`,
          error instanceof Error ? error : new Error(String(error)),
          'MigrationManager'
        );

        failed++;
      }
    }

    this.saveHistory();
    return { successful, failed };
  }

  /**
   * Rollback last migration
   */
  async rollback(): Promise<boolean> {
    if (this.history.length === 0) {
      globalLogger.warn('No migration history to rollback', 'MigrationManager');
      return false;
    }

    const lastEntry = this.history[this.history.length - 1];
    const migration = this.migrations.find(m => m.id === lastEntry.id);

    if (!migration) {
      globalLogger.error(
        `Migration not found for rollback: ${lastEntry.id}`,
        undefined,
        'MigrationManager'
      );
      return false;
    }

    try {
      const startTime = Date.now();
      await migration.down();
      const duration = Date.now() - startTime;

      lastEntry.status = 'rolled_back';
      this.saveHistory();

      globalLogger.info(`Migration rolled back: ${migration.id}`, 'MigrationManager', {
        duration,
      });

      return true;
    } catch (error) {
      globalLogger.error(
        `Rollback failed: ${migration.id}`,
        error instanceof Error ? error : new Error(String(error)),
        'MigrationManager'
      );
      return false;
    }
  }

  /**
   * Get pending migrations
   */
  getPending(): Migration[] {
    const appliedIds = new Set(this.history.map(h => h.id));
    return this.migrations.filter(m => !appliedIds.has(m.id));
  }

  /**
   * Get applied migrations
   */
  getApplied(): Migration[] {
    const appliedIds = new Set(this.history.map(h => h.id));
    return this.migrations.filter(m => appliedIds.has(m.id));
  }

  /**
   * Get migration status
   */
  getStatus(): {
    pending: number;
    applied: number;
    failed: number;
    lastMigration?: MigrationHistory;
  } {
    const failed = this.history.filter(h => h.status === 'failed').length;
    const lastMigration = this.history[this.history.length - 1];

    return {
      pending: this.getPending().length,
      applied: this.getApplied().length,
      failed,
      lastMigration,
    };
  }

  /**
   * Record history entry
   */
  private recordHistory(entry: MigrationHistory) {
    this.history.push(entry);
  }

  /**
   * Save history to file
   */
  private saveHistory() {
    const dir = path.dirname(this.historyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      this.historyFile,
      JSON.stringify(
        this.history.map(h => ({
          ...h,
          appliedAt: h.appliedAt.toISOString(),
        })),
        null,
        2
      )
    );
  }

  /**
   * Load history from file
   */
  private loadHistory() {
    if (fs.existsSync(this.historyFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
        this.history = data.map((h: any) => ({
          ...h,
          appliedAt: new Date(h.appliedAt),
        }));
      } catch (error) {
        globalLogger.warn('Failed to load migration history', 'MigrationManager');
      }
    }
  }
}

/**
 * Database Seed Manager
 */
export class SeedManager {
  private seedsDir: string;
  private seeds: Array<{
    id: string;
    run: () => Promise<void>;
  }> = [];

  constructor(seedsDir: string = './seeds') {
    this.seedsDir = seedsDir;
  }

  /**
   * Register seed
   */
  registerSeed(id: string, run: () => Promise<void>) {
    this.seeds.push({ id, run });
  }

  /**
   * Run all seeds
   */
  async runAll(): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    globalLogger.info(`Running ${this.seeds.length} seeds`);

    for (const seed of this.seeds) {
      try {
        const startTime = Date.now();
        await seed.run();
        const duration = Date.now() - startTime;

        globalLogger.info(`Seed completed: ${seed.id}`, 'SeedManager', {
          duration,
        });

        successful++;
      } catch (error) {
        globalLogger.error(
          `Seed failed: ${seed.id}`,
          error instanceof Error ? error : new Error(String(error)),
          'SeedManager'
        );

        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Run specific seed
   */
  async run(id: string): Promise<boolean> {
    const seed = this.seeds.find(s => s.id === id);

    if (!seed) {
      globalLogger.warn(`Seed not found: ${id}`, 'SeedManager');
      return false;
    }

    try {
      const startTime = Date.now();
      await seed.run();
      const duration = Date.now() - startTime;

      globalLogger.info(`Seed completed: ${id}`, 'SeedManager', {
        duration,
      });

      return true;
    } catch (error) {
      globalLogger.error(
        `Seed failed: ${id}`,
        error instanceof Error ? error : new Error(String(error)),
        'SeedManager'
      );

      return false;
    }
  }
}

/**
 * Database Connection Pool Monitoring
 */
export class PoolMonitor {
  private poolStats: {
    activeConnections: number;
    waitingRequests: number;
    availableConnections: number;
    totalConnections: number;
  } = {
    activeConnections: 0,
    waitingRequests: 0,
    availableConnections: 0,
    totalConnections: 0,
  };

  private history: Array<{
    timestamp: Date;
    stats: typeof this.poolStats;
  }> = [];

  /**
   * Update pool statistics
   */
  updateStats(stats: typeof this.poolStats) {
    this.poolStats = stats;
    this.history.push({
      timestamp: new Date(),
      stats: { ...stats },
    });

    // Keep last 1000 entries
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }

    // Check for issues
    this.checkHealth();
  }

  /**
   * Check pool health
   */
  private checkHealth() {
    const utilization = this.poolStats.activeConnections / this.poolStats.totalConnections;

    if (utilization > 0.9) {
      globalLogger.warn('Connection pool nearing capacity', 'PoolMonitor', {
        utilization: `${(utilization * 100).toFixed(2)}%`,
        active: this.poolStats.activeConnections,
        total: this.poolStats.totalConnections,
      });
    }

    if (this.poolStats.waitingRequests > 0) {
      globalLogger.info('Requests waiting for connection', 'PoolMonitor', {
        waitingRequests: this.poolStats.waitingRequests,
      });
    }
  }

  /**
   * Get current stats
   */
  getStats() {
    return this.poolStats;
  }

  /**
   * Get statistics history
   */
  getHistory(limit: number = 100) {
    return this.history.slice(-limit);
  }

  /**
   * Get average metrics
   */
  getAverages(): {
    avgActive: number;
    avgWaiting: number;
    maxActive: number;
    maxWaiting: number;
  } {
    if (this.history.length === 0) {
      return {
        avgActive: 0,
        avgWaiting: 0,
        maxActive: 0,
        maxWaiting: 0,
      };
    }

    const stats = this.history.map(h => h.stats);

    return {
      avgActive: stats.reduce((sum, s) => sum + s.activeConnections, 0) / stats.length,
      avgWaiting: stats.reduce((sum, s) => sum + s.waitingRequests, 0) / stats.length,
      maxActive: Math.max(...stats.map(s => s.activeConnections)),
      maxWaiting: Math.max(...stats.map(s => s.waitingRequests)),
    };
  }
}

/**
 * Database Backup Manager
 */
export class BackupManager {
  private backupDir: string;

  constructor(backupDir: string = './backups') {
    this.backupDir = backupDir;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }

  /**
   * Create backup
   */
  async createBackup(name: string, backupFn: () => Promise<Buffer>): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}-${timestamp}.backup`;
      const filepath = path.join(this.backupDir, filename);

      const data = await backupFn();
      fs.writeFileSync(filepath, data);

      globalLogger.info(`Backup created: ${filename}`, 'BackupManager');
      return filepath;
    } catch (error) {
      globalLogger.error(
        'Backup creation failed',
        error instanceof Error ? error : new Error(String(error)),
        'BackupManager'
      );
      throw error;
    }
  }

  /**
   * List backups
   */
  listBackups(): Array<{ name: string; size: number; created: Date }> {
    const files = fs.readdirSync(this.backupDir);

    return files
      .filter(f => f.endsWith('.backup'))
      .map(f => {
        const filepath = path.join(this.backupDir, f);
        const stat = fs.statSync(filepath);

        return {
          name: f,
          size: stat.size,
          created: stat.ctime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Delete old backups
   */
  cleanOldBackups(retentionDays: number = 30): number {
    const files = this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deleted = 0;

    files.forEach(backup => {
      if (backup.created < cutoffDate) {
        fs.unlinkSync(path.join(this.backupDir, backup.name));
        deleted++;
        globalLogger.info(`Backup deleted: ${backup.name}`, 'BackupManager');
      }
    });

    return deleted;
  }
}

export default {
  MigrationManager,
  SeedManager,
  PoolMonitor,
  BackupManager,
};
