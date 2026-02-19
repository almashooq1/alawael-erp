/**
 * PortalMessage Model
 * نموذج الرسائل في بوابة المستفيد/ولي الأمر
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PortalMessageSchema = new Schema(
  {
    // Sender & Recipient المرسل والمستقبل
    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'المرسل مطلوب'],
      refPath: 'fromModel',
      index: true,
    },
    fromModel: {
      type: String,
      required: true,
      enum: ['Beneficiary', 'Guardian', 'User'], // Staff/Admin
    },
    toId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'المستقبل مطلوب'],
      refPath: 'toModel',
      index: true,
    },
    toModel: {
      type: String,
      required: true,
      enum: ['Beneficiary', 'Guardian', 'User'],
    },

    // Message Content محتوى الرسالة
    subject: {
      type: String,
      required: [true, 'الموضوع مطلوب'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'نص الرسالة مطلوب'],
      minlength: 1,
      maxlength: 5000,
    },
    messageType: {
      type: String,
      enum: ['general', 'alert', 'important', 'academic', 'financial', 'event'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Attachments المرفقات
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Read Status حالة القراءة
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,

    // Related Items العناصر المرتبطة
    relatedBeneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
    },
    relatedType: {
      type: String,
      enum: ['progress_report', 'payment', 'attendance', 'grade', 'event', 'general'],
      default: 'general',
    },
    relatedId: mongoose.Schema.Types.ObjectId,

    // Reply Feature الرد على الرسائل
    isReply: {
      type: Boolean,
      default: false,
    },
    repliedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalMessage',
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PortalMessage',
      },
    ],

    // Archiving الأرشفة
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: Date,

    // Flagging for follow-up وضع علامة للمتابعة
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flaggedAt: Date,
    flagReason: String,

    // Scheduling إرسال مجدول
    scheduledFor: Date,
    isScheduled: {
      type: Boolean,
      default: false,
    },

    // Audit Trail
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'portal_messages',
  }
);

// Indexes
PortalMessageSchema.index({ fromId: 1, createdAt: -1 });
PortalMessageSchema.index({ toId: 1, isRead: 1 });
PortalMessageSchema.index({ relatedBeneficiaryId: 1 });
PortalMessageSchema.index({ createdAt: -1 });

// Virtual: Sender Info
PortalMessageSchema.virtual('senderInfo', {
  ref: function () {
    return this.fromModel;
  },
  localField: 'fromId',
  foreignField: '_id',
  justOne: true,
});

// Static Methods
PortalMessageSchema.statics.getInboxForUser = function (userId, userModel) {
  return this.find({
    toId: userId,
    toModel: userModel,
    isArchived: false,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .populate('senderInfo');
};

PortalMessageSchema.statics.getSentByUser = function (userId, userModel) {
  return this.find({
    fromId: userId,
    fromModel: userModel,
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

PortalMessageSchema.statics.getUnreadByUser = function (userId, userModel) {
  return this.find({
    toId: userId,
    toModel: userModel,
    isRead: false,
    deletedAt: null,
  });
};

PortalMessageSchema.statics.getUnreadCount = function (userId, userModel) {
  return this.countDocuments({
    toId: userId,
    toModel: userModel,
    isRead: false,
    deletedAt: null,
  });
};

PortalMessageSchema.statics.getConversation = function (userId, otherUserId) {
  return this.find({
    $or: [
      { fromId: userId, toId: otherUserId },
      { fromId: otherUserId, toId: userId },
    ],
    deletedAt: null,
  }).sort({ createdAt: 1 });
};

PortalMessageSchema.statics.searchMessages = function (userId, userModel, query) {
  return this.find({
    toId: userId,
    toModel: userModel,
    $or: [{ subject: new RegExp(query, 'i') }, { message: new RegExp(query, 'i') }],
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

// Instance Methods
PortalMessageSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

PortalMessageSchema.methods.markAsUnread = async function () {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

PortalMessageSchema.methods.archive = async function () {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

PortalMessageSchema.methods.unarchive = async function () {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

PortalMessageSchema.methods.flag = async function (reason = '') {
  this.isFlagged = true;
  this.flaggedAt = new Date();
  this.flagReason = reason;
  return this.save();
};

PortalMessageSchema.methods.unflag = async function () {
  this.isFlagged = false;
  this.flaggedAt = null;
  this.flagReason = null;
  return this.save();
};

PortalMessageSchema.methods.addReply = async function (replyId) {
  if (!this.replies) {
    this.replies = [];
  }
  this.replies.push(replyId);
  return this.save();
};

PortalMessageSchema.methods.delete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

PortalMessageSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

// Middleware
PortalMessageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PortalMessage', PortalMessageSchema);
