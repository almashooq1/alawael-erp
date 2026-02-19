const mongoose = require('mongoose');

/**
 * Purchase Request Schema - نموذج طلبات الشراء
 * يمثل الطلب الأولي قبل تحويله لأمر شراء رسمي
 */
const PurchaseRequestSchema = new mongoose.Schema({
  // ===== معلومات الطلب الأساسية =====
  requestNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  }, // PR-2026-0001
  
  requestDate: {
    type: Date,
    default: Date.now,
  },
  
  requiredDate: {
    type: Date,
    required: true,
  }, // تاريخ الحاجة للبضاعة
  
  status: {
    type: String,
    enum: [
      'DRAFT', // مسودة
      'PENDING_APPROVAL', // قيد الموافقة
      'APPROVED', // موافق عليه
      'REJECTED', // مرفوض
      'CONVERTED_TO_PO', // تم تحويله لأمر شراء
      'CANCELLED', // ملغى
    ],
    default: 'DRAFT',
  },
  
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
  },
  
  // ===== بيانات المشتري والقسم =====
  requester: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    department: String,
    email: String,
    phoneNumber: String,
  },
  
  department: String, // قسم الطلب
  costCenter: String, // مركز التكلفة
  
  // ===== تفاصيل البضاعة =====
  items: [{
    itemId: mongoose.Schema.Types.ObjectId,
    itemCode: String,
    itemName: String,
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      enum: ['PIECE', 'BOX', 'BAG', 'CARTON', 'KG', 'LITER', 'METER', 'OTHER'],
      default: 'PIECE',
    },
    estimatedUnitPrice: Number,
    estimatedTotal: Number,
    notes: String,
    specifications: String,
  }],
  
  // ===== المبلغ والميزانية =====
  summary: {
    totalItems: Number, // عدد الأصناف
    totalQuantity: Number, // الكمية الإجمالية
    estimatedValue: {
      type: Number,
      default: 0,
    }, // القيمة المتوقعة
    estimatedTax: Number,
    estimatedTotal: Number,
    budgetAvailable: Boolean,
    costAllocation: [{
      costCenter: String,
      percentage: Number,
      amount: Number,
    }],
  },
  
  // ===== طريقة الشراء =====
  purchaseMethod: {
    type: String,
    enum: [
      'DIRECT_PURCHASE', // شراء مباشر
      'COMPETITIVE_BIDDING', // طلب عروض
      'NEGOTIATION', // مفاوضات
      'EMERGENCY', // طوارئ
      'FRAMEWORK_AGREEMENT', // اتفاقية إطار
    ],
    default: 'COMPETITIVE_BIDDING',
  },
  
  minimumSuppliers: {
    type: Number,
    default: 3,
  }, // عدد العروض المطلوبة
  
  // ===== سير العمل والموافقات =====
  approvalworkflow: {
    type: String,
    enum: ['SIMPLE', 'STANDARD', 'COMPLEX', 'SPECIAL'],
    default: 'STANDARD',
  },
  
  approvals: [{
    approverId: mongoose.Schema.Types.ObjectId,
    approverName: String,
    approverRole: String,
    level: Number, // مستوى الموافقة
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    comments: String,
    approvalDate: Date,
    delegatedTo: mongoose.Schema.Types.ObjectId, // في حالة التفويض
  }],
  
  currentApprovalLevel: {
    type: Number,
    default: 1,
  },
  
  isApproved: {
    type: Boolean,
    default: false,
  },
  
  // ===== ملاحظات وإرفاقات =====
  justification: String, // تبرير الطلب
  businessCase: String, // الحالة التجارية
  notes: String,
  
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadDate: Date,
  }],
  
  // ===== تحويل لأمر شراء =====
  relatedPurchaseOrder: {
    poId: mongoose.Schema.Types.ObjectId,
    poNumber: String,
    conversionDate: Date,
  },
  
  // ===== المراجع =====
  referenceNumbers: [String], // RFQ, Purchase Requisition, etc.
  projectCode: String,
  contractReference: String,
  
  // ===== معايير الاختيار =====
  selectionCriteria: [{
    criterion: String,
    weight: Number, // وزن المعيار %
    description: String,
  }],
  
  // ===== الأحداث والتغييرات =====
  history: [{
    event: String,
    changedBy: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now },
    details: String,
  }],
  
  // ===== البيانات الوصفية =====
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedBy: mongoose.Schema.Types.ObjectId,
  updatedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  expectedApprovalDate: Date,
  
  // ===== حقول إضافية =====
  tags: [String],
  isUrgent: { type: Boolean, default: false },
  reminderDate: Date,
  source: {
    type: String,
    enum: ['MANUAL', 'AUTOMATED', 'SYSTEM', 'API'],
    default: 'MANUAL',
  },
}, {
  timestamps: true,
  collection: 'purchase_requests',
});

// Indexes
PurchaseRequestSchema.index({ requestNumber: 1 });
PurchaseRequestSchema.index({ status: 1 });
PurchaseRequestSchema.index({ requiredDate: 1 });
PurchaseRequestSchema.index({ requester: 1 });
PurchaseRequestSchema.index({ department: 1 });
PurchaseRequestSchema.index({ createdAt: -1 });
PurchaseRequestSchema.index({ 'summary.estimatedValue': -1 });
PurchaseRequestSchema.index({ priority: 1 });

// Virtuals
PurchaseRequestSchema.virtual('daysUntilRequired').get(function() {
  const days = Math.ceil((this.requiredDate - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(days, 0);
});

PurchaseRequestSchema.virtual('isOverdue').get(function() {
  return this.requiredDate < new Date() && this.status !== 'CONVERTED_TO_PO';
});

PurchaseRequestSchema.virtual('approvalProgress').get(function() {
  if (this.approvals.length === 0) return 0;
  const approved = this.approvals.filter(a => a.status === 'APPROVED').length;
  return (approved / this.approvals.length) * 100;
});

// Methods
PurchaseRequestSchema.methods = {
  /**
   * حساب القيمة الإجمالية
   */
  calculateTotals() {
    let totalQty = 0;
    let totalValue = 0;

    this.items.forEach(item => {
      totalQty += item.quantity;
      if (item.estimatedUnitPrice) {
        totalValue += item.quantity * item.estimatedUnitPrice;
      }
    });

    this.summary.totalQuantity = totalQty;
    this.summary.estimatedValue = totalValue;
    this.summary.estimatedTax = totalValue * 0.15; // 15% tax
    this.summary.estimatedTotal = totalValue + this.summary.estimatedTax;

    return this.summary;
  },

  /**
   * إضافة موافقة جديدة
   */
  addApproval(approvalData) {
    this.approvals.push({
      approverId: approvalData.approverId,
      approverName: approvalData.approverName,
      approverRole: approvalData.approverRole,
      level: approvalData.level || this.approvals.length + 1,
      status: 'PENDING',
    });

    this.history.push({
      event: 'APPROVAL_REQUESTED',
      changedBy: approvalData.requestedBy,
      details: `Requested approval from ${approvalData.approverName}`,
    });
  },

  /**
   * الموافقة على الطلب
   */
  approve(approverId, comments = '') {
    const approval = this.approvals.find(a => a.approverId.toString() === approverId.toString());
    if (!approval) return false;

    approval.status = 'APPROVED';
    approval.approvalDate = new Date();
    approval.comments = comments;

    this.history.push({
      event: 'APPROVED',
      changedBy: approverId,
      details: comments,
    });

    // Check if all approvals are done
    const allApproved = this.approvals.every(a => a.status === 'APPROVED');
    if (allApproved) {
      this.status = 'APPROVED';
      this.isApproved = true;
    }

    return true;
  },

  /**
   * رفض الطلب
   */
  reject(approverId, reason) {
    const approval = this.approvals.find(a => a.approverId.toString() === approverId.toString());
    if (!approval) return false;

    approval.status = 'REJECTED';
    approval.approvalDate = new Date();
    approval.comments = reason;

    this.status = 'REJECTED';
    this.history.push({
      event: 'REJECTED',
      changedBy: approverId,
      details: reason,
    });

    return true;
  },

  /**
   * هل يمكن تحويله لأمر شراء؟
   */
  canConvertPO() {
    return this.status === 'APPROVED' && this.isApproved;
  },

  /**
   * إضافة تاريخ أحداث
   */
  addHistoryEvent(event, userId, details = '') {
    this.history.push({
      event,
      changedBy: userId,
      details,
      timestamp: new Date(),
    });
  },
};

// Statics
PurchaseRequestSchema.statics = {
  /**
   * الحصول على جميع الطلبات المعلقة
   */
  async getPendingApprovals() {
    return this.find({ status: 'PENDING_APPROVAL' }).sort({ createdAt: -1 });
  },

  /**
   * الحصول على الطلبات العاجلة
   */
  async getUrgentRequests() {
    return this.find({
      priority: 'URGENT',
      status: { $in: ['DRAFT', 'PENDING_APPROVAL'] },
    }).sort({ createdAt: -1 });
  },

  /**
   * الحصول على الطلبات المتأخرة
   */
  async getOverdueRequests() {
    const now = new Date();
    return this.find({
      requiredDate: { $lt: now },
      status: { $nin: ['CONVERTED_TO_PO', 'CANCELLED'] },
    }).sort({ requiredDate: 1 });
  },

  /**
   * جميع طلبات القسم
   */
  async getDepartmentRequests(department, status = null) {
    const query = { department };
    if (status) query.status = status;
    return this.find(query).sort({ createdAt: -1 });
  },

  /**
   * إحصائيات الطلبات
   */
  async getStatistics(filters = {}) {
    return this.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$summary.estimatedValue' },
        },
      },
    ]);
  },
};

module.exports = mongoose.model('PurchaseRequest', PurchaseRequestSchema);
