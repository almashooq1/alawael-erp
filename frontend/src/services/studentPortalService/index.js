/**
 * Student Portal Service
 * خدمة بوابة الطالب
 *
 * Handles all API calls for student portal functionality
 */

import apiClient from '../api.client';
import logger from 'utils/logger';
import {
  getMockDashboardData,
  getMockScheduleData,
  getMockGradesData,
  getMockAnnouncementsData,
  getMockAttendanceData,
  getMockAssignmentsData,
  getMockStudentAdvancedReport,
} from './mockData';

// Map a /student/today + /student/me response into the academic-dashboard
// shape the legacy StudentPortal page expects. Real fields (name, level, xp,
// streak, nextSession) override the mock; academic placeholders (gpa,
// completedAssignments…) are kept until a StudentProgress collection lands.
function mergeRealIntoDashboard(today, me) {
  const base = getMockDashboardData();
  const realName = me?.nameAr || today?.student?.nameAr;
  const upcomingExams = base.stats.upcomingExams;
  return {
    ...base,
    student: {
      ...base.student,
      ...(me?.id ? { id: String(me.id), studentId: String(me.id) } : {}),
      ...(realName ? { name: realName } : {}),
      avatarEmoji: today?.student?.avatarEmoji || me?.avatarEmoji || base.student.avatar,
      level: today?.student?.level ?? me?.level ?? 1,
      xp: today?.student?.xp ?? me?.xp ?? 0,
      xpToNext: today?.student?.xpToNext ?? me?.xpToNext ?? 100,
      streakDays: today?.student?.streakDays ?? me?.streakDays ?? 0,
      variant: me?.variant || 'YOUTH',
    },
    nextSession: today?.nextSession || null,
    moodCheckedInToday: Boolean(today?.moodCheckedInToday),
    todayActivities: Array.isArray(today?.todayActivities) ? today.todayActivities : [],
    recentBadge: today?.recentBadge || null,
    stats: {
      ...base.stats,
      // Streak day count is the only stat we can honestly populate from the
      // beneficiary record; everything else stays on mock until a real
      // academic store exists.
      streakDays: today?.student?.streakDays ?? base.stats.attendance,
      upcomingExams,
    },
  };
}

const studentPortalService = {
  /**
   * Get student dashboard data
   * الحصول على بيانات لوحة معلومات الطالب
   *
   * Pulls the real /student/today + /student/me payloads and merges them
   * onto the legacy academic shape. Falls back to pure mock data if either
   * call fails (offline preview, beneficiary token missing, etc.).
   */
  async getStudentDashboard(_studentId) {
    try {
      const [today, me] = await Promise.all([
        apiClient.get('/api/v1/student/today').catch(() => null),
        apiClient.get('/api/v1/student/me').catch(() => null),
      ]);
      if (!today && !me) return getMockDashboardData();
      return mergeRealIntoDashboard(today, me);
    } catch (error) {
      logger.error('Error fetching student dashboard:', error);
      return getMockDashboardData();
    }
  },

  /**
   * Get authenticated student's profile (level, xp, variant…).
   * الحصول على ملف الطالب الحالي
   */
  async getMyProfile() {
    return apiClient.get('/api/v1/student/me');
  },

  /**
   * Get the "today" snapshot — next session + activities + mood status.
   */
  async getStudentToday() {
    return apiClient.get('/api/v1/student/today');
  },

  /**
   * Activities assigned for today (StudentActivity collection — Phase 17).
   */
  async getStudentActivities() {
    return apiClient.get('/api/v1/student/activities');
  },

  /**
   * Mark an activity complete and receive XP / level-up payload.
   */
  async completeStudentActivity(activityId) {
    return apiClient.post(
      `/api/v1/student/activities/${encodeURIComponent(activityId)}/complete`,
      {}
    );
  },

  /**
   * Submit a daily mood check-in (1-5). Auto-raises a CLINICAL red-flag if
   * the trailing pattern is worrisome.
   */
  async submitMood(mood, note) {
    return apiClient.post('/api/v1/student/mood', { mood, note: note || null });
  },

  /**
   * Achievements snapshot — level, xp, badges, lifetime stats.
   */
  async getAchievements() {
    return apiClient.get('/api/v1/student/achievements');
  },

  /**
   * Mood-log history (oldest → newest), trimmed to `limit` entries.
   * Returns `{ entries, summary }`. Falls back to an empty list if the
   * endpoint is unreachable so trend widgets render an empty state.
   */
  async getMoodHistory(limit = 30) {
    try {
      return await apiClient.get(`/api/v1/student/mood/history?limit=${encodeURIComponent(limit)}`);
    } catch (error) {
      logger.error('Error fetching mood history:', error);
      return { entries: [], summary: { count: 0, average: null, counts: {}, worrisome: false } };
    }
  },

  /**
   * Get student schedule
   * الحصول على الجدول الدراسي
   *
   * Adapts /student/schedule (rehab session list keyed by ISO date) into the
   * legacy week-grid shape `{schedule:[{day,classes}], subjects}` the page
   * renders. If the real endpoint returns no sessions for any day in the
   * window, fall back to mock so the UI doesn't render an empty grid.
   */
  async getStudentSchedule(_studentId) {
    try {
      const real = await apiClient.get('/api/v1/student/schedule');
      if (!Array.isArray(real) || real.length === 0) return getMockScheduleData();

      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const subjectByName = new Map();
      const schedule = real.map(({ date, items }) => {
        const d = new Date(date);
        const day = dayNames[d.getDay()] || date;
        const classes = (items || []).map(item => {
          const name = item.titleAr || 'جلسة';
          if (!subjectByName.has(name)) {
            subjectByName.set(name, { name, teacher: '', room: '', color: '#1976d2' });
          }
          return {
            time: item.time || '—',
            subject: { ...subjectByName.get(name), icon: item.icon || '✨' },
          };
        });
        return { day, classes };
      });

      const hasAny = schedule.some(s => s.classes.length > 0);
      if (!hasAny) return getMockScheduleData();

      return { schedule, subjects: Array.from(subjectByName.values()) };
    } catch (error) {
      logger.error('Error fetching student schedule:', error);
      return getMockScheduleData();
    }
  },

  /**
   * Get student grades
   * الحصول على درجات الطالب
   */
  async getStudentGrades(studentId) {
    try {
      return await apiClient.get(`/api/v1/students/${studentId}/grades`);
    } catch (error) {
      logger.error('Error fetching student grades:', error);
      return getMockGradesData();
    }
  },

  /**
   * Get student attendance
   * الحصول على سجل الحضور
   */
  async getStudentAttendance(studentId) {
    try {
      return await apiClient.get(`/api/v1/students/${studentId}/attendance`);
    } catch (error) {
      logger.error('Error fetching student attendance:', error);
      return getMockAttendanceData();
    }
  },

  /**
   * Get student assignments
   * الحصول على الواجبات
   */
  async getStudentAssignments(studentId) {
    try {
      return await apiClient.get(`/api/v1/students/${studentId}/assignments`);
    } catch (error) {
      logger.error('Error fetching student assignments:', error);
      return getMockAssignmentsData();
    }
  },

  /**
   * Get student announcements
   * الحصول على الإعلانات
   */
  async getAnnouncements(studentId) {
    try {
      return await apiClient.get(`/api/v1/students/${studentId}/announcements`);
    } catch (error) {
      logger.error('Error fetching announcements:', error);
      return getMockAnnouncementsData();
    }
  },

  /**
   * Get student advanced report
   * الحصول على التقرير المتقدم للطالب
   */
  async getStudentAdvancedReport(studentId, filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('student_id', studentId);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.reportType) params.append('report_type', filters.reportType);
      if (filters.focusArea) params.append('focus_area', filters.focusArea);

      return await apiClient.get(`/api/v1/reports/student-advanced?${params}`);
    } catch (error) {
      logger.error('Error fetching student advanced report:', error);
      return getMockStudentAdvancedReport(filters);
    }
  },

  // ─── Write Methods ───
  async submitAssignment(studentId, assignmentId, data) {
    const result = await apiClient.post(
      `/students/${studentId}/assignments/${assignmentId}/submit`,
      data
    );
    return result?.data ?? result;
  },
};

export default studentPortalService;
