'use strict';

/**
 * infection-surveillance-behavioral-wave1042.test.js — behavioral
 * counterpart to the W1042 static drift guard. MongoMemoryServer-based.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let IPC;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1042-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  IPC = require('../models/InfectionSurveillanceCase');
  await IPC.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await IPC.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    category: 'respiratory',
    caseStatus: 'suspected',
    ...overrides,
  };
}

describe('W1042 behavioral — base save + enum gating', () => {
  it('SAVES a minimal suspected respiratory case', async () => {
    const doc = await IPC.create(baseDoc());
    expect(doc.caseStatus).toBe('suspected');
    expect(doc.isActive).toBe(true);
  });

  it('REJECTS an invalid category', async () => {
    await expect(IPC.create(baseDoc({ category: 'zombie' }))).rejects.toThrow(/category/);
  });

  it('REJECTS an invalid caseStatus', async () => {
    await expect(IPC.create(baseDoc({ caseStatus: 'undead' }))).rejects.toThrow(/caseStatus/);
  });

  it('REJECTS an invalid precautionType', async () => {
    await expect(IPC.create(baseDoc({ precautionType: 'forcefield' }))).rejects.toThrow(/precautionType/);
  });
});

describe('W1042 behavioral — clinical invariants', () => {
  it('REJECTS confirmed with no pathogen named', async () => {
    await expect(IPC.create(baseDoc({ caseStatus: 'confirmed' }))).rejects.toThrow(/pathogen/);
  });

  it('SAVES confirmed when pathogen named', async () => {
    const doc = await IPC.create(baseDoc({ caseStatus: 'confirmed', pathogen: 'Influenza A' }));
    expect(doc.pathogen).toBe('Influenza A');
  });

  it('REJECTS resolved with no resolutionDate', async () => {
    await expect(IPC.create(baseDoc({ caseStatus: 'resolved' }))).rejects.toThrow(/resolutionDate/);
  });

  it('REJECTS resolutionDate earlier than onsetDate', async () => {
    await expect(
      IPC.create(baseDoc({ caseStatus: 'resolved', onsetDate: new Date('2026-06-05'), resolutionDate: new Date('2026-06-01') }))
    ).rejects.toThrow(/resolutionDate/);
  });

  it('REJECTS isolationRequired with precautionType=none', async () => {
    await expect(IPC.create(baseDoc({ isolationRequired: true }))).rejects.toThrow(/precautionType/);
  });

  it('REJECTS excludedFromCenter with no exclusionStart', async () => {
    await expect(IPC.create(baseDoc({ excludedFromCenter: true }))).rejects.toThrow(/exclusionStart/);
  });

  it('REJECTS reportedToAuthority with no authorityReportDate', async () => {
    await expect(IPC.create(baseDoc({ reportedToAuthority: true }))).rejects.toThrow(/authorityReportDate/);
  });

  it('SAVES a fully-specified isolated + reported confirmed case', async () => {
    const doc = await IPC.create(
      baseDoc({
        caseStatus: 'confirmed',
        pathogen: 'Norovirus',
        category: 'gastrointestinal',
        isolationRequired: true,
        precautionType: 'contact',
        excludedFromCenter: true,
        exclusionStart: new Date('2026-06-01'),
        exclusionEnd: new Date('2026-06-04'),
        isNotifiable: true,
        reportedToAuthority: true,
        authorityReportDate: new Date('2026-06-01'),
      })
    );
    expect(doc.precautionType).toBe('contact');
    expect(doc.reportedToAuthority).toBe(true);
  });
});

describe('W1042 behavioral — virtuals', () => {
  it('isActive true for suspected/confirmed, false for resolved', async () => {
    const a = await IPC.create(baseDoc({ caseStatus: 'confirmed', pathogen: 'RSV' }));
    expect(a.isActive).toBe(true);
    const b = await IPC.create(baseDoc({ caseStatus: 'resolved', resolutionDate: new Date('2026-06-10') }));
    expect(b.isActive).toBe(false);
  });

  it('isCurrentlyExcluded true when excluded with a future/no return date', async () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const doc = await IPC.create(
      baseDoc({ excludedFromCenter: true, exclusionStart: new Date(), exclusionEnd: future })
    );
    expect(doc.isCurrentlyExcluded).toBe(true);
  });

  it('isCurrentlyExcluded false once the return date has passed', async () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const doc = await IPC.create(
      baseDoc({ excludedFromCenter: true, exclusionStart: new Date('2020-01-01'), exclusionEnd: past })
    );
    expect(doc.isCurrentlyExcluded).toBe(false);
  });

  it('durationDays computes onset → resolution', async () => {
    const doc = await IPC.create(
      baseDoc({ onsetDate: new Date('2026-06-01'), caseStatus: 'resolved', resolutionDate: new Date('2026-06-08') })
    );
    expect(doc.durationDays).toBe(7);
  });
});

describe('W1042 behavioral — round-trip persistence', () => {
  it('round-trips category + symptoms + outbreak tag', async () => {
    const doc = await IPC.create(
      baseDoc({
        category: 'skin_soft_tissue',
        pathogen: 'Scabies',
        caseStatus: 'confirmed',
        symptoms: ['itching', 'rash'],
        outbreakId: 'OB-2026-06-A',
      })
    );
    const reloaded = await IPC.findById(doc._id).lean();
    expect(reloaded.category).toBe('skin_soft_tissue');
    expect(reloaded.symptoms).toEqual(['itching', 'rash']);
    expect(reloaded.outbreakId).toBe('OB-2026-06-A');
  });
});
