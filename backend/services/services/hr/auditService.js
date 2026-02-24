/**
 * HR Audit Service - خدمة التدقيق والمراجعة
 * تتبع وتسجيل جميع التغييرات والعمليات على بيانات الموارد البشرية
 */

const mongoose = require('mongoose');
const AuditLog = require('../models/auditLog.model');

class HRAuditService {
  /**
   * تسجيل عملية
   */
  static async logOperation(operationData) {
    try {
      const auditLog = new AuditLog({
        userId: operationData.userId,
        action: operationData.action,
        entityType: operationData.entityType,
        entityId: operationData.entityId,
        changes: operationData.changes || {},
        newValues: operationData.newValues || {},
        oldValues: operationData.oldValues || {},
        status: operationData.status || 'success',
        ipAddress: operationData.ipAddress,
        userAgent: operationData.userAgent,
        details: operationData.details || {},
        timestamp: new Date(),
        affectedRecords: operationData.affectedRecords || 1,
      });

      return await auditLog.save();
    } catch (error) {
      console.error('Audit log error:', error);
      throw new Error(`فشل تسجيل العملية: ${error.message}`);
    }
  }

  /**
   * تسجيل تغيير موظف
   */
  static async logEmployeeChange(employeeId, userId, oldData, newData, reason = '') {
    try {
      const changes = {};
      const changedFields = [];

      // مقارنة القيم القديمة والجديدة
      for (const key in newData) {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          changes[key] = {
            from: oldData[key],
            to: newData[key],
          };
          changedFields.push(key);
        }
      }

      if (changedFields.length === 0) {
        return { success: false, message: 'لا توجد تغييرات' };
      }

      const auditLog = new AuditLog({
        userId,
        action: 'UPDATE_EMPLOYEE',
        entityType: 'Employee',
        entityId: employeeId,
        changes,
        newValues: newData,
        oldValues: oldData,
        status: 'success',
        details: {
          reason,
          changedFields,
          fieldCount: changedFields.length,
        },
        timestamp: new Date(),
        affectedRecords: 1,
      });

      return await auditLog.save();
    } catch (error) {
      throw new Error(`خطأ في تسجيل التغيير: ${error.message}`);
    }
  }

  /**
   * تسجيل عملية دفع رواتب
   */
  static async logPayrollProcess(payrollData, userId) {
    try {
      const auditLog = new AuditLog({
        userId,
        action: 'PROCESS_PAYROLL',
        entityType: 'Payroll',
        entityId: payrollData.id || payrollData._id,
        changes: {
          status: {
            from: 'pending',
            to: payrollData.paymentStatus,
          },
        },
        newValues: {
          month: payrollData.month,
          totalAmount: payrollData.totalAmount,
          employeeCount: payrollData.employeeCount,
          status: payrollData.paymentStatus,
        },
        status: 'success',
        details: {
          month: payrollData.month,
          year: payrollData.year,
          totalBaseSalary: payrollData.totalBaseSalary,
          totalAllowances: payrollData.totalAllowances,
          totalDeductions: payrollData.totalDeductions,
          netTotal: payrollData.netTotal,
          paymentDate: new Date(),
        },
        timestamp: new Date(),
        affectedRecords: payrollData.employeeCount || 1,
      });

      return await auditLog.save();
    } catch (error) {
      throw new Error(`خطأ في تسجيل عملية الرواتب: ${error.message}`);
    }
  }

  /**
   * جلب سجل التدقيق لموظف
   */
  static async getEmployeeAuditTrail(employeeId, options = {}) {
    try {
      const { startDate, endDate, limit = 50, page = 1 } = options;

      let query = {
        $or: [{ entityId: employeeId }, { 'changes.employeeId': employeeId }],
      };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      const skip = (page - 1) * limit;

      const logs = await AuditLog.find(query)
        .populate('userId', 'fullName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      const total = await AuditLog.countDocuments(query);

      return {
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في جلب السجل: ${error.message}`);
    }
  }

  /**
   * تقرير التدقيق الشامل
   */
  static async getAuditReport(filters = {}) {
    try {
      const { startDate, endDate, action, entityType, userId } = filters;

      let query = {};
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;
      if (userId) query.userId = userId;

      const logs = await AuditLog.find(query)
        .populate('userId', 'fullName email role')
        .sort({ timestamp: -1 });

      // إحصائيات
      const stats = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            affectedRecords: { $sum: '$affectedRecords' },
          },
        },
      ]);

      // العمليات الأكثر تكراراً
      const topActions = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // أكثر المستخدمين نشاطاً
      const topUsers = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
      ]);

      return {
        totalOperations: logs.length,
        logs: logs.slice(0, 100),
        statistics: stats,
        topActions,
        topUsers: topUsers.map(u => ({
          userId: u._id,
          userName: u.userInfo[0]?.fullName || 'Unknown',
          operationCount: u.count,
        })),
        summary: {
          dateRange: {
            from: startDate,
            to: endDate,
          },
          operationsByStatus: await AuditLog.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
        },
      };
    } catch (error) {
      throw new Error(`خطأ في جلب تقرير التدقيق: ${error.message}`);
    }
  }

  /**
   * حذف السجلات القديمة
   */
  static async archiveOldLogs(daysOld = 365) {
    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - daysOld);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: archiveDate },
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `تم حذف ${result.deletedCount} سجل قديم`,
      };
    } catch (error) {
      throw new Error(`خطأ في حذف السجلات: ${error.message}`);
    }
  }

  /**
   * فحص الأنشطة المريبة
   */
  static async getSuspiciousActivities(options = {}) {
    try {
      const { daysBack = 7, threshold = 10 } = options;

      const date = new Date();
      date.setDate(date.getDate() - daysBack);

      // عمليات فاشلة متكررة
      const failedAttempts = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: date },
            status: 'failed',
          },
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gte: threshold } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
      ]);

      // تغييرات حساسة
      const sensitiveChanges = await AuditLog.find({
        timestamp: { $gte: date },
        action: {
          $in: ['DELETE_EMPLOYEE', 'MODIFY_SALARY', 'GRANT_PERMISSION', 'DISABLE_USER'],
        },
      })
        .populate('userId', 'fullName email')
        .sort({ timestamp: -1 })
        .limit(50);

      return {
        suspiciousActivities: {
          failedAttempts: failedAttempts.map(fa => ({
            userId: fa._id,
            userName: fa.userInfo[0]?.fullName || 'Unknown',
            failedAttemptCount: fa.count,
            riskLevel: fa.count > 20 ? 'high' : 'medium',
          })),
          sensitiveChanges: sensitiveChanges.length,
          sensitiveChangeDetails: sensitiveChanges,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في فحص الأنشطة المريبة: ${error.message}`);
    }
  }

  /**
   * تصدير سجل التدقيق
   */
  static async exportAuditLog(filters = {}, format = 'json') {
    try {
      const logs = await AuditLog.find(filters)
        .populate('userId', 'fullName email')
        .sort({ timestamp: -1 });

      if (format === 'csv') {
        return this.convertLogsToCSV(logs);
      }

      return {
        format: 'json',
        data: logs,
        count: logs.length,
        exportDate: new Date(),
      };
    } catch (error) {
      throw new Error(`خطأ في تصدير السجل: ${error.message}`);
    }
  }

  /**
   * تحويل إلى CSV
   */
  static convertLogsToCSV(logs) {
    const headers = [
      'التاريخ',
      'الفعل',
      'نوع الكيان',
      'معرف الكيان',
      'اسم المستخدم',
      'البريد الإلكتروني',
      'الحالة',
      'التفاصيل',
    ];

    const rows = logs.map(log => [
      log.timestamp.toLocaleString('ar-EG'),
      log.action,
      log.entityType,
      log.entityId,
      log.userId?.fullName || 'Unknown',
      log.userId?.email || '',
      log.status,
      JSON.stringify(log.changes),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return {
      format: 'csv',
      content: csv,
      fileName: `audit_log_${new Date().toISOString()}.csv`,
    };
  }
}

module.exports = HRAuditService;
