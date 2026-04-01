/**
 * ReportSchedule — جدولة التقارير التلقائية
 * يدير إرسال التقارير الدورية بشكل تلقائي
 */
const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String }, // يمكن إضافة بريد خارجي
    name_ar: { type: String },
  },
  { _id: false }
);

const reportScheduleSchema = new mongoose.Schema(
  {
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: true,
    },
    name_ar: { type: String, required: true }, // اسم الجدولة
    description_ar: { type: String },

    // معاملات الفلترة الافتراضية للتشغيل التلقائي
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // تكرار الجدولة
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      required: true,
    },
    // CRON expression (للـ custom أو التحكم الدقيق)
    cron_expression: { type: String },
    // مثال: '0 7 * * 1' = كل يوم اثنين 7 صباحاً

    // إعدادات التكرار البسيطة
    day_of_week: { type: Number, min: 0, max: 6 }, // 0=أحد, 1=اثنين...
    day_of_month: { type: Number, min: 1, max: 31 }, // للشهري
    month_of_year: { type: Number, min: 1, max: 12 }, // للسنوي
    time_of_day: { type: String, default: '07:00' }, // HH:mm

    // صيغة التصدير التلقائي
    export_format: {
      type: String,
      enum: ['pdf', 'xlsx', 'csv'],
      default: 'pdf',
    },

    // المستلمون
    recipients: [recipientSchema],
    send_via_email: { type: Boolean, default: true },
    send_via_whatsapp: { type: Boolean, default: false },
    email_subject_ar: { type: String },
    email_body_ar: { type: String },

    // الفروع المستهدفة
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    }, // null = كل الفروع

    // حالة الجدولة
    is_active: { type: Boolean, default: true },

    // تتبع التشغيل
    last_run_at: { type: Date },
    last_run_status: {
      type: String,
      enum: ['success', 'failed', 'skipped'],
      default: null,
    },
    next_run_at: { type: Date },
    run_count: { type: Number, default: 0 },
    fail_count: { type: Number, default: 0 },

    // الحد الأقصى للتشغيلات (null = لانهائي)
    max_runs: { type: Number, default: null },

    // تاريخ انتهاء الجدولة
    expires_at: { type: Date, default: null },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'report_schedules',
  }
);

reportScheduleSchema.index({ is_active: 1, next_run_at: 1 });
reportScheduleSchema.index({ template_id: 1 });
reportScheduleSchema.index({ deleted_at: 1 });

// حساب next_run_at تلقائياً قبل الحفظ
reportScheduleSchema.pre('save', function (next) {
  if (this.isModified('frequency') || this.isModified('time_of_day') || this.isNew) {
    this.next_run_at = this._computeNextRun();
  }
  next();
});

reportScheduleSchema.methods._computeNextRun = function () {
  const now = new Date();
  const [h, m] = (this.time_of_day || '07:00').split(':').map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  switch (this.frequency) {
    case 'daily':
      return next;
    case 'weekly': {
      const targetDay = this.day_of_week ?? 1;
      const diff = (targetDay - next.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + diff);
      return next;
    }
    case 'monthly': {
      const day = this.day_of_month ?? 1;
      next.setDate(day);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      return next;
    }
    case 'quarterly': {
      const month = next.getMonth();
      const nextQ = Math.floor(month / 3) * 3 + 3;
      next.setMonth(nextQ, this.day_of_month ?? 1);
      if (next <= now) next.setMonth(next.getMonth() + 3);
      return next;
    }
    case 'yearly': {
      next.setMonth((this.month_of_year ?? 1) - 1, this.day_of_month ?? 1);
      if (next <= now) next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    default:
      return next;
  }
};

reportScheduleSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ deleted_at: null });
  }
});

module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
