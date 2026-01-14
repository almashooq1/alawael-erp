/**
 * Conversation Model - Phase 3
 * نموذج المحادثات للدردشة الفورية
 *
 * Features:
 * - محادثات ثنائية ومجموعات
 * - حالة الكتابة
 * - آخر رسالة
 * - عدد الرسائل غير المقروءة
 * - إعدادات المحادثة
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // نوع المحادثة
    type: {
      type: String,
      enum: ['private', 'group', 'channel'],
      default: 'private',
      required: true,
    },

    // المشاركون (للمحادثات الثنائية والمجموعات)
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        lastReadAt: Date,
        notifications: {
          enabled: {
            type: Boolean,
            default: true,
          },
          muted: {
            type: Boolean,
            default: false,
          },
          mutedUntil: Date,
        },
      },
    ],

    // معلومات المجموعة (للمحادثات الجماعية)
    groupInfo: {
      name: {
        type: String,
        maxlength: 100,
      },
      description: {
        type: String,
        maxlength: 500,
      },
      avatar: String,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // آخر رسالة
    lastMessage: {
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      sentAt: Date,
      messageType: String,
    },

    // إحصائيات المحادثة
    stats: {
      totalMessages: {
        type: Number,
        default: 0,
      },
      totalParticipants: {
        type: Number,
        default: 0,
      },
    },

    // حالة الكتابة (من يكتب الآن)
    typingUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        startedAt: Date,
      },
    ],

    // الرسائل المثبتة
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],

    // إعدادات المحادثة
    settings: {
      allowInvites: {
        type: Boolean,
        default: true,
      },
      allowMessageDelete: {
        type: Boolean,
        default: true,
      },
      allowMediaSharing: {
        type: Boolean,
        default: true,
      },
      maxParticipants: {
        type: Number,
        default: 100,
      },
    },

    // المحادثة مؤرشفة
    isArchived: {
      type: Boolean,
      default: false,
    },

    // محادثة محذوفة
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // آخر نشاط
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // معلومات إضافية
    metadata: {
      tags: [String],
      category: String,
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
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
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ type: 1, lastActivityAt: -1 });
conversationSchema.index({ 'participants.user': 1, lastActivityAt: -1 });

// Virtual: عدد المشاركين النشطين
conversationSchema.virtual('activeParticipantsCount').get(function () {
  return this.participants.filter(p => p.isActive).length;
});

// Method: إضافة مشارك
conversationSchema.methods.addParticipant = async function (userId, role = 'member') {
  if (!this.participants.some(p => p.user.toString() === userId.toString())) {
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
      isActive: true,
    });
    this.stats.totalParticipants = this.activeParticipantsCount;
    await this.save();
  }
  return this;
};

// Method: إزالة مشارك
conversationSchema.methods.removeParticipant = async function (userId) {
  const index = this.participants.findIndex(p => p.user.toString() === userId.toString());
  if (index > -1) {
    this.participants[index].isActive = false;
    this.stats.totalParticipants = this.activeParticipantsCount;
    await this.save();
  }
  return this;
};

// Method: تحديث آخر رسالة
conversationSchema.methods.updateLastMessage = async function (message) {
  this.lastMessage = {
    content: message.content.text,
    sender: message.sender,
    sentAt: message.createdAt,
    messageType: message.content.type,
  };
  this.lastActivityAt = new Date();
  this.stats.totalMessages += 1;
  await this.save();
  return this;
};

// Method: إضافة مستخدم يكتب
conversationSchema.methods.addTypingUser = async function (userId) {
  if (!this.typingUsers.some(t => t.user.toString() === userId.toString())) {
    this.typingUsers.push({ user: userId, startedAt: new Date() });
    await this.save();
  }
  return this;
};

// Method: إزالة مستخدم يكتب
conversationSchema.methods.removeTypingUser = async function (userId) {
  this.typingUsers = this.typingUsers.filter(t => t.user.toString() !== userId.toString());
  await this.save();
  return this;
};

// Method: تثبيت رسالة
conversationSchema.methods.pinMessage = async function (messageId) {
  if (!this.pinnedMessages.includes(messageId)) {
    this.pinnedMessages.push(messageId);
    await this.save();
  }
  return this;
};

// Method: إلغاء تثبيت رسالة
conversationSchema.methods.unpinMessage = async function (messageId) {
  this.pinnedMessages = this.pinnedMessages.filter(id => id.toString() !== messageId.toString());
  await this.save();
  return this;
};

// Method: تحديد وقت آخر قراءة لمستخدم
conversationSchema.methods.updateLastReadAt = async function (userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastReadAt = new Date();
    await this.save();
  }
  return this;
};

// Static: البحث عن محادثة ثنائية بين مستخدمين
conversationSchema.statics.findPrivateConversation = async function (userId1, userId2) {
  return this.findOne({
    type: 'private',
    'participants.user': { $all: [userId1, userId2] },
    'participants.isActive': true,
  }).populate('participants.user', 'fullName email avatar role');
};

// Static: الحصول على محادثات المستخدم
conversationSchema.statics.getUserConversations = async function (userId, options = {}) {
  const { page = 1, limit = 20, archived = false } = options;

  const query = {
    'participants.user': userId,
    'participants.isActive': true,
    isArchived: archived,
    isDeleted: false,
  };

  return this.find(query)
    .populate('participants.user', 'fullName email avatar role')
    .populate('lastMessage.sender', 'fullName avatar')
    .sort({ lastActivityAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static: إنشاء محادثة ثنائية
conversationSchema.statics.createPrivateConversation = async function (userId1, userId2) {
  // التحقق من وجود محادثة سابقة
  let conversation = await this.findPrivateConversation(userId1, userId2);

  if (!conversation) {
    conversation = await this.create({
      type: 'private',
      participants: [
        { user: userId1, role: 'member', isActive: true },
        { user: userId2, role: 'member', isActive: true },
      ],
      stats: {
        totalParticipants: 2,
      },
    });
  }

  return conversation.populate('participants.user', 'fullName email avatar role');
};

// Static: إنشاء محادثة جماعية
conversationSchema.statics.createGroupConversation = async function (creatorId, name, description, participantIds = []) {
  const participants = [
    { user: creatorId, role: 'admin', isActive: true },
    ...participantIds.map(id => ({ user: id, role: 'member', isActive: true })),
  ];

  const conversation = await this.create({
    type: 'group',
    participants,
    groupInfo: {
      name,
      description,
      createdBy: creatorId,
    },
    stats: {
      totalParticipants: participants.length,
    },
  });

  return conversation.populate('participants.user', 'fullName email avatar role');
};

// Hook: قبل الحفظ
conversationSchema.pre('save', function (next) {
  // تحديث عدد المشاركين النشطين
  this.stats.totalParticipants = this.participants.filter(p => p.isActive).length;
  next();
});

// Hook: تنظيف المستخدمين الذين يكتبون (إزالة القديم)
conversationSchema.pre('save', function (next) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  this.typingUsers = this.typingUsers.filter(t => t.startedAt > fiveMinutesAgo);
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
