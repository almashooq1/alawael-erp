/* eslint-disable no-unused-vars */

/**
 * WhatsApp Service Tests - اختبارات خدمة الوتساب
 */

// Set env vars BEFORE requiring the module (whatsappConfig reads process.env at load time)
process.env.WHATSAPP_PROVIDER = 'cloud_api';
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_verify_token';

const { WhatsAppService, WhatsAppTemplates, InteractiveBuilders } = require('../whatsapp-service');

// Mock axios
jest.mock('axios');

jest.mock('../../rbac', () => ({
  createRBACMiddleware: () => (req, res, next) => next(),
  checkPermission: () => (req, res, next) => next(),
  RBAC_ROLES: {},
  RBAC_PERMISSIONS: {},
}));
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test', role: 'admin', permissions: ['*'] };
    next();
  },
  requireAdmin: (req, res, next) => next(),
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123', role: 'admin', permissions: ['*'] };
    next();
  },
  requireRole:
    (...r) =>
    (req, res, next) =>
      next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => {
    req.user = { id: 'user123', role: 'admin' };
    next();
  },
  authorize:
    (...r) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...r) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => {
    req.user = { id: 'user123', role: 'admin' };
    next();
  },
}));
describe('WhatsAppService', () => {
  let whatsappService;

  beforeEach(() => {
    whatsappService = new WhatsAppService();
    process.env.WHATSAPP_PROVIDER = 'cloud_api';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_verify_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with cloud_api provider', () => {
      whatsappService.provider = 'cloud_api';
      whatsappService.client = whatsappService.createCloudApiClient();

      expect(whatsappService.client.type).toBe('cloud_api');
      expect(whatsappService.client.phoneNumberId).toBe('test_phone_id');
    });

    it('should initialize with twilio provider', () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest00000000000000000000000000';
      process.env.TWILIO_AUTH_TOKEN = 'test_token_00000000000000000000';
      process.env.TWILIO_WHATSAPP_NUMBER = '+1234567890';

      whatsappService.provider = 'twilio';
      whatsappService.client = whatsappService.createTwilioClient();

      expect(whatsappService.client.type).toBe('twilio');
    });

    it('should initialize with local provider', () => {
      process.env.WHATSAPP_API_URL = 'https://test.com/api';
      process.env.WHATSAPP_API_KEY = 'test_key';

      whatsappService.provider = 'local';
      whatsappService.client = whatsappService.createLocalClient();

      expect(whatsappService.client.type).toBe('local');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format Saudi phone number correctly', () => {
      const formatted = whatsappService.formatPhoneNumber('0501234567');
      expect(formatted).toBe('966501234567');
    });

    it('should handle already formatted number', () => {
      const formatted = whatsappService.formatPhoneNumber('966501234567');
      expect(formatted).toBe('966501234567');
    });

    it('should remove non-digit characters', () => {
      const formatted = whatsappService.formatPhoneNumber('+966 50 123 4567');
      expect(formatted).toBe('966501234567');
    });

    it('should handle number with country code', () => {
      const formatted = whatsappService.formatPhoneNumber('966501234567');
      expect(formatted).toBe('966501234567');
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      const id1 = whatsappService.generateMessageId();
      const id2 = whatsappService.generateMessageId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^wa_\d+_[a-f0-9]+$/);
    });
  });

  describe('Message Preview', () => {
    it('should return text preview for text messages', () => {
      const preview = whatsappService.getMessagePreview('text', { text: 'Hello World' });
      expect(preview).toBe('Hello World');
    });

    it('should truncate long text', () => {
      const longText = 'A'.repeat(200);
      const preview = whatsappService.getMessagePreview('text', { text: longText });
      expect(preview.length).toBeLessThanOrEqual(100);
    });

    it('should return [صورة] for image without caption', () => {
      const preview = whatsappService.getMessagePreview('image', {});
      expect(preview).toBe('[صورة]');
    });

    it('should return caption for image with caption', () => {
      const preview = whatsappService.getMessagePreview('image', { caption: 'My Photo' });
      expect(preview).toBe('My Photo');
    });

    it('should return [رسالة صوتية] for audio', () => {
      const preview = whatsappService.getMessagePreview('audio', {});
      expect(preview).toBe('[رسالة صوتية]');
    });

    it('should return [موقع] for location', () => {
      const preview = whatsappService.getMessagePreview('location', { location: {} });
      expect(preview).toContain('[موقع]');
    });
  });

  describe('Cloud API Message Building', () => {
    it('should build text message correctly', () => {
      const message = whatsappService.buildCloudApiMessage('966501234567', 'text', {
        text: 'Hello',
      });

      expect(message.messaging_product).toBe('whatsapp');
      expect(message.to).toBe('966501234567');
      expect(message.type).toBe('text');
      expect(message.text.body).toBe('Hello');
    });

    it('should build image message with URL', () => {
      const message = whatsappService.buildCloudApiMessage('966501234567', 'image', {
        mediaUrl: 'https://example.com/image.jpg',
        caption: 'My Image',
      });

      expect(message.type).toBe('image');
      expect(message.image.link).toBe('https://example.com/image.jpg');
      expect(message.image.caption).toBe('My Image');
    });

    it('should build image message with media ID', () => {
      const message = whatsappService.buildCloudApiMessage('966501234567', 'image', {
        mediaId: 'media_123',
        caption: 'My Image',
      });

      expect(message.image.id).toBe('media_123');
    });

    it('should build document message', () => {
      const message = whatsappService.buildCloudApiMessage('966501234567', 'document', {
        mediaUrl: 'https://example.com/doc.pdf',
        filename: 'invoice.pdf',
        caption: 'Invoice',
      });

      expect(message.type).toBe('document');
      expect(message.document.link).toBe('https://example.com/doc.pdf');
      expect(message.document.filename).toBe('invoice.pdf');
    });

    it('should build location message', () => {
      const location = { latitude: 24.7136, longitude: 46.6753, name: 'Riyadh', address: 'KSA' };
      const message = whatsappService.buildCloudApiMessage('966501234567', 'location', {
        location,
      });

      expect(message.type).toBe('location');
      expect(message.location.latitude).toBe(24.7136);
      expect(message.location.name).toBe('Riyadh');
    });

    it('should include reply context when provided', () => {
      const message = whatsappService.buildCloudApiMessage(
        '966501234567',
        'text',
        { text: 'Reply' },
        'previous_message_id'
      );

      expect(message.context.message_id).toBe('previous_message_id');
    });
  });

  describe('Webhook Verification', () => {
    it('should verify webhook with correct token', () => {
      const result = whatsappService.verifyWebhook(
        'subscribe',
        'test_verify_token',
        'challenge_value'
      );

      expect(result.success).toBe(true);
      expect(result.challenge).toBe('challenge_value');
    });

    it('should fail verification with wrong token', () => {
      const result = whatsappService.verifyWebhook('subscribe', 'wrong_token', 'challenge_value');

      expect(result.success).toBe(false);
    });

    it('should fail verification with wrong mode', () => {
      const result = whatsappService.verifyWebhook(
        'unsubscribe',
        'test_verify_token',
        'challenge_value'
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Webhook Handlers', () => {
    it('should register webhook handler', () => {
      const handler = jest.fn();
      whatsappService.on('message', handler);

      expect(whatsappService.webhookHandlers['message']).toContain(handler);
    });

    it('should trigger registered handlers', async () => {
      const handler = jest.fn();
      whatsappService.on('message', handler);

      await whatsappService.triggerWebhookHandler('message', { test: true });

      expect(handler).toHaveBeenCalledWith({ test: true });
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();

      whatsappService.on('test', errorHandler);
      whatsappService.on('test', successHandler);

      await whatsappService.triggerWebhookHandler('test', {});

      // Should still call success handler even after error
      expect(successHandler).toHaveBeenCalled();
    });
  });
});

describe('WhatsAppTemplates', () => {
  describe('OTP_VERIFICATION', () => {
    it('should create OTP template with correct parameters', () => {
      const template = WhatsAppTemplates.OTP_VERIFICATION('123456', 5);

      expect(template.name).toBe('otp_verification');
      expect(template.language.code).toBe('ar');
      expect(template.components[0].type).toBe('body');
      expect(template.components[0].parameters[0].text).toBe('123456');
      expect(template.components[0].parameters[1].text).toBe('5');
    });
  });

  describe('WELCOME', () => {
    it('should create welcome template', () => {
      const template = WhatsAppTemplates.WELCOME('أحمد');

      expect(template.name).toBe('welcome_message');
      expect(template.components[0].parameters[0].text).toBe('أحمد');
    });
  });

  describe('APPOINTMENT_REMINDER', () => {
    it('should create appointment reminder template', () => {
      const template = WhatsAppTemplates.APPOINTMENT_REMINDER(
        'محمد',
        'د. أحمد',
        '2024-01-15',
        '10:00',
        'عيادة الرياض'
      );

      expect(template.name).toBe('appointment_reminder');
      expect(template.components[0].parameters).toHaveLength(5);
    });
  });

  describe('NOTIFICATION', () => {
    it('should create notification template', () => {
      const template = WhatsAppTemplates.NOTIFICATION('تنبيه', 'هذه رسالة تجريبية');

      expect(template.name).toBe('notification');
      expect(template.components[0].parameters[0].text).toBe('تنبيه');
      expect(template.components[0].parameters[1].text).toBe('هذه رسالة تجريبية');
    });
  });
});

describe('InteractiveBuilders', () => {
  describe('quickReply', () => {
    it('should build quick reply buttons', () => {
      const interactive = InteractiveBuilders.quickReply('اختر أحد الخيارات', [
        { id: 'yes', title: 'نعم' },
        { id: 'no', title: 'لا' },
      ]);

      expect(interactive.type).toBe('button');
      expect(interactive.body.text).toBe('اختر أحد الخيارات');
      expect(interactive.action.buttons).toHaveLength(2);
      expect(interactive.action.buttons[0].reply.id).toBe('yes');
      expect(interactive.action.buttons[0].reply.title).toBe('نعم');
    });

    it('should auto-generate button IDs if not provided', () => {
      const interactive = InteractiveBuilders.quickReply('اختر', [
        { title: 'الخيار الأول' },
        { title: 'الخيار الثاني' },
      ]);

      expect(interactive.action.buttons[0].reply.id).toBe('btn_0');
      expect(interactive.action.buttons[1].reply.id).toBe('btn_1');
    });
  });

  describe('list', () => {
    it('should build list message', () => {
      const interactive = InteractiveBuilders.list('اختر من القائمة', 'عرض الخيارات', [
        {
          title: 'القسم الأول',
          rows: [{ id: 'opt1', title: 'الخيار 1', description: 'وصف الخيار' }],
        },
      ]);

      expect(interactive.type).toBe('list');
      expect(interactive.body.text).toBe('اختر من القائمة');
      expect(interactive.action.button).toBe('عرض الخيارات');
      expect(interactive.action.sections).toHaveLength(1);
      expect(interactive.action.sections[0].rows).toHaveLength(1);
    });
  });

  describe('callToAction', () => {
    it('should build CTA URL message', () => {
      const interactive = InteractiveBuilders.callToAction(
        'اضغط للمزيد',
        'زيارة الموقع',
        'https://example.com'
      );

      expect(interactive.type).toBe('cta_url');
      expect(interactive.body.text).toBe('اضغط للمزيد');
      expect(interactive.action.parameters.display_text).toBe('زيارة الموقع');
      expect(interactive.action.parameters.url).toBe('https://example.com');
    });
  });

  describe('locationRequest', () => {
    it('should build location request message', () => {
      const interactive = InteractiveBuilders.locationRequest('أرسل موقعك');

      expect(interactive.type).toBe('location_request_message');
      expect(interactive.body.text).toBe('أرسل موقعك');
      expect(interactive.action.name).toBe('send_location');
    });
  });
});

describe('Error Handling', () => {
  let whatsappService;

  beforeEach(() => {
    whatsappService = new WhatsAppService();
    whatsappService.client = {
      type: 'cloud_api',
      phoneNumberId: 'test_id',
      accessToken: 'test_token',
      apiUrl: 'https://graph.facebook.com/v18.0',
    };
  });

  it('should throw error for unsupported message type', () => {
    expect(() => {
      whatsappService.buildCloudApiMessage('966501234567', 'unsupported', {});
    }).toThrow('Unsupported message type');
  });

  it('should handle missing required fields gracefully', () => {
    // Test with empty content
    const message = whatsappService.buildCloudApiMessage('966501234567', 'text', {});
    expect(message.text.body).toBeUndefined();
  });
});

describe('Conversation Management', () => {
  let whatsappService;

  beforeEach(() => {
    whatsappService = new WhatsAppService();
  });

  it('should generate conversation ID without database', async () => {
    const conversationId = await whatsappService.getOrCreateConversation('966501234567');
    expect(conversationId).toMatch(/^conv_966501234567$/);
  });
});

describe('Rate Limiting Configuration', () => {
  it('should have default rate limits', () => {
    const { whatsappConfig } = require('../whatsapp-service');

    expect(whatsappConfig.rateLimit.maxPerMinute).toBe(20);
    expect(whatsappConfig.rateLimit.maxPerHour).toBe(200);
    expect(whatsappConfig.rateLimit.maxPerDay).toBe(2000);
  });
});
