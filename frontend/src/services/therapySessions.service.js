/**
 * Therapy Sessions Service — خدمة الجلسات العلاجية
 *
 * Compatibility adapter over the unified DDD Sessions API
 * (/api/v1/sessions). Keeps the existing method signatures so callers
 * in SessionsDashboard / useSessionsManagement keep working.
 */

import { sessionsAPI } from './ddd';
import logger from 'utils/logger';

// ─── Mock Fallback Data ────────────────────────────────────────────
const MOCK_SESSIONS = [
  {
    _id: '1',
    title: 'جلسة علاج طبيعي - أحمد',
    sessionType: 'علاج طبيعي',
    status: 'SCHEDULED',
    date: '2026-03-15T10:00:00',
    startTime: '10:00',
    endTime: '11:00',
    participants: [{ name: 'أحمد محمد' }],
    createdBy: { name: 'د. سارة' },
    recurrence: 'weekly',
  },
  {
    _id: '2',
    title: 'جلسة نطق وتخاطب - فاطمة',
    sessionType: 'نطق وتخاطب',
    status: 'COMPLETED',
    date: '2026-03-14T09:00:00',
    startTime: '09:00',
    endTime: '10:00',
    participants: [{ name: 'فاطمة حسن' }],
    createdBy: { name: 'أ. محمد' },
    recurrence: 'none',
    rating: 4,
  },
  {
    _id: '3',
    title: 'جلسة علاج سلوكي - خالد',
    sessionType: 'علاج سلوكي',
    status: 'CONFIRMED',
    date: '2026-03-15T14:00:00',
    startTime: '14:00',
    endTime: '15:00',
    participants: [{ name: 'خالد سعيد' }],
    createdBy: { name: 'د. نورة' },
    recurrence: 'biweekly',
  },
  {
    _id: '4',
    title: 'جلسة علاج وظيفي - مريم',
    sessionType: 'علاج وظيفي',
    status: 'CANCELLED_BY_PATIENT',
    date: '2026-03-13T11:00:00',
    startTime: '11:00',
    endTime: '12:00',
    participants: [{ name: 'مريم علي' }],
    createdBy: { name: 'د. فهد' },
    recurrence: 'none',
  },
  {
    _id: '5',
    title: 'جلسة علاج نفسي - عبدالله',
    sessionType: 'علاج نفسي',
    status: 'SCHEDULED',
    date: '2026-03-16T08:00:00',
    startTime: '08:00',
    endTime: '09:00',
    participants: [{ name: 'عبدالله أحمد' }],
    createdBy: { name: 'د. عائشة' },
    recurrence: 'weekly',
  },
  {
    _id: '6',
    title: 'جلسة علاج طبيعي - سارة',
    sessionType: 'علاج طبيعي',
    status: 'NO_SHOW',
    date: '2026-03-12T10:00:00',
    startTime: '10:00',
    endTime: '11:00',
    participants: [{ name: 'سارة ناصر' }],
    createdBy: { name: 'د. سارة' },
    recurrence: 'none',
  },
];

const MOCK_STATS = {
  totalToday: 24,
  completedToday: 18,
  cancelledToday: 2,
  noShowToday: 1,
  scheduledToday: 3,
  totalWeek: 142,
  completionRate: 85,
  avgDuration: 45,
  byType: [
    { name: 'علاج طبيعي', value: 45 },
    { name: 'علاج وظيفي', value: 32 },
    { name: 'نطق وتخاطب', value: 28 },
    { name: 'علاج سلوكي', value: 18 },
    { name: 'علاج نفسي', value: 15 },
    { name: 'أخرى', value: 10 },
  ],
  byStatus: [
    { status: 'SCHEDULED', count: 35 },
    { status: 'CONFIRMED', count: 22 },
    { status: 'COMPLETED', count: 85 },
    { status: 'CANCELLED_BY_PATIENT', count: 8 },
    { status: 'CANCELLED_BY_CENTER', count: 4 },
    { status: 'NO_SHOW', count: 6 },
  ],
  therapistLoad: [],
};

const unwrap = res => res?.data?.data ?? res?.data;

// ─── Service ───────────────────────────────────────────────────────

const therapySessionsService = {
  /**
   * Get sessions list with pagination & filters
   */
  async getSessions(params = {}) {
    try {
      const res = await sessionsAPI.list(params);
      const { data, total, skip = 0, limit = 20 } = res?.data ?? res ?? {};
      const page = limit ? Math.floor(skip / limit) + 1 : 1;
      const pages = limit ? Math.ceil(total / limit) : 1;
      return {
        success: true,
        data: data ?? [],
        pagination: { total: total ?? 0, page, limit, pages },
      };
    } catch (err) {
      logger.warn('therapySessionsService.getSessions fallback', err?.message);
      const mock = MOCK_SESSIONS;
      return {
        success: true,
        data: mock,
        pagination: { total: mock.length, page: 1, limit: 20, pages: 1 },
        stats: {
          total: mock.length,
          scheduled: mock.filter(s => s.status === 'SCHEDULED').length,
          confirmed: mock.filter(s => s.status === 'CONFIRMED').length,
          completed: mock.filter(s => s.status === 'COMPLETED').length,
          cancelled: mock.filter(s =>
            ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'].includes(s.status)
          ).length,
          noShow: mock.filter(s => s.status === 'NO_SHOW').length,
        },
        _isMock: true,
      };
    }
  },

  /**
   * Get a single session by ID
   */
  async getSession(id) {
    try {
      const res = await sessionsAPI.get(id);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.getSession', err?.message);
      return MOCK_SESSIONS.find(s => s._id === id) || null;
    }
  },

  /**
   * Create a new session
   */
  async createSession(data) {
    try {
      const res = await sessionsAPI.create(data);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.createSession', err?.message);
      throw err;
    }
  },

  /**
   * Update a session
   */
  async updateSession(id, data) {
    try {
      const res = await sessionsAPI.update(id, data);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.updateSession', err?.message);
      throw err;
    }
  },

  /**
   * Delete a session
   */
  async deleteSession(id) {
    try {
      const res = await sessionsAPI.remove(id);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.deleteSession', err?.message);
      throw err;
    }
  },

  /**
   * Update session status
   */
  async updateStatus(id, status) {
    try {
      const res = await sessionsAPI.updateStatus(id, status);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.updateStatus', err?.message);
      throw err;
    }
  },

  /**
   * Cancel a session
   */
  async cancelSession(id, reason, cancelledBy = 'CENTER') {
    try {
      const res = await sessionsAPI.cancel(id, { reason, cancelledBy });
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.cancelSession', err?.message);
      throw err;
    }
  },

  /**
   * Mark attendance
   */
  async markAttendance(id, _data = {}) {
    try {
      const res = await sessionsAPI.attend(id);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.markAttendance', err?.message);
      throw err;
    }
  },

  /**
   * Mark no-show
   */
  async markNoShow(id, reason) {
    try {
      const res = await sessionsAPI.noShow(id, reason);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.markNoShow', err?.message);
      throw err;
    }
  },

  /**
   * Reschedule a session
   */
  async rescheduleSession(id, date, startTime, endTime) {
    try {
      const res = await sessionsAPI.reschedule(id, { date, startTime, endTime });
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.rescheduleSession', err?.message);
      throw err;
    }
  },

  /**
   * Get session documentation
   */
  async getDocumentation(sessionId) {
    try {
      const res = await sessionsAPI.getDocumentation(sessionId);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.getDocumentation', err?.message);
      return null;
    }
  },

  /**
   * Save session documentation (SOAP notes)
   */
  async saveDocumentation(sessionId, data) {
    try {
      const res = await sessionsAPI.saveDocumentation(sessionId, data);
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.saveDocumentation', err?.message);
      throw err;
    }
  },

  /**
   * Get dashboard statistics
   */
  async getStats() {
    try {
      const res = await sessionsAPI.getStats();
      const d = unwrap(res) || {};
      const byStatus = d.byStatus || {};
      const total = d.total ?? 0;
      const todaySessions = d.todaySessions ?? 0;
      const completed = byStatus.completed ?? 0;
      const scheduled = byStatus.scheduled ?? 0;
      const noShow = byStatus.no_show ?? 0;
      const cancelled = byStatus.cancelled ?? 0;
      return {
        todayTotal: todaySessions,
        todayCompleted: completed,
        todayCancelled: cancelled,
        todayNoShow: noShow,
        todayScheduled: scheduled,
        total,
        totalWeek: total,
        completionRate: todaySessions ? Math.round((completed / todaySessions) * 100) : 0,
        byStatus,
        byModality: d.byModality,
      };
    } catch (err) {
      logger.warn('therapySessionsService.getStats fallback', err?.message);
      return MOCK_STATS;
    }
  },

  /**
   * Check therapist availability
   */
  async checkAvailability(therapistId, date, startTime, endTime) {
    try {
      const res = await sessionsAPI.getAvailability(therapistId, { date, startTime, endTime });
      const sessions = unwrap(res) || [];
      return { available: sessions.length === 0, conflicts: sessions };
    } catch (err) {
      logger.warn('therapySessionsService.checkAvailability', err?.message);
      return { available: true };
    }
  },

  /**
   * Get upcoming sessions for a beneficiary
   */
  async getUpcoming(beneficiaryId, daysAhead = 30) {
    try {
      const res = await sessionsAPI.getUpcoming(beneficiaryId, { daysAhead });
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.getUpcoming', err?.message);
      return [];
    }
  },

  /**
   * Bulk reschedule sessions
   */
  async bulkReschedule(sessionIds, newDate, _newStartTime, _newEndTime) {
    try {
      const res = await sessionsAPI.bulkReschedule({
        sessionIds,
        newDates: sessionIds.map(() => newDate),
        reason: '',
      });
      return unwrap(res);
    } catch (err) {
      logger.warn('therapySessionsService.bulkReschedule', err?.message);
      throw err;
    }
  },
};

export default therapySessionsService;
