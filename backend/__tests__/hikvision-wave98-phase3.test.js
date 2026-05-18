/**
 * hikvision-wave98-phase3.test.js — Wave 98 Phase 3.
 *
 * Unit tests for the recognition + confidence-review slice.
 *
 * Sections:
 *   1. Registry pure helpers — applyConfidenceGate / resolveTrustTier /
 *      isImpossibleTravel / slaForQueue
 *   2. Confidence gate service — full evaluate() with overlays
 *      (duplicate suppression / impossible travel / repeat mismatch)
 *   3. Attendance source service — createReview + createSourceEvent
 *      invariants
 *   4. Review queue — approve + reject + escalate + SLA sweep
 *   5. Parser service — end-to-end pending raw → processed +
 *      sourceEvent OR review per gate outcome
 *   6. Parser — unregistered face, template inactive, anti-spoof fail
 *   7. Parser — duplicate suppression links back to prior accepted
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionConfidenceGateService,
} = require('../intelligence/hikvision-confidence-gate.service');
const { createAttendanceSourceService } = require('../intelligence/attendance-source.service');
const {
  createHikvisionEventParserService,
} = require('../intelligence/hikvision-event-parser.service');

// ─── Chainable mock builder (extracted from Phase 2 — same lesson
//     about thenable wrappers applies) ────────────────────────────

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
    if (v && typeof v === 'object' && '$lt' in v) {
      if (row[k] === null || row[k] === undefined) return false;
      if (!(new Date(row[k]) < new Date(v.$lt))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$gte' in v) {
      if (row[k] === null || row[k] === undefined) return false;
      if (!(new Date(row[k]) >= new Date(v.$gte))) return false;
      continue;
    }
    if (String(row[k]) !== String(v)) return false;
  }
  return true;
}

// Phase-3 model builders with their invariants

function buildProcessedEventModel() {
  return buildModel({
    invariants() {
      if (
        (this.decision === reg.GATE_DECISION.REVIEW ||
          this.decision === reg.GATE_DECISION.REJECT) &&
        !this.reviewReason
      ) {
        this.invalidate('reviewReason', 'required');
      }
      if (this.decision === reg.GATE_DECISION.REVIEW && !this.reviewQueue) {
        this.invalidate('reviewQueue', 'required');
      }
      if (this.decision === reg.GATE_DECISION.SUPPRESSED && !this.linkedSuppressedFromEventId) {
        this.invalidate('linkedSuppressedFromEventId', 'required');
      }
    },
  });
}

function buildSourceEventModel() {
  return buildModel({
    invariants() {
      if (this.accepted && !this.sourceRefId) {
        this.invalidate('sourceRefId', 'required');
      }
      if (this.accepted === false && !this.reasonIfRejected) {
        this.invalidate('reasonIfRejected', 'required');
      }
    },
  });
}

function buildReviewModel() {
  const RESOLVED = new Set([
    reg.REVIEW_STATE.APPROVED,
    reg.REVIEW_STATE.REJECTED,
    reg.REVIEW_STATE.ESCALATED,
  ]);
  return buildModel({
    invariants() {
      if (this.state === reg.REVIEW_STATE.OPEN || this.state === reg.REVIEW_STATE.EXPIRED) {
        if (this.resolverId || this.resolverNote || this.resolvedAt) {
          this.invalidate('resolverId', 'must be null');
        }
      }
      if (RESOLVED.has(this.state)) {
        if (!this.resolverId) this.invalidate('resolverId', 'required');
        if (!this.resolvedAt) this.invalidate('resolvedAt', 'required');
      }
      if (this.state === reg.REVIEW_STATE.REJECTED && !this.resolverNote) {
        this.invalidate('resolverNote', 'required');
      }
      if (this.state === reg.REVIEW_STATE.ESCALATED && !this.escalatedToQueue) {
        this.invalidate('escalatedToQueue', 'required');
      }
    },
  });
}

function buildRawEventModel() {
  return buildModel();
}

function buildDeviceModel() {
  return buildModel();
}

function buildChannelModel() {
  return buildModel();
}

function buildTemplateModel() {
  return buildModel();
}

const SILENT_LOGGER = { error: () => {}, warn: () => {}, info: () => {} };

// ─── 1. Registry helpers ───────────────────────────────────────

describe('hikvision.registry — Phase 3 pure helpers', () => {
  test('applyConfidenceGate — face-terminal ≥85 + spoof pass → auto-accept', () => {
    const r = reg.applyConfidenceGate({
      confidence: 90,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
    });
    expect(r.decision).toBe(reg.GATE_DECISION.AUTO_ACCEPT);
    expect(r.autoThreshold).toBe(85);
  });

  test('applyConfidenceGate — face-terminal between 60..84 → review (supervisor)', () => {
    const r = reg.applyConfidenceGate({
      confidence: 72,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.queue).toBe(reg.REVIEW_QUEUE.SUPERVISOR);
    expect(r.reason).toBe(reg.REVIEW_REASON.LOW_CONFIDENCE);
  });

  test('applyConfidenceGate — face-terminal <60 → reject (security)', () => {
    const r = reg.applyConfidenceGate({
      confidence: 40,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REJECT);
    expect(r.queue).toBe(reg.REVIEW_QUEUE.SECURITY);
  });

  test('applyConfidenceGate — camera-passive ≥90 → auto-accept (stricter threshold)', () => {
    const r = reg.applyConfidenceGate({
      confidence: 92,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE,
    });
    expect(r.decision).toBe(reg.GATE_DECISION.AUTO_ACCEPT);
    expect(r.autoThreshold).toBe(90);
  });

  test('applyConfidenceGate — camera-passive 85 should be REVIEW (between 75 and 90)', () => {
    const r = reg.applyConfidenceGate({
      confidence: 85,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE,
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
  });

  test('applyConfidenceGate — anti-spoof FAIL → reject + security regardless of confidence', () => {
    const r = reg.applyConfidenceGate({
      confidence: 99,
      antiSpoofResult: reg.ANTI_SPOOF.FAIL,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REJECT);
    expect(r.reason).toBe(reg.REVIEW_REASON.ANTI_SPOOF_FAILED);
    expect(r.queue).toBe(reg.REVIEW_QUEUE.SECURITY);
  });

  test('applyConfidenceGate — non-attendance-eligible channel → review even at high confidence', () => {
    const r = reg.applyConfidenceGate({
      confidence: 95,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE,
      channel: { attendanceEligible: false },
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.reason).toBe(reg.REVIEW_REASON.CHANNEL_NOT_ATTENDANCE_ELIGIBLE);
  });

  test('applyConfidenceGate — invalid confidence (NaN / out of range) → reject', () => {
    expect(
      reg.applyConfidenceGate({
        confidence: NaN,
        antiSpoofResult: reg.ANTI_SPOOF.PASS,
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      }).decision
    ).toBe(reg.GATE_DECISION.REJECT);
    expect(
      reg.applyConfidenceGate({
        confidence: 150,
        antiSpoofResult: reg.ANTI_SPOOF.PASS,
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      }).decision
    ).toBe(reg.GATE_DECISION.REJECT);
  });

  test('isImpossibleTravel — same emp / different branch / within 5 min → true', () => {
    const now = Date.now();
    expect(
      reg.isImpossibleTravel(
        { employeeId: 'e1', branchId: 'b1', capturedAt: new Date(now - 60_000) },
        { employeeId: 'e1', branchId: 'b2', capturedAt: new Date(now) }
      )
    ).toBe(true);
  });

  test('isImpossibleTravel — same branch → false', () => {
    expect(
      reg.isImpossibleTravel(
        { employeeId: 'e1', branchId: 'b1', capturedAt: new Date(Date.now() - 60_000) },
        { employeeId: 'e1', branchId: 'b1', capturedAt: new Date() }
      )
    ).toBe(false);
  });

  test('isImpossibleTravel — different employee → false', () => {
    expect(
      reg.isImpossibleTravel(
        { employeeId: 'e1', branchId: 'b1', capturedAt: new Date(Date.now() - 60_000) },
        { employeeId: 'e2', branchId: 'b2', capturedAt: new Date() }
      )
    ).toBe(false);
  });

  test('isImpossibleTravel — outside window → false', () => {
    expect(
      reg.isImpossibleTravel(
        { employeeId: 'e1', branchId: 'b1', capturedAt: new Date(Date.now() - 6 * 60_000) },
        { employeeId: 'e1', branchId: 'b2', capturedAt: new Date() }
      )
    ).toBe(false);
  });

  test('resolveTrustTier — fingerprint+face corroborated = tier 1', () => {
    expect(
      reg.resolveTrustTier({ source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL, corroborated: true })
    ).toBe(reg.TRUST_TIER.TIER_1);
  });

  test('resolveTrustTier — face-terminal alone = tier 2', () => {
    expect(reg.resolveTrustTier({ source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL })).toBe(
      reg.TRUST_TIER.TIER_2
    );
  });

  test('resolveTrustTier — camera passive = tier 3', () => {
    expect(reg.resolveTrustTier({ source: reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE })).toBe(
      reg.TRUST_TIER.TIER_3
    );
  });

  test('slaForQueue picks correct windows', () => {
    expect(reg.slaForQueue(reg.REVIEW_QUEUE.SECURITY)).toBe(reg.REVIEW_SLA_MS.SECURITY_OPEN_MAX);
    expect(reg.slaForQueue(reg.REVIEW_QUEUE.HR)).toBe(reg.REVIEW_SLA_MS.HR_OPEN_MAX);
    expect(reg.slaForQueue(reg.REVIEW_QUEUE.SUPERVISOR)).toBe(
      reg.REVIEW_SLA_MS.SUPERVISOR_OPEN_MAX
    );
  });
});

// ─── 2. Confidence gate service overlays ────────────────────────

describe('hikvision-confidence-gate.service', () => {
  const gate = createHikvisionConfidenceGateService();

  test('evaluate — duplicate suppression returns SUPPRESSED + linked id', () => {
    const r = gate.evaluate({
      confidence: 95,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      priorAcceptedSameZone: { _id: 'prev-123' },
      employeeId: 'e1',
      branchId: 'b1',
      capturedAt: new Date(),
    });
    expect(r.decision).toBe(reg.GATE_DECISION.SUPPRESSED);
    expect(r.linkedSuppressedFromEventId).toBe('prev-123');
    expect(r.flags).toContain('duplicate-suppressed');
  });

  test('evaluate — impossible travel overrides high confidence', () => {
    const prior = {
      employeeId: 'e1',
      branchId: 'br-A',
      capturedAt: new Date(Date.now() - 60_000),
    };
    const r = gate.evaluate({
      confidence: 95,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      priorAcceptedDifferentBranch: prior,
      employeeId: 'e1',
      branchId: 'br-B',
      capturedAt: new Date(),
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.reason).toBe(reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL);
    expect(r.queue).toBe(reg.REVIEW_QUEUE.SECURITY);
  });

  test('evaluate — repeat mismatch (≥3) escalates to security review', () => {
    const r = gate.evaluate({
      confidence: 95,
      antiSpoofResult: reg.ANTI_SPOOF.PASS,
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      repeatMismatchCount: 3,
      employeeId: 'e1',
      branchId: 'b1',
      capturedAt: new Date(),
    });
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.reason).toBe(reg.REVIEW_REASON.REPEAT_MISMATCH);
    expect(r.queue).toBe(reg.REVIEW_QUEUE.SECURITY);
  });

  test('resolveSourceFromDevice picks face-terminal for terminal kind', () => {
    expect(gate.resolveSourceFromDevice({ kind: reg.DEVICE_KIND.TERMINAL })).toBe(
      reg.ATTENDANCE_SOURCE.FACE_TERMINAL
    );
  });

  test('resolveSourceFromDevice picks camera-passive for camera kind', () => {
    expect(gate.resolveSourceFromDevice({ kind: reg.DEVICE_KIND.CAMERA })).toBe(
      reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE
    );
  });
});

// ─── 3-4. Attendance source service ─────────────────────────────

describe('attendance-source.service — review queue', () => {
  function setup() {
    const sourceEventModel = buildSourceEventModel();
    const reviewModel = buildReviewModel();
    const processedEventModel = buildProcessedEventModel();
    const svc = createAttendanceSourceService({
      sourceEventModel,
      reviewModel,
      processedEventModel,
      logger: SILENT_LOGGER,
    });
    return { svc, sourceEventModel, reviewModel, processedEventModel };
  }

  test('createSourceEvent — happy path with sourceRefId', async () => {
    const { svc } = setup();
    const r = await svc.createSourceEvent({
      employeeId: 'e1',
      branchId: 'b1',
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      sourceRefId: 'pe-1',
      trustTier: reg.TRUST_TIER.TIER_2,
      confidence: 87,
    });
    expect(r.ok).toBe(true);
    expect(r.sourceEvent.accepted).toBe(true);
  });

  test('createSourceEvent — missing sourceRefId on accepted → VALIDATION_FAILED', async () => {
    const { svc } = setup();
    const r = await svc.createSourceEvent({
      employeeId: 'e1',
      branchId: 'b1',
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      trustTier: reg.TRUST_TIER.TIER_2,
      accepted: true,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('createReview — happy path opens OPEN row with slaDeadline', async () => {
    const { svc, reviewModel } = setup();
    const r = await svc.createReview({
      processedEventId: 'pe-1',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.SUPERVISOR,
      confidence: 70,
    });
    expect(r.ok).toBe(true);
    expect(r.review.state).toBe(reg.REVIEW_STATE.OPEN);
    expect(r.review.slaDeadline).toBeTruthy();
    expect(reviewModel._store.length).toBe(1);
  });

  test('approveReview — promotes to source event, links both ways', async () => {
    const { svc, processedEventModel } = setup();
    // Seed a processed event the review will reference
    processedEventModel._store.push({
      _id: 'pe-A',
      decision: reg.GATE_DECISION.REVIEW,
      reviewReason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      reviewQueue: reg.REVIEW_QUEUE.SUPERVISOR,
      branchId: 'b1',
      capturedAt: new Date(),
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      trustTier: reg.TRUST_TIER.TIER_2,
      confidence: 72,
      zoneId: 'z1',
    });

    const rev = await svc.createReview({
      processedEventId: 'pe-A',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.SUPERVISOR,
      confidence: 72,
    });

    const r = await svc.approveReview(rev.review._id, {
      actor: { userId: 'sup-1', role: 'branch_manager' },
      note: 'verified via in-person check',
    });
    expect(r.ok).toBe(true);
    expect(r.review.state).toBe(reg.REVIEW_STATE.APPROVED);
    expect(r.sourceEvent).toBeTruthy();
    expect(r.review.resultingAttendanceEventId).toBe(r.sourceEvent._id);
  });

  test('approveReview — missing actor → VALIDATION_FAILED', async () => {
    const { svc } = setup();
    const rev = await svc.createReview({
      processedEventId: 'pe-B',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.SUPERVISOR,
    });
    const r = await svc.approveReview(rev.review._id, { actor: null });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('rejectReview — requires note', async () => {
    const { svc } = setup();
    const rev = await svc.createReview({
      processedEventId: 'pe-C',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.SUPERVISOR,
    });
    const noNote = await svc.rejectReview(rev.review._id, {
      actor: { userId: 'u1' },
    });
    expect(noNote.ok).toBe(false);
    expect(noNote.reason).toBe(reg.REASON.REVIEW_RESOLUTION_REASON_REQUIRED);

    const ok = await svc.rejectReview(rev.review._id, {
      actor: { userId: 'u1' },
      note: 'wrong person — manual review failed',
    });
    expect(ok.ok).toBe(true);
    expect(ok.review.state).toBe(reg.REVIEW_STATE.REJECTED);
  });

  test('escalateReview — supervisor → hr; hr → security', async () => {
    const { svc } = setup();
    const a = await svc.createReview({
      processedEventId: 'pe-D',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.SUPERVISOR,
    });
    const r = await svc.escalateReview(a.review._id, {
      actor: { userId: 'sup-1' },
      note: 'beyond supervisor authority',
    });
    expect(r.ok).toBe(true);
    expect(r.review.state).toBe(reg.REVIEW_STATE.ESCALATED);
    expect(r.review.escalatedToQueue).toBe(reg.REVIEW_QUEUE.HR);

    const b = await svc.createReview({
      processedEventId: 'pe-E',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.HR,
    });
    const r2 = await svc.escalateReview(b.review._id, {
      actor: { userId: 'hr-1' },
      note: 'fraud suspicion',
    });
    expect(r2.review.escalatedToQueue).toBe(reg.REVIEW_QUEUE.SECURITY);
  });

  test('sweepExpiredReviews flips OPEN past slaDeadline → EXPIRED', async () => {
    const { svc, reviewModel } = setup();
    const r = await svc.createReview({
      processedEventId: 'pe-F',
      employeeId: 'e1',
      branchId: 'b1',
      reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
      queue: reg.REVIEW_QUEUE.SUPERVISOR,
    });
    // Force slaDeadline into the past
    const stored = reviewModel._store.find(r2 => String(r2._id) === String(r.review._id));
    stored.slaDeadline = new Date(Date.now() - 60_000);

    const res = await svc.sweepExpiredReviews();
    expect(res.ok).toBe(true);
    expect(res.expired).toBe(1);
    const after = reviewModel._store.find(r2 => String(r2._id) === String(r.review._id));
    expect(after.state).toBe(reg.REVIEW_STATE.EXPIRED);
  });
});

// ─── 5-7. Parser end-to-end ─────────────────────────────────────

describe('hikvision-event-parser.service — end-to-end', () => {
  function setup() {
    const rawEventModel = buildRawEventModel();
    const processedEventModel = buildProcessedEventModel();
    const sourceEventModel = buildSourceEventModel();
    const reviewModel = buildReviewModel();
    const deviceModel = buildDeviceModel();
    const channelModel = buildChannelModel();
    const templateModel = buildTemplateModel();

    const gate = createHikvisionConfidenceGateService();
    const source = createAttendanceSourceService({
      sourceEventModel,
      reviewModel,
      processedEventModel,
      logger: SILENT_LOGGER,
    });
    const parser = createHikvisionEventParserService({
      rawEventModel,
      processedEventModel,
      deviceModel,
      channelModel,
      templateModel,
      gateService: gate,
      attendanceSourceService: source,
      logger: SILENT_LOGGER,
    });
    return {
      parser,
      models: {
        rawEventModel,
        processedEventModel,
        sourceEventModel,
        reviewModel,
        deviceModel,
        channelModel,
        templateModel,
      },
    };
  }

  function seedActiveDevice(models, opts = {}) {
    const dev = {
      _id: opts.deviceId || 'dev-1',
      kind: opts.kind || reg.DEVICE_KIND.TERMINAL,
      branchId: opts.branchId || 'br-1',
      capabilities: opts.capabilities || [reg.CAPABILITY.FACE],
      retiredAt: null,
      zoneId: opts.zoneId || 'gate-1',
      status: reg.DEVICE_STATUS.ONLINE,
    };
    models.deviceModel._store.push(dev);
    return dev;
  }

  function seedActiveTemplate(models, opts = {}) {
    const t = {
      _id: opts.templateId || 'tmp-1',
      libraryId: opts.libraryId || 'lib-1',
      employeeId: opts.employeeId || 'emp-1',
      hikvisionPersonId: opts.personId || 'hp-1',
      status: reg.TEMPLATE_STATUS.ACTIVE,
      templateChecksum: 'sum',
      enrollmentImages: [{ angle: 'front', quality: 90, ref: 'r' }],
    };
    models.templateModel._store.push(t);
    return t;
  }

  function seedRawEvent(models, opts = {}) {
    const r = {
      _id: opts.id || 'raw-1',
      deviceId: opts.deviceId || 'dev-1',
      channelId: opts.channelId || null,
      externalEventId: opts.externalEventId || 'ext-1',
      eventKind: opts.eventKind || reg.RAW_EVENT_KIND.FACE_MATCH,
      capturedAt: opts.capturedAt || new Date(),
      receivedAt: opts.receivedAt || new Date(),
      parseStatus: reg.PARSE_STATUS.PENDING,
      parseAttempts: 0,
      rawPayload: opts.rawPayload || {
        hikvisionPersonId: 'hp-1',
        similarity: 92,
        antiSpoof: 'pass',
      },
    };
    models.rawEventModel._store.push(r);
    return r;
  }

  test('processRawEvent — face-terminal high confidence → AUTO_ACCEPT + source event', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    seedActiveTemplate(models);
    const raw = seedRawEvent(models);

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.decision).toBe(reg.GATE_DECISION.AUTO_ACCEPT);
    expect(r.sourceEvent).toBeTruthy();
    expect(r.sourceEvent.employeeId).toBe('emp-1');
    expect(r.processed.decision).toBe(reg.GATE_DECISION.AUTO_ACCEPT);

    const after = models.rawEventModel._store.find(x => x._id === raw._id);
    expect(after.parseStatus).toBe(reg.PARSE_STATUS.PARSED);
  });

  test('processRawEvent — medium confidence → REVIEW row in supervisor queue', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    seedActiveTemplate(models);
    const raw = seedRawEvent(models, {
      rawPayload: { hikvisionPersonId: 'hp-1', similarity: 72, antiSpoof: 'pass' },
    });

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.review).toBeTruthy();
    expect(r.review.queue).toBe(reg.REVIEW_QUEUE.SUPERVISOR);
    expect(r.processed.reviewReason).toBe(reg.REVIEW_REASON.LOW_CONFIDENCE);
  });

  test('processRawEvent — low confidence → REJECT, no review row', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    seedActiveTemplate(models);
    const raw = seedRawEvent(models, {
      rawPayload: { hikvisionPersonId: 'hp-1', similarity: 40, antiSpoof: 'pass' },
    });

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.decision).toBe(reg.GATE_DECISION.REJECT);
    expect(r.review).toBeNull();
    expect(r.sourceEvent).toBeNull();
  });

  test('processRawEvent — anti-spoof FAIL → REJECT regardless of confidence', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    seedActiveTemplate(models);
    const raw = seedRawEvent(models, {
      rawPayload: { hikvisionPersonId: 'hp-1', similarity: 99, antiSpoof: 'fail' },
    });

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.decision).toBe(reg.GATE_DECISION.REJECT);
    expect(r.processed.reviewReason).toBe(reg.REVIEW_REASON.ANTI_SPOOF_FAILED);
    expect(r.processed.antiSpoofResult).toBe(reg.ANTI_SPOOF.FAIL);
  });

  test('processRawEvent — unregistered face → REVIEW (security queue) with no employee', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    // Note: no template seeded
    const raw = seedRawEvent(models, {
      eventKind: reg.RAW_EVENT_KIND.UNREGISTERED_FACE,
      rawPayload: { similarity: 80, antiSpoof: 'pass' },
    });

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.processed.reviewReason).toBe(reg.REVIEW_REASON.UNREGISTERED);
    expect(r.processed.matchedEmployeeId).toBeNull();
  });

  test('processRawEvent — template suspended → REVIEW (template-inactive)', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    // Seed a SUSPENDED template
    models.templateModel._store.push({
      _id: 'tmp-S',
      hikvisionPersonId: 'hp-2',
      employeeId: 'emp-2',
      status: reg.TEMPLATE_STATUS.SUSPENDED,
    });
    const raw = seedRawEvent(models, {
      rawPayload: { hikvisionPersonId: 'hp-2', similarity: 95, antiSpoof: 'pass' },
    });

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.decision).toBe(reg.GATE_DECISION.REVIEW);
    expect(r.processed.reviewReason).toBe(reg.REVIEW_REASON.TEMPLATE_INACTIVE);
  });

  test('processRawEvent — non-attendance event (heartbeat) → SKIPPED, no processed row', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    const raw = seedRawEvent(models, {
      eventKind: reg.RAW_EVENT_KIND.DEVICE_HEARTBEAT,
      rawPayload: {},
    });

    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
    expect(models.processedEventModel._store.length).toBe(0);

    const after = models.rawEventModel._store.find(x => x._id === raw._id);
    expect(after.parseStatus).toBe(reg.PARSE_STATUS.SKIPPED);
  });

  test('processRawEvent — already-parsed → RAW_EVENT_NOT_PENDING', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    seedActiveTemplate(models);
    const raw = seedRawEvent(models);
    await parser.processRawEvent(raw._id);
    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.RAW_EVENT_NOT_PENDING);
  });

  test('processBatch drains pending and returns per-event results', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    // Three DIFFERENT employees so duplicate-suppression doesn't kick in
    seedActiveTemplate(models, { templateId: 't-A', personId: 'hp-A', employeeId: 'emp-A' });
    seedActiveTemplate(models, { templateId: 't-B', personId: 'hp-B', employeeId: 'emp-B' });
    seedActiveTemplate(models, { templateId: 't-C', personId: 'hp-C', employeeId: 'emp-C' });

    seedRawEvent(models, {
      id: 'r1',
      externalEventId: 'x1',
      rawPayload: { hikvisionPersonId: 'hp-A', similarity: 92, antiSpoof: 'pass' },
    });
    seedRawEvent(models, {
      id: 'r2',
      externalEventId: 'x2',
      rawPayload: { hikvisionPersonId: 'hp-B', similarity: 65, antiSpoof: 'pass' },
    });
    seedRawEvent(models, {
      id: 'r3',
      externalEventId: 'x3',
      rawPayload: { hikvisionPersonId: 'hp-C', similarity: 30, antiSpoof: 'pass' },
    });

    const r = await parser.processBatch({ limit: 10 });
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(3);
    expect(r.results.map(x => x.decision)).toEqual([
      reg.GATE_DECISION.AUTO_ACCEPT,
      reg.GATE_DECISION.REVIEW,
      reg.GATE_DECISION.REJECT,
    ]);
  });

  test('duplicate suppression — second event same employee+zone within 60s → SUPPRESSED', async () => {
    const { parser, models } = setup();
    seedActiveDevice(models);
    seedActiveTemplate(models);
    seedRawEvent(models, { id: 'rA', externalEventId: 'xA' });
    seedRawEvent(models, {
      id: 'rB',
      externalEventId: 'xB',
      capturedAt: new Date(Date.now() + 5_000), // 5s later
    });

    const a = await parser.processRawEvent('rA');
    expect(a.decision).toBe(reg.GATE_DECISION.AUTO_ACCEPT);

    const b = await parser.processRawEvent('rB');
    expect(b.decision).toBe(reg.GATE_DECISION.SUPPRESSED);
    expect(b.processed.linkedSuppressedFromEventId).toBeTruthy();
    expect(b.sourceEvent).toBeNull();
  });

  test('processRawEvent — unknown device → mark FAILED, processed row not created', async () => {
    const { parser, models } = setup();
    const raw = seedRawEvent(models, { deviceId: 'missing-device' });
    const r = await parser.processRawEvent(raw._id);
    expect(r.ok).toBe(false);
    const after = models.rawEventModel._store.find(x => x._id === raw._id);
    expect(after.parseStatus).toBe(reg.PARSE_STATUS.FAILED);
    expect(models.processedEventModel._store.length).toBe(0);
  });
});
