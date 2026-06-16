'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, _res, next) => next());

jest.mock('../services/documents/documentSignature.service', () => ({}));
jest.mock('../services/documents/documentVersioning.service', () => ({}));
jest.mock('../services/documents/documentBulk.service', () => ({}));

jest.mock('../services/documents/documentTemplates.engine', () => ({
  generateFromTemplate: jest.fn(),
}));

jest.mock('../services/documents/documentAudit.service', () => ({
  log: jest.fn(),
}));

jest.mock('../services/email', () => ({
  emailManager: {
    send: jest.fn(),
  },
}));

jest.mock('../services/whatsapp', () => ({
  whatsappService: {
    sendText: jest.fn(),
    sendTemplate: jest.fn(),
    sendDocument: jest.fn(),
  },
}));

const templatesEngine = require('../services/documents/documentTemplates.engine');
const auditService = require('../services/documents/documentAudit.service');
const { emailManager } = require('../services/email');
const { whatsappService } = require('../services/whatsapp');
const { InMemoryIdempotencyStore, setStore } = require('../infrastructure/idempotencyStore');

const router = require('../api/routes/documents-pro-extended.routes');

function makeApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, _res, next) => {
    req.user = {
      userId: 'u-1',
      id: 'u-1',
      _id: 'u-1',
      name: 'Test User',
      email: 'test@alawael.local',
    };
    next();
  });
  app.use('/api/documents-pro-ext', router);
  return app;
}

const baseGenerated = {
  success: true,
  documentId: 'doc-123',
  templateName: 'نموذج تجريبي',
  generatedContent: 'هذا نص طويل للمحتوى المولد من القالب',
};

describe('documents-pro-extended /templates/:templateId/deliver', () => {
  let app;

  beforeEach(() => {
    setStore(new InMemoryIdempotencyStore());
    app = makeApp();

    templatesEngine.generateFromTemplate.mockResolvedValue({ ...baseGenerated });
    emailManager.send.mockResolvedValue({ success: true, status: 'sent', messageId: 'em-1' });
    whatsappService.sendText.mockResolvedValue({ success: true, messageId: 'wa-text-1' });
    whatsappService.sendTemplate.mockResolvedValue({ success: true, messageId: 'wa-tpl-1' });
    whatsappService.sendDocument.mockResolvedValue({ success: true, messageId: 'wa-doc-1' });
  });

  test('email-only delivery attaches generated PDF by default', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-1/deliver')
      .send({
        documentTitle: 'تقرير متابعة',
        delivery: {
          email: {
            to: ['family@example.com'],
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(emailManager.send).toHaveBeenCalledTimes(1);
    const payload = emailManager.send.mock.calls[0][0];

    expect(payload.to).toEqual(['family@example.com']);
    expect(Array.isArray(payload.attachments)).toBe(true);
    expect(payload.attachments[0]).toMatchObject({
      filename: expect.stringMatching(/\.pdf$/),
      contentType: 'application/pdf',
    });
    expect(Buffer.isBuffer(payload.attachments[0].content)).toBe(true);

    expect(res.body.delivery.email.success).toBe(true);
    expect(res.body.delivery.whatsapp.skipped).toBe(true);
    expect(res.body.deliverySummary).toMatchObject({
      attempted: 1,
      succeeded: 1,
      failed: 0,
      skipped: 0,
      status: 'delivered',
    });
    expect(auditService.log).toHaveBeenCalled();
  });

  test('email supports pdfOptions without breaking delivery', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-2/deliver')
      .send({
        delivery: {
          email: {
            to: ['qa@example.com'],
            pdfOptions: {
              includeLogo: false,
              footerText: 'AL-AWAEL QA',
              includeGeneratedDateInFooter: false,
              singlePage: true,
            },
          },
        },
      });

    expect(res.status).toBe(200);
    expect(emailManager.send).toHaveBeenCalledTimes(1);
    const payload = emailManager.send.mock.calls[0][0];
    expect(payload.attachments[0].filename).toMatch(/\.pdf$/);
    expect(res.body.delivery.email.success).toBe(true);
  });

  test('email uses TXT attachment when preferPdfAttachment=false', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-2b/deliver')
      .send({
        documentTitle: 'نموذج نصي',
        delivery: {
          email: {
            to: ['text-only@example.com'],
            preferPdfAttachment: false,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(emailManager.send).toHaveBeenCalledTimes(1);
    const payload = emailManager.send.mock.calls[0][0];
    expect(payload.attachments[0]).toMatchObject({
      filename: expect.stringMatching(/\.txt$/),
      contentType: 'text/plain; charset=utf-8',
    });
    expect(Buffer.isBuffer(payload.attachments[0].content)).toBe(true);
  });

  test('whatsapp document mode falls back to text when documentUrl is missing', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-3/deliver')
      .send({
        delivery: {
          whatsapp: {
            to: '+966500000000',
            mode: 'document',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(whatsappService.sendText).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendDocument).not.toHaveBeenCalled();
    expect(res.body.delivery.whatsapp.success).toBe(true);
    expect(res.body.delivery.whatsapp.mode).toBe('document');
  });

  test('whatsapp document mode can be strict (no fallback) when fallbackToText=false', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-4/deliver')
      .send({
        delivery: {
          whatsapp: {
            to: '+966500000001',
            mode: 'document',
            fallbackToText: false,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(whatsappService.sendText).not.toHaveBeenCalled();
    expect(whatsappService.sendDocument).not.toHaveBeenCalled();
    expect(res.body.delivery.whatsapp).toMatchObject({
      success: false,
      skipped: true,
      reason: 'missing_document_url',
    });
  });

  test('whatsapp document mode sends document when documentUrl is provided', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-4b/deliver')
      .send({
        delivery: {
          whatsapp: {
            to: '+966500000002',
            mode: 'document',
            documentUrl: 'https://example.com/files/generated.pdf',
            caption: 'المستند جاهز',
            filename: 'custom-name.pdf',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(whatsappService.sendDocument).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendText).not.toHaveBeenCalled();
    expect(whatsappService.sendDocument).toHaveBeenCalledWith(
      '+966500000002',
      'https://example.com/files/generated.pdf',
      'المستند جاهز',
      expect.objectContaining({
        filename: 'custom-name.pdf',
        reportId: 'doc-123',
      })
    );
    expect(res.body.delivery.whatsapp.success).toBe(true);
    expect(res.body.delivery.whatsapp.mode).toBe('document');
  });

  test('returns channel-level missing_recipient when email recipients are not provided', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-5/deliver')
      .send({
        delivery: {
          email: {
            subject: 'No recipients',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(emailManager.send).not.toHaveBeenCalled();
    expect(res.body.delivery.email).toMatchObject({
      success: false,
      skipped: true,
      reason: 'missing_recipient',
    });
  });

  test('returns 400 when template generation fails', async () => {
    templatesEngine.generateFromTemplate.mockResolvedValue({
      success: false,
      error: 'template_failed',
    });

    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-6/deliver')
      .send({
        delivery: {
          email: { to: ['x@example.com'] },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(emailManager.send).not.toHaveBeenCalled();
    expect(whatsappService.sendText).not.toHaveBeenCalled();
    expect(whatsappService.sendDocument).not.toHaveBeenCalled();
  });

  test('channel exception is isolated and reported as partial when other channel succeeds', async () => {
    emailManager.send.mockRejectedValue(new Error('smtp_down'));

    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-7/deliver')
      .send({
        delivery: {
          email: { to: ['family@example.com'] },
          whatsapp: { to: '+966500000003', mode: 'text', message: 'msg' },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.delivery.email).toMatchObject({
      success: false,
      skipped: false,
      reason: 'send_exception',
      error: 'smtp_down',
    });
    expect(res.body.delivery.whatsapp.success).toBe(true);
    expect(res.body.deliverySummary).toMatchObject({
      attempted: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
      status: 'partial',
    });
  });

  test('all attempted channels failing produce deliverySummary.status=failed', async () => {
    emailManager.send.mockRejectedValue(new Error('smtp_error'));
    whatsappService.sendText.mockRejectedValue(new Error('wa_error'));

    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-8/deliver')
      .send({
        delivery: {
          email: { to: ['ops@example.com'] },
          whatsapp: { to: '+966500000004', mode: 'text' },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.delivery.email.reason).toBe('send_exception');
    expect(res.body.delivery.whatsapp.reason).toBe('send_exception');
    expect(res.body.deliverySummary).toMatchObject({
      attempted: 2,
      succeeded: 0,
      failed: 2,
      skipped: 0,
      status: 'failed',
    });
  });

  test('replays same response when Idempotency-Key is reused on deliver', async () => {
    const key = 'deliver-template-replay-key-001';

    const first = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-9/deliver')
      .set('Idempotency-Key', key)
      .send({
        delivery: {
          email: { to: ['idempotent@example.com'] },
        },
      });

    const second = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-9/deliver')
      .set('Idempotency-Key', key)
      .send({
        delivery: {
          email: { to: ['idempotent@example.com'] },
        },
      });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers['idempotent-replay']).toBe('true');
    expect(second.body).toEqual(first.body);
    expect(templatesEngine.generateFromTemplate).toHaveBeenCalledTimes(1);
    expect(emailManager.send).toHaveBeenCalledTimes(1);
  });

  test('accepts x-client-mutation-id as idempotency key via adapter', async () => {
    const key = 'mut-client-deliver-key-001';

    await request(app)
      .post('/api/documents-pro-ext/templates/tpl-10/deliver')
      .set('x-client-mutation-id', key)
      .send({
        delivery: {
          email: { to: ['queue@example.com'] },
        },
      })
      .expect(200);

    const replay = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-10/deliver')
      .set('x-client-mutation-id', key)
      .send({
        delivery: {
          email: { to: ['queue@example.com'] },
        },
      })
      .expect(200);

    expect(replay.headers['idempotent-replay']).toBe('true');
    expect(templatesEngine.generateFromTemplate).toHaveBeenCalledTimes(1);
    expect(emailManager.send).toHaveBeenCalledTimes(1);
  });

  test('rejects too-short Idempotency-Key with 400 and bypasses generation', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-11/deliver')
      .set('Idempotency-Key', 'short')
      .send({
        delivery: {
          email: { to: ['fail@example.com'] },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_IDEMPOTENCY_KEY');
    expect(templatesEngine.generateFromTemplate).not.toHaveBeenCalled();
    expect(emailManager.send).not.toHaveBeenCalled();
  });

  test('rejects deliver replay when same key is reused with different payload', async () => {
    const key = 'deliver-payload-mismatch-key-001';

    await request(app)
      .post('/api/documents-pro-ext/templates/tpl-12/deliver')
      .set('Idempotency-Key', key)
      .send({
        delivery: {
          email: { to: ['one@example.com'] },
        },
      })
      .expect(200);

    const mismatch = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-12/deliver')
      .set('Idempotency-Key', key)
      .send({
        delivery: {
          email: { to: ['two@example.com'] },
        },
      })
      .expect(409);

    expect(mismatch.body.error).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    expect(templatesEngine.generateFromTemplate).toHaveBeenCalledTimes(1);
    expect(emailManager.send).toHaveBeenCalledTimes(1);
  });
});

describe('documents-pro-extended /templates/:templateId/generate idempotency', () => {
  let app;

  beforeEach(() => {
    setStore(new InMemoryIdempotencyStore());
    app = makeApp();
    templatesEngine.generateFromTemplate.mockResolvedValue({ ...baseGenerated });
  });

  test('replays generate response when Idempotency-Key is reused', async () => {
    const key = 'generate-template-replay-key-001';

    const first = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-1/generate')
      .set('Idempotency-Key', key)
      .send({ variables: { a: 1 }, createDocument: true, documentTitle: 'T1' });

    const second = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-1/generate')
      .set('Idempotency-Key', key)
      .send({ variables: { a: 1 }, createDocument: true, documentTitle: 'T1' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers['idempotent-replay']).toBe('true');
    expect(second.body).toEqual(first.body);
    expect(templatesEngine.generateFromTemplate).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledTimes(1);
  });

  test('accepts x-client-mutation-id for generate idempotency replay', async () => {
    const key = 'mut-client-generate-key-001';

    await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-2/generate')
      .set('x-client-mutation-id', key)
      .send({ variables: { b: 2 } })
      .expect(200);

    const replay = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-2/generate')
      .set('x-client-mutation-id', key)
      .send({ variables: { b: 2 } })
      .expect(200);

    expect(replay.headers['idempotent-replay']).toBe('true');
    expect(templatesEngine.generateFromTemplate).toHaveBeenCalledTimes(1);
  });

  test('rejects too-short idempotency key before generate executes', async () => {
    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-3/generate')
      .set('Idempotency-Key', 'short')
      .send({ variables: { c: 3 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_IDEMPOTENCY_KEY');
    expect(templatesEngine.generateFromTemplate).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  test('returns 409 when same generate idempotency key is already pending', async () => {
    const store = new InMemoryIdempotencyStore();
    setStore(store);
    app = makeApp();

    const headerKey = 'generate-pending-key-001';
    const fullStoreKey =
      'uid:u-1:POST:/api/documents-pro-ext/templates/tpl-g-4/generate:' + headerKey;
    await store.reserve(fullStoreKey);

    const res = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-4/generate')
      .set('Idempotency-Key', headerKey)
      .send({ variables: { d: 4 } });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('IDEMPOTENT_REQUEST_IN_PROGRESS');
    expect(templatesEngine.generateFromTemplate).not.toHaveBeenCalled();
  });

  test('rejects generate replay when same key is reused with different payload', async () => {
    const key = 'generate-payload-mismatch-key-001';

    await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-5/generate')
      .set('Idempotency-Key', key)
      .send({ variables: { lang: 'ar' }, createDocument: true })
      .expect(200);

    const mismatch = await request(app)
      .post('/api/documents-pro-ext/templates/tpl-g-5/generate')
      .set('Idempotency-Key', key)
      .send({ variables: { lang: 'en' }, createDocument: true })
      .expect(409);

    expect(mismatch.body.error).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    expect(templatesEngine.generateFromTemplate).toHaveBeenCalledTimes(1);
  });
});
