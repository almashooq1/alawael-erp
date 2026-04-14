'use strict';
/**
 * Schedule Model
 * جدول الدوام الأسبوعي
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: Date,
  endDate: Date,
  scheduleType: {
    type: String,
    enum: ['عادي', 'دوام ليلي', 'دوام صباحي', 'نوبات', 'مرن'],
    default: 'عادي',
  },
  workDays: [
    {
      day: String,
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String,
      workHours: Number,
      isWorking: Boolean,
    },
  ],
  weeklyWorkHours: Number,
  monthlyWorkHours: Number,
  createdAt: Date,
  updatedAt: Date,
});

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
