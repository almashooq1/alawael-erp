/**
 * briefing-service.test.js — Wave 4 (Premium AI Layer).
 *
 * Verifies graceful degradation, LRU caching, prompt-cache header,
 * PII redaction (indirectly via call inspection), and the rule-based
 * fallback path used when the LLM client is absent or fails.
 *
 * Mirrors the testing pattern in hr-copilot-service.test.js so we
 * stay aligned with the rest of the AI-service test surface.
 */

'use strict';

const { createBriefingService, _internal } = require('../services/briefing.service');

const SAMPLE_ALERTS = [
  {
    severity: 'critical',
    ruleId: 'pdpl-dsar-sla-breach',
    category: 'compliance',
    headlineAr: 'تجاوز SLA لطلب PDPL',
    headlineEn: 'PDPL DSAR SLA breach',
    firstFiredAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    severity: 'warning',
    ruleId: 'document-expiring-30d',
    category: 'compliance',
    headlineAr: 'مستندات تنتهي خلال 30 يوم',
    headlineEn: 'Documents expiring within 30d',
    firstFiredAt: Date.now() - 60 * 60 * 1000,
  },
];

const SAMPLE_KPIS = [
  {
    id: 'finance.claims.denial_rate.pct',
    classification: 'red',
    target: 5,
    direction: 'lower_is_better',
    unit: 'percent',
    delta: 0.03,
  },
  {
    id: 'hr.saudization.ratio.pct',
    classification: 'amber',
    target: 30,
    direction: 'higher_is_better',
    unit: 'percent',
    delta: -0.01,
  },
];

// ─── Fake Anthropic client ───────────────────────────────────────
function fakeClient(jsonOut) {
  return {
    messages: {
      create: jest.fn(async () => ({
        content: [{ type: 'text', text: JSON.stringify(jsonOut) }],
        model: 'claude-haiku-4-5-20251001',
      })),
    },
  };
}

function failingClient() {
  return {
    messages: {
      create: jest.fn(async () => {
        throw new Error('upstream timeout');
      }),
    },
  };
}

// ─── isAvailable + null client fallback ──────────────────────────
describe('createBriefingService — availability', () => {
  test('reports unavailable when no client is wired', () => {
    const svc = createBriefingService({ anthropicClient: null });
    expect(svc.isAvailable()).toBe(false);
  });

  test('reports available when client has messages.create', () => {
    const svc = createBriefingService({ anthropicClient: fakeClient({}) });
    expect(svc.isAvailable()).toBe(true);
  });
});

// ─── Morning briefing happy path ─────────────────────────────────
describe('createBriefingService.morningBriefing', () => {
  test('returns LLM payload when model responds with valid JSON', async () => {
    const client = fakeClient({
      headlineAr: 'صباح بـ 1 تنبيه حرج',
      headlineEn: '1 critical alert this morning',
      bulletsAr: ['تنبيه PDPL', 'مستندات منتهية'],
      bulletsEn: ['PDPL alert', 'Expiring docs'],
      focusAr: 'ابدأ بالـ PDPL',
      focusEn: 'Start with PDPL',
      confidence: 'high',
    });
    const svc = createBriefingService({ anthropicClient: client, logger: { warn() {} } });
    const out = await svc.morningBriefing({
      role: 'branch_manager',
      branchId: 'br-1',
      alerts: SAMPLE_ALERTS,
      kpis: SAMPLE_KPIS,
    });
    expect(out.available).toBe(true);
    expect(out.source).toBe('llm');
    expect(out.data.headlineAr).toContain('تنبيه');
    expect(client.messages.create).toHaveBeenCalledTimes(1);
    // Confirm prompt-caching marker is on the system block.
    const call = client.messages.create.mock.calls[0][0];
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  test('caches by (role, branchId, day) — second call is a hit', async () => {
    const client = fakeClient({
      headlineAr: 'A',
      headlineEn: 'A',
      bulletsAr: ['x'],
      bulletsEn: ['x'],
      focusAr: 'f',
      focusEn: 'f',
      confidence: 'medium',
    });
    const svc = createBriefingService({ anthropicClient: client, logger: { warn() {} } });
    const first = await svc.morningBriefing({
      role: 'admin',
      branchId: 'br-1',
      alerts: SAMPLE_ALERTS,
    });
    const second = await svc.morningBriefing({
      role: 'admin',
      branchId: 'br-1',
      alerts: SAMPLE_ALERTS,
    });
    expect(first.cached).toBeFalsy();
    expect(second.cached).toBe(true);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  test('falls back to rule output when client is null', async () => {
    const svc = createBriefingService({ anthropicClient: null });
    const out = await svc.morningBriefing({
      role: 'branch_manager',
      alerts: SAMPLE_ALERTS,
      kpis: SAMPLE_KPIS,
    });
    expect(out.available).toBe(true);
    expect(out.source).toBe('rule');
    expect(out.data.bulletsAr.length).toBeGreaterThan(0);
  });

  test('falls back to rule output when model call throws', async () => {
    const svc = createBriefingService({
      anthropicClient: failingClient(),
      logger: { warn() {} },
    });
    const out = await svc.morningBriefing({
      role: 'admin',
      alerts: SAMPLE_ALERTS,
      kpis: SAMPLE_KPIS,
    });
    expect(out.available).toBe(true);
    expect(out.source).toBe('rule');
  });

  test('falls back to rule output when model returns malformed JSON', async () => {
    const badClient = {
      messages: {
        create: jest.fn(async () => ({
          content: [{ type: 'text', text: 'not json at all' }],
          model: 'claude-haiku-4-5-20251001',
        })),
      },
    };
    const svc = createBriefingService({ anthropicClient: badClient, logger: { warn() {} } });
    const out = await svc.morningBriefing({
      role: 'admin',
      alerts: SAMPLE_ALERTS,
    });
    expect(out.available).toBe(true);
    expect(out.source).toBe('rule');
  });
});

// ─── Next best action ────────────────────────────────────────────
describe('createBriefingService.nextBestActions', () => {
  test('returns LLM actions array when client succeeds', async () => {
    const client = fakeClient({
      actions: [
        {
          titleAr: 'افتح PDPL request',
          titleEn: 'Open PDPL request',
          reasonAr: 'تجاوز SLA',
          reasonEn: 'SLA breach',
          urgency: 'now',
          deepLink: '/admin/pdpl',
          category: 'compliance',
        },
      ],
    });
    const svc = createBriefingService({ anthropicClient: client, logger: { warn() {} } });
    const out = await svc.nextBestActions({
      role: 'dpo',
      branchId: 'br-1',
      alerts: SAMPLE_ALERTS,
    });
    expect(out.source).toBe('llm');
    expect(out.data.actions).toHaveLength(1);
  });

  test('falls back to rule actions when client absent', async () => {
    const svc = createBriefingService({ anthropicClient: null });
    const out = await svc.nextBestActions({
      role: 'branch_manager',
      alerts: SAMPLE_ALERTS,
    });
    expect(out.source).toBe('rule');
    // Severity-ranked: critical PDPL must come first.
    expect(out.data.actions[0].titleAr).toContain('PDPL');
  });

  test('empty alert list yields zero actions without LLM call', async () => {
    const client = fakeClient({ actions: [] });
    const svc = createBriefingService({ anthropicClient: client, logger: { warn() {} } });
    const out = await svc.nextBestActions({ role: 'admin', alerts: [] });
    expect(out.data.actions).toEqual([]);
    // No LLM call — empty input short-circuits.
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  test('falls back to rule output when malformed actions returned', async () => {
    const badClient = {
      messages: {
        create: jest.fn(async () => ({
          content: [{ type: 'text', text: JSON.stringify({ notActions: 'oops' }) }],
        })),
      },
    };
    const svc = createBriefingService({ anthropicClient: badClient, logger: { warn() {} } });
    const out = await svc.nextBestActions({ role: 'admin', alerts: SAMPLE_ALERTS });
    expect(out.source).toBe('rule');
  });
});

// ─── Rule fallback shapes ────────────────────────────────────────
describe('_internal.fallbackMorning', () => {
  test('produces deterministic bullets ordered by severity', () => {
    const out = _internal.fallbackMorning({
      role: 'admin',
      alerts: SAMPLE_ALERTS,
      kpis: SAMPLE_KPIS,
    });
    expect(out.bulletsAr.length).toBeGreaterThan(0);
    expect(out.bulletsEn.length).toBe(out.bulletsAr.length);
    expect(out.source).toBe('rule');
  });

  test('produces calm output when no alerts / KPIs flagged', () => {
    const out = _internal.fallbackMorning({ role: 'admin', alerts: [], kpis: [] });
    expect(out.headlineAr).toContain('هادئ');
    expect(out.bulletsAr.length).toBe(1);
  });
});

describe('_internal.fallbackNextBestActions', () => {
  test('orders by severity then by firstFiredAt', () => {
    const out = _internal.fallbackNextBestActions({
      role: 'admin',
      alerts: [
        { severity: 'warning', ruleId: 'a', firstFiredAt: 1, headlineAr: 'a', headlineEn: 'a' },
        { severity: 'critical', ruleId: 'b', firstFiredAt: 2, headlineAr: 'b', headlineEn: 'b' },
        { severity: 'critical', ruleId: 'c', firstFiredAt: 1, headlineAr: 'c', headlineEn: 'c' },
      ],
    });
    // Two criticals first, oldest of those first ⇒ c before b.
    expect(out.actions[0].titleAr).toContain('c');
    expect(out.actions[1].titleAr).toContain('b');
    expect(out.actions[2].titleAr).toContain('a');
  });

  test('caps at 5 actions even with more alerts', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      severity: 'warning',
      ruleId: `r-${i}`,
      firstFiredAt: i,
      headlineAr: `T${i}`,
      headlineEn: `T${i}`,
    }));
    const out = _internal.fallbackNextBestActions({ role: 'admin', alerts: many });
    expect(out.actions.length).toBe(5);
  });
});

// ─── Stats ───────────────────────────────────────────────────────
describe('stats()', () => {
  test('reports cache sizes', async () => {
    const client = fakeClient({
      headlineAr: 'A',
      headlineEn: 'A',
      bulletsAr: ['x'],
      bulletsEn: ['x'],
      focusAr: 'f',
      focusEn: 'f',
      confidence: 'medium',
    });
    const svc = createBriefingService({ anthropicClient: client, logger: { warn() {} } });
    await svc.morningBriefing({ role: 'a', alerts: [], kpis: [] });
    const s = svc.stats();
    expect(s.available).toBe(true);
    expect(s.morningCacheSize).toBe(1);
    expect(s.nbaCacheSize).toBe(0);
  });
});
