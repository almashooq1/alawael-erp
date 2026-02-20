// نموذج قالب الخطاب الذكي
const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  body: { type: String, required: true },
  category: { type: String, required: true },
  keywords: [String],
  language: { type: String, default: 'ar' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shared: { type: Boolean, default: false },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  usageCount: { type: Number, default: 0 },
  attachments: [
    {
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  // workflow الاعتماد
  status: { type: String, enum: ['draft', 'approved', 'rejected'], default: 'draft' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: Date,
  rejectionReason: String,
  // سجل التغييرات
  history: [
    {
      action: String, // created, updated, approved, rejected, ...
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now },
      details: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Template', TemplateSchema);
