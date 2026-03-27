/**
 * نموذج إعداد الموظف الجديد (Onboarding)
 * يتتبع خطوات التهيئة من أول يوم حتى نهاية فترة التجربة
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const onboardingTaskSchema = new Schema({
  title: { type: String, required: true },
  titleEn: { type: String },
  description: { type: String },
  category: {
    type: String,
    enum: ['وثائق', 'تدريب', 'أنظمة', 'معدات', 'اجتماعات', 'سياسات', 'أخرى'],
    default: 'أخرى',
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  completedDate: { type: Date },
  status: {
    type: String,
    enum: ['معلق', 'جاري', 'مكتمل', 'متأخر', 'ملغى'],
    default: 'معلق',
  },
  priority: { type: String, enum: ['عالية', 'متوسطة', 'منخفضة'], default: 'متوسطة' },
  notes: { type: String },
  attachments: [{ name: String, url: String, uploadedAt: Date }],
  order: { type: Number, default: 0 },
});

const onboardingSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    templateName: { type: String }, // اسم القالب المستخدم
    startDate: { type: Date, required: true },
    expectedEndDate: { type: Date },
    actualEndDate: { type: Date },
    status: {
      type: String,
      enum: ['لم يبدأ', 'جاري', 'مكتمل', 'متأخر'],
      default: 'لم يبدأ',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    tasks: [onboardingTaskSchema],

    // التقييم بعد الانتهاء
    feedback: {
      employeeRating: { type: Number, min: 1, max: 5 },
      employeeComment: { type: String },
      managerRating: { type: Number, min: 1, max: 5 },
      managerComment: { type: String },
      submittedAt: { type: Date },
    },

    // الذكاء: تنبيهات آلية
    alerts: [
      {
        type: { type: String },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
      },
    ],

    mentor: { type: Schema.Types.ObjectId, ref: 'Employee' }, // المرشد / البادي
    department: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// حساب التقدم تلقائياً
onboardingSchema.pre('save', function (next) {
  if (this.tasks && this.tasks.length > 0) {
    const completed = this.tasks.filter(t => t.status === 'مكتمل').length;
    this.progress = Math.round((completed / this.tasks.length) * 100);
    if (this.progress === 100 && this.status !== 'مكتمل') {
      this.status = 'مكتمل';
      this.actualEndDate = new Date();
    }
  }
  next();
});

onboardingSchema.index({ status: 1, startDate: 1 });
onboardingSchema.index({ 'tasks.status': 1 });

module.exports = mongoose.model('Onboarding', onboardingSchema);
