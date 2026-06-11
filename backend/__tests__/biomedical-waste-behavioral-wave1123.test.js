'use strict';

/**
 * biomedical-waste-behavioral-wave1123.test.js — W1123 (behavioral).
 *
 * Exercises BiomedicalWasteRecord against MongoMemoryServer: record-number
 * autogen, the generate→store→collect→dispose lifecycle, every Wave-18 invariant
 * (rejects on save), the sharps puncture-proof rule, and the storageOverdue /
 * isHazardous virtuals on persisted docs.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Waste;

const oid = () => new mongoose.Types.ObjectId();

async function base(overrides = {}) {
  return Waste.create({
    branchId: oid(),
    wasteCategory: 'infectious',
    quantityKg: 2.5,
    generationDate: new Date('2026-06-01'),
    generationDepartment: 'nursing',
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1123-waste' } });
  await mongoose.connect(mongod.getUri());
  Waste = require('../models/BiomedicalWasteRecord');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Waste.deleteMany({});
});

describe('W1123 — record number + defaults', () => {
  it('auto-generates BMW-YYYY-NNNN and defaults status=generated', async () => {
    const d = await base();
    expect(d.recordNumber).toMatch(/^BMW-2026-\d{4}$/);
    expect(d.status).toBe('generated');
    expect(d.isHazardous).toBe(true); // infectious
  });

  it('sequential record numbers increment', async () => {
    const a = await base();
    const b = await base();
    expect(a.recordNumber).not.toBe(b.recordNumber);
  });
});

describe('W1123 — Wave-18 invariants', () => {
  it('rejects quantityKg <= 0', async () => {
    await expect(base({ quantityKg: 0 })).rejects.toThrow(/quantityKg/);
  });

  it('rejects sharps without a puncture-proof container', async () => {
    await expect(base({ wasteCategory: 'sharps', punctureProofContainer: false })).rejects.toThrow(
      /puncture-proof/
    );
  });

  it('accepts sharps WITH a puncture-proof container', async () => {
    const d = await base({ wasteCategory: 'sharps', punctureProofContainer: true });
    expect(d.wasteCategory).toBe('sharps');
  });

  it('rejects status=stored without storageLocation/storedAt', async () => {
    const d = await base();
    d.status = 'stored';
    await expect(d.save()).rejects.toThrow(/storageLocation|storedAt/);
  });

  it('rejects status=collected without collectionVendor/date', async () => {
    const d = await base();
    d.status = 'collected';
    await expect(d.save()).rejects.toThrow(/collectionVendor|collectionDate/);
  });

  it('rejects status=disposed without method/facility/date', async () => {
    const d = await base();
    d.status = 'disposed';
    await expect(d.save()).rejects.toThrow(/disposalMethod|disposalFacility|disposalDate/);
  });

  it('rejects status=rejected without a reason', async () => {
    const d = await base();
    d.status = 'rejected';
    await expect(d.save()).rejects.toThrow(/rejectedReason/);
  });
});

describe('W1123 — full lifecycle generate→store→collect→dispose', () => {
  it('walks the chain and persists each terminal field', async () => {
    const d = await base({ wasteCategory: 'sharps', punctureProofContainer: true });

    d.status = 'stored';
    d.storageLocation = 'Hazardous store room B';
    d.storedAt = new Date('2026-06-01T08:00:00Z');
    await d.save();
    expect(d.status).toBe('stored');

    d.status = 'collected';
    d.collectionVendor = 'Saudi Investment Recycling Co';
    d.collectionDate = new Date('2026-06-02');
    d.manifestNumber = 'MANIFEST-001';
    await d.save();
    expect(d.status).toBe('collected');

    d.status = 'disposed';
    d.disposalMethod = 'incineration';
    d.disposalFacility = 'GAMEP-licensed incinerator';
    d.disposalDate = new Date('2026-06-03');
    d.treatmentCertificateRef = 'COD-2026-77';
    await d.save();

    const reloaded = await Waste.findById(d._id);
    expect(reloaded.status).toBe('disposed');
    expect(reloaded.disposalMethod).toBe('incineration');
    expect(reloaded.treatmentCertificateRef).toBe('COD-2026-77');
  });
});

describe('W1123 — storageOverdue virtual', () => {
  it('is true for stored waste past maxStorageHours, false otherwise', async () => {
    const old = await base({
      status: 'stored',
      storageLocation: 'room',
      storedAt: new Date(Date.now() - 100 * 3600 * 1000), // 100h ago
      maxStorageHours: 48,
    });
    expect(old.storageOverdue).toBe(true);

    const fresh = await base({
      status: 'stored',
      storageLocation: 'room',
      storedAt: new Date(Date.now() - 1 * 3600 * 1000), // 1h ago
      maxStorageHours: 48,
    });
    expect(fresh.storageOverdue).toBe(false);

    const notStored = await base(); // generated
    expect(notStored.storageOverdue).toBe(false);
  });
});
