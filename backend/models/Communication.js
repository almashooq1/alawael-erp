const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  // معلومات الاتصال الأساسية
  referenceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // نوع الاتصال
  type: {
    type: String,
    enum: ['incoming', 'outgoing', 'internal'],
    required: true,
    index: true
  },
  
  // معلومات المرسل والمستقبل
  sender: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    department: { type: String },
    organization: { type: String }
  },
  
  receiver: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    department: { type: String },
    organization: { type: String }
  },
  
  // التواريخ
  sentDate: {
    type: Date,
    required: true,
    index: true
  },
  receivedDate: {
    type: Date,
    index: true
  },
  dueDate: {
    type: Date,
    index: true
  },
  
  // الحالة والأولوية
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'under_review', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // التصنيف
  category: {
    type: String,
    enum: ['administrative', 'technical', 'financial', 'legal', 'hr', 'other'],
    default: 'administrative'
  },
  
  // المرفقات
  attachments: [{
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // نظام الموافقات
  approvalWorkflow: {
    enabled: { type: Boolean, default: false },
    currentStage: { type: Number, default: 0 },
    stages: [{
      order: Number,
      name: String,
      approver: {
        userId: String,
        name: String,
        email: String,
        role: String
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
      },
      actionDate: Date,
      comments: String
    }],
    completedDate: Date
  },
  
  // التتبع والأرشفة
  tracking: {
    viewedBy: [{
      userId: String,
      name: String,
      viewedAt: { type: Date, default: Date.now }
    }],
    forwardedTo: [{
      userId: String,
      name: String,
      forwardedAt: { type: Date, default: Date.now },
      notes: String
    }],
    responses: [{
      userId: String,
      userName: String,
      responseText: String,
      responseDate: { type: Date, default: Date.now },
      attachments: [String]
    }]
  },
  
  // الميزات الإضافية
  isStarred: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // QR Code
  qrCodeUrl: {
    type: String
  },
  
  // معلومات الإنشاء والتحديث
  createdBy: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: String
  },
  updatedBy: {
    userId: String,
    name: String,
    email: String
  },
  
  // ملاحظات داخلية
  internalNotes: [{
    userId: String,
    userName: String,
    note: String,
    createdAt: { type: Date, default: Date.now }
  }]
  
}, {
  timestamps: true, // يضيف createdAt و updatedAt تلقائياً
  collection: 'communications'
});

// إنشاء فهارس مركبة للبحث المتقدم
communicationSchema.index({ title: 'text', subject: 'text', description: 'text' });
communicationSchema.index({ type: 1, status: 1 });
communicationSchema.index({ priority: 1, dueDate: 1 });
communicationSchema.index({ sentDate: -1 });
communicationSchema.index({ isArchived: 1, isStarred: 1 });

// دالة لتوليد رقم مرجعي تلقائي
communicationSchema.statics.generateReferenceNumber = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({ 
    referenceNumber: new RegExp(`^COM-${year}-`) 
  });
  const nextNumber = String(count + 1).padStart(5, '0');
  return `COM-${year}-${nextNumber}`;
};

// دالة لتحديث حالة الاتصال بناءً على workflow
communicationSchema.methods.updateWorkflowStatus = function() {
  if (!this.approvalWorkflow.enabled) return;
  
  const stages = this.approvalWorkflow.stages;
  const allApproved = stages.every(s => s.status === 'approved');
  const anyRejected = stages.some(s => s.status === 'rejected');
  
  if (allApproved) {
    this.status = 'completed';
    this.approvalWorkflow.completedDate = new Date();
  } else if (anyRejected) {
    this.status = 'cancelled';
  } else {
    this.status = 'under_review';
  }
};

// Middleware قبل الحفظ
communicationSchema.pre('save', async function() {
  // توليد رقم مرجعي إذا لم يكن موجود
  if (!this.referenceNumber) {
    this.referenceNumber = await this.constructor.generateReferenceNumber();
  }
  next();
});

const Communication = mongoose.model('Communication', communicationSchema);

module.exports = Communication;
