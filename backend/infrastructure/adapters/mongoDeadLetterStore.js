/**
 * Mongo DLQ adapter — drop-in replacement for InMemoryDeadLetterStore that
 * persists parked integration calls across restarts.
 *
 * Contract (matches `deadLetterQueue.setStore`):
 *   add(entry)         — upsert a new row
 *   get(id)            — lookup by id
 *   list({integration, status, limit, offset}) — paginated query
 *   updateStatus(id, status, extra)
 *   remove(id)
 *
 * Also exposes listForReplay() for the scheduled worker — returns entries in
 * status=parked ordered by updatedAt ascending so the oldest get the fairest
 * shot at reprocessing first.
 */

'use strict';

const DeadLetterEntry = require('../../models/DeadLetterEntry.model');

function _toPlain(doc) {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : doc;
}

class MongoDeadLetterStore {
  constructor(model = DeadLetterEntry) {
    this.Model = model;
  }

  async add(entry) {
    await this.Model.create({ ...entry, _id: entry.id });
    return entry;
  }

  async get(id) {
    const doc = await this.Model.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async list({ integration, status, limit = 100, offset = 0 } = {}) {
    const q = {};
    if (integration) q.integration = integration;
    if (status) q.status = status;
    const [rows, total] = await Promise.all([
      this.Model.find(q).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      this.Model.countDocuments(q),
    ]);
    return { total, rows: rows.map(r => ({ ...r, id: r._id })) };
  }

  async listForReplay({ batchSize = 50, olderThanMs = 0 } = {}) {
    const q = { status: 'parked' };
    if (olderThanMs > 0) q.updatedAt = { $lt: Date.now() - olderThanMs };
    const rows = await this.Model.find(q).sort({ updatedAt: 1 }).limit(batchSize).lean();
    return rows.map(r => ({ ...r, id: r._id }));
  }

  async updateStatus(id, status, extra = {}) {
    const doc = await this.Model.findByIdAndUpdate(
      id,
      { $set: { ...extra, status, updatedAt: Date.now() } },
      { new: true }
    ).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async remove(id) {
    const r = await this.Model.deleteOne({ _id: id });
    return r.deletedCount > 0;
  }
}

function create(model) {
  return new MongoDeadLetterStore(model);
}

module.exports = { MongoDeadLetterStore, create };
