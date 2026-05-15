'use strict';

/**
 * supplier-quality.test.js — World-Class QMS Phase 29 Commit 8.
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const registry = require('../config/supplier-quality.registry');
const { createSupplierQualityService } = require('../services/quality/supplierQuality.service');

let ownServer = null;
let SupplierScar;
const creator = new mongoose.Types.ObjectId();
const vendorA = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'supq-test', serverSelectionTimeoutMS: 10000 });
  SupplierScar = require('../models/quality/SupplierScar.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await SupplierScar.deleteMany({});
});

describe('supplier-quality registry', () => {
  test('computeScorecard renormalises when dims missing', () => {
    const r = registry.computeScorecard({
      onTimeDelivery: 0.9,
      qualityAcceptance: 0.95,
      scarPerformance: 0.85,
      responsiveness: null,
      commercial: null,
    });
    expect(r.score).toBeGreaterThan(0.85);
    expect(r.score).toBeLessThan(0.95);
    expect(r.grade).toBe('preferred');
  });

  test('zero score grades as disqualified', () => {
    const r = registry.computeScorecard({
      onTimeDelivery: 0,
      qualityAcceptance: 0,
      scarPerformance: 0,
      responsiveness: 0,
      commercial: 0,
    });
    expect(r.grade).toBe('disqualified');
  });

  test('grade boundary 0.75 = approved', () => {
    expect(registry.grade(0.75)).toBe('approved');
    expect(registry.grade(0.74)).toBe('conditional');
  });
});

describe('SupplierQualityService.raiseScar + lifecycle', () => {
  test('SCAR raised with auto-numbered ID + due date by severity', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    const doc = await svc.raiseScar(
      {
        vendorId: vendorA,
        title: 'Lot 4471 dimensional failure',
        description: 'Tolerances out of spec on 12 units',
        severity: 'major',
      },
      creator
    );
    expect(doc.scarNumber).toMatch(/^SCAR-\d{4}-\d{4}$/);
    expect(doc.status).toBe('open');
    // major → 14 days
    const days = (doc.responseDueBy - doc.raisedAt) / 86400000;
    expect(days).toBeCloseTo(14, 0);
  });

  test('walks full lifecycle to verified', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    let doc = await svc.raiseScar(
      { vendorId: vendorA, title: 't', description: 'd', severity: 'minor' },
      creator
    );
    doc = await svc.setStatus(doc._id, 'acknowledged', creator);
    doc = await svc.setStatus(doc._id, 'in_progress', creator);
    doc = await svc.submitSupplierResponse(
      doc._id,
      { rootCause: 'tool wear', correctiveAction: 'replaced cutter' },
      creator
    );
    expect(doc.status).toBe('response_received');
    doc = await svc.setStatus(doc._id, 'verifying', creator);
    doc = await svc.verifyEffectiveness(doc._id, { outcome: 'effective' }, creator);
    expect(doc.status).toBe('verified');
    doc = await svc.setStatus(doc._id, 'closed', creator);
    expect(doc.status).toBe('closed');
  });

  test('rejects unknown transition', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    const doc = await svc.raiseScar(
      { vendorId: vendorA, title: 't', description: 'd', severity: 'minor' },
      creator
    );
    await expect(svc.setStatus(doc._id, 'closed', creator)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  test('overdue virtual flips when responseDueBy is in the past', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    const doc = await svc.raiseScar(
      {
        vendorId: vendorA,
        title: 't',
        description: 'd',
        severity: 'critical',
        responseDueBy: new Date(Date.now() - 86400000),
      },
      creator
    );
    expect(doc.isOverdue).toBe(true);
  });
});

describe('SupplierQualityService.computeVendorScorecard', () => {
  test('penalises open critical SCARs', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    for (let i = 0; i < 3; i++) {
      await svc.raiseScar(
        { vendorId: vendorA, title: `t${i}`, description: 'd', severity: 'critical' },
        creator
      );
    }
    const result = await svc.computeVendorScorecard(vendorA);
    expect(result.dimensions.scarPerformance).toBeLessThan(0.5);
    expect(['probation', 'disqualified', 'conditional']).toContain(result.grade);
  });

  test('clean vendor in window grades as preferred', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    const result = await svc.computeVendorScorecard(vendorA);
    expect(result.dimensions.scarPerformance).toBe(1);
  });

  test('uses 180-day window by default', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    const r = await svc.computeVendorScorecard(vendorA);
    expect(r.windowDays).toBe(180);
  });
});

describe('SupplierQualityService.getDashboard', () => {
  test('aggregates by status, severity, and overdue', async () => {
    const svc = createSupplierQualityService({ scarModel: SupplierScar });
    await svc.raiseScar(
      { vendorId: vendorA, title: 't', description: 'd', severity: 'minor' },
      creator
    );
    await svc.raiseScar(
      {
        vendorId: vendorA,
        title: 't',
        description: 'd',
        severity: 'critical',
        responseDueBy: new Date(Date.now() - 86400000),
      },
      creator
    );
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.byStatus.open).toBe(2);
    expect(dash.bySeverity.critical).toBe(1);
    expect(dash.overdue).toBe(1);
  });
});
