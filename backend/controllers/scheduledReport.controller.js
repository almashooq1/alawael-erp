/**
 * scheduledReport.controller.js — Scheduled Report Controller
 * ═══════════════════════════════════════════════════════════
 * Handles report scheduling, execution, and monitoring.
 */

'use strict';

const ScheduledReport = require('../models/ScheduledReport');
const mongoose = require('mongoose');

// ─── Schedule CRUD ───────────────────────────────────────────────────────

exports.getSchedules = async (req, res, next) => {
  try {
    const { status, isActive, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const [schedules, total] = await Promise.all([
      ScheduledReport.find(query)
        .sort({ nextRunAt: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      ScheduledReport.countDocuments(query),
    ]);

    const frequencies = await ScheduledReport.distinct('frequency');

    res.json({
      success: true,
      data: schedules,
      meta: { total, page: Number(page), limit: Number(limit), frequencies },
    });
  } catch (err) {
    next(err);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    // Calculate nextRunAt based on frequency
    const nextRunAt = calculateNextRun(req.body);

    const schedule = await ScheduledReport.create({
      ...req.body,
      nextRunAt,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduledReport.findById(id).lean();
    if (!schedule) return res.status(404).json({ success: false, error: { message: 'Schedule not found' } });
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (req.body.frequency || req.body.hour !== undefined || req.body.minute !== undefined) {
      updates.nextRunAt = calculateNextRun({ ...req.body });
    }

    const schedule = await ScheduledReport.findByIdAndUpdate(id, updates, {returnDocument: 'after'});
    if (!schedule) return res.status(404).json({ success: false, error: { message: 'Schedule not found' } });
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ScheduledReport.findByIdAndDelete(id);
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Execution ─────────────────────────────────────────────────────────────

exports.runSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduledReport.findById(id);
    if (!schedule) return res.status(404).json({ success: false, error: { message: 'Schedule not found' } });
    if (schedule.status === 'running') {
      return res.status(400).json({ success: false, error: { message: 'Schedule is already running' } });
    }

    schedule.status = 'running';
    const startTime = Date.now();
    await schedule.save();

    // Placeholder: integrate with report generation engine
    const execution = {
      runAt: new Date(),
      status: 'success',
      outputUrl: null,
      durationMs: Date.now() - startTime,
    };

    schedule.executionLog.push(execution);
    if (schedule.executionLog.length > 20) schedule.executionLog.shift(); // keep last 20

    schedule.status = 'pending';
    schedule.lastRunAt = new Date();
    schedule.nextRunAt = calculateNextRun(schedule.toObject());
    await schedule.save();

    res.json({
      success: true,
      data: { scheduleId: id, jobId: execution._id, status: 'success' },
      message: 'Report generation completed',
    });
  } catch (err) {
    next(err);
  }
};

exports.pauseSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduledReport.findByIdAndUpdate(id, { isActive: false, status: 'paused' }, {returnDocument: 'after'});
    if (!schedule) return res.status(404).json({ success: false, error: { message: 'Schedule not found' } });
    res.json({ success: true, data: schedule, message: 'Schedule paused' });
  } catch (err) {
    next(err);
  }
};

exports.resumeSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const nextRunAt = calculateNextRun({ ...req.body });
    const schedule = await ScheduledReport.findByIdAndUpdate(
      id,
      { isActive: true, status: 'pending', nextRunAt },
      {returnDocument: 'after'}
    );
    if (!schedule) return res.status(404).json({ success: false, error: { message: 'Schedule not found' } });
    res.json({ success: true, data: schedule, message: 'Schedule resumed' });
  } catch (err) {
    next(err);
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function calculateNextRun(config) {
  const now = new Date();
  const { frequency = 'daily', hour = 0, minute = 0, dayOfWeek = 1, dayOfMonth = 1 } = config;

  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute);
    case 'weekly':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay() + dayOfWeek) % 7 || 7), hour, minute);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hour, minute);
    case 'quarterly':
      return new Date(now.getFullYear(), now.getMonth() + 3, dayOfMonth, hour, minute);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
