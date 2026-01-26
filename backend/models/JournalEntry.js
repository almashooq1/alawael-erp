/**
 * ===================================================================
 * JOURNAL ENTRY MODEL - نموذج قيد اليومية
 * ===================================================================
 */

const mongoose = require('mongoose');

const journalEntryLineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
  },
  description: String,
  costCenter: String,
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
});

const journalEntrySchema = new mongoose.Schema(
  {
    // الرقم المرجعي
    reference: {
      type: String,
      required: true,
      unique: true,
    },

    // التاريخ
    date: {
      type: Date,
      required: true,
    },

    // الوصف
    description: {
      type: String,
      required: true,
    },

    // نوع القيد
    type: {
      type: String,
      enum: ['manual', 'automatic', 'adjustment', 'closing', 'opening'],
      default: 'manual',
    },

    // السطور
    lines: {
      type: [journalEntryLineSchema],
      required: true,
      validate: {
        validator: function (lines) {
          // التحقق من التوازن
          const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
          const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
          return Math.abs(totalDebit - totalCredit) < 0.01;
        },
        message: 'مجموع المدين يجب أن يساوي مجموع الدائن',
      },
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'posted', 'cancelled'],
      default: 'draft',
    },

    // معلومات الترحيل
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: Date,

    // قيد العكس
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    reversedAt: Date,
    originalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },

    // المستند المصدر
    sourceDocument: {
      type: {
        type: String,
        enum: ['invoice', 'payment', 'expense', 'other'],
      },
      id: mongoose.Schema.Types.ObjectId,
    },

    // المرفقات
    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: Date,
      },
    ],

    // الملاحظات
    notes: String,

    // معلومات التتبع
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة
// Note: reference already has unique:true (creates automatic index)
journalEntrySchema.index({ date: -1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ 'lines.accountId': 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
