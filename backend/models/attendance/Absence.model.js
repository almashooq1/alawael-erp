'use strict';
/**
 * Absence Model
 * نموذج الغياب والملاحظات
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const absenceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: { type: Date, required: true },
  absenceType: {
    type: String,
    enum: ['غياب', 'تأخير', 'انصراف مبكر', 'عدم ديناميكي'],
    required: true,
  },
  reason: String,
  approvedBy: mongoose.Schema.Types.ObjectId,
  isExcused: Boolean,
  minutes: Number,
  penalty: Number,
  status: {
    type: String,
    enum: ['مرسل', 'قيد المراجعة', 'موافق عليه', 'مرفوض'],
    default: 'مرسل',
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

absenceSchema.index({ employeeId: 1, date: -1 });

const Absence = mongoose.models.Absence || mongoose.model('Absence', absenceSchema);

module.exports = Absence;
