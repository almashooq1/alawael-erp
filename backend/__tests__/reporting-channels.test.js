/**
 * reporting-channels.test.js — Phase 10 Commit 2.
 *
 * Each channel adapter is a thin wrapper that marshals the engine's
 * (payload, recipients) contract into whatever the underlying service
 * expects, then marshals the result back into
 * `{ success, providerMessageId?, error? }`. Tests pin that marshalling.
 */

'use strict';

const {
  buildChannels,
  createEmailChannel,
  createSmsChannel,
  createWhatsAppChannel,
  createInAppChannel,
  createPortalInboxChannel,
  createPdfDownloadChannel,
} = require('../services/reporting/channels');
const { buildSmsBody, MAX_SMS_LEN } = require('../services/reporting/channels/sms.channel');

const basePayload = {
  subject: 'Weekly update',
  bodyHtml: '<p>ok</p>',
  bodyText: 'ok',
  reportId: 'r.x',
  instanceKey: 'r.x:2026-W17:global',
  confidentiality: 'restricted',
  locale: 'ar',
  attachments: [],
};

describe('email channel', () => {
  test('calls emailService.send with joined recipients and returns providerMessageId', async () => {
    const emailService = {
      send: jest.fn(async () => ({ emailId: 'em-1', success: true })),
    };
    const ch = createEmailChannel({ emailService });
    const res = await ch.send(basePayload, [
      { id: 'u1', email: 'a@x.sa' },
      { id: 'u2', email: 'b@x.sa' },
    ]);
    expect(res).toEqual({ success: true, providerMessageId: 'em-1' });
    expect(emailService.send).toHaveBeenCalledTimes(1);
    const args = emailService.send.mock.calls[0][0];
    expect(args.to).toEqual(['a@x.sa', 'b@x.sa']);
    expect(args.subject).toBe('Weekly update');
    expect(args.html).toBe('<p>ok</p>');
  });

  test('returns failure when no recipient has an email', async () => {
    const ch = createEmailChannel({ emailService: { send: jest.fn() } });
    const res = await ch.send(basePayload, [{ id: 'u1' }]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no email/);
  });

  test('surfaces provider failure as {success:false, error}', async () => {
    const emailService = {
      send: jest.fn(async () => ({ success: false, error: 'bounce' })),
    };
    const ch = createEmailChannel({ emailService });
    const res = await ch.send(basePayload, [{ id: 'u1', email: 'a@x.sa' }]);
    expect(res.success).toBe(false);
    expect(res.error).toBe('bounce');
  });

  test('propagates thrown errors', async () => {
    const emailService = {
      send: jest.fn(async () => {
        throw new Error('smtp down');
      }),
    };
    const ch = createEmailChannel({ emailService });
    const res = await ch.send(basePayload, [{ id: 'u1', email: 'a@x.sa' }]);
    expect(res.success).toBe(false);
    expect(res.error).toBe('smtp down');
  });
});

describe('sms channel', () => {
  test('buildSmsBody truncates long content and preserves link tail', () => {
    const p = {
      subject: 'Your weekly update is ready. '.repeat(20),
      link: 'https://portal.example/abc',
    };
    const body = buildSmsBody(p);
    expect(body.length).toBeLessThanOrEqual(MAX_SMS_LEN);
    expect(body).toContain('https://portal.example/abc');
  });

  test('refuses to send confidential reports', async () => {
    const ch = createSmsChannel({ smsService: { send: jest.fn() } });
    const res = await ch.send({ ...basePayload, confidentiality: 'confidential' }, [
      { id: 'u1', phone: '+966500000001' },
    ]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/refused/);
  });

  test('aggregates per-recipient results, success if any succeed', async () => {
    let call = 0;
    const smsService = {
      send: jest.fn(async ({ to }) => {
        call += 1;
        if (to.endsWith('02')) throw new Error('bad number');
        return { smsId: `s${call}` };
      }),
    };
    const ch = createSmsChannel({ smsService });
    const res = await ch.send(basePayload, [
      { id: 'u1', phone: '+966500000001' },
      { id: 'u2', phone: '+966500000002' },
    ]);
    expect(res.success).toBe(true);
    expect(res.partial).toBe(true);
    expect(res.results.length).toBe(2);
  });
});

describe('whatsapp channel', () => {
  test('uses sendDocument when PDF attachment present', async () => {
    const whatsappService = {
      sendText: jest.fn(),
      sendDocument: jest.fn(async () => ({ messages: [{ id: 'wa-1' }] })),
    };
    const ch = createWhatsAppChannel({ whatsappService });
    const res = await ch.send(
      {
        ...basePayload,
        attachments: [
          { filename: 'report.pdf', url: 'https://x/a.pdf', contentType: 'application/pdf' },
        ],
      },
      [{ id: 'g1', phone: '+966500000001' }]
    );
    expect(res.success).toBe(true);
    expect(whatsappService.sendDocument).toHaveBeenCalled();
    expect(whatsappService.sendText).not.toHaveBeenCalled();
  });

  test('falls back to sendText when no PDF', async () => {
    const whatsappService = {
      sendText: jest.fn(async () => ({ messageId: 'wa-2' })),
      sendDocument: jest.fn(),
    };
    const ch = createWhatsAppChannel({ whatsappService });
    const res = await ch.send({ ...basePayload, link: 'https://portal/x' }, [
      { id: 'g1', phone: '+966500000001' },
    ]);
    expect(res.success).toBe(true);
    expect(whatsappService.sendText).toHaveBeenCalled();
    const [, text] = whatsappService.sendText.mock.calls[0];
    expect(text).toContain('https://portal/x');
  });

  test('refuses confidential reports', async () => {
    const ch = createWhatsAppChannel({ whatsappService: { sendText: jest.fn() } });
    const res = await ch.send({ ...basePayload, confidentiality: 'confidential' }, [
      { id: 'g1', phone: '+966500000001' },
    ]);
    expect(res.success).toBe(false);
  });
});

describe('in-app channel', () => {
  test('creates a Notification doc per recipient and returns its id', async () => {
    const created = [];
    const NotificationModel = {
      model: {
        create: jest.fn(async doc => {
          const row = { _id: `n_${created.length + 1}`, ...doc };
          created.push(row);
          return row;
        }),
      },
    };
    const ch = createInAppChannel({ NotificationModel });
    const res = await ch.send(basePayload, [{ id: 'u1' }, { id: 'u2' }]);
    expect(res.success).toBe(true);
    expect(NotificationModel.model.create).toHaveBeenCalledTimes(2);
    expect(res.results.every(x => x.success)).toBe(true);
  });
});

describe('portal inbox channel', () => {
  test('stores once via artifactStore and returns artifactUri', async () => {
    const artifactStore = {
      store: jest.fn(async () => ({ uri: 's3://bucket/r.x/2026-W17.pdf', id: 'art-1' })),
    };
    const ch = createPortalInboxChannel({ artifactStore });
    const res = await ch.send(basePayload, [{ id: 'u1' }, { id: 'u2' }]);
    expect(res.success).toBe(true);
    expect(artifactStore.store).toHaveBeenCalledTimes(1);
    expect(res.artifactUri).toMatch(/^s3:\/\//);
  });

  test('bubbles errors up as {success:false}', async () => {
    const ch = createPortalInboxChannel({
      artifactStore: {
        store: async () => {
          throw new Error('s3 denied');
        },
      },
    });
    const res = await ch.send(basePayload, [{ id: 'u1' }]);
    expect(res.success).toBe(false);
    expect(res.error).toBe('s3 denied');
  });
});

describe('pdf download channel', () => {
  test('requires a PDF attachment OR an existing artifactUri', async () => {
    const ch = createPdfDownloadChannel({
      artifactStore: { store: jest.fn() },
      urlSigner: { sign: jest.fn() },
    });
    const res = await ch.send(basePayload, [{ id: 'u1' }]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no pdf/);
  });

  test('mints a signed URL when PDF available', async () => {
    const artifactStore = {
      store: jest.fn(async () => ({ uri: 's3://b/x.pdf', id: 'a1' })),
    };
    const urlSigner = {
      sign: jest.fn(async () => ({
        url: 'https://cdn.example/x.pdf?sig=abc',
        id: 'sig-1',
        expiresAt: new Date().toISOString(),
      })),
    };
    const ch = createPdfDownloadChannel({ artifactStore, urlSigner });
    const res = await ch.send(
      {
        ...basePayload,
        attachments: [
          { filename: 'r.pdf', content: Buffer.from('x'), contentType: 'application/pdf' },
        ],
      },
      [{ id: 'u1' }]
    );
    expect(res.success).toBe(true);
    expect(res.url).toContain('https://');
  });
});

describe('buildChannels factory', () => {
  test('only wires channels whose dependencies are present', () => {
    const out = buildChannels({
      emailService: { send: jest.fn() },
      NotificationModel: { model: { create: jest.fn() } },
      // no sms / whatsapp / artifactStore
    });
    expect(out.email).toBeDefined();
    expect(out.in_app).toBeDefined();
    expect(out.sms).toBeUndefined();
    expect(out.whatsapp).toBeUndefined();
    expect(out.portal_inbox).toBeUndefined();
    expect(out.pdf_download).toBeUndefined();
  });

  test('pdf_download requires both artifactStore and urlSigner', () => {
    const partial = buildChannels({ artifactStore: { store: jest.fn() } });
    expect(partial.portal_inbox).toBeDefined();
    expect(partial.pdf_download).toBeUndefined();
    const full = buildChannels({
      artifactStore: { store: jest.fn() },
      urlSigner: { sign: jest.fn() },
    });
    expect(full.pdf_download).toBeDefined();
  });
});
