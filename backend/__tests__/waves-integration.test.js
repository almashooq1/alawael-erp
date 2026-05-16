/**
 * waves-integration.test.js — Wave 9.
 *
 * End-to-end smoke test that exercises Waves 4 + 5 + 7 together:
 *
 *   1. buildAlertsStack (Wave 7) registers all 19 rules.
 *   2. A seeded kpiHistoryStore trips the EWMA bridge rule (Wave 5),
 *      producing a finding through engine.runAll().
 *   3. The Wave-4 briefing service consumes that finding and emits a
 *      bilingual morning briefing + a ranked Next-Best-Action list.
 *
 * Mongoose models, the AlertDispatcher's Mongo write, and the real
 * Anthropic SDK are all bypassed — we drive the engine directly and
 * inject a fake Claude client. This keeps the test hermetic while
 * still proving the *data contract* between the three waves matches.
 *
 * Why this test exists: each wave has its own unit suite (Wave 5 has
 * 10 tests, Wave 4 has 16, Wave 7 has 9) but none of them verifies
 * that a Wave-5 finding actually arrives at the Wave-4 briefing in
 * the shape the briefing service expects. A breaking change to any
 * intermediate type would slip past the individual unit suites.
 */

'use strict';

const { buildAlertsStack } = require('../alerts/bootstrap');
const { createBriefingService } = require('../services/briefing.service');

// ─── Fake LLM client — matches the Anthropic SDK surface area
function fakeClaudeClient(jsonOut) {
  return {
    messages: {
      create: jest.fn(async () => ({
        content: [{ type: 'text', text: JSON.stringify(jsonOut) }],
        model: 'claude-haiku-4-5-20251001',
      })),
    },
  };
}

// Helper to fabricate a "stable jitter + spike" series the EWMA rule trips on.
function seriesWithSpike(stableValue, spikeValue, count, startMs) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ t: startMs + i * 3.6e6, v: stableValue + (i % 2 ? 1 : -1) });
  }
  out.push({ t: startMs + count * 3.6e6, v: spikeValue });
  return out;
}

describe('Waves 4 + 5 + 7 — engine → briefing pipeline', () => {
  test('EWMA-detected anomaly surfaces in the morning briefing', async () => {
    // ── Step 1: Wave 7 stack with Wave 5 trip-data ────────────────
    const T0 = Date.parse('2026-05-01T00:00:00Z');
    const kpiHistoryStore = {
      list: () => [
        {
          kpiId: 'crm.complaints.sla_breach.count',
          scope: 'br-1',
          // 21 stable jittered ticks then a 200-value spike — large z.
          points: seriesWithSpike(50, 200, 20, T0),
        },
      ],
    };

    const stack = buildAlertsStack({
      kpiHistoryStore,
      logger: { warn() {}, info() {}, error() {} },
    });

    // Stack must register all 19 rules.
    expect(stack.engine.rules.size).toBe(19);

    // ── Step 2: Engine evaluates → Wave-5 rule fires ──────────────
    const tickResult = await stack.engine.runAll(stack.ctxFactory());
    const ewmaFinding = tickResult.raised.find(a => a.ruleId === 'kpi-anomaly-detected');
    expect(ewmaFinding).toBeTruthy();
    expect(ewmaFinding.severity).toBe('warning');
    expect(ewmaFinding.category).toBe('operational');
    expect(ewmaFinding.metadata.direction).toBe('above');
    expect(ewmaFinding.metadata.zScore).toBeGreaterThan(2.5);

    // ── Step 3: Wave-4 briefing consumes the finding ──────────────
    // The briefing service's getAlerts pattern in production reads
    // from AlertModel. Here we shape the engine's raised array into
    // the same envelope getAlerts produces, proving the shapes line
    // up between the two waves without a network hop.
    const alertsForBriefing = tickResult.raised.map(r => ({
      ruleId: r.ruleId,
      key: r.key,
      severity: r.severity,
      category: r.category,
      headlineAr: r.message,
      headlineEn: r.message,
      firstFiredAt: r.firstSeenAt instanceof Date ? r.firstSeenAt.getTime() : null,
      branchId: r.branchId || null,
    }));

    const claude = fakeClaudeClient({
      headlineAr: 'تم رصد ارتفاع غير اعتيادي في الشكاوى',
      headlineEn: 'Unusual complaint spike detected',
      bulletsAr: [
        'مؤشر شكاوى SLA في فرع الرياض الشمالي خرج عن النطاق الإحصائي',
        'مراجعة فورية موصى بها لأسباب الارتفاع',
      ],
      bulletsEn: [
        'Complaint SLA KPI breached statistical bounds in Riyadh North branch',
        'Immediate root-cause review recommended',
      ],
      focusAr: 'افتح لوحة الشكاوى وراجع الـ 24h الأخيرة',
      focusEn: 'Open complaints dashboard and review the last 24h',
      confidence: 'high',
    });

    const briefing = createBriefingService({
      anthropicClient: claude,
      logger: { warn() {} },
    });

    const morning = await briefing.morningBriefing({
      role: 'branch_manager',
      branchId: 'br-1',
      alerts: alertsForBriefing,
      kpis: [],
    });

    expect(morning.available).toBe(true);
    expect(morning.source).toBe('llm');
    expect(morning.data.headlineAr).toContain('شكاوى');
    expect(morning.data.bulletsAr.length).toBeGreaterThan(0);

    // ── Verify the LLM call payload contained the Wave-5 finding ──
    expect(claude.messages.create).toHaveBeenCalledTimes(1);
    const llmPayload = JSON.parse(
      claude.messages.create.mock.calls[0][0].messages[0].content[0].text
    );
    expect(llmPayload.alertsSummary).toContainEqual(
      expect.objectContaining({ ruleId: 'kpi-anomaly-detected' })
    );
  });

  test('Next-Best-Action ranks Wave-5 finding by severity correctly', async () => {
    // Mixed bag: one Wave-3 critical alert + one Wave-5 warning. NBA
    // ordering must put the critical first (rule-based fallback path
    // is deterministic so we don't need an LLM client for this test).
    const briefing = createBriefingService({ anthropicClient: null });
    const alerts = [
      {
        ruleId: 'kpi-anomaly-detected',
        severity: 'warning',
        category: 'operational',
        firstFiredAt: Date.now() - 60_000,
        headlineAr: 'ارتفاع غير اعتيادي في الشكاوى',
        headlineEn: 'Unusual complaint spike',
      },
      {
        ruleId: 'incident-critical-open-24h',
        severity: 'critical',
        category: 'quality',
        firstFiredAt: Date.now() - 3_600_000,
        headlineAr: 'حادث حرج مفتوح > 24 ساعة',
        headlineEn: 'Critical incident open > 24h',
      },
    ];

    const result = await briefing.nextBestActions({
      role: 'branch_manager',
      alerts,
    });

    expect(result.source).toBe('rule');
    expect(result.data.actions.length).toBe(2);
    // Critical incident must outrank the EWMA warning.
    expect(result.data.actions[0].titleAr).toContain('حادث');
    expect(result.data.actions[1].titleAr).toContain('ارتفاع');
  });

  test('shapes survive: engine.raised → getAlerts-equivalent → briefing context', async () => {
    // Locks the field contract between the three waves. Any of these
    // assertions failing means a wave changed its shape unilaterally
    // and the other waves haven't caught up.
    const stack = buildAlertsStack({ logger: { warn() {}, info() {}, error() {} } });

    // Force a single synthetic finding through the engine by injecting
    // a stub rule. This isolates the contract from any specific real
    // rule's quirks.
    stack.engine.register({
      id: 'synthetic-integration-rule',
      severity: 'warning',
      category: 'operational',
      description: 'synthetic',
      async evaluate() {
        return [
          {
            key: 'integration-key',
            subject: { type: 'Test', id: 'x' },
            branchId: 'br-1',
            message: 'integration test finding',
          },
        ];
      },
    });

    const tick = await stack.engine.runAll(stack.ctxFactory());
    const raised = tick.raised.find(a => a.ruleId === 'synthetic-integration-rule');
    expect(raised).toBeTruthy();

    // The fields the Wave-4 getAlerts callback maps to its envelope.
    expect(raised).toEqual(
      expect.objectContaining({
        ruleId: expect.any(String),
        severity: expect.stringMatching(/^(info|warning|high|critical)$/),
        category: expect.any(String),
        description: expect.any(String),
        message: expect.any(String),
        firstSeenAt: expect.any(Date),
      })
    );
    // `key` is always present and joins with ruleId for dedup.
    expect(typeof raised.key).toBe('string');
    expect(raised.key.length).toBeGreaterThan(0);
  });

  test('engine dedup: same kpiHistoryStore content yields zero new findings on second tick', async () => {
    // Confirms Wave-7's dispatcher doesn't double-notify on subsequent
    // ticks while an anomaly persists. The engine's internal active-set
    // suppresses re-emission until the underlying condition clears.
    const T0 = Date.parse('2026-05-01T00:00:00Z');
    const store = {
      list: () => [
        {
          kpiId: 'k1',
          scope: null,
          points: seriesWithSpike(50, 200, 20, T0),
        },
      ],
    };
    const stack = buildAlertsStack({
      kpiHistoryStore: store,
      logger: { warn() {}, info() {}, error() {} },
    });

    const first = await stack.engine.runAll(stack.ctxFactory());
    const second = await stack.engine.runAll(stack.ctxFactory());

    const firstAnomaly = first.raised.find(a => a.ruleId === 'kpi-anomaly-detected');
    const secondAnomaly = second.raised.find(a => a.ruleId === 'kpi-anomaly-detected');
    expect(firstAnomaly).toBeTruthy();
    expect(secondAnomaly).toBeFalsy(); // deduped
    expect(second.activeCount).toBeGreaterThan(0);
  });

  test('cache cohesion: briefing service hits its LRU on identical context', async () => {
    // Wave-4's caching matters for cost control when many operators
    // hit the briefing endpoint within the same morning. We confirm
    // the cache key composition still works through the integrated
    // pipeline (role + branchId + day bucket).
    const claude = fakeClaudeClient({
      headlineAr: 'A',
      headlineEn: 'A',
      bulletsAr: ['x'],
      bulletsEn: ['x'],
      focusAr: 'f',
      focusEn: 'f',
      confidence: 'medium',
    });
    const briefing = createBriefingService({
      anthropicClient: claude,
      logger: { warn() {} },
    });

    const ctx = {
      role: 'admin',
      branchId: 'br-1',
      alerts: [
        {
          ruleId: 'r1',
          severity: 'warning',
          category: 'compliance',
          firstFiredAt: Date.now(),
          headlineAr: 'x',
          headlineEn: 'x',
        },
      ],
      kpis: [],
    };

    const a = await briefing.morningBriefing(ctx);
    const b = await briefing.morningBriefing(ctx);
    expect(a.cached).toBeFalsy();
    expect(b.cached).toBe(true);
    expect(claude.messages.create).toHaveBeenCalledTimes(1);
  });
});
