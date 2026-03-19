/* eslint-disable no-unused-vars */
/**
 * Equipment Management Routes
 * مسارات إدارة المعدات - نظام احترافي متقدم
 */

const express = require('express');
const router = express.Router();
const {
  Equipment,
  MaintenanceSchedule,
  EquipmentLending,
  EquipmentFaultLog,
  EquipmentCalibration,
} = require('../models/equipmentManagement');
const { authenticate, authorize } = require('../middleware/auth');
const { escapeRegex } = require('../utils/sanitize');
const { paginate } = require('../utils/paginate');

/**
 * Get all equipment with filters
 * GET /api/equipment?category=&status=&department=
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, status, department, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (department) filter['location.department'] = department;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { equipmentId: { $regex: escapeRegex(search), $options: 'i' } },
        { serialNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const query = Equipment.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Get equipment by ID with full details
 * GET /api/equipment/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    // جلب آخر جدولة صيانة
    const lastMaintenance = await MaintenanceSchedule.findOne({
      equipment: req.params.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // جلب آخر إعارة
    const lastLending = await EquipmentLending.findOne({
      equipment: req.params.id,
    })
      .sort({ borrowDate: -1 })
      .populate('borrower', 'name email')
      .lean();

    res.json({
      success: true,
      data: {
        ...equipment,
        lastMaintenance,
        lastLending,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Create new equipment
 * POST /api/equipment
 */
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      equipmentId,
      name,
      category,
      manufacturer,
      purchaseDate,
      purchasePrice,
      warrantyEndDate,
    } = req.body;

    // التحقق من عدم تكرار رقم المعدة
    const existing = await Equipment.findOne({ equipmentId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'رقم المعدة موجود بالفعل',
      });
    }

    const equipment = new Equipment({
      equipmentId,
      name,
      category,
      manufacturer,
      purchaseDate,
      purchasePrice,
      warranty: {
        endDate: warrantyEndDate,
      },
      createdBy: req.user._id,
    });

    await equipment.save();

    // إنشاء جدولة صيانة أولية
    const maintenanceSchedule = new MaintenanceSchedule({
      equipment: equipment._id,
      scheduleType: 'preventive',
      preventiveSchedule: {
        frequency: 30,
        frequencyType: 'monthly',
        nextScheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await maintenanceSchedule.save();

    res.status(201).json({
      success: true,
      data: equipment,
      message: 'تم إنشاء المعدة بنجاح',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * Update equipment
 * PUT /api/equipment/:id
 */
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    res.json({ success: true, data: equipment });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * Update equipment status
 * PATCH /api/equipment/:id/status
 */
router.patch('/:id/status', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;

    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user._id },
      { new: true }
    );

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    res.json({
      success: true,
      data: equipment,
      message: `تم تحديث حالة المعدة إلى: ${status}`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * Delete (retire) equipment
 * DELETE /api/equipment/:id
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    // Soft delete: mark as retired
    equipment.status = 'retired';
    equipment.updatedBy = req.user._id;
    await equipment.save();

    // Also cancel any pending maintenance schedules
    await MaintenanceSchedule.updateMany(
      { equipment: req.params.id, status: { $in: ['scheduled', 'pending'] } },
      { status: 'cancelled' }
    );

    res.json({
      success: true,
      message: 'تم إيقاف المعدة بنجاح (تقاعد)',
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ============ MAINTENANCE SCHEDULE ROUTES ============

/**
 * Get maintenance schedules
 * GET /api/maintenance-schedules?status=&equipment=
 */
router.get('/maintenance/schedules', authenticate, async (req, res) => {
  try {
    const { status, equipment } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (equipment) filter.equipment = equipment;

    const query = MaintenanceSchedule.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('responsibleTechnician', 'name email')
      .sort({ 'preventiveSchedule.nextScheduledDate': 1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Get overdue maintenance
 * GET /api/maintenance/overdue
 */
router.get('/maintenance/overdue', authenticate, async (req, res) => {
  try {
    const query = MaintenanceSchedule.find({
      status: { $in: ['scheduled', 'in_progress'] },
      'preventiveSchedule.nextScheduledDate': { $lt: new Date() },
    })
      .populate('equipment', 'name equipmentId')
      .populate('responsibleTechnician', 'name email');
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Create maintenance schedule
 * POST /api/maintenance-schedules
 */
router.post(
  '/maintenance-schedules',
  authenticate,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { equipmentId, scheduleType, frequency, frequencyType } = req.body;

      const schedule = new MaintenanceSchedule({
        equipment: equipmentId,
        scheduleType,
        preventiveSchedule: {
          frequency,
          frequencyType,
          nextScheduledDate: new Date(Date.now() + frequency * 24 * 60 * 60 * 1000),
        },
      });

      await schedule.save();

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'تم إنشاء جدولة الصيانة بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

/**
 * Complete maintenance
 * POST /api/maintenance/:id/complete
 */
router.post(
  '/maintenance/:id/complete',
  authenticate,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { findings, recommendations, duration, cost } = req.body;

      const schedule = await MaintenanceSchedule.findByIdAndUpdate(
        req.params.id,
        {
          status: 'completed',
          completion: {
            completedDate: new Date(),
            completedBy: req.user._id,
            findings,
            recommendations,
            duration,
            signOff: true,
          },
          cost: {
            totalCost: cost,
          },
        },
        { new: true }
      );

      if (!schedule) {
        return res.status(404).json({ success: false, message: 'جدولة الصيانة غير موجودة' });
      }

      // تحديث تاريخ الصيانة التالية
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + schedule.preventiveSchedule.frequency);
      schedule.preventiveSchedule.nextScheduledDate = nextDate;
      await schedule.save();

      res.json({
        success: true,
        data: schedule,
        message: 'تم إكمال جدولة الصيانة بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// ============ EQUIPMENT LENDING ROUTES ============

/**
 * Get lending records
 * GET /api/lending?status=&borrower=
 */
router.get('/lending', authenticate, async (req, res) => {
  try {
    const { status, borrower } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (borrower) filter.borrower = borrower;

    const query = EquipmentLending.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('borrower', 'name email department')
      .sort({ borrowDate: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Get overdue lendings
 * GET /api/lending/overdue
 */
router.get('/lending/overdue', authenticate, async (req, res) => {
  try {
    const query = EquipmentLending.find({
      status: 'active',
      expectedReturnDate: { $lt: new Date() },
    })
      .populate('equipment', 'name equipmentId')
      .populate('borrower', 'name email phone');
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Borrow equipment
 * POST /api/lending/borrow
 */
router.post(
  '/lending/borrow',
  authenticate,
  authorize('admin', 'manager', 'user'),
  async (req, res) => {
    try {
      const { equipmentId, expectedReturnDate, lendingType, borrowLocation, department } = req.body;

      // التحقق من توفر المعدة
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment || equipment.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: 'المعدة غير متاحة حالياً',
        });
      }

      const lendingId = `LEND-${Date.now()}`;
      const lending = new EquipmentLending({
        lendingId,
        equipment: equipmentId,
        borrower: req.user._id,
        expectedReturnDate,
        lendingType,
        borrowLocation,
        department,
      });

      await lending.save();

      // تحديث حالة المعدة
      await Equipment.findByIdAndUpdate(equipmentId, { status: 'in_use' });

      res.status(201).json({
        success: true,
        data: lending,
        message: 'تم إعارة المعدة بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

/**
 * Return equipment
 * POST /api/lending/:id/return
 */
router.post('/lending/:id/return', authenticate, async (req, res) => {
  try {
    const { condition, notes, images } = req.body;

    const lending = await EquipmentLending.findById(req.params.id);
    if (!lending) {
      return res.status(404).json({ success: false, message: 'الإعارة غير موجودة' });
    }

    lending.status = 'returned';
    lending.actualReturnDate = new Date();
    lending.usageStatus.currentCondition = condition;
    lending.usageStatus.lastInspectionNotes = notes;
    lending.returnProcess.photos = images || [];
    lending.returnProcess.inspectionDate = new Date();
    lending.returnProcess.inspectedBy = req.user._id;

    await lending.save();

    // تحديث حالة المعدة
    await Equipment.findByIdAndUpdate(lending.equipment, { status: 'available' });

    res.json({
      success: true,
      data: lending,
      message: 'تم استرجاع المعدة بنجاح',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

// ============ FAULT LOG ROUTES ============

/**
 * Get fault logs
 * GET /api/faults?equipment=&severity=&status=
 */
router.get('/faults', authenticate, async (req, res) => {
  try {
    const { equipment, severity, status } = req.query;
    const filter = {};

    if (equipment) filter.equipment = equipment;
    if (severity) filter.severity = severity;
    if (status) filter['resolution.status'] = status;

    const query = EquipmentFaultLog.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('reportedBy', 'name email')
      .populate('resolution.assignedTo', 'name email')
      .sort({ detectedDate: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Report a fault
 * POST /api/faults
 */
router.post('/faults', authenticate, async (req, res) => {
  try {
    const { equipmentId, faultCode, description, severity, category, symptoms } = req.body;

    const fault = new EquipmentFaultLog({
      equipment: equipmentId,
      faultCode,
      description,
      severity,
      category,
      symptoms,
      reportedBy: req.user._id,
    });

    await fault.save();

    // تحديث حالة المعدة إلى damaged أو in_maintenance حسب الخطورة
    if (severity === 'critical') {
      await Equipment.findByIdAndUpdate(equipmentId, { status: 'in_maintenance' });
    }

    res.status(201).json({
      success: true,
      data: fault,
      message: 'تم تسجيل العطل بنجاح',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * Resolve fault
 * PATCH /api/faults/:id/resolve
 */
router.patch(
  '/faults/:id/resolve',
  authenticate,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { solutionDescription, actionsTaken, cost } = req.body;

      const fault = await EquipmentFaultLog.findByIdAndUpdate(
        req.params.id,
        {
          'resolution.status': 'resolved',
          'resolution.solutionDescription': solutionDescription,
          'resolution.actionsTaken': actionsTaken,
          'resolution.resolvedDate': new Date(),
          'resolution.resolvedBy': req.user._id,
          cost,
        },
        { new: true }
      );

      if (!fault) {
        return res.status(404).json({ success: false, message: 'العطل غير موجود' });
      }

      // تحديث حالة المعدة إلى available
      await Equipment.findByIdAndUpdate(fault.equipment, { status: 'available' });

      res.json({
        success: true,
        data: fault,
        message: 'تم حل العطل بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// ============ CALIBRATION ROUTES ============

/**
 * Get calibration records
 * GET /api/calibrations?equipment=
 */
router.get('/calibrations', authenticate, async (req, res) => {
  try {
    const { equipment } = req.query;
    const filter = {};

    if (equipment) filter.equipment = equipment;

    const query = EquipmentCalibration.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('performedBy', 'name email')
      .sort({ calibrationDate: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Create calibration record
 * POST /api/calibrations
 */
router.post('/calibrations', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { equipmentId, calibrationStandard, results, cost, nextCalibrationDate } = req.body;

    const calibration = new EquipmentCalibration({
      equipment: equipmentId,
      calibrationDate: new Date(),
      nextCalibrationDate,
      calibrationStandard,
      performedBy: req.user._id,
      results,
      cost,
    });

    await calibration.save();

    res.status(201).json({
      success: true,
      data: calibration,
      message: 'تم تسجيل المعايرة بنجاح',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

// ============ DASHBOARD & ANALYTICS ROUTES ============

/**
 * Equipment dashboard statistics
 * GET /api/equipment/dashboard/stats
 */
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const totalEquipment = await Equipment.countDocuments();
    const availableEquipment = await Equipment.countDocuments({ status: 'available' });
    const inUseEquipment = await Equipment.countDocuments({ status: 'in_use' });
    const maintenanceEquipment = await Equipment.countDocuments({ status: 'in_maintenance' });

    const overdueMaintenances = await MaintenanceSchedule.countDocuments({
      status: { $in: ['scheduled', 'in_progress'] },
      'preventiveSchedule.nextScheduledDate': { $lt: new Date() },
    });

    const activeLendings = await EquipmentLending.countDocuments({ status: 'active' });
    const overdueLendings = await EquipmentLending.countDocuments({
      status: 'active',
      expectedReturnDate: { $lt: new Date() },
    });

    const openFaults = await EquipmentFaultLog.countDocuments({
      'resolution.status': 'open',
    });

    const criticalFaults = await EquipmentFaultLog.countDocuments({
      severity: 'critical',
      'resolution.status': { $in: ['open', 'in_progress'] },
    });

    res.json({
      success: true,
      data: {
        equipment: {
          total: totalEquipment,
          available: availableEquipment,
          inUse: inUseEquipment,
          maintenance: maintenanceEquipment,
        },
        maintenance: {
          overdue: overdueMaintenances,
        },
        lending: {
          active: activeLendings,
          overdue: overdueLendings,
        },
        faults: {
          open: openFaults,
          critical: criticalFaults,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * Equipment by category statistics
 * GET /api/equipment/analytics/by-category
 */
router.get('/analytics/by-category', authenticate, async (req, res) => {
  try {
    const categories = await Equipment.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
          },
          inUse: {
            $sum: { $cond: [{ $eq: ['$status', 'in_use'] }, 1, 0] },
          },
          maintenance: {
            $sum: { $cond: [{ $eq: ['$status', 'in_maintenance'] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;
