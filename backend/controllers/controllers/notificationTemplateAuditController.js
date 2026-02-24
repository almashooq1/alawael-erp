// backend/controllers/notificationTemplateAuditController.js
const NotificationTemplateAudit = require('../models/NotificationTemplateAudit');

const notificationTemplateAuditController = {
  // جلب سجل التغييرات لقالب معين
  async listByTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const audits = await NotificationTemplateAudit.find({ template: templateId })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 });
      res.json({ success: true, data: audits });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في جلب سجل التغييرات', error: error.message });
    }
  },
};

module.exports = notificationTemplateAuditController;
