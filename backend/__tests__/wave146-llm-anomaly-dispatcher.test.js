/**
 * wave146-llm-anomaly-dispatcher.test.js — Wave 146.
 *
 * Sections:
 *   1. Factory guards
 *   2. First dispatch — baseline (no events emitted)
 *   3. New anomaly fires "anomaly-fired"
 *   4. Disappeared anomaly fires "anomaly-resolved"
 *   5. Detection ok:false → reason, no state change
 *   6. Rate limit suppresses repeat fire of same id
 *   7. Rate limit elapses → fires again
 *   8. Channel failure isolated — others still deliver
 *   9. Webhook channel payload shape
 *  10. Webhook factory returns null when URL unset
 *  11. Log channel writes to logger by severity
 *  12. Dispatcher delivers fired BEFORE resolved
 */

'use strict';

const {
  createLlmAnomalyDispatcher,
  EVENT_KIND,
  REASON,
} = require('../intelligence/llm-anomaly-dispatcher.service');
const { createLlmAnomalyLogChannel } = require('../intelligence/channels/llm-anomaly-log-channel');
const {
  createLlmAnomalyWebhookChannel,
  _payload,
} = require('../intelligence/channels/llm-anomaly-webhook-channel');

const SILENT = { info() {}, warn() {}, error() {} };

function clock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

function mockChannel(name, opts = {}) {
  const calls = [];
  return {
    name,
    deliver: jest.fn(async event => {
      calls.push(event);
      if (opts.throws) throw new Error(opts.throws);
      if (opts.ok === false) return { ok: false, message: opts.message };
      return { ok: true };
    }),
    _calls: calls,
  };
}

function fakeAnomaly({ id, kind = 'llm-cost-spike', severity = 'critical' } = {}) {
  return {
    id,
    kind,
    severity,
    summaryAr: `summary for ${id}`,
    suggestedAction: `act on ${id}`,
    details: {},
    deepLink: '/ai/llm-anomalies',
    detectedAt: new Date().toISOString(),
  };
}

function detection(items) {
  const sev = { critical: 0, warning: 0, info: 0 };
  for (const a of items) sev[a.severity]++;
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    items,
    summary: { total: items.length, ...sev },
  };
}

// ─── 1. Factory guards ─────────────────────────────────────────

describe('llm-anomaly-dispatcher — factory', () => {
  test('rejects channel without .name or .deliver', () => {
    expect(() => createLlmAnomalyDispatcher({ channels: [{ name: 'x' }], logger: SILENT })).toThrow(
      /channels\[0\].*deliver/
    );
    expect(() =>
      createLlmAnomalyDispatcher({ channels: [{ deliver: () => {} }], logger: SILENT })
    ).toThrow(/channels\[0\].*name/);
  });
});

// ─── 2. Baseline ───────────────────────────────────────────────

describe('llm-anomaly-dispatcher — baseline', () => {
  test('first dispatch emits no events even with anomalies', async () => {
    const ch = mockChannel('ch1');
    const d = createLlmAnomalyDispatcher({ channels: [ch], logger: SILENT });
    const r = await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    expect(r.ok).toBe(true);
    expect(r.baseline).toBe(true);
    expect(r.fired).toEqual([]);
    expect(r.resolved).toEqual([]);
    expect(ch.deliver).not.toHaveBeenCalled();
  });
});

// ─── 3. New anomaly fires ──────────────────────────────────────

describe('llm-anomaly-dispatcher — fired event', () => {
  test('new id in current → fired + channel delivers', async () => {
    const ch = mockChannel('ch1');
    const c = clock();
    const d = createLlmAnomalyDispatcher({ channels: [ch], logger: SILENT, now: c.now });
    await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    c.advance(120_000);
    const r = await d.dispatch({
      detectionResult: detection([fakeAnomaly({ id: 'a:1' }), fakeAnomaly({ id: 'b:2' })]),
    });
    expect(r.fired.map(x => x.id)).toEqual(['b:2']);
    expect(ch.deliver).toHaveBeenCalledTimes(1);
    expect(ch.deliver.mock.calls[0][0].kind).toBe(EVENT_KIND.FIRED);
    expect(ch.deliver.mock.calls[0][0].anomaly.id).toBe('b:2');
  });
});

// ─── 4. Resolved event ────────────────────────────────────────

describe('llm-anomaly-dispatcher — resolved event', () => {
  test('id in previous but not current → resolved + channel delivers', async () => {
    const ch = mockChannel('ch1');
    const c = clock();
    const d = createLlmAnomalyDispatcher({ channels: [ch], logger: SILENT, now: c.now });
    await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    c.advance(120_000);
    const r = await d.dispatch({ detectionResult: detection([]) });
    expect(r.resolved.map(x => x.id)).toEqual(['a:1']);
    expect(ch.deliver).toHaveBeenCalledTimes(1);
    expect(ch.deliver.mock.calls[0][0].kind).toBe(EVENT_KIND.RESOLVED);
  });
});

// ─── 5. Detection ok:false ────────────────────────────────────

describe('llm-anomaly-dispatcher — detection not ok', () => {
  test('returns DETECTION_NOT_OK + no state mutation', async () => {
    const ch = mockChannel('ch1');
    const d = createLlmAnomalyDispatcher({ channels: [ch], logger: SILENT });
    const r = await d.dispatch({ detectionResult: { ok: false, message: 'down' } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.DETECTION_NOT_OK);
    expect(ch.deliver).not.toHaveBeenCalled();
  });
});

// ─── 6+7. Rate limiting ───────────────────────────────────────

describe('llm-anomaly-dispatcher — rate limit', () => {
  test('same id firing within rateLimitMs is skipped (but stays active)', async () => {
    const ch = mockChannel('ch1');
    const c = clock();
    const d = createLlmAnomalyDispatcher({
      channels: [ch],
      logger: SILENT,
      now: c.now,
      rateLimitMs: 60_000,
    });
    // Baseline empty
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(120_000);
    // Fire a:1
    const r1 = await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    expect(r1.fired.map(x => x.id)).toEqual(['a:1']);
    // Disappear then reappear quickly — within cooldown
    c.advance(10_000);
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(10_000);
    const r3 = await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    expect(r3.fired).toEqual([]);
    expect(r3.skipped.map(x => x.id)).toEqual(['a:1']);
    expect(r3.skipped[0].reason).toBe('rate-limited');
  });

  test('after cooldown elapses, same id fires again', async () => {
    const ch = mockChannel('ch1');
    const c = clock();
    const d = createLlmAnomalyDispatcher({
      channels: [ch],
      logger: SILENT,
      now: c.now,
      rateLimitMs: 60_000,
    });
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(120_000);
    await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(70_000);
    const r = await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    expect(r.fired.map(x => x.id)).toEqual(['a:1']);
  });
});

// ─── 8. Channel failure isolation ─────────────────────────────

describe('llm-anomaly-dispatcher — channel isolation', () => {
  test('throwing channel does not stop other channels', async () => {
    const bad = mockChannel('bad', { throws: 'network exploded' });
    const good = mockChannel('good');
    const c = clock();
    const d = createLlmAnomalyDispatcher({ channels: [bad, good], logger: SILENT, now: c.now });
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(120_000);
    const r = await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'a:1' })]) });
    expect(r.fired).toHaveLength(1);
    expect(good.deliver).toHaveBeenCalled();
    expect(bad.deliver).toHaveBeenCalled();
    const channelReport = r.channelResults[0].channels;
    expect(channelReport.find(c => c.channel === 'bad').ok).toBe(false);
    expect(channelReport.find(c => c.channel === 'good').ok).toBe(true);
  });
});

// ─── 9+10+11. Channels themselves ─────────────────────────────

describe('llm-anomaly-webhook-channel', () => {
  test('factory returns null when URL unset', () => {
    delete process.env.LLM_ANOMALY_WEBHOOK_URL;
    const ch = createLlmAnomalyWebhookChannel({ logger: SILENT });
    expect(ch).toBeNull();
  });

  test('payload is Slack-compatible with severity color + suggested action', () => {
    const p = _payload({
      kind: EVENT_KIND.FIRED,
      anomaly: fakeAnomaly({ id: 'a:1', severity: 'critical' }),
      source: 'scheduler',
      detectedAt: '2026-05-19T12:00:00Z',
    });
    expect(typeof p.text).toBe('string');
    expect(p.text).toMatch(/fired/);
    expect(p.attachments[0].color).toBe('#dc2626');
    const fields = p.attachments[0].fields.map(f => f.title);
    expect(fields).toContain('severity');
    expect(fields).toContain('suggestedAction');
  });

  test('POSTs to URL + reports ok=true on 2xx', async () => {
    let captured = null;
    const fetcher = jest.fn(async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body) };
      return { ok: true, status: 200 };
    });
    const ch = createLlmAnomalyWebhookChannel({
      url: 'https://hooks.example/abc',
      fetcher,
      logger: SILENT,
    });
    const r = await ch.deliver({
      kind: EVENT_KIND.FIRED,
      anomaly: fakeAnomaly({ id: 'a:1' }),
      source: 'manual',
      detectedAt: 'now',
    });
    expect(r.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(captured.url).toBe('https://hooks.example/abc');
    expect(captured.body.text).toMatch(/a:1/);
  });

  test('reports ok=false on non-2xx', async () => {
    const fetcher = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'oops',
    }));
    const ch = createLlmAnomalyWebhookChannel({
      url: 'https://hooks.example/abc',
      fetcher,
      logger: SILENT,
    });
    const r = await ch.deliver({
      kind: EVENT_KIND.FIRED,
      anomaly: fakeAnomaly({ id: 'a:1' }),
      source: 'manual',
      detectedAt: 'now',
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(500);
  });

  test('reports ok=false on thrown error', async () => {
    const fetcher = jest.fn(async () => {
      throw new Error('timeout');
    });
    const ch = createLlmAnomalyWebhookChannel({
      url: 'https://hooks.example/abc',
      fetcher,
      logger: SILENT,
    });
    const r = await ch.deliver({
      kind: EVENT_KIND.FIRED,
      anomaly: fakeAnomaly({ id: 'a:1' }),
      source: 'manual',
      detectedAt: 'now',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toBe('timeout');
  });
});

describe('llm-anomaly-log-channel', () => {
  test('writes via logger.error for critical fire', async () => {
    const calls = [];
    const logger = {
      info: msg => calls.push(['info', msg]),
      warn: msg => calls.push(['warn', msg]),
      error: msg => calls.push(['error', msg]),
    };
    const ch = createLlmAnomalyLogChannel({ logger });
    await ch.deliver({
      kind: EVENT_KIND.FIRED,
      anomaly: fakeAnomaly({ id: 'a:1', severity: 'critical' }),
    });
    expect(calls[0][0]).toBe('error');
    expect(calls[0][1]).toMatch(/FIRED/);
    expect(calls[0][1]).toMatch(/a:1/);
  });

  test('writes via logger.warn for warning fire', async () => {
    const calls = [];
    const logger = {
      info: msg => calls.push(['info', msg]),
      warn: msg => calls.push(['warn', msg]),
      error: msg => calls.push(['error', msg]),
    };
    const ch = createLlmAnomalyLogChannel({ logger });
    await ch.deliver({
      kind: EVENT_KIND.FIRED,
      anomaly: fakeAnomaly({ id: 'a:1', severity: 'warning' }),
    });
    expect(calls[0][0]).toBe('warn');
  });

  test('writes via logger.info for resolved', async () => {
    const calls = [];
    const logger = {
      info: msg => calls.push(['info', msg]),
      warn: msg => calls.push(['warn', msg]),
      error: msg => calls.push(['error', msg]),
    };
    const ch = createLlmAnomalyLogChannel({ logger });
    await ch.deliver({
      kind: EVENT_KIND.RESOLVED,
      anomaly: fakeAnomaly({ id: 'a:1', severity: 'critical' }),
    });
    expect(calls[0][0]).toBe('info');
    expect(calls[0][1]).toMatch(/RESOLVED/);
  });
});

// ─── 12. Fired before resolved ────────────────────────────────

describe('llm-anomaly-dispatcher — ordering', () => {
  test('fired events delivered before resolved events in same dispatch', async () => {
    const order = [];
    const ch = {
      name: 'ordered',
      deliver: async event => {
        order.push(event.kind + ':' + event.anomaly.id);
        return { ok: true };
      },
    };
    const c = clock();
    const d = createLlmAnomalyDispatcher({ channels: [ch], logger: SILENT, now: c.now });
    await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'old' })]) });
    c.advance(120_000);
    await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'new' })]) });
    expect(order).toEqual([EVENT_KIND.FIRED + ':new', EVENT_KIND.RESOLVED + ':old']);
  });
});
