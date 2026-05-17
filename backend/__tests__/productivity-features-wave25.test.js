/**
 * productivity-features-wave25.test.js — Wave 25.
 *
 *   1. Catalog registry shape (14 features, required fields)
 *   2. Service CRUD: annotations, handoff notes, follow-ups,
 *      watchlists, user preferences (in-memory store)
 *   3. End-of-Day generator: emits when work remains, silent on
 *      empty day, payload survives Insight schema G-validators
 *   4. Executive-Digest generator: emits one weekly insight,
 *      severity scales with worsened KPIs
 *   5. Routes: catalog + 16 CRUD endpoints + error contract
 */

'use strict';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const featureRegistry = require('../intelligence/productivity-features.registry');
const {
  createProductivityFeaturesService,
} = require('../intelligence/productivity-features.service');
const { createProductivityFeaturesRouter } = require('../routes/productivity-features.routes');
const eodGen = require('../intelligence/generators/end-of-day.generator');
const digestGen = require('../intelligence/generators/executive-digest.generator');

const insightModelExports = require('../intelligence/insight.model');
const Insight =
  mongoose.models.Insight || mongoose.model('Insight', insightModelExports.InsightSchema);

// ─── 1. Catalog registry ───────────────────────────────────────

describe('productivity-features.registry — catalog', () => {
  const keys = featureRegistry.listFeatureKeys();

  test('lists ≥ 14 features', () => {
    expect(keys.length).toBeGreaterThanOrEqual(14);
  });

  test.each(keys)('%s — has required fields', k => {
    const f = featureRegistry.getFeature(k);
    expect(f.titleAr).toBeTruthy();
    expect(f.titleEn).toBeTruthy();
    expect(f.valueAr || f.titleAr).toBeTruthy();
    expect(typeof f.category).toBe('string');
    expect(typeof f.placement).toBe('string');
    expect(featureRegistry.TRIGGER_TYPES).toContain(f.triggerType);
    expect(featureRegistry.STATUSES).toContain(f.status);
    expect(f.roleGroups === 'all' || Array.isArray(f.roleGroups)).toBe(true);
  });

  test('listForRoleGroup respects "all" and explicit role lists', () => {
    const execFeatures = featureRegistry.listForRoleGroup('executive_leadership');
    expect(execFeatures).toContain('morning-briefing');
    expect(execFeatures).toContain('weekly-executive-digest');
    expect(execFeatures).toContain('quick-action-center'); // "all"
    // Therapist doesn't get the executive digest
    const therapistFeatures = featureRegistry.listForRoleGroup('therapist');
    expect(therapistFeatures).not.toContain('weekly-executive-digest');
  });
});

// ─── 2. Service — annotations ──────────────────────────────────

describe('productivity-features.service — annotations', () => {
  const svc = createProductivityFeaturesService();

  test('createAnnotation requires kpiId + text + actor', async () => {
    expect((await svc.createAnnotation({})).reason).toBe('KPI_ID_REQUIRED');
    expect((await svc.createAnnotation({ kpiId: 'k1' })).reason).toBe('TEXT_REQUIRED');
    expect((await svc.createAnnotation({ kpiId: 'k1', textAr: 'x' })).reason).toBe(
      'ACTOR_REQUIRED'
    );
  });

  test('createAnnotation succeeds + list returns it', async () => {
    const r = await svc.createAnnotation({
      kpiId: 'kpi.beneficiary.active_count',
      branchId: 'B-1',
      textAr: 'تحقق من الحضور صباحاً',
      actor: { userId: 'u1', role: 'manager' },
    });
    expect(r.ok).toBe(true);
    const list = await svc.listAnnotations({
      kpiId: 'kpi.beneficiary.active_count',
      branchId: 'B-1',
    });
    expect(list).toHaveLength(1);
    expect(list[0].textAr).toBe('تحقق من الحضور صباحاً');
  });

  test('resolveAnnotation marks resolvedAt', async () => {
    const created = await svc.createAnnotation({
      kpiId: 'k1',
      textEn: 'note',
      actor: { userId: 'u1' },
    });
    const r = await svc.resolveAnnotation({
      annotationId: created.annotation._id,
      actor: { userId: 'u1' },
    });
    expect(r.ok).toBe(true);
    expect(r.annotation.resolvedAt).toBeInstanceOf(Date);
  });

  test('text > 2000 chars rejected', async () => {
    const r = await svc.createAnnotation({
      kpiId: 'k1',
      textAr: 'x'.repeat(2001),
      actor: { userId: 'u1' },
    });
    expect(r.reason).toBe('TEXT_TOO_LONG');
  });
});

// ─── 2. Service — handoff notes ────────────────────────────────

describe('productivity-features.service — handoffs', () => {
  const svc = createProductivityFeaturesService();

  test('requires subject + recipient + text', async () => {
    expect((await svc.createHandoff({})).reason).toBe('SUBJECT_REQUIRED');
    expect((await svc.createHandoff({ subjectType: 'Beneficiary', subjectId: 'b1' })).reason).toBe(
      'RECIPIENT_REQUIRED'
    );
    expect(
      (
        await svc.createHandoff({
          subjectType: 'Beneficiary',
          subjectId: 'b1',
          toRoleGroup: 'therapist',
        })
      ).reason
    ).toBe('ACTOR_REQUIRED');
  });

  test('lists for role group recipient', async () => {
    await svc.createHandoff({
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      branchId: 'B-1',
      toRoleGroup: 'therapist',
      textAr: 'انتبه للحالة',
      actor: { userId: 'u-shifter' },
    });
    const list = await svc.listHandoffsForUser({
      userId: 'u-receiver',
      roleGroup: 'therapist',
      branchId: 'B-1',
    });
    expect(list).toHaveLength(1);
  });

  test('lists for direct user recipient', async () => {
    await svc.createHandoff({
      subjectType: 'Shift',
      subjectId: 's1',
      branchId: 'B-1',
      toUserId: 'u-direct',
      textEn: 'see me',
      actor: { userId: 'u-sender' },
    });
    const list = await svc.listHandoffsForUser({
      userId: 'u-direct',
      roleGroup: 'somebody-else',
    });
    expect(list.some(h => h.toUserId === 'u-direct')).toBe(true);
  });

  test('markHandoffRead is idempotent', async () => {
    const r = await svc.createHandoff({
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      branchId: 'B-1',
      toRoleGroup: 'therapist',
      textAr: 'x',
      actor: { userId: 'u1' },
    });
    await svc.markHandoffRead({ handoffId: r.handoff._id, actor: { userId: 'reader' } });
    await svc.markHandoffRead({ handoffId: r.handoff._id, actor: { userId: 'reader' } });
    expect(r.handoff.readBy.filter(u => u === 'reader')).toHaveLength(1);
  });

  test('acknowledgeHandoff sets acknowledgedAt + is idempotent', async () => {
    const r = await svc.createHandoff({
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      branchId: 'B-1',
      toRoleGroup: 'therapist',
      textAr: 'x',
      actor: { userId: 'u1' },
    });
    const a1 = await svc.acknowledgeHandoff({ handoffId: r.handoff._id, actor: { userId: 'u2' } });
    expect(a1.handoff.acknowledgedAt).toBeInstanceOf(Date);
    const a2 = await svc.acknowledgeHandoff({ handoffId: r.handoff._id, actor: { userId: 'u2' } });
    expect(a2.noop).toBe(true);
  });

  test('expired handoffs are hidden by default', async () => {
    const past = new Date(Date.now() - 60_000);
    await svc.createHandoff({
      subjectType: 'Shift',
      subjectId: 's1',
      branchId: 'B-1',
      toRoleGroup: 'reception',
      textAr: 'x',
      expiresAt: past,
      actor: { userId: 'u' },
    });
    const list = await svc.listHandoffsForUser({
      userId: 'u-x',
      roleGroup: 'reception',
      branchId: 'B-1',
    });
    expect(list).toHaveLength(0);
    const all = await svc.listHandoffsForUser({
      userId: 'u-x',
      roleGroup: 'reception',
      branchId: 'B-1',
      includeExpired: true,
    });
    expect(all).toHaveLength(1);
  });
});

// ─── 2. Service — follow-ups ───────────────────────────────────

describe('productivity-features.service — follow-ups', () => {
  const svc = createProductivityFeaturesService();

  test('createFollowUp requires owner + title', async () => {
    expect((await svc.createFollowUp({})).reason).toBe('OWNER_REQUIRED');
    expect((await svc.createFollowUp({ ownerUserId: 'u1' })).reason).toBe('TITLE_REQUIRED');
  });

  test('createFollowUp defaults dueBy to 24h ahead', async () => {
    const before = Date.now();
    const r = await svc.createFollowUp({
      ownerUserId: 'u1',
      titleEn: 'Follow up on Ahmed',
    });
    expect(r.ok).toBe(true);
    const delta = new Date(r.followUp.dueBy).getTime() - before;
    expect(delta).toBeGreaterThan(23 * 3600_000);
    expect(delta).toBeLessThan(25 * 3600_000);
  });

  test('listForUser sorts by dueBy ascending', async () => {
    const fresh = createProductivityFeaturesService();
    await fresh.createFollowUp({
      ownerUserId: 'u1',
      titleEn: 'Later',
      dueByHours: 48,
    });
    await fresh.createFollowUp({
      ownerUserId: 'u1',
      titleEn: 'Soon',
      dueByHours: 1,
    });
    const list = await fresh.listFollowUpsForUser({ ownerUserId: 'u1' });
    expect(list[0].titleEn).toBe('Soon');
    expect(list[1].titleEn).toBe('Later');
  });

  test('completeFollowUp + snoozeFollowUp work', async () => {
    const r = await svc.createFollowUp({ ownerUserId: 'u1', titleEn: 'A' });
    const c = await svc.completeFollowUp({
      followUpId: r.followUp._id,
      actor: { userId: 'u1' },
    });
    expect(c.followUp.status).toBe('done');
    // Idempotent
    const c2 = await svc.completeFollowUp({
      followUpId: r.followUp._id,
      actor: { userId: 'u1' },
    });
    expect(c2.noop).toBe(true);

    const r2 = await svc.createFollowUp({ ownerUserId: 'u1', titleEn: 'B', dueByHours: 1 });
    const orig = new Date(r2.followUp.dueBy).getTime();
    // Snooze means "remind me in N hours from NOW" (not "add N hours to existing dueBy").
    // Snoozing a 1h-due item by 6h pushes the dueBy 6h ahead.
    const s = await svc.snoozeFollowUp({
      followUpId: r2.followUp._id,
      hours: 6,
      actor: { userId: 'u1' },
    });
    expect(new Date(s.followUp.dueBy).getTime()).toBeGreaterThan(orig);
  });

  test('snoozeFollowUp validates hours range', async () => {
    const r = await svc.createFollowUp({ ownerUserId: 'u1', titleEn: 'A' });
    const bad = await svc.snoozeFollowUp({
      followUpId: r.followUp._id,
      hours: 200,
      actor: { userId: 'u1' },
    });
    expect(bad.reason).toBe('INVALID_SNOOZE_DURATION');
  });
});

// ─── 2. Service — watchlists ───────────────────────────────────

describe('productivity-features.service — watchlists', () => {
  const svc = createProductivityFeaturesService();

  test('createWatchlist requires owner + name + entityType', async () => {
    expect((await svc.createWatchlist({})).reason).toBe('OWNER_REQUIRED');
    expect((await svc.createWatchlist({ ownerUserId: 'u1' })).reason).toBe('NAME_REQUIRED');
    expect((await svc.createWatchlist({ ownerUserId: 'u1', nameAr: 'قائمة' })).reason).toBe(
      'ENTITY_TYPE_REQUIRED'
    );
  });

  test('add/remove deduplicates', async () => {
    const r = await svc.createWatchlist({
      ownerUserId: 'u1',
      nameEn: 'My VIP',
      entityType: 'Beneficiary',
      entityIds: ['b1'],
    });
    await svc.addToWatchlist({
      watchlistId: r.watchlist._id,
      entityId: 'b2',
      actor: { userId: 'u1' },
    });
    await svc.addToWatchlist({
      watchlistId: r.watchlist._id,
      entityId: 'b2',
      actor: { userId: 'u1' },
    });
    expect(r.watchlist.entityIds).toEqual(['b1', 'b2']);

    await svc.removeFromWatchlist({
      watchlistId: r.watchlist._id,
      entityId: 'b1',
      actor: { userId: 'u1' },
    });
    expect(r.watchlist.entityIds).toEqual(['b2']);
  });
});

// ─── 2. Service — user preferences ─────────────────────────────

describe('productivity-features.service — userPreferences', () => {
  const svc = createProductivityFeaturesService();

  test('getUserPreferences creates an empty profile on first call', async () => {
    const r = await svc.getUserPreferences({ userId: 'u1' });
    expect(r.ok).toBe(true);
    expect(r.preferences.pinnedWidgets).toEqual([]);
    expect(r.preferences.savedViews).toEqual([]);
  });

  test('pinWidget enforces MAX_PINNED_WIDGETS', async () => {
    const fresh = createProductivityFeaturesService();
    for (let i = 0; i < fresh.MAX_PINNED_WIDGETS; i++) {
      const r = await fresh.pinWidget({ userId: 'u1', dashboardKey: 'branch', elementId: `e${i}` });
      expect(r.ok).toBe(true);
    }
    const over = await fresh.pinWidget({
      userId: 'u1',
      dashboardKey: 'branch',
      elementId: 'overflow',
    });
    expect(over.reason).toBe('PIN_LIMIT_EXCEEDED');
  });

  test('pin duplicate is noop', async () => {
    const fresh = createProductivityFeaturesService();
    await fresh.pinWidget({ userId: 'u1', dashboardKey: 'branch', elementId: 'e1' });
    const dup = await fresh.pinWidget({ userId: 'u1', dashboardKey: 'branch', elementId: 'e1' });
    expect(dup.noop).toBe(true);
  });

  test('unpinWidget removes the entry', async () => {
    const fresh = createProductivityFeaturesService();
    await fresh.pinWidget({ userId: 'u1', dashboardKey: 'branch', elementId: 'e1' });
    await fresh.unpinWidget({ userId: 'u1', dashboardKey: 'branch', elementId: 'e1' });
    const prefs = await fresh.getUserPreferences({ userId: 'u1' });
    expect(prefs.preferences.pinnedWidgets).toEqual([]);
  });

  test('saveView + deleteSavedView', async () => {
    const fresh = createProductivityFeaturesService();
    const s = await fresh.saveView({
      userId: 'u1',
      dashboardKey: 'branch',
      nameEn: 'High-severity only',
      filters: { severity: 'high' },
    });
    expect(s.ok).toBe(true);
    expect(s.viewId).toBeTruthy();
    const d = await fresh.deleteSavedView({ userId: 'u1', viewId: s.viewId });
    expect(d.ok).toBe(true);
  });

  test('upsertPreset stores per-dashboard config', async () => {
    const fresh = createProductivityFeaturesService();
    await fresh.upsertPreset({
      userId: 'u1',
      dashboardKey: 'branch',
      preset: { density: 'high', collapsedSections: ['exec-deep-dive'] },
    });
    const r = await fresh.getUserPreferences({ userId: 'u1' });
    expect(r.preferences.dashboardPresets.branch.density).toBe('high');
  });
});

// ─── 3. End-of-Day generator ──────────────────────────────────

describe('end-of-day generator', () => {
  test('silent on empty day', async () => {
    const out = await eodGen.evaluate({
      summaries: [
        {
          roleGroup: 'branch_manager',
          branchId: 'B-1',
          resolvedCount: 0,
          snoozedCount: 0,
          openFollowUpCount: 0,
          pendingApprovalCount: 0,
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test('emits when work remains, severity scales with open work', async () => {
    const big = await eodGen.evaluate({
      summaries: [
        {
          roleGroup: 'branch_manager',
          branchId: 'B-1',
          resolvedCount: 5,
          snoozedCount: 2,
          openFollowUpCount: 8,
          pendingApprovalCount: 3,
        },
      ],
    });
    expect(big).toHaveLength(1);
    expect(big[0].severity).toBe('high'); // 11 open
  });

  test('payload survives Insight G-validators', async () => {
    const out = await eodGen.evaluate({
      summaries: [
        {
          roleGroup: 'branch_manager',
          branchId: new mongoose.Types.ObjectId(),
          resolvedCount: 3,
          snoozedCount: 1,
          openFollowUpCount: 2,
          pendingApprovalCount: 1,
        },
      ],
    });
    expect(out).toHaveLength(1);
    const doc = new Insight(out[0]);
    expect(doc.validateSync()).toBeFalsy();
  });
});

// ─── 4. Executive-Digest generator ────────────────────────────

describe('executive-digest generator', () => {
  test('returns [] when fewer than 2 comparisons', async () => {
    const out = await digestGen.evaluate({ comparisons: [] });
    expect(out).toEqual([]);
  });

  test('emits 1 digest with severity reflecting worsened KPIs', async () => {
    const out = await digestGen.evaluate({
      comparisons: [
        { kpiId: 'a', labelAr: 'أ', labelEn: 'A', current: 80, previous: 100 }, // -20% (worsened)
        { kpiId: 'b', labelAr: 'ب', labelEn: 'B', current: 75, previous: 100 }, // -25% (worsened)
        { kpiId: 'c', labelAr: 'ج', labelEn: 'C', current: 105, previous: 100 }, // +5%
      ],
    });
    expect(out).toHaveLength(1);
    expect(['high', 'critical']).toContain(out[0].severity);
  });

  test('payload survives Insight G-validators', async () => {
    const out = await digestGen.evaluate({
      comparisons: [
        { kpiId: 'a', labelAr: 'أ', labelEn: 'A', current: 80, previous: 100 },
        { kpiId: 'b', labelAr: 'ب', labelEn: 'B', current: 120, previous: 100 },
      ],
    });
    expect(out).toHaveLength(1);
    const doc = new Insight(out[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('weekNumberOf produces year-week format', () => {
    const wk = digestGen._internal.weekNumberOf(new Date('2026-05-18'));
    expect(wk).toMatch(/^2026-W\d{2}$/);
  });
});

// ─── 5. Routes ─────────────────────────────────────────────────

function buildApp({ user = { id: 'u1', role: 'manager', branchId: 'B-1' } } = {}) {
  const svc = createProductivityFeaturesService();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/v1/productivity', createProductivityFeaturesRouter({ productivity: svc }));
  return app;
}

describe('productivity-features.routes', () => {
  test('GET / returns catalog', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/productivity');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThanOrEqual(14);
  });

  test('GET /catalog/for-role/:groupKey filters', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/productivity/catalog/for-role/therapist');
    expect(res.status).toBe(200);
    const keys = res.body.data.features.map(f => f.key);
    expect(keys).toContain('morning-briefing');
    expect(keys).not.toContain('weekly-executive-digest');
  });

  test('POST /annotations + GET /annotations', async () => {
    const app = buildApp();
    const post = await request(app)
      .post('/api/v1/productivity/annotations')
      .send({ kpiId: 'kpi.x', textAr: 'تحقق' });
    expect(post.status).toBe(200);
    const get = await request(app)
      .get('/api/v1/productivity/annotations')
      .query({ kpiId: 'kpi.x' });
    expect(get.status).toBe(200);
    expect(get.body.data.annotations).toHaveLength(1);
  });

  test('POST /annotations 400 on missing text', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/v1/productivity/annotations').send({ kpiId: 'k' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('TEXT_REQUIRED');
  });

  test('POST /handoffs + GET /handoffs/me', async () => {
    const app = buildApp();
    await request(app).post('/api/v1/productivity/handoffs').send({
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      branchId: 'B-1',
      toRoleGroup: 'manager',
      textAr: 'انتبه',
    });
    const list = await request(app)
      .get('/api/v1/productivity/handoffs/me')
      .query({ roleGroup: 'manager', branchId: 'B-1' });
    expect(list.status).toBe(200);
    expect(list.body.data.handoffs).toHaveLength(1);
  });

  test('POST /follow-ups + complete', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/v1/productivity/follow-ups')
      .send({ titleAr: 'متابعة', dueByHours: 2 });
    expect(created.status).toBe(200);
    const id = created.body.data.followUp._id;
    const done = await request(app).post(`/api/v1/productivity/follow-ups/${id}/complete`);
    expect(done.status).toBe(200);
    expect(done.body.data.followUp.status).toBe('done');
  });

  test('POST /follow-ups/:id/snooze 400 on bad hours', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/v1/productivity/follow-ups')
      .send({ titleEn: 'X' });
    const id = created.body.data.followUp._id;
    const r = await request(app)
      .post(`/api/v1/productivity/follow-ups/${id}/snooze`)
      .send({ hours: 500 });
    expect(r.status).toBe(400);
  });

  test('POST /watchlists + add/remove', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/v1/productivity/watchlists')
      .send({
        nameAr: 'كبار',
        entityType: 'Beneficiary',
        entityIds: ['b1'],
      });
    expect(created.status).toBe(200);
    const id = created.body.data.watchlist._id;
    await request(app).post(`/api/v1/productivity/watchlists/${id}/add`).send({ entityId: 'b2' });
    const list = await request(app).get('/api/v1/productivity/watchlists/me');
    expect(list.body.data.watchlists[0].entityIds).toEqual(['b1', 'b2']);
  });

  test('preferences pin/unpin/save-view/preset', async () => {
    const app = buildApp();
    const pin = await request(app)
      .post('/api/v1/productivity/preferences/me/pin')
      .send({ dashboardKey: 'branch', elementId: 'kpi-1' });
    expect(pin.status).toBe(200);

    const view = await request(app)
      .post('/api/v1/productivity/preferences/me/saved-views')
      .send({ dashboardKey: 'branch', nameEn: 'V1', filters: {} });
    expect(view.status).toBe(200);
    const viewId = view.body.data.viewId;

    const del = await request(app).delete(
      `/api/v1/productivity/preferences/me/saved-views/${viewId}`
    );
    expect(del.status).toBe(200);

    const preset = await request(app)
      .post('/api/v1/productivity/preferences/me/presets/branch')
      .send({ preset: { density: 'high' } });
    expect(preset.status).toBe(200);

    const me = await request(app).get('/api/v1/productivity/preferences/me');
    expect(me.body.data.preferences.dashboardPresets.branch.density).toBe('high');
  });

  test('pin 409 when over limit', async () => {
    const app = buildApp();
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/v1/productivity/preferences/me/pin')
        .send({ dashboardKey: 'branch', elementId: `el-${i}` });
    }
    const over = await request(app)
      .post('/api/v1/productivity/preferences/me/pin')
      .send({ dashboardKey: 'branch', elementId: 'overflow' });
    expect(over.status).toBe(409);
  });

  test('factory throws without service', () => {
    expect(() => createProductivityFeaturesRouter({})).toThrow(/productivity service is required/);
  });
});
