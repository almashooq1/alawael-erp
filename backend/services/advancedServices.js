/**
 * Advanced Services
 * خدمات الأنظمة 8-10
 */

const { Financial, Reports, Settings } = require('../models/advanced.models');

// ============================================
// FINANCIAL SERVICE (System 8)
// ============================================

class FinancialService {
  static async addInvoice(beneficiaryId, invoiceData) {
    return await Financial.findOneAndUpdate(
      { beneficiaryId },
      {
        $push: { invoices: invoiceData },
        $inc: { totalAmount: invoiceData.amount, outstandingAmount: invoiceData.amount },
      },
      { new: true, upsert: true }
    );
  }

  static async recordPayment(beneficiaryId, paymentData) {
    return await Financial.findOneAndUpdate(
      { beneficiaryId },
      {
        $push: { payments: paymentData },
        $inc: { paidAmount: paymentData.amount, outstandingAmount: -paymentData.amount },
        $set: { lastPaymentDate: new Date() },
      },
      { new: true }
    );
  }

  static async getFinancialSummary(beneficiaryId) {
    const record = await Financial.findOne({ beneficiaryId });
    return record
      ? {
          totalAmount: record.totalAmount,
          paidAmount: record.paidAmount,
          outstandingAmount: record.outstandingAmount,
          balance: record.balance,
          lastPaymentDate: record.lastPaymentDate,
        }
      : null;
  }

  static async generateInvoice(beneficiaryId, invoiceData) {
    return await this.addInvoice(beneficiaryId, {
      ...invoiceData,
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date(),
    });
  }

  static async applyDiscount(beneficiaryId, discountData) {
    return await Financial.findOneAndUpdate(
      { beneficiaryId },
      { $push: { discounts: { ...discountData, date: new Date() } } },
      { new: true }
    );
  }
}

// ============================================
// REPORTS SERVICE (System 9)
// ============================================

class ReportsService {
  static async createCustomReport(caseId, reportData) {
    return await Reports.findOneAndUpdate(
      { caseId },
      {
        $push: {
          customReports: {
            ...reportData,
            generatedDate: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );
  }

  static async generateProgressReport(caseId) {
    return await Reports.findOneAndUpdate(
      { caseId },
      {
        $push: {
          customReports: {
            title: `Progress Report - ${new Date().toLocaleDateString('ar-SA')}`,
            type: 'progress',
            generatedDate: new Date(),
            format: 'pdf',
          },
        },
      },
      { new: true, upsert: true }
    );
  }

  static async getReports(caseId, filters = {}) {
    const reports = await Reports.findOne({ caseId });
    if (!reports) return [];

    let filtered = reports.customReports;
    if (filters.type) filtered = filtered.filter(r => r.type === filters.type);
    if (filters.period) filtered = filtered.filter(r => r.period === filters.period);

    return filtered;
  }

  static async updateStatistics(caseId, stats) {
    return await Reports.findOneAndUpdate(
      { caseId },
      { $set: { statistics: stats } },
      { new: true, upsert: true }
    );
  }

  static async exportReport(caseId, reportId, format = 'pdf') {
    const reports = await Reports.findOne({ caseId });
    const report = reports?.customReports.find(r => r._id.toString() === reportId);
    if (!report) throw new Error('Report not found');
    return report;
  }
}

// ============================================
// SETTINGS SERVICE (System 10)
// ============================================

class SettingsService {
  static async getSettings(centerId) {
    return await Settings.findOne({ centerId });
  }

  static async updateCenterSettings(centerId, settings) {
    return await Settings.findOneAndUpdate(
      { centerId },
      { $set: { centerSettings: settings } },
      { new: true, upsert: true }
    );
  }

  static async getRoles(centerId) {
    const settings = await Settings.findOne({ centerId });
    return settings?.roles || [];
  }

  static async createRole(centerId, roleData) {
    return await Settings.findOneAndUpdate(
      { centerId },
      { $push: { roles: roleData } },
      { new: true, upsert: true }
    );
  }

  static async updateRole(centerId, roleName, permissions) {
    return await Settings.findOneAndUpdate(
      { centerId, 'roles.name': roleName },
      { $set: { 'roles.$.permissions': permissions } },
      { new: true }
    );
  }

  static async logAudit(centerId, auditData) {
    return await Settings.findOneAndUpdate(
      { centerId },
      {
        $push: {
          auditLogs: {
            ...auditData,
            timestamp: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );
  }

  static async getAuditLogs(centerId, filters = {}) {
    const settings = await Settings.findOne({ centerId });
    if (!settings) return [];

    let logs = settings.auditLogs;
    if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);

    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  }

  static async getSystemSettings(centerId) {
    const settings = await Settings.findOne({ centerId });
    return settings?.systemSettings || {};
  }

  static async updateSystemSettings(centerId, settings) {
    return await Settings.findOneAndUpdate(
      { centerId },
      { $set: { systemSettings: settings } },
      { new: true, upsert: true }
    );
  }

  static async createBackup(centerId) {
    return await Settings.findOneAndUpdate(
      { centerId },
      {
        $push: {
          backups: {
            date: new Date(),
            status: 'success',
            size: 'calculating...',
            location: '/backups/' + Date.now(),
          },
        },
      },
      { new: true, upsert: true }
    );
  }

  static async getBackups(centerId) {
    const settings = await Settings.findOne({ centerId });
    return settings?.backups || [];
  }
}

module.exports = {
  FinancialService,
  ReportsService,
  SettingsService,
};
