/**
 * Message Model - Phase 3
 * نموذج الرسائل للدردشة الفورية
 *
 * Features:
 * - دعم الرسائل النصية
 * - مشاركة الملفات
 * - حالة القراءة
 * - حالة الكتابة
 * - ردود على الرسائل
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // معلومات المحادثة
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    // المرسل
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // محتوى الرسالة
    content: {
      text: {
        type: String,
        maxlength: 5000,
      },
      type: {
        type: String,
        enum: ['text', 'image', 'file', 'audio', 'video', 'location'],
        default: 'text',
      },
    },

    // الملفات المرفقة
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        thumbnailUrl: String,
      },
    ],

    // رد على رسالة
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },

    // حالة القراءة
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // حالة التسليم
    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // الرسالة محذوفة
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // محذوفة لمستخدمين معينين
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // رسالة معدلة
    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: Date,

    // تثبيت الرسالة
    isPinned: {
      type: Boolean,
      default: false,
    },

    // معلومات إضافية
    metadata: {
      deviceInfo: String,
      ipAddress: String,
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'readBy.user': 1 });

// Virtual: عدد القراءات
messageSchema.virtual('readCount').get(function () {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual: هل تم قراءة الرسالة
messageSchema.virtual('isRead').get(function () {
  return this.readBy && this.readBy.length > 0;
});

// Method: تحديد قراءة الرسالة
messageSchema.methods.markAsRead = async function (userId) {
  if (!this.readBy.some(r => r.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId, readAt: new Date() });
    await this.save();
  }
  return this;
};

// Method: تحديد تسليم الرسالة
messageSchema.methods.markAsDelivered = async function (userId) {
  if (!this.deliveredTo.some(d => d.user.toString() === userId.toString())) {
    this.deliveredTo.push({ user: userId, deliveredAt: new Date() });
    await this.save();
  }
  return this;
};

// Method: حذف الرسالة لمستخدم معين
messageSchema.methods.deleteForUser = async function (userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
    await this.save();
  }
  return this;
};

// Static: احصل على رسائل محادثة
messageSchema.statics.getConversationMessages = async function (conversationId, userId, options = {}) {
  const { page = 1, limit = 50 } = options;

  const query = {
    conversationId,
    deletedFor: { $ne: userId },
  };

  return this.find(query)
    .populate('sender', 'fullName email avatar role')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static: احصل على عدد الرسائل غير المقروءة
messageSchema.statics.getUnreadCount = async function (conversationId, userId) {
  return this.countDocuments({
    conversationId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
    deletedFor: { $ne: userId },
  });
};

// Static: تحديد جميع الرسائل كمقروءة
messageSchema.statics.markAllAsRead = async function (conversationId, userId) {
  const messages = await this.find({
    conversationId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
    deletedFor: { $ne: userId },
  });

  await Promise.all(messages.map(msg => msg.markAsRead(userId)));

  return messages.length;
};

// Hook: قبل الحفظ
messageSchema.pre('save', function (next) {
  // تحديث وقت التعديل
  if (this.isModified('content.text')) {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  next();
});

// Hook: بعد الحفظ - إرسال إشعار
messageSchema.post('save', async function (doc) {
  // يمكن إضافة إشعارات هنا
  // await notificationService.sendMessageNotification(doc);
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
