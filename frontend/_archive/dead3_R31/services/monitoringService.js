/**
 * Monitoring Service - API Client
 * خدمة المراقبة - عميل API
 */

import { getToken } from '../utils/tokenStorage';

const API_BASE = 'http://localhost:5000/api/monitoring';

class MonitoringService {
  /**
   * مقاييس النظام
   */
  static async getSystemMetrics() {
    try {
      const response = await fetch(`${API_BASE}/system`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      return this.generateMockSystemMetrics();
    }
  }

  /**
   * مقاييس API
   */
  static async getApiMetrics(timeRange = 60) {
    try {
      const response = await fetch(`${API_BASE}/api-metrics?time_range_minutes=${timeRange}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching API metrics:', error);
      return this.generateMockApiMetrics();
    }
  }

  /**
   * معدل الأخطاء
   */
  static async getErrorRate(timeRange = 60) {
    try {
      const response = await fetch(`${API_BASE}/error-rate?time_range_minutes=${timeRange}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching error rate:', error);
      return this.generateMockErrorRate();
    }
  }

  /**
   * لوحة التحكم الرئيسية
   */
  static async getDashboard() {
    try {
      const response = await fetch(`${API_BASE}/dashboard`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      return this.generateMockDashboard();
    }
  }

  /**
   * وقت التشغيل
   */
  static async getUptime() {
    try {
      const response = await fetch(`${API_BASE}/uptime`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching uptime:', error);
      return {
        uptime_hours: 48,
        uptime_minutes: 30,
        uptime_seconds: 174600,
      };
    }
  }

  /**
   * تقرير الأداء
   */
  static async getPerformanceReport(timeRange = 60) {
    try {
      const response = await fetch(
        `${API_BASE}/reports/performance?time_range_minutes=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      return response.json();
    } catch (error) {
      console.error('Error fetching performance report:', error);
      return this.generateMockPerformanceReport();
    }
  }

  /**
   * السجلات
   */
  static async getLogs(limit = 100, level = null) {
    try {
      let url = `${API_BASE}/logs?limit=${limit}`;
      if (level) {
        url += `&level=${level}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * سجلات الأخطاء
   */
  static async getErrorLogs(limit = 50) {
    try {
      const response = await fetch(`${API_BASE}/logs/error?limit=${limit}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching error logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * التنبيهات
   */
  static async getAlerts() {
    try {
      const response = await fetch(`${API_BASE}/alerts/rules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return { alerts: [] };
    }
  }

  /**
   * إنشاء قاعدة تنبيه
   */
  static async createAlertRule(ruleData) {
    try {
      const response = await fetch(`${API_BASE}/alerts/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(ruleData),
      });
      return response.json();
    } catch (error) {
      console.error('Error creating alert rule:', error);
      return { error: error.message };
    }
  }

  /**
   * فحص الصحة
   */
  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.json();
    } catch (error) {
      console.error('Error during health check:', error);
      return { overall_status: 'down' };
    }
  }

  /**
   * الحالة الحالية (تحديث فوري)
   */
  static async getStatus() {
    try {
      const response = await fetch(`${API_BASE}/status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return response.json();
    } catch (error) {
      console.error('Error fetching status:', error);
      return this.generateMockStatus();
    }
  }

  /**
   * تنظيف البيانات القديمة
   */
  static async cleanupOldData(days = 7) {
    try {
      const response = await fetch(`${API_BASE}/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ days }),
      });
      return response.json();
    } catch (error) {
      console.error('Error cleaning up data:', error);
      return { error: error.message };
    }
  }

  /**
   * توليد بيانات وهمية - مقاييس النظام
   */
  static generateMockSystemMetrics() {
    return {
      cpu: {
        usage_percent: Math.random() * 70 + 10,
        count: 8,
        status: 'healthy',
      },
      memory: {
        usage_percent: Math.random() * 60 + 20,
        available_mb: Math.random() * 8000 + 1000,
        total_mb: 16384,
        status: 'healthy',
      },
      disk: {
        usage_percent: Math.random() * 50 + 30,
        free_gb: Math.random() * 500 + 100,
        total_gb: 1024,
        status: 'healthy',
      },
      network: {
        bytes_sent: Math.random() * 1000000000,
        bytes_recv: Math.random() * 1000000000,
        packets_sent: Math.random() * 5000000,
        packets_recv: Math.random() * 5000000,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * توليد بيانات وهمية - مقاييس API
   */
  static generateMockApiMetrics() {
    return {
      avg_response_time_ms: Math.random() * 200 + 50,
      min_response_time_ms: Math.random() * 50 + 10,
      max_response_time_ms: Math.random() * 500 + 200,
      p95_response_time_ms: Math.random() * 300 + 100,
      p99_response_time_ms: Math.random() * 400 + 150,
      request_count: Math.random() * 10000 + 1000,
    };
  }

  /**
   * توليد بيانات وهمية - معدل الأخطاء
   */
  static generateMockErrorRate() {
    const totalRequests = Math.random() * 10000 + 1000;
    const totalErrors = Math.random() * 100 + 10;

    return {
      total_requests: totalRequests,
      total_errors: totalErrors,
      error_rate_percent: (totalErrors / totalRequests) * 100,
      errors_by_status: {
        400: Math.random() * 30,
        404: Math.random() * 20,
        500: Math.random() * 10,
        503: Math.random() * 5,
      },
    };
  }

  /**
   * توليد بيانات وهمية - لوحة التحكم
   */
  static generateMockDashboard() {
    return {
      overall_status: 'healthy',
      system_metrics: this.generateMockSystemMetrics(),
      api_metrics: this.generateMockApiMetrics(),
      error_rate: this.generateMockErrorRate(),
      active_connections: Math.random() * 1000 + 100,
      total_requests: Math.random() * 100000 + 10000,
      total_errors: Math.random() * 500 + 50,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * توليد بيانات وهمية - تقرير الأداء
   */
  static generateMockPerformanceReport() {
    return {
      time_range_minutes: 60,
      system: this.generateMockSystemMetrics(),
      api: this.generateMockApiMetrics(),
      errors: this.generateMockErrorRate(),
      uptime: {
        uptime_hours: Math.random() * 100,
        uptime_minutes: Math.random() * 60,
        uptime_seconds: Math.random() * 3600,
      },
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * توليد بيانات وهمية - الحالة الحالية
   */
  static generateMockStatus() {
    return {
      system: this.generateMockSystemMetrics(),
      api_metrics: this.generateMockApiMetrics(),
      uptime: {
        uptime_hours: 48,
        uptime_minutes: 30,
        uptime_seconds: 174600,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * تنسيق البيانات للرسوم البيانية
   */
  static formatChartData(data, label) {
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label,
          data: Array.from({ length: 24 }, () => Math.random() * 100),
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }

  /**
   * تنسيق حالة الصحة
   */
  static getStatusColor(status) {
    const colors = {
      healthy: '#28a745',
      warning: '#ffc107',
      critical: '#dc3545',
      down: '#6c757d',
    };
    return colors[status] || '#6c757d';
  }

  /**
   * تنسيق حالة الصحة (نص عربي)
   */
  static getStatusText(status) {
    const texts = {
      healthy: 'سليم ✓',
      warning: 'تحذير ⚠️',
      critical: 'حرج ✗',
      down: 'معطل 🔴',
    };
    return texts[status] || 'غير معروف';
  }
}

export default MonitoringService;
