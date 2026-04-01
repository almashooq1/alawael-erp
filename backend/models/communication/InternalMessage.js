/**
 * InternalMessage Model — نموذج الرسائل الداخلية
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const internalMessageSchema = new mongoose.Schema(
  {
    message_number: { type: String, unique: true }, // MSG-YYYY-XXXXXX
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipients: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        is_read: { type: Boolean, default: false },
        read_at: { type: Date },
        is_deleted: { type: Boolean, default: false },
      },
    ],

    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },

    message_type: {
      type: String,
      enum: ['general', 'task', 'request', 'feedback', 'report', 'reminder', 'urgent'],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    // الرد على رسالة
    parent_message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalMessage' },
    thread_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalMessage' }, // أول رسالة في الخيط

    // المرفقات
    attachments: [
      {
        file_name: String,
        file_path: String,
        file_type: String,
        file_size: Number,
        uploaded_at: { type: Date, default: Date.now },
      },
    ],

    // الحالة
    is_draft: { type: Boolean, default: false },
    is_starred: { type: Boolean, default: false },
    sent_at: { type: Date },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

internalMessageSchema.pre('save', async function (next) {
  if (!this.message_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('InternalMessage').countDocuments();
    this.message_number = `MSG-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  if (!this.thread_id) {
    this.thread_id = this._id;
  }
  next();
});

internalMessageSchema.index({ sender_id: 1, sent_at: -1 });
internalMessageSchema.index({ 'recipients.user_id': 1, 'recipients.is_read': 1 });
internalMessageSchema.index({ thread_id: 1, createdAt: 1 });
internalMessageSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.InternalMessage || mongoose.model('InternalMessage', internalMessageSchema);
