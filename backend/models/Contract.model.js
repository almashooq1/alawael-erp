const mongoose = require('mongoose');

/**
 * Contract Schema - نموذج العقود والاتفاقيات مع الموردين
 */
const ContractSchema = new mongoose.Schema({
  // ===== معلومات العقد الأساسية =====
  contractNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  }, // CT-2026-001
  
  contractTitle: {
    type: String,
    required: true,
  },
  
  contractType: {
    type: String,
    enum: [
      'SUPPLY_AGREEMENT', // اتفاقية توريد
      'FRAMEWORK_AGREEMENT', // اتفاقية إطار
      'ONE_TIME_PURCHASE', // شراء لمرة واحدة
      'MAINTENANCE_AGREEMENT', // اتفاقية الصيانة
      'SERVICE_AGREEMENT', // اتفاقية الخدمات
      'DISTRIBUTION_AGREEMENT', // اتفاقية التوزيع
    ],
    required: true,
  },
  
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED'],
    default: 'DRAFT',
  },
  
  // ===== الأطراف =====
  supplier: {
    supplierId: mongoose.Schema.Types.ObjectId,
    supplierCode: String,
    supplierName: String,
    supplierAddress: String,
    signatory: String,
  },
  
  organization: {
    organizationName: String,
    address: String,
    signatory: String,
    signatoryTitle: String,
  },
  
  // ===== تواريخ العقد =====
  startDate: {
    type: Date,
    required: true,
  },
  
  endDate: {
    type: Date,
    required: true,
  },
  
  executionDate: Date, // تاريخ التوقيع
  
  renewalTerms: {
    isAutoRenewal: Boolean,
    renewalPeriod: String, // '1 year', '6 months'
    renewalNoticeRequired: Number, // أيام قبل الانتهاء
  },
  
  // ===== الشروط المالية =====
  financialTerms: {
    paymentTerms: String,
    creditDays: Number,
    discountStructure: [{
      volumeFrom: Number,
      volumeTo: Number,
      discountPercentage: Number,
    }],
    priceAdjustmentClause: String,
    paymentMethod: String,
    currency: { type: String, default: 'SAR' },
  },
  
  // ===== الشروط التسليم =====
  deliveryTerms: {
    deliveryMethod: String,
    leadTime: Number,
    incoterms: String, // FOB, CIF, etc.
    deliveryLocation: String,
    handlingCharges: String,
  },
  
  // ===== الالتزامات والحقوق =====
  obligations: {
    supplier: [String], // التزامات المورد
    buyer: [String], // التزامات المشتري
  },
  
  terms: {
    qualityStandards: String,
    warrantyPeriod: Number, // أيام
    returnPolicy: String,
    inspectionRights: String,
  },
  
  // ===== الخصوصيات والسرية =====
  confidentiality: {
    isConfidential: Boolean,
    confidentialityDuration: Number, // سنوات
    disclosureRestrictions: String,
  },
  
  // ===== المنتجات المغطاة =====
  products: [{
    productCode: String,
    productName: String,
    supplierId: mongoose.Schema.Types.ObjectId,
    minPrice: Number,
    maxPrice: Number,
    estimatedVolume: Number,
    leadTime: Number,
  }],
  
  // ===== الشروط العامة =====
  generalterms: {
    minimumOrder: Number,
    maximumOrder: Number,
    exclusivity: Boolean,
    nonCompete: Boolean,
    intellectualPropertyRights: String,
  },
  
  // ===== المسؤوليات والتأمين =====
  liabilityInsurance: {
    required: Boolean,
    amount: Number,
    type: String,
  },
  
  indemnification: String,
  forceMAjeure: String,
  
  // ===== الإنهاء والتجديد =====
  termination: {
    terminationClause: String,
    terminationNotice: Number, // أيام
    terminationForCause: String,
    terminationFees: String,
  },
  
  // ===== المراجعة والتحديثات =====
  amendments: [{
    amendmentNumber: String,
    amendmentDate: Date,
    description: String,
    changedClauses: String,
    documentUrl: String,
  }],
  
  // ===== المراقبة والأداء =====
  performanceMetrics: {
    qualityMetric: String,
    deliveryMetric: String,
    responseTimeMetric: String,
    penaltyClause: String,
    incentiveClause: String,
  },
  
  // ===== المنازعات =====
  disputes: {
    governingLaw: String,
    jurisdiction: String,
    arbitration: String,
    escalationProcess: String,
  },
  
  // ===== المراجع والمراجعة =====
  contractValue: {
    minValue: Number,
    maxValue: Number,
    estimatedAnnualValue: Number,
    currency: { type: String, default: 'SAR' },
  },
  
  reviewSchedule: {
    annualReview: Boolean,
    nextReviewDate: Date,
    lastReviewDate: Date,
    reviewComments: String,
  },
  
  // ===== الملفات والوثائق =====
  documents: [{
    documentType: String,
    fileName: String,
    fileUrl: String,
    uploadDate: Date,
    version: Number,
  }],
  
  contractDocument: {
    fileName: String,
    fileUrl: String,
    uploadDate: Date,
  },
  
  // ===== الموافقات =====
  approvals: [{
    approverId: mongoose.Schema.Types.ObjectId,
    approverName: String,
    approverRole: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvalDate: Date,
    comments: String,
  }],
  
  // ===== البيانات الوصفية =====
  notes: String,
  internalNotes: String,
  tags: [String],
  
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedBy: mongoose.Schema.Types.ObjectId,
  updatedAt: { type: Date, default: Date.now },
  
  // ===== التنبيهات =====
  alerts: [{
    alertType: String,
    message: String,
    alertDate: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
  }],
}, {
  timestamps: true,
  collection: 'contracts',
});

// Indexes
ContractSchema.index({ contractNumber: 1 });
ContractSchema.index({ 'supplier.supplierId': 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ startDate: 1, endDate: 1 });
ContractSchema.index({ contractType: 1 });

// Virtuals
ContractSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'ACTIVE' && this.startDate <= now && this.endDate > now;
});

ContractSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

ContractSchema.virtual('daysUntilExpiry').get(function() {
  const days = Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(days, 0);
});

ContractSchema.virtual('expiresWithinMonths').get(function() {
  const daysToExpiry = this.daysUntilExpiry;
  return daysToExpiry <= 30;
});

ContractSchema.virtual('duration').get(function() {
  const milliseconds = this.endDate - this.startDate;
  const days = milliseconds / (1000 * 60 * 60 * 24);
  const months = days / 30;
  return {
    days: Math.floor(days),
    months: Math.floor(months),
    years: Math.floor(months / 12),
  };
});

// Methods
ContractSchema.methods = {
  /**
   * تفعيل العقد
   */
  activate() {
    if (new Date() < this.startDate) {
      return { success: false, message: 'Contract start date is in the future' };
    }
    this.status = 'ACTIVE';
    return { success: true };
  },

  /**
   * إنهاء العقد
   */
  terminate(reason, terminatedBy) {
    this.status = 'TERMINATED';
    this.alerts.push({
      alertType: 'TERMINATION',
      message: `Contract terminated: ${reason}`,
      alertDate: new Date(),
    });
    return true;
  },

  /**
   * تجديد العقد
   */
  renew(newEndDate) {
    if (!newEndDate) {
      newEndDate = new Date(this.endDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    this.endDate = newEndDate;
    this.status = 'ACTIVE';
    return true;
  },

  /**
   * إضافة تعديل
   */
  addAmendment(amendmentNumber, description, changedClauses) {
    this.amendments.push({
      amendmentNumber,
      amendmentDate: new Date(),
      description,
      changedClauses,
    });

    return this.amendments.length;
  },

  /**
   * هل يحتاج لتجديد قريب؟
   */
  needsRenewalSoon() {
    if (!this.renewalTerms?.renewalNoticeRequired) return false;
    return this.daysUntilExpiry <= this.renewalTerms.renewalNoticeRequired;
  },

  /**
   * إضافة تنبيه
   */
  addAlert(alertType, message) {
    this.alerts.push({
      alertType,
      message,
      alertDate: new Date(),
    });
  },

  /**
   * حساب القيمة المتوقعة
   */
  calculateEstimatedValue() {
    if (this.contractValue?.estimatedAnnualValue) {
      const durationInYears = this.duration.years;
      return this.contractValue.estimatedAnnualValue * (durationInYears || 1);
    }
    return 0;
  },

  /**
   * الحصول على الخصم تحت كمية معينة
   */
  getDiscountForVolume(volume) {
    if (!this.financialTerms?.discountStructure) return 0;

    for (let discount of this.financialTerms.discountStructure) {
      if (volume >= discount.volumeFrom && volume <= discount.volumeTo) {
        return discount.discountPercentage;
      }
    }
    return 0;
  },
};

// Statics
ContractSchema.statics = {
  /**
   * العقود النشطة
   */
  async getActiveContracts() {
    const now = new Date();
    return this.find({
      status: 'ACTIVE',
      startDate: { $lte: now },
      endDate: { $gt: now },
    });
  },

  /**
   * العقود التي تنتهي قريباً
   */
  async getExpiringContracts(daysAhead = 30) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.find({
      status: 'ACTIVE',
      endDate: { $gte: now, $lte: futureDate },
    }).sort({ endDate: 1 });
  },

  /**
   * عقود المورد
   */
  async getSupplierContracts(supplierId) {
    return this.find({
      'supplier.supplierId': supplierId,
    }).sort({ endDate: -1 });
  },

  /**
   * البحث عن العقود
   */
  async searchContracts(keyword, filters = {}) {
    const searchRegex = new RegExp(keyword, 'i');
    const query = {
      ...filters,
      $or: [
        { contractNumber: searchRegex },
        { contractTitle: searchRegex },
        { 'supplier.supplierName': searchRegex },
      ],
    };

    return this.find(query).sort({ createdAt: -1 });
  },

  /**
   * إحصائيات العقود
   */
  async getContractStatistics() {
    return this.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$contractValue.estimatedAnnualValue' },
        },
      },
    ]);
  },
};

module.exports = mongoose.model('Contract', ContractSchema);
