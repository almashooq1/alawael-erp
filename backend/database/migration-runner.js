/**
 * Migration Runner - Al-Awael ERP
 * نظام تشغيل الهجرات الاحترافي
 *
 * Features:
 *  - Sequential migration execution with versioning
 *  - Automatic up/down (rollback) support
 *  - Migration locking (prevents concurrent runs)
 *  - Migration status tracking in DB
 *  - Batch processing with checkpoints
 *  - Dry-run mode
 *  - Migration generator CLI helper
 *  - Pre/Post migration hooks
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Migration Record Schema
// ══════════════════════════════════════════════════════════════════
const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    batch: { type: Number, required: true },
    executedAt: { type: Date, default: Date.now },
    duration: { type: Number }, // ms
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'rolled_back'],
      default: 'pending',
    },
    error: { type: String },
    checksum: { type: String }, // MD5 of migration file content
  },
  { timestamps: true }
);

let MigrationRecord;
try {
  MigrationRecord = mongoose.model('MigrationRecord');
} catch {
  MigrationRecord = mongoose.model('MigrationRecord', migrationSchema);
}

// ══════════════════════════════════════════════════════════════════
// Migration Lock Schema (prevent concurrent runs)
// ══════════════════════════════════════════════════════════════════
const migrationLockSchema = new mongoose.Schema({
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: String },
  lockedAt: { type: Date },
  expiresAt: { type: Date },
});

let MigrationLock;
try {
  MigrationLock = mongoose.model('MigrationLock');
} catch {
  MigrationLock = mongoose.model('MigrationLock', migrationLockSchema);
}

// ══════════════════════════════════════════════════════════════════
// MigrationRunner
// ══════════════════════════════════════════════════════════════════
class MigrationRunner {
  constructor(options = {}) {
    this._migrationsDir = options.migrationsDir || path.join(__dirname, '..', 'migrations');
    this._lockTimeout = options.lockTimeout || 600000; // 10 min
    this._dryRun = options.dryRun || false;
    this._hooks = {
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: [],
    };
  }

  // ────── Discover Migration Files ──────
  _discoverMigrations() {
    if (!fs.existsSync(this._migrationsDir)) {
      logger.warn(`[Migration] Directory not found: ${this._migrationsDir}`);
      return [];
    }

    const files = fs
      .readdirSync(this._migrationsDir)
      .filter(f => f.endsWith('.js') && !f.startsWith('_'))
      .sort(); // Natural sort by filename (e.g., 20250101000000_xxx.js)

    return files.map(filename => ({
      name: filename.replace('.js', ''),
      filename,
      path: path.join(this._migrationsDir, filename),
    }));
  }

  // ────── Get Checksum ──────
  _getChecksum(filePath) {
    const crypto = require('crypto');
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // ────── Acquire Migration Lock ──────
  async _acquireLock() {
    const hostname = require('os').hostname();
    const lockId = `${hostname}-${process.pid}`;
    const expiresAt = new Date(Date.now() + this._lockTimeout);

    // Try to acquire lock
    const result = await MigrationLock.findOneAndUpdate(
      {
        $or: [
          { isLocked: false },
          { expiresAt: { $lt: new Date() } }, // Expired lock
        ],
      },
      {
        isLocked: true,
        lockedBy: lockId,
        lockedAt: new Date(),
        expiresAt,
      },
      { upsert: true, new: true }
    );

    if (result.lockedBy !== lockId) {
      throw new Error(`Migration lock held by: ${result.lockedBy} since ${result.lockedAt}`);
    }

    return lockId;
  }

  // ────── Release Migration Lock ──────
  async _releaseLock(lockId) {
    await MigrationLock.updateOne(
      { lockedBy: lockId },
      { isLocked: false, lockedBy: null, lockedAt: null, expiresAt: null }
    );
  }

  // ────── Run All Pending Migrations ──────
  /**
   * Execute all pending migrations (not yet run)
   * @returns {Object} { executed, skipped, errors }
   */
  async runAll() {
    const lockId = await this._acquireLock();

    try {
      // Run beforeAll hooks
      for (const hook of this._hooks.beforeAll) {
        await hook();
      }

      const allMigrations = this._discoverMigrations();
      const executed = await MigrationRecord.find({ status: 'completed' }).lean();
      const executedNames = new Set(executed.map(m => m.name));

      // Get next batch number
      const lastBatch = await MigrationRecord.findOne().sort({ batch: -1 }).lean();
      const batch = (lastBatch?.batch || 0) + 1;

      const pending = allMigrations.filter(m => !executedNames.has(m.name));

      if (pending.length === 0) {
        logger.info('[Migration] No pending migrations');
        return { executed: 0, skipped: allMigrations.length, errors: [] };
      }

      logger.info(`[Migration] Running ${pending.length} pending migration(s)...`);

      const results = [];
      for (const migration of pending) {
        const result = await this._executeMigration(migration, batch, 'up');
        results.push(result);
        if (result.error) break; // Stop on first error
      }

      // Run afterAll hooks
      for (const hook of this._hooks.afterAll) {
        await hook(results);
      }

      const successes = results.filter(r => !r.error);
      const errors = results.filter(r => r.error);

      return {
        executed: successes.length,
        skipped: allMigrations.length - pending.length,
        errors: errors.map(e => ({ name: e.name, error: e.error })),
        batch,
      };
    } finally {
      await this._releaseLock(lockId);
    }
  }

  // ────── Rollback Last Batch ──────
  async rollback(batches = 1) {
    const lockId = await this._acquireLock();

    try {
      const lastBatch = await MigrationRecord.findOne().sort({ batch: -1 }).lean();

      if (!lastBatch) {
        logger.info('[Migration] Nothing to rollback');
        return { rolledBack: 0 };
      }

      const targetBatch = lastBatch.batch - batches + 1;
      const toRollback = await MigrationRecord.find({
        batch: { $gte: targetBatch },
        status: 'completed',
      })
        .sort({ executedAt: -1 })
        .lean();

      logger.info(`[Migration] Rolling back ${toRollback.length} migration(s)...`);

      const results = [];
      for (const record of toRollback) {
        const migrationFile = this._discoverMigrations().find(m => m.name === record.name);
        if (!migrationFile) {
          logger.warn(`[Migration] File not found for: ${record.name}`);
          continue;
        }
        const result = await this._executeMigration(migrationFile, record.batch, 'down');
        results.push(result);
      }

      return {
        rolledBack: results.filter(r => !r.error).length,
        errors: results.filter(r => r.error),
      };
    } finally {
      await this._releaseLock(lockId);
    }
  }

  // ────── Execute Single Migration ──────
  async _executeMigration(migration, batch, direction = 'up') {
    const startTime = Date.now();

    // Run beforeEach hooks
    for (const hook of this._hooks.beforeEach) {
      await hook(migration, direction);
    }

    try {
      const mod = require(migration.path);
      const fn = direction === 'up' ? mod.up : mod.down;

      if (!fn || typeof fn !== 'function') {
        throw new Error(`Migration ${migration.name} has no "${direction}" function`);
      }

      logger.info(`[Migration] ${direction === 'up' ? '▲' : '▼'} ${migration.name}`);

      if (!this._dryRun) {
        await fn(mongoose);
      }

      const duration = Date.now() - startTime;

      if (!this._dryRun) {
        if (direction === 'up') {
          await MigrationRecord.create({
            name: migration.name,
            batch,
            duration,
            status: 'completed',
            checksum: this._getChecksum(migration.path),
          });
        } else {
          await MigrationRecord.updateOne({ name: migration.name }, { status: 'rolled_back' });
        }
      }

      // Run afterEach hooks
      for (const hook of this._hooks.afterEach) {
        await hook(migration, direction, { duration, error: null });
      }

      logger.info(`[Migration] ✓ ${migration.name} (${duration}ms)`);
      return { name: migration.name, duration, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;

      if (!this._dryRun) {
        await MigrationRecord.findOneAndUpdate(
          { name: migration.name },
          {
            name: migration.name,
            batch,
            duration,
            status: 'failed',
            error: err.message,
          },
          { upsert: true }
        );
      }

      logger.error(`[Migration] ✗ ${migration.name}: ${err.message}`);
      return { name: migration.name, duration, error: err.message };
    }
  }

  // ────── Status ──────
  async status() {
    const allMigrations = this._discoverMigrations();
    const records = await MigrationRecord.find().sort({ executedAt: 1 }).lean();
    const recordMap = new Map(records.map(r => [r.name, r]));

    return allMigrations.map(m => {
      const record = recordMap.get(m.name);
      return {
        name: m.name,
        status: record?.status || 'pending',
        batch: record?.batch || null,
        executedAt: record?.executedAt || null,
        duration: record?.duration || null,
        error: record?.error || null,
      };
    });
  }

  // ────── Generate Migration File ──────
  static generate(name, migrationsDir = null) {
    const dir = migrationsDir || path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name.replace(/\s+/g, '-').toLowerCase()}.js`;
    const filepath = path.join(dir, filename);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

'use strict';

module.exports = {
  /**
   * Run the migration
   * @param {import('mongoose')} mongoose
   */
  async up(mongoose) {
    const db = mongoose.connection.db;
    // TODO: Implement migration
    // Example:
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    // await db.collection('users').updateMany({}, { $set: { newField: 'default' } });
  },

  /**
   * Reverse the migration
   * @param {import('mongoose')} mongoose
   */
  async down(mongoose) {
    const db = mongoose.connection.db;
    // TODO: Implement rollback
    // Example:
    // await db.collection('users').dropIndex('email_1');
    // await db.collection('users').updateMany({}, { $unset: { newField: '' } });
  },
};
`;

    fs.writeFileSync(filepath, template, 'utf8');
    return { filename, filepath };
  }

  // ────── Hooks ──────
  beforeAll(fn) {
    this._hooks.beforeAll.push(fn);
    return this;
  }
  afterAll(fn) {
    this._hooks.afterAll.push(fn);
    return this;
  }
  beforeEach(fn) {
    this._hooks.beforeEach.push(fn);
    return this;
  }
  afterEach(fn) {
    this._hooks.afterEach.push(fn);
    return this;
  }
}

// Singleton
const migrationRunner = new MigrationRunner();

module.exports = {
  MigrationRunner,
  migrationRunner,
  MigrationRecord,
};
