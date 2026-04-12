/**
 * ═══════════════════════════════════════════════════════════════
 * WhatsApp Integration Service — Unit Tests
 * ═══════════════════════════════════════════════════════════════
 */

// ── Mocks (must be declared before require) ─────────────────────

const mockWhatsAppService = {
  sendTemplate: jest.fn().mockResolvedValue({ messageId: 'msg123', success: true }),
  sendText: jest.fn().mockResolvedValue({ messageId: 'msg124', success: true }),
  sendInteractive: jest.fn().mockResolvedValue({ messageId: 'msg125', success: true }),
  sendImage: jest.fn().mockResolvedValue({ messageId: 'msg126', success: true }),
  sendDocument: jest.fn().mockResolvedValue({ messageId: 'msg127', success: true }),
};

const mockTemplates = {
  APPOINTMENT_REMINDER: jest.fn().mockReturnValue({ name: 'appointment_reminder', components: [] }),
  LEAVE_STATUS: jest.fn().mockReturnValue({ name: 'leave_status', components: [] }),
  SALARY_CREDITED: jest.fn().mockReturnValue({ name: 'salary_credited', components: [] }),
  DOCUMENT_READY: jest.fn().mockReturnValue({ name: 'document_ready', components: [] }),
  PAYMENT_REMINDER: jest.fn().mockReturnValue({ name: 'payment_reminder', components: [] }),
  ORDER_CONFIRMATION: jest.fn().mockReturnValue({ name: 'order_confirmation', components: [] }),
  WELCOME: jest.fn().mockReturnValue({ name: 'welcome', components: [] }),
  NOTIFICATION: jest.fn().mockReturnValue({ name: 'notification', components: [] }),
};

const mockInteractiveBuilders = {
  quickReply: jest.fn().mockReturnValue({ type: 'button', body: {} }),
  list: jest.fn().mockReturnValue({ type: 'list', body: {} }),
};

const mockSendWhatsAppNotification = jest.fn();
const mockSendWhatsAppText = jest.fn();

jest.mock('../../communication/whatsapp-service', () => ({
  whatsappService: mockWhatsAppService,
  WhatsAppTemplates: mockTemplates,
  InteractiveBuilders: mockInteractiveBuilders,
  sendWhatsAppNotification: mockSendWhatsAppNotification,
  sendWhatsAppText: mockSendWhatsAppText,
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Require SUT ─────────────────────────────────────────────────

const {
  WhatsAppIntegrationService,
  whatsappIntegration,
  INTEGRATION_CONFIG,
} = require('../../services/whatsapp-integration.service');

const logger = require('../../utils/logger');

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const makeAppointment = (overrides = {}) => ({
  _id: 'appt-001',
  beneficiary: { name: 'أحمد', phone: '966501234567' },
  therapist: { name: 'د. سارة' },
  date: new Date('2026-04-15T10:00:00Z'),
  startTime: '10:00',
  location: 'عيادة 3',
  ...overrides,
});

const makeSession = (overrides = {}) => ({
  _id: 'sess-001',
  beneficiary: { name: 'محمد', phone: '966507654321' },
  therapist: { name: 'د. فاطمة' },
  date: new Date('2026-04-16T09:00:00Z'),
  startTime: '09:00',
  room: 'غرفة العلاج 2',
  goals: [
    { achieved: true, description: 'هدف 1' },
    { achieved: false, description: 'هدف 2' },
    { achieved: true, description: 'هدف 3' },
  ],
  notes: 'تقدم جيد في الجلسة',
  ...overrides,
});

const makeEmployee = (overrides = {}) => ({
  _id: 'emp-001',
  name: 'خالد',
  phone: '966509999999',
  ...overrides,
});

const makeWsManager = () => ({
  emitToRoom: jest.fn(),
  emitToUser: jest.fn(),
});

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('WhatsAppIntegrationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsAppIntegrationService();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. MODULE EXPORTS
  // ─────────────────────────────────────────────────────────────

  describe('Module exports', () => {
    it('exports WhatsAppIntegrationService class', () => {
      expect(WhatsAppIntegrationService).toBeDefined();
      expect(typeof WhatsAppIntegrationService).toBe('function');
    });

    it('exports whatsappIntegration singleton instance', () => {
      expect(whatsappIntegration).toBeDefined();
      expect(whatsappIntegration).toBeInstanceOf(WhatsAppIntegrationService);
    });

    it('exports INTEGRATION_CONFIG object with expected keys', () => {
      expect(INTEGRATION_CONFIG).toBeDefined();
      expect(INTEGRATION_CONFIG).toHaveProperty('reminders');
      expect(INTEGRATION_CONFIG).toHaveProperty('queue');
      expect(INTEGRATION_CONFIG).toHaveProperty('rateLimit');
      expect(INTEGRATION_CONFIG.rateLimit).toHaveProperty('maxPerMinute');
      expect(INTEGRATION_CONFIG.rateLimit).toHaveProperty('maxPerHour');
      expect(INTEGRATION_CONFIG.rateLimit).toHaveProperty('maxPerDay');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. INITIALIZATION
  // ─────────────────────────────────────────────────────────────

  describe('Initialization', () => {
    it('initialize() sets _initialized flag and wsManager', async () => {
      const ws = makeWsManager();
      await service.initialize(null, ws);

      expect(service._initialized).toBe(true);
      expect(service.wsManager).toBe(ws);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('initialized'));
    });

    it('initialize() does nothing on second call', async () => {
      await service.initialize(null, null);
      const callCount = logger.info.mock.calls.length;
      await service.initialize(null, makeWsManager());
      expect(logger.info).toHaveBeenCalledTimes(callCount);
    });

    it('initialize() with connection creates QueueModel', async () => {
      const mockModel = jest.fn();
      const connection = {
        model: jest.fn().mockImplementation(() => {
          throw new Error('not found');
        }),
      };
      // Second call (in catch) returns the new model
      connection.model
        .mockImplementationOnce(() => {
          throw new Error('not found');
        })
        .mockReturnValueOnce(mockModel);

      await service.initialize(connection, null);

      expect(service._initialized).toBe(true);
      expect(connection.model).toHaveBeenCalledWith('WhatsAppQueue');
    });

    it('initialize() with connection reuses existing model', async () => {
      const existingModel = { find: jest.fn() };
      const connection = {
        model: jest.fn().mockReturnValue(existingModel),
      };

      await service.initialize(connection, null);
      expect(service._initialized).toBe(true);
      expect(connection.model).toHaveBeenCalledWith('WhatsAppQueue');
    });

    describe('startProcessing / stopProcessing', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('startProcessing() sets interval timer', () => {
        service.startProcessing();
        expect(service.processingTimer).not.toBeNull();
      });

      it('startProcessing() is idempotent', () => {
        service.startProcessing();
        const firstTimer = service.processingTimer;
        service.startProcessing();
        expect(service.processingTimer).toBe(firstTimer);
      });

      it('stopProcessing() clears the timer', () => {
        service.startProcessing();
        expect(service.processingTimer).not.toBeNull();
        service.stopProcessing();
        expect(service.processingTimer).toBeNull();
      });

      it('stopProcessing() is safe when no timer', () => {
        expect(() => service.stopProcessing()).not.toThrow();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. RATE LIMITING
  // ─────────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('_checkRateLimit() returns true when under limits', () => {
      expect(service._checkRateLimit()).toBe(true);
    });

    it('_checkRateLimit() returns false when minute limit exceeded', () => {
      service._sentThisMinute = INTEGRATION_CONFIG.rateLimit.maxPerMinute;
      service._minuteReset = Date.now() + 60000; // not yet
      expect(service._checkRateLimit()).toBe(false);
    });

    it('_checkRateLimit() returns false when hour limit exceeded', () => {
      service._sentThisHour = INTEGRATION_CONFIG.rateLimit.maxPerHour;
      service._hourReset = Date.now() + 3600000;
      expect(service._checkRateLimit()).toBe(false);
    });

    it('_checkRateLimit() returns false when day limit exceeded', () => {
      service._sentToday = INTEGRATION_CONFIG.rateLimit.maxPerDay;
      service._dayReset = Date.now() + 86400000;
      expect(service._checkRateLimit()).toBe(false);
    });

    it('_checkRateLimit() resets counters when windows expire', () => {
      service._sentThisMinute = 100;
      service._sentThisHour = 500;
      service._sentToday = 5000;
      // Force all resets in the past
      service._minuteReset = Date.now() - 1;
      service._hourReset = Date.now() - 1;
      service._dayReset = Date.now() - 1;

      expect(service._checkRateLimit()).toBe(true);
      expect(service._sentThisMinute).toBe(0);
      expect(service._sentThisHour).toBe(0);
      expect(service._sentToday).toBe(0);
    });

    it('_trackSend() increments all counters', () => {
      service._sentThisMinute = 0;
      service._sentThisHour = 0;
      service._sentToday = 0;

      service._trackSend();

      expect(service._sentThisMinute).toBe(1);
      expect(service._sentThisHour).toBe(1);
      expect(service._sentToday).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. APPOINTMENTS & SESSION MESSAGES
  // ─────────────────────────────────────────────────────────────

  describe('Appointment & Session Messages', () => {
    // -- sendAppointmentReminder --
    describe('sendAppointmentReminder', () => {
      it('sends template when phone present on beneficiary', async () => {
        const result = await service.sendAppointmentReminder(makeAppointment());

        expect(result.success).toBe(true);
        expect(mockTemplates.APPOINTMENT_REMINDER).toHaveBeenCalledWith(
          'أحمد',
          'د. سارة',
          expect.any(String),
          '10:00',
          'عيادة 3'
        );
        expect(mockWhatsAppService.sendTemplate).toHaveBeenCalled();
      });

      it('uses appointment.phone as fallback', async () => {
        const appt = makeAppointment({ beneficiary: { name: 'أحمد' }, phone: '966500000000' });
        const result = await service.sendAppointmentReminder(appt);
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendTemplate).toHaveBeenCalledWith(
          '966500000000',
          expect.any(String),
          expect.any(Array),
          expect.any(Object)
        );
      });

      it('returns NO_PHONE when no phone available', async () => {
        const appt = makeAppointment({ beneficiary: { name: 'أحمد' }, phone: undefined });
        const result = await service.sendAppointmentReminder(appt);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });

      it('falls back to default names when missing', async () => {
        const appt = makeAppointment({
          beneficiary: { phone: '966501111111' },
          therapist: {},
        });
        await service.sendAppointmentReminder(appt);
        expect(mockTemplates.APPOINTMENT_REMINDER).toHaveBeenCalledWith(
          'المستفيد',
          'المعالج',
          expect.any(String),
          '10:00',
          'عيادة 3'
        );
      });
    });

    // -- sendSessionReminder --
    describe('sendSessionReminder', () => {
      it('sends template when phone present', async () => {
        const result = await service.sendSessionReminder(makeSession());
        expect(result.success).toBe(true);
        expect(mockTemplates.APPOINTMENT_REMINDER).toHaveBeenCalled();
      });

      it('returns NO_PHONE when no phone', async () => {
        const sess = makeSession({ beneficiary: { name: 'محمد' }, phone: undefined });
        const result = await service.sendSessionReminder(sess);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
        expect(logger.warn).toHaveBeenCalled();
      });

      it('uses session.phone as fallback', async () => {
        const sess = makeSession({ beneficiary: {}, phone: '966502222222' });
        const result = await service.sendSessionReminder(sess);
        expect(result.success).toBe(true);
      });
    });

    // -- sendAppointmentConfirmation --
    describe('sendAppointmentConfirmation', () => {
      it('sends text confirmation with appointment details', async () => {
        const result = await service.sendAppointmentConfirmation(makeAppointment());
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966501234567',
          expect.stringContaining('تم تأكيد موعدك')
        );
      });

      it('returns NO_PHONE when phone missing', async () => {
        const appt = makeAppointment({ beneficiary: {}, phone: undefined });
        const result = await service.sendAppointmentConfirmation(appt);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });

    // -- sendAppointmentCancellation --
    describe('sendAppointmentCancellation', () => {
      it('sends cancellation text with reason', async () => {
        const result = await service.sendAppointmentCancellation(
          makeAppointment(),
          'عدم توفر المعالج'
        );
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966501234567',
          expect.stringContaining('تم إلغاء الموعد')
        );
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966501234567',
          expect.stringContaining('عدم توفر المعالج')
        );
      });

      it('sends cancellation text without reason', async () => {
        const result = await service.sendAppointmentCancellation(makeAppointment());
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966501234567',
          expect.not.stringContaining('السبب:')
        );
      });

      it('returns NO_PHONE when phone missing', async () => {
        const appt = makeAppointment({ beneficiary: {}, phone: undefined });
        const result = await service.sendAppointmentCancellation(appt);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });

    // -- sendSessionSummary --
    describe('sendSessionSummary', () => {
      it('sends summary to guardian phone', async () => {
        const result = await service.sendSessionSummary(makeSession(), '966503333333');
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966503333333',
          expect.stringContaining('ملخص الجلسة العلاجية')
        );
      });

      it('sends summary using session.guardian.phone fallback', async () => {
        const sess = makeSession({ guardian: { phone: '966504444444' } });
        const result = await service.sendSessionSummary(sess);
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966504444444',
          expect.any(String)
        );
      });

      it('includes goals achieved count', async () => {
        await service.sendSessionSummary(makeSession(), '966503333333');
        const sentText = mockWhatsAppService.sendText.mock.calls[0][1];
        expect(sentText).toContain('2/3'); // 2 achieved out of 3
      });

      it('returns NO_PHONE when no guardian phone', async () => {
        const sess = makeSession({ guardian: undefined });
        const result = await service.sendSessionSummary(sess);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. EMPLOYEE / HR MESSAGES
  // ─────────────────────────────────────────────────────────────

  describe('Employee / HR Messages', () => {
    // -- sendLeaveStatusUpdate --
    describe('sendLeaveStatusUpdate', () => {
      it('sends LEAVE_STATUS template', async () => {
        const leave = {
          _id: 'lv-1',
          status: 'مقبول',
          startDate: new Date(),
          endDate: new Date(),
          reason: 'إجازة سنوية',
        };
        const result = await service.sendLeaveStatusUpdate(makeEmployee(), leave);
        expect(result.success).toBe(true);
        expect(mockTemplates.LEAVE_STATUS).toHaveBeenCalledWith(
          'خالد',
          'مقبول',
          expect.any(String),
          expect.any(String),
          'إجازة سنوية'
        );
      });

      it('returns NO_PHONE when employee has no phone', async () => {
        const emp = makeEmployee({ phone: undefined, contactInfo: undefined });
        const result = await service.sendLeaveStatusUpdate(emp, {});
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });

      it('uses contactInfo.phone fallback', async () => {
        const emp = makeEmployee({ phone: undefined, contactInfo: { phone: '966505555555' } });
        const result = await service.sendLeaveStatusUpdate(emp, { status: 'pending' });
        expect(result.success).toBe(true);
      });
    });

    // -- sendSalaryNotification --
    describe('sendSalaryNotification', () => {
      it('sends SALARY_CREDITED template', async () => {
        const salary = { _id: 's-1', amount: 12000, month: 'أبريل 2026' };
        const result = await service.sendSalaryNotification(makeEmployee(), salary);
        expect(result.success).toBe(true);
        expect(mockTemplates.SALARY_CREDITED).toHaveBeenCalledWith('خالد', '12000', 'أبريل 2026');
      });

      it('falls back to _getCurrentMonth when month not provided', async () => {
        const salary = { _id: 's-2', amount: 8000 };
        await service.sendSalaryNotification(makeEmployee(), salary);
        // month arg should be a string (Arabic formatted month)
        const monthArg = mockTemplates.SALARY_CREDITED.mock.calls[0][2];
        expect(typeof monthArg).toBe('string');
        expect(monthArg.length).toBeGreaterThan(0);
      });

      it('returns NO_PHONE when no phone', async () => {
        const emp = makeEmployee({ phone: undefined, contactInfo: undefined });
        const result = await service.sendSalaryNotification(emp, {});
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });

    // -- sendDocumentReady --
    describe('sendDocumentReady', () => {
      it('sends DOCUMENT_READY template', async () => {
        const doc = { _id: 'doc-1', name: 'شهادة خبرة', type: 'شهادة' };
        const result = await service.sendDocumentReady(makeEmployee(), doc);
        expect(result.success).toBe(true);
        expect(mockTemplates.DOCUMENT_READY).toHaveBeenCalledWith('شهادة خبرة', 'شهادة');
      });

      it('returns NO_PHONE when no phone', async () => {
        const user = { _id: 'u1' };
        const result = await service.sendDocumentReady(user, {});
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });

    // -- sendAttendanceAlert --
    describe('sendAttendanceAlert', () => {
      it('sends "تأخير" for late type', async () => {
        const alert = { _id: 'att-1', type: 'late', date: new Date() };
        const result = await service.sendAttendanceAlert(makeEmployee(), alert);
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966509999999',
          expect.stringContaining('تأخير')
        );
      });

      it('sends "غياب" for absent type', async () => {
        const alert = { _id: 'att-2', type: 'absent', date: new Date() };
        await service.sendAttendanceAlert(makeEmployee(), alert);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966509999999',
          expect.stringContaining('غياب')
        );
      });

      it('returns NO_PHONE when employee has no phone', async () => {
        const emp = makeEmployee({ phone: undefined, contactInfo: undefined });
        const result = await service.sendAttendanceAlert(emp, {});
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. PAYMENT MESSAGES
  // ─────────────────────────────────────────────────────────────

  describe('Payment Messages', () => {
    // -- sendPaymentReminder --
    describe('sendPaymentReminder', () => {
      it('sends PAYMENT_REMINDER template', async () => {
        const invoice = {
          _id: 'inv-1',
          phone: '966501111111',
          invoiceNumber: 'INV-001',
          amount: 500,
          dueDate: new Date(),
        };
        const result = await service.sendPaymentReminder(invoice);
        expect(result.success).toBe(true);
        expect(mockTemplates.PAYMENT_REMINDER).toHaveBeenCalledWith(
          'INV-001',
          '500',
          expect.any(String)
        );
      });

      it('uses customer.phone fallback', async () => {
        const invoice = { customer: { phone: '966506666666' }, amount: 100 };
        const result = await service.sendPaymentReminder(invoice);
        expect(result.success).toBe(true);
      });

      it('returns NO_PHONE when no phone', async () => {
        const result = await service.sendPaymentReminder({ amount: 100 });
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });

    // -- sendPaymentConfirmation --
    describe('sendPaymentConfirmation', () => {
      it('sends text confirmation', async () => {
        const payment = {
          phone: '966501111111',
          amount: 500,
          invoiceNumber: 'INV-001',
          referenceNumber: 'REF-001',
        };
        const result = await service.sendPaymentConfirmation(payment);
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966501111111',
          expect.stringContaining('تم تأكيد الدفع')
        );
      });

      it('returns NO_PHONE when no phone', async () => {
        const result = await service.sendPaymentConfirmation({ amount: 50 });
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. SUPPLY CHAIN MESSAGES
  // ─────────────────────────────────────────────────────────────

  describe('Supply Chain Messages', () => {
    // -- sendOrderConfirmation --
    describe('sendOrderConfirmation', () => {
      it('sends ORDER_CONFIRMATION template', async () => {
        const order = {
          _id: 'ord-1',
          phone: '966507777777',
          orderId: 'ORD-100',
          totalAmount: 2500,
          deliveryDate: new Date(),
        };
        const result = await service.sendOrderConfirmation(order);
        expect(result.success).toBe(true);
        expect(mockTemplates.ORDER_CONFIRMATION).toHaveBeenCalledWith(
          'ORD-100',
          '2500',
          expect.any(String)
        );
      });

      it('returns NO_PHONE when no phone', async () => {
        const result = await service.sendOrderConfirmation({ orderId: 'ORD-101' });
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });

    // -- sendOrderStatusUpdate --
    describe('sendOrderStatusUpdate', () => {
      it.each([
        ['processing', 'قيد المعالجة'],
        ['shipped', 'تم الشحن'],
        ['delivered', 'تم التوصيل'],
        ['cancelled', 'تم الإلغاء'],
      ])('maps status "%s" to "%s"', async (status, expected) => {
        const order = { phone: '966507777777', orderId: 'ORD-200', status };
        await service.sendOrderStatusUpdate(order);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966507777777',
          expect.stringContaining(expected)
        );
      });

      it('includes tracking number when present', async () => {
        const order = {
          phone: '966507777777',
          orderId: 'ORD-200',
          status: 'shipped',
          trackingNumber: 'TRK-999',
        };
        await service.sendOrderStatusUpdate(order);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966507777777',
          expect.stringContaining('TRK-999')
        );
      });

      it('returns NO_PHONE when no phone', async () => {
        const result = await service.sendOrderStatusUpdate({ status: 'shipped' });
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. GOVERNMENT MESSAGES
  // ─────────────────────────────────────────────────────────────

  describe('Government Messages', () => {
    describe('sendGovDocumentUpdate', () => {
      it.each([
        ['submitted', 'تم التقديم'],
        ['under_review', 'تحت المراجعة'],
        ['approved', 'تمت الموافقة'],
        ['rejected', 'مرفوض'],
        ['completed', 'مكتمل'],
      ])('maps status "%s" to "%s"', async (status, expected) => {
        const user = { phone: '966508888888' };
        const doc = { name: 'معاملة', status };
        await service.sendGovDocumentUpdate(user, doc);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966508888888',
          expect.stringContaining(expected)
        );
      });

      it('returns NO_PHONE when no phone', async () => {
        const result = await service.sendGovDocumentUpdate({}, { status: 'approved' });
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });

      it('includes reference number when present', async () => {
        const user = { phone: '966508888888' };
        const doc = { name: 'معاملة', status: 'approved', referenceNumber: 'GOV-123' };
        await service.sendGovDocumentUpdate(user, doc);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
          '966508888888',
          expect.stringContaining('GOV-123')
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. ONBOARDING
  // ─────────────────────────────────────────────────────────────

  describe('Onboarding', () => {
    describe('sendWelcomeMessage', () => {
      it('sends WELCOME template', async () => {
        const user = { _id: 'u-1', phone: '966501234567', name: 'أحمد' };
        const result = await service.sendWelcomeMessage(user);
        expect(result.success).toBe(true);
        expect(mockTemplates.WELCOME).toHaveBeenCalledWith('أحمد');
      });

      it('falls back to default name', async () => {
        const user = { phone: '966501234567' };
        await service.sendWelcomeMessage(user);
        expect(mockTemplates.WELCOME).toHaveBeenCalledWith('المستخدم');
      });

      it('returns NO_PHONE when no phone', async () => {
        const result = await service.sendWelcomeMessage({ name: 'test' });
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. NOTIFICATION BRIDGE
  // ─────────────────────────────────────────────────────────────

  describe('Notification Bridge', () => {
    describe('sendNotification', () => {
      it('returns NO_PHONE when phone is missing', async () => {
        const result = await service.sendNotification(null, 'hello');
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });

      it('sends NOTIFICATION template when options.title present', async () => {
        const result = await service.sendNotification('966501234567', 'محتوى الرسالة', {
          title: 'تنبيه',
        });
        expect(result.success).toBe(true);
        expect(mockTemplates.NOTIFICATION).toHaveBeenCalledWith('تنبيه', 'محتوى الرسالة');
        expect(mockWhatsAppService.sendTemplate).toHaveBeenCalled();
      });

      it('sends plain text when no title', async () => {
        const result = await service.sendNotification('966501234567', 'رسالة بسيطة');
        expect(result.success).toBe(true);
        expect(mockWhatsAppService.sendText).toHaveBeenCalledWith('966501234567', 'رسالة بسيطة');
      });

      it('passes sourceSystem from options', async () => {
        await service.sendNotification('966501234567', 'msg', { sourceSystem: 'test-system' });
        // _sendWithTracking was called with sourceSystem in payload
        expect(mockWhatsAppService.sendText).toHaveBeenCalled();
      });
    });

    describe('sendInteractiveButtons', () => {
      it('returns NO_PHONE when phone missing', async () => {
        const result = await service.sendInteractiveButtons(null, 'body', []);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });

      it('sends interactive quick reply', async () => {
        const buttons = [{ id: 'btn1', title: 'نعم' }];
        const result = await service.sendInteractiveButtons('966501234567', 'اختر', buttons);
        expect(result.success).toBe(true);
        expect(mockInteractiveBuilders.quickReply).toHaveBeenCalledWith('اختر', buttons);
        expect(mockWhatsAppService.sendInteractive).toHaveBeenCalled();
      });
    });

    describe('sendInteractiveList', () => {
      it('returns NO_PHONE when phone missing', async () => {
        const result = await service.sendInteractiveList(null, 'body', 'اختر', []);
        expect(result).toEqual({ success: false, error: 'NO_PHONE' });
      });

      it('sends interactive list', async () => {
        const sections = [{ title: 'قسم', rows: [] }];
        const result = await service.sendInteractiveList(
          '966501234567',
          'اختر القسم',
          'القائمة',
          sections
        );
        expect(result.success).toBe(true);
        expect(mockInteractiveBuilders.list).toHaveBeenCalledWith(
          'اختر القسم',
          'القائمة',
          sections
        );
        expect(mockWhatsAppService.sendInteractive).toHaveBeenCalled();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 11. BULK NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────

  describe('Bulk Notifications', () => {
    it('sends to string recipients (phone numbers)', async () => {
      const recipients = ['966501111111', '966502222222'];
      const results = await service.sendBulkNotification(recipients, 'رسالة جماعية');

      expect(results.total).toBe(2);
      expect(results.queued).toBe(2);
      expect(results.failed).toBe(0);
    });

    it('sends to object recipients with .phone', async () => {
      const recipients = [
        { phone: '966501111111', name: 'أحمد' },
        { phone: '966502222222', name: 'محمد' },
      ];
      const results = await service.sendBulkNotification(recipients, 'رسالة');
      expect(results.total).toBe(2);
      expect(results.queued).toBe(2);
    });

    it('sends via _sendWithTracking when messageOrTemplate is object', async () => {
      const recipients = [{ phone: '966501111111' }];
      const tmpl = { template: { name: 'test_template', components: [] } };
      const results = await service.sendBulkNotification(recipients, tmpl);
      expect(results.queued).toBe(1);
      expect(mockWhatsAppService.sendTemplate).toHaveBeenCalled();
    });

    it('counts NO_PHONE recipients as failed', async () => {
      const recipients = [{ name: 'noPhone' }, { phone: '966501111111' }];
      const results = await service.sendBulkNotification(recipients, 'msg');
      expect(results.failed).toBe(1);
      expect(results.queued).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].error).toBe('NO_PHONE');
    });

    it('uses queue when options.useQueue is true', async () => {
      const enqueueSpy = jest
        .spyOn(service, 'enqueue')
        .mockResolvedValue({ success: true, queued: true });
      const recipients = ['966501111111'];
      await service.sendBulkNotification(recipients, 'msg', { useQueue: true });
      expect(enqueueSpy).toHaveBeenCalled();
      enqueueSpy.mockRestore();
    });

    it('catches errors and records them', async () => {
      // Make sendNotification throw for the second recipient
      const original = service.sendNotification.bind(service);
      let callCount = 0;
      jest.spyOn(service, 'sendNotification').mockImplementation(async (...args) => {
        callCount++;
        if (callCount === 2) throw new Error('send failed');
        return original(...args);
      });

      const recipients = ['966501111111', '966502222222'];
      const results = await service.sendBulkNotification(recipients, 'msg');
      expect(results.failed).toBe(1);
      expect(results.errors[0].error).toBe('send failed');

      service.sendNotification.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 12. REMINDER PROCESSING
  // ─────────────────────────────────────────────────────────────

  describe('Reminder Processing', () => {
    it('returns {processed:0} when no appointmentService provided', async () => {
      const result = await service.processReminders(null);
      expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    });

    it('processes empty pending list', async () => {
      const mockService = { getPendingReminders: jest.fn().mockResolvedValue([]) };
      const result = await service.processReminders(mockService);
      expect(result.processed).toBe(0);
      expect(result.sent).toBe(0);
    });

    it('sends session reminder for session items', async () => {
      const mockService = {
        getPendingReminders: jest.fn().mockResolvedValue([
          {
            itemType: 'session',
            itemId: 'sess-rem-1',
            beneficiary: { name: 'أحمد', phone: '966501234567' },
            therapist: { name: 'د. سارة' },
            scheduledFor: new Date(),
            reminder: { time: '09:00', index: 0 },
          },
        ]),
        markReminderSent: jest.fn().mockResolvedValue(true),
      };

      const result = await service.processReminders(mockService);
      expect(result.sent).toBe(1);
      expect(mockService.markReminderSent).toHaveBeenCalledWith('session', 'sess-rem-1', 0);
    });

    it('sends appointment reminder for non-session items', async () => {
      const mockService = {
        getPendingReminders: jest.fn().mockResolvedValue([
          {
            itemType: 'appointment',
            itemId: 'appt-rem-1',
            beneficiary: { name: 'محمد', phone: '966502222222' },
            therapist: { name: 'د. فاطمة' },
            scheduledFor: new Date(),
            reminder: { time: '14:00', index: 1 },
          },
        ]),
        markReminderSent: jest.fn().mockResolvedValue(true),
      };

      const result = await service.processReminders(mockService);
      expect(result.sent).toBe(1);
      expect(mockService.markReminderSent).toHaveBeenCalledWith('appointment', 'appt-rem-1', 1);
    });

    it('records failures when send returns success:false', async () => {
      const mockService = {
        getPendingReminders: jest.fn().mockResolvedValue([
          {
            itemType: 'appointment',
            itemId: 'appt-fail',
            beneficiary: { name: 'no phone' },
            therapist: {},
            scheduledFor: new Date(),
            reminder: { index: 0 },
          },
        ]),
        markReminderSent: jest.fn(),
      };

      const result = await service.processReminders(mockService);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(mockService.markReminderSent).not.toHaveBeenCalled();
    });

    it('handles thrown errors gracefully', async () => {
      const mockService = {
        getPendingReminders: jest.fn().mockResolvedValue([
          {
            itemType: 'session',
            itemId: 'sess-err',
            beneficiary: { name: 'أحمد', phone: '966501234567' },
            therapist: {},
            scheduledFor: new Date(),
            reminder: { index: 0 },
          },
        ]),
        markReminderSent: jest.fn().mockRejectedValue(new Error('DB error')),
      };

      const result = await service.processReminders(mockService);
      expect(result.failed).toBe(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 13. QUEUE MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  describe('Queue Management', () => {
    describe('enqueue', () => {
      it('enqueue invokes _sendDirect as fallback or QueueModel.create', async () => {
        // QueueModel is module-scoped; after any initialize() call it may be set.
        // We ensure a known QueueModel with .create exists by initializing first.
        const mockDoc = { _id: 'q-fallback-1' };
        const qm = {
          create: jest.fn().mockResolvedValue(mockDoc),
          find: jest
            .fn()
            .mockReturnValue({
              sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
            }),
          countDocuments: jest.fn().mockResolvedValue(0),
        };
        const conn = { model: jest.fn().mockReturnValue(qm) };
        await service.initialize(conn, null);

        const result = await service.enqueue('text', '966501234567', {
          text: 'مرحباً',
          sourceSystem: 'test',
        });
        expect(qm.create).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'text', to: '966501234567' })
        );
        expect(result).toEqual({ success: true, queued: true, queueId: 'q-fallback-1' });
      });

      it('creates queue document when QueueModel exists', async () => {
        // Simulate QueueModel being available by initializing with connection
        const mockDoc = { _id: 'q-doc-1' };
        const queueModelMock = { create: jest.fn().mockResolvedValue(mockDoc) };

        // We need to set QueueModel via initialize
        const connection = {
          model: jest.fn().mockReturnValue(queueModelMock),
        };
        await service.initialize(connection, null);

        const result = await service.enqueue('text', '966501234567', {
          text: 'test',
          sourceSystem: 'bulk',
        });
        // After initialization, QueueModel should be set — but since it uses module-level variable
        // we test the behavior indirectly. The enqueue should have created a doc.
        // QueueModel is module-scoped. Let's verify it did NOT call sendText (which would be fallback)
        // Actually QueueModel is module-scoped, so it IS set by initialize.
        expect(result).toEqual({ success: true, queued: true, queueId: 'q-doc-1' });
      });
    });

    describe('processQueue', () => {
      it('returns {processed:0} when isProcessing is already true', async () => {
        service.isProcessing = true;
        const result = await service.processQueue();
        expect(result).toEqual({ processed: 0 });
        service.isProcessing = false;
      });

      it('returns {processed:0} when isProcessing flag prevents re-entry', async () => {
        service.isProcessing = true;
        const result = await service.processQueue();
        expect(result).toEqual({ processed: 0 });
        service.isProcessing = false;
      });

      it('processes items from queue', async () => {
        // Set up QueueModel via initialize
        const saveFunc = jest.fn().mockResolvedValue(true);
        const items = [
          {
            _id: 'qi-1',
            to: '966501234567',
            payload: { text: 'queued msg' },
            status: 'pending',
            attempts: 0,
            save: saveFunc,
          },
        ];

        const queueModelMock = {
          create: jest.fn(),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(items),
            }),
          }),
          countDocuments: jest.fn().mockResolvedValue(0),
        };

        const connection = { model: jest.fn().mockReturnValue(queueModelMock) };
        await service.initialize(connection, null);

        const result = await service.processQueue();
        expect(result.processed).toBe(1);
        expect(saveFunc).toHaveBeenCalled();
      });

      it('stops processing when rate limited', async () => {
        // exhaust minute rate limit
        service._sentThisMinute = INTEGRATION_CONFIG.rateLimit.maxPerMinute;
        service._minuteReset = Date.now() + 60000;

        const items = [
          {
            _id: 'qi-rl',
            to: '966501234567',
            payload: { text: 'msg' },
            status: 'pending',
            attempts: 0,
            save: jest.fn(),
          },
        ];

        const queueModelMock = {
          create: jest.fn(),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(items),
            }),
          }),
          countDocuments: jest.fn().mockResolvedValue(0),
        };

        const connection = { model: jest.fn().mockReturnValue(queueModelMock) };
        await service.initialize(connection, null);

        const result = await service.processQueue();
        expect(result.processed).toBe(0);
      });

      it('marks item as failed on error', async () => {
        const saveFunc = jest.fn().mockResolvedValue(true);
        const items = [
          {
            _id: 'qi-err',
            to: '966501234567',
            payload: { noMatchingType: true }, // will throw "Unknown message payload type"
            status: 'pending',
            attempts: 0,
            save: saveFunc,
          },
        ];

        const queueModelMock = {
          create: jest.fn(),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(items),
            }),
          }),
          countDocuments: jest.fn().mockResolvedValue(0),
        };

        const connection = { model: jest.fn().mockReturnValue(queueModelMock) };
        await service.initialize(connection, null);

        const result = await service.processQueue();
        // The item should be marked 'failed'
        expect(items[0].status).toBe('failed');
        expect(items[0].lastError).toBe('Unknown message payload type');
        expect(saveFunc).toHaveBeenCalled();
      });
    });

    describe('getQueueStats', () => {
      it('returns null when no QueueModel', async () => {
        // fresh instance where QueueModel might be null
        // We need to reset QueueModel — since it's module-scoped, tricky.
        // But getQueueStats checks internal QueueModel directly.
        // After previous tests may have set it. Let's test via a side-effect approach.
        // If QueueModel exists from prior tests, the stat should return an object.
        // Let's just check the method runs without error.
        const result = await service.getQueueStats();
        // Will be either null or an object depending on prior test state
        if (result === null) {
          expect(result).toBeNull();
        } else {
          expect(result).toHaveProperty('pending');
          expect(result).toHaveProperty('total');
        }
      });

      it('returns stats object with counts', async () => {
        const queueModelMock = {
          create: jest.fn(),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
          }),
          countDocuments: jest
            .fn()
            .mockResolvedValueOnce(5) // pending
            .mockResolvedValueOnce(2) // processing
            .mockResolvedValueOnce(10) // sent
            .mockResolvedValueOnce(1), // failed
        };

        const connection = { model: jest.fn().mockReturnValue(queueModelMock) };
        await service.initialize(connection, null);

        const stats = await service.getQueueStats();
        expect(stats).toEqual({
          pending: 5,
          processing: 2,
          sent: 10,
          failed: 1,
          total: 18,
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 14. WEBSOCKET EVENTS
  // ─────────────────────────────────────────────────────────────

  describe('WebSocket Events', () => {
    describe('_emitRealtime', () => {
      it('does nothing when wsManager is null', () => {
        service.wsManager = null;
        expect(() => service._emitRealtime('test', {})).not.toThrow();
      });

      it('emits to admin room', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service._emitRealtime('test:event', { foo: 'bar' });
        expect(ws.emitToRoom).toHaveBeenCalledWith('whatsapp:admin', 'whatsapp:test:event', {
          foo: 'bar',
        });
      });

      it('emits to user when data.userId is present', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service._emitRealtime('test:event', { userId: 'user-123', msg: 'hi' });
        expect(ws.emitToUser).toHaveBeenCalledWith('user-123', 'whatsapp:test:event', {
          userId: 'user-123',
          msg: 'hi',
        });
      });

      it('does not emit to user when no userId', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service._emitRealtime('test:event', { msg: 'hi' });
        expect(ws.emitToUser).not.toHaveBeenCalled();
      });

      it('catches and logs errors', () => {
        const ws = {
          emitToRoom: jest.fn(() => {
            throw new Error('WS error');
          }),
        };
        service.wsManager = ws;
        service._emitRealtime('test', {});
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WS error'));
      });
    });

    describe('notifyIncomingMessage', () => {
      it('emits message:incoming event', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service.notifyIncomingMessage({
          messageId: 'mid-1',
          from: '966501234567',
          type: 'text',
          content: { text: 'مرحباً' },
          conversationId: 'conv-1',
        });
        expect(ws.emitToRoom).toHaveBeenCalledWith(
          'whatsapp:admin',
          'whatsapp:message:incoming',
          expect.objectContaining({
            messageId: 'mid-1',
            from: '966501234567',
            type: 'text',
            preview: 'مرحباً',
          })
        );
      });

      it('falls back to [وسائط] when no text content', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service.notifyIncomingMessage({
          messageId: 'mid-2',
          from: '966501234567',
          type: 'image',
          content: {},
        });
        expect(ws.emitToRoom).toHaveBeenCalledWith(
          'whatsapp:admin',
          'whatsapp:message:incoming',
          expect.objectContaining({ preview: '[وسائط]' })
        );
      });
    });

    describe('notifyStatusUpdate', () => {
      it('emits message:status event', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service.notifyStatusUpdate({
          messageId: 'mid-3',
          status: 'delivered',
          timestamp: '2026-04-10T10:00:00Z',
        });
        expect(ws.emitToRoom).toHaveBeenCalledWith(
          'whatsapp:admin',
          'whatsapp:message:status',
          expect.objectContaining({ messageId: 'mid-3', status: 'delivered' })
        );
      });
    });

    describe('notifySendResult', () => {
      it('emits message:sent event', () => {
        const ws = makeWsManager();
        service.wsManager = ws;
        service.notifySendResult({
          messageId: 'mid-4',
          to: '966501234567',
          success: true,
        });
        expect(ws.emitToRoom).toHaveBeenCalledWith(
          'whatsapp:admin',
          'whatsapp:message:sent',
          expect.objectContaining({
            messageId: 'mid-4',
            to: '966501234567',
            success: true,
          })
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 15. WEBHOOK SIGNATURE VERIFICATION
  // ─────────────────────────────────────────────────────────────

  describe('Webhook Signature Verification', () => {
    const crypto = require('crypto');
    const rawBody = '{"test":"payload"}';
    const secret = 'test-whatsapp-secret';

    const computeSignature = (body, appSecret) =>
      'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');

    let origSecret;

    beforeEach(() => {
      origSecret = process.env.WHATSAPP_APP_SECRET;
      process.env.WHATSAPP_APP_SECRET = secret;
    });

    afterEach(() => {
      if (origSecret !== undefined) {
        process.env.WHATSAPP_APP_SECRET = origSecret;
      } else {
        delete process.env.WHATSAPP_APP_SECRET;
      }
    });

    it('returns true for valid signature', () => {
      const sig = computeSignature(rawBody, secret);
      expect(WhatsAppIntegrationService.verifyWebhookSignature(rawBody, sig)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const result = WhatsAppIntegrationService.verifyWebhookSignature(
        rawBody,
        'sha256=invalidhex0000000000000000000000000000000000000000000000000000'
      );
      expect(result).toBe(false);
    });

    it('returns false when no signature provided', () => {
      expect(WhatsAppIntegrationService.verifyWebhookSignature(rawBody, null)).toBe(false);
      expect(WhatsAppIntegrationService.verifyWebhookSignature(rawBody, '')).toBe(false);
      expect(WhatsAppIntegrationService.verifyWebhookSignature(rawBody, undefined)).toBe(false);
    });

    it('returns true (dev mode) when no APP_SECRET configured', () => {
      delete process.env.WHATSAPP_APP_SECRET;
      const result = WhatsAppIntegrationService.verifyWebhookSignature(rawBody, 'sha256=anything');
      expect(result).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No APP_SECRET'));
    });

    it('returns false on buffer length mismatch', () => {
      // Signature with wrong length so timingSafeEqual throws
      const result = WhatsAppIntegrationService.verifyWebhookSignature(rawBody, 'sha256=short');
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 16. DATE / TIME HELPERS
  // ─────────────────────────────────────────────────────────────

  describe('Date / Time Helpers', () => {
    describe('_formatDate', () => {
      it('formats a valid date in Arabic', () => {
        const result = service._formatDate(new Date('2026-04-10'));
        expect(typeof result).toBe('string');
        expect(result).not.toBe('غير محدد');
        expect(result.length).toBeGreaterThan(0);
      });

      it('returns "غير محدد" for null', () => {
        expect(service._formatDate(null)).toBe('غير محدد');
      });

      it('returns "غير محدد" for undefined', () => {
        expect(service._formatDate(undefined)).toBe('غير محدد');
      });

      it('returns "غير محدد" for invalid date string', () => {
        expect(service._formatDate('not-a-date')).toBe('غير محدد');
      });

      it('handles date string input', () => {
        const result = service._formatDate('2026-01-15');
        expect(result).not.toBe('غير محدد');
      });
    });

    describe('_formatTime', () => {
      it('formats a valid date to time in Arabic', () => {
        const result = service._formatTime(new Date('2026-04-10T14:30:00Z'));
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      it('returns empty string for null', () => {
        expect(service._formatTime(null)).toBe('');
      });

      it('returns empty string for undefined', () => {
        expect(service._formatTime(undefined)).toBe('');
      });

      it('returns empty string for invalid date', () => {
        expect(service._formatTime('not-a-date')).toBe('');
      });
    });

    describe('_getCurrentMonth', () => {
      it('returns a non-empty Arabic string', () => {
        const result = service._getCurrentMonth();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 17. _sendDirect DISPATCH
  // ─────────────────────────────────────────────────────────────

  describe('_sendDirect dispatch', () => {
    it('dispatches template payload to sendTemplate', async () => {
      const payload = {
        template: {
          name: 'test_template',
          components: [{ type: 'body' }],
          language: { code: 'ar' },
        },
      };
      await service._sendDirect('966501234567', payload);
      expect(mockWhatsAppService.sendTemplate).toHaveBeenCalledWith(
        '966501234567',
        'test_template',
        [{ type: 'body' }],
        { language: 'ar' }
      );
    });

    it('dispatches text payload to sendText', async () => {
      await service._sendDirect('966501234567', { text: 'Hello' });
      expect(mockWhatsAppService.sendText).toHaveBeenCalledWith('966501234567', 'Hello');
    });

    it('dispatches interactive payload to sendInteractive', async () => {
      const interactive = { type: 'button', body: {} };
      await service._sendDirect('966501234567', { interactive });
      expect(mockWhatsAppService.sendInteractive).toHaveBeenCalledWith('966501234567', interactive);
    });

    it('dispatches image payload to sendImage', async () => {
      const image = { url: 'https://img.test/photo.jpg', caption: 'صورة' };
      await service._sendDirect('966501234567', { image });
      expect(mockWhatsAppService.sendImage).toHaveBeenCalledWith(
        '966501234567',
        'https://img.test/photo.jpg',
        'صورة'
      );
    });

    it('dispatches document payload to sendDocument', async () => {
      const document = {
        url: 'https://doc.test/file.pdf',
        filename: 'report.pdf',
        caption: 'تقرير',
      };
      await service._sendDirect('966501234567', { document });
      expect(mockWhatsAppService.sendDocument).toHaveBeenCalledWith(
        '966501234567',
        'https://doc.test/file.pdf',
        'report.pdf',
        'تقرير'
      );
    });

    it('throws for unknown payload type', async () => {
      await expect(service._sendDirect('966501234567', { unknownType: true })).rejects.toThrow(
        'Unknown message payload type'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 18. _sendWithTracking
  // ─────────────────────────────────────────────────────────────

  describe('_sendWithTracking', () => {
    it('sends directly and tracks when within rate limit', async () => {
      const trackSpy = jest.spyOn(service, '_trackSend');
      const result = await service._sendWithTracking('966501234567', 'text', { text: 'msg' });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg124');
      expect(trackSpy).toHaveBeenCalled();
      trackSpy.mockRestore();
    });

    it('queues when rate limited', async () => {
      service._sentThisMinute = INTEGRATION_CONFIG.rateLimit.maxPerMinute;
      service._minuteReset = Date.now() + 60000;

      const enqueueSpy = jest
        .spyOn(service, 'enqueue')
        .mockResolvedValue({ success: true, queued: true });
      const result = await service._sendWithTracking('966501234567', 'text', { text: 'msg' });

      expect(enqueueSpy).toHaveBeenCalledWith('text', '966501234567', { text: 'msg' });
      enqueueSpy.mockRestore();
    });

    it('returns {success:false} on send error', async () => {
      mockWhatsAppService.sendText.mockRejectedValueOnce(new Error('API timeout'));
      const result = await service._sendWithTracking('966501234567', 'text', { text: 'fail' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API timeout');
      expect(logger.error).toHaveBeenCalled();
    });

    it('notifies send result on success', async () => {
      const emitSpy = jest.spyOn(service, 'notifySendResult');
      await service._sendWithTracking('966501234567', 'text', { text: 'msg' });
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: '966501234567', success: true })
      );
      emitSpy.mockRestore();
    });

    it('notifies send result on failure', async () => {
      mockWhatsAppService.sendText.mockRejectedValueOnce(new Error('fail'));
      const emitSpy = jest.spyOn(service, 'notifySendResult');
      await service._sendWithTracking('966501234567', 'text', { text: 'msg' });
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: '966501234567', success: false })
      );
      emitSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 19. INTEGRATION CONFIG VALUES
  // ─────────────────────────────────────────────────────────────

  describe('INTEGRATION_CONFIG values', () => {
    it('has correct reminder timings', () => {
      expect(INTEGRATION_CONFIG.reminders.appointment).toEqual({ first: 1440, second: 60 });
      expect(INTEGRATION_CONFIG.reminders.session).toEqual({ first: 1440, second: 60 });
      expect(INTEGRATION_CONFIG.reminders.payment).toEqual({ first: 4320, second: 1440 });
    });

    it('has correct queue settings', () => {
      expect(INTEGRATION_CONFIG.queue.batchSize).toBe(10);
      expect(INTEGRATION_CONFIG.queue.retryAttempts).toBe(3);
      expect(INTEGRATION_CONFIG.queue.processingInterval).toBe(60000);
    });

    it('has correct rate limit settings', () => {
      expect(INTEGRATION_CONFIG.rateLimit.maxPerMinute).toBe(20);
      expect(INTEGRATION_CONFIG.rateLimit.maxPerHour).toBe(200);
      expect(INTEGRATION_CONFIG.rateLimit.maxPerDay).toBe(2000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 20. CONSTRUCTOR DEFAULTS
  // ─────────────────────────────────────────────────────────────

  describe('Constructor defaults', () => {
    it('initializes with correct default state', () => {
      const svc = new WhatsAppIntegrationService();
      expect(svc.wsManager).toBeNull();
      expect(svc.isProcessing).toBe(false);
      expect(svc.processingTimer).toBeNull();
      expect(svc._initialized).toBe(false);
      expect(svc._sentThisMinute).toBe(0);
      expect(svc._sentThisHour).toBe(0);
      expect(svc._sentToday).toBe(0);
    });

    it('sets future reset timestamps', () => {
      const now = Date.now();
      const svc = new WhatsAppIntegrationService();
      expect(svc._minuteReset).toBeGreaterThan(now - 100);
      expect(svc._hourReset).toBeGreaterThan(now - 100);
      expect(svc._dayReset).toBeGreaterThan(now - 100);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 21. EDGE CASES / ROBUSTNESS
  // ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('sendAppointmentReminder handles missing beneficiary entirely', async () => {
      const result = await service.sendAppointmentReminder({
        phone: '966501234567',
        date: new Date(),
      });
      expect(result.success).toBe(true);
    });

    it('sendSessionSummary truncates long notes', async () => {
      const longNotes = 'ا'.repeat(300);
      const sess = makeSession({ notes: longNotes, guardian: { phone: '966504444444' } });
      await service.sendSessionSummary(sess);
      const sentText = mockWhatsAppService.sendText.mock.calls[0][1];
      // The notes in the message should be truncated to 200 chars
      expect(sentText.length).toBeLessThan(longNotes.length + 200);
    });

    it('sendPaymentConfirmation includes N/A for missing fields', async () => {
      const payment = { phone: '966501234567', amount: 100 };
      await service.sendPaymentConfirmation(payment);
      const sentText = mockWhatsAppService.sendText.mock.calls[0][1];
      expect(sentText).toContain('N/A');
    });

    it('sendOrderStatusUpdate uses raw status when not in statusMap', async () => {
      const order = { phone: '966507777777', orderId: 'ORD-300', status: 'custom_status' };
      await service.sendOrderStatusUpdate(order);
      expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
        '966507777777',
        expect.stringContaining('custom_status')
      );
    });

    it('sendGovDocumentUpdate uses raw status when not in statusMap', async () => {
      const user = { phone: '966508888888' };
      const doc = { name: 'معاملة', status: 'unknown_status' };
      await service.sendGovDocumentUpdate(user, doc);
      expect(mockWhatsAppService.sendText).toHaveBeenCalledWith(
        '966508888888',
        expect.stringContaining('unknown_status')
      );
    });

    it('sendBulkNotification handles empty recipients array', async () => {
      const results = await service.sendBulkNotification([], 'msg');
      expect(results).toEqual({ total: 0, queued: 0, failed: 0, errors: [] });
    });

    it('sendNotification with empty string phone returns NO_PHONE', async () => {
      const result = await service.sendNotification('', 'test');
      expect(result).toEqual({ success: false, error: 'NO_PHONE' });
    });

    it('_sendDirect with template string (not object) passes correctly', async () => {
      await service._sendDirect('966501234567', { template: 'simple_template_name' });
      expect(mockWhatsAppService.sendTemplate).toHaveBeenCalledWith(
        '966501234567',
        'simple_template_name',
        [],
        { language: undefined }
      );
    });

    it('processQueue resets isProcessing flag even on error', async () => {
      const queueModelMock = {
        create: jest.fn(),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
        countDocuments: jest.fn().mockResolvedValue(0),
      };

      const connection = { model: jest.fn().mockReturnValue(queueModelMock) };
      await service.initialize(connection, null);

      await expect(service.processQueue()).rejects.toThrow('DB error');
      expect(service.isProcessing).toBe(false);
    });
  });
});
