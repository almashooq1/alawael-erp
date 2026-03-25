/**
 * EmployeeRequest Model - نموذج طلبات الموظفين
 *
 * Generic employee requests (salary certificates, letters, IT support, etc.)
 * Used by the Employee Portal.
 *
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const employeeRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'معرف الموظف مطلوب'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'نوع الطلب مطلوب'],
      enum: {
        values: [
          'salary_certificate', // شهادة راتب
          'experience_letter', // خطاب خبرة
          'bank_letter', // خطاب بنكي
          'leave_encashment', // صرف رصيد إجازات
          'advance_salary', // سلفة راتب
          'it_support', // دعم تقني
          'maintenance', // صيانة
          'transfer', // طلب نقل
          'promotion', // طلب ترقية
          'training', // طلب تدريب
          'equipment', // طلب معدات
          'badge_replacement', // استبدال بطاقة
          'parking', // موقف سيارة
          'other', // أخرى
        ],
        message: 'نوع الطلب غير صالح',
      },
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'موضوع الطلب مطلوب'],
      trim: true,
      maxlength: [200, 'الموضوع طويل جداً'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'الوصف طويل جداً'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_review', 'approved', 'rejected', 'completed', 'cancelled'],
        message: 'حالة الطلب غير صالحة',
      },
      default: 'pending',
      index: true,
    },
    // سير العمل
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,
    completedAt: Date,

    // المرفقات
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadDate: { type: Date, default: Date.now },
      },
    ],

    // بيانات إضافية حسب نوع الطلب
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
employeeRequestSchema.index({ employeeId: 1, status: 1 });
employeeRequestSchema.index({ type: 1, status: 1 });
employeeRequestSchema.index({ createdAt: -1 });

// Statics
employeeRequestSchema.statics.getByEmployee = function (employeeId, filters = {}) {
  const query = { employeeId };
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  return this.find(query).sort({ createdAt: -1 });
};

employeeRequestSchema.statics.getPendingCount = function (employeeId) {
  return this.countDocuments({ employeeId, status: { $in: ['pending', 'in_review'] } });
};

module.exports =
  mongoose.models.EmployeeRequest || mongoose.model('EmployeeRequest', employeeRequestSchema);
