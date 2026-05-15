'use strict';

/**
 * Smoke-tests for the Phase 29 demo seed. Verifies dry-run + real
 * insertion against an in-memory mongo. No assertions on the exact
 * counts (those drift as we tweak the seed); just verifies that every
 * model receives at least one record and the run finishes cleanly.
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');

let ownServer = null;

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
  await mongoose.connect(uri, { dbName: 'phase29-seed-test', serverSelectionTimeoutMS: 10000 });
  // Pre-load all the quality models so they're registered.
  require('../models/quality/FmeaWorksheet.model');
  require('../models/quality/RcaInvestigation.model');
  require('../models/quality/SpcChart.model');
  require('../models/quality/A3Report.model');
  require('../models/quality/StandardsTraceability.model');
  require('../models/quality/ControlledDocument.model');
  require('../models/quality/SupplierScar.model');
  require('../models/quality/CalibrationAsset.model');
  require('../models/quality/ChangeRequest.model');
  require('../models/quality/AuditScope.model');
  require('../models/quality/AuditOccurrence.model');
  require('../models/quality/CoqEntry.model');
  require('../models/quality/InspectionSubmission.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

describe('phase29-quality.seed', () => {
  test('dry-run returns plan without writing', async () => {
    const seed = require('../seeds/phase29-quality.seed');
    const result = await seed({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.planned).toBeDefined();
    expect(result.planned.fmea).toBeGreaterThan(0);
  });

  test('real run populates every Phase 29 model with at least one record', async () => {
    const seed = require('../seeds/phase29-quality.seed');
    const result = await seed({ dryRun: false });
    expect(result.fmea).toBeGreaterThanOrEqual(1);
    expect(result.rca).toBeGreaterThanOrEqual(1);
    expect(result.spc).toBeGreaterThanOrEqual(1);
    expect(result.a3).toBeGreaterThanOrEqual(1);
    expect(result.standards).toBeGreaterThanOrEqual(1);
    expect(result.docs).toBeGreaterThanOrEqual(1);
    expect(result.scars).toBeGreaterThanOrEqual(1);
    expect(result.calibration).toBeGreaterThanOrEqual(1);
    expect(result.changeRequests).toBeGreaterThanOrEqual(1);
    expect(result.audits).toBeGreaterThanOrEqual(1);
    expect(result.coqEntries).toBeGreaterThanOrEqual(1);
    expect(result.inspections).toBeGreaterThanOrEqual(1);
  }, 30_000);

  test('reset clears previously-seeded records', async () => {
    const seed = require('../seeds/phase29-quality.seed');
    // seed twice with reset → counts should match (not double).
    const first = await seed({ dryRun: false });
    const second = await seed({ dryRun: false, reset: true });
    expect(second.fmea).toBe(first.fmea);
    expect(second.spc).toBe(first.spc);
  }, 30_000);
});
