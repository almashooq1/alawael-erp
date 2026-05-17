/**
 * productivity-persistence-wave27.test.js — Wave 27.
 *
 *   1. The 5 Mongoose schemas (validate via validateSync, no Mongo):
 *      • Annotation requires text + has at + resolvedAt
 *      • HandoffNote requires subject + recipient (role OR user) + text
 *      • FollowUp requires title; dueBy is required
 *      • Watchlist requires name + entityType; entityIds dedup on save
 *      • UserPreferences singleton (unique userId index), pin limit 6
 *
 *   2. service.createFollowUpFromEvent:
 *      • requires ownerUserId + source
 *      • supplies default bilingual title when missing
 *      • dedupes against existing open FollowUp from the same source
 *      • passes through to createFollowUp
 *
 *   3. Auto-creation hook integration:
 *      • alert.acknowledge route → fires hook with sourceType='alert'
 *      • insight.confirm route → fires hook with sourceType='insight'
 *      • hook failure doesn't break the action (fire-and-forget)
 *      • noop result doesn't fire the hook
 */

'use strict';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const productivityModels = require('../models/Productivity');
const {
  createProductivityFeaturesService,
} = require('../intelligence/productivity-features.service');

// ─── 1. Mongoose schema validation ─────────────────────────────

describe('Wave 27 — Mongoose schemas', () => {
  const { schemas } = productivityModels;
  // Mint local models against the schemas (NOT using the canonical
  // registered models, since each test file needs an isolated state
  // and we don't want to share the registered Mongoose models across
  // suites). Pattern: borrowed from Wave 11.
  const Ann = mongoose.models.ProductivityAnnotation || productivityModels.Annotation;
  const HN = mongoose.models.ProductivityHandoffNote || productivityModels.HandoffNote;
  const FU = mongoose.models.ProductivityFollowUp || productivityModels.FollowUp;
  const WL = mongoose.models.ProductivityWatchlist || productivityModels.Watchlist;
  const UP = mongoose.models.ProductivityUserPreferences || productivityModels.UserPreferences;

  // Sanity: schemas are exported
  test('all 5 schemas exported', () => {
    expect(schemas.AnnotationSchema).toBeTruthy();
    expect(schemas.HandoffNoteSchema).toBeTruthy();
    expect(schemas.FollowUpSchema).toBeTruthy();
    expect(schemas.WatchlistSchema).toBeTruthy();
    expect(schemas.UserPreferencesSchema).toBeTruthy();
  });

  // ── Annotation ─────────────────────────────────────────
  test('Annotation requires kpiId + byUserId + text', () => {
    const d = new Ann({});
    const err = d.validateSync();
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/kpiId|byUserId|text/);
  });

  test('Annotation accepts a valid doc', () => {
    const d = new Ann({
      kpiId: 'kpi.x',
      byUserId: new mongoose.Types.ObjectId(),
      textAr: 'تعليق صحيح',
    });
    expect(d.validateSync()).toBeFalsy();
  });

  test('Annotation textAr cap 2000 chars', () => {
    const d = new Ann({
      kpiId: 'kpi.x',
      byUserId: new mongoose.Types.ObjectId(),
      textAr: 'x'.repeat(2001),
    });
    expect(d.validateSync()).toBeTruthy();
  });

  test('Annotation visibility enum gate', () => {
    const d = new Ann({
      kpiId: 'kpi.x',
      byUserId: new mongoose.Types.ObjectId(),
      textEn: 'note',
      visibility: 'bogus',
    });
    expect(d.validateSync()).toBeTruthy();
  });

  // ── HandoffNote ─────────────────────────────────────────
  test('HandoffNote requires subject + recipient + text', () => {
    const d = new HN({});
    const err = d.validateSync();
    expect(err).toBeTruthy();
  });

  test('HandoffNote accepts role-group recipient', () => {
    const d = new HN({
      byUserId: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      toRoleGroup: 'therapist',
      textAr: 'انتبه',
    });
    expect(d.validateSync()).toBeFalsy();
  });

  test('HandoffNote rejects missing recipient (no role + no user)', () => {
    const d = new HN({
      byUserId: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      textAr: 'x',
    });
    expect(d.validateSync()).toBeTruthy();
  });

  test('HandoffNote priority enum gate', () => {
    const d = new HN({
      byUserId: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      subjectType: 'Beneficiary',
      subjectId: 'b1',
      toRoleGroup: 'therapist',
      textAr: 'x',
      priority: 'whatever',
    });
    expect(d.validateSync()).toBeTruthy();
  });

  // ── FollowUp ───────────────────────────────────────────
  test('FollowUp requires title + dueBy + ownerUserId', () => {
    const d = new FU({});
    expect(d.validateSync()).toBeTruthy();
  });

  test('FollowUp accepts a valid doc', () => {
    const d = new FU({
      ownerUserId: new mongoose.Types.ObjectId(),
      titleAr: 'متابعة',
      dueBy: new Date(Date.now() + 86400000),
    });
    expect(d.validateSync()).toBeFalsy();
  });

  test('FollowUp status enum gate', () => {
    const d = new FU({
      ownerUserId: new mongoose.Types.ObjectId(),
      titleEn: 't',
      dueBy: new Date(),
      status: 'whatever',
    });
    expect(d.validateSync()).toBeTruthy();
  });

  // ── Watchlist ─────────────────────────────────────────
  test('Watchlist requires owner + name + entityType', () => {
    const d = new WL({});
    expect(d.validateSync()).toBeTruthy();
  });

  test('Watchlist entityType enum gate', () => {
    const d = new WL({
      ownerUserId: new mongoose.Types.ObjectId(),
      nameEn: 'VIP',
      entityType: 'NotARealType',
    });
    expect(d.validateSync()).toBeTruthy();
  });

  test('Watchlist dedupes entityIds on save', () => {
    const d = new WL({
      ownerUserId: new mongoose.Types.ObjectId(),
      nameEn: 'VIP',
      entityType: 'Beneficiary',
      entityIds: ['b1', 'b2', 'b1', 'b3', 'b2'],
    });
    // pre('validate') runs even when we call validateSync
    expect(d.validateSync()).toBeFalsy();
    expect(d.entityIds).toEqual(['b1', 'b2', 'b3']);
  });

  // ── UserPreferences ────────────────────────────────────
  test('UserPreferences requires userId', () => {
    const d = new UP({});
    expect(d.validateSync()).toBeTruthy();
  });

  test('UserPreferences pinnedWidget order max=5 (i.e. 6 widgets total)', () => {
    const d = new UP({
      userId: new mongoose.Types.ObjectId(),
      pinnedWidgets: [
        { dashboardKey: 'branch', elementId: 'e1', order: 0 },
        { dashboardKey: 'branch', elementId: 'e2', order: 6 }, // out of range
      ],
    });
    expect(d.validateSync()).toBeTruthy();
  });

  test('UserPreferences accepts up to 6 pins', () => {
    const d = new UP({
      userId: new mongoose.Types.ObjectId(),
      pinnedWidgets: Array.from({ length: 6 }, (_, i) => ({
        dashboardKey: 'branch',
        elementId: `e${i}`,
        order: i,
      })),
    });
    expect(d.validateSync()).toBeFalsy();
  });
});

// ─── 2. createFollowUpFromEvent ───────────────────────────────

describe('Wave 27 — createFollowUpFromEvent', () => {
  test('returns OWNER_REQUIRED when ownerUserId missing', async () => {
    const svc = createProductivityFeaturesService();
    const r = await svc.createFollowUpFromEvent({
      eventKind: 'alert.acknowledge',
      sourceType: 'alert',
      sourceId: 'a-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('OWNER_REQUIRED');
    expect(r.auto).toBe(true);
  });

  test('returns SOURCE_REQUIRED when sourceType/Id missing', async () => {
    const svc = createProductivityFeaturesService();
    const r = await svc.createFollowUpFromEvent({
      eventKind: 'alert.acknowledge',
      ownerUserId: 'u-1',
    });
    expect(r.reason).toBe('SOURCE_REQUIRED');
  });

  test('supplies default bilingual title when missing', async () => {
    const svc = createProductivityFeaturesService();
    const r = await svc.createFollowUpFromEvent({
      eventKind: 'alert.acknowledge',
      ownerUserId: 'u-1',
      sourceType: 'alert',
      sourceId: 'a-1',
    });
    expect(r.ok).toBe(true);
    expect(r.followUp.titleAr).toBeTruthy();
    expect(r.followUp.titleEn).toBeTruthy();
    expect(r.followUp.sourceType).toBe('alert');
    expect(r.followUp.sourceId).toBe('a-1');
  });

  test('dedupes against existing open FollowUp from the same source', async () => {
    const svc = createProductivityFeaturesService();
    const first = await svc.createFollowUpFromEvent({
      eventKind: 'insight.confirm',
      ownerUserId: 'u-1',
      sourceType: 'insight',
      sourceId: 'i-1',
    });
    expect(first.ok).toBe(true);
    expect(first.deduped).toBeFalsy();

    const dup = await svc.createFollowUpFromEvent({
      eventKind: 'insight.confirm',
      ownerUserId: 'u-1',
      sourceType: 'insight',
      sourceId: 'i-1',
    });
    expect(dup.ok).toBe(true);
    expect(dup.deduped).toBe(true);
    expect(dup.noop).toBe(true);
    expect(dup.followUp._id).toBe(first.followUp._id);
  });

  test('dedup does NOT match completed/cancelled follow-ups (only open)', async () => {
    const svc = createProductivityFeaturesService();
    const first = await svc.createFollowUpFromEvent({
      eventKind: 'alert.acknowledge',
      ownerUserId: 'u-1',
      sourceType: 'alert',
      sourceId: 'a-1',
    });
    // Mark done
    await svc.completeFollowUp({
      followUpId: first.followUp._id,
      actor: { userId: 'u-1' },
    });

    // Now re-fire — should NOT dedup, should create a new follow-up
    const second = await svc.createFollowUpFromEvent({
      eventKind: 'alert.acknowledge',
      ownerUserId: 'u-1',
      sourceType: 'alert',
      sourceId: 'a-1',
    });
    expect(second.ok).toBe(true);
    expect(second.deduped).toBeFalsy();
    expect(second.followUp._id).not.toBe(first.followUp._id);
  });

  test('manual sourceType always creates fresh (no dedup)', async () => {
    const svc = createProductivityFeaturesService();
    const a = await svc.createFollowUp({
      ownerUserId: 'u-1',
      titleEn: 'manual 1',
      sourceType: 'manual',
    });
    const b = await svc.createFollowUp({
      ownerUserId: 'u-1',
      titleEn: 'manual 2',
      sourceType: 'manual',
    });
    expect(a.followUp._id).not.toBe(b.followUp._id);
  });
});

// ─── 3. Auto-creation hook integration ────────────────────────

describe('Wave 27 — alerts/insights hook integration', () => {
  // Build a minimal app that wires the hook through the productivity
  // service — same shape as backend/app.js does in production.
  function buildApp({
    productivitySvc,
    workflowSvc, // stub
    insightsSvc, // stub
  } = {}) {
    const { createAlertsWorkflowRouter } = require('../routes/alerts-workflow.routes');
    const { createInsightsRouter } = require('../routes/insights.routes');

    const afterSuccessfulAction = async args => {
      if (typeof productivitySvc?.createFollowUpFromEvent === 'function') {
        return productivitySvc.createFollowUpFromEvent(args);
      }
      return null;
    };

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'u-1', role: 'manager', branchId: 'B-1' };
      next();
    });
    app.use(
      '/api/v1/alerts',
      createAlertsWorkflowRouter({
        workflow: workflowSvc,
        afterSuccessfulAction,
      })
    );
    app.use(
      '/api/v1/insights',
      createInsightsRouter({
        insights: insightsSvc,
        afterSuccessfulAction,
      })
    );
    return app;
  }

  test('alert.acknowledge fires hook → creates FollowUp with sourceType=alert', async () => {
    const productivitySvc = createProductivityFeaturesService();
    const workflowSvc = {
      acknowledgeAlert: async () => ({
        ok: true,
        alert: { _id: 'a-1', branchId: 'B-1' },
      }),
    };
    const insightsSvc = { confirmInsight: async () => ({ ok: true }) };
    const app = buildApp({ productivitySvc, workflowSvc, insightsSvc });

    const res = await request(app).post('/api/v1/alerts/a-1/acknowledge');
    expect(res.status).toBe(200);

    // Give the fire-and-forget hook a tick to complete
    await new Promise(r => setImmediate(r));

    const followUps = await productivitySvc.listFollowUpsForUser({ ownerUserId: 'u-1' });
    expect(followUps).toHaveLength(1);
    expect(followUps[0].sourceType).toBe('alert');
    expect(followUps[0].sourceId).toBe('a-1');
  });

  test('insight.confirm fires hook → creates FollowUp with sourceType=insight', async () => {
    const productivitySvc = createProductivityFeaturesService();
    const workflowSvc = {
      acknowledgeAlert: async () => ({ ok: true }),
    };
    const insightsSvc = {
      confirmInsight: async () => ({
        ok: true,
        insight: { _id: 'i-1' },
      }),
    };
    const app = buildApp({ productivitySvc, workflowSvc, insightsSvc });

    const res = await request(app).post('/api/v1/insights/i-1/confirm');
    expect(res.status).toBe(200);
    await new Promise(r => setImmediate(r));

    const followUps = await productivitySvc.listFollowUpsForUser({ ownerUserId: 'u-1' });
    expect(followUps).toHaveLength(1);
    expect(followUps[0].sourceType).toBe('insight');
  });

  test('hook NOT fired when result is noop (idempotent ack)', async () => {
    const productivitySvc = createProductivityFeaturesService();
    const workflowSvc = {
      acknowledgeAlert: async () => ({
        ok: true,
        alert: { _id: 'a-1' },
        noop: true, // already acknowledged
      }),
    };
    const insightsSvc = { confirmInsight: async () => ({ ok: true }) };
    const app = buildApp({ productivitySvc, workflowSvc, insightsSvc });

    await request(app).post('/api/v1/alerts/a-1/acknowledge');
    await new Promise(r => setImmediate(r));

    const followUps = await productivitySvc.listFollowUpsForUser({ ownerUserId: 'u-1' });
    expect(followUps).toHaveLength(0);
  });

  test('hook NOT fired when action fails', async () => {
    const productivitySvc = createProductivityFeaturesService();
    const workflowSvc = {
      acknowledgeAlert: async () => ({
        ok: false,
        reason: 'NOT_FOUND',
      }),
    };
    const insightsSvc = { confirmInsight: async () => ({ ok: true }) };
    const app = buildApp({ productivitySvc, workflowSvc, insightsSvc });

    await request(app).post('/api/v1/alerts/a-1/acknowledge');
    await new Promise(r => setImmediate(r));

    const followUps = await productivitySvc.listFollowUpsForUser({ ownerUserId: 'u-1' });
    expect(followUps).toHaveLength(0);
  });

  test('hook failure does NOT break the action', async () => {
    // Productivity svc that throws on createFollowUpFromEvent
    const productivitySvc = {
      createFollowUpFromEvent: async () => {
        throw new Error('boom');
      },
    };
    const workflowSvc = {
      acknowledgeAlert: async () => ({
        ok: true,
        alert: { _id: 'a-1' },
      }),
    };
    const insightsSvc = { confirmInsight: async () => ({ ok: true }) };
    const app = buildApp({ productivitySvc, workflowSvc, insightsSvc });

    const res = await request(app).post('/api/v1/alerts/a-1/acknowledge');
    // The action still succeeded even though the hook threw
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('repeated ack of same alert → only 1 FollowUp (dedup)', async () => {
    const productivitySvc = createProductivityFeaturesService();
    const workflowSvc = {
      acknowledgeAlert: async () => ({
        ok: true,
        alert: { _id: 'a-1' },
      }),
    };
    const insightsSvc = { confirmInsight: async () => ({ ok: true }) };
    const app = buildApp({ productivitySvc, workflowSvc, insightsSvc });

    await request(app).post('/api/v1/alerts/a-1/acknowledge');
    await new Promise(r => setImmediate(r));
    await request(app).post('/api/v1/alerts/a-1/acknowledge');
    await new Promise(r => setImmediate(r));

    const followUps = await productivitySvc.listFollowUpsForUser({ ownerUserId: 'u-1' });
    expect(followUps).toHaveLength(1);
  });
});
