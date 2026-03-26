// إرسال رسالة WhatsApp عبر Twilio (مبسط)
async function sendWhatsApp(to, message) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    if (!accountSid || !authToken) return;
    const twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({
      body: message,
      from,
      to: to.startsWith('whatsapp:') ? to : 'whatsapp:' + to.replace(/^\+/, ''),
    });
  } catch (err) {
    /* ignore WhatsApp errors */
  }
}
// دعم رفع الملفات
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});
const upload = multer({ storage });

// رفع ملف مرفق (جميع الأنواع)
router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  const file = req.file;
  const url = `/api/templates/attachments/${file.filename}`;
  res.json({
    name: file.originalname,
    url,
    type: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  });
});
// تقديم الملفات المرفقة مباشرة
router.use('/attachments', express.static(uploadDir));
// مسارات إدارة القوالب الذكية
const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const { auth } = require('../middleware/auth');

// تحقق من صلاحية المسؤول
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'صلاحية غير كافية' });
  next();
}
// الموافقة على قالب
router.post('/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const tpl = await Template.findById(req.params.id).populate('createdBy', 'email name');
    if (!tpl) return res.status(404).json({ error: 'القالب غير موجود' });
    tpl.status = 'approved';
    tpl.approvedBy = req.user.id;
    tpl.approvedAt = new Date();
    tpl.rejectedBy = null;
    tpl.rejectedAt = null;
    tpl.rejectionReason = null;
    tpl.history = tpl.history || [];
    tpl.history.push({ action: 'approved', by: req.user.id, at: new Date(), details: '' });
    await tpl.save();
    // إشعار لصاحب القالب (تحقق من إعدادات القنوات)
    const channels = tpl.createdBy.notificationChannels || {
      inApp: true,
      email: true,
      sms: true,
      whatsapp: true,
    };
    // إشعار داخلي
    if (channels.inApp !== false) {
      try {
        const Notification = require('../models/Notification');
        await Notification.createNotification({
          userId: tpl.createdBy._id,
          title: 'تم اعتماد القالب',
          message: `تم اعتماد القالب: ${tpl.title}`,
          type: 'success',
          link: `/templates/${tpl._id}`,
          metadata: { templateId: tpl._id, status: 'approved' },
          senderId: req.user.id,
        });
      } catch (err) {
        /* ignore notification errors */
      }
    }
    // بريد إلكتروني
    if (channels.email !== false) {
      try {
        if (tpl.createdBy.email) {
          const { sendStatusChangeEmail } = require('../utils/emailService');
          await sendStatusChangeEmail(
            {
              title: tpl.title,
              referenceNumber: tpl._id,
              subject: tpl.description || tpl.title,
            },
            tpl.createdBy.email,
            'draft',
            'approved'
          );
        }
      } catch (err) {
        /* ignore email errors */
      }
    }
    // SMS
    if (channels.sms !== false) {
      try {
        if (tpl.createdBy.phone) {
          const { sendSMS } = require('../services/smsService');
          await sendSMS(tpl.createdBy.phone, `تم اعتماد القالب: ${tpl.title}`);
        }
      } catch (err) {
        /* ignore sms errors */
      }
    }
    // WhatsApp
    if (channels.whatsapp !== false) {
      try {
        if (tpl.createdBy.phone) {
          await sendWhatsApp(tpl.createdBy.phone, `تم اعتماد القالب: ${tpl.title}`);
        }
      } catch (err) {
        /* ignore wa errors */
      }
    }
    res.json(tpl);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// رفض قالب
router.post('/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const tpl = await Template.findById(req.params.id).populate('createdBy', 'email name');
    if (!tpl) return res.status(404).json({ error: 'القالب غير موجود' });
    tpl.status = 'rejected';
    tpl.rejectedBy = req.user.id;
    tpl.rejectedAt = new Date();
    tpl.rejectionReason = reason || '';
    tpl.history = tpl.history || [];
    tpl.history.push({ action: 'rejected', by: req.user.id, at: new Date(), details: reason });
    await tpl.save();
    // إشعار لصاحب القالب (تحقق من إعدادات القنوات)
    const channels = tpl.createdBy.notificationChannels || {
      inApp: true,
      email: true,
      sms: true,
      whatsapp: true,
    };
    // إشعار داخلي
    if (channels.inApp !== false) {
      try {
        const Notification = require('../models/Notification');
        await Notification.createNotification({
          userId: tpl.createdBy._id,
          title: 'تم رفض القالب',
          message: `تم رفض القالب: ${tpl.title}${reason ? ' - السبب: ' + reason : ''}`,
          type: 'error',
          link: `/templates/${tpl._id}`,
          metadata: { templateId: tpl._id, status: 'rejected', reason },
          senderId: req.user.id,
        });
      } catch (err) {
        /* ignore notification errors */
      }
    }
    // بريد إلكتروني
    if (channels.email !== false) {
      try {
        if (tpl.createdBy.email) {
          const { sendStatusChangeEmail } = require('../utils/emailService');
          await sendStatusChangeEmail(
            {
              title: tpl.title,
              referenceNumber: tpl._id,
              subject: tpl.description || tpl.title,
            },
            tpl.createdBy.email,
            'draft',
            'rejected'
          );
        }
      } catch (err) {
        /* ignore email errors */
      }
    }
    // SMS
    if (channels.sms !== false) {
      try {
        if (tpl.createdBy.phone) {
          const { sendSMS } = require('../services/smsService');
          await sendSMS(
            tpl.createdBy.phone,
            `تم رفض القالب: ${tpl.title}${reason ? ' - السبب: ' + reason : ''}`
          );
        }
      } catch (err) {
        /* ignore sms errors */
      }
    }
    // WhatsApp
    if (channels.whatsapp !== false) {
      try {
        if (tpl.createdBy.phone) {
          await sendWhatsApp(
            tpl.createdBy.phone,
            `تم رفض القالب: ${tpl.title}${reason ? ' - السبب: ' + reason : ''}`
          );
        }
      } catch (err) {
        /* ignore wa errors */
      }
    }
    res.json(tpl);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// إنشاء قالب جديد
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      category,
      language,
      keywords,
      body: tplBody,
      shared,
      description,
      tags,
      variables,
      content,
    } = req.body;
    const tpl = await Template.create({
      title,
      category,
      language,
      keywords,
      body: tplBody,
      shared,
      description,
      tags,
      variables,
      content,
      createdBy: req.user.id,
      orgId: req.user.organizationId,
    });
    res.status(201).json(tpl);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// جلب جميع القوالب (حسب الصلاحيات)
router.get('/', auth, async (req, res) => {
  try {
    const query = {
      $or: [{ shared: true }, { createdBy: req.user.id }, { orgId: req.user.organizationId }],
    };
    if (req.query.category) query.category = req.query.category;
    if (req.query.language) query.language = req.query.language;
    if (req.query.keywords) query.keywords = { $in: req.query.keywords.split(',') };
    const tpls = await Template.find(query);
    res.json(tpls);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// تحديث قالب
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      title,
      category,
      language,
      keywords,
      body: tplBody,
      shared,
      description,
      tags,
      variables,
      content,
    } = req.body;
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (category !== undefined) updateFields.category = category;
    if (language !== undefined) updateFields.language = language;
    if (keywords !== undefined) updateFields.keywords = keywords;
    if (tplBody !== undefined) updateFields.body = tplBody;
    if (shared !== undefined) updateFields.shared = shared;
    if (description !== undefined) updateFields.description = description;
    if (tags !== undefined) updateFields.tags = tags;
    if (variables !== undefined) updateFields.variables = variables;
    if (content !== undefined) updateFields.content = content;
    updateFields.updatedAt = Date.now();
    const tpl = await Template.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updateFields,
      { new: true }
    );
    if (!tpl) return res.status(404).json({ error: 'Template not found or not allowed' });
    res.json(tpl);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// حذف قالب
router.delete('/:id', auth, async (req, res) => {
  try {
    const tpl = await Template.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!tpl) return res.status(404).json({ error: 'Template not found or not allowed' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// زيادة عداد الاستخدام
router.post('/:id/use', auth, async (req, res) => {
  try {
    await Template.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
