/**
 * Employee Custody Model — نموذج العهد والممتلكات
 *
 * Tracks company assets assigned to employees (laptops, phones, vehicles, keys, etc.)
 */
const mongoose = require('mongoose');

const CustodyHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['تسليم', 'استلام', 'صيانة', 'استبدال', 'فقدان', 'تلف', 'جرد'],
    required: true,
  },
  date: { type: Date, default: Date.now },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  notes: String,
  condition: { type: String, enum: ['ممتاز', 'جيد', 'متوسط', 'سيء', 'تالف'] },
});

const EmployeeCustodySchema = new mongoose.Schema(
  {
    custodyNumber: { type: String, unique: true, required: true },
    assetName: { type: String, required: true, trim: true },
    assetCategory: {
      type: String,
      enum: [
        'حاسب محمول',
        'حاسب مكتبي',
        'هاتف جوال',
        'جهاز لوحي',
        'مفاتيح',
        'سيارة',
        'أدوات عمل',
        'أثاث مكتبي',
        'معدات سلامة',
        'بطاقة دخول',
        'أخرى',
      ],
      required: true,
    },
    serialNumber: String,
    assetTag: String,
    description: String,
    purchaseDate: Date,
    purchaseValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    warranty: {
      provider: String,
      expiryDate: Date,
      isActive: { type: Boolean, default: false },
    },

    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    department: String,
    assignedDate: { type: Date, default: Date.now },
    returnDate: Date,
    expectedReturnDate: Date,

    status: {
      type: String,
      enum: ['مسلّمة', 'مستلمة', 'قيد الصيانة', 'مفقودة', 'تالفة', 'مرتجعة'],
      default: 'مسلّمة',
    },
    condition: {
      type: String,
      enum: ['ممتاز', 'جيد', 'متوسط', 'سيء', 'تالف'],
      default: 'جيد',
    },

    history: [CustodyHistorySchema],

    // Acknowledgement
    employeeAcknowledged: { type: Boolean, default: false },
    acknowledgementDate: Date,
    employeeSignature: String,

    notes: String,
    attachments: [String],
  },
  { timestamps: true }
);

EmployeeCustodySchema.index({ employeeId: 1, status: 1 });
EmployeeCustodySchema.index({ assetCategory: 1, status: 1 });
EmployeeCustodySchema.index({ custodyNumber: 1 }, { unique: true });

module.exports =
  mongoose.models.EmployeeCustody || mongoose.model('EmployeeCustody', EmployeeCustodySchema);
