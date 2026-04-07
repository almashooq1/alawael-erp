/* eslint-disable no-unused-vars */
/**
 * Email Routes - مسارات البريد الإلكتروني
 * REST API endpoints for email service
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Import services and models
const { emailService, EmailTemplates, emailConfig } = require('./email-service');
const {
  EmailTemplate,
  EmailLog,
  EmailCampaign,
  EmailList,
  EmailSignature,
  EmailQueue,
} = require('./email-models');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/email-attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  },
});

// Authentication middleware (placeholder)
const authenticate = (req, res, next) => {
  // Implement your authentication logic here
  req.user = req.user || { id: 'system', tenantId: 'default' };
  next();
};

// Rate limiting middleware
const rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  return (req, res, next) => {
    const key = req.ip || req.user?.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key).filter(t => t > windowStart);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    userRequests.push(now);
    requests.set(key, userRequests);
    next();
  };
};

// ============================================
// EMAIL SENDING ENDPOINTS
// ============================================

/**
 * @route   POST /api/email/send
 * @desc    Send a single email
 * @access  Private
 */
router.post(
  '/send',
  authenticate,
  rateLimiter(100),
  upload.array('attachments', 10),
  async (req, res) => {
    try {
      const { to, cc, bcc, subject, html, text, template, variables, priority, scheduledFor } =
        req.body;

      // Validate required fields
      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject',
        });
      }

      // Prepare email options
      const emailOptions = {
        to: Array.isArray(to) ? to : to.split(',').map(e => e.trim()),
        cc: cc ? (Array.isArray(cc) ? cc : cc.split(',').map(e => e.trim())) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : bcc.split(',').map(e => e.trim())) : undefined,
        subject,
        html,
        text,
        template,
        variables: variables ? JSON.parse(variables) : {},
        metadata: {
          userId: req.user.id,
          tenantId: req.user.tenantId,
          priority: priority || 'normal',
        },
      };

      // Handle attachments
      if (req.files && req.files.length > 0) {
        emailOptions.attachments = req.files.map(file => ({
          filename: file.originalname,
          path: file.path,
          contentType: file.mimetype,
        }));
      }

      // Handle scheduling
      if (scheduledFor) {
        const queueItem = await EmailQueue.create({
          queueId: `eq_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
          emailData: emailOptions,
          scheduledFor: new Date(scheduledFor),
          status: 'pending',
          metadata: {
            userId: req.user.id,
            tenantId: req.user.tenantId,
          },
        });

        return res.json({
          success: true,
          message: 'Email scheduled successfully',
          queueId: queueItem.queueId,
          scheduledFor: queueItem.scheduledFor,
        });
      }

      // Send email immediately
      const result = await emailService.send(emailOptions);

      res.json({
        success: true,
        message: 'Email sent successfully',
        emailId: result.emailId,
        messageId: result.messageId,
      });
    } catch (error) {
      logger.error('Error sending email:', error);
      res.status(500).json({
        success: false,
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route   POST /api/email/send-bulk
 * @desc    Send bulk emails
 * @access  Private
 */
router.post('/send-bulk', authenticate, rateLimiter(10), async (req, res) => {
  try {
    const { recipients, subject, html, text, template, variables } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required',
      });
    }

    // Queue bulk email
    const queueItems = [];
    for (const recipient of recipients) {
      const queueItem = await EmailQueue.create({
        queueId: `eq_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        emailData: {
          to: [recipient.email],
          subject,
          html,
          text,
          template,
          variables: { ...variables, ...recipient.variables },
        },
        scheduledFor: new Date(),
        status: 'pending',
        metadata: {
          userId: req.user.id,
          tenantId: req.user.tenantId,
        },
      });
      queueItems.push(queueItem.queueId);
    }

    res.json({
      success: true,
      message: `Queued ${queueItems.length} emails for sending`,
      queueIds: queueItems,
    });
  } catch (error) {
    logger.error('Error sending bulk emails:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/email/send-template
 * @desc    Send email using a template
 * @access  Private
 */
router.post('/send-template', authenticate, rateLimiter(100), async (req, res) => {
  try {
    const { to, templateSlug, variables, cc, bcc } = req.body;

    if (!to || !templateSlug) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, templateSlug',
      });
    }

    // Find template
    const template = await EmailTemplate.findOne({ slug: templateSlug, isActive: true });
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Render and send
    const rendered = await emailService.renderTemplate(templateSlug, variables || {});

    const result = await emailService.send({
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template: templateSlug,
      variables,
      metadata: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
      },
    });

    res.json({
      success: true,
      message: 'Template email sent successfully',
      emailId: result.emailId,
    });
  } catch (error) {
    logger.error('Error sending template email:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// TEMPLATE MANAGEMENT
// ============================================

/**
 * @route   GET /api/email/templates
 * @desc    Get all email templates
 * @access  Private
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { category, isActive, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const templates = await EmailTemplate.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailTemplate.countDocuments(filter);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   GET /api/email/templates/:id
 * @desc    Get single template
 * @access  Private
 */
router.get('/templates/:id', authenticate, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/templates
 * @desc    Create a new template
 * @access  Private
 */
router.post('/templates', authenticate, async (req, res) => {
  try {
    const { name, slug, subject, subjectAr, htmlContent, textContent, variables, category, tags } =
      req.body;

    const template = await EmailTemplate.create({
      templateId: `tpl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      subject,
      subjectAr,
      htmlContent,
      textContent,
      variables: variables || [],
      category: category || 'notification',
      tags: tags || [],
      metadata: {
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   PUT /api/email/templates/:id
 * @desc    Update a template
 * @access  Private
 */
router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const updates = { ...req.body };
    updates['metadata.lastModifiedBy'] = req.user.id;
    updates.updatedAt = new Date();

    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   DELETE /api/email/templates/:id
 * @desc    Delete a template
 * @access  Private
 */
router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// EMAIL LOGS & TRACKING
// ============================================

/**
 * @route   GET /api/email/logs
 * @desc    Get email logs
 * @access  Private
 */
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { status, provider, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (provider) filter.provider = provider;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   GET /api/email/logs/:emailId
 * @desc    Get single email log
 * @access  Private
 */
router.get('/logs/:emailId', authenticate, async (req, res) => {
  try {
    const log = await EmailLog.findOne({ emailId: req.params.emailId });
    if (!log) {
      return res.status(404).json({ success: false, error: 'Email log not found' });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/tracking/open/:emailId
 * @desc    Track email open
 * @access  Public
 */
router.post('/tracking/open/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const openData = {
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await EmailLog.findOneAndUpdate(
      { emailId },
      {
        $push: { 'tracking.opens': openData },
        $inc: { 'tracking.totalOpens': 1 },
        $set: {
          status: 'opened',
          'timestamps.firstOpenedAt': { $ifNull: ['$timestamps.firstOpenedAt', new Date()] },
          'timestamps.lastOpenedAt': new Date(),
        },
      }
    );

    // Return 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (error) {
    res.status(500).send();
  }
});

/**
 * @route   POST /api/email/tracking/click/:emailId
 * @desc    Track email click
 * @access  Public
 */
router.post('/tracking/click/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { url } = req.body;

    const clickData = {
      timestamp: new Date(),
      url,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await EmailLog.findOneAndUpdate(
      { emailId },
      {
        $push: { 'tracking.clicks': clickData },
        $inc: { 'tracking.totalClicks': 1 },
        $set: { status: 'clicked' },
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// CAMPAIGNS
// ============================================

/**
 * @route   GET /api/email/campaigns
 * @desc    Get all campaigns
 * @access  Private
 */
router.get('/campaigns', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const campaigns = await EmailCampaign.find(filter)
      .populate('template', 'name subject')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailCampaign.countDocuments(filter);

    res.json({
      success: true,
      data: campaigns,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/campaigns
 * @desc    Create a new campaign
 * @access  Private
 */
router.post('/campaigns', authenticate, async (req, res) => {
  try {
    const { name, description, template, recipients, schedule, trackingSettings, abTest } =
      req.body;

    const campaign = await EmailCampaign.create({
      campaignId: `camp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      description,
      template,
      recipients,
      schedule,
      trackingSettings,
      abTest,
      metadata: {
        createdBy: req.user.id,
        tenantId: req.user.tenantId,
      },
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/campaigns/:id/send
 * @desc    Send a campaign
 * @access  Private
 */
router.post('/campaigns/:id/send', authenticate, async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id).populate('template');
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({ success: false, error: 'Campaign cannot be sent' });
    }

    // Update status to processing
    campaign.status = 'processing';
    await campaign.save();

    // Get recipients (simplified - implement actual logic based on recipient type)
    const recipients = [];

    // Queue emails for campaign
    let sentCount = 0;
    for (const recipient of recipients) {
      await EmailQueue.create({
        queueId: `eq_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        emailData: {
          to: [recipient.email],
          template: campaign.template.slug,
          variables: { name: recipient.name },
        },
        scheduledFor: new Date(),
        status: 'pending',
        metadata: {
          tenantId: campaign.metadata.tenantId,
          campaignId: campaign.campaignId,
        },
      });
      sentCount++;
    }

    // Update campaign stats
    campaign.stats.totalRecipients = recipients.length;
    campaign.stats.sent = sentCount;
    campaign.status = 'sent';
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign sent successfully',
      stats: campaign.stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// LISTS
// ============================================

/**
 * @route   GET /api/email/lists
 * @desc    Get all email lists
 * @access  Private
 */
router.get('/lists', authenticate, async (req, res) => {
  try {
    const lists = await EmailList.find().sort({ createdAt: -1 });
    res.json({ success: true, data: lists });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/lists
 * @desc    Create a new email list
 * @access  Private
 */
router.post('/lists', authenticate, async (req, res) => {
  try {
    const { name, description, type, subscribers, settings } = req.body;

    const list = await EmailList.create({
      listId: `list_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      description,
      type,
      subscribers: subscribers || [],
      settings,
      stats: {
        total: subscribers?.length || 0,
        active: subscribers?.filter(s => s.status === 'active').length || 0,
      },
      metadata: {
        createdBy: req.user.id,
        tenantId: req.user.tenantId,
      },
    });

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/lists/:id/subscribers
 * @desc    Add subscriber to list
 * @access  Private
 */
router.post('/lists/:id/subscribers', authenticate, async (req, res) => {
  try {
    const { email, name, customFields } = req.body;

    const list = await EmailList.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ success: false, error: 'List not found' });
    }

    // Check if already subscribed
    const existing = list.subscribers.find(s => s.email === email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already in list' });
    }

    list.subscribers.push({
      email,
      name,
      status: 'active',
      subscribedAt: new Date(),
      customFields,
    });

    list.stats.total = list.subscribers.length;
    list.stats.active = list.subscribers.filter(s => s.status === 'active').length;

    await list.save();

    res.json({ success: true, message: 'Subscriber added' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   DELETE /api/email/lists/:id/subscribers/:email
 * @desc    Remove subscriber from list
 * @access  Private
 */
router.delete('/lists/:id/subscribers/:email', authenticate, async (req, res) => {
  try {
    const list = await EmailList.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ success: false, error: 'List not found' });
    }

    const subscriber = list.subscribers.find(s => s.email === req.params.email);
    if (subscriber) {
      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      list.stats.unsubscribed = list.subscribers.filter(s => s.status === 'unsubscribed').length;
      list.stats.active = list.subscribers.filter(s => s.status === 'active').length;
      await list.save();
    }

    res.json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// SIGNATURES
// ============================================

/**
 * @route   GET /api/email/signatures
 * @desc    Get all signatures
 * @access  Private
 */
router.get('/signatures', authenticate, async (req, res) => {
  try {
    const signatures = await EmailSignature.find({ isActive: true });
    res.json({ success: true, data: signatures });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/signatures
 * @desc    Create a new signature
 * @access  Private
 */
router.post('/signatures', authenticate, async (req, res) => {
  try {
    const { name, html, text, isDefault } = req.body;

    const signature = await EmailSignature.create({
      signatureId: `sig_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      html,
      text,
      isDefault,
      metadata: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
      },
    });

    if (isDefault) {
      await EmailSignature.updateMany({ _id: { $ne: signature._id } }, { isDefault: false });
    }

    res.status(201).json({ success: true, data: signature });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * @route   GET /api/email/queue
 * @desc    Get email queue
 * @access  Private
 */
router.get('/queue', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const filter = { status: status || 'pending' };

    const queue = await EmailQueue.find(filter)
      .sort({ priority: -1, scheduledFor: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailQueue.countDocuments(filter);

    res.json({
      success: true,
      data: queue,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   POST /api/email/queue/process
 * @desc    Process email queue (admin only)
 * @access  Private
 */
router.post('/queue/process', authenticate, async (req, res) => {
  try {
    const { batchSize = 50 } = req.body;

    const pendingEmails = await EmailQueue.find({ status: 'pending' })
      .sort({ priority: -1, scheduledFor: 1 })
      .limit(batchSize);

    let processed = 0;
    let failed = 0;

    for (const item of pendingEmails) {
      try {
        item.status = 'processing';
        await item.save();

        await emailService.send(item.emailData);

        item.status = 'completed';
        item.lastAttemptAt = new Date();
        await item.save();

        processed++;
      } catch (error) {
        item.status = 'failed';
        item.error = 'فشل إرسال البريد';
        item.attempts += 1;
        item.lastAttemptAt = new Date();

        if (item.attempts < item.maxAttempts) {
          item.status = 'pending';
          item.nextAttemptAt = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
        }

        await item.save();
        failed++;
      }
    }

    res.json({
      success: true,
      message: 'Queue processed',
      stats: { processed, failed, total: pendingEmails.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * @route   GET /api/email/stats
 * @desc    Get email statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get overall stats
    const overallStats = await EmailLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get provider stats
    const providerStats = await EmailLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$provider',
          sent: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        },
      },
    ]);

    // Get daily stats
    const dailyStats = await EmailLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sent: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byProvider: providerStats,
        daily: dailyStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * @route   GET /api/email/health
 * @desc    Check email service health
 * @access  Private
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    const verification = await emailService.verify();

    res.json({
      success: true,
      status: verification.success ? 'healthy' : 'unhealthy',
      provider: emailConfig.provider,
      verification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'حدث خطأ داخلي',
    });
  }
});

module.exports = router;
