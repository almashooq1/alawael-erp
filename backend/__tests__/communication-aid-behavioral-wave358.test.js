'use strict';

/**
 * communication-aid-behavioral-wave358.test.js — behavioral counterpart to
 * `communication-aid-wave358.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - lifecycleStatus enum (draft/active/paused/retired)
 *   - lifecycleStatus=active ⇒ primaryModality + activeModalities[non-empty]
 *   - vocabularyLevel enum
 *   - primaryModality must appear in activeModalities[]
 *   - activeTools[] entries require name + tier + introducedAt
 *   - non-draft ⇒ assessedBy + assessedAt
 *   - singleton per beneficiary (unique index on beneficiaryId)
 *
 * Plus `hasHighTechTool` + `reassessmentOverdue` virtuals.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CommunicationAidProfile;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w358-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  CommunicationAidProfile = require('../models/CommunicationAidProfile');
  await CommunicationAidProfile.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await CommunicationAidProfile.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    vocabularyLevel: 'pre_symbolic',
    ...overrides,
  };
}

describe('W358 behavioral — singleton per beneficiary', () => {
  it('SAVES one profile per beneficiary', async () => {
    const doc = await CommunicationAidProfile.create(baseDoc());
    expect(doc.lifecycleStatus).toBe('draft');
  });

  it('REJECTS second profile for same beneficiaryId (unique index)', async () => {
    const bid = new mongoose.Types.ObjectId();
    await CommunicationAidProfile.create(baseDoc({ beneficiaryId: bid }));
    await expect(CommunicationAidProfile.create(baseDoc({ beneficiaryId: bid }))).rejects.toThrow();
  });
});

describe('W358 behavioral — lifecycleStatus=active invariants', () => {
  it('REJECTS active without primaryModality', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        lifecycleStatus: 'active',
        assessedByName: 'SLP',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/primaryModality/);
  });

  it('REJECTS active with primaryModality but no activeModalities[]', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        lifecycleStatus: 'active',
        primaryModality: 'speech',
        activeModalities: [],
        assessedByName: 'SLP',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/activeModalities/);
  });

  it('REJECTS active when primaryModality not in activeModalities[]', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        lifecycleStatus: 'active',
        primaryModality: 'speech',
        activeModalities: ['gestures'],
        assessedByName: 'SLP',
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/primaryModality/);
  });

  it('SAVES active with consistent primary/active modalities', async () => {
    const doc = await CommunicationAidProfile.create(
      baseDoc({
        lifecycleStatus: 'active',
        primaryModality: 'speech',
        activeModalities: ['speech', 'gestures'],
        assessedByName: 'SLP Layla',
        assessedAt: new Date(),
      })
    );
    expect(doc.lifecycleStatus).toBe('active');
  });
});

describe('W358 behavioral — non-draft requires assessor', () => {
  it('REJECTS non-draft without assessedBy/assessedByName', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        lifecycleStatus: 'active',
        primaryModality: 'speech',
        activeModalities: ['speech'],
        assessedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/assessedBy/);
  });

  it('REJECTS non-draft without assessedAt', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        lifecycleStatus: 'active',
        primaryModality: 'speech',
        activeModalities: ['speech'],
        assessedByName: 'SLP',
      })
    );
    await expect(p.save()).rejects.toThrow(/assessedAt/);
  });
});

describe('W358 behavioral — activeTools[] integrity', () => {
  it('REJECTS tool with empty name', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        activeTools: [
          {
            name: '',
            tier: 'high_tech_aided',
            modalityKey: 'sgd_tablet_app',
            introducedAt: new Date(),
          },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/name/);
  });

  it('REJECTS tool without introducedAt', async () => {
    const p = new CommunicationAidProfile(
      baseDoc({
        activeTools: [
          { name: 'Proloquo2Go', tier: 'high_tech_aided', modalityKey: 'sgd_tablet_app' },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES tool with full chain', async () => {
    const doc = await CommunicationAidProfile.create(
      baseDoc({
        activeTools: [
          {
            name: 'Proloquo2Go',
            tier: 'high_tech_aided',
            modalityKey: 'sgd_tablet_app',
            introducedAt: new Date(),
          },
        ],
      })
    );
    expect(doc.activeTools).toHaveLength(1);
  });
});

describe('W358 behavioral — virtuals', () => {
  it('hasHighTechTool=false with no tools', async () => {
    const doc = await CommunicationAidProfile.create(baseDoc());
    expect(doc.hasHighTechTool).toBe(false);
  });

  it('hasHighTechTool=true with at least one high_tech_aided tool', async () => {
    const doc = await CommunicationAidProfile.create(
      baseDoc({
        activeTools: [
          {
            name: 'TouchChat',
            tier: 'high_tech_aided',
            modalityKey: 'sgd_tablet_app',
            introducedAt: new Date(),
          },
        ],
      })
    );
    expect(doc.hasHighTechTool).toBe(true);
  });

  it('reassessmentOverdue=false when nextReassessmentDue in future', async () => {
    const doc = await CommunicationAidProfile.create(
      baseDoc({ nextReassessmentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
    );
    expect(doc.reassessmentOverdue).toBe(false);
  });

  it('reassessmentOverdue=true when nextReassessmentDue in past', async () => {
    const doc = await CommunicationAidProfile.create(
      baseDoc({ nextReassessmentDue: new Date(Date.now() - 1000) })
    );
    expect(doc.reassessmentOverdue).toBe(true);
  });
});

describe('W358 behavioral — defaults', () => {
  it('defaults lifecycleStatus=draft, vocabularyLevel=pre_symbolic, usedAtHome=false', async () => {
    const doc = await CommunicationAidProfile.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
    });
    expect(doc.lifecycleStatus).toBe('draft');
    expect(doc.vocabularyLevel).toBe('pre_symbolic');
    expect(doc.usedAtHome).toBe(false);
    expect(doc.activeModalities).toEqual([]);
  });
});
