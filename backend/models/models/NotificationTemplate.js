// backend/models/NotificationTemplate.js
const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, trim: true }, // e.g. 'approval', 'reminder', 'custom'
    subject: { type: String, required: true },
    body: { type: String, required: true }, // يمكن أن يكون HTML أو نص عادي مع متغيرات
    channels: [{ type: String, enum: ['inApp', 'email', 'sms', 'whatsapp', 'push'] }],
    variables: [{ type: String }], // e.g. ['userName', 'date', 'action']
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
module.exports = NotificationTemplate;
