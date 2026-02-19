const mongoose = require('mongoose');

/**
 * Supplier Schema - نموذج الموردين
 * يتضمن معلومات الاتصال والأداء والعقود
 */
const SupplierSchema = new mongoose.Schema({
  // ===== معلومات أساسية =====
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  }, // SUP-001
  name: {
    type: String,
    required: true,
    trim: true,
  }, // اسم المورد
  nameEn: {
    type: String,
    trim: true,
  }, // English name
  
  // ===== تصنيف المورد =====
  category: {
    type: String,
    enum: ['MEDICAL', 'PPE', 'THERAPY', 'EQUIPMENT', 'FOOD', 'OTHER'],
    required: true,
  },
  subcategories: [String], // فئات فرعية
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'UNDER_REVIEW'],
    default: 'ACTIVE',
  },
  
  // ===== معلومات الاتصال =====
  contact: {
    contactPerson: String,
    email: String,
    phone: String,
    mobile: String,
    fax: String,
    website: String,
  },
  
  address: {
    street: String,
    city: String,
    region: String,
    country: String,
    postalCode: String,
  },
  
  shippingAddress: {
    street: String,
    city: String,
    region: String,
    country: String,
    postalCode: String,
  },
  
  // ===== شروط الدفع والتسليم =====
  paymentTerms: {
    method: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'LETTER_OF_CREDIT'],
      default: 'BANK_TRANSFER',
    },
    creditDays: { type: Number, default: 30 }, // أيام الائتمان
    depositPercentage: { type: Number, min: 0, max: 100 }, // نسبة العربون
  },
  
  deliveryTerms: {
    leadTime: { type: Number, default: 5 }, // أيام التسليم
    minimumOrder: { type: Number, default: 0 }, // الحد الأدنى للطلب
    shippingCost: String, // تكلفة الشحن
    freeShippingAbove: Number, // شحن مجاني فوق
  },
  
  // ===== معلومات القانون والموثوقية =====
  taxId: String, // الرقم الضريبي
  businessLicense: String, // رقم السجل التجاري
  bankAccount: {
    bankName: String,
    accountNumber: String,
    iban: String,
    swiftCode: String,
  },
  
  // ===== مقاييس الأداء =====
  performance: {
    overallRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 3,
    }, // 0-5
    qualityRating: { type: Number, min: 0, max: 5 },
    deliveryRating: { type: Number, min: 0, max: 5 },
    serviceRating: { type: Number, min: 0, max: 5 },
    priceCompetitiveness: { type: Number, min: 0, max: 5 },
    
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    onTimeOrders: { type: Number, default: 0 },
    defectiveItems: { type: Number, default: 0 },
    
    onTimePercentage: { type: Number, default: 0 }, // نسبة الالتزام بالوقت
    qualityPassRate: { type: Number, default: 0 }, // نسبة الجودة
    responseTime: { type: Number, default: 24 }, // ساعات الرد
  },
  
  // ===== المنتجات والأسعار =====
  products: [{
    productId: mongoose.Schema.Types.ObjectId,
    productCode: String,
    productName: String,
    unitPrice: Number,
    currency: { type: String, default: 'SAR' },
    minimumQuantity: Number,
    leadTime: Number,
    isActive: { type: Boolean, default: true },
  }],
  
  priceHistory: [{
    productId: mongoose.Schema.Types.ObjectId,
    oldPrice: Number,
    newPrice: Number,
    changeDate: Date,
    reason: String,
  }],
  
  // ===== العقود والاتفاقيات =====
  contracts: [{
    contractId: mongoose.Schema.Types.ObjectId,
    contractNumber: String,
    startDate: Date,
    endDate: Date,
    isActive: Boolean,
  }],
  
  // ===== التصنيف والموثوقية =====
  certifications: [String], // ISO, CE, etc.
  references: [String], // مراجع
  notes: String,
  tags: [String],
  
  // ===== تتبع التغييرات =====
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedBy: mongoose.Schema.Types.ObjectId,
  updatedAt: { type: Date, default: Date.now },
  lastActivityDate: Date,
  
  // ===== معلومات إضافية =====
  isPreferredVendor: { type: Boolean, default: false },
  discountStructure: [{
    quantityFrom: Number,
    quantityTo: Number,
    discountPercentage: Number,
  }],
  
  documents: [{
    type: String, // LICENSE, CERTIFICATE, CONTRACT
    url: String,
    uploadDate: Date,
  }],
  
  // ===== التصعيد والتنبيهات =====
  escalationContacts: [{
    name: String,
    designation: String,
    email: String,
    phone: String,
  }],
  
  // ===== التحليلات =====
  analytics: {
    totalSpend: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    monthlySpend: Number,
    bestProduct: String,
    worstPerformingMonth: String,
  },
}, {
  timestamps: true,
  collection: 'suppliers',
});

// Indexes for better query performance
SupplierSchema.index({ code: 1 });
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ category: 1 });
SupplierSchema.index({ status: 1 });
SupplierSchema.index({ 'performance.overallRating': -1 });
SupplierSchema.index({ isPreferredVendor: 1 });

// Virtual for full address
SupplierSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.region}`;
});

// Methods
SupplierSchema.methods = {
  /**
   * حساب متوسط الأداء
   */
  calculateOverallRating() {
    const { qualityRating = 3, deliveryRating = 3, serviceRating = 3, priceCompetitiveness = 3 } = this.performance;
    this.performance.overallRating = (qualityRating + deliveryRating + serviceRating + priceCompetitiveness) / 4;
    return this.performance.overallRating;
  },

  /**
   * تحديث معدل الالتزام بالوقت
   */
  updateOnTimePercentage() {
    if (this.performance.totalOrders > 0) {
      this.performance.onTimePercentage = (this.performance.onTimeOrders / this.performance.totalOrders) * 100;
    }
    return this.performance.onTimePercentage;
  },

  /**
   * هل المورد موثوق؟
   */
  isTrustworthy() {
    return this.performance.overallRating >= 4 && 
           this.performance.onTimePercentage >= 80 &&
           this.status === 'ACTIVE';
  },

  /**
   * الحصول على أفضل سعر للمنتج
   */
  getBestPrice(quantity = 1) {
    const discounts = this.discountStructure || [];
    let applicableDiscount = 0;
    
    for (let d of discounts) {
      if (quantity >= d.quantityFrom && quantity <= d.quantityTo) {
        applicableDiscount = d.discountPercentage;
        break;
      }
    }
    
    return applicableDiscount;
  },
};

// Statics
SupplierSchema.statics = {
  /**
   * الحصول على الموردين الموثوقين
   */
  async getTrustworthySuppliers(category = null) {
    const query = {
      status: 'ACTIVE',
      'performance.overallRating': { $gte: 4 },
      'performance.onTimePercentage': { $gte: 80 },
      isPreferredVendor: true,
    };

    if (category) {
      query.category = category;
    }

    return this.find(query).sort({ 'performance.overallRating': -1 });
  },

  /**
   * تصنيف الموردين حسب الأداء
   */
  async rankSuppliersByPerformance(limit = 10) {
    return this.find({ status: 'ACTIVE' })
      .sort({ 'performance.overallRating': -1 })
      .limit(limit);
  },

  /**
   * البحث عن موردين بكلمات مفتاحية
   */
  async searchSuppliers(keyword, filters = {}) {
    const searchRegex = new RegExp(keyword, 'i');
    const query = {
      ...filters,
      $or: [
        { name: searchRegex },
        { nameEn: searchRegex },
        { code: searchRegex },
        { 'contact.email': searchRegex },
      ],
    };

    return this.find(query);
  },
};

module.exports = mongoose.model('Supplier', SupplierSchema);
