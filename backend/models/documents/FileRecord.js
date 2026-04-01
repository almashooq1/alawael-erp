/**
 * FileRecord Model — نموذج سجلات الملفات والوثائق
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const fileRecordSchema = new mongoose.Schema(
  {
    file_number: { type: String, unique: true }, // FILE-YYYY-XXXXXX
    title_ar: { type: String, required: true, trim: true },
    title_en: { type: String, trim: true },
    description: { type: String },

    // التصنيف
    category: {
      type: String,
      enum: [
        'beneficiary_file',
        'employee_file',
        'medical_report',
        'assessment_report',
        'rehab_plan',
        'invoice',
        'contract',
        'policy',
        'form',
        'certificate',
        'legal',
        'administrative',
        'other',
      ],
      required: true,
    },

    document_type: { type: String }, // نوع مخصص داخل الفئة
    tags: [{ type: String }], // وسوم للبحث السريع

    // الملف المادي
    file_path: { type: String, required: true },
    original_name: { type: String },
    file_size: { type: Number }, // bytes
    file_type: { type: String }, // pdf, docx, jpg...
    mime_type: { type: String },
    checksum: { type: String }, // SHA-256 للتحقق من سلامة الملف

    // الإصدار
    version: { type: Number, default: 1 },
    version_history: [
      {
        version: Number,
        file_path: String,
        file_size: Number,
        uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploaded_at: { type: Date, default: Date.now },
        change_notes: String,
      },
    ],

    // الربط بالكيان
    reference_type: { type: String }, // 'Beneficiary', 'Employee', 'Assessment'...
    reference_id: { type: mongoose.Schema.Types.ObjectId },

    // الصلاحيات
    access_level: {
      type: String,
      enum: ['public', 'internal', 'restricted', 'confidential'],
      default: 'internal',
    },
    allowed_roles: [{ type: String }],
    allowed_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // الصلاحية
    expiry_date: { type: Date },
    is_expired: { type: Boolean, default: false },

    // الموافقة والتوقيع
    requires_signature: { type: Boolean, default: false },
    is_signed: { type: Boolean, default: false },
    signed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signed_at: { type: Date },

    // الأرشفة
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date },
    archived_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // الإحصاءات
    download_count: { type: Number, default: 0 },
    view_count: { type: Number, default: 0 },
    last_accessed_at: { type: Date },
    last_accessed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

fileRecordSchema.pre('save', async function (next) {
  if (!this.file_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('FileRecord').countDocuments();
    this.file_number = `FILE-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fileRecordSchema.index({ category: 1, reference_type: 1, reference_id: 1 });
fileRecordSchema.index({ title_ar: 'text', title_en: 'text', tags: 'text' });
fileRecordSchema.index({ expiry_date: 1, is_expired: 1 });
fileRecordSchema.index({ branch_id: 1, category: 1 });
fileRecordSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('FileRecord', fileRecordSchema);
