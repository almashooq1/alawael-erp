'use strict';

/**
 * slack-channel.test.js — Phase 15 Commit 2 (4.0.65).
 *
 * Pure unit tests for the Slack webhook channel. Injects a fake
 * fetch so we can inspect request shape + verify priority color
 * mapping without any network.
 */

process.env.NODE_ENV = 'test';

const {
  buildSlackChannel,
  PRIORITY_ICONS,
  PRIORITY_COLORS,
} = require('../services/quality/notifications/channels/slackChannel');

function makeFetchSpy(response = { ok: true, status: 200 }) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: response.ok,
      status: response.status,
      async text() {
        return response.body || '';
      },
    };
  };
  return { fn, calls };
}

const quietLogger = { warn: () => {}, info: () => {}, log: () => {} };

describe('SlackChannel', () => {
  it('returns slack_not_configured when webhook URL is missing', async () => {
    const ch = buildSlackChannel({ webhookUrl: null, fetchImpl: null, logger: quietLogger });
    const res = await ch.send({ subject: 's', body: 'b' });
    expect(res.success).toBe(false);
    expect(res.reason).toBe('slack_not_configured');
  });

  it('returns fetch_unavailable when fetch not provided', async () => {
    const ch = buildSlackChannel({
      webhookUrl: 'https://hooks.slack.com/fake',
      fetchImpl: null,
      logger: quietLogger,
    });
    const res = await ch.send({ subject: 's', body: 'b' });
    expect(res.reason).toBe('fetch_unavailable');
  });

  it('posts a Block-Kit attachment with priority-mapped color', async () => {
    const spy = makeFetchSpy();
    const ch = buildSlackChannel({
      webhookUrl: 'https://hooks.slack.com/fake',
      fetchImpl: spy.fn,
      logger: quietLogger,
    });

    const res = await ch.send({
      subject: 'CAPA متأخر: CAPA-001',
      body: 'تفاصيل الحدث',
      priority: 'critical',
    });
    expect(res.success).toBe(true);
    expect(spy.calls).toHaveLength(1);
    const body = JSON.parse(spy.calls[0].options.body);
    expect(body.attachments).toHaveLength(1);
    const att = body.attachments[0];
    expect(att.color).toBe(PRIORITY_COLORS.critical);
    expect(att.title).toContain(PRIORITY_ICONS.critical);
    expect(att.title).toContain('CAPA متأخر');
    expect(att.text).toBe('تفاصيل الحدث');
    expect(att.footer).toBe('Al-Awael QMS');
    expect(typeof att.ts).toBe('number');
  });

  it('truncates body to 1500 chars', async () => {
    const spy = makeFetchSpy();
    const ch = buildSlackChannel({
      webhookUrl: 'https://hooks.slack.com/fake',
      fetchImpl: spy.fn,
      logger: quietLogger,
    });
    const bigBody = 'ا'.repeat(3000);
    await ch.send({ subject: 's', body: bigBody });
    const body = JSON.parse(spy.calls[0].options.body);
    expect(body.attachments[0].text.length).toBeLessThanOrEqual(1500);
  });

  it('falls back to normal priority mapping when priority missing', async () => {
    const spy = makeFetchSpy();
    const ch = buildSlackChannel({
      webhookUrl: 'https://hooks.slack.com/fake',
      fetchImpl: spy.fn,
      logger: quietLogger,
    });
    await ch.send({ subject: 's', body: 'b' });
    const body = JSON.parse(spy.calls[0].options.body);
    expect(body.attachments[0].color).toBe(PRIORITY_COLORS.normal);
    expect(body.attachments[0].title).toContain(PRIORITY_ICONS.normal);
  });

  it('records HTTP non-2xx as failure with reason', async () => {
    const spy = makeFetchSpy({ ok: false, status: 500, body: 'internal' });
    const ch = buildSlackChannel({
      webhookUrl: 'https://hooks.slack.com/fake',
      fetchImpl: spy.fn,
      logger: quietLogger,
    });
    const res = await ch.send({ subject: 's', body: 'b' });
    expect(res.success).toBe(false);
    expect(res.reason).toBe('slack_http_500');
  });

  it('captures thrown fetch as error', async () => {
    const ch = buildSlackChannel({
      webhookUrl: 'https://hooks.slack.com/fake',
      fetchImpl: async () => {
        throw new Error('network unreachable');
      },
      logger: quietLogger,
    });
    const res = await ch.send({ subject: 's', body: 'b' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/network unreachable/);
  });

  it('all 4 priority levels produce distinct colors + icons', () => {
    const priorities = ['critical', 'high', 'normal', 'low'];
    const colors = new Set(priorities.map(p => PRIORITY_COLORS[p]));
    const icons = new Set(priorities.map(p => PRIORITY_ICONS[p]));
    expect(colors.size).toBe(4);
    expect(icons.size).toBe(4);
  });
});
