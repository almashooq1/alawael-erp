/**
 * Advanced Maintenance Service - خدمة الصيانة المتقدمة
 *
 * خدمة شاملة لإدارة الصيانة الذكية
 * ✅ Schedule Management
 * ✅ Task Management
 * ✅ Issue Tracking
 * ✅ Inventory Management
 * ✅ Cost Analysis
 * ✅ Predictive Maintenance
 */

const Vehicle = require('../models/Vehicle');
const MaintenanceTask = require('../models/MaintenanceTask');
const MaintenanceSchedule = require('../models/MaintenanceSchedule');
const MaintenanceProvider = require('../models/MaintenanceProvider');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const MaintenanceInventory = require('../models/MaintenanceInventory');
const logger = require('../utils/logger');

class AdvancedMaintenanceService {
  /**
   * ==================== إدارة الجداول ====================
   */

  /**
   * إنشاء جدول صيانة ذكي
   */
  async createSmartMaintenanceSchedule(vehicleId, scheduleData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      // توليد معرف فريد
      const scheduleId = `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const schedule = new MaintenanceSchedule({
        scheduleId,
        vehicle: vehicleId,
        ...scheduleData,
        status: 'نشط',
      });

      await schedule.save();

      logger.info(`تم إنشاء جدول صيانة للمركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تم إنشاء جدول الصيانة بنجاح',
        schedule,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء جدول الصيانة:', error);
      throw error;
    }
  }

  /**
   * الحصول على جداول الصيانة النشطة
   */
  async getActiveSchedules(filters = {}) {
    try {
      const query = { status: 'نشط' };

      if (filters.vehicle) query.vehicle = filters.vehicle;
      if (filters.category) query.category = filters.category;
      if (filters.priority) query.priority = filters.priority;

      const schedules = await MaintenanceSchedule.find(query)
        .populate('vehicle', 'registrationNumber plateNumber basicInfo')
        .sort({ 'recurringSchedule.nextDue': 1 });

      // حساب تلك المستحقة والقريبة
      const dueSoon = schedules.filter(s => s.isDue);
      const comingSoon = schedules.filter(
        s =>
          s.daysUntilDue >= 0 &&
          s.daysUntilDue <= 7 &&
          !dueSoon.includes(s)
      );

      return {
        success: true,
        count: schedules.length,
        dueSoon: dueSoon.length,
        comingSoon: comingSoon.length,
        schedules,
      };
    } catch (error) {
      logger.error('خطأ في جلب جداول الصيانة النشطة:', error);
      throw error;
    }
  }

  /**
   * ==================== إدارة المهام ====================
   */

  /**
   * إنشاء مهام صيانة من جدول
   */
  async createTasksFromSchedule(scheduleId) {
    try {
      const schedule = await MaintenanceSchedule.findById(scheduleId).populate('vehicle');
      if (!schedule) {
        throw new Error('الجدول غير موجود');
      }

      const tasks = [];

      for (const item of schedule.maintenanceItems) {
        const taskId = `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const task = new MaintenanceTask({
          taskId,
          vehicle: schedule.vehicle._id,
          schedule: scheduleId,
          title: item.itemName,
          description: item.description,
          category: schedule.category,
          type: item.itemName,
          priority: schedule.priority,
          scheduledDate: schedule.recurringSchedule.nextDue,
          estimatedDuration: item.estimatedDuration || 1,
          estimatedCost: item.estimatedCost || 0,
          status: 'مجدولة',
        });

        await task.save();
        tasks.push(task);
      }

      logger.info(`تم إنشاء ${tasks.length} مهام من الجدول`);
      return {
        success: true,
        message: `تم إنشاء ${tasks.length} مهام بنجاح`,
        tasks,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء المهام:', error);
      throw error;
    }
  }

  /**
   * الحصول على المهام القادمة
   */
  async getUpcomingTasks(filters = {}) {
    try {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const query = {
        status: { $in: ['مجدولة', 'جارية'] },
        scheduledDate: { $gte: now, $lte: nextMonth },
      };

      if (filters.vehicle) query.vehicle = filters.vehicle;
      if (filters.priority) query.priority = filters.priority;

      const tasks = await MaintenanceTask.find(query)
        .populate('vehicle', 'registrationNumber plateNumber')
        .populate('assignedTechnician', 'personalInfo.firstName personalInfo.lastName')
        .sort({ scheduledDate: 1 });

      const overdue = tasks.filter(t => t.isOverdue);
      const urgent = tasks.filter(t => t.priority === 'حرجة');

      return {
        success: true,
        count: tasks.length,
        overdue: overdue.length,
        urgent: urgent.length,
        tasks,
      };
    } catch (error) {
      logger.error('خطأ في جلب المهام القادمة:', error);
      throw error;
    }
  }

  /**
   * تحديث تقدم المهمة
   */
  async updateTaskProgress(taskId, progress, notes = '') {
    try {
      const task = await MaintenanceTask.findById(taskId);
      if (!task) {
        throw new Error('المهمة غير موجودة');
      }

      task.progress = Math.min(progress, 100);
      task.notes = notes;

      if (progress === 0) {
        task.status = 'جارية';
        task.startedDate = new Date();
      } else if (progress === 100) {
        task.status = 'مكتملة';
        task.completedDate = new Date();
        task.actualDuration = Math.round(
          (task.completedDate - task.startedDate) / (1000 * 60)
        );
      }

      // تسجيل النشاط
      task.activityLog.push({
        action: 'تحديث التقدم',
        timestamp: new Date(),
        performedBy: 'system',
        details: `تم تحديث التقدم إلى ${progress}%`,
      });

      await task.save();

      return {
        success: true,
        message: 'تم تحديث التقدم بنجاح',
        task,
      };
    } catch (error) {
      logger.error('خطأ في تحديث التقدم:', error);
      throw error;
    }
  }

  /**
   * ==================== إدارة المشاكل ====================
   */

  /**
   * تسجيل مشكلة جديدة
   */
  async reportMaintenanceIssue(vehicleId, issueData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const issueId = `ISSUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const issue = new MaintenanceIssue({
        issueId,
        vehicle: vehicleId,
        plateNumber: vehicle.plateNumber,
        ...issueData,
        status: 'جديد',
      });

      await issue.save();

      // تحديث سجل المركبة
      vehicle.issues.push({
        date: new Date(),
        issue: issueData.title,
        severity: issueData.severity,
        status: 'جديدة',
      });

      await vehicle.save();

      logger.info(`تم تسجيل مشكلة للمركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تم تسجيل المشكلة بنجاح',
        issue,
      };
    } catch (error) {
      logger.error('خطأ في تسجيل المشكلة:', error);
      throw error;
    }
  }

  /**
   * تشخيص تلقائي للمشكلة
   */
  async autodiagnosisIssue(issueId) {
    try {
      const issue = await MaintenanceIssue.findById(issueId);
      if (!issue) {
        throw new Error('المشكلة غير موجودة');
      }

      // محاكاة نظام تشخيص ذكي
      const diagnosticKnowledge = {
        'صرير':
          'يمكن أن يكون بسبب الفرامل أو المعلقات. يُنصح بفحص الفرامل أولاً.',
        'تسرب': 'فحص السوائل والمحرك. قد يكون تسريب زيت أو سائل تبريد.',
        'أداء ضعيف': 'تحقق من فلاتر الهواء والوقود وشمعات الإشعال.',
        'رائحة حرق': 'قد يكون بسبب الكلتش أو مشكلة في الكهرباء.',
      };

      let rootCause = 'يتطلب فحص يدوي';
      const type = issue.type || 'أخرى';

      if (diagnosticKnowledge[type]) {
        rootCause = diagnosticKnowledge[type];
      }

      issue.diagnosis = {
        diagnostician: null,
        diagnosisDate: new Date(),
        rootCause,
        requiredRepairs: [type],
        estimatedCost: issue.severity === 'حرجة' ? 500 : 200,
        estimatedDuration: issue.severity === 'حرجة' ? 48 : 24,
        confidence: 60,
      };

      issue.status = 'قيد المعالجة';

      await issue.save();

      return {
        success: true,
        message: 'تم التشخيص التلقائي للمشكلة',
        issue,
      };
    } catch (error) {
      logger.error('خطأ في تشخيص المشكلة:', error);
      throw error;
    }
  }

  /**
   * ==================== إدارة المخزون ====================
   */

  /**
   * تتبع مستويات المخزون الحرجة
   */
  async checkInventoryCriticalLevels() {
    try {
      const lowStock = await MaintenanceInventory.find({
        currentStock: { $lte: Document.syncRoot },
        status: 'نشط',
      });

      const expiringSoon = await MaintenanceInventory.find({
        'lifecycle.expiryDate': {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        status: 'نشط',
      });

      const needsReorder = await MaintenanceInventory.find({
        $expr: { $lte: ['$currentStock', '$reorderLevel'] },
      });

      return {
        success: true,
        summary: {
          lowStock: lowStock.length,
          expiringSoon: expiringSoon.length,
          needsReorder: needsReorder.length,
        },
        lowStock,
        expiringSoon,
        needsReorder,
      };
    } catch (error) {
      logger.error('خطأ في فحص المخزون:', error);
      throw error;
    }
  }

  /**
   * إنشاء طلب شراء تلقائي
   */
  async createAutoPurchaseOrder(inventoryId) {
    try {
      const inventory = await MaintenanceInventory.findById(inventoryId).populate('preferredSupplier');

      if (!inventory) {
        throw new Error('الصنف غير موجود');
      }

      if (!inventory.preferredSupplier) {
        throw new Error('لا يوجد مورد محدد لهذا الصنف');
      }

      const quantityNeeded = inventory.maximumStock - inventory.currentStock;

      const purchaseOrder = {
        poNumber: `PO-${Date.now()}`,
        supplierId: inventory.preferredSupplier._id,
        quantityOrdered: Math.max(quantityNeeded, inventory.suppliers[0]?.minimumOrderQuantity || 1),
        orderDate: new Date(),
        expectedDeliveryDate: new Date(
          Date.now() + (inventory.suppliers[0]?.leadTime || 7) * 24 * 60 * 60 * 1000
        ),
        unitCost: inventory.pricing.unitCost,
        status: 'مسودة',
        paymentStatus: 'غير مدفوعة',
      };

      purchaseOrder.totalCost = purchaseOrder.quantityOrdered * purchaseOrder.unitCost;

      inventory.purchaseOrders.push(purchaseOrder);
      await inventory.save();

      logger.info(`تم إنشاء طلب شراء تلقائي للصنف: ${inventory.partName}`);
      return {
        success: true,
        message: 'تم إنشاء طلب الشراء بنجاح',
        purchaseOrder,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء طلب الشراء:', error);
      throw error;
    }
  }

  /**
   * ==================== التحليلات والتقارير ====================
   */

  /**
   * الحصول على تحليل التكاليف الشامل
   */
  async getMaintenanceCostAnalysis(vehicleId, period = 12) {
    try {
      const vehicle = await Vehicle.findById(vehicleId).populate('maintenance.maintenanceHistory');

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const startDate = new Date(Date.now() - period * 30.44 * 24 * 60 * 60 * 1000);

      const tasks = await MaintenanceTask.find({
        vehicle: vehicleId,
        completedDate: { $gte: startDate },
      });

      const issues = await MaintenanceIssue.find({
        vehicle: vehicleId,
        resolvedDate: { $gte: startDate },
      });

      // حساب التكاليف
      const taskCosts = tasks.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost || 0), 0);
      const issueCosts = issues.reduce((sum, i) => sum + (i.resolution.actualCost || 0), 0);
      const scheduleCosts = vehicle.maintenance.totalMaintenanceCost || 0;

      const totalCost = taskCosts + issueCosts;

      return {
        success: true,
        analysis: {
          period: `${period} شهر`,
          totalCost: totalCost.toFixed(2),
          taskCosts: taskCosts.toFixed(2),
          issueCosts: issueCosts.toFixed(2),
          averageMonthly: (totalCost / period).toFixed(2),
          costPerKm: vehicle.stats.costPerKm,
          trend: totalCost > 0 ? 'ارتفاع' : 'انخفاض',
          tasks: tasks.length,
          issues: issues.length,
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب تحليل التكاليف:', error);
      throw error;
    }
  }

  /**
   * الحصول على ملخص صحة المركبة
   */
  async getVehicleHealthSummary(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const recentIssues = await MaintenanceIssue.find({ vehicle: vehicleId })
        .sort({ reportedDate: -1 })
        .limit(5);

      const openIssues = await MaintenanceIssue.countDocuments({
        vehicle: vehicleId,
        'resolution.status': { $ne: 'مقفول' },
      });

      const upcomingTasks = await MaintenanceTask.countDocuments({
        vehicle: vehicleId,
        status: 'مجدولة',
        scheduledDate: { $gte: new Date() },
      });

      // حساب درجة الصحة
      let healthScore = 100;
      if (openIssues > 0) healthScore -= Math.min(openIssues * 10, 40);
      if (vehicle.issues.length > 10) healthScore -= 20;
      if (vehicle.violations.length > 5) healthScore -= 15;

      const healthStatus =
        healthScore >= 80 ? 'ممتاز' : healthScore >= 60 ? 'جيد' : healthScore >= 40 ? 'مقبول' : 'سيء';

      return {
        success: true,
        summary: {
          healthScore: Math.max(healthScore, 0),
          healthStatus,
          openIssues,
          upcomingTasks,
          lastMaintenance: vehicle.maintenance.lastMaintenanceDate,
          nextMaintenance: vehicle.maintenance.nextMaintenanceDate,
          totalIssues: vehicle.issues.length,
          totalViolations: vehicle.totalViolations,
          recentIssues: recentIssues.slice(0, 3),
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب ملخص الصحة:', error);
      throw error;
    }
  }

  /**
   * ==================== الإخطارات والتنبيهات ====================
   */

  /**
   * تشغيل تنبيهات الصيانة الذكية
   */
  async triggerSmartAlerts() {
    try {
      const alerts = {
        dueMaintenance: [],
        criticalIssues: [],
        lowInventory: [],
        overdueSchedules: [],
      };

      // المركبات التي تحتاج صيانة
      const dueMaintenance = await Vehicle.find({
        'maintenance.nextMaintenanceDate': { $lte: new Date() },
        isActive: true,
      });

      alerts.dueMaintenance = dueMaintenance.map(v => ({
        vehicleId: v._id,
        message: `المركبة ${v.plateNumber} تحتاج صيانة فوراً`,
        priority: 'عالية',
      }));

      // المشاكل الحرجة المفتوحة
      const criticalIssues = await MaintenanceIssue.find({
        severity: 'حرجة',
        'resolution.status': 'مقفول',
      });

      alerts.criticalIssues = criticalIssues.map(i => ({
        issueId: i._id,
        message: `مشكلة حرجة مفتوحة: ${i.title}`,
        priority: 'حرجة',
      }));

      // المخزون الحرج
      const inventoryIssues = await this.checkInventoryCriticalLevels();
      alerts.lowInventory = inventoryIssues.needsReorder.map(i => ({
        inventoryId: i._id,
        message: `الصنف ${i.partName} يحتاج إعادة طلب`,
        priority: 'متوسطة',
      }));

      logger.info(`تم تشغيل ${Object.values(alerts).flat().length} تنبيهات`);
      return {
        success: true,
        alerts,
        totalAlerts: Object.values(alerts).flat().length,
      };
    } catch (error) {
      logger.error('خطأ في تشغيل التنبيهات:', error);
      throw error;
    }
  }
}

module.exports = new AdvancedMaintenanceService();
