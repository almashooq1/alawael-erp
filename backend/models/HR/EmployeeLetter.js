/**
 * Employee Letter Model — نموذج الشهادات والخطابات الرسمية
 *
 * Manages official certificates and letters issued to employees:
 *   salary certificates, experience letters, to-whom-it-may-concern, etc.
 */
const mongoose = require('mongoose');

const EmployeeLetterSchema = new mongoose.Schema(
  {
    letterNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'تعريف بالراتب',
        'تعريف بالعمل',
        'شهادة خبرة',
        'خطاب لمن يهمه الأمر',
        'خطاب تفويض',
        'خطاب تأشيرة خروج وعودة',
        'خطاب نقل كفالة',
        'خطاب تأشيرة زيارة',
        'شهادة حسن سيرة وسلوك',
        'خطاب بنكي',
        'خطاب جهات حكومية',
        'خطاب تأمين طبي',
        'شهادة مباشرة عمل',
        'خطاب إنهاء خدمة',
        'أخرى',
      ],
      required: true,
    },
    language: {
      type: String,
      enum: ['عربي', 'إنجليزي', 'كلاهما'],
      default: 'عربي',
    },
    purpose: String,
    addressedTo: String,
    status: {
      type: String,
      enum: ['مطلوب', 'قيد الإعداد', 'بانتظار التوقيع', 'جاهز', 'تم التسليم', 'ملغي'],
      default: 'مطلوب',
    },
    content: {
      body: String,
      templateId: String,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    signatureDate: Date,
    deliveryMethod: {
      type: String,
      enum: ['استلام يدوي', 'بريد إلكتروني', 'بريد عادي', 'فاكس'],
    },
    deliveredAt: Date,
    validUntil: Date,
    includesSalaryDetails: { type: Boolean, default: false },
    salaryDetails: {
      basicSalary: Number,
      totalPackage: Number,
      currency: { type: String, default: 'SAR' },
    },
    copies: { type: Number, default: 1 },
    printCount: { type: Number, default: 0 },
    documentFile: {
      filename: String,
      path: String,
      generatedAt: Date,
    },
    notes: String,
  },
  { timestamps: true }
);

EmployeeLetterSchema.index({ employeeId: 1, type: 1 });
// letterNumber: removed — unique:true creates implicit index
EmployeeLetterSchema.index({ status: 1 });

EmployeeLetterSchema.pre('save', async function (next) {
  if (!this.letterNumber) {
    const count = await mongoose.model('EmployeeLetter').countDocuments();
    const prefix = 'LTR';
    this.letterNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.models.EmployeeLetter || mongoose.model('EmployeeLetter', EmployeeLetterSchema);
