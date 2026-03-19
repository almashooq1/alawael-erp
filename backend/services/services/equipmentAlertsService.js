/**
 * Equipment Alerts Service
 * خدمة التنبيهات الذكية - نظام التنبيهات والإخطارات المتقدم
 */

const {
  Equipment,
  MaintenanceSchedule,
  EquipmentLending,
  EquipmentFaultLog,
  EquipmentCalibration,
} = require('../models/equipmentManagement');
const { User } = require('../models/schemas');

class EquipmentAlertsService {
  /**
   * Check for warranty expiration alerts
   * فحص انتهاء الضمان
   */
  static async checkWarrantyAlerts() {
    const alerts = [];
    const daysThreshold = 30; // تنبيه قبل 30 يوم
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    try {
      const equipmentWithWarranty = await Equipment.find({
        'warranty.endDate': {
          $gt: now,
          $lte: thresholdDate,
        },
        'warranty.isExpired': false,
      });

      for (const equipment of equipmentWithWarranty) {
        const daysLeft = Math.ceil(
          (new Date(equipment.warranty.endDate) - now) / (1000 * 60 * 60 * 24)
        );

        alerts.push({
          type: 'warranty_expiration',
          severity: daysLeft <= 7 ? 'high' : 'medium',
          equipment: equipment._id,
          equipmentName: equipment.name,
          message: `ينتهي ضمان المعدة "${equipment.name}" بعد ${daysLeft} يوم`,
          expirationDate: equipment.warranty.endDate,
          daysLeft,
          timestamp: now,
        });

        // تحديث المعدة
        equipment.warranty.daysRemaining = daysLeft;
        if (daysLeft === 0) {
          equipment.warranty.isExpired = true;
        }
        await equipment.save();
      }
    } catch (error) {
      console.error('Error checking warranty alerts:', error);
    }

    return alerts;
  }

  /**
   * Check for overdue maintenance
   * فحص الصيانات المتأخرة
   */
  static async checkOverdueMaintenances() {
    const alerts = [];
    const now = new Date();

    try {
      const overdueMaintenances = await MaintenanceSchedule.find({
        status: { $in: ['scheduled', 'in_progress'] },
        'preventiveSchedule.nextScheduledDate': { $lt: now },
      })
        .populate('equipment')
        .populate('responsibleTechnician');

      for (const maintenance of overdueMaintenances) {
        const daysOverdue = Math.ceil(
          (now - new Date(maintenance.preventiveSchedule.nextScheduledDate)) /
          (1000 * 60 * 60 * 24)
        );

        alerts.push({
          type: 'overdue_maintenance',
          severity: daysOverdue > 30 ? 'critical' : daysOverdue > 7 ? 'high' : 'medium',
          maintenance: maintenance._id,
          equipment: maintenance.equipment._id,
          equipmentName: maintenance.equipment.name,
          technician: maintenance.responsibleTechnician,
          message: `الصيانة المقررة للمعدة "${maintenance.equipment.name}" متأخرة بـ ${daysOverdue} يوم`,
          daysOverdue,
          scheduledDate: maintenance.preventiveSchedule.nextScheduledDate,
          timestamp: now,
        });

        // تحديث الحالة
        maintenance.status = 'overdue';
        await maintenance.save();
      }
    } catch (error) {
      console.error('Error checking overdue maintenances:', error);
    }

    return alerts;
  }

  /**
   * Check for upcoming maintenance
   * فحص الصيانات القادمة
   */
  static async checkUpcomingMaintenances() {
    const alerts = [];
    const now = new Date();
    const daysAhead = 7; // التنبيه قبل 7 أيام
    const upcomingDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    try {
      const upcomingMaintenances = await MaintenanceSchedule.find({
        status: 'scheduled',
        'preventiveSchedule.nextScheduledDate': {
          $gt: now,
          $lte: upcomingDate,
        },
      })
        .populate('equipment')
        .populate('responsibleTechnician');

      for (const maintenance of upcomingMaintenances) {
        const daysUntil = Math.ceil(
          (new Date(maintenance.preventiveSchedule.nextScheduledDate) - now) /
          (1000 * 60 * 60 * 24)
        );

        alerts.push({
          type: 'upcoming_maintenance',
          severity: 'low',
          maintenance: maintenance._id,
          equipment: maintenance.equipment._id,
          equipmentName: maintenance.equipment.name,
          technician: maintenance.responsibleTechnician,
          message: `صيانة المعدة "${maintenance.equipment.name}" موجودة غداً (خلال ${daysUntil} يوم)`,
          daysUntil,
          scheduledDate: maintenance.preventiveSchedule.nextScheduledDate,
          timestamp: now,
        });
      }
    } catch (error) {
      console.error('Error checking upcoming maintenances:', error);
    }

    return alerts;
  }

  /**
   * Check for overdue lendings
   * فحص الإعارات المتأخرة
   */
  static async checkOverdueLendings() {
    const alerts = [];
    const now = new Date();

    try {
      const overdueLendings = await EquipmentLending.find({
        status: 'active',
        expectedReturnDate: { $lt: now },
      })
        .populate('equipment')
        .populate('borrower');

      for (const lending of overdueLendings) {
        const daysOverdue = Math.ceil(
          (now - new Date(lending.expectedReturnDate)) / (1000 * 60 * 60 * 24)
        );

        alerts.push({
          type: 'overdue_lending',
          severity: daysOverdue > 14 ? 'critical' : daysOverdue > 7 ? 'high' : 'medium',
          lending: lending._id,
          equipment: lending.equipment._id,
          equipmentName: lending.equipment.name,
          borrower: lending.borrower,
          message: `المعدة "${lending.equipment.name}" المعارة لـ "${lending.borrower.name}" متأخرة بـ ${daysOverdue} يوم`,
          daysOverdue,
          expectedReturnDate: lending.expectedReturnDate,
          borrowerPhone: lending.borrower.phone,
          borrowerEmail: lending.borrower.email,
          timestamp: now,
        });

        // تحديث الحالة
        lending.status = 'overdue';
        await lending.save();
      }
    } catch (error) {
      console.error('Error checking overdue lendings:', error);
    }

    return alerts;
  }

  /**
   * Check for critical faults
   * فحص الأعطال الحرجة
   */
  static async checkCriticalFaults() {
    const alerts = [];

    try {
      const criticalFaults = await EquipmentFaultLog.find({
        severity: 'critical',
        'resolution.status': { $in: ['open', 'in_progress'] },
      })
        .populate('equipment')
        .populate('reportedBy');

      for (const fault of criticalFaults) {
        const timeOpen = Math.ceil(
          (new Date() - new Date(fault.detectedDate)) / (1000 * 60 * 60)
        );

        alerts.push({
          type: 'critical_fault',
          severity: 'critical',
          fault: fault._id,
          equipment: fault.equipment._id,
          equipmentName: fault.equipment.name,
          faultCode: fault.faultCode,
          message: `عطل حرج في المعدة "${fault.equipment.name}" - الكود: ${fault.faultCode}`,
          hoursOpen: timeOpen,
          detectedDate: fault.detectedDate,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error checking critical faults:', error);
    }

    return alerts;
  }

  /**
   * Check for upcoming calibrations
   * فحص المعايرات القادمة
   */
  static async checkUpcomingCalibrations() {
    const alerts = [];
    const now = new Date();
    const daysAhead = 14; // التنبيه قبل 14 يوم
    const upcomingDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    try {
      const upcomingCalibrations = await EquipmentCalibration.find({
        nextCalibrationDate: {
          $gt: now,
          $lte: upcomingDate,
        },
      })
        .populate('equipment')
        .populate('performedBy');

      for (const calibration of upcomingCalibrations) {
        const daysUntil = Math.ceil(
          (new Date(calibration.nextCalibrationDate) - now) / (1000 * 60 * 60 * 24)
        );

        alerts.push({
          type: 'upcoming_calibration',
          severity: daysUntil <= 7 ? 'medium' : 'low',
          calibration: calibration._id,
          equipment: calibration.equipment._id,
          equipmentName: calibration.equipment.name,
          message: `المعايرة التالية للمعدة "${calibration.equipment.name}" خلال ${daysUntil} يوم`,
          daysUntil,
          nextCalibrationDate: calibration.nextCalibrationDate,
          timestamp: now,
        });
      }
    } catch (error) {
      console.error('Error checking upcoming calibrations:', error);
    }

    return alerts;
  }

  /**
   * Check for high utilization equipment
   * فحص المعدات ذات الاستخدام العالي
   */
  static async checkHighUtilizationEquipment() {
    const alerts = [];

    try {
      const highUtilization = await Equipment.find({
        'usage.utilizationRate': { $gte: 80 },
        status: 'in_use',
      });

      for (const equipment of highUtilization) {
        if (equipment.usage.utilizationRate >= 90) {
          alerts.push({
            type: 'high_utilization',
            severity: 'medium',
            equipment: equipment._id,
            equipmentName: equipment.name,
            message: `المعدة "${equipment.name}" لديها معدل استخدام عالي جداً (${equipment.usage.utilizationRate}%)`,
            utilizationRate: equipment.usage.utilizationRate,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error checking high utilization:', error);
    }

    return alerts;
  }

  /**
   * Get all active alerts
   * جلب جميع التنبيهات النشطة
   */
  static async getAllActiveAlerts() {
    const alerts = [];

    try {
      const warrantyAlerts = await this.checkWarrantyAlerts();
      const overdueAlerts = await this.checkOverdueMaintenances();
      const upcomingAlerts = await this.checkUpcomingMaintenances();
      const lendinAlerts = await this.checkOverdueLendings();
      const faultAlerts = await this.checkCriticalFaults();
      const calibrationAlerts = await this.checkUpcomingCalibrations();
      const utilizationAlerts = await this.checkHighUtilizationEquipment();

      alerts.push(
        ...warrantyAlerts,
        ...overdueAlerts,
        ...upcomingAlerts,
        ...lendinAlerts,
        ...faultAlerts,
        ...calibrationAlerts,
        ...utilizationAlerts
      );

      // ترتيب التنبيهات حسب الخطورة
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alerts.sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );
    } catch (error) {
      console.error('Error getting all alerts:', error);
    }

    return alerts;
  }

  /**
   * Get alerts by type
   * جلب التنبيهات حسب النوع
   */
  static async getAlertsByType(type) {
    switch (type) {
      case 'warranty':
        return await this.checkWarrantyAlerts();
      case 'maintenance':
        return [
          ...(await this.checkOverdueMaintenances()),
          ...(await this.checkUpcomingMaintenances()),
        ];
      case 'lending':
        return await this.checkOverdueLendings();
      case 'faults':
        return await this.checkCriticalFaults();
      case 'calibration':
        return await this.checkUpcomingCalibrations();
      default:
        return [];
    }
  }

  /**
   * Get alert summary
   * ملخص التنبيهات
   */
  static async getAlertSummary() {
    const alerts = await this.getAllActiveAlerts();

    const summary = {
      total: alerts.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      byType: {},
    };

    for (const alert of alerts) {
      summary.bySeverity[alert.severity]++;
      summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
    }

    return summary;
  }

  /**
   * Export equipment report
   * تصدير تقرير المعدات
   */
  static async generateReport() {
    try {
      const total = await Equipment.countDocuments();
      const byCategory = await Equipment.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]);

      const byStatus = await Equipment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const totalValue = await Equipment.aggregate([
        {
          $group: {
            _id: null,
            value: { $sum: '$purchasePrice' },
          },
        },
      ]);

      return {
        summary: {
          totalEquipment: total,
          totalValue: totalValue[0]?.value || 0,
        },
        byCategory,
        byStatus,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  }
}

module.exports = EquipmentAlertsService;
