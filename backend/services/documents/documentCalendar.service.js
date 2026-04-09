/**
 * Document Calendar & Deadlines Service — خدمة التقويم والمواعيد النهائية
 * ──────────────────────────────────────────────────────────────
 * إدارة تقويم المستندات، المواعيد النهائية، التجديدات،
 * التذكيرات التلقائية، والجدولة
 *
 * @module documentCalendar.service
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/* ─── Calendar Event Model ───────────────────────────────────── */
const calendarEventSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    title: { type: String, required: true },
    titleAr: String,
    type: {
      type: String,
      enum: [
        'deadline',
        'renewal',
        'review',
        'expiry',
        'meeting',
        'milestone',
        'reminder',
        'custom',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    startDate: { type: Date, required: true, index: true },
    endDate: Date,
    allDay: { type: Boolean, default: true },
    recurrence: {
      enabled: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'],
      },
      interval: { type: Number, default: 1 },
      endDate: Date,
      count: Number,
      exceptions: [Date],
    },
    reminders: [
      {
        type: { type: String, enum: ['notification', 'email', 'sms'], default: 'notification' },
        advance: { type: Number, default: 1 },
        unit: { type: String, enum: ['minutes', 'hours', 'days', 'weeks'], default: 'days' },
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
    ],
    assignees: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['owner', 'reviewer', 'approver', 'participant'],
          default: 'participant',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined', 'completed'],
          default: 'pending',
        },
        response: String,
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled', 'snoozed'],
      default: 'scheduled',
    },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    color: { type: String, default: '#3b82f6' },
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_calendar_events' }
);

calendarEventSchema.index({ startDate: 1, status: 1 });
calendarEventSchema.index({ documentId: 1, type: 1 });
calendarEventSchema.index({ 'assignees.userId': 1 });

const CalendarEvent =
  mongoose.models.CalendarEvent || mongoose.model('CalendarEvent', calendarEventSchema);

/* ─── Calendar View/Preset Model ─────────────────────────────── */
const calendarViewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    type: {
      type: String,
      enum: ['day', 'week', 'month', 'quarter', 'year', 'agenda', 'timeline'],
      default: 'month',
    },
    filters: {
      types: [String],
      priorities: [String],
      statuses: [String],
      tags: [String],
      assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    color: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'document_calendar_views' }
);

const CalendarView =
  mongoose.models.CalendarView || mongoose.model('CalendarView', calendarViewSchema);

/* ─── Priority Colors ────────────────────────────────────────── */
const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#22c55e',
};

/* ─── Type Definitions (Arabic) ──────────────────────────────── */
const EVENT_TYPES = [
  { key: 'deadline', labelAr: 'موعد نهائي', icon: '⏰', color: '#ef4444' },
  { key: 'renewal', labelAr: 'تجديد', icon: '🔄', color: '#f59e0b' },
  { key: 'review', labelAr: 'مراجعة', icon: '📋', color: '#3b82f6' },
  { key: 'expiry', labelAr: 'انتهاء صلاحية', icon: '⚠️', color: '#ef4444' },
  { key: 'meeting', labelAr: 'اجتماع', icon: '🤝', color: '#8b5cf6' },
  { key: 'milestone', labelAr: 'إنجاز', icon: '🎯', color: '#22c55e' },
  { key: 'reminder', labelAr: 'تذكير', icon: '🔔', color: '#06b6d4' },
  { key: 'custom', labelAr: 'مخصص', icon: '📌', color: '#64748b' },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentCalendarService extends EventEmitter {
  constructor() {
    super();
    this._reminderInterval = null;
  }

  /* ── Create Event ─────────────────────────────────────────── */
  async createEvent(data) {
    const {
      documentId,
      title,
      titleAr,
      type,
      priority,
      startDate,
      endDate,
      allDay,
      recurrence,
      reminders,
      assignees,
      notes,
      color,
      tags,
      metadata,
      userId,
    } = data;

    const event = new CalendarEvent({
      documentId,
      title,
      titleAr: titleAr || title,
      type,
      priority: priority || 'medium',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      allDay: allDay !== false,
      recurrence,
      reminders: reminders || [{ type: 'notification', advance: 1, unit: 'days' }],
      assignees: (assignees || []).map(a => ({
        userId: a.userId,
        role: a.role || 'participant',
        status: 'pending',
      })),
      notes,
      color: color || PRIORITY_COLORS[priority] || '#3b82f6',
      tags: tags || [],
      metadata,
      createdBy: userId,
    });

    await event.save();
    this.emit('eventCreated', { eventId: event._id, documentId, type });

    return { success: true, event };
  }

  /* ── Update Event ─────────────────────────────────────────── */
  async updateEvent(eventId, updates, userId) {
    const event = await CalendarEvent.findByIdAndUpdate(
      eventId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!event) return { success: false, error: 'الحدث غير موجود' };
    this.emit('eventUpdated', { eventId, updates, userId });
    return { success: true, event };
  }

  /* ── Delete Event ─────────────────────────────────────────── */
  async deleteEvent(eventId, userId) {
    const event = await CalendarEvent.findByIdAndDelete(eventId);
    if (!event) return { success: false, error: 'الحدث غير موجود' };
    this.emit('eventDeleted', { eventId, documentId: event.documentId, userId });
    return { success: true };
  }

  /* ── Complete Event ───────────────────────────────────────── */
  async completeEvent(eventId, userId, notes) {
    const event = await CalendarEvent.findByIdAndUpdate(
      eventId,
      {
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        ...(notes && { notes }),
      },
      { new: true }
    ).lean();

    if (!event) return { success: false, error: 'الحدث غير موجود' };
    this.emit('eventCompleted', { eventId, userId });

    // Create next occurrence if recurring
    if (event.recurrence?.enabled) {
      await this._createNextOccurrence(event);
    }

    return { success: true, event };
  }

  /* ── Snooze Event ─────────────────────────────────────────── */
  async snoozeEvent(eventId, snoozeUntil, userId) {
    const event = await CalendarEvent.findByIdAndUpdate(
      eventId,
      {
        status: 'snoozed',
        startDate: new Date(snoozeUntil),
        'reminders.$[].sent': false,
      },
      { new: true }
    ).lean();

    if (!event) return { success: false, error: 'الحدث غير موجود' };
    return { success: true, event };
  }

  /* ── Get Events (Calendar View) ───────────────────────────── */
  async getEvents(options = {}) {
    const {
      startDate,
      endDate,
      documentId,
      types,
      priorities,
      statuses,
      assigneeId,
      tags,
      page = 1,
      limit = 100,
    } = options;

    const filter = {};
    if (documentId) filter.documentId = documentId;
    if (types?.length) filter.type = { $in: types };
    if (priorities?.length) filter.priority = { $in: priorities };
    if (statuses?.length) filter.status = { $in: statuses };
    if (assigneeId) filter['assignees.userId'] = assigneeId;
    if (tags?.length) filter.tags = { $in: tags };
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      CalendarEvent.find(filter)
        .sort({ startDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('documentId', 'title name')
        .populate('assignees.userId', 'name email')
        .populate('createdBy', 'name')
        .lean(),
      CalendarEvent.countDocuments(filter),
    ]);

    return { success: true, events, total, page, limit };
  }

  /* ── Get Upcoming Deadlines ───────────────────────────────── */
  async getUpcomingDeadlines(options = {}) {
    const { days = 7, userId, types = ['deadline', 'expiry', 'renewal'] } = options;
    const endDate = new Date(Date.now() + days * 86400000);

    const events = await CalendarEvent.find({
      type: { $in: types },
      status: { $in: ['scheduled', 'in_progress'] },
      startDate: { $gte: new Date(), $lte: endDate },
      ...(userId && { 'assignees.userId': userId }),
    })
      .sort({ startDate: 1 })
      .populate('documentId', 'title name')
      .lean();

    return { success: true, deadlines: events, daysAhead: days };
  }

  /* ── Get Overdue Events ───────────────────────────────────── */
  async getOverdue(userId) {
    // Update status of past events
    await CalendarEvent.updateMany(
      { startDate: { $lt: new Date() }, status: 'scheduled' },
      { $set: { status: 'overdue' } }
    );

    const events = await CalendarEvent.find({
      status: 'overdue',
      ...(userId && { 'assignees.userId': userId }),
    })
      .sort({ startDate: 1 })
      .populate('documentId', 'title name')
      .lean();

    return { success: true, overdue: events, count: events.length };
  }

  /* ── Respond to Event ─────────────────────────────────────── */
  async respondToEvent(eventId, userId, response) {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: eventId, 'assignees.userId': userId },
      { $set: { 'assignees.$.status': response.status, 'assignees.$.response': response.note } },
      { new: true }
    ).lean();

    if (!event) return { success: false, error: 'الحدث غير موجود أو لست مشاركاً' };
    return { success: true, event };
  }

  /* ── Calendar Views (CRUD) ────────────────────────────────── */
  async createView(userId, data) {
    const view = new CalendarView({ userId, ...data });
    await view.save();
    return { success: true, view };
  }

  async getViews(userId) {
    const views = await CalendarView.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
    return { success: true, views };
  }

  async deleteView(viewId, userId) {
    await CalendarView.findOneAndDelete({ _id: viewId, userId });
    return { success: true };
  }

  /* ── Process Reminders ────────────────────────────────────── */
  async processReminders() {
    const now = new Date();
    const events = await CalendarEvent.find({
      status: { $in: ['scheduled', 'in_progress'] },
      'reminders.sent': false,
    }).lean();

    const sent = [];
    for (const event of events) {
      for (let i = 0; i < (event.reminders || []).length; i++) {
        const reminder = event.reminders[i];
        if (reminder.sent) continue;

        const advanceMs = this._toMs(reminder.advance, reminder.unit);
        const sendAt = new Date(event.startDate.getTime() - advanceMs);

        if (now >= sendAt) {
          await CalendarEvent.updateOne(
            { _id: event._id },
            { $set: { [`reminders.${i}.sent`]: true, [`reminders.${i}.sentAt`]: now } }
          );
          this.emit('reminderSent', {
            eventId: event._id,
            documentId: event.documentId,
            type: reminder.type,
            event,
          });
          sent.push({ eventId: event._id, reminderType: reminder.type });
        }
      }
    }

    return { success: true, sent, count: sent.length };
  }

  /* ── Create Next Occurrence ───────────────────────────────── */
  async _createNextOccurrence(event) {
    const { recurrence } = event;
    if (!recurrence?.enabled || !recurrence.pattern) return;

    const nextDate = this._calculateNextDate(
      event.startDate,
      recurrence.pattern,
      recurrence.interval
    );
    if (recurrence.endDate && nextDate > recurrence.endDate) return;

    const newEvent = { ...event };
    delete newEvent._id;
    delete newEvent.createdAt;
    delete newEvent.updatedAt;
    newEvent.startDate = nextDate;
    newEvent.status = 'scheduled';
    newEvent.completedAt = undefined;
    newEvent.completedBy = undefined;
    if (newEvent.reminders) {
      newEvent.reminders = newEvent.reminders.map(r => ({ ...r, sent: false, sentAt: undefined }));
    }

    await CalendarEvent.create(newEvent);
  }

  _calculateNextDate(date, pattern, interval = 1) {
    const d = new Date(date);
    switch (pattern) {
      case 'daily':
        d.setDate(d.getDate() + interval);
        break;
      case 'weekly':
        d.setDate(d.getDate() + 7 * interval);
        break;
      case 'biweekly':
        d.setDate(d.getDate() + 14 * interval);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + interval);
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + 3 * interval);
        break;
      case 'semiannual':
        d.setMonth(d.getMonth() + 6 * interval);
        break;
      case 'annual':
        d.setFullYear(d.getFullYear() + interval);
        break;
    }
    return d;
  }

  _toMs(value, unit) {
    const multipliers = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 };
    return value * (multipliers[unit] || 86400000);
  }

  /* ── Document Timeline ────────────────────────────────────── */
  async getDocumentTimeline(documentId) {
    const events = await CalendarEvent.find({ documentId })
      .sort({ startDate: 1 })
      .populate('assignees.userId', 'name')
      .lean();

    const now = new Date();
    const timeline = events.map(e => ({
      ...e,
      isPast: e.startDate < now,
      isCurrent: e.status === 'in_progress',
      isFuture: e.startDate > now,
      daysUntil: Math.ceil((e.startDate - now) / 86400000),
    }));

    return { success: true, timeline };
  }

  /* ── Statistics ───────────────────────────────────────────── */
  async getStats(options = {}) {
    const { userId, startDate, endDate } = options;
    const match = {};
    if (userId) match['assignees.userId'] = new mongoose.Types.ObjectId(userId);
    if (startDate || endDate) {
      match.startDate = {};
      if (startDate) match.startDate.$gte = new Date(startDate);
      if (endDate) match.startDate.$lte = new Date(endDate);
    }

    const [byStatus, byType, byPriority, total] = await Promise.all([
      CalendarEvent.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      CalendarEvent.aggregate([
        { $match: match },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      CalendarEvent.aggregate([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      CalendarEvent.countDocuments(match),
    ]);

    return {
      success: true,
      stats: {
        total,
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        byType: byType.reduce((a, t) => ({ ...a, [t._id]: t.count }), {}),
        byPriority: byPriority.reduce((a, p) => ({ ...a, [p._id]: p.count }), {}),
      },
    };
  }

  /* ── Get types ────────────────────────────────────────────── */
  getTypes() {
    return EVENT_TYPES;
  }

  /* ── Start reminder processor ─────────────────────────────── */
  startReminderProcessor(intervalMs = 60000) {
    if (this._reminderInterval) return;
    this._reminderInterval = setInterval(() => {
      this.processReminders().catch(err => console.error('Reminder processing error:', err));
    }, intervalMs);
  }

  stopReminderProcessor() {
    if (this._reminderInterval) {
      clearInterval(this._reminderInterval);
      this._reminderInterval = null;
    }
  }
}

module.exports = new DocumentCalendarService();
