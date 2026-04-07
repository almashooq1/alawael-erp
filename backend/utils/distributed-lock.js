/**
 * Distributed Lock — MongoDB-based pessimistic lock (Round 43)
 *
 * Prevents duplicate execution of cron jobs / scheduled tasks in
 * PM2 cluster or multi-instance deployments.
 *
 * Uses a TTL index so stale locks auto-expire even if the holder crashes.
 *
 * Usage:
 *   const { acquireLock, releaseLock } = require('../utils/distributed-lock');
 *   if (!(await acquireLock('daily-billing', 300_000))) return;
 *   try { … } finally { await releaseLock('daily-billing'); }
 */
'use strict';

const mongoose = require('mongoose');
const os = require('os');

// ── Schema ──────────────────────────────────────────────────────────────
const lockSchema = new mongoose.Schema(
  {
    _id: { type: String }, // lock name (e.g. "wallet-settlement")
    lockedBy: { type: String }, // pid + hostname
    acquiredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL auto-cleanup
  },
  { versionKey: false }
);

// Avoid OverwriteModelError on hot-reload
const Lock = mongoose.models.DistributedLock || mongoose.model('DistributedLock', lockSchema);

// ── Acquire ─────────────────────────────────────────────────────────────
/**
 * Try to acquire a named lock.
 * @param {string} name  — unique lock identifier
 * @param {number} ttlMs — time-to-live in ms (default 60 s)
 * @returns {boolean} true if acquired, false if already held
 */
async function acquireLock(name, ttlMs = 60_000) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const lockedBy = `${os.hostname()}-${process.pid}`;

  try {
    const result = await Lock.findOneAndUpdate(
      {
        _id: name,
        $or: [
          { expiresAt: null },
          { expiresAt: { $lt: now } }, // expired → steal allowed
        ],
      },
      {
        $set: { lockedBy, acquiredAt: now, expiresAt },
      },
      { upsert: true, new: true }
    );
    // We acquired only if lockedBy matches us
    return result.lockedBy === lockedBy;
  } catch (err) {
    if (err.code === 11000) return false; // duplicate-key = lock held by another instance
    // Re-throw unexpected errors
    throw err;
  }
}

// ── Release ─────────────────────────────────────────────────────────────
/**
 * Release a named lock (idempotent).
 * @param {string} name — lock identifier
 */
async function releaseLock(name) {
  await Lock.deleteOne({ _id: name });
}

module.exports = { acquireLock, releaseLock };
