/**
 * Advanced License Management Service
 * خدمة إدارة الرخص والتصاريح المتقدمة
 *
 * Features:
 * ✅ CRUD operations
 * ✅ Renewal management
 * ✅ Document handling
 * ✅ Expiry tracking
 * ✅ Compliance checking
 * ✅ Reporting & analytics
 * ✅ Batch operations
 * ✅ Data validation
 */

class LicenseService {
  constructor() {
    this.apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.licenseEndpoint = `${this.apiBase}/documents`;
  }

  // ==================== Utility Methods ====================

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file type icon based on MIME type
   */
  getFileIcon(fileType) {
    const icons = {
      'application/pdf': '📄',
      'image/jpeg': '🖼️',
      'image/png': '🖼️',
      'image/gif': '🖼️',
      'application/msword': '📝',
      'application/vnd.ms-excel': '📊',
      'application/zip': '📦',
      'text/plain': '📃',
    };
    return icons[fileType] || '📎';
  }

  /**
   * Calculate days until expiry
   */
  calculateDaysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get license status based on expiry date
   */
  getLicenseStatus(expiryDate) {
    const daysLeft = this.calculateDaysUntilExpiry(expiryDate);
    if (daysLeft < 0) return 'منتهية الصلاحية';
    if (daysLeft <= 30) return 'قريبة الانتهاء';
    if (daysLeft <= 60) return 'قريبة الانتهاء';
    return 'سارية';
  }

  /**
   * Get status color
   */
  getStatusColor(status) {
    const colors = {
      سارية: '#4caf50',
      'منتهية الصلاحية': '#f44336',
      'قريبة الانتهاء': '#ff9800',
      'قيد التجديد': '#2196f3',
      معلقة: '#9e9e9e',
    };
    return colors[status] || '#757575';
  }

  // ==================== CRUD Operations ====================

  /**
   * Get all licenses with filtering
   */
  async getAllLicenses(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.license_type) params.append('license_type', filters.license_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await fetch(`${this.licenseEndpoint}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch licenses');

      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      console.error('Error fetching licenses:', error);
      throw error;
    }
  }

  /**
   * Get license by ID
   */
  async getLicenseById(licenseId) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch license');

      return await response.json();
    } catch (error) {
      console.error('Error fetching license:', error);
      throw error;
    }
  }

  /**
   * Create new license
   */
  async createLicense(licenseData) {
    try {
      const response = await fetch(this.licenseEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(licenseData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create license');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating license:', error);
      throw error;
    }
  }

  /**
   * Update license
   */
  async updateLicense(licenseId, licenseData) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(licenseData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update license');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating license:', error);
      throw error;
    }
  }

  /**
   * Delete license
   */
  async deleteLicense(licenseId) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete license');

      return { success: true };
    } catch (error) {
      console.error('Error deleting license:', error);
      throw error;
    }
  }

  // ==================== Renewal Operations ====================

  /**
   * Renew license
   */
  async renewLicense(licenseId, renewalData) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(renewalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to renew license');
      }

      return await response.json();
    } catch (error) {
      console.error('Error renewing license:', error);
      throw error;
    }
  }

  /**
   * Get renewal history for a license
   */
  async getRenewalHistory(licenseId) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/renewals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch renewal history');

      const data = await response.json();
      return data.renewals || [];
    } catch (error) {
      console.error('Error fetching renewal history:', error);
      throw error;
    }
  }

  /**
   * Bulk renew licenses
   */
  async bulkRenew(licenseIds, renewalData) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/bulk/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          license_ids: licenseIds,
          renewal_data: renewalData,
        }),
      });

      if (!response.ok) throw new Error('Failed to bulk renew licenses');

      return await response.json();
    } catch (error) {
      console.error('Error bulk renewing licenses:', error);
      throw error;
    }
  }

  // ==================== Document Management ====================

  /**
   * Upload license document
   */
  async uploadDocument(licenseId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload document');

      return await response.json();
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get license documents
   */
  async getDocuments(licenseId) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/documents`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  /**
   * Download document
   */
  async downloadDocument(licenseId, documentId, fileName) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  // ==================== Compliance & Verification ====================

  /**
   * Verify license compliance
   */
  async verifyCompliance(licenseId) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to verify compliance');

      return await response.json();
    } catch (error) {
      console.error('Error verifying compliance:', error);
      throw error;
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await fetch(`${this.licenseEndpoint}/compliance/report?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch compliance report');

      return await response.json();
    } catch (error) {
      console.error('Error fetching compliance report:', error);
      throw error;
    }
  }

  // ==================== Analytics & Reporting ====================

  /**
   * Get license statistics
   */
  async getStatistics() {
    try {
      const response = await fetch(`${this.licenseEndpoint}/statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch statistics');

      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  /**
   * Get expiry alerts
   */
  async getExpiryAlerts(daysThreshold = 30) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/alerts/expiry?days=${daysThreshold}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch expiry alerts');

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching expiry alerts:', error);
      throw error;
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.license_type) params.append('license_type', filters.license_type);
      if (filters.report_type) params.append('report_type', filters.report_type);

      const response = await fetch(`${this.licenseEndpoint}/reports/generate?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to generate report');

      return await response.json();
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Export licenses
   */
  async exportLicenses(licenseIds, format = 'excel') {
    try {
      const response = await fetch(`${this.licenseEndpoint}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          license_ids: licenseIds,
          format: format, // 'excel', 'csv', 'pdf'
        }),
      });

      if (!response.ok) throw new Error('Failed to export licenses');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `licenses_export_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting licenses:', error);
      throw error;
    }
  }

  // ==================== Batch Operations ====================

  /**
   * Bulk delete licenses
   */
  async bulkDelete(licenseIds) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/bulk/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ license_ids: licenseIds }),
      });

      if (!response.ok) throw new Error('Failed to delete licenses');

      return await response.json();
    } catch (error) {
      console.error('Error deleting licenses:', error);
      throw error;
    }
  }

  /**
   * Bulk update licenses
   */
  async bulkUpdate(licenseIds, updateData) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/bulk/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          license_ids: licenseIds,
          update_data: updateData,
        }),
      });

      if (!response.ok) throw new Error('Failed to update licenses');

      return await response.json();
    } catch (error) {
      console.error('Error updating licenses:', error);
      throw error;
    }
  }

  // ==================== Search & Filter ====================

  /**
   * Search licenses
   */
  async searchLicenses(query) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to search licenses');

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching licenses:', error);
      throw error;
    }
  }

  /**
   * Get license types - Saudi Arabia Comprehensive
   */
  getLicenseTypes() {
    return [
      'السجل التجاري',
      'الرخصة البلدية',
      'شهادة الدفاع المدني',
      'البطاقة الصحية',
      'رخصة محل المواد الغذائية',
      'رخصة القيادة',
      'استمارة المركبة',
      'الإقامة',
      'رخصة العمل',
      'رخصة مزاولة المهنة',
      'شهادة الزكاة والدخل',
      'شهادة التأمينات الاجتماعية',
      'رخصة الاستثمار الأجنبي',
      'رخصة استغلال السطح',
      'رخصة البناء',
      'تصريح العمل المؤقت',
      'شهادة المطابقة',
      'رخصة تشغيل المعدات',
      'التصريح البيئي',
      'رخصة النقل',
      'رخصة المقاولات',
    ];
  }

  /**
   * Get entity types
   */
  getEntityTypes() {
    return [
      { id: 'employee', name: 'موظف' },
      { id: 'vehicle', name: 'مركبة' },
      { id: 'business', name: 'نشاط تجاري' },
      { id: 'individual', name: 'فرد' },
      { id: 'building', name: 'مبنى' },
      { id: 'equipment', name: 'معدات' },
    ];
  }

  // ==================== Saudi Arabia Specific Features ====================

  /**
   * Get government authority links
   */
  getGovernmentLinks() {
    return {
      'السجل التجاري': 'https://mc.gov.sa',
      'الرخصة البلدية': 'https://balady.gov.sa',
      'شهادة الدفاع المدني': 'https://998.gov.sa',
      'البطاقة الصحية': 'https://moh.gov.sa',
      'رخصة محل المواد الغذائية': 'https://sfda.gov.sa',
      'رخصة القيادة': 'https://www.spa.gov.sa',
      'استمارة المركبة': 'https://www.spa.gov.sa',
      الإقامة: 'https://www.moi.gov.sa',
      'رخصة العمل': 'https://www.hrsd.gov.sa',
      'رخصة مزاولة المهنة': 'https://www.scfhs.org.sa',
      'شهادة الزكاة والدخل': 'https://zatca.gov.sa',
      'شهادة التأمينات الاجتماعية': 'https://www.gosi.gov.sa',
      'رخصة الاستثمار الأجنبي': 'https://misa.gov.sa',
      'رخصة البناء': 'https://balady.gov.sa',
      'التصريح البيئي': 'https://ncec.gov.sa',
      'رخصة النقل': 'https://www.transport.gov.sa',
      'رخصة المقاولات': 'https://www.momra.gov.sa',
    };
  }

  /**
   * Calculate renewal cost with late fees (Saudi system)
   */
  calculateRenewalCost(licenseType, expiryDate, estimatedBaseCost = 500) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysOverdue = Math.floor((today - expiry) / (1000 * 60 * 60 * 24));

    let cost = estimatedBaseCost;
    let lateFee = 0;

    // If expired, add late fees (10% per month in Saudi system)
    if (daysOverdue > 0) {
      const monthsOverdue = Math.ceil(daysOverdue / 30);
      lateFee = cost * 0.1 * monthsOverdue;
      cost += lateFee;
    }

    return {
      baseCost: estimatedBaseCost,
      lateFee: lateFee,
      totalCost: cost,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      monthsOverdue: daysOverdue > 0 ? Math.ceil(daysOverdue / 30) : 0,
    };
  }

  /**
   * Get required documents for license type (Saudi Arabia)
   */
  getRequiredDocuments(licenseType) {
    const documents = {
      'السجل التجاري': ['هوية المالك', 'عقد الإيجار', 'شهادة الاسم التجاري'],
      'الرخصة البلدية': ['السجل التجاري', 'عقد الإيجار', 'رسم كروكي', 'شهادة الدفاع المدني'],
      'شهادة الدفاع المدني': ['الرخصة البلدية', 'مخطط الموقع', 'تقرير السلامة'],
      'البطاقة الصحية': ['الفحص الطبي', 'صورة شخصية', 'الهوية الوطنية'],
      'رخصة محل المواد الغذائية': ['الرخصة البلدية', 'شهادة الدفاع المدني', 'البطاقة الصحية للعاملين', 'تحليل المياه'],
      'رخصة القيادة': ['الفحص الطبي', 'اختبار النظر', 'الهوية الوطنية', 'صورة شخصية'],
      'استمارة المركبة': ['رخصة القيادة', 'التأمين', 'الفحص الدوري', 'سند الملكية'],
      الإقامة: ['جواز السفر', 'صورة شخصية', 'عقد العمل', 'التأمين الطبي'],
      'رخصة العمل': ['الإقامة', 'عقد العمل', 'المؤهل الدراسي', 'الخبرة العملية'],
      'رخصة مزاولة المهنة': ['المؤهل العلمي', 'شهادة الخبرة', 'شهادة حسن السيرة', 'الفحص الطبي'],
      'شهادة الزكاة والدخل': ['السجل التجاري', 'القوائم المالية', 'الإقرار الضريبي'],
      'شهادة التأمينات الاجتماعية': ['السجل التجاري', 'قائمة الموظفين', 'سداد الاشتراكات'],
      'رخصة البناء': ['صك الملكية', 'المخططات الهندسية', 'موافقة الدفاع المدني', 'تقرير التربة'],
    };

    return documents[licenseType] || ['المستندات الأساسية'];
  }

  /**
   * Format date in Hijri (Islamic calendar) for Saudi Arabia
   */
  formatHijriDate(gregorianDate) {
    return new Date(gregorianDate).toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Check if license can be renewed online
   */
  canRenewOnline(licenseType) {
    const onlineRenewal = [
      'السجل التجاري',
      'الرخصة البلدية',
      'شهادة الدفاع المدني',
      'البطاقة الصحية',
      'رخصة محل المواد الغذائية',
      'رخصة القيادة',
      'استمارة المركبة',
      'الإقامة',
      'رخصة العمل',
      'رخصة مزاولة المهنة',
      'شهادة الزكاة والدخل',
      'شهادة التأمينات الاجتماعية',
      'رخصة الاستثمار الأجنبي',
      'التصريح البيئي',
      'رخصة النقل',
      'رخصة المقاولات',
    ];

    return onlineRenewal.includes(licenseType);
  }

  /**
   * Get alert schedule for license type (days before expiry)
   */
  getAlertSchedule(licenseType) {
    // Critical licenses need more frequent alerts
    const criticalLicenses = ['رخصة القيادة', 'استمارة المركبة', 'الإقامة', 'رخصة العمل'];

    if (criticalLicenses.includes(licenseType)) {
      return [180, 90, 60, 30, 15, 7, 3, 1]; // 6 months before
    }

    return [90, 60, 30, 15, 7, 3, 1]; // 3 months before
  }

  /**
   * Send alert notification (Email, SMS, WhatsApp)
   */
  async sendAlert(licenseId, alertType, channels = ['email']) {
    try {
      const response = await fetch(`${this.licenseEndpoint}/${licenseId}/alerts/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          alert_type: alertType,
          channels: channels,
        }),
      });

      if (!response.ok) throw new Error('Failed to send alert');

      return await response.json();
    } catch (error) {
      console.error('Error sending alert:', error);
      throw error;
    }
  }

  /**
   * Get alerts for all expiring licenses
   */
  async getExpiringLicensesAlerts(daysThreshold = 30) {
    try {
      const licenses = await this.getAllLicenses();
      const alerts = [];

      licenses.forEach(license => {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(license.expiry_date);

        if (daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0) {
          let severity = 'info';
          if (daysUntilExpiry <= 7) severity = 'error';
          else if (daysUntilExpiry <= 15) severity = 'warning';
          else if (daysUntilExpiry <= 30) severity = 'info';

          alerts.push({
            license,
            daysUntilExpiry,
            severity,
            message: `⚠️ الرخصة ${license.license_number} ستنتهي خلال ${daysUntilExpiry} يوم`,
          });
        } else if (daysUntilExpiry < 0) {
          alerts.push({
            license,
            daysUntilExpiry: Math.abs(daysUntilExpiry),
            severity: 'error',
            message: `🚨 الرخصة ${license.license_number} منتهية منذ ${Math.abs(daysUntilExpiry)} يوم`,
            expired: true,
          });
        }
      });

      // Sort by urgency
      return alerts.sort((a, b) => {
        if (a.expired && !b.expired) return -1;
        if (!a.expired && b.expired) return 1;
        return a.daysUntilExpiry - b.daysUntilExpiry;
      });
    } catch (error) {
      console.error('Error getting expiring licenses alerts:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive Saudi license report
   */
  async generateSaudiReport(filters = {}) {
    try {
      const licenses = await this.getAllLicenses(filters);
      const stats = await this.getStatistics();
      const alerts = await this.getExpiringLicensesAlerts(60);

      return {
        generatedAt: new Date().toISOString(),
        hijriDate: this.formatHijriDate(new Date()),
        totalLicenses: licenses.length,
        statistics: stats,
        alerts: alerts,
        byType: this.groupByType(licenses),
        byAuthority: this.groupByAuthority(licenses),
        byStatus: this.groupByStatus(licenses),
        expiryForecast: this.calculateExpiryForecast(licenses),
        estimatedCosts: this.calculateTotalRenewalCosts(licenses),
      };
    } catch (error) {
      console.error('Error generating Saudi report:', error);
      throw error;
    }
  }

  /**
   * Helper: Group licenses by type
   */
  groupByType(licenses) {
    return licenses.reduce((acc, license) => {
      const type = license.license_type || 'أخرى';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Group licenses by authority
   */
  groupByAuthority(licenses) {
    return licenses.reduce((acc, license) => {
      const authority = license.issuing_authority || 'غير محدد';
      acc[authority] = (acc[authority] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Group licenses by status
   */
  groupByStatus(licenses) {
    return licenses.reduce((acc, license) => {
      const status = this.getLicenseStatus(license.expiry_date);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Calculate expiry forecast (next 12 months)
   */
  calculateExpiryForecast(licenses) {
    const forecast = Array(12).fill(0);
    const now = new Date();

    licenses.forEach(license => {
      const expiry = new Date(license.expiry_date);
      const monthsUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24 * 30));

      if (monthsUntilExpiry >= 0 && monthsUntilExpiry < 12) {
        forecast[monthsUntilExpiry]++;
      }
    });

    return forecast.map((count, index) => ({
      month: new Date(now.getFullYear(), now.getMonth() + index).toLocaleDateString('ar-SA', { month: 'long' }),
      count,
    }));
  }

  /**
   * Helper: Calculate total renewal costs
   */
  calculateTotalRenewalCosts(licenses) {
    let totalBase = 0;
    let totalLateFees = 0;

    licenses.forEach(license => {
      const costs = this.calculateRenewalCost(license.license_type, license.expiry_date, license.cost || 500);
      totalBase += costs.baseCost;
      totalLateFees += costs.lateFee;
    });

    return {
      totalBase,
      totalLateFees,
      grandTotal: totalBase + totalLateFees,
    };
  }
}

const licenseService = new LicenseService();
export default licenseService;
