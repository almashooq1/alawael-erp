/**
 * ContactDirectory Model — دليل جهات الاتصال
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const contactDirectorySchema = new mongoose.Schema(
  {
    name_ar: { type: String, required: true, trim: true },
    name_en: { type: String, trim: true },
    job_title_ar: { type: String },
    job_title_en: { type: String },
    department: { type: String },

    contact_type: {
      type: String,
      enum: [
        'employee',
        'external_doctor',
        'supplier',
        'government_entity',
        'insurance_company',
        'other',
      ],
      default: 'employee',
    },

    // بيانات الاتصال
    phone_primary: { type: String },
    phone_secondary: { type: String },
    email: { type: String, lowercase: true },
    extension: { type: String }, // داخلي
    whatsapp: { type: String },
    fax: { type: String },

    // الموقع
    address: { type: String },
    city: { type: String },

    // مرتبط بمستخدم
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: { type: String },
    is_active: { type: Boolean, default: true },
    is_favorite: { type: Boolean, default: false },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

contactDirectorySchema.index({ contact_type: 1, is_active: 1 });
contactDirectorySchema.index({ name_ar: 'text', name_en: 'text', email: 'text' });
contactDirectorySchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.ContactDirectory || mongoose.model('ContactDirectory', contactDirectorySchema);
