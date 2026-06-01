'use strict';

/**
 * whatsapp-event-bindings-wave727.test.js — W727 scope #5 drift guard.
 *
 * Locks the integrity of the event → template binding registry that links
 * core domain events to pre-approved WhatsApp templates, plus the
 * consent/enablement gating of the dispatcher.
 */

const path = require('path');

const BINDINGS_PATH = path.join(
  __dirname,
  '..',
  'services',
  'whatsapp',
  'whatsappEventBindings.service.js'
);
const TEMPLATES_PATH = path.join(
  __dirname,
  '..',
  'services',
  'whatsapp',
  'whatsappTemplates.service.js'
);

describe('W727 — WhatsApp event → template bindings', () => {
  let bindings;
  let templates;

  beforeAll(() => {
    bindings = require(BINDINGS_PATH);
    templates = require(TEMPLATES_PATH);
  });

  test('registry exposes the expected core events', () => {
    const keys = Object.keys(bindings.EVENT_BINDINGS);
    expect(keys).toEqual(
      expect.arrayContaining([
        'session.reminder',
        'appointment.confirmed',
        'session.cancelled',
        'report.ready',
        'homework.assigned',
        'invoice.created',
        'payment.due',
        'beneficiary.registered',
        'survey.requested',
      ])
    );
  });

  test('every binding maps to a REAL template key + REAL sender function', () => {
    for (const [eventType, b] of Object.entries(bindings.EVENT_BINDINGS)) {
      expect(templates.TEMPLATES[b.templateKey]).toBeDefined();
      expect(typeof templates[b.senderFn]).toBe('function');
      expect(typeof b.map).toBe('function');
      // map must be pure-callable against an empty ctx (returns an object).
      expect(typeof b.map({})).toBe('object');
      // mark eventType used to keep linters happy
      expect(typeof eventType).toBe('string');
    }
  });

  test('listBindings + hasBinding introspection are consistent', () => {
    const list = bindings.listBindings();
    expect(list.length).toBe(Object.keys(bindings.EVENT_BINDINGS).length);
    for (const row of list) {
      expect(bindings.hasBinding(row.eventType)).toBe(true);
      expect(row.templateName).toBe(templates.TEMPLATES[row.templateKey].name);
    }
    expect(bindings.hasBinding('does.not.exist')).toBe(false);
  });

  test('dispatchForEvent refuses unknown events', async () => {
    const res = await bindings.dispatchForEvent('no.such.event', {});
    expect(res).toEqual({ delivered: false, reason: 'no_binding' });
  });

  test('dispatchForEvent refuses when WhatsApp is disabled', async () => {
    const prevToken = process.env.WHATSAPP_API_TOKEN;
    const prevEnabled = process.env.WHATSAPP_ENABLED;
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_ENABLED;
    jest.resetModules();
    const fresh = require(BINDINGS_PATH);
    const res = await fresh.dispatchForEvent('session.reminder', {
      recipient: { phone: '966500000000' },
      guardianName: 'أبو محمد',
    });
    expect(res).toEqual({ delivered: false, reason: 'whatsapp_disabled' });
    if (prevToken !== undefined) process.env.WHATSAPP_API_TOKEN = prevToken;
    if (prevEnabled !== undefined) process.env.WHATSAPP_ENABLED = prevEnabled;
    jest.resetModules();
  });

  test('dispatchForEvent gates consent-required templates behind opt-in', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    jest.resetModules();
    const fresh = require(BINDINGS_PATH);
    const res = await fresh.dispatchForEvent('survey.requested', {
      recipient: { phone: '966500000000' /* no whatsappOptIn */ },
      guardianName: 'أبو محمد',
      beneficiaryName: 'محمد',
      surveyUrl: 'https://x',
    });
    expect(res).toEqual({ delivered: false, reason: 'consent_required' });
    delete process.env.WHATSAPP_ENABLED;
    jest.resetModules();
  });

  test('dispatchForEvent refuses explicit opt-out even for transactional', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    jest.resetModules();
    const fresh = require(BINDINGS_PATH);
    const res = await fresh.dispatchForEvent('session.reminder', {
      recipient: { phone: '966500000000', whatsappOptIn: false },
      guardianName: 'أبو محمد',
    });
    expect(res).toEqual({ delivered: false, reason: 'opted_out' });
    delete process.env.WHATSAPP_ENABLED;
    jest.resetModules();
  });

  test('dispatchForEvent delivers a transactional event through the bound sender', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    jest.resetModules();
    const tmpl = require(TEMPLATES_PATH);
    const spy = jest
      .spyOn(tmpl, 'sendSessionReminder')
      .mockResolvedValue({ success: true, stub: true });
    const fresh = require(BINDINGS_PATH);
    const res = await fresh.dispatchForEvent('session.reminder', {
      recipient: { phone: '966500000000' },
      guardianName: 'أبو محمد',
      beneficiaryName: 'محمد',
      sessionDate: 'الأحد',
      sessionTime: '10:00 ص',
      therapistName: 'أ. سارة',
    });
    expect(res.delivered).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      '966500000000',
      expect.objectContaining({ beneficiaryName: 'محمد', therapistName: 'أ. سارة' })
    );
    spy.mockRestore();
    delete process.env.WHATSAPP_ENABLED;
    jest.resetModules();
  });
});
