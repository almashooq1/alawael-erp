/**
 * ReportJob — مهمة توليد التقرير
 * تتبع كل عملية تشغيل تقرير (يدوية أو مجدولة)
 */
const mongoose = require('mongoose');

const reportJobSchema = new mongoose.Schema(
  {
    job_number: { type: String, unique: true }, // RPT-JOB-2026-00001

    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: true,
    },
    schedule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportSchedule',
      default: null,
    },

    // من طلب التقرير
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },

    // معاملات الفلترة المُطبّقة
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // مثال: { date_from: "2026-01-01", date_to: "2026-03-31", branch_id: "...", status: "active" }

    // نتيجة التشغيل
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
    },
    started_at: { type: Date },
    completed_at: { type: Date },
    duration_ms: { type: Number }, // وقت التنفيذ بالملي ثانية

    // الملف المُصدَّر
    export_format: {
      type: String,
      enum: ['pdf', 'xlsx', 'csv', 'json', 'preview'],
      default: 'preview',
    },
    file_path: { type: String }, // مسار الملف في التخزين
    file_size_bytes: { type: Number },
    download_url: { type: String },
    expires_at: { type: Date }, // انتهاء صلاحية رابط التحميل

    // إحصاءات
    total_rows: { type: Number, default: 0 },
    pages: { type: Number, default: 1 },

    // بيانات نتيجة الـ preview (محدودة بـ 500 سطر)
    preview_data: [mongoose.Schema.Types.Mixed],

    // رسالة الخطأ (عند الفشل)
    error_message: { type: String },
    error_stack: { type: String },

    // معلومات إضافية
    triggered_by: {
      type: String,
      enum: ['manual', 'schedule', 'api'],
      default: 'manual',
    },
    ip_address: { type: String },

    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'report_jobs',
  }
);

// === Pre-save: رقم تلقائي ===
reportJobSchema.pre('save', async function (next) {
  if (this.isNew && !this.job_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      job_number: { $regex: `^RPT-JOB-${year}-` },
    });
    this.job_number = `RPT-JOB-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

reportJobSchema.index({ template_id: 1, status: 1 });
reportJobSchema.index({ requested_by: 1, createdAt: -1 });
reportJobSchema.index({ schedule_id: 1 });
reportJobSchema.index({ deleted_at: 1 });

reportJobSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ deleted_at: null });
  }
});

module.exports = mongoose.models.ReportJob || mongoose.model('ReportJob', reportJobSchema);
