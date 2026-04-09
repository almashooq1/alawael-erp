/**
 * Seeder Framework - Al-Awael ERP
 * إطار بذر البيانات الاحترافي
 *
 * Features:
 *  - Declarative seed definitions per model
 *  - Environment-aware seeding (dev, staging, production)
 *  - Seed dependencies resolution (order-aware)
 *  - Idempotent seeding (check before insert)
 *  - Seed versioning & tracking
 *  - Faker-based data generation
 *  - Bulk insert with progress tracking
 *  - Seed rollback (cleanup)
 *  - Factory pattern for test data
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Seed Record Schema (tracks what has been seeded)
// ══════════════════════════════════════════════════════════════════
const seedRecordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    model: { type: String },
    documentsCreated: { type: Number, default: 0 },
    environment: { type: String },
    version: { type: String, default: '1.0.0' },
    executedAt: { type: Date, default: Date.now },
    duration: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'rolled_back'],
      default: 'pending',
    },
    error: { type: String },
    checksum: { type: String },
  },
  { timestamps: true }
);

let SeedRecord;
try {
  SeedRecord = mongoose.model('SeedRecord');
} catch {
  SeedRecord = mongoose.model('SeedRecord', seedRecordSchema);
}

// ══════════════════════════════════════════════════════════════════
// Data Factory (generates test data)
// ══════════════════════════════════════════════════════════════════
class DataFactory {
  constructor() {
    this._definitions = new Map();
  }

  /**
   * Define a factory for a model
   * @param {string} name - Factory name (usually model name)
   * @param {Function} fn - (index, overrides) => document
   */
  define(name, fn) {
    this._definitions.set(name, fn);
    return this;
  }

  /**
   * Generate one document
   * @param {string} name - Factory name
   * @param {Object} overrides - Field overrides
   */
  make(name, overrides = {}) {
    const fn = this._definitions.get(name);
    if (!fn) throw new Error(`Factory "${name}" not defined`);
    return { ...fn(0, overrides), ...overrides };
  }

  /**
   * Generate multiple documents
   * @param {string} name - Factory name
   * @param {number} count - Number of documents
   * @param {Object|Function} overrides - Field overrides or (index) => overrides
   */
  makeMany(name, count, overrides = {}) {
    const fn = this._definitions.get(name);
    if (!fn) throw new Error(`Factory "${name}" not defined`);

    return Array.from({ length: count }, (_, i) => {
      const ov = typeof overrides === 'function' ? overrides(i) : overrides;
      return { ...fn(i, ov), ...ov };
    });
  }

  /**
   * Create and save one document to DB
   */
  async create(modelName, overrides = {}) {
    const data = this.make(modelName, overrides);
    const Model = mongoose.model(modelName);
    return Model.create(data);
  }

  /**
   * Create and save multiple documents to DB
   */
  async createMany(modelName, count, overrides = {}) {
    const data = this.makeMany(modelName, count, overrides);
    const Model = mongoose.model(modelName);
    return Model.insertMany(data, { ordered: false });
  }

  /** List all defined factories */
  list() {
    return [...this._definitions.keys()];
  }
}

// ══════════════════════════════════════════════════════════════════
// Built-in Random Generators
// ══════════════════════════════════════════════════════════════════
const generators = {
  /** Random Arabic name */
  arabicName() {
    const first = [
      'أحمد',
      'محمد',
      'عبدالله',
      'خالد',
      'سعد',
      'فهد',
      'ناصر',
      'سلطان',
      'يوسف',
      'إبراهيم',
      'نورة',
      'فاطمة',
      'عائشة',
      'مريم',
      'سارة',
      'هند',
      'ريم',
      'لمى',
      'دانة',
      'جواهر',
    ];
    const last = [
      'العتيبي',
      'الحربي',
      'الشمري',
      'القحطاني',
      'الدوسري',
      'المطيري',
      'الغامدي',
      'الزهراني',
      'السبيعي',
      'العنزي',
      'الرشيدي',
      'البقمي',
      'السهلي',
      'الجهني',
    ];
    return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
  },

  /** Random English name */
  englishName() {
    const first = [
      'Ahmed',
      'Mohammed',
      'Abdullah',
      'Khalid',
      'Saad',
      'Fahad',
      'Nasser',
      'Sultan',
      'Noura',
      'Fatimah',
      'Sarah',
      'Maryam',
      'Hind',
      'Reem',
      'Dana',
    ];
    const last = ['Al-Otaibi', 'Al-Harbi', 'Al-Shammari', 'Al-Qahtani', 'Al-Dosari', 'Al-Mutairi'];
    return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
  },

  /** Random Saudi phone */
  saudiPhone() {
    const prefixes = ['050', '053', '054', '055', '056', '057', '058', '059'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return (
      prefix +
      Math.floor(Math.random() * 10000000)
        .toString()
        .padStart(7, '0')
    );
  },

  /** Random Saudi National ID */
  nationalId() {
    const start = Math.random() > 0.5 ? '1' : '2';
    return (
      start +
      Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, '0')
    );
  },

  /** Random email */
  email(name = null) {
    const domains = ['example.com', 'test.com', 'alawael.sa', 'company.com'];
    const user = name
      ? name
          .toLowerCase()
          .replace(/\s+/g, '.')
          .replace(/[^a-z.]/g, '')
      : 'user' + Math.floor(Math.random() * 100000);
    return `${user}@${domains[Math.floor(Math.random() * domains.length)]}`;
  },

  /** Random date between two dates */
  dateBetween(start, end) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return new Date(s + Math.random() * (e - s));
  },

  /** Random ObjectId */
  objectId() {
    return new mongoose.Types.ObjectId();
  },

  /** Random enum value */
  oneOf(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Random number between min and max */
  number(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /** Random decimal */
  decimal(min = 0, max = 100, decimals = 2) {
    const val = min + Math.random() * (max - min);
    return parseFloat(val.toFixed(decimals));
  },

  /** Random boolean */
  bool(trueWeight = 0.5) {
    return Math.random() < trueWeight;
  },

  /** Random IBAN (Saudi format) */
  saudiIBAN() {
    return (
      'SA' +
      Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0') +
      Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0') +
      Math.floor(Math.random() * 10000000000000000000)
        .toString()
        .padStart(20, '0')
        .slice(0, 20)
    );
  },

  /** UUID v4 */
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
};

// ══════════════════════════════════════════════════════════════════
// SeederFramework
// ══════════════════════════════════════════════════════════════════
class SeederFramework {
  constructor(options = {}) {
    this._seedsDir = options.seedsDir || path.join(__dirname, '..', 'seeds');
    this._seedersDir = options.seedersDir || path.join(__dirname, 'seeders');
    this._environment = options.environment || process.env.NODE_ENV || 'development';
    this._factory = new DataFactory();
    this._seeds = new Map(); // name -> { run, rollback, model, dependencies }
    this._dryRun = options.dryRun || false;
  }

  // ────── Register Seeds ──────

  /**
   * Register a seed
   * @param {string} name - Seed name
   * @param {Object} config - { model, dependencies, environments, run, rollback }
   */
  register(name, config) {
    this._seeds.set(name, {
      name,
      model: config.model || null,
      dependencies: config.dependencies || [],
      environments: config.environments || ['development', 'staging', 'production'],
      version: config.version || '1.0.0',
      run: config.run,
      rollback: config.rollback || null,
    });
    return this;
  }

  // ────── Discover Seeds from Files ──────

  discoverSeeds() {
    const dirs = [this._seedsDir, this._seedersDir];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter(f => f.endsWith('.seed.js') || f.endsWith('.seeder.js'))
        .sort();

      for (const file of files) {
        try {
          const seed = require(path.join(dir, file));
          const name = file.replace(/\.(seed|seeder)\.js$/, '');

          if (seed.run && typeof seed.run === 'function') {
            this.register(name, seed);
          }
        } catch (err) {
          logger.warn(`[Seeder] Failed to load seed file ${file}: ${err.message}`);
        }
      }
    }

    return this;
  }

  // ────── Run Seeds ──────

  /**
   * Run all registered seeds (respecting dependencies & environment)
   */
  async runAll(options = {}) {
    const force = options.force || false;
    const seedNames = options.only
      ? Array.isArray(options.only)
        ? options.only
        : [options.only]
      : [...this._seeds.keys()];

    // Resolve execution order (topological sort)
    const ordered = this._resolveOrder(seedNames);
    const results = [];

    logger.info(`[Seeder] Running ${ordered.length} seed(s) in ${this._environment} environment`);

    for (const name of ordered) {
      const seed = this._seeds.get(name);
      if (!seed) {
        results.push({ name, status: 'not_found' });
        continue;
      }

      // Environment check
      if (!seed.environments.includes(this._environment) && !force) {
        results.push({ name, status: 'skipped', reason: `Not for ${this._environment}` });
        continue;
      }

      // Already seeded check
      if (!force) {
        const existing = await SeedRecord.findOne({
          name,
          status: 'completed',
          version: seed.version,
        });
        if (existing) {
          results.push({ name, status: 'skipped', reason: 'Already seeded' });
          continue;
        }
      }

      // Execute seed
      const result = await this._executeSeed(seed);
      results.push(result);
    }

    const summary = {
      total: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };

    logger.info(
      `[Seeder] Done: ${summary.completed} completed, ${summary.skipped} skipped, ${summary.failed} failed`
    );
    return summary;
  }

  /**
   * Run a specific seed by name
   */
  async run(name, options = {}) {
    return this.runAll({ ...options, only: [name] });
  }

  // ────── Execute Single Seed ──────

  async _executeSeed(seed) {
    const startTime = Date.now();

    try {
      logger.info(`[Seeder] ▶ Running: ${seed.name}`);

      let documentsCreated = 0;

      if (!this._dryRun) {
        const result = await seed.run(mongoose, this._factory, generators);
        documentsCreated = typeof result === 'number' ? result : result?.created || 0;
      }

      const duration = Date.now() - startTime;

      if (!this._dryRun) {
        await SeedRecord.findOneAndUpdate(
          { name: seed.name },
          {
            name: seed.name,
            model: seed.model,
            documentsCreated,
            environment: this._environment,
            version: seed.version,
            executedAt: new Date(),
            duration,
            status: 'completed',
            error: null,
          },
          { upsert: true, new: true }
        );
      }

      logger.info(`[Seeder] ✓ ${seed.name}: ${documentsCreated} docs (${duration}ms)`);
      return { name: seed.name, status: 'completed', documentsCreated, duration };
    } catch (err) {
      const duration = Date.now() - startTime;

      if (!this._dryRun) {
        await SeedRecord.findOneAndUpdate(
          { name: seed.name },
          {
            name: seed.name,
            model: seed.model,
            environment: this._environment,
            version: seed.version,
            executedAt: new Date(),
            duration,
            status: 'failed',
            error: err.message,
          },
          { upsert: true, new: true }
        );
      }

      logger.error(`[Seeder] ✗ ${seed.name}: ${err.message}`);
      return { name: seed.name, status: 'failed', error: err.message, duration };
    }
  }

  // ────── Rollback ──────

  /**
   * Rollback a specific seed
   */
  async rollback(name) {
    const seed = this._seeds.get(name);
    if (!seed) throw new Error(`Seed "${name}" not found`);

    if (!seed.rollback) {
      return { name, status: 'no_rollback', message: 'No rollback function defined' };
    }

    try {
      logger.info(`[Seeder] ◀ Rolling back: ${name}`);
      await seed.rollback(mongoose);

      await SeedRecord.updateOne({ name }, { status: 'rolled_back' });

      logger.info(`[Seeder] ✓ Rolled back: ${name}`);
      return { name, status: 'rolled_back' };
    } catch (err) {
      logger.error(`[Seeder] ✗ Rollback failed for ${name}: ${err.message}`);
      return { name, status: 'rollback_failed', error: err.message };
    }
  }

  /**
   * Rollback all seeds in reverse order
   */
  async rollbackAll() {
    const seeds = [...this._seeds.keys()].reverse();
    const results = [];

    for (const name of seeds) {
      const result = await this.rollback(name);
      results.push(result);
    }

    return results;
  }

  // ────── Dependency Resolution ──────

  _resolveOrder(seedNames) {
    const resolved = [];
    const visiting = new Set();
    const visited = new Set();

    const visit = name => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      visiting.add(name);

      const seed = this._seeds.get(name);
      if (seed) {
        for (const dep of seed.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      if (seedNames.includes(name)) {
        resolved.push(name);
      }
    };

    for (const name of seedNames) {
      visit(name);
    }

    return resolved;
  }

  // ────── Status ──────

  async status() {
    const records = await SeedRecord.find().sort({ executedAt: -1 }).lean();
    const recordMap = new Map(records.map(r => [r.name, r]));

    return [...this._seeds.entries()].map(([name, seed]) => {
      const record = recordMap.get(name);
      return {
        name,
        model: seed.model,
        version: seed.version,
        environments: seed.environments,
        hasRollback: !!seed.rollback,
        status: record?.status || 'pending',
        lastRun: record?.executedAt || null,
        documentsCreated: record?.documentsCreated || 0,
      };
    });
  }

  /** Get the factory instance */
  get factory() {
    return this._factory;
  }

  /** Get generators */
  get gen() {
    return generators;
  }
}

// Singleton
const seederFramework = new SeederFramework();

module.exports = {
  SeederFramework,
  seederFramework,
  DataFactory,
  generators,
  SeedRecord,
};
