/* eslint-disable no-unused-vars */
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
    return Financial.findOneAndUpdate(
      { beneficiaryId },
      {
        $push: { invoices: { $each: [invoiceData], $slice: -1000 } },
        $inc: { totalAmount: invoiceData.amount, outstandingAmount: invoiceData.amount },
      },
      { new: true, upsert: true }
    );
  }

  static async recordPayment(beneficiaryId, paymentData) {
    return Financial.findOneAndUpdate(
      { beneficiaryId },
      {
        $push: { payments: { $each: [paymentData], $slice: -1000 } },
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
    return this.addInvoice(beneficiaryId, {
      ...invoiceData,
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date(),
    });
  }

  static async applyDiscount(beneficiaryId, discountData) {
    return Financial.findOneAndUpdate(
      { beneficiaryId },
      { $push: { discounts: { $each: [{ ...discountData, date: new Date() }], $slice: -500 } } },
      { new: true }
    );
  }
}

// ============================================
// REPORTS SERVICE (System 9)
// ============================================

class ReportsService {
  static async createCustomReport(caseId, reportData) {
    return Reports.findOneAndUpdate(
      { caseId },
      {
        $push: {
          customReports: {
            $each: [
              {
                ...reportData,
                generatedDate: new Date(),
              },
            ],
            $slice: -500,
          },
        },
      },
      { new: true, upsert: true }
    );
  }

  static async generateProgressReport(caseId) {
    return Reports.findOneAndUpdate(
      { caseId },
      {
        $push: {
          customReports: {
            $each: [
              {
                title: `Progress Report - ${new Date().toLocaleDateString('ar-SA')}`,
                type: 'progress',
                generatedDate: new Date(),
                format: 'pdf',
              },
            ],
            $slice: -500,
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
    return Reports.findOneAndUpdate(
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
    return Settings.findOne({ centerId });
  }

  static async updateCenterSettings(centerId, settings) {
    return Settings.findOneAndUpdate(
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
    return Settings.findOneAndUpdate(
      { centerId },
      { $push: { roles: { $each: [roleData], $slice: -50 } } },
      { new: true, upsert: true }
    );
  }

  static async updateRole(centerId, roleName, permissions) {
    return Settings.findOneAndUpdate(
      { centerId, 'roles.name': roleName },
      { $set: { 'roles.$.permissions': permissions } },
      { new: true }
    );
  }

  static async logAudit(centerId, auditData) {
    return Settings.findOneAndUpdate(
      { centerId },
      {
        $push: {
          auditLogs: {
            $each: [{ ...auditData, timestamp: new Date() }],
            $slice: -1000,
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
    return Settings.findOneAndUpdate(
      { centerId },
      { $set: { systemSettings: settings } },
      { new: true, upsert: true }
    );
  }

  static async createBackup(centerId) {
    return Settings.findOneAndUpdate(
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
