/**
 * hikvision-wave100-phase5.test.js — Wave 100 Phase 5.
 *
 * Unit tests for the fraud detection + score slice:
 *   1. Registry pure helpers — detectRepeatMismatchInWindow,
 *      detectBurstPattern, computeScoreFromFlags (with decay),
 *      classifyScoreBand.
 *   2. Detection — evaluateProcessedEvent emits flags for
 *      anti-spoof FAIL / template-inactive / impossible-travel /
 *      burst access (per event).
 *   3. Detection — scanTemplates emits flags for repeat-mismatch /
 *      shared-identity / anti-spoof-trend.
 *   4. Detection — scanUnregisteredFaces groups by personId.
 *   5. Detection — duplicate-emit guard (no double-flag for same
 *      open pattern).
 *   6. Detection — acknowledge / dismiss / escalate flag transitions.
 *   7. Score — applyFlag incremental + recomputeScore full + band
 *      classification.
 *   8. Score — branch summary aggregates by band.
 *   9. Score — dismiss flag triggers recompute that removes contribution.
 *  10. Sweep — flags older than HARD_EXPIRE → EXPIRED.
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionFraudDetectionService,
} = require('../intelligence/hikvision-fraud-detection.service');
const {
  createHikvisionFraudScoreService,
} = require('../intelligence/hikvision-fraud-score.service');

// ─── Chainable mock builder ─────────────────────────────────────

function buildModel({ invariants = () => true } = {}) {
  const store = [];
  let counter = 0;

  function ModelCtor(data) {
    Object.assign(this, data);
    this._id = data._id || `id-${++counter}`;
    this.toObject = () => ({ ...this });
    this.isNew = !data._existing;
    this.isModified = () => false;

    this.validate = async function () {
      const errors = {};
      const invalidate = (path, msg) => {
        errors[path] = { message: msg };
      };
      const proxy = new Proxy(this, {
        get: (t, k) => (k === 'invalidate' ? invalidate : t[k]),
      });
      invariants.call(proxy, proxy);
      if (Object.keys(errors).length) {
        const err = new Error('Validation failed');
        err.errors = errors;
        throw err;
      }
    };

    this.save = async function () {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) {
        store[idx] = { ...this };
      } else {
        if (ModelCtor._unique) {
          for (const fields of ModelCtor._unique) {
            const conflict = store.find(r => fields.every(f => String(r[f]) === String(this[f])));
            if (conflict) {
              const err = new Error('E11000 duplicate key');
              err.code = 11000;
              throw err;
            }
          }
        }
        store.push({ ...this });
      }
      return this;
    };
  }

  ModelCtor._store = store;
  ModelCtor._unique = [];

  ModelCtor.findOne = function (query = {}) {
    const match = store.find(r => _matches(r, query));
    return { lean: async () => (match ? { ...match } : null) };
  };

  ModelCtor.findById = function (id) {
    const hit = store.find(r => String(r._id) === String(id));
    if (!hit) {
      return { lean: async () => null, then: resolve => resolve(null) };
    }
    const inst = new ModelCtor({ ...hit, _existing: true });
    inst._id = hit._id;
    return {
      lean: async () => ({ ...hit }),
      then: resolve => resolve(inst),
    };
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r => _matches(r, query));
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = a[key];
          const bv = b[key];
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return chain;
      },
      skip(n) {
        matches = matches.slice(n);
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      select() {
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: resolve =>
        resolve(
          matches.map(r => {
            const inst = new ModelCtor({ ...r, _existing: true });
            inst._id = r._id;
            return inst;
          })
        ),
    };
    return chain;
  };

  ModelCtor.countDocuments = async function (query = {}) {
    return store.filter(r => _matches(r, query)).length;
  };

  ModelCtor.updateOne = async function (query, update) {
    const t = store.find(r => _matches(r, query));
    if (t && update.$set) Object.assign(t, update.$set);
    return { acknowledged: true, modifiedCount: t ? 1 : 0 };
  };

  ModelCtor.updateMany = async function (query, update) {
    const matches = store.filter(r => _matches(r, query));
    if (update.$set) for (const r of matches) Object.assign(r, update.$set);
    return { acknowledged: true, modifiedCount: matches.length };
  };

  return ModelCtor;
}

function _matches(row, query) {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      if (!v.some(cond => _matches(row, cond))) return false;
      continue;
    }
    if (v === null) {
      if (row[k] !== null && row[k] !== undefined) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$in' in v) {
      if (!v.$in.some(x => String(row[k]) === String(x))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$ne' in v) {
      if (String(row[k]) === String(v.$ne)) return false;
      continue;
    }
    if (v && typeof v === 'object' && ('$lt' in v || '$gt' in v || '$gte' in v || '$lte' in v)) {
      if (row[k] === null || row[k] === undefined) return false;
      const rv = new Date(row[k]).getTime();
      if ('$lt' in v && !(rv < new Date(v.$lt).getTime())) return false;
      if ('$gt' in v && !(rv > new Date(v.$gt).getTime())) return false;
      if ('$gte' in v && !(rv >= new Date(v.$gte).getTime())) return false;
      if ('$lte' in v && !(rv <= new Date(v.$lte).getTime())) return false;
      continue;
    }
    if (String(row[k]) !== String(v)) return false;
  }
  return true;
}

const SILENT_LOGGER = { error: () => {}, warn: () => {}, info: () => {} };

function buildFlagModel() {
  return buildModel({
    invariants() {
      if (
        !Array.isArray(this.evidenceProcessedEventIds) ||
        this.evidenceProcessedEventIds.length === 0
      ) {
        this.invalidate('evidenceProcessedEventIds', 'required');
      }
      if (this.state === reg.FRAUD_FLAG_STATE.DISMISSED) {
        if (!this.resolverId) this.invalidate('resolverId', 'required');
        if (!this.resolverNote) this.invalidate('resolverNote', 'required');
        if (this.scoreImpact !== 0) this.invalidate('scoreImpact', 'must be 0');
      }
      if (this.state === reg.FRAUD_FLAG_STATE.ESCALATED && !this.escalatedToRole) {
        this.invalidate('escalatedToRole', 'required');
      }
      if (this.kind !== reg.FRAUD_KIND.UNREGISTERED_REPEAT && !this.employeeId) {
        this.invalidate('employeeId', 'required for non-unregistered flags');
      }
    },
  });
}

function buildScoreModel() {
  const M = buildModel({
    invariants() {
      if (this.currentScore < 0 || this.currentScore > 100) {
        this.invalidate('currentScore', 'out of range');
      }
    },
  });
  M._unique = [['employeeId']];
  return M;
}

function buildProcessedEventModel() {
  return buildModel();
}

function buildTemplateModel() {
  return buildModel();
}

// ─── 1. Registry pure helpers ───────────────────────────────────

describe('hikvision.registry — Phase 5 pure helpers', () => {
  test('detectRepeatMismatchInWindow — ≥3 fails returns HIGH severity', () => {
    const events = [
      { _id: 'a', decision: 'reject', reviewReason: 'low-confidence' },
      { _id: 'b', decision: 'reject', reviewReason: 'low-confidence' },
      { _id: 'c', decision: 'reject', reviewReason: 'mismatch' },
    ];
    const r = reg.detectRepeatMismatchInWindow(events);
    expect(r).toBeTruthy();
    expect(r.kind).toBe(reg.FRAUD_KIND.REPEAT_MISMATCH);
    expect(r.severity).toBe(reg.FRAUD_SEVERITY.HIGH);
    expect(r.evidenceProcessedEventIds).toHaveLength(3);
  });

  test('detectRepeatMismatchInWindow — ≥5 fails → CRITICAL', () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      _id: `e${i}`,
      decision: 'reject',
      reviewReason: 'low-confidence',
    }));
    const r = reg.detectRepeatMismatchInWindow(events);
    expect(r.severity).toBe(reg.FRAUD_SEVERITY.CRITICAL);
  });

  test('detectRepeatMismatchInWindow — <3 → null', () => {
    expect(
      reg.detectRepeatMismatchInWindow([
        { _id: 'a', decision: 'reject', reviewReason: 'low-confidence' },
        { _id: 'b', decision: 'reject', reviewReason: 'low-confidence' },
      ])
    ).toBeNull();
  });

  test('detectBurstPattern — ≥5 events in 5min → flag', () => {
    const base = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      _id: `e${i}`,
      capturedAt: new Date(base + i * 30_000), // 30s apart
    }));
    const r = reg.detectBurstPattern(events);
    expect(r).toBeTruthy();
    expect(r.kind).toBe(reg.FRAUD_KIND.BURST_ACCESS);
    expect(r.severity).toBe(reg.FRAUD_SEVERITY.HIGH);
  });

  test('detectBurstPattern — 5 events spread > 5min → null', () => {
    const base = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      _id: `e${i}`,
      capturedAt: new Date(base + i * 90_000), // 90s apart → 6min total
    }));
    expect(reg.detectBurstPattern(events)).toBeNull();
  });

  test('computeScoreFromFlags — sums score impacts with decay', () => {
    const now = Date.now();
    const flags = [
      {
        scoreImpact: 30,
        state: 'open',
        detectedAt: new Date(now - 60_000), // very recent — full weight
      },
      {
        scoreImpact: 30,
        state: 'open',
        detectedAt: new Date(now - 30 * 24 * 60 * 60_000), // one half-life
      },
    ];
    const score = reg.computeScoreFromFlags(flags, { now });
    // Expected: 30 * 1 + 30 * 0.5 = 45
    expect(score).toBeGreaterThan(44);
    expect(score).toBeLessThan(46);
  });

  test('computeScoreFromFlags — dismissed/expired flags skipped', () => {
    const now = Date.now();
    const flags = [
      { scoreImpact: 30, state: 'dismissed', detectedAt: new Date(now - 60_000) },
      { scoreImpact: 30, state: 'expired', detectedAt: new Date(now - 60_000) },
      { scoreImpact: 30, state: 'open', detectedAt: new Date(now - 60_000) },
    ];
    const score = reg.computeScoreFromFlags(flags, { now });
    // Only the open flag counts
    expect(score).toBeGreaterThan(29);
    expect(score).toBeLessThan(31);
  });

  test('computeScoreFromFlags — flag older than HARD_EXPIRE → 0 contribution', () => {
    const now = Date.now();
    const flags = [
      {
        scoreImpact: 100,
        state: 'open',
        detectedAt: new Date(now - 100 * 24 * 60 * 60_000), // 100 days > 90d hard expire
      },
    ];
    expect(reg.computeScoreFromFlags(flags, { now })).toBe(0);
  });

  test('classifyScoreBand — bands map correctly', () => {
    expect(reg.classifyScoreBand(0)).toBe(reg.FRAUD_SEVERITY.LOW);
    expect(reg.classifyScoreBand(15)).toBe(reg.FRAUD_SEVERITY.LOW);
    expect(reg.classifyScoreBand(25)).toBe(reg.FRAUD_SEVERITY.MEDIUM);
    expect(reg.classifyScoreBand(60)).toBe(reg.FRAUD_SEVERITY.HIGH);
    expect(reg.classifyScoreBand(90)).toBe(reg.FRAUD_SEVERITY.CRITICAL);
  });
});

// ─── 2-3. Detection service ─────────────────────────────────────

describe('hikvision-fraud-detection.service', () => {
  function setup() {
    const flagModel = buildFlagModel();
    const processedEventModel = buildProcessedEventModel();
    const templateModel = buildTemplateModel();
    const scoreModel = buildScoreModel();

    const scoreSvc = createHikvisionFraudScoreService({
      scoreModel,
      flagModel,
      logger: SILENT_LOGGER,
    });
    const svc = createHikvisionFraudDetectionService({
      flagModel,
      processedEventModel,
      templateModel,
      scoreService: scoreSvc,
      logger: SILENT_LOGGER,
    });
    return { svc, scoreSvc, flagModel, processedEventModel, templateModel, scoreModel };
  }

  test('evaluateProcessedEvent — anti-spoof FAIL emits critical flag', async () => {
    const { svc, flagModel } = setup();
    const event = {
      _id: 'pe-1',
      matchedEmployeeId: 'emp-1',
      templateId: 'tmp-1',
      branchId: 'br-1',
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      capturedAt: new Date(),
    };
    const r = await svc.evaluateProcessedEvent(event);
    expect(r.ok).toBe(true);
    expect(r.flagsEmitted).toBeGreaterThanOrEqual(1);
    const antiSpoofFlag = r.flags.find(f => f.kind === reg.FRAUD_KIND.ANTI_SPOOF_TREND);
    expect(antiSpoofFlag).toBeTruthy();
    expect(antiSpoofFlag.severity).toBe(reg.FRAUD_SEVERITY.CRITICAL);
    expect(flagModel._store.length).toBe(1);
  });

  test('evaluateProcessedEvent — template-inactive emits high flag', async () => {
    const { svc } = setup();
    const event = {
      _id: 'pe-2',
      matchedEmployeeId: 'emp-1',
      templateId: 'tmp-suspended',
      branchId: 'br-1',
      reviewReason: reg.REVIEW_REASON.TEMPLATE_INACTIVE,
      capturedAt: new Date(),
    };
    const r = await svc.evaluateProcessedEvent(event);
    expect(r.ok).toBe(true);
    const flag = r.flags.find(f => f.kind === reg.FRAUD_KIND.TEMPLATE_INACTIVE_USED);
    expect(flag).toBeTruthy();
    expect(flag.severity).toBe(reg.FRAUD_SEVERITY.HIGH);
  });

  test('evaluateProcessedEvent — single impossible-travel emits flag', async () => {
    const { svc } = setup();
    const event = {
      _id: 'pe-3',
      matchedEmployeeId: 'emp-1',
      templateId: 'tmp-1',
      branchId: 'br-A',
      reviewReason: reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL,
      capturedAt: new Date(),
    };
    const r = await svc.evaluateProcessedEvent(event);
    const flag = r.flags.find(f => f.kind === reg.FRAUD_KIND.IMPOSSIBLE_TRAVEL);
    expect(flag).toBeTruthy();
  });

  test('evaluateProcessedEvent — burst access detects 5 events same employee in 5min', async () => {
    const { svc, processedEventModel } = setup();
    const base = Date.now();
    // Seed 4 prior events
    for (let i = 0; i < 4; i += 1) {
      processedEventModel._store.push({
        _id: `pre-${i}`,
        matchedEmployeeId: 'emp-1',
        capturedAt: new Date(base - (4 - i) * 30_000),
        templateId: 'tmp-1',
        branchId: 'br-1',
      });
    }
    const event = {
      _id: 'pe-NEW',
      matchedEmployeeId: 'emp-1',
      templateId: 'tmp-1',
      branchId: 'br-1',
      capturedAt: new Date(base),
    };
    processedEventModel._store.push(event);
    const r = await svc.evaluateProcessedEvent(event);
    const burst = r.flags.find(f => f.kind === reg.FRAUD_KIND.BURST_ACCESS);
    expect(burst).toBeTruthy();
  });

  test('evaluateProcessedEvent — no employee → no flags except for unregistered detector', async () => {
    const { svc } = setup();
    const event = {
      _id: 'pe-4',
      matchedEmployeeId: null,
      branchId: 'br-1',
      capturedAt: new Date(),
    };
    const r = await svc.evaluateProcessedEvent(event);
    expect(r.ok).toBe(true);
    expect(r.flagsEmitted).toBe(0);
  });

  test('scanTemplates — emits repeat-mismatch flag for template with ≥3 rejects', async () => {
    const { svc, processedEventModel } = setup();
    const tid = 'tmp-X';
    const base = Date.now();
    for (let i = 0; i < 4; i += 1) {
      processedEventModel._store.push({
        _id: `mm-${i}`,
        templateId: tid,
        matchedEmployeeId: 'emp-X',
        branchId: 'br-1',
        decision: reg.GATE_DECISION.REJECT,
        reviewReason: reg.REVIEW_REASON.LOW_CONFIDENCE,
        capturedAt: new Date(base - i * 60_000),
      });
    }
    const r = await svc.scanTemplates({ templateIds: [tid] });
    expect(r.ok).toBe(true);
    expect(r.flagsEmitted).toBeGreaterThanOrEqual(1);
    const flag = r.flags.find(f => f.kind === reg.FRAUD_KIND.REPEAT_MISMATCH);
    expect(flag).toBeTruthy();
  });

  test('scanTemplates — emits shared-identity for ≥2 impossible-travel events in 7d', async () => {
    const { svc, processedEventModel } = setup();
    const tid = 'tmp-Y';
    processedEventModel._store.push(
      {
        _id: 'i1',
        templateId: tid,
        matchedEmployeeId: 'emp-Y',
        branchId: 'br-A',
        reviewReason: reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL,
        capturedAt: new Date(Date.now() - 60_000),
      },
      {
        _id: 'i2',
        templateId: tid,
        matchedEmployeeId: 'emp-Y',
        branchId: 'br-B',
        reviewReason: reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL,
        capturedAt: new Date(Date.now() - 5 * 60_000),
      }
    );
    const r = await svc.scanTemplates({ templateIds: [tid] });
    expect(r.ok).toBe(true);
    const flag = r.flags.find(f => f.kind === reg.FRAUD_KIND.SHARED_IDENTITY);
    expect(flag).toBeTruthy();
    expect(flag.severity).toBe(reg.FRAUD_SEVERITY.CRITICAL);
  });

  test('scanTemplates — emits anti-spoof-trend for ≥2 anti-spoof FAIL in 24h', async () => {
    const { svc, processedEventModel } = setup();
    const tid = 'tmp-Z';
    processedEventModel._store.push(
      {
        _id: 'as1',
        templateId: tid,
        matchedEmployeeId: 'emp-Z',
        branchId: 'br-1',
        antiSpoofResult: reg.ANTI_SPOOF.FAIL,
        capturedAt: new Date(Date.now() - 60_000),
      },
      {
        _id: 'as2',
        templateId: tid,
        matchedEmployeeId: 'emp-Z',
        branchId: 'br-1',
        antiSpoofResult: reg.ANTI_SPOOF.FAIL,
        capturedAt: new Date(Date.now() - 5 * 60_000),
      }
    );
    const r = await svc.scanTemplates({ templateIds: [tid] });
    const flag = r.flags.find(f => f.kind === reg.FRAUD_KIND.ANTI_SPOOF_TREND);
    expect(flag).toBeTruthy();
    expect(flag.severity).toBe(reg.FRAUD_SEVERITY.CRITICAL);
  });

  test('scanUnregisteredFaces — groups by personId, ≥3 occurrences → flag', async () => {
    const { svc, processedEventModel } = setup();
    for (let i = 0; i < 4; i += 1) {
      processedEventModel._store.push({
        _id: `unreg-${i}`,
        eventKind: reg.RAW_EVENT_KIND.UNREGISTERED_FACE,
        hikvisionPersonId: 'unknown-42',
        matchedEmployeeId: null,
        branchId: 'br-1',
        capturedAt: new Date(Date.now() - i * 60_000),
      });
    }
    const r = await svc.scanUnregisteredFaces({});
    expect(r.ok).toBe(true);
    const flag = r.flags.find(f => f.kind === reg.FRAUD_KIND.UNREGISTERED_REPEAT);
    expect(flag).toBeTruthy();
    expect(flag.hikvisionPersonId).toBe('unknown-42');
    expect(flag.employeeId).toBeNull();
  });

  test('Detection — duplicate-emit guard prevents double flag for same open pattern', async () => {
    const { svc, processedEventModel } = setup();
    const tid = 'tmp-DUP';
    for (let i = 0; i < 4; i += 1) {
      processedEventModel._store.push({
        _id: `dup-${i}`,
        templateId: tid,
        matchedEmployeeId: 'emp-DUP',
        branchId: 'br-1',
        decision: reg.GATE_DECISION.REJECT,
        reviewReason: reg.REVIEW_REASON.LOW_CONFIDENCE,
        capturedAt: new Date(Date.now() - i * 60_000),
      });
    }
    const first = await svc.scanTemplates({ templateIds: [tid] });
    const second = await svc.scanTemplates({ templateIds: [tid] });
    expect(first.flagsEmitted).toBeGreaterThanOrEqual(1);
    expect(second.flagsEmitted).toBe(0);
  });

  test('acknowledgeFlag → state ACKNOWLEDGED, scoreImpact unchanged', async () => {
    const { svc, processedEventModel } = setup();
    processedEventModel._store.push({
      _id: 'pe-ack',
      matchedEmployeeId: 'emp-ACK',
      templateId: 'tmp-1',
      branchId: 'br-1',
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      capturedAt: new Date(),
    });
    const created = await svc.evaluateProcessedEvent({
      _id: 'pe-ack',
      matchedEmployeeId: 'emp-ACK',
      templateId: 'tmp-1',
      branchId: 'br-1',
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      capturedAt: new Date(),
    });
    const flagId = created.flags[0]._id;
    const r = await svc.acknowledgeFlag(flagId, {
      actor: { userId: 'security-1', role: 'security.officer' },
      note: 'verified via CCTV review',
    });
    expect(r.ok).toBe(true);
    expect(r.flag.state).toBe(reg.FRAUD_FLAG_STATE.ACKNOWLEDGED);
    expect(r.flag.scoreImpact).toBe(reg.FRAUD_SCORE_IMPACT.critical);
  });

  test('dismissFlag → state DISMISSED + scoreImpact=0 + resolverNote required', async () => {
    const { svc } = setup();
    const created = await svc.evaluateProcessedEvent({
      _id: 'pe-dis',
      matchedEmployeeId: 'emp-DIS',
      templateId: 'tmp-1',
      branchId: 'br-1',
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      capturedAt: new Date(),
    });
    const flagId = created.flags[0]._id;

    // Missing note → REQUIRED reason
    const noNote = await svc.dismissFlag(flagId, {
      actor: { userId: 'sec', role: 'ciso' },
    });
    expect(noNote.ok).toBe(false);
    expect(noNote.reason).toBe(reg.REASON.FRAUD_FLAG_RESOLUTION_REASON_REQUIRED);

    const ok = await svc.dismissFlag(flagId, {
      actor: { userId: 'sec', role: 'ciso' },
      note: 'false positive — known harmless camera misfire',
    });
    expect(ok.ok).toBe(true);
    expect(ok.flag.state).toBe(reg.FRAUD_FLAG_STATE.DISMISSED);
    expect(ok.flag.scoreImpact).toBe(0);
  });

  test('escalateFlag → state ESCALATED + escalatedToRole required', async () => {
    const { svc } = setup();
    const created = await svc.evaluateProcessedEvent({
      _id: 'pe-esc',
      matchedEmployeeId: 'emp-ESC',
      templateId: 'tmp-1',
      branchId: 'br-1',
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      capturedAt: new Date(),
    });
    const flagId = created.flags[0]._id;

    const noRole = await svc.escalateFlag(flagId, {
      actor: { userId: 'sec', role: 'security.officer' },
      note: 'escalating',
    });
    expect(noRole.ok).toBe(false);
    expect(noRole.reason).toBe(reg.REASON.VALIDATION_FAILED);

    const ok = await svc.escalateFlag(flagId, {
      actor: { userId: 'sec', role: 'security.officer' },
      note: 'escalating to DPO for compliance review',
      escalatedToRole: 'dpo',
    });
    expect(ok.ok).toBe(true);
    expect(ok.flag.state).toBe(reg.FRAUD_FLAG_STATE.ESCALATED);
    expect(ok.flag.escalatedToRole).toBe('dpo');
  });

  test('sweepExpiredFlags — flips OPEN past hard expire → EXPIRED', async () => {
    const { svc, flagModel } = setup();
    flagModel._store.push({
      _id: 'old',
      kind: reg.FRAUD_KIND.REPEAT_MISMATCH,
      severity: reg.FRAUD_SEVERITY.HIGH,
      state: reg.FRAUD_FLAG_STATE.OPEN,
      employeeId: 'emp-OLD',
      evidenceProcessedEventIds: ['e1'],
      detectedAt: new Date(Date.now() - 100 * 24 * 60 * 60_000), // 100d ago
      scoreImpact: 30,
    });
    const r = await svc.sweepExpiredFlags({});
    expect(r.ok).toBe(true);
    expect(r.expired).toBe(1);
    const stored = flagModel._store.find(f => f._id === 'old');
    expect(stored.state).toBe(reg.FRAUD_FLAG_STATE.EXPIRED);
  });
});

// ─── 7-9. Score service ─────────────────────────────────────────

describe('hikvision-fraud-score.service', () => {
  function setup() {
    const flagModel = buildFlagModel();
    const scoreModel = buildScoreModel();
    const svc = createHikvisionFraudScoreService({
      scoreModel,
      flagModel,
      logger: SILENT_LOGGER,
    });
    return { svc, flagModel, scoreModel };
  }

  test('applyFlag — incremental adds scoreImpact + classifies band', async () => {
    const { svc } = setup();
    const flag = {
      _id: 'f1',
      employeeId: 'emp-1',
      branchId: 'br-1',
      scoreImpact: 30,
      state: reg.FRAUD_FLAG_STATE.OPEN,
      detectedAt: new Date(),
    };
    const r = await svc.applyFlag(flag);
    expect(r.ok).toBe(true);
    expect(r.score.currentScore).toBe(30);
    expect(r.score.band).toBe(reg.FRAUD_SEVERITY.MEDIUM);
  });

  test('applyFlag — incremental caps at 100', async () => {
    const { svc } = setup();
    for (let i = 0; i < 5; i += 1) {
      await svc.applyFlag({
        _id: `f${i}`,
        employeeId: 'emp-CAP',
        branchId: 'br-1',
        scoreImpact: 30,
        state: reg.FRAUD_FLAG_STATE.OPEN,
        detectedAt: new Date(),
      });
    }
    const r = await svc.getScore('emp-CAP');
    expect(r.score.currentScore).toBe(100);
    expect(r.score.band).toBe(reg.FRAUD_SEVERITY.CRITICAL);
  });

  test('recomputeScore — pulls flags + applies decay function', async () => {
    const { svc, flagModel } = setup();
    flagModel._store.push(
      {
        _id: 'fa',
        employeeId: 'emp-2',
        scoreImpact: 30,
        state: reg.FRAUD_FLAG_STATE.OPEN,
        detectedAt: new Date(),
      },
      {
        _id: 'fb',
        employeeId: 'emp-2',
        scoreImpact: 30,
        state: reg.FRAUD_FLAG_STATE.DISMISSED, // should be ignored
        detectedAt: new Date(),
      }
    );
    const r = await svc.recomputeScore('emp-2');
    expect(r.ok).toBe(true);
    expect(r.score.currentScore).toBeGreaterThan(29);
    expect(r.score.currentScore).toBeLessThan(31);
    expect(r.score.flagCount.total).toBe(2);
    expect(r.score.flagCount.dismissed).toBe(1);
    expect(r.score.flagCount.open).toBe(1);
  });

  test('getBranchSummary — aggregates by band', async () => {
    const { svc, scoreModel } = setup();
    scoreModel._store.push(
      { _id: '1', employeeId: 'e1', primaryBranchId: 'br-X', currentScore: 10, band: 'low' },
      { _id: '2', employeeId: 'e2', primaryBranchId: 'br-X', currentScore: 40, band: 'medium' },
      { _id: '3', employeeId: 'e3', primaryBranchId: 'br-X', currentScore: 70, band: 'high' },
      { _id: '4', employeeId: 'e4', primaryBranchId: 'br-X', currentScore: 90, band: 'critical' },
      { _id: '5', employeeId: 'e5', primaryBranchId: 'br-Y', currentScore: 50, band: 'medium' }
    );
    const r = await svc.getBranchSummary('br-X');
    expect(r.ok).toBe(true);
    expect(r.employeeCount).toBe(4);
    expect(r.byBand).toMatchObject({ low: 1, medium: 1, high: 1, critical: 1 });
    expect(r.maxScore).toBe(90);
    expect(r.avgScore).toBe(52.5);
  });

  test('Dismiss flag → score service recomputes + removes contribution', async () => {
    const flagModel = buildFlagModel();
    const scoreModel = buildScoreModel();
    const processedEventModel = buildProcessedEventModel();

    const scoreSvc = createHikvisionFraudScoreService({
      scoreModel,
      flagModel,
      logger: SILENT_LOGGER,
    });
    const detSvc = createHikvisionFraudDetectionService({
      flagModel,
      processedEventModel,
      scoreService: scoreSvc,
      logger: SILENT_LOGGER,
    });

    // Emit a critical anti-spoof flag
    const created = await detSvc.evaluateProcessedEvent({
      _id: 'pe-K',
      matchedEmployeeId: 'emp-K',
      templateId: 'tmp-K',
      branchId: 'br-1',
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      capturedAt: new Date(),
    });
    const flagId = created.flags[0]._id;

    // Score should be at critical level
    const before = await scoreSvc.getScore('emp-K');
    expect(before.score.currentScore).toBe(reg.FRAUD_SCORE_IMPACT.critical);

    // Dismiss it
    await detSvc.dismissFlag(flagId, {
      actor: { userId: 'dpo', role: 'dpo' },
      note: 'false positive after manual review',
    });

    // Score should now reflect the dismissal
    const after = await scoreSvc.getScore('emp-K');
    expect(after.score.currentScore).toBe(0);
    expect(after.score.band).toBe(reg.FRAUD_SEVERITY.LOW);
  });
});
