'use strict';

/**
 * W976 — incident → NCR producer.
 *
 * Closes finding #2 from the quality event-bus audit: the ncrAutoLinkPipeline
 * subscribes to `quality.incident.reported` (auto-creates NCR + CAPA for serious
 * incidents) but NOTHING emitted it, so the CBAHI safety automation was dead.
 * Now that W974 unified the quality bus, an IncidentReport post('save') hook emits
 * the event on the singleton bus where the pipeline listens.
 *
 * The producer emits for EVERY new incident; the pipeline SELF-FILTERS by severity
 * (major/critical/sentinel) + dedups — so the clinical "which qualifies" decision
 * stays in the pipeline, and the producer is safe + idempotent. ENV-GATED, default
 * OFF (ENABLE_INCIDENT_NCR_AUTOLINK). Guarded so a bus error never breaks the save.
 *
 * Static guards + behavioral round-trip against MongoMemoryServer.
 */

const mongoose = require('mongoose');
jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'quality', 'IncidentReport.js'),
  'utf8'
);

describe('W976 incident→NCR producer — source shape', () => {
  it('env-gates on ENABLE_INCIDENT_NCR_AUTOLINK', () => {
    expect(MODEL_SRC).toMatch(/process\.env\.ENABLE_INCIDENT_NCR_AUTOLINK\s*!==\s*'true'/);
  });
  it('emits quality.incident.reported from a post(save) hook', () => {
    expect(MODEL_SRC).toMatch(/\.post\(\s*'save'/);
    expect(MODEL_SRC).toMatch(/emit\(\s*'quality\.incident\.reported'/);
  });
  it('only fires on creation (captures wasNew in pre-save)', () => {
    expect(MODEL_SRC).toMatch(/\$locals\.wasNew\s*=\s*this\.isNew/);
    expect(MODEL_SRC).toMatch(/\$locals\.wasNew\)\s*return/);
  });
  it('emits on the singleton bus (unified, W974) via getDefault', () => {
    expect(MODEL_SRC).toMatch(/require\(\s*'\.\.\/\.\.\/services\/quality\/qualityEventBus\.service'\s*\)/);
    expect(MODEL_SRC).toMatch(/getDefault\(\)/);
  });
});

describe('W976 incident→NCR producer — behavioral', () => {
  let mongod;
  let IncidentReport;
  let busMod;
  let original;
  let isolated;
  const PREV = process.env.ENABLE_INCIDENT_NCR_AUTOLINK;

  beforeAll(async () => {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    IncidentReport = require('../models/quality/IncidentReport');
    busMod = require('../services/quality/qualityEventBus.service');
  }, 60000);

  afterAll(async () => {
    if (PREV === undefined) delete process.env.ENABLE_INCIDENT_NCR_AUTOLINK;
    else process.env.ENABLE_INCIDENT_NCR_AUTOLINK = PREV;
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(() => {
    original = busMod.getDefault();
    isolated = busMod.createQualityEventBus();
    busMod._replaceDefault(isolated);
  });
  afterEach(() => {
    busMod._replaceDefault(original);
    delete process.env.ENABLE_INCIDENT_NCR_AUTOLINK;
  });

  function makeIncident(severity) {
    return new IncidentReport({
      title: 'Test incident',
      description: 'desc',
      incident_type: 'fall',
      severity,
      incident_date: new Date('2026-06-01'),
      reported_by: new mongoose.Types.ObjectId(),
      branch_id: new mongoose.Types.ObjectId(),
    });
  }

  it('emits quality.incident.reported on creation when enabled', async () => {
    process.env.ENABLE_INCIDENT_NCR_AUTOLINK = 'true';
    const received = [];
    busMod.getDefault().on('quality.incident.reported', p => received.push(p));

    const doc = await makeIncident('major').save();
    await busMod.getDefault().flush();

    expect(received).toHaveLength(1);
    expect(received[0].incidentId).toBe(String(doc._id));
    expect(received[0].severity).toBe('major');
    expect(received[0].branchId).toBe(String(doc.branch_id));
    expect(received[0].title).toBe('Test incident');
  });

  it('does NOT emit when the flag is off (inert default)', async () => {
    delete process.env.ENABLE_INCIDENT_NCR_AUTOLINK;
    const received = [];
    busMod.getDefault().on('quality.incident.reported', p => received.push(p));
    await makeIncident('critical').save();
    await busMod.getDefault().flush();
    expect(received).toHaveLength(0);
  });

  it('does NOT re-emit on a non-creation save (update)', async () => {
    process.env.ENABLE_INCIDENT_NCR_AUTOLINK = 'true';
    const doc = await makeIncident('sentinel').save();
    await busMod.getDefault().flush();

    const received = [];
    busMod.getDefault().on('quality.incident.reported', p => received.push(p));
    doc.status = 'under_investigation';
    await doc.save();
    await busMod.getDefault().flush();
    expect(received).toHaveLength(0); // only creation emits
  });

  it('a save still succeeds even though the producer is best-effort', async () => {
    process.env.ENABLE_INCIDENT_NCR_AUTOLINK = 'true';
    const doc = await makeIncident('minor').save(); // minor → pipeline would skip, producer still emits
    expect(doc._id).toBeDefined();
    expect(doc.incident_number).toMatch(/^INC-/);
  });
});
