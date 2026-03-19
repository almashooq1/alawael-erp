/**
 * HR API Service - خدمة التواصل مع الـ Backend
 * تحتوي على جميع دوال الاتصال بـ APIs
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/hr';

class HRAPIService {
  // ============= الموظفون =============

  // جلب جميع الموظفين
  static async getEmployees(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE_URL}/employees?${params}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // جلب موظف واحد
  static async getEmployee(employeeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // إنشاء موظف جديد
  static async createEmployee(employeeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(employeeData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // تحديث بيانات الموظف
  static async updateEmployee(employeeId, employeeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(employeeData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // حذف موظف
  static async deleteEmployee(employeeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // ============= الرواتب =============

  // حساب الراتب
  static async calculatePayroll(employeeId, month, year) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/compensation/payroll/${employeeId}?month=${month}&year=${year}`,
        {
          headers: this.getHeaders(),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // معالجة الرواتب الشهرية
  static async processMonthlyPayroll(month, year) {
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${month}/process`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ year }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // تحويل الرواتب البنكية
  static async transferPayroll(month, year) {
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${month}/transfer`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ year }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // ============= الإجازات =============

  // طلب إجازة
  static async requestLeave(leaveData) {
    try {
      const response = await fetch(`${API_BASE_URL}/leave/request`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(leaveData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // جلب طلبات الإجازات المعلقة
  static async getPendingLeaveRequests(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE_URL}/leave/pending?${params}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // الموافقة على الإجازة
  static async approveLeave(leaveId, approvalData) {
    try {
      const response = await fetch(`${API_BASE_URL}/leave/${leaveId}/approve`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(approvalData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // رفض الإجازة
  static async rejectLeave(leaveId, rejectionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/leave/${leaveId}/reject`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(rejectionData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // ============= الحضور =============

  // تسجيل الحضور
  static async recordAttendance(attendanceData) {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(attendanceData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // جلب تقرير الحضور الشهري
  static async getMonthlyAttendanceReport(employeeId, month, year) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/monthly-report?employeeId=${employeeId}&month=${month}&year=${year}`,
        {
          headers: this.getHeaders(),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // ============= التحليلات =============

  // حساب مخاطر الاحتفاظ
  static async calculateRetentionRisk(employeeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/retention-risk/${employeeId}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // توقع الأداء
  static async predictPerformance(employeeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/predict-performance/${employeeId}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // ============= التقارير =============

  // تقرير نظرة عامة HR
  static async getHROverviewReport(startDate, endDate) {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${API_BASE_URL}/reports/overview?${params}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // تقرير الرواتب
  static async getPayrollReport(month, year) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/payroll?month=${month}&year=${year}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // تقرير الأداء
  static async getPerformanceReport(startDate, endDate) {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${API_BASE_URL}/reports/performance?${params}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  // ============= Methods المساعدة =============

  static getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getToken()}`,
    };
  }

  static getToken() {
    return localStorage.getItem('authToken') || '';
  }

  static async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `خطأ: ${response.status}`);
    }
    return await response.json();
  }

  // تعيين Token
  static setToken(token) {
    localStorage.setItem('authToken', token);
  }

  // مسح Token
  static clearToken() {
    localStorage.removeItem('authToken');
  }

  // التحقق من التسجيل
  static isAuthenticated() {
    return !!this.getToken();
  }
}

export default HRAPIService;
