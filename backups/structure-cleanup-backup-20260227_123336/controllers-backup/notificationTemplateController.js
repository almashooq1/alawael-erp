// backend/controllers/notificationTemplateController.js
const NotificationTemplate = require('../models/NotificationTemplate');
const NotificationTemplateAudit = require('../models/NotificationTemplateAudit');

const notificationTemplateController = {
  // إنشاء قالب جديد
  async create(req, res) {
    try {
      const { name, type, subject, body, channels, variables } = req.body;
      const createdBy = req.user._id;
      const template = await NotificationTemplate.create({
        name,
        type,
        subject,
        body,
        channels,
        variables,
        createdBy,
        updatedBy: createdBy,
      });
      // سجل التدقيق
      await NotificationTemplateAudit.create({
        template: template._id,
        action: 'create',
        changes: template.toObject(),
        performedBy: createdBy,
      });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إنشاء القالب', error: error.message });
    }
  },
  // تحديث قالب
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, type, subject, body, channels, variables } = req.body;
      const updatedBy = req.user._id;
      const oldTemplate = await NotificationTemplate.findById(id);
      const template = await NotificationTemplate.findByIdAndUpdate(
        id,
        { name, type, subject, body, channels, variables, updatedBy },
        { new: true }
      );
      if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      // سجل التدقيق
      await NotificationTemplateAudit.create({
        template: template._id,
        action: 'update',
        changes: { before: oldTemplate?.toObject(), after: template.toObject() },
        performedBy: updatedBy,
      });
      res.json({ success: true, data: template });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث القالب', error: error.message });
    }
  },
  // حذف قالب
  async remove(req, res) {
    try {
      const { id } = req.params;
      const template = await NotificationTemplate.findByIdAndDelete(id);
      if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      // سجل التدقيق
      await NotificationTemplateAudit.create({
        template: template._id,
        action: 'delete',
        changes: template.toObject(),
        performedBy: req.user._id,
      });
      res.json({ success: true, message: 'تم حذف القالب' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في حذف القالب', error: error.message });
    }
  },
  // جلب جميع القوالب
  async list(req, res) {
    try {
      const templates = await NotificationTemplate.find().sort({ createdAt: -1 });
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في جلب القوالب', error: error.message });
    }
  },
  // جلب قالب واحد
  async get(req, res) {
    try {
      const { id } = req.params;
      const template = await NotificationTemplate.findById(id);
      if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في جلب القالب', error: error.message });
    }
  },
};

module.exports = notificationTemplateController;
