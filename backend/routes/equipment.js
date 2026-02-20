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

// ============ EQUIPMENT ROUTES ============

/**
 * Get all equipment with filters
 * GET /api/equipment?category=&status=&department=
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, status, department, search } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (department) filter['location.department'] = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { equipmentId: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const equipment = await Equipment.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: equipment.length,
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(400).json({ success: false, message: error.message });
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
    res.status(400).json({ success: false, message: error.message });
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
    res.status(400).json({ success: false, message: error.message });
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
    let filter = {};

    if (status) filter.status = status;
    if (equipment) filter.equipment = equipment;

    const schedules = await MaintenanceSchedule.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('responsibleTechnician', 'name email')
      .sort({ 'preventiveSchedule.nextScheduledDate': 1 })
      .lean();

    res.json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get overdue maintenance
 * GET /api/maintenance/overdue
 */
router.get('/maintenance/overdue', authenticate, async (req, res) => {
  try {
    const overdue = await MaintenanceSchedule.find({
      status: { $in: ['scheduled', 'in_progress'] },
      'preventiveSchedule.nextScheduledDate': { $lt: new Date() },
    })
      .populate('equipment', 'name equipmentId')
      .populate('responsibleTechnician', 'name email')
      .lean();

    res.json({
      success: true,
      count: overdue.length,
      data: overdue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Create maintenance schedule
 * POST /api/maintenance-schedules
 */
router.post('/maintenance-schedules', authenticate, authorize('admin', 'manager'), async (req, res) => {
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
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Complete maintenance
 * POST /api/maintenance/:id/complete
 */
router.post('/maintenance/:id/complete', authenticate, authorize('admin', 'manager'), async (req, res) => {
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
    nextDate.setDate(
      nextDate.getDate() + schedule.preventiveSchedule.frequency
    );
    schedule.preventiveSchedule.nextScheduledDate = nextDate;
    await schedule.save();

    res.json({
      success: true,
      data: schedule,
      message: 'تم إكمال جدولة الصيانة بنجاح',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ EQUIPMENT LENDING ROUTES ============

/**
 * Get lending records
 * GET /api/lending?status=&borrower=
 */
router.get('/lending', authenticate, async (req, res) => {
  try {
    const { status, borrower } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (borrower) filter.borrower = borrower;

    const lending = await EquipmentLending.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('borrower', 'name email department')
      .sort({ borrowDate: -1 })
      .lean();

    res.json({
      success: true,
      count: lending.length,
      data: lending,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get overdue lendings
 * GET /api/lending/overdue
 */
router.get('/lending/overdue', authenticate, async (req, res) => {
  try {
    const overdue = await EquipmentLending.find({
      status: 'active',
      expectedReturnDate: { $lt: new Date() },
    })
      .populate('equipment', 'name equipmentId')
      .populate('borrower', 'name email phone')
      .lean();

    res.json({
      success: true,
      count: overdue.length,
      data: overdue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Borrow equipment
 * POST /api/lending/borrow
 */
router.post('/lending/borrow', authenticate, authorize('admin', 'manager', 'user'), async (req, res) => {
  try {
    const {
      equipmentId,
      expectedReturnDate,
      lendingType,
      borrowLocation,
      department,
    } = req.body;

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
    res.status(400).json({ success: false, message: error.message });
  }
});

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
    await Equipment.findByIdAndUpdate(
      lending.equipment,
      { status: 'available' }
    );

    res.json({
      success: true,
      data: lending,
      message: 'تم استرجاع المعدة بنجاح',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    let filter = {};

    if (equipment) filter.equipment = equipment;
    if (severity) filter.severity = severity;
    if (status) filter['resolution.status'] = status;

    const faults = await EquipmentFaultLog.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('reportedBy', 'name email')
      .populate('resolution.assignedTo', 'name email')
      .sort({ detectedDate: -1 })
      .lean();

    res.json({
      success: true,
      count: faults.length,
      data: faults,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Report a fault
 * POST /api/faults
 */
router.post('/faults', authenticate, async (req, res) => {
  try {
    const {
      equipmentId,
      faultCode,
      description,
      severity,
      category,
      symptoms,
    } = req.body;

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
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Resolve fault
 * PATCH /api/faults/:id/resolve
 */
router.patch('/faults/:id/resolve', authenticate, authorize('admin', 'manager'), async (req, res) => {
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
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ CALIBRATION ROUTES ============

/**
 * Get calibration records
 * GET /api/calibrations?equipment=
 */
router.get('/calibrations', authenticate, async (req, res) => {
  try {
    const { equipment } = req.query;
    let filter = {};

    if (equipment) filter.equipment = equipment;

    const calibrations = await EquipmentCalibration.find(filter)
      .populate('equipment', 'name equipmentId')
      .populate('performedBy', 'name email')
      .sort({ calibrationDate: -1 })
      .lean();

    res.json({
      success: true,
      count: calibrations.length,
      data: calibrations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Create calibration record
 * POST /api/calibrations
 */
router.post('/calibrations', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      equipmentId,
      calibrationStandard,
      results,
      cost,
      nextCalibrationDate,
    } = req.body;

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
    res.status(400).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
