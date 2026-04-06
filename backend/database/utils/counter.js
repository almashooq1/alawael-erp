/**
 * Auto-Increment Counter Service - Al-Awael ERP
 * خدمة الترقيم التلقائي لجميع الوثائق
 *
 * Uses MongoDB atomic findOneAndUpdate to guarantee unique sequential numbers
 * across multiple concurrent requests and distributed instances.
 *
 * Supports: beneficiaryNumber, employeeId, invoiceNumber, sessionCode, etc.
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// Counter Schema
const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // counter name / key
    seq: { type: Number, default: 0 }, // current sequence
    prefix: { type: String, default: '' },
    suffix: { type: String, default: '' },
    padding: { type: Number, default: 6 }, // zero-padding length
    step: { type: Number, default: 1 }, // increment step
    resetOn: { type: String, enum: ['never', 'yearly', 'monthly', 'daily'], default: 'never' },
    lastResetAt: { type: Date, default: null },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: '_counters',
  }
);

const Counter = mongoose.models._Counter || mongoose.model('_Counter', CounterSchema);

// ─── Counter Definitions ────────────────────────────────────────────────────
const COUNTER_DEFINITIONS = {
  beneficiary: {
    prefix: 'BEN',
    padding: 6,
    step: 1,
    resetOn: 'never',
    description: 'رقم المستفيد',
    startAt: 1000,
  },
  employee: {
    prefix: 'EMP',
    padding: 6,
    step: 1,
    resetOn: 'never',
    description: 'رقم الموظف',
    startAt: 1000,
  },
  invoice: {
    prefix: 'INV',
    padding: 6,
    step: 1,
    resetOn: 'yearly',
    description: 'رقم الفاتورة',
    startAt: 1000,
  },
  session: {
    prefix: 'SES',
    padding: 7,
    step: 1,
    resetOn: 'never',
    description: 'رقم الجلسة',
    startAt: 10000,
  },
  assessment: {
    prefix: 'ASS',
    padding: 6,
    step: 1,
    resetOn: 'never',
    description: 'رقم التقييم',
    startAt: 1000,
  },
  appointment: {
    prefix: 'APT',
    padding: 7,
    step: 1,
    resetOn: 'never',
    description: 'رقم الموعد',
    startAt: 10000,
  },
  plan: {
    prefix: 'PLN',
    padding: 6,
    step: 1,
    resetOn: 'never',
    description: 'رقم الخطة التأهيلية',
    startAt: 1000,
  },
  payment: {
    prefix: 'PAY',
    padding: 7,
    step: 1,
    resetOn: 'yearly',
    description: 'رقم الدفعة',
    startAt: 10000,
  },
  receipt: {
    prefix: 'RCP',
    padding: 7,
    step: 1,
    resetOn: 'yearly',
    description: 'رقم الإيصال',
    startAt: 10000,
  },
  document: {
    prefix: 'DOC',
    padding: 7,
    step: 1,
    resetOn: 'never',
    description: 'رقم المستند',
    startAt: 10000,
  },
  vehicle: {
    prefix: 'VEH',
    padding: 5,
    step: 1,
    resetOn: 'never',
    description: 'رقم المركبة الداخلي',
    startAt: 100,
  },
  trip: {
    prefix: 'TRP',
    padding: 7,
    step: 1,
    resetOn: 'never',
    description: 'رقم الرحلة',
    startAt: 10000,
  },
  ticket: {
    prefix: 'TKT',
    padding: 8,
    step: 1,
    resetOn: 'never',
    description: 'رقم التذكرة / طلب الدعم',
    startAt: 100000,
  },
  incident: {
    prefix: 'INC',
    padding: 7,
    step: 1,
    resetOn: 'yearly',
    description: 'رقم الحادثة',
    startAt: 10000,
  },
  leave_request: {
    prefix: 'LVR',
    padding: 7,
    step: 1,
    resetOn: 'yearly',
    description: 'رقم طلب الإجازة',
    startAt: 10000,
  },
  purchase_order: {
    prefix: 'PO',
    padding: 6,
    step: 1,
    resetOn: 'yearly',
    description: 'رقم أمر الشراء',
    startAt: 1000,
  },
};

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Get next number in sequence (atomic, thread-safe)
 * @param {string} counterName - Counter name (e.g. 'beneficiary')
 * @param {Object} overrides - Optional overrides { prefix, padding, suffix }
 * @returns {Promise<string>} Formatted number (e.g. 'BEN001005')
 */
async function getNextNumber(counterName, overrides = {}) {
  const def = COUNTER_DEFINITIONS[counterName];
  if (!def) throw new Error(`Unknown counter: ${counterName}`);

  const key = buildCounterKey(counterName);
  const prefix = overrides.prefix ?? def.prefix ?? '';
  const suffix = overrides.suffix ?? def.suffix ?? '';
  const padding = overrides.padding ?? def.padding ?? 6;
  const step = overrides.step ?? def.step ?? 1;
  const startAt = overrides.startAt ?? def.startAt ?? 1;

  // Atomic increment
  const result = await Counter.findOneAndUpdate(
    { _id: key },
    {
      $inc: { seq: step },
      $setOnInsert: {
        prefix,
        suffix,
        padding,
        step,
        resetOn: def.resetOn || 'never',
        description: def.description || counterName,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  // Handle startAt: if this is the first use and seq < startAt, correct it
  let seq = result.seq;
  if (seq < startAt) {
    const corrected = await Counter.findOneAndUpdate(
      { _id: key, seq: { $lt: startAt } },
      { $set: { seq: startAt } },
      { new: true }
    );
    if (corrected) seq = startAt;
  }

  return formatNumber(prefix, seq, padding, suffix);
}

/**
 * Peek at current sequence without incrementing
 */
async function peekCurrent(counterName) {
  const key = buildCounterKey(counterName);
  const result = await Counter.findById(key).lean();
  return result ? result.seq : 0;
}

/**
 * Reset counter (use carefully!)
 */
async function resetCounter(counterName, newValue = 0) {
  const key = buildCounterKey(counterName);
  await Counter.findOneAndUpdate(
    { _id: key },
    { $set: { seq: newValue, lastResetAt: new Date() } },
    { upsert: true }
  );
}

/**
 * Initialize all counters in DB (idempotent)
 */
async function initializeCounters() {
  const ops = [];

  for (const [name, def] of Object.entries(COUNTER_DEFINITIONS)) {
    const key = buildCounterKey(name);
    ops.push({
      updateOne: {
        filter: { _id: key },
        update: {
          $setOnInsert: {
            _id: key,
            seq: (def.startAt || 1) - 1,
            prefix: def.prefix || '',
            suffix: def.suffix || '',
            padding: def.padding || 6,
            step: def.step || 1,
            resetOn: def.resetOn || 'never',
            description: def.description || name,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    await Counter.bulkWrite(ops, { ordered: false });
  }

  logger.info(`counters: ${ops.length} counters initialized`);
}

/**
 * Get all counter statuses
 */
async function getAllCounters() {
  return Counter.find({}).lean();
}

// ─── Year/Month Reset Logic ─────────────────────────────────────────────────
async function checkAndResetCounters() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const counters = await Counter.find({ resetOn: { $ne: 'never' } }).lean();

  for (const counter of counters) {
    let shouldReset = false;
    const lastReset = counter.lastResetAt ? new Date(counter.lastResetAt) : null;

    if (counter.resetOn === 'yearly') {
      shouldReset = !lastReset || lastReset.getFullYear() < year;
    } else if (counter.resetOn === 'monthly') {
      shouldReset =
        !lastReset ||
        lastReset.getFullYear() < year ||
        (lastReset.getFullYear() === year && lastReset.getMonth() + 1 < month);
    } else if (counter.resetOn === 'daily') {
      shouldReset =
        !lastReset ||
        lastReset.getFullYear() < year ||
        lastReset.getMonth() + 1 < month ||
        (lastReset.getMonth() + 1 === month && lastReset.getDate() < day);
    }

    if (shouldReset) {
      const def = COUNTER_DEFINITIONS[counter._id.replace(/:\d{4}$/, '')] || {};
      await Counter.findByIdAndUpdate(counter._id, {
        $set: {
          seq: (def.startAt || 1) - 1,
          lastResetAt: new Date(),
          updatedAt: new Date(),
        },
      });
      logger.info(`counter reset: ${counter._id}`);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function buildCounterKey(name) {
  const def = COUNTER_DEFINITIONS[name];
  if (!def) return name;
  if (def.resetOn === 'yearly') return `${name}:${new Date().getFullYear()}`;
  if (def.resetOn === 'monthly')
    return `${name}:${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  return name;
}

function formatNumber(prefix, seq, padding, suffix) {
  const num = String(seq).padStart(padding, '0');
  return `${prefix}${num}${suffix}`;
}

// ─── Mongoose Plugin Integration ────────────────────────────────────────────
/**
 * Mongoose plugin: auto-assign sequential number before save
 * Usage: schema.plugin(autoNumberPlugin, { field: 'beneficiaryNumber', counter: 'beneficiary' })
 */
function autoNumberPlugin(schema, options = {}) {
  const field = options.field || 'code';
  const counter = options.counter || 'document';

  schema.pre('save', async function (next) {
    if (this.isNew && !this[field]) {
      try {
        this[field] = await getNextNumber(counter, options);
      } catch (err) {
        logger.error(`[counter] failed to assign ${field}: ${err.message}`);
      }
    }
    next();
  });
}

module.exports = {
  getNextNumber,
  peekCurrent,
  resetCounter,
  initializeCounters,
  getAllCounters,
  checkAndResetCounters,
  autoNumberPlugin,
  COUNTER_DEFINITIONS,
  Counter,
};
