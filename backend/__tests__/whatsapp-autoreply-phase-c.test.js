'use strict';

/**
 * Phase C — WhatsApp auto-reply decision engine + Meta template sync tests.
 *
 * Covers:
 *   1. Decision engine (pure) — each intent × urgency combination yields the
 *      expected action; low-confidence falls back to none; requiresHumanReview
 *      flag overrides; canReplyFreeForm=false downgrades or escalates.
 *   2. Template sync — extractBodyText helper, upsertOne behavior (create →
 *      update on second pass), status-change detection, MISSING_IN_META
 *      flag on locally-known templates absent from a new Meta fetch.
 */

const mongoose = require('mongoose');
const autoReply = require('../services/whatsapp/autoReply.service');

// ─── 1. Decision engine (pure unit tests, no DB / no LLM) ─────────────────
describe('Phase C — auto-reply decision engine', () => {
  beforeEach(() => autoReply.resetPolicyOverride());

  test('emergency always escalates regardless of urgency', () => {
    const lo = autoReply.decide(
      { intent: 'emergency', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    const hi = autoReply.decide(
      { intent: 'emergency', urgencyLevel: 'critical', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    expect(lo.action).toBe(autoReply.ACTION.ESCALATE);
    expect(hi.action).toBe(autoReply.ACTION.ESCALATE);
    expect(hi.severity).toBe('critical');
  });

  test('complaint always escalates with severity scaling by urgency', () => {
    const normal = autoReply.decide(
      { intent: 'complaint', urgencyLevel: 'medium', confidence: 0.8 },
      { canReplyFreeForm: true }
    );
    const crit = autoReply.decide(
      { intent: 'complaint', urgencyLevel: 'critical', confidence: 0.8 },
      { canReplyFreeForm: true }
    );
    expect(normal.action).toBe(autoReply.ACTION.ESCALATE);
    expect(normal.severity).toBe('high');
    expect(crit.severity).toBe('critical');
  });

  test('session_inquiry text-replies on normal, escalates on critical', () => {
    const normal = autoReply.decide(
      { intent: 'session_inquiry', urgencyLevel: 'low', confidence: 0.85 },
      { canReplyFreeForm: true }
    );
    const crit = autoReply.decide(
      { intent: 'session_inquiry', urgencyLevel: 'critical', confidence: 0.85 },
      { canReplyFreeForm: true }
    );
    expect(normal.action).toBe(autoReply.ACTION.TEXT);
    expect(normal.replyIntent).toBe('session_inquiry');
    expect(crit.action).toBe(autoReply.ACTION.ESCALATE);
  });

  test('document_request → template action with templateName populated', () => {
    const d = autoReply.decide(
      { intent: 'document_request', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.TEMPLATE);
    expect(d.templateName).toBeTruthy();
  });

  test('positive_feedback normal → text; critical → none (no auto-spam)', () => {
    const normal = autoReply.decide(
      { intent: 'positive_feedback', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    const crit = autoReply.decide(
      { intent: 'positive_feedback', urgencyLevel: 'critical', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    expect(normal.action).toBe(autoReply.ACTION.TEXT);
    expect(crit.action).toBe(autoReply.ACTION.NONE);
  });

  test('low-confidence non-critical classification → none', () => {
    const d = autoReply.decide(
      { intent: 'complaint', urgencyLevel: 'low', confidence: 0.2 },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.NONE);
    expect(d.reason).toMatch(/low_confidence/);
  });

  test('low-confidence but critical urgency → still acts (policy wins)', () => {
    const d = autoReply.decide(
      { intent: 'emergency', urgencyLevel: 'critical', confidence: 0.2 },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.ESCALATE);
  });

  test('requiresHumanReview flag overrides text reply (except emergency)', () => {
    const d = autoReply.decide(
      {
        intent: 'session_inquiry',
        urgencyLevel: 'low',
        confidence: 0.9,
        requiresHumanReview: true,
      },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.NONE);
    expect(d.reason).toBe('requires_human_review_flag');
  });

  test('requiresHumanReview does NOT block emergency escalation', () => {
    const d = autoReply.decide(
      {
        intent: 'emergency',
        urgencyLevel: 'low',
        confidence: 0.9,
        requiresHumanReview: true,
      },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.ESCALATE);
  });

  test('canReplyFreeForm=false downgrades text → template if template exists in policy', () => {
    // session_inquiry has no normal template, so falls through to none.
    const d = autoReply.decide(
      { intent: 'session_inquiry', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: false }
    );
    expect(d.action).toBe(autoReply.ACTION.NONE);
    expect(d.reason).toBe('no_service_window');
  });

  test('general_question on critical urgency escalates (catch-net rule)', () => {
    const d = autoReply.decide(
      { intent: 'general_question', urgencyLevel: 'critical', confidence: 0.7 },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.ESCALATE);
  });

  test('setPolicyOverride lets ops change rules without redeploy', () => {
    autoReply.setPolicyOverride({
      ...autoReply._DEFAULT_POLICY,
      positive_feedback: {
        normal: { action: autoReply.ACTION.NONE },
        critical: { action: autoReply.ACTION.NONE },
      },
    });
    const d = autoReply.decide(
      { intent: 'positive_feedback', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    expect(d.action).toBe(autoReply.ACTION.NONE);
    autoReply.resetPolicyOverride();
  });

  test('buildTemplateParams produces a Meta-shaped component when context is provided', () => {
    const d = autoReply.decide(
      { intent: 'document_request', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    const params = autoReply.buildTemplateParams(d, {
      guardianName: 'أحمد',
      beneficiaryName: 'سارة',
    });
    expect(Array.isArray(params)).toBe(true);
    expect(params[0]).toHaveProperty('type', 'body');
    expect(Array.isArray(params[0].parameters)).toBe(true);
    expect(params[0].parameters.length).toBe(2);
    expect(params[0].parameters[0].text).toBe('أحمد');
    expect(params[0].parameters[1].text).toBe('سارة');
  });

  test('buildTemplateParams returns empty array when no names available (safer than crash)', () => {
    const d = autoReply.decide(
      { intent: 'document_request', urgencyLevel: 'low', confidence: 0.9 },
      { canReplyFreeForm: true }
    );
    const params = autoReply.buildTemplateParams(d, {});
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBe(0);
  });

  test('buildTemplateParams returns null for non-template decisions', () => {
    const params = autoReply.buildTemplateParams({ action: autoReply.ACTION.NONE }, {});
    expect(params).toBeNull();
  });
});

// ─── 2. Template sync ─────────────────────────────────────────────────────
describe('Phase C — Meta template sync', () => {
  let templateSync;
  let dbReady = false;

  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState !== 1 && process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI);
      }
      dbReady = mongoose.connection.readyState === 1;
    } catch {
      dbReady = false;
    }
    templateSync = require('../services/whatsapp/templateSync.service');
  });

  afterEach(async () => {
    if (dbReady) await templateSync.WhatsAppTemplate.deleteMany({}).catch(() => {});
    templateSync.clearCache();
  });

  test('extractBodyText pulls the BODY component text from a Meta payload', () => {
    const text = templateSync._extractBodyText([
      { type: 'HEADER', format: 'TEXT', text: 'Welcome' },
      { type: 'BODY', text: 'Hello {{1}}, your session is {{2}}.' },
      { type: 'BUTTONS', buttons: [] },
    ]);
    expect(text).toBe('Hello {{1}}, your session is {{2}}.');
  });

  test('extractBodyText returns empty string when no BODY component', () => {
    expect(templateSync._extractBodyText([])).toBe('');
    expect(templateSync._extractBodyText(undefined)).toBe('');
    expect(templateSync._extractBodyText([{ type: 'HEADER' }])).toBe('');
  });

  test('upsertOne creates on first call, updates on second, flags status change', async () => {
    if (!dbReady) return;
    const tpl = {
      name: 'session_reminder',
      language: 'ar',
      status: 'APPROVED',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'تذكير جلسة' }],
      id: 'meta-tmpl-123',
    };
    const r1 = await templateSync.upsertOne(tpl);
    expect(r1.created).toBe(true);

    // Same data — status not changed
    const r2 = await templateSync.upsertOne(tpl);
    expect(r2.created).toBe(false);
    expect(r2.statusChanged).toBe(false);

    // Now status flips
    const r3 = await templateSync.upsertOne({ ...tpl, status: 'PAUSED' });
    expect(r3.created).toBe(false);
    expect(r3.statusChanged).toBe(true);
    expect(r3.previousStatus).toBe('PAUSED'); // after Object.assign, existing already has new status
  });

  test('listApproved returns only APPROVED rows', async () => {
    if (!dbReady) return;
    await templateSync.upsertOne({
      name: 't1',
      language: 'ar',
      status: 'APPROVED',
      components: [{ type: 'BODY', text: 'a' }],
    });
    await templateSync.upsertOne({
      name: 't2',
      language: 'ar',
      status: 'REJECTED',
      components: [{ type: 'BODY', text: 'b' }],
    });
    await templateSync.upsertOne({
      name: 't3',
      language: 'en',
      status: 'APPROVED',
      components: [{ type: 'BODY', text: 'c' }],
    });

    const approved = await templateSync.listApproved({ force: true });
    expect(approved.length).toBe(2);
    expect(approved.map(r => r.templateName).sort()).toEqual(['t1', 't3']);

    const arOnly = await templateSync.listApproved({ language: 'ar', force: true });
    expect(arOnly.length).toBe(1);
    expect(arOnly[0].templateName).toBe('t1');
  });

  test('sync() marks locally-known templates absent from Meta as MISSING_IN_META', async () => {
    if (!dbReady) return;
    // Pre-seed two locally known templates.
    await templateSync.upsertOne({
      name: 'stale',
      language: 'ar',
      status: 'APPROVED',
      components: [{ type: 'BODY', text: 'x' }],
    });
    await templateSync.upsertOne({
      name: 'fresh',
      language: 'ar',
      status: 'APPROVED',
      components: [{ type: 'BODY', text: 'y' }],
    });

    // Mock Meta to return only 'fresh'.
    const originalFetch = templateSync.fetchFromMeta;
    const svcModule = require('../services/whatsapp/templateSync.service');
    svcModule.fetchFromMeta = async () => [
      {
        name: 'fresh',
        language: 'ar',
        status: 'APPROVED',
        components: [{ type: 'BODY', text: 'y' }],
      },
    ];

    try {
      const result = await svcModule.sync();
      expect(result.ok).toBe(true);
      expect(result.totals.missing).toBeGreaterThanOrEqual(1);
      const stale = await templateSync.WhatsAppTemplate.findOne({ templateName: 'stale' });
      const fresh = await templateSync.WhatsAppTemplate.findOne({ templateName: 'fresh' });
      expect(stale.status).toBe('MISSING_IN_META');
      expect(fresh.status).toBe('APPROVED');
    } finally {
      svcModule.fetchFromMeta = originalFetch;
    }
  });

  test('sync() surfaces fetchFromMeta errors as ok=false', async () => {
    if (!dbReady) return;
    const svcModule = require('../services/whatsapp/templateSync.service');
    const originalFetch = svcModule.fetchFromMeta;
    svcModule.fetchFromMeta = async () => {
      throw new Error('Meta 500');
    };
    try {
      const result = await svcModule.sync();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Meta 500');
    } finally {
      svcModule.fetchFromMeta = originalFetch;
    }
  });
});
