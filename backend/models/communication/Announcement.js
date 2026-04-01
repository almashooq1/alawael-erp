/**
 * Announcement Model — نموذج الإعلانات والتنبيهات
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    announcement_number: { type: String, unique: true }, // ANN-YYYY-XXXX
    title_ar: { type: String, required: true, trim: true },
    title_en: { type: String, trim: true },
    content_ar: { type: String, required: true },
    content_en: { type: String },

    type: {
      type: String,
      enum: [
        'general',
        'urgent',
        'policy',
        'event',
        'maintenance',
        'holiday',
        'training',
        'health_safety',
      ],
      default: 'general',
    },

    priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },

    // الاستهداف
    target_audience: {
      type: String,
      enum: ['all', 'staff', 'beneficiaries', 'guardians', 'specific_roles', 'specific_branches'],
      default: 'all',
    },
    target_roles: [{ type: String }], // ['therapist', 'driver', 'receptionist']
    target_branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],

    // الجدول الزمني
    publish_at: { type: Date, default: Date.now },
    expires_at: { type: Date },
    is_published: { type: Boolean, default: false },
    published_at: { type: Date },

    // المرفقات
    attachments: [
      {
        file_name: String,
        file_path: String,
        file_type: String,
        file_size: Number,
      },
    ],

    // الإحصاءات
    views_count: { type: Number, default: 0 },
    reads_count: { type: Number, default: 0 },

    // قنوات الإرسال
    channels: {
      in_app: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

announcementSchema.pre('save', async function (next) {
  if (!this.announcement_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Announcement').countDocuments({ deleted_at: null });
    this.announcement_number = `ANN-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

announcementSchema.index({ is_published: 1, publish_at: -1 });
announcementSchema.index({ target_audience: 1, expires_at: 1 });
announcementSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
