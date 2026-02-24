const mongoose = require('mongoose');

const notificationTemplateAuditSchema = new mongoose.Schema(
  {
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate', required: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    changes: { type: Object }, // diff or full snapshot
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const NotificationTemplateAudit = mongoose.model(
  'NotificationTemplateAudit',
  notificationTemplateAuditSchema
);
module.exports = NotificationTemplateAudit;
