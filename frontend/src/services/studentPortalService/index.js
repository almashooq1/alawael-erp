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

const studentPortalService = {
  /**
   * Get student dashboard data
   * الحصول على بيانات لوحة معلومات الطالب
   */
  async getStudentDashboard(studentId) {
    try {
      return await apiClient.get(`/students/${studentId}/dashboard`);
    } catch (error) {
      logger.error('Error fetching student dashboard:', error);
      return getMockDashboardData();
    }
  },

  /**
   * Get student schedule
   * الحصول على الجدول الدراسي
   */
  async getStudentSchedule(studentId) {
    try {
      return await apiClient.get(`/students/${studentId}/schedule`);
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
      return await apiClient.get(`/students/${studentId}/grades`);
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
      return await apiClient.get(`/students/${studentId}/attendance`);
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
      return await apiClient.get(`/students/${studentId}/assignments`);
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
      return await apiClient.get(`/students/${studentId}/announcements`);
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

      return await apiClient.get(`/reports/student-advanced?${params}`);
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
