/**
 * wave125-parent-chatbot-extended-intents.test.js — Wave 125.
 *
 * Verifies the 5 new intents added in Wave 125 classify correctly +
 * have valid response templates. No service-level changes — registry
 * expansion only.
 *
 * New intents:
 *   - APPOINTMENT_BOOK ("حجز موعد" / "book appointment")
 *   - PAYMENT_METHODS  ("طرق الدفع" / "payment methods")
 *   - CLINIC_HOLIDAYS  ("الإجازات" / "holidays")
 *   - DOCUMENT_REQUEST ("طلب تقرير" / "request report")
 *   - TRANSPORT_INFO   ("التوصيل" / "transport")
 */

'use strict';

const reg = require('../intelligence/parent-chatbot.registry');
const { createParentChatbotService } = require('../intelligence/parent-chatbot.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function buildSessionModel() {
  const store = [];
  function M(data) {
    Object.assign(this, data);
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.findOne = q => ({
    lean: async () => {
      const found = store.find(p => p.sessionId === q.sessionId);
      return found ? { ...found } : null;
    },
    then: resolve => resolve(store.find(p => p.sessionId === q.sessionId) || null),
  });
  M.updateOne = async () => ({ modifiedCount: 0 });
  M._store = store;
  return M;
}

// ─── 1. Registry presence ──────────────────────────────────────────

describe('Wave 125 — registry presence', () => {
  test('all 5 new intents are in INTENTS', () => {
    expect(reg.INTENTS).toContain('appointment.book');
    expect(reg.INTENTS).toContain('payment.methods');
    expect(reg.INTENTS).toContain('clinic.holidays');
    expect(reg.INTENTS).toContain('document.request');
    expect(reg.INTENTS).toContain('transport.info');
  });

  test('each new intent has a non-empty keyword catalogue (both AR + EN)', () => {
    for (const intent of [
      'appointment.book',
      'payment.methods',
      'clinic.holidays',
      'document.request',
      'transport.info',
    ]) {
      const cat = reg.INTENT_KEYWORDS[intent];
      expect(cat).toBeDefined();
      expect(cat.ar.length).toBeGreaterThan(0);
      expect(cat.en.length).toBeGreaterThan(0);
    }
  });

  test('each new intent has a response template', () => {
    expect(reg.RESPONSE_TEMPLATES['appointment.book']).toBeTruthy();
    expect(reg.RESPONSE_TEMPLATES['payment.methods']).toBeTruthy();
    expect(reg.RESPONSE_TEMPLATES['clinic.holidays']).toBeTruthy();
    expect(reg.RESPONSE_TEMPLATES['document.request']).toBeTruthy();
    expect(reg.RESPONSE_TEMPLATES['transport.info']).toBeTruthy();
  });

  test('no new template contains forbidden tokens', () => {
    for (const intent of [
      'appointment.book',
      'payment.methods',
      'clinic.holidays',
      'document.request',
      'transport.info',
    ]) {
      const tmpl = reg.RESPONSE_TEMPLATES[intent];
      expect(reg.forbiddenTokenInTemplate(tmpl)).toBeNull();
    }
  });
});

// ─── 2. Classification — Arabic ───────────────────────────────────

describe('Wave 125 — Arabic classification', () => {
  const cases = [
    { intent: 'appointment.book', messages: ['أريد حجز موعد جديد', 'احجز لي موعد بعد العيد'] },
    { intent: 'payment.methods', messages: ['ما هي طرق الدفع المتاحة', 'كيف أدفع الفواتير'] },
    { intent: 'clinic.holidays', messages: ['هل أنتم مفتوحون في العيد', 'جدول الإجازات'] },
    { intent: 'document.request', messages: ['أحتاج تقرير طبي', 'طلب شهادة لابني'] },
    { intent: 'transport.info', messages: ['هل يوجد باص توصيل', 'استفسار عن المواصلات'] },
  ];

  for (const c of cases) {
    for (const msg of c.messages) {
      test(`"${msg}" → ${c.intent}`, () => {
        const reg2 = require('../intelligence/parent-chatbot.registry');
        const { createParentChatbotService } = require('../intelligence/parent-chatbot.service');
        const svc = createParentChatbotService({
          sessionModel: buildSessionModel(),
          logger: SILENT,
        });
        void reg2;
        const r = svc.classifyIntent(msg);
        expect(r.intent).toBe(c.intent);
      });
    }
  }
});

// ─── 3. Classification — English ──────────────────────────────────

describe('Wave 125 — English classification', () => {
  const cases = [
    { intent: 'appointment.book', message: 'I want to book an appointment' },
    { intent: 'payment.methods', message: 'how can I pay my invoice' },
    { intent: 'clinic.holidays', message: 'are you open on eid' },
    { intent: 'document.request', message: 'I need a medical report' },
    { intent: 'transport.info', message: 'is there a bus service' },
  ];

  for (const c of cases) {
    test(`"${c.message}" → ${c.intent}`, () => {
      const svc = createParentChatbotService({
        sessionModel: buildSessionModel(),
        logger: SILENT,
      });
      const r = svc.classifyIntent(c.message);
      expect(r.intent).toBe(c.intent);
    });
  }
});

// ─── 4. End-to-end via ask() ──────────────────────────────────────

describe('Wave 125 — ask() returns the right template for new intents', () => {
  test('appointment.book template references clinic phone placeholder', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'أريد حجز موعد جديد' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe('appointment.book');
    expect(r.response).toMatch(/\{CLINIC_PHONE\}/);
  });

  test('payment.methods template lists payment options', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'طرق الدفع' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe('payment.methods');
    expect(r.response).toMatch(/مدى|تحويل/);
  });

  test('document.request template mentions turnaround time', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'I need a medical report' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe('document.request');
    expect(r.response).toMatch(/3-5/);
  });

  test('transport.info template directs to reception', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'استفسار عن النقل' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe('transport.info');
    expect(r.response).toMatch(/الاستقبال/);
  });

  test('clinic.holidays template references Saudi Arabia', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'are you open on eid' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe('clinic.holidays');
    expect(r.response).toMatch(/المملكة|السعودية/);
  });
});

// ─── 5. Disambiguation against existing intents ───────────────────

describe('Wave 125 — disambiguation with similar existing intents', () => {
  test('"حجز موعد" picks appointment.book, NOT appointment.next', () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = svc.classifyIntent('حجز موعد');
    expect(r.intent).toBe('appointment.book');
  });

  test('"إلغاء الموعد" still picks appointment.cancel (not the new book)', () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = svc.classifyIntent('إلغاء الموعد');
    expect(r.intent).toBe('appointment.cancel');
  });

  test('"كم رصيدي" stays as invoice.balance (not payment.methods)', () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = svc.classifyIntent('كم رصيدي المستحق');
    expect(r.intent).toBe('invoice.balance');
  });

  test('"عنوان المركز" stays as clinic.address (not transport.info)', () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = svc.classifyIntent('عنوان المركز');
    expect(r.intent).toBe('clinic.address');
  });
});
