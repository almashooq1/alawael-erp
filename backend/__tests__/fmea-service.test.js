'use strict';

/**
 * fmea-service.test.js — World-Class QMS Phase 29 Commit 1.
 *
 * Unit tests for the FMEA / HFMEA service. Exercises:
 *   • registry math (action priority + hazard score + decision tree)
 *   • lifecycle state machine
 *   • row authoring + derived ratings
 *   • action lifecycle inside a row
 *   • re-rating (Step 8) + verification
 *   • event dispatch
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');

const { createFmeaService } = require('../services/quality/fmea.service');
const registry = require('../config/fmea.registry');

let ownServer = null;
let FmeaWorksheet;

const facilitator = new mongoose.Types.ObjectId();
const owner = new mongoose.Types.ObjectId();
const branchId = new mongoose.Types.ObjectId();

function fullTeam() {
  return registry.HFMEA_REQUIRED_ROLES.map((role, i) => ({
    userId: new mongoose.Types.ObjectId(),
    nameSnapshot: `Member ${i}`,
    role,
    present: true,
  }));
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

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
  await mongoose.connect(uri, {
    dbName: 'fmea-test',
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  FmeaWorksheet = require('../models/quality/FmeaWorksheet.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await FmeaWorksheet.deleteMany({});
});

// ── registry math ─────────────────────────────────────────────────

describe('fmea.registry math', () => {
  test('aiagActionPriority — severity 10 always returns high', () => {
    expect(registry.aiagActionPriority({ severity: 10, occurrence: 1, detection: 1 })).toBe('high');
    expect(registry.aiagActionPriority({ severity: 9, occurrence: 1, detection: 1 })).toBe('high');
  });

  test('aiagActionPriority — moderate severity downgrades when O+D are low', () => {
    expect(registry.aiagActionPriority({ severity: 5, occurrence: 1, detection: 1 })).toBe('low');
    expect(registry.aiagActionPriority({ severity: 5, occurrence: 6, detection: 4 })).toBe(
      'medium'
    );
    expect(registry.aiagActionPriority({ severity: 5, occurrence: 7, detection: 7 })).toBe('high');
  });

  test('hfmeaHazardScore = severity × probability', () => {
    expect(registry.hfmeaHazardScore({ severity: 4, probability: 3 })).toBe(12);
    expect(registry.hfmeaIsActionable(12)).toBe(true);
    expect(registry.hfmeaIsActionable(6)).toBe(false);
  });

  test('hfmeaProceedToAction decision-tree', () => {
    // No single-point weakness → stop.
    expect(
      registry.hfmeaProceedToAction({
        singlePointWeakness: false,
        existingControl: true,
        detectability: true,
      })
    ).toBe(false);
    // Single-point + no control → proceed.
    expect(
      registry.hfmeaProceedToAction({
        singlePointWeakness: true,
        existingControl: false,
        detectability: true,
      })
    ).toBe(true);
    // Single-point + control + not detectable → proceed.
    expect(
      registry.hfmeaProceedToAction({
        singlePointWeakness: true,
        existingControl: true,
        detectability: false,
      })
    ).toBe(true);
    // Single-point + control + detectable → stop.
    expect(
      registry.hfmeaProceedToAction({
        singlePointWeakness: true,
        existingControl: true,
        detectability: true,
      })
    ).toBe(false);
  });

  test('validateRating rejects out-of-range values', () => {
    expect(
      registry.validateRating({ scale: 'aiag_10', severity: 0, occurrence: 5, detection: 5 }).ok
    ).toBe(false);
    expect(
      registry.validateRating({ scale: 'aiag_10', severity: 5, occurrence: 5, detection: 5 }).ok
    ).toBe(true);
    expect(registry.validateRating({ scale: 'hfmea_5', severity: 5, probability: 4 }).ok).toBe(
      true
    );
    expect(registry.validateRating({ scale: 'hfmea_5', severity: 6, probability: 4 }).ok).toBe(
      false
    );
    expect(registry.validateRating({ scale: 'hfmea_5', severity: 5, probability: 5 }).ok).toBe(
      false
    );
  });

  test('validateTeamComposition requires all roles + quorum', () => {
    const r1 = registry.validateTeamComposition([]);
    expect(r1.ok).toBe(false);
    const r2 = registry.validateTeamComposition([
      { role: 'quality_manager', present: true },
      { role: 'medical_director', present: true },
      { role: 'nursing_supervisor', present: true },
      { role: 'subject_matter_expert', present: true },
      { role: 'frontline_practitioner', present: true },
      { role: 'patient_safety_officer', present: true },
    ]);
    expect(r2.ok).toBe(true);
    const r3 = registry.validateTeamComposition([
      { role: 'quality_manager', present: true },
      { role: 'medical_director', present: true },
      { role: 'subject_matter_expert', present: true },
      { role: 'frontline_practitioner', present: true },
    ]);
    expect(r3.ok).toBe(false); // missing nursing_supervisor + patient_safety_officer
  });
});

// ── lifecycle ──────────────────────────────────────────────────────

describe('FmeaService.createWorksheet', () => {
  test('creates worksheet in draft state with auto-numbered ID', async () => {
    const dispatcher = makeDispatcher();
    const svc = createFmeaService({ model: FmeaWorksheet, dispatcher });

    const ws = await svc.createWorksheet(
      {
        type: 'hfmea',
        scale: 'hfmea_5',
        title: 'Medication-administration HFMEA',
        scope: 'In-patient medication round on Ward A',
        branchId,
        team: fullTeam(),
      },
      facilitator
    );

    expect(ws.status).toBe('draft');
    expect(ws.fmeaNumber).toMatch(/^FMEA-\d{4}-\d{4,6}$/);
    expect(ws.team.length).toBeGreaterThanOrEqual(registry.HFMEA_QUORUM_MIN);
    expect(dispatcher.events.find(e => e.name === 'quality.fmea.created')).toBeTruthy();
  });

  test('rejects worksheet missing required fields', async () => {
    const svc = createFmeaService({ model: FmeaWorksheet });
    await expect(svc.createWorksheet({}, facilitator)).rejects.toThrow();
    await expect(
      svc.createWorksheet({ type: 'hfmea', scale: 'hfmea_5' }, facilitator)
    ).rejects.toThrow();
  });
});

describe('FmeaService.addRow', () => {
  test('computes hazard score + action priority for HFMEA row', async () => {
    const dispatcher = makeDispatcher();
    const svc = createFmeaService({ model: FmeaWorksheet, dispatcher });
    const ws = await svc.createWorksheet(
      {
        type: 'hfmea',
        scale: 'hfmea_5',
        title: 'X',
        scope: 'Y',
        team: fullTeam(),
      },
      facilitator
    );

    const updated = await svc.addRow(
      ws._id,
      {
        functionAr: 'تحقق هوية المستفيد',
        failureMode: 'تخطي خطوة التحقق',
        failureEffect: 'إعطاء الدواء لمستفيد خاطئ',
        severity: 4, // catastrophic
        probability: 3, // occasional
      },
      facilitator
    );

    expect(updated.rows).toHaveLength(1);
    expect(updated.rows[0].hazardScore).toBe(12); // 4 × 3
    expect(updated.rows[0].actionPriority).toBe('high'); // ≥8 → actionable
    expect(
      dispatcher.events.find(e => e.name === 'quality.fmea.high_priority_detected')
    ).toBeTruthy();
  });

  test('computes RPN + AIAG action priority for PFMEA row', async () => {
    const svc = createFmeaService({ model: FmeaWorksheet });
    const ws = await svc.createWorksheet(
      {
        type: 'pfmea',
        scale: 'aiag_10',
        title: 'Process FMEA',
        scope: 'Lab specimen handling',
        team: fullTeam(),
      },
      facilitator
    );

    const u = await svc.addRow(
      ws._id,
      {
        functionAr: 'تسمية العينة',
        failureMode: 'تسمية خاطئة',
        failureEffect: 'تشخيص خاطئ',
        severity: 9,
        occurrence: 3,
        detection: 5,
      },
      facilitator
    );

    expect(u.rows[0].rpn).toBe(9 * 3 * 5);
    expect(u.rows[0].actionPriority).toBe('high'); // S=9 → forced high
  });

  test('rejects rows with invalid ratings', async () => {
    const svc = createFmeaService({ model: FmeaWorksheet });
    const ws = await svc.createWorksheet(
      {
        type: 'hfmea',
        scale: 'hfmea_5',
        title: 'X',
        scope: 'Y',
        team: fullTeam(),
      },
      facilitator
    );
    await expect(
      svc.addRow(
        ws._id,
        { functionAr: 'f', failureMode: 'm', failureEffect: 'e', severity: 99 },
        facilitator
      )
    ).rejects.toThrow();
  });
});

describe('FmeaService — full lifecycle', () => {
  test('draft → in_review → team_signed → actions_open → completed → verified', async () => {
    const dispatcher = makeDispatcher();
    const svc = createFmeaService({ model: FmeaWorksheet, dispatcher });

    const team = fullTeam();
    const ws = await svc.createWorksheet(
      {
        type: 'hfmea',
        scale: 'hfmea_5',
        title: 'Falls-prevention HFMEA',
        scope: 'Therapy gym',
        team,
      },
      facilitator
    );

    await svc.addRow(
      ws._id,
      {
        functionAr: 'تأمين أرضية الجلسة',
        failureMode: 'انزلاق المعالج',
        failureEffect: 'سقوط مستفيد',
        severity: 4,
        probability: 3,
      },
      facilitator
    );

    // submit
    let cur = await svc.submit(ws._id, facilitator);
    expect(cur.status).toBe('in_review');

    // each team member signs
    for (const member of team) {
      cur = await svc.teamSign(ws._id, { signatureHash: 'sha256:abc' }, member.userId);
    }
    expect(cur.status).toBe('team_signed');

    // add action → moves to actions_open
    cur = await svc.addAction(
      ws._id,
      cur.rows[0]._id,
      {
        type: 'control',
        description: 'وضع سجاد مضاد للانزلاق',
        ownerUserId: owner,
      },
      facilitator
    );
    expect(cur.status).toBe('actions_open');

    const actionId = cur.rows[0].actions[0]._id;
    cur = await svc.updateActionStatus(
      ws._id,
      cur.rows[0]._id,
      actionId,
      { status: 'completed', completionNotes: 'تم التركيب' },
      facilitator
    );
    expect(cur.status).toBe('actions_completed');

    // re-rate row
    cur = await svc.rerateRow(
      ws._id,
      cur.rows[0]._id,
      { severity: 4, probability: 1 },
      facilitator
    );
    expect(cur.rows[0].revisedHazardScore).toBe(4);

    cur = await svc.verify(ws._id, facilitator);
    expect(cur.status).toBe('verified');
    expect(dispatcher.events.find(e => e.name === 'quality.fmea.verified')).toBeTruthy();
  });

  test('cannot verify if actionable rows are missing re-rating', async () => {
    const svc = createFmeaService({ model: FmeaWorksheet });
    const team = fullTeam();
    const ws = await svc.createWorksheet(
      { type: 'hfmea', scale: 'hfmea_5', title: 'X', scope: 'Y', team },
      facilitator
    );
    await svc.addRow(
      ws._id,
      {
        functionAr: 'a',
        failureMode: 'b',
        failureEffect: 'c',
        severity: 4,
        probability: 3,
      },
      facilitator
    );
    await svc.submit(ws._id, facilitator);
    for (const member of team) {
      await svc.teamSign(ws._id, {}, member.userId);
    }
    const cur = await svc.addAction(
      ws._id,
      (await svc.findById(ws._id)).rows[0]._id,
      { type: 'eliminate', description: 'remove cause', ownerUserId: owner },
      facilitator
    );
    await svc.updateActionStatus(
      ws._id,
      cur.rows[0]._id,
      cur.rows[0].actions[0]._id,
      { status: 'completed' },
      facilitator
    );

    await expect(svc.verify(ws._id, facilitator)).rejects.toMatchObject({
      code: 'INCOMPLETE',
    });
  });

  test('cancel writes reason + locks further edits', async () => {
    const svc = createFmeaService({ model: FmeaWorksheet });
    const ws = await svc.createWorksheet(
      {
        type: 'hfmea',
        scale: 'hfmea_5',
        title: 'X',
        scope: 'Y',
        team: fullTeam(),
      },
      facilitator
    );
    const cancelled = await svc.cancel(ws._id, 'duplicate of FMEA-2026-0001', facilitator);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledReason).toContain('duplicate');
    await expect(
      svc.addRow(
        ws._id,
        { functionAr: 'a', failureMode: 'b', failureEffect: 'c', severity: 2, probability: 2 },
        facilitator
      )
    ).rejects.toMatchObject({ code: 'INVALID_PHASE' });
  });
});

describe('FmeaService.getDashboard', () => {
  test('aggregates totals by status and type', async () => {
    const svc = createFmeaService({ model: FmeaWorksheet });
    await svc.createWorksheet(
      { type: 'hfmea', scale: 'hfmea_5', title: 'A', scope: 's', team: fullTeam() },
      facilitator
    );
    await svc.createWorksheet(
      { type: 'pfmea', scale: 'aiag_10', title: 'B', scope: 's', team: fullTeam() },
      facilitator
    );
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.byStatus.draft).toBe(2);
    expect(dash.byType.hfmea).toBe(1);
    expect(dash.byType.pfmea).toBe(1);
  });
});
