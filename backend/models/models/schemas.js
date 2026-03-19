const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============ USER SCHEMA ============
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: 100,
    },
    // توكنات FCM للأجهزة (دعم إشعارات الجوال)
    fcmTokens: {
      type: [String],
      default: [],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    // دعم متعدد المؤسسات والفروع
    organizationId: {
      type: String,
      required: false
    },
    branchId: {
      type: String,
      required: false
    },
    // دعم صلاحيات متقدمة (RBAC)
    role: {
      type: String,
      enum: ['admin', 'manager', 'user', 'viewer', 'driver', 'operator', 'supervisor', 'employee', 'staff', 'investigator'],
      default: 'user',
    },
    roles: [{ type: String }], // أدوار إضافية (مثال: ['finance', 'hr', 'branch-admin'])
    permissions: [{ type: String }], // صلاحيات granular (مثال: ['read:attendance', 'edit:invoice'])
    department: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    // إعدادات قنوات التنبيه
    notificationChannels: {
      type: Object,
      default: () => ({
        inApp: true,
        email: true,
        sms: true,
        whatsapp: true,
      }),
    },
    // granular event-based notification settings
    notificationPreferences: {
      type: Object,
      default: () => ({
        // مثال: event: { channel: enabled }
        // templateApproved: { inApp: true, email: false, sms: false, whatsapp: false },
      }),
    },
    avatar: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: String,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ============ PAGE SCHEMA ============
const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled'],
      default: 'draft',
    },
    category: String,
    tags: [String],
    seoTitle: String,
    seoDescription: String,
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: Date,
    scheduledFor: Date,
  },
  { timestamps: true }
);

// ============ POST SCHEMA ============
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: String,
    tags: [String],
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    featured: Boolean,
    views: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============ COMMENT SCHEMA ============
const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorEmail: String,
    authorName: String,
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============ MEDIA SCHEMA ============
const mediaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', 'other'],
      required: true,
    },
    size: Number,
    url: {
      type: String,
      required: true,
    },
    mimeType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    public: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ============ ANALYTICS SCHEMA ============
const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    eventType: String,
    eventData: mongoose.Schema.Types.Mixed,
    userAgent: String,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    page: String,
    referrer: String,
  },
  { timestamps: true }
);

// Create TTL index for analytics (auto-delete after 90 days)
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// ============ AUDIT LOG SCHEMA ============
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: String,
    resource: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    changes: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create TTL index for audit logs (auto-delete after 1 year)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

// ============ Create Models ============
const User = mongoose.model('User', userSchema);
const Page = mongoose.model('Page', pageSchema);
const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Media = mongoose.model('Media', mediaSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  User,
  Page,
  Post,
  Comment,
  Media,
  Analytics,
  AuditLog,
  userSchema,
  pageSchema,
  postSchema,
  commentSchema,
  mediaSchema,
  analyticsSchema,
  auditLogSchema,
};
