/**
 * Report Service
 * خدمة التقارير للواجهة الأمامية
 */

import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ReportService {
  /**
   * توليد تقرير المبيعات
   */
  async generateSalesReport(filters = {}) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error('Failed to generate sales report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw error;
    }
  }

  /**
   * توليد تقرير الإيرادات
   */
  async generateRevenueReport(filters = {}) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/revenue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error('Failed to generate revenue report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating revenue report:', error);
      throw error;
    }
  }

  /**
   * توليد تقرير المستخدمين
   */
  async generateUsersReport(filters = {}) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error('Failed to generate users report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating users report:', error);
      throw error;
    }
  }

  /**
   * توليد تقرير الحضور
   */
  async generateAttendanceReport(filters = {}) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error('Failed to generate attendance report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw error;
    }
  }

  /**
   * تصدير تقرير إلى CSV
   */
  async exportReportCSV(reportId) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/export/${reportId}/csv`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report to CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error exporting report to CSV:', error);
      throw error;
    }
  }

  /**
   * تصدير تقرير إلى JSON
   */
  async exportReportJSON(reportId) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/export/${reportId}/json`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report to JSON');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error exporting report to JSON:', error);
      throw error;
    }
  }

  /**
   * إنشاء قالب تقرير
   */
  async createTemplate(templateData) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * الحصول على قالب
   */
  async getTemplate(templateId) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/templates/${templateId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get template');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع القوالب
   */
  async getAllTemplates() {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/templates`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get templates');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * جدولة تقرير
   */
  async scheduleReport(scheduleData) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير محدد
   */
  async getReport(reportId) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع التقارير
   */
  async getAllReports() {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get reports');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  }

  /**
   * حذف تقرير
   */
  async deleteReport(reportId) {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات التقارير
   */
  async getStatistics() {
    try {
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/reports/statistics`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * توليد بيانات تجريبية لتاريخ محدد
   */
  generateMockDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= diffDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }
}

export default new ReportService();
