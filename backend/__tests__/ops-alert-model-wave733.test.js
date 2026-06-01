'use strict';

/**
 * Behavioral guard — OpsAlert (W733).
 *
 * Boots in-memory Mongo, unmocks mongoose, asserts the Wave-18 __invariants
 * actually fire + the durable-sink shape persists. Pairs with the static
 * coverage in tests/unit/ops-alerter.test.js.
 */

const mongoose = require('mongoose');

jest.unmock('mongoose');

let mongod;
let OpsAlert;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  OpsAlert = require('../models/OpsAlert');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('OpsAlert behavioral (W733)', () => {
  test('persists a minimal open alert + computes isOpen + sets TTL', async () => {
    const doc = await OpsAlert.create({
      kind: 'backup_failed',
      severity: 'high',
      subject: 'nightly mongodump failed',
    });
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('open');
    expect(doc.isOpen).toBe(true);
    expect(doc.delivery).toBe('pending');
    expect(doc.expiresAt instanceof Date).toBe(true);
    expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('rejects an invalid severity', async () => {
    const doc = new OpsAlert({ kind: 'k', severity: 'apocalyptic', subject: 's' });
    await expect(doc.save()).rejects.toThrow(/severity/);
  });

  test('rejects status=acknowledged without acknowledgedAt', async () => {
    const doc = new OpsAlert({ kind: 'k', severity: 'high', subject: 's', status: 'acknowledged' });
    await expect(doc.save()).rejects.toThrow(/acknowledgedAt/);
  });

  test('rejects status=resolved without resolvedAt', async () => {
    const doc = new OpsAlert({ kind: 'k', severity: 'high', subject: 's', status: 'resolved' });
    await expect(doc.save()).rejects.toThrow(/resolvedAt/);
  });

  test('accepts a full acknowledge → resolve lifecycle', async () => {
    const doc = await OpsAlert.create({ kind: 'dr_verify_failed', severity: 'critical', subject: 's' });
    doc.status = 'acknowledged';
    doc.acknowledgedAt = new Date();
    await doc.save();
    expect(doc.status).toBe('acknowledged');
    doc.status = 'resolved';
    doc.resolvedAt = new Date();
    await doc.save();
    expect(doc.isOpen).toBe(false);
  });

  test('records the best-effort delivery outcome', async () => {
    const doc = await OpsAlert.create({
      kind: 'backup_failed',
      severity: 'high',
      subject: 's',
      delivery: 'no_recipients',
    });
    expect(doc.delivery).toBe('no_recipients');
  });
});
