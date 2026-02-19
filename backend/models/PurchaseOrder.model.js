const mongoose = require('mongoose');

/**
 * Purchase Order Schema - نموذج أوامر الشراء
 * الوثيقة الرسمية للشراء من الموردين
 */
const PurchaseOrderSchema = new mongoose.Schema({
  // ===== معلومات الأمر الأساسية =====
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  }, // PO-2026-0001
  
  orderDate: {
    type: Date,
    default: Date.now,
  },
  
  requiredDeliveryDate: {
    type: Date,
    required: true,
  },
  
  status: {
    type: String,
    enum: [
      'DRAFT', // مسودة
      'ISSUED', // صادر
      'SENT_TO_SUPPLIER', // مرسل للمورد
      'ACKNOWLEDGED', // تم التأكيد من المورد
      'IN_PRODUCTION', // قيد الإنتاج
      'READY_FOR_DISPATCH', // جاهز للشحن
      'PARTIALLY_RECEIVED', // استقبال جزئي
      'FULLY_RECEIVED', // استقبال كامل
      'INVOICE_RECEIVED', // فاتورة مستلمة
      'PAID', // تم الدفع
      'CLOSED', // مغلق
      'CANCELLED', // ملغى
    ],
    default: 'DRAFT',
  },
  
  // ===== بيانات المورد =====
  supplier: {
    supplierId: mongoose.Schema.Types.ObjectId,
    supplierCode: String,
    supplierName: String,
    supplierEmail: String,
    supplierPhone: String,
    supplierAddress: String,
  },
  
  // ===== الطلب الأصلي =====
  relatedPurchaseRequest: {
    prId: mongoose.Schema.Types.ObjectId,
    prNumber: String,
  },
  
  // ===== تفاصيل البضاعة والأسعار =====
  items: [{
    itemCode: String,
    itemName: String,
    quantity: Number,
    unit: String,
    unitPrice: {
      type: Number,
      required: true,
    },
    totalPrice: Number,
    discount: {
      type: Number,
      default: 0,
    }, // مبلغ الخصم
    discountPercentage: { type: Number, default: 0 },
    discountedPrice: Number,
    tax: Number,
    taxPercentage: { type: Number, default: 15 },
    finalPrice: Number,
    description: String,
    specifications: String,
    deliverySchedule: [{
      deliveryDate: Date,
      quantity: Number,
    }],
    receivedQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'],
      default: 'PENDING',
    },
  }],
  
  // ===== ملخص الأسعار =====
  summary: {
    totalItems: Number,
    totalQuantity: Number,
    subtotal: {
      type: Number,
      default: 0,
    },
    totalDiscount: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    subtotalAfterDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    insuranceCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: {
      type: Number,
      default: 0,
    },
    currency: { type: String, default: 'SAR' },
  },
  
  // ===== شروط التسليم والدفع =====
  deliveryTerms: {
    deliveryMethod: {
      type: String,
      enum: ['PICKUP', 'DELIVERY', 'DHL', 'ARAMEX', 'SMSA', 'OTHER'],
      default: 'DELIVERY',
    },
    deliveryAddress: String,
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    trackingNumber: String,
  },
  
  paymentTerms: {
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'LETTER_OF_CREDIT'],
    },
    creditDays: Number,
    depositRequired: {
      type: Number,
      default: 0,
    },
    depositPaid: { type: Boolean, default: false },
    depositPaidDate: Date,
  },
  
  // ===== الفاتورة والدفع =====
  invoicing: {
    invoiceNumber: String,
    invoiceDate: Date,
    invoiceAmount: Number,
    invoiceUrl: String,
    paymentDueDate: Date,
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['NOT_INVOICED', 'INVOICED', 'PARTIALLY_PAID', 'FULLY_PAID'],
      default: 'NOT_INVOICED',
    },
    paymentHistory: [{
      paymentDate: Date,
      amountPaid: Number,
      paymentMethod: String,
      referenceNumber: String,
      notes: String,
    }],
  },
  
  // ===== الاستقبال والتفتيش =====
  reception: {
    expectedReceiptDate: Date,
    actualReceiptDate: Date,
    receivedBy: mongoose.Schema.Types.ObjectId,
    inspectedBy: mongoose.Schema.Types.ObjectId,
    inspectionDate: Date,
    qualityIssues: [{
      itemCode: String,
      issue: String,
      severity: { type: String, enum: ['MINOR', 'MAJOR', 'CRITICAL'] },
      actionTaken: String,
    }],
    damagedItems: Number,
    shortageItems: [{
      itemCode: String,
      expectedQuantity: Number,
      receivedQuantity: Number,
    }],
    overageItems: [{
      itemCode: String,
      expectedQuantity: Number,
      receivedQuantity: Number,
    }],
    receivingNotes: String,
  },
  
  // ===== الملاحظات والمراجع =====
  notes: String,
  internalNotes: String,
  termsAndConditions: String,
  
  references: {
    jobNumber: String,
    projectCode: String,
    contractNumber: String,
    costCenter: String,
  },
  
  approvalChain: [{
    approverId: mongoose.Schema.Types.ObjectId,
    approverName: String,
    role: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvalDate: Date,
    comments: String,
  }],
  
  // ===== المرفقات والوثائق =====
  attachments: [{
    documentType: String,
    fileName: String,
    fileUrl: String,
    uploadDate: Date,
    uploadedBy: mongoose.Schema.Types.ObjectId,
  }],
  
  // ===== التتبع والتاريخ =====
  history: [{
    event: String,
    changedBy: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now },
    details: String,
    previousStatus: String,
    newStatus: String,
  }],
  
  // ===== الإخطارات والتنبيهات =====
  alerts: [{
    alertType: String,
    message: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    createdAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
  }],
  
  // ===== البيانات الوصفية =====
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedBy: mongoose.Schema.Types.ObjectId,
  updatedAt: { type: Date, default: Date.now },
  cancelledBy: mongoose.Schema.Types.ObjectId,
  cancelledAt: Date,
  cancellationReason: String,
  
  tags: [String],
  isArmendment: { type: Boolean, default: false },
  originalPONumber: String,
  amendments: [mongoose.Schema.Types.ObjectId],
}, {
  timestamps: true,
  collection: 'purchase_orders',
});

// Indexes
PurchaseOrderSchema.index({ orderNumber: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ 'supplier.supplierId': 1 });
PurchaseOrderSchema.index({ requiredDeliveryDate: 1 });
PurchaseOrderSchema.index({ orderDate: -1 });
PurchaseOrderSchema.index({ 'summary.grandTotal': -1 });
PurchaseOrderSchema.index({ relatedPurchaseRequest: 1 });

// Virtuals
PurchaseOrderSchema.virtual('daysUntilDelivery').get(function() {
  const days = Math.ceil((this.requiredDeliveryDate - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(days, 0);
});

PurchaseOrderSchema.virtual('isOverdue').get(function() {
  return this.requiredDeliveryDate < new Date() && 
         !['FULLY_RECEIVED', 'CLOSED', 'CANCELLED'].includes(this.status);
});

PurchaseOrderSchema.virtual('deliveryProgress').get(function() {
  const totalQty = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const receivedQty = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  return totalQty > 0 ? (receivedQty / totalQty) * 100 : 0;
});

// Methods
PurchaseOrderSchema.methods = {
  /**
   * حساب الأسعار الإجمالية
   */
  calculateTotals() {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    this.items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = itemTotal * (item.discountPercentage / 100);
      const itemSubtotal = itemTotal - itemDiscount;
      const itemTax = itemSubtotal * (item.taxPercentage / 100);

      item.totalPrice = itemTotal;
      item.discountedPrice = itemDiscount;
      item.tax = itemTax;
      item.finalPrice = itemSubtotal + itemTax;

      subtotal += itemTotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });

    this.summary.subtotal = subtotal;
    this.summary.totalDiscount = totalDiscount;
    this.summary.subtotalAfterDiscount = subtotal - totalDiscount;
    this.summary.totalTax = totalTax;
    this.summary.grandTotal = 
      this.summary.subtotalAfterDiscount + 
      totalTax + 
      (this.summary.shippingCost || 0) + 
      (this.summary.insuranceCost || 0) + 
      (this.summary.otherCharges || 0);

    return this.summary;
  },

  /**
   * تسجيل استقبال جزئي
   */
  recordPartialReceipt(itemCode, receivedQuantity) {
    const item = this.items.find(i => i.itemCode === itemCode);
    if (!item) return false;

    item.receivedQuantity = (item.receivedQuantity || 0) + receivedQuantity;
    item.status = item.receivedQuantity === item.quantity ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';

    const allReceived = this.items.every(i => i.status === 'FULLY_RECEIVED');
    if (allReceived) {
      this.status = 'FULLY_RECEIVED';
      this.reception.actualReceiptDate = new Date();
    } else {
      this.status = 'PARTIALLY_RECEIVED';
    }

    return true;
  },

  /**
   * تسجيل دفعة
   */
  recordPayment(amount, method, referenceNumber) {
    this.invoicing.paymentHistory.push({
      paymentDate: new Date(),
      amountPaid: amount,
      paymentMethod: method,
      referenceNumber,
    });

    this.invoicing.amountPaid = (this.invoicing.amountPaid || 0) + amount;
    this.invoicing.amountDue = (this.invoicing.invoiceAmount || 0) - this.invoicing.amountPaid;

    if (this.invoicing.amountDue === 0) {
      this.invoicing.paymentStatus = 'FULLY_PAID';
      this.status = 'PAID';
    } else if (this.invoicing.amountPaid > 0) {
      this.invoicing.paymentStatus = 'PARTIALLY_PAID';
    }

    return true;
  },

  /**
   * إلغاء الأمر
   */
  cancel(reason, cancelledBy) {
    this.status = 'CANCELLED';
    this.cancellationReason = reason;
    this.cancelledBy = cancelledBy;
    this.cancelledAt = new Date();

    this.addHistoryEvent('CANCELLED', cancelledBy, reason);
  },

  /**
   * إضافة حدث للتاريخ
   */
  addHistoryEvent(event, userId, details = '', previousStatus = null) {
    this.history.push({
      event,
      changedBy: userId,
      details,
      previousStatus,
      newStatus: this.status,
      timestamp: new Date(),
    });
  },

  /**
   * إضافة تنبيه
   */
  addAlert(alertType, message, severity = 'MEDIUM') {
    this.alerts.push({
      alertType,
      message,
      severity,
      createdAt: new Date(),
    });
  },
};

// Statics
PurchaseOrderSchema.statics = {
  /**
   * جميع الأوامر المعلقة
   */
  async getPendingOrders() {
    return this.find({
      status: { $nin: ['CLOSED', 'CANCELLED'] },
    }).sort({ requiredDeliveryDate: 1 });
  },

  /**
   * الأوامر المتأخرة
   */
  async getOverdueOrders() {
    const now = new Date();
    return this.find({
      requiredDeliveryDate: { $lt: now },
      status: { $nin: ['FULLY_RECEIVED', 'CLOSED', 'CANCELLED'] },
    }).sort({ requiredDeliveryDate: 1 });
  },

  /**
   * أوامر المورد
   */
  async getSupplierOrders(supplierId, status = null) {
    const query = { 'supplier.supplierId': supplierId };
    if (status) query.status = status;
    return this.find(query).sort({ orderDate: -1 });
  },

  /**
   * إحصائيات الأوامر
   */
  async getOrderStatistics(filters = {}) {
    return this.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$summary.grandTotal' },
        },
      },
    ]);
  },
};

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
