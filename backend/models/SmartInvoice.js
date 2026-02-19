/**
 * ===================================================================
 * SMART INVOICE MODEL - نموذج الفاتورة الذكية والمتقدمة
 * ===================================================================
 * 
 * نموذج محسّن للفاتورة يشمل:
 * - إدارة شاملة للعملاء والمنتجات
 * - دعم الضرائب والخصومات والرسوم
 * - إدارة متقدمة للمدفوعات
 * - تتبع الأداء والتنبؤات
 * - الأتمتة والتنبيهات
 * - التكاملات والتقارير
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================================================
// INVOICE ITEM SCHEMA
// ============================================================================
const invoiceItemSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'الكمية يجب أن تكون أكثر من صفر'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'السعر يجب أن يكون موجب'],
    },
    unit: {
      type: String,
      enum: ['piece', 'box', 'kg', 'liter', 'meter', 'hour', 'service'],
      default: 'piece',
    },
    // للتتبع والتحليل الذكي
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    category: String,
    
    // الضرائب
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // الخصومات
    discountType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    
    // الحقول المحسوبة
    subtotal: {
      type: Number,
      required: true,
    },
    taxAmount: Number,
    total: {
      type: Number,
      required: true,
    },
    
    // للتتبع
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ============================================================================
// CUSTOMER SCHEMA (EMBEDDED)
// ============================================================================
const customerSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: String,
    address: String,
    city: String,
    country: String,
    zipCode: String,
    taxId: String, // للشركات والعاملين بحسابات شاملة
    website: String,
    
    // معلومات التصنيف
    customerType: {
      type: String,
      enum: ['individual', 'company', 'retailer', 'distributor'],
      default: 'individual',
    },
    creditRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { _id: false }
);

// ============================================================================
// PAYMENT TERMS SCHEMA
// ============================================================================
const paymentTermsSchema = new Schema(
  {
    name: String,
    netDays: {
      type: Number,
      default: 30,
    },
    description: String,
    earlyPaymentDiscount: {
      enabled: Boolean,
      discountPercent: Number,
      daysEarlyPayment: Number,
    },
    lateFeePercent: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// ============================================================================
// PAYMENT RECORD SCHEMA
// ============================================================================
const paymentRecordSchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ['cash', 'check', 'transfer', 'card', 'crypto', 'other'],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'verified',
    },
    reference: String,
    notes: String,
    appliedDiscount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

// ============================================================================
// TAX & DEDUCTION SCHEMA
// ============================================================================
const taxDeductionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['vat', 'income_tax', 'withholding', 'custom'],
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    amount: Number,
    description: String,
    isAutomatic: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// ============================================================================
// MAIN SMART INVOICE SCHEMA
// ============================================================================
const smartInvoiceSchema = new Schema(
  {
    // ============ معلومات الفاتورة الأساسية ============
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    
    referenceNumber: String, // للمراجع الخارجية
    
    invoiceDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    
    dueDate: {
      type: Date,
      required: true,
    },
    
    // تاريخ الخدمة/التسليم
    serviceDate: Date,
    
    // ============ معلومات الشركة المصدرة ============
    company: {
      name: {
        type: String,
        required: true,
      },
      logo: String,
      taxId: String,
      address: String,
      phone: String,
      email: String,
      website: String,
    },
    
    // ============ معلومات العميل ============
    customer: {
      type: customerSchema,
      required: true,
    },
    
    // ============ بنود الفاتورة ============
    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'يجب أن تحتوي الفاتورة على بند واحد على الأقل',
      },
    },
    
    // ============ الحقول المالية ============
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    
    // الخصومات
    discounts: {
      itemDiscounts: {
        type: Number,
        default: 0,
      },
      invoiceDiscount: {
        type: Number,
        default: 0,
      },
      earlyPaymentDiscount: {
        type: Number,
        default: 0,
      },
      loyaltyDiscount: {
        type: Number,
        default: 0,
      },
      totalDiscount: {
        type: Number,
        default: 0,
      },
    },
    
    // الضرائب والرسوم
    taxes: {
      vat: {
        rate: {
          type: Number,
          default: 15,
        },
        amount: Number,
      },
      additionalTaxes: [taxDeductionSchema],
      totalTax: {
        type: Number,
        default: 0,
      },
    },
    
    // الرسوم الإضافية
    fees: {
      shippingFee: {
        type: Number,
        default: 0,
      },
      serviceFee: {
        type: Number,
        default: 0,
      },
      processingFee: {
        type: Number,
        default: 0,
      },
      totalFees: {
        type: Number,
        default: 0,
      },
    },
    
    // الإجمالي
    totalAmount: {
      type: Number,
      required: true,
    },
    
    // ============ معلومات الدفع ============
    paymentTerms: {
      type: paymentTermsSchema,
      default: () => ({
        name: 'Net 30',
        netDays: 30,
      }),
    },
    
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'transfer', 'card', 'crypto', 'installment'],
      default: 'transfer',
    },
    
    payments: {
      type: [paymentRecordSchema],
      default: [],
    },
    
    paidAmount: {
      type: Number,
      default: 0,
    },
    
    remainingAmount: {
      type: Number,
      required: true,
    },
    
    // ============ حالة الفاتورة ============
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'paid', 'partial', 'overdue', 'cancelled', 'disputed'],
      default: 'draft',
      index: true,
    },
    
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: Schema.Types.ObjectId,
        reason: String,
      },
    ],
    
    // ============ البيانات الذكية والتنبيهات ============
    smartData: {
      // توقع الدفع
      paymentPrediction: {
        predictedPaymentDate: Date,
        confidence: Number,
        riskScore: Number,
      },
      
      // تصنيف التأخير
      delayRisk: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low',
      },
      
      // الأتمتة
      isAutomated: {
        type: Boolean,
        default: false,
      },
      automationRules: [String],
      
      // الملاحظات الذكية
      aiNotes: String,
      aiRecommendations: [String],
    },
    
    // ============ التنبيهات ============
    alerts: {
      overdue: {
        type: Boolean,
        default: false,
      },
      almostOverdue: {
        type: Boolean,
        default: false,
      },
      daysUntilOverdue: Number,
      customAlerts: [{
        type: String,
        message: String,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
      }],
    },
    
    // ============ معلومات إضافية ============
    notes: String,
    internalNotes: String,
    terms: {
      type: String,
      default: 'الدفع خلال 30 يوم من تاريخ الفاتورة',
    },
    
    // المرفقات
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedAt: Date,
    }],
    
    // ============ المراجع والتكاملات ============
    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    
    contract: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
    },
    
    // ربط مع نظام الحسابات
    journalEntry: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    
    // إرسال الفاتورة
    sentTo: {
      email: String,
      sentDate: Date,
      openedDate: Date,
      clickedDate: Date,
      status: {
        type: String,
        enum: ['not_sent', 'sent', 'delivered', 'opened', 'clicked'],
        default: 'not_sent',
      },
    },
    
    // ============ معلومات النظام ============
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    approvalDate: Date,
    
    // التتبع والتدقيق
    auditTrail: [{
      action: String,
      performedBy: Schema.Types.ObjectId,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      details: mongoose.Schema.Types.Mixed,
    }],
    
    // النسخ والنسخ المرجعية
    version: {
      type: Number,
      default: 1,
    },
    
    remindersSent: {
      type: Number,
      default: 0,
    },
    
    lastReminderDate: Date,
    
    // بيانات التحليل
    analytics: {
      viewCount: {
        type: Number,
        default: 0,
      },
      downloadCount: {
        type: Number,
        default: 0,
      },
      printCount: {
        type: Number,
        default: 0,
      },
      shareCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// INDEXES
// ============================================================================
smartInvoiceSchema.index({ invoiceNumber: 1 });
smartInvoiceSchema.index({ 'customer.customerId': 1 });
smartInvoiceSchema.index({ status: 1 });
smartInvoiceSchema.index({ invoiceDate: -1 });
smartInvoiceSchema.index({ dueDate: 1 });
smartInvoiceSchema.index({ paidAmount: 1 });
smartInvoiceSchema.index({ 'smartData.delayRisk': 1 });
smartInvoiceSchema.index({ 'alerts.overdue': 1 });
smartInvoiceSchema.index({ createdAt: -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

// التحقق من الفاتورة المتأخرة
smartInvoiceSchema.virtual('isOverdue').get(function () {
  if (['paid', 'cancelled'].includes(this.status)) {
    return false;
  }
  return this.dueDate < new Date();
});

// عدد الأيام المتبقية
smartInvoiceSchema.virtual('daysUntilDue').get(function () {
  const now = new Date();
  const diff = this.dueDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// نسبة الدفع
smartInvoiceSchema.virtual('paymentPercentage').get(function () {
  if (this.totalAmount === 0) return 0;
  return (this.paidAmount / this.totalAmount) * 100;
});

// حالة الدفع
smartInvoiceSchema.virtual('paymentStatus').get(function () {
  if (this.paidAmount === 0) return 'unpaid';
  if (this.remainingAmount === 0) return 'paid';
  return 'partial';
});

// ============================================================================
// METHODS
// ============================================================================

// تسجيل دفعة جديدة
smartInvoiceSchema.methods.recordPayment = function (amount, method, reference, discount = 0) {
  this.payments.push({
    amount,
    method,
    reference,
    status: 'verified',
    appliedDiscount: discount,
    date: new Date(),
  });

  this.paidAmount += amount;
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  return this.updateStatus();
};

// تحديث حالة الفاتورة
smartInvoiceSchema.methods.updateStatus = async function () {
  const previousStatus = this.status;

  if (this.remainingAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (this.isOverdue && !['cancelled', 'disputed'].includes(this.status)) {
    this.status = 'overdue';
  }

  // تسجيل تغيير الحالة
  if (previousStatus !== this.status) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      reason: 'Status update due to payment or date',
    });
  }

  return this.save();
};

// إرسال تنبيه للفاتورة المتأخرة
smartInvoiceSchema.methods.checkAndSetOverdueAlert = function () {
  if (this.isOverdue && this.status !== 'paid' && this.status !== 'cancelled') {
    this.alerts.overdue = true;
    this.smartData.delayRisk = 'high';
  } else if (this.daysUntilDue <= 3 && this.daysUntilDue > 0) {
    this.alerts.almostOverdue = true;
    this.smartData.delayRisk = 'medium';
  } else {
    this.alerts.overdue = false;
    this.alerts.almostOverdue = false;
    this.smartData.delayRisk = 'low';
  }

  this.alerts.daysUntilOverdue = this.daysUntilDue;

  return this.save();
};

// حساب المنتجات المباعة بنجاح
smartInvoiceSchema.methods.calculateTotals = function () {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  // حساب البنود
  this.items.forEach(item => {
    const itemSubtotal = item.quantity * item.unitPrice;
    let itemDiscount = 0;

    // حساب خصم البند
    if (item.discountType === 'percentage') {
      itemDiscount = (itemSubtotal * item.discountAmount) / 100;
    } else {
      itemDiscount = item.discountAmount;
    }

    item.subtotal = itemSubtotal;
    item.discountAmount = itemDiscount;
    item.taxAmount = ((itemSubtotal - itemDiscount) * item.taxRate) / 100;
    item.total = itemSubtotal - itemDiscount + item.taxAmount;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalTax += item.taxAmount;
  });

  this.subtotal = subtotal;
  this.discounts.itemDiscounts = totalDiscount;
  this.discounts.totalDiscount = totalDiscount + this.discounts.invoiceDiscount;
  this.taxes.vat.amount = totalTax;
  this.taxes.totalTax = totalTax;

  // حساب الرسوم
  this.fees.totalFees =
    (this.fees.shippingFee || 0) +
    (this.fees.serviceFee || 0) +
    (this.fees.processingFee || 0);

  // حساب الإجمالي
  this.totalAmount =
    subtotal -
    this.discounts.totalDiscount +
    this.taxes.totalTax +
    this.fees.totalFees;

  this.remainingAmount = this.totalAmount - this.paidAmount;

  return this;
};

// إضافة تنبيه مخصص
smartInvoiceSchema.methods.addCustomAlert = function (message, severity = 'info') {
  this.alerts.customAlerts.push({
    type: 'custom',
    message,
    severity,
  });
  return this.save();
};

// تصدير كملف PDF
smartInvoiceSchema.methods.exportToPDF = async function () {
  // هذه ستتم معالجتها في الخدمة
  return {
    invoiceNumber: this.invoiceNumber,
    data: {
      customer: this.customer,
      items: this.items,
      totalAmount: this.totalAmount,
      dueDate: this.dueDate,
    },
  };
};

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

smartInvoiceSchema.pre('save', function (next) {
  // التأكد من أن dueDate بعد invoiceDate
  if (this.dueDate < this.invoiceDate) {
    return next(
      new Error('تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة')
    );
  }

  // حساب remainingAmount
  if (this.isNew || this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);
  }

  // تحديث حالة التنبيهات
  this.checkAndSetOverdueAlert();

  next();
});

// ============================================================================
// STATIC METHODS
// ============================================================================

// إنشاء رقم فاتورة تلقائي
smartInvoiceSchema.statics.generateInvoiceNumber = async function (
  prefix = 'INV',
  companyId = null
) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const query = {
    invoiceNumber: new RegExp(`^${prefix}-${year}-${month}`),
  };

  if (companyId) {
    query['company._id'] = companyId;
  }

  const lastInvoice = await this.findOne(query).sort({ createdAt: -1 });

  let nextNumber = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/\d{4}$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  return `${prefix}-${year}-${month}-${nextNumber.toString().padStart(4, '0')}`;
};

// البحث عن الفواتير المتأخرة
smartInvoiceSchema.statics.findOverdue = async function () {
  const now = new Date();
  return this.find({
    dueDate: { $lt: now },
    status: { $nin: ['paid', 'cancelled'] },
  });
};

// البحث عن الفواتير القريبة من الاستحقاق
smartInvoiceSchema.statics.findAlmostOverdue = async function (daysThreshold = 3) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  return this.find({
    dueDate: { $gte: now, $lte: futureDate },
    status: { $nin: ['paid', 'cancelled'] },
  });
};

// الحصول على الإحصائيات
smartInvoiceSchema.statics.getStatistics = async function (filters = {}) {
  return this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalOverdue: {
          $sum: {
            $cond: [{ $eq: ['$alerts.overdue', true] }, 1, 0],
          },
        },
        averagePaymentTime: {
          $avg: {
            $subtract: [
              { $toDate: { $max: { $arrayElemAt: ['$payments.date', -1] } } },
              '$invoiceDate',
            ],
          },
        },
      },
    },
  ]);
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

module.exports = mongoose.model('SmartInvoice', smartInvoiceSchema);
