/**
 * Database Migration System — نظام ترحيل قاعدة البيانات
 *
 * MongoDB schema migration management for ALAWAEL ERP.
 *
 * Features:
 *  ✅ Versioned migrations with timestamps
 *  ✅ Up/down support (apply & rollback)
 *  ✅ Lock mechanism to prevent concurrent migrations
 *  ✅ Checksum validation to detect changed migrations
 *  ✅ CLI and programmatic API
 *  ✅ Dry-run mode
 *  ✅ Auto-run on app startup (configurable)
 *
 * Usage:
 *   node backend/infrastructure/migrationRunner.js status
 *   node backend/infrastructure/migrationRunner.js up
 *   node backend/infrastructure/migrationRunner.js down
 *   node backend/infrastructure/migrationRunner.js create "add-beneficiary-index"
 *
 * @module infrastructure/migrationRunner
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const safeError = require('../utils/safeError');

// ─── Logger Fallback ─────────────────────────────────────────────────────────
let logger;
try {
  logger = require('../utils/logger');
} catch {
  logger = {
    info: (...a) => console.log('[Migration]', ...a),
    warn: (...a) => console.warn('[Migration]', ...a),
    error: (...a) => console.error('[Migration]', ...a),
    debug: (...a) => console.debug('[Migration]', ...a),
  };
}

// ─── Migration Metadata Schema ───────────────────────────────────────────────

const migrationSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    checksum: { type: String, required: true },
    appliedAt: { type: Date, default: Date.now },
    executionTimeMs: { type: Number },
    status: { type: String, enum: ['applied', 'rolled_back', 'failed'], default: 'applied' },
  },
  { collection: '_migrations', timestamps: true }
);

const migrationLockSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'migration_lock' },
    lockedAt: { type: Date, default: Date.now },
    lockedBy: { type: String },
    expiresAt: { type: Date },
  },
  { collection: '_migration_locks' }
);

// ─── Migration Runner ────────────────────────────────────────────────────────

class MigrationRunner {
  constructor(options = {}) {
    this.migrationsDir = options.migrationsDir || path.join(__dirname, '..', 'migrations');
    this.connection = options.connection || null;
    this.MigrationModel = null;
    this.MigrationLock = null;
    this._initialized = false;
  }

  /**
   * Initialize models (must be called after mongoose connects)
   */
  _ensureModels() {
    if (this._initialized) return;

    const conn = this.connection || mongoose;

    // Prevent OverwriteModelError
    this.MigrationModel = conn.models._Migration || conn.model('_Migration', migrationSchema);
    this.MigrationLock =
      conn.models._MigrationLock || conn.model('_MigrationLock', migrationLockSchema);

    this._initialized = true;
  }

  // ─── Lock / Unlock ───────────────────────────────────────────────────────

  async _acquireLock(timeout = 60000) {
    this._ensureModels();
    const hostname = require('os').hostname();
    const expiresAt = new Date(Date.now() + timeout);

    try {
      await this.MigrationLock.findOneAndUpdate(
        { _id: 'migration_lock', $or: [{ expiresAt: { $lt: new Date() } }, { expiresAt: null }] },
        { lockedAt: new Date(), lockedBy: hostname, expiresAt },
        { upsert: true }
      );
      return true;
    } catch (err) {
      if (err.code === 11000) {
        throw new Error('Migration lock already held by another process');
      }
      // Try to create fresh if nothing exists
      try {
        await this.MigrationLock.create({
          _id: 'migration_lock',
          lockedAt: new Date(),
          lockedBy: hostname,
          expiresAt,
        });
        return true;
      } catch {
        throw new Error('Unable to acquire migration lock');
      }
    }
  }

  async _releaseLock() {
    this._ensureModels();
    await this.MigrationLock.deleteOne({ _id: 'migration_lock' });
  }

  // ─── Discovery ───────────────────────────────────────────────────────────

  /**
   * Discover all migration files, sorted by version
   */
  discoverMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.js') && /^\d{14}_/.test(f))
      .sort();

    return files.map(file => {
      const fullPath = path.join(this.migrationsDir, file);
      const version = file.split('_')[0];
      const name = file.replace(/^\d{14}_/, '').replace('.js', '');
      const content = fs.readFileSync(fullPath, 'utf-8');
      const checksum = crypto.createHash('md5').update(content).digest('hex');
      return { version, name, file, fullPath, checksum };
    });
  }

  // ─── Status ──────────────────────────────────────────────────────────────

  async status() {
    this._ensureModels();
    const migrations = this.discoverMigrations();
    const applied = await this.MigrationModel.find({ status: 'applied' }).lean();
    const appliedMap = new Map(applied.map(m => [m.version, m]));

    return migrations.map(m => ({
      version: m.version,
      name: m.name,
      file: m.file,
      applied: appliedMap.has(m.version),
      appliedAt: appliedMap.get(m.version)?.appliedAt || null,
      checksumMatch: appliedMap.has(m.version)
        ? appliedMap.get(m.version).checksum === m.checksum
        : null,
    }));
  }

  // ─── Migrate Up ──────────────────────────────────────────────────────────

  async up(options = {}) {
    this._ensureModels();
    const { dryRun = false, steps } = options;

    await this._acquireLock();
    try {
      const migrations = this.discoverMigrations();
      const applied = await this.MigrationModel.find({ status: 'applied' }).lean();
      const appliedVersions = new Set(applied.map(m => m.version));

      let pending = migrations.filter(m => !appliedVersions.has(m.version));
      if (steps) pending = pending.slice(0, steps);

      if (pending.length === 0) {
        logger.info('No pending migrations');
        return { applied: 0, migrations: [] };
      }

      const results = [];

      for (const migration of pending) {
        logger.info(`${dryRun ? '[DRY-RUN] ' : ''}Applying migration: ${migration.file}`);

        if (dryRun) {
          results.push({ version: migration.version, name: migration.name, status: 'dry-run' });
          continue;
        }

        const mod = require(migration.fullPath);
        if (typeof mod.up !== 'function') {
          throw new Error(`Migration ${migration.file} is missing an "up" function`);
        }

        const start = Date.now();
        const db = this.connection?.db || mongoose.connection.db;

        try {
          await mod.up(db, mongoose);
          const executionTimeMs = Date.now() - start;

          await this.MigrationModel.findOneAndUpdate(
            { version: migration.version },
            {
              name: migration.name,
              checksum: migration.checksum,
              executionTimeMs,
              status: 'applied',
              appliedAt: new Date(),
            },
            { upsert: true }
          );

          results.push({
            version: migration.version,
            name: migration.name,
            executionTimeMs,
            status: 'applied',
          });

          logger.info(`  ✅ Applied ${migration.file} (${executionTimeMs}ms)`);
        } catch (error) {
          logger.error(`  ❌ Failed ${migration.file}: ${error.message}`);
          await this.MigrationModel.findOneAndUpdate(
            { version: migration.version },
            {
              name: migration.name,
              checksum: migration.checksum,
              status: 'failed',
            },
            { upsert: true }
          ).catch(() => {});
          throw error;
        }
      }

      return { applied: results.length, migrations: results };
    } finally {
      await this._releaseLock();
    }
  }

  // ─── Migrate Down ────────────────────────────────────────────────────────

  async down(options = {}) {
    this._ensureModels();
    const { dryRun = false, steps = 1 } = options;

    await this._acquireLock();
    try {
      const applied = await this.MigrationModel.find({ status: 'applied' })
        .sort({ version: -1 })
        .limit(steps)
        .lean();

      if (applied.length === 0) {
        logger.info('No migrations to roll back');
        return { rolledBack: 0, migrations: [] };
      }

      const allMigrations = this.discoverMigrations();
      const migrationMap = new Map(allMigrations.map(m => [m.version, m]));
      const results = [];

      for (const record of applied) {
        const migration = migrationMap.get(record.version);
        if (!migration) {
          logger.warn(`Migration file not found for version ${record.version}`);
          continue;
        }

        logger.info(`${dryRun ? '[DRY-RUN] ' : ''}Rolling back: ${migration.file}`);

        if (dryRun) {
          results.push({ version: migration.version, name: migration.name, status: 'dry-run' });
          continue;
        }

        const mod = require(migration.fullPath);
        if (typeof mod.down !== 'function') {
          throw new Error(`Migration ${migration.file} is missing a "down" function`);
        }

        const db = this.connection?.db || mongoose.connection.db;
        await mod.down(db, mongoose);

        await this.MigrationModel.findOneAndUpdate(
          { version: record.version },
          { status: 'rolled_back' }
        );

        results.push({ version: migration.version, name: migration.name, status: 'rolled_back' });
        logger.info(`  ↩️  Rolled back ${migration.file}`);
      }

      return { rolledBack: results.length, migrations: results };
    } finally {
      await this._releaseLock();
    }
  }

  // ─── Create New Migration ────────────────────────────────────────────────

  create(name) {
    if (!name) throw new Error('Migration name is required');

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const filename = `${timestamp}_${sanitizedName}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 *
 * @param {import('mongodb').Db} db - MongoDB native driver Db instance
 * @param {import('mongoose')} mongoose - Mongoose instance
 */

module.exports = {
  async up(db /*, mongoose */) {
    // Example: Create an index
    // await db.collection('beneficiaries').createIndex({ nationalId: 1 }, { unique: true });

    // Example: Add a field to all documents
    // await db.collection('users').updateMany({}, { $set: { newField: 'defaultValue' } });

    // Example: Create a new collection
    // await db.createCollection('newCollection');
  },

  async down(db /*, mongoose */) {
    // Reverse the changes made in "up"
    // await db.collection('beneficiaries').dropIndex('nationalId_1');
    // await db.collection('users').updateMany({}, { $unset: { newField: '' } });
    // await db.collection('newCollection').drop();
  },
};
`;

    fs.writeFileSync(filepath, template, 'utf-8');
    logger.info(`Created migration: ${filename}`);
    return { filename, filepath };
  }
}

// ─── Express Routes ──────────────────────────────────────────────────────────

function mountMigrationRoutes(app) {
  const express = require('express');
  const router = express.Router();
  const runner = new MigrationRunner();

  // 🔒 Security: Block migration routes in production and require admin auth
  router.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MIGRATIONS !== 'true') {
      return res
        .status(403)
        .json({ success: false, error: 'Migration API is disabled in production' });
    }
    // Require admin authentication
    try {
      const { requireAuth, requireAdmin } = require('../middleware/auth');
      requireAuth(req, res, err => {
        if (err) return res.status(401).json({ success: false, error: 'Authentication required' });
        requireAdmin(req, res, err2 => {
          if (err2) return res.status(403).json({ success: false, error: 'Admin access required' });
          next();
        });
      });
    } catch {
      // If auth middleware not available, block in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, error: 'Auth middleware unavailable' });
      }
      next();
    }
  });

  router.get('/status', async (_req, res) => {
    try {
      const status = await runner.status();
      const pending = status.filter(m => !m.applied);
      res.json({
        success: true,
        total: status.length,
        applied: status.filter(m => m.applied).length,
        pending: pending.length,
        migrations: status,
      });
    } catch (error) {
      safeError(res, error, 'migrationRunner');
    }
  });

  router.post('/up', async (req, res) => {
    try {
      const { dryRun, steps } = req.body || {};
      const result = await runner.up({ dryRun, steps });
      res.json({ success: true, ...result });
    } catch (error) {
      safeError(res, error, 'migrationRunner');
    }
  });

  router.post('/down', async (req, res) => {
    try {
      const { dryRun, steps } = req.body || {};
      const result = await runner.down({ dryRun, steps });
      res.json({ success: true, ...result });
    } catch (error) {
      safeError(res, error, 'migrationRunner');
    }
  });

  app.use('/api/v2/migrations', router);
  logger.info('[Migrations] API routes mounted on /api/v2/migrations');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
  Database Migration CLI
  ──────────────────────
  Usage:  node migrationRunner.js <command> [options]

  Commands:
    status            Show migration status
    up [--steps N]    Apply pending migrations (default: all)
    down [--steps N]  Roll back migrations (default: 1)
    create <name>     Create a new migration file
    help              Show this help message

  Options:
    --dry-run         Show what would be done without applying
    --steps N         Limit number of migrations to apply/roll back
`);
    process.exit(0);
  }

  const runner = new MigrationRunner();

  if (command === 'create') {
    const name = args.slice(1).join(' ');
    const result = runner.create(name);
    console.log(`✅ Created: ${result.filename}`);
    process.exit(0);
  }

  // For status/up/down commands, need DB connection
  const dbUrl =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael';
  await mongoose.connect(dbUrl);
  console.log(`Connected to ${dbUrl}`);

  try {
    if (command === 'status') {
      const status = await runner.status();
      console.table(
        status.map(m => ({
          Version: m.version,
          Name: m.name,
          Applied: m.applied ? '✅' : '⏳',
          AppliedAt: m.appliedAt ? m.appliedAt.toISOString() : '-',
          Checksum: m.checksumMatch === false ? '⚠️ CHANGED' : '✔️',
        }))
      );
    } else if (command === 'up') {
      const dryRun = args.includes('--dry-run');
      const stepsIdx = args.indexOf('--steps');
      const steps = stepsIdx > -1 ? parseInt(args[stepsIdx + 1], 10) : undefined;
      const result = await runner.up({ dryRun, steps });
      console.log(`\n✅ Applied ${result.applied} migration(s)`);
    } else if (command === 'down') {
      const dryRun = args.includes('--dry-run');
      const stepsIdx = args.indexOf('--steps');
      const steps = stepsIdx > -1 ? parseInt(args[stepsIdx + 1], 10) : 1;
      const result = await runner.down({ dryRun, steps });
      console.log(`\n↩️  Rolled back ${result.rolledBack} migration(s)`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Run CLI if invoked directly
if (require.main === module) {
  cli().catch(err => {
    console.error('Migration error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  MigrationRunner,
  mountMigrationRoutes,
};
