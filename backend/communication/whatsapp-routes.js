/* eslint-disable no-unused-vars */
/**
 * WhatsApp Routes - مسارات الوتساب
 * REST API endpoints for WhatsApp messaging
 */

const express = require('express');
const router = express.Router();
const {
  whatsappService,
  WhatsAppTemplates,
  InteractiveBuilders,
  sendWhatsAppOTP,
  sendWhatsAppNotification,
  sendWhatsAppText,
  sendWhatsAppImage,
  sendWhatsAppDocument,
} = require('./whatsapp-service');

// Rate limiter middleware
const rateLimiter = require('../middleware/rateLimiter');

// Safe fallback — use apiLimiter or generalLimiter if specific limiters don't exist
const whatsappLimiter =
  rateLimiter.whatsappLimiter || rateLimiter.apiLimiter || rateLimiter.generalLimiter;
const otpLimiter = rateLimiter.otpLimiter || rateLimiter.apiLimiter || rateLimiter.generalLimiter;
const bulkLimiter = rateLimiter.bulkLimiter || rateLimiter.apiLimiter || rateLimiter.generalLimiter;

const { authenticate, authorize } = require('../middleware/auth');
const crypto = require('crypto');
const logger = require('../utils/logger');
const {
  WhatsAppIntegrationService,
  whatsappIntegration,
} = require('../services/whatsapp-integration.service');

// OTP model for real verification
const { OTP: WhatsAppOTP } = require('./whatsapp-models');
const safeError = require('../utils/safeError');

/**
 * Simple schema-based request validation middleware.
 * Checks required fields and enum values from a JSON schema descriptor.
 */
const validateRequest = schema => (req, res, next) => {
  if (!schema || !schema.body) return next();
  const { required = [], properties = {} } = schema.body;
  for (const field of required) {
    if (req.body[field] === undefined || req.body[field] === null) {
      return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
    }
  }
  for (const [field, rules] of Object.entries(properties)) {
    if (req.body[field] !== undefined && rules.enum && !rules.enum.includes(req.body[field])) {
      return res.status(400).json({
        success: false,
        error: `Invalid value for ${field}. Allowed: ${rules.enum.join(', ')}`,
      });
    }
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: WhatsApp messaging API
 */

/**
 * Validation schemas
 */
const sendMessageSchema = {
  body: {
    type: 'object',
    required: ['to', 'type'],
    properties: {
      to: { type: 'string' },
      type: {
        type: 'string',
        enum: [
          'text',
          'image',
          'video',
          'document',
          'audio',
          'location',
          'contacts',
          'interactive',
        ],
      },
      content: { type: 'object' },
      metadata: { type: 'object' },
      replyTo: { type: 'string' },
    },
  },
};

const sendTemplateSchema = {
  body: {
    type: 'object',
    required: ['to', 'templateName'],
    properties: {
      to: { type: 'string' },
      templateName: { type: 'string' },
      language: { type: 'string' },
      components: { type: 'array' },
      metadata: { type: 'object' },
    },
  },
};

const sendBulkSchema = {
  body: {
    type: 'object',
    required: ['recipients', 'message'],
    properties: {
      recipients: { type: 'array', items: { type: 'object' } },
      message: { type: 'object' },
      options: { type: 'object' },
    },
  },
};

// ============================================
// WEBHOOK ENDPOINTS (No authentication required)
// ============================================

/**
 * @route   GET /api/whatsapp/webhook
 * @desc    Verify WhatsApp webhook
 * @access  Public
 */
router.get('/webhook', async (req, res) => {
  try {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

    const result = whatsappService.verifyWebhook(mode, token, challenge);

    if (result.success) {
      logger.info('✅ WhatsApp webhook verified');
      return res.status(200).send(result.challenge);
    }

    logger.info('❌ WhatsApp webhook verification failed');
    return res.status(403).json({ error: 'Verification failed' });
  } catch (error) {
    safeError(res, error, 'Webhook verification error');
  }
});

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Receive WhatsApp webhook events
 * @access  Public
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature (X-Hub-Signature-256)
    const signature = req.headers['x-hub-signature-256'];
    if (signature && req.rawBody) {
      const isValid = WhatsAppIntegrationService.verifyWebhookSignature(req.rawBody, signature);
      if (!isValid) {
        logger.warn('⚠️ WhatsApp webhook signature verification failed');
        return res.status(403).json({ error: 'Invalid signature' });
      }
    }

    // Process the webhook payload
    const result = await whatsappService.processWebhook(req.body);

    // Push real-time events to frontend
    if (result.processed?.length > 0) {
      for (const item of result.processed) {
        if (item.success && item.messageId) {
          whatsappIntegration.notifyIncomingMessage(item);
        }
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: 'received' });

    // Log processing result
    if (result.processed?.length > 0) {
      logger.info(`📧 Processed ${result.processed.length} WhatsApp event(s)`);
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Still return 200 to avoid retries
    res.status(200).json({ status: 'error', message: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * @route   POST /api/whatsapp/send
 * @desc    Send a WhatsApp message
 * @access  Private
 */
router.post(
  '/send',
  authenticate,
  whatsappLimiter,
  validateRequest(sendMessageSchema),
  async (req, res) => {
    try {
      const { to, type, content, metadata, replyTo } = req.body;

      const result = await whatsappService.send({
        to,
        type,
        content,
        metadata: {
          ...metadata,
          userId: req.user?.id,
          tenantId: req.user?.tenantId,
        },
        replyTo,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'Send WhatsApp error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/send/text
 * @desc    Send text message
 * @access  Private
 */
router.post('/send/text', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, text, metadata, replyTo } = req.body;

    if (!to || !text) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and text are required',
      });
    }

    const result = await sendWhatsAppText(to, text, {
      metadata: {
        ...metadata,
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
      },
      replyTo,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send text error');
  }
});

/**
 * @route   POST /api/whatsapp/send/template
 * @desc    Send template message
 * @access  Private
 */
router.post(
  '/send/template',
  authenticate,
  whatsappLimiter,
  validateRequest(sendTemplateSchema),
  async (req, res) => {
    try {
      const { to, templateName, language, components, metadata } = req.body;

      const result = await whatsappService.sendTemplate(to, templateName, components || [], {
        language,
        metadata: {
          ...metadata,
          userId: req.user?.id,
          tenantId: req.user?.tenantId,
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'Send template error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/send/image
 * @desc    Send image message
 * @access  Private
 */
router.post('/send/image', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, imageUrl, caption, metadata } = req.body;

    if (!to || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and image URL are required',
      });
    }

    const result = await sendWhatsAppImage(to, imageUrl, caption);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send image error');
  }
});

/**
 * @route   POST /api/whatsapp/send/document
 * @desc    Send document message
 * @access  Private
 */
router.post('/send/document', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, documentUrl, filename, caption, metadata } = req.body;

    if (!to || !documentUrl || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, document URL, and filename are required',
      });
    }

    const result = await sendWhatsAppDocument(to, documentUrl, filename, caption);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send document error');
  }
});

/**
 * @route   POST /api/whatsapp/send/video
 * @desc    Send video message
 * @access  Private
 */
router.post('/send/video', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, videoUrl, caption, metadata } = req.body;

    if (!to || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and video URL are required',
      });
    }

    const result = await whatsappService.sendVideo(to, videoUrl, caption, {
      metadata: {
        ...metadata,
        userId: req.user?.id,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send video error');
  }
});

/**
 * @route   POST /api/whatsapp/send/location
 * @desc    Send location message
 * @access  Private
 */
router.post('/send/location', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, latitude, longitude, name, address, metadata } = req.body;

    if (!to || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, latitude, and longitude are required',
      });
    }

    const result = await whatsappService.sendLocation(to, latitude, longitude, name, address, {
      metadata: {
        ...metadata,
        userId: req.user?.id,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send location error');
  }
});

/**
 * @route   POST /api/whatsapp/send/interactive
 * @desc    Send interactive message (buttons/list)
 * @access  Private
 */
router.post('/send/interactive', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, interactive, metadata } = req.body;

    if (!to || !interactive) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and interactive content are required',
      });
    }

    const result = await whatsappService.sendInteractive(to, interactive, {
      metadata: {
        ...metadata,
        userId: req.user?.id,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send interactive error');
  }
});

/**
 * @route   POST /api/whatsapp/send/bulk
 * @desc    Send bulk messages
 * @access  Private (Admin only)
 */
router.post(
  '/send/bulk',
  authenticate,
  authorize('admin', 'manager'),
  bulkLimiter,
  validateRequest(sendBulkSchema),
  async (req, res) => {
    try {
      const { recipients, message, options } = req.body;

      if (!recipients || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Recipients array is required',
        });
      }

      // Limit bulk size
      if (recipients.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 1000 recipients per bulk request',
        });
      }

      const result = await whatsappService.sendBulk(recipients, message, {
        ...options,
        metadata: {
          ...options?.metadata,
          userId: req.user?.id,
          tenantId: req.user?.tenantId,
        },
      });

      const successful = result.filter(r => r.success).length;
      const failed = result.filter(r => !r.success).length;

      res.json({
        success: true,
        data: {
          total: recipients.length,
          successful,
          failed,
          results: result,
        },
      });
    } catch (error) {
      safeError(res, error, 'Send bulk error');
    }
  }
);

// ============================================
// OTP ENDPOINTS
// ============================================

/**
 * @route   POST /api/whatsapp/otp/send
 * @desc    Send OTP via WhatsApp
 * @access  Public
 */
router.post('/otp/send', otpLimiter, async (req, res) => {
  try {
    const { phoneNumber, purpose = 'verification' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiry = 5; // 5 minutes

    // Store OTP in database
    await WhatsAppOTP.create({
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      tenantId: req.user?.tenantId || '000000000000000000000000',
      code: otp,
      purpose,
      expiresAt: new Date(Date.now() + expiry * 60 * 1000),
    });

    const result = await sendWhatsAppOTP(phoneNumber, otp, expiry);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: expiry * 60, // seconds
    });
  } catch (error) {
    safeError(res, error, 'Send OTP error');
  }
});

/**
 * @route   POST /api/whatsapp/otp/verify
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/otp/verify', whatsappLimiter, async (req, res) => {
  try {
    const { phoneNumber, otp, purpose = 'verification' } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required',
      });
    }

    // Find the most recent unexpired, unused OTP for this phone number
    const otpRecord = await WhatsAppOTP.findOne({
      phoneNumber: { $regex: phoneNumber.replace(/\D/g, '').slice(-9) + '$' },
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'OTP expired or not found',
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= (otpRecord.maxAttempts || 5)) {
      return res.status(429).json({
        success: false,
        verified: false,
        error: 'Maximum verification attempts exceeded',
      });
    }

    // Increment attempts
    otpRecord.attempts += 1;

    if (otpRecord.code !== otp) {
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid OTP code',
      });
    }

    // Mark as used
    otpRecord.isUsed = true;
    otpRecord.usedAt = new Date();
    await otpRecord.save();

    res.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    safeError(res, error, 'Verify OTP error');
  }
});

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

/**
 * @route   POST /api/whatsapp/notify
 * @desc    Send notification via WhatsApp
 * @access  Private
 */
router.post('/notify', authenticate, whatsappLimiter, async (req, res) => {
  try {
    const { to, title, message, template, templateData } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    let result;

    if (template && WhatsAppTemplates[template]) {
      // Use predefined template
      const templateFn = WhatsAppTemplates[template];
      const templateContent = templateFn(...(templateData || []));

      result = await whatsappService.sendTemplate(
        to,
        templateContent.name,
        templateContent.components,
        {
          language: templateContent.language?.code,
          metadata: { userId: req.user?.id },
        }
      );
    } else {
      // Send simple notification
      result = await sendWhatsAppNotification(to, title || 'تنبيه', message || '');
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Send notification error');
  }
});

// ============================================
// CONVERSATION ENDPOINTS
// ============================================

/**
 * @route   GET /api/whatsapp/conversations
 * @desc    Get all conversations
 * @access  Private
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { status, assignedTo, limit, skip } = req.query;

    const conversations = await whatsappService.getConversations({
      status,
      assignedTo,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
    });

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    safeError(res, error, 'Get conversations error');
  }
});

/**
 * @route   GET /api/whatsapp/conversations/:conversationId/messages
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit, skip, before, after } = req.query;

    const messages = await whatsappService.getConversationMessages(conversationId, {
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
      before,
      after,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    safeError(res, error, 'Get messages error');
  }
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================

/**
 * @route   GET /api/whatsapp/stats
 * @desc    Get message statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;

    const stats = await whatsappService.getStats({
      startDate,
      endDate,
      tenantId: tenantId || req.user?.tenantId,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    safeError(res, error, 'Get stats error');
  }
});

// ============================================
// MEDIA ENDPOINTS
// ============================================

/**
 * @route   GET /api/whatsapp/media/:mediaId
 * @desc    Get media URL
 * @access  Private
 */
router.get('/media/:mediaId', authenticate, async (req, res) => {
  try {
    const { mediaId } = req.params;

    const mediaUrl = await whatsappService.getMediaUrl(mediaId);

    res.json({
      success: true,
      data: { mediaUrl },
    });
  } catch (error) {
    safeError(res, error, 'Get media error');
  }
});

/**
 * @route   POST /api/whatsapp/media/upload
 * @desc    Upload media
 * @access  Private
 */
router.post('/media/upload', authenticate, async (req, res) => {
  try {
    // This would handle file upload
    // For now, return placeholder
    res.json({
      success: true,
      message: 'Media upload endpoint ready',
    });
  } catch (error) {
    safeError(res, error, 'Upload media error');
  }
});

// ============================================
// MARK AS READ
// ============================================

/**
 * @route   POST /api/whatsapp/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.post('/messages/:messageId/read', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await whatsappService.markAsRead(messageId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, 'Mark as read error');
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * @route   POST /api/whatsapp/interactive/buttons
 * @desc    Build interactive button message
 * @access  Private
 */
router.post('/interactive/buttons', authenticate, async (req, res) => {
  try {
    const { bodyText, buttons } = req.body;

    if (!bodyText || !buttons || buttons.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Body text and buttons are required',
      });
    }

    const interactive = InteractiveBuilders.quickReply(bodyText, buttons);

    res.json({
      success: true,
      data: interactive,
    });
  } catch (error) {
    safeError(res, error, 'Build buttons error');
  }
});

/**
 * @route   POST /api/whatsapp/interactive/list
 * @desc    Build interactive list message
 * @access  Private
 */
router.post('/interactive/list', authenticate, async (req, res) => {
  try {
    const { bodyText, buttonText, sections } = req.body;

    if (!bodyText || !buttonText || !sections || sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Body text, button text, and sections are required',
      });
    }

    const interactive = InteractiveBuilders.list(bodyText, buttonText, sections);

    res.json({
      success: true,
      data: interactive,
    });
  } catch (error) {
    safeError(res, error, 'Build list error');
  }
});

/**
 * @route   GET /api/whatsapp/templates
 * @desc    Get available templates
 * @access  Private
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = Object.keys(WhatsAppTemplates);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    safeError(res, error, 'Get templates error');
  }
});

/**
 * @route   GET /api/whatsapp/health
 * @desc    Health check for WhatsApp service
 * @access  Public
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'WhatsApp',
    provider: whatsappService.provider,
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// INTEGRATION ENDPOINTS (New)
// ============================================

/**
 * @route   POST /api/whatsapp/integration/appointment-reminder
 * @desc    Send appointment reminder via WhatsApp
 * @access  Private - admin, therapist, system_admin
 */
router.post(
  '/integration/appointment-reminder',
  authenticate,
  authorize(['admin', 'therapist', 'system_admin']),
  async (req, res) => {
    try {
      const { appointment } = req.body;
      if (!appointment) {
        return res.status(400).json({ success: false, error: 'appointment object is required' });
      }
      const result = await whatsappIntegration.sendAppointmentReminder(appointment);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Appointment reminder error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/session-reminder
 * @desc    Send therapy session reminder via WhatsApp
 * @access  Private - admin, therapist, system_admin
 */
router.post(
  '/integration/session-reminder',
  authenticate,
  authorize(['admin', 'therapist', 'system_admin']),
  async (req, res) => {
    try {
      const { session } = req.body;
      if (!session) {
        return res.status(400).json({ success: false, error: 'session object is required' });
      }
      const result = await whatsappIntegration.sendSessionReminder(session);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Session reminder error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/appointment-confirmation
 * @desc    Send appointment confirmation via WhatsApp
 * @access  Private
 */
router.post(
  '/integration/appointment-confirmation',
  authenticate,
  authorize(['admin', 'therapist', 'system_admin']),
  async (req, res) => {
    try {
      const { appointment } = req.body;
      if (!appointment) {
        return res.status(400).json({ success: false, error: 'appointment object is required' });
      }
      const result = await whatsappIntegration.sendAppointmentConfirmation(appointment);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Appointment confirmation error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/session-summary
 * @desc    Send therapy session summary to guardian
 * @access  Private
 */
router.post(
  '/integration/session-summary',
  authenticate,
  authorize(['admin', 'therapist', 'system_admin']),
  async (req, res) => {
    try {
      const { session, guardianPhone } = req.body;
      if (!session) {
        return res.status(400).json({ success: false, error: 'session object is required' });
      }
      const result = await whatsappIntegration.sendSessionSummary(session, guardianPhone);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Session summary error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/leave-status
 * @desc    Send leave status update to employee
 * @access  Private - admin, hr, system_admin
 */
router.post(
  '/integration/leave-status',
  authenticate,
  authorize(['admin', 'hr', 'system_admin']),
  async (req, res) => {
    try {
      const { employee, leaveData } = req.body;
      if (!employee || !leaveData) {
        return res
          .status(400)
          .json({ success: false, error: 'employee and leaveData are required' });
      }
      const result = await whatsappIntegration.sendLeaveStatusUpdate(employee, leaveData);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Leave status error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/salary-notification
 * @desc    Send salary notification to employee
 * @access  Private - admin, hr, finance, system_admin
 */
router.post(
  '/integration/salary-notification',
  authenticate,
  authorize(['admin', 'hr', 'finance', 'system_admin']),
  async (req, res) => {
    try {
      const { employee, salaryData } = req.body;
      if (!employee || !salaryData) {
        return res
          .status(400)
          .json({ success: false, error: 'employee and salaryData are required' });
      }
      const result = await whatsappIntegration.sendSalaryNotification(employee, salaryData);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Salary notification error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/payment-reminder
 * @desc    Send payment reminder
 * @access  Private - admin, finance, system_admin
 */
router.post(
  '/integration/payment-reminder',
  authenticate,
  authorize(['admin', 'finance', 'system_admin']),
  async (req, res) => {
    try {
      const { invoiceData } = req.body;
      if (!invoiceData) {
        return res.status(400).json({ success: false, error: 'invoiceData is required' });
      }
      const result = await whatsappIntegration.sendPaymentReminder(invoiceData);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Payment reminder error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/order-confirmation
 * @desc    Send order confirmation
 * @access  Private
 */
router.post(
  '/integration/order-confirmation',
  authenticate,
  authorize(['admin', 'system_admin']),
  async (req, res) => {
    try {
      const { orderData } = req.body;
      if (!orderData) {
        return res.status(400).json({ success: false, error: 'orderData is required' });
      }
      const result = await whatsappIntegration.sendOrderConfirmation(orderData);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Order confirmation error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/welcome
 * @desc    Send welcome message to new user
 * @access  Private
 */
router.post(
  '/integration/welcome',
  authenticate,
  authorize(['admin', 'system_admin']),
  async (req, res) => {
    try {
      const { user } = req.body;
      if (!user) {
        return res.status(400).json({ success: false, error: 'user object is required' });
      }
      const result = await whatsappIntegration.sendWelcomeMessage(user);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Welcome message error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/bulk-notify
 * @desc    Send bulk WhatsApp notification
 * @access  Private - admin, system_admin
 */
router.post(
  '/integration/bulk-notify',
  authenticate,
  authorize(['admin', 'system_admin']),
  bulkLimiter,
  async (req, res) => {
    try {
      const { recipients, message, options = {} } = req.body;
      if (!recipients || !Array.isArray(recipients) || !message) {
        return res
          .status(400)
          .json({ success: false, error: 'recipients array and message are required' });
      }
      const result = await whatsappIntegration.sendBulkNotification(recipients, message, options);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Bulk notification error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/process-reminders
 * @desc    Trigger processing of pending appointment/session reminders
 * @access  Private - admin, system_admin
 */
router.post(
  '/integration/process-reminders',
  authenticate,
  authorize(['admin', 'system_admin']),
  async (req, res) => {
    try {
      const AppointmentService = require('../services/appointment.service');
      const appointmentService = new AppointmentService();
      const result = await whatsappIntegration.processReminders(appointmentService);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Process reminders error');
    }
  }
);

/**
 * @route   GET /api/whatsapp/integration/queue-stats
 * @desc    Get WhatsApp queue statistics
 * @access  Private - admin, system_admin
 */
router.get(
  '/integration/queue-stats',
  authenticate,
  authorize(['admin', 'system_admin']),
  async (req, res) => {
    try {
      const stats = await whatsappIntegration.getQueueStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      safeError(res, error, 'Queue stats error');
    }
  }
);

/**
 * @route   POST /api/whatsapp/integration/gov-document-update
 * @desc    Send government document status update
 * @access  Private - admin, system_admin
 */
router.post(
  '/integration/gov-document-update',
  authenticate,
  authorize(['admin', 'system_admin']),
  async (req, res) => {
    try {
      const { user, docData } = req.body;
      if (!user || !docData) {
        return res.status(400).json({ success: false, error: 'user and docData are required' });
      }
      const result = await whatsappIntegration.sendGovDocumentUpdate(user, docData);
      res.json({ success: true, data: result });
    } catch (error) {
      safeError(res, error, 'Gov document update error');
    }
  }
);

module.exports = router;
