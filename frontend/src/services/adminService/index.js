import apiClient from '../api.client';
import logger from '../../utils/logger';
import {
  mockDashboard,
  mockUsers,
  mockSettings,
  mockReports,
  mockLogs,
  mockClinics,
  mockPayments,
  mockNotifications,
} from './mockData';

/**
 * Admin Portal Service
 * API-first with mock data fallback + proper logging
 */
export const adminService = {
  // Get Admin Dashboard Data
  async getAdminDashboard() {
    try {
      const data = await apiClient.get('/admin/overview');
      const result = data?.data || data || mockDashboard;
      // Normalize array fields — API may return non-array values
      if (result && typeof result === 'object') {
        result.services = Array.isArray(result.services) ? result.services : mockDashboard.services;
        result.recentActivity = Array.isArray(result.recentActivity)
          ? result.recentActivity
          : mockDashboard.recentActivity;
        result.alerts = Array.isArray(result.alerts) ? result.alerts : mockDashboard.alerts;
      }
      return result;
    } catch (err) {
      logger.warn('Admin dashboard API unavailable — using local data:', err?.message);
      return mockDashboard;
    }
  },

  // Get Admin Users
  async getAdminUsers() {
    try {
      const data = await apiClient.get('/admin/users');
      return Array.isArray(data) ? data : data?.data || mockUsers;
    } catch (err) {
      logger.warn('Admin users API unavailable — using local data:', err?.message);
      return mockUsers;
    }
  },

  // Get Admin Settings
  async getAdminSettings() {
    try {
      const data = await apiClient.get('/admin/settings');
      return data?.data || data || mockSettings;
    } catch (err) {
      logger.warn('Admin settings API unavailable — using local data:', err?.message);
      return mockSettings;
    }
  },

  // Save all settings (bulk update)
  async saveAdminSettings(settingsData) {
    try {
      const data = await apiClient.put('/admin/settings', settingsData);
      return data?.data || data;
    } catch (err) {
      logger.warn('Admin settings save error:', err?.message);
      throw err;
    }
  },

  // Update a specific settings section
  async updateSettingsSection(section, sectionData) {
    try {
      const data = await apiClient.put(`/admin/settings/${section}`, sectionData);
      return data?.data || data;
    } catch (err) {
      logger.warn(`Admin settings section "${section}" update error:`, err?.message);
      throw err;
    }
  },

  // Reset all settings to defaults
  async resetAllSettings() {
    try {
      const data = await apiClient.post('/admin/settings/reset');
      return data?.data || data;
    } catch (err) {
      logger.warn('Admin settings reset error:', err?.message);
      throw err;
    }
  },

  // Reset a specific section to defaults
  async resetSettingsSection(section) {
    try {
      const data = await apiClient.post(`/admin/settings/reset/${section}`);
      return data?.data || data;
    } catch (err) {
      logger.warn(`Admin settings section "${section}" reset error:`, err?.message);
      throw err;
    }
  },

  // Export settings as JSON
  async exportSettings() {
    try {
      const data = await apiClient.post('/admin/settings/export');
      return data?.data || data;
    } catch (err) {
      logger.warn('Admin settings export error:', err?.message);
      throw err;
    }
  },

  // Import settings from JSON
  async importSettings(jsonData) {
    try {
      const data = await apiClient.post('/admin/settings/import', jsonData);
      return data?.data || data;
    } catch (err) {
      logger.warn('Admin settings import error:', err?.message);
      throw err;
    }
  },

  // Get settings change history
  async getSettingsHistory(limit = 50) {
    try {
      const data = await apiClient.get(`/admin/settings/history?limit=${limit}`);
      return data?.data || data || [];
    } catch (err) {
      logger.warn('Admin settings history error:', err?.message);
      return [];
    }
  },

  // Toggle maintenance mode
  async toggleMaintenance(enabled, message) {
    try {
      const data = await apiClient.post('/admin/settings/maintenance', { enabled, message });
      return data?.data || data;
    } catch (err) {
      logger.warn('Admin maintenance toggle error:', err?.message);
      throw err;
    }
  },

  // Test email configuration
  async testEmailConfig() {
    try {
      const data = await apiClient.post('/admin/settings/test-email');
      return data;
    } catch (err) {
      logger.warn('Admin test email error:', err?.message);
      throw err;
    }
  },

  // Trigger manual backup
  async triggerBackup() {
    try {
      const data = await apiClient.post('/admin/settings/backup');
      return data;
    } catch (err) {
      logger.warn('Admin trigger backup error:', err?.message);
      throw err;
    }
  },

  // Get Admin Reports
  async getAdminReports() {
    try {
      const data = await apiClient.get('/admin/reports');
      return data?.data || data || mockReports;
    } catch (err) {
      logger.warn('Admin reports API unavailable — using local data:', err?.message);
      return mockReports;
    }
  },

  // Get Audit Logs
  async getAdminAuditLogs() {
    try {
      const data = await apiClient.get('/admin/audit-logs');
      return Array.isArray(data) ? data : data?.data || mockLogs;
    } catch (err) {
      logger.warn('Admin audit logs API unavailable — using local data:', err?.message);
      return mockLogs;
    }
  },

  // Get Clinics
  async getAdminClinics() {
    try {
      const data = await apiClient.get('/admin/clinics');
      return Array.isArray(data) ? data : data?.data || mockClinics;
    } catch (err) {
      logger.warn('Admin clinics API unavailable — using local data:', err?.message);
      return mockClinics;
    }
  },

  // Get Payments
  async getAdminPayments() {
    try {
      const data = await apiClient.get('/payments/all');
      if (data?.success && data?.data?.length > 0) {
        return data.data.map(p => ({
          id: p._id,
          invoiceNumber: p.transactionId ? `TRX-${p.transactionId.substring(0, 8)}` : 'N/A',
          patientName: p.userId ? p.userId.name || p.userId.email : 'مستخدم غير معروف',
          service: p.description || p.paymentMethod,
          amount: p.amount,
          status:
            p.status === 'succeeded' || p.status === 'completed'
              ? 'مدفوعة'
              : p.status === 'pending' || p.status === 'processing'
                ? 'قيد الانتظار'
                : 'مرفوضة',
          date: p.createdAt,
          notes: p.metadata?.notes || '',
        }));
      }
      return Array.isArray(data) ? data : mockPayments;
    } catch (err) {
      logger.warn('Admin payments API unavailable — using local data:', err?.message);
      return mockPayments;
    }
  },

  // Get Notifications
  async getAdminNotifications() {
    try {
      const data = await apiClient.get('/admin/notifications');
      return Array.isArray(data) ? data : data?.data || mockNotifications;
    } catch (err) {
      logger.warn('Admin notifications API unavailable — using local data:', err?.message);
      return mockNotifications;
    }
  },

  // Create user
  async createUser(userData) {
    return apiClient.post('/admin/users', userData);
  },

  // Update user
  async updateUser(userId, userData) {
    return apiClient.put(`/admin/users/${userId}`, userData);
  },

  // Delete user
  async deleteUser(userId) {
    return apiClient.delete(`/admin/users/${userId}`);
  },

  // Delete payment
  async deletePayment(paymentId) {
    return apiClient.delete(`/admin/payments/${paymentId}`);
  },
};
