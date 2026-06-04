/**
 * Medical Equipment Routes — مسارات المعدات الطبية
 *
 * Endpoints:
 *   /api/medical-equipment/equipment     — Equipment CRUD & tracking
 *   /api/medical-equipment/calibrations  — Calibration records
 *   /api/medical-equipment/maintenance   — Maintenance work orders
 *   /api/medical-equipment/certificates  — Safety certificates
 *   /api/medical-equipment/alerts        — Expiry & due-date alerts
 *   /api/medical-equipment/dashboard     — Equipment dashboard
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  MedicalEquipment,
  CalibrationRecord,
  EquipmentMaintenance,
  SafetyCertificate,
} = require('../models/medicalEquipment.model');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

function mergeEquipFilter(req, base = {}) {
  return { ...base, ...branchFilter(req), isDeleted: base.isDeleted ?? { $ne: true } };
}

function scopedEquipById(req, id) {
  return { _id: id, ...branchFilter(req), isDeleted: { $ne: true } };
}

async function equipmentIdsInScope(req) {
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return null;
  const rows = await MedicalEquipment.find({ ...scope, isDeleted: { $ne: true } })
    .select('_id')
    .lean();
  return rows.map(r => r._id);
}

async function applyChildEquipmentScope(req, filter) {
  const ids = await equipmentIdsInScope(req);
  if (!ids) return filter;
  if (filter.equipment) {
    const eid = String(filter.equipment);
    if (!ids.some(id => String(id) === eid)) return { ...filter, equipment: { $in: [] } };
    return filter;
  }
  return { ...filter, equipment: { $in: ids } };
}

async function gateEquipmentId(req, res, equipmentId) {
  if (!equipmentId || !mongoose.isValidObjectId(equipmentId)) {
    res.status(400).json({ success: false, message: 'معرّف المعدة غير صالح' });
    return false;
  }
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return true;
  const hit = await MedicalEquipment.findOne({
    _id: equipmentId,
    ...scope,
    isDeleted: { $ne: true },
  })
    .select('_id')
    .lean();
  if (!hit) {
    res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// EQUIPMENT — المعدات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/equipment', async (req, res) => {
  try {
    const { category, status, department, search, page = 1, limit = 20 } = req.query;
    const filter = mergeEquipFilter(req, {});
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (department) filter['location.department'] = department;
    if (search) {
      filter.$or = [
        { assetTag: { $regex: escapeRegex(search), $options: 'i' } },
        { 'name.ar': { $regex: escapeRegex(search), $options: 'i' } },
        { 'name.en': { $regex: escapeRegex(search), $options: 'i' } },
        { serialNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { manufacturer: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [equipment, total] = await Promise.all([
      MedicalEquipment.find(filter)
        .populate('location.department', 'name')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      MedicalEquipment.countDocuments(filter),
    ]);
    res.json({ success: true, data: equipment, total });
  } catch (error) {
    safeError(res, error, '[MedEquip] List equipment error');
  }
});

router.get('/equipment/:id', async (req, res) => {
  try {
    const eq = await MedicalEquipment.findOne(scopedEquipById(req, req.params.id))
      .populate('location.department', 'name')
      .populate('assignedTo', 'name');
    if (!eq) return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });

    // Fetch related records
    const [calibrations, maintenanceRecords, certificates] = await Promise.all([
      CalibrationRecord.find({ equipment: eq._id, isDeleted: { $ne: true } })
        .sort({ calibrationDate: -1 })
        .limit(5),
      EquipmentMaintenance.find({ equipment: eq._id, isDeleted: { $ne: true } })
        .sort({ reportedDate: -1 })
        .limit(5),
      SafetyCertificate.find({ equipment: eq._id, isDeleted: { $ne: true } })
        .sort({ expiryDate: -1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      data: { ...eq.toObject(), calibrations, maintenanceRecords, certificates },
    });
  } catch (error) {
    safeError(res, error, '[MedEquip] Get equipment error');
  }
});

router.post('/equipment', async (req, res) => {
  try {
    const payload = stripUpdateMeta(req.body);
    delete payload.branchId;
    const eq = new MedicalEquipment({
      ...payload,
      createdBy: req.user?.id,
      ...(req.branchScope?.branchId && { branchId: req.branchScope.branchId }),
    });
    await eq.save();
    logger.info(`[MedEquip] Equipment created: ${eq.assetTag} - ${eq.name.ar}`);
    res.status(201).json({ success: true, data: eq });
  } catch (error) {
    safeError(res, error, '[MedEquip] Create equipment error');
  }
});

router.put('/equipment/:id', async (req, res) => {
  try {
    const body = stripUpdateMeta(req.body);
    delete body.branchId;
    const eq = await MedicalEquipment.findOneAndUpdate(scopedEquipById(req, req.params.id), body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!eq) return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    res.json({ success: true, data: eq });
  } catch (error) {
    safeError(res, error, '[MedEquip] Update equipment error');
  }
});

router.delete('/equipment/:id', async (req, res) => {
  try {
    const eq = await MedicalEquipment.findOneAndUpdate(
      scopedEquipById(req, req.params.id),
      { isDeleted: true },
      { returnDocument: 'after' }
    );
    if (!eq) return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المعدة بنجاح' });
  } catch (error) {
    safeError(res, error, '[MedEquip] Delete equipment error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATIONS — المعايرة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/calibrations', async (req, res) => {
  try {
    const { equipment, result, type, page = 1, limit = 20 } = req.query;
    let filter = { isDeleted: { $ne: true } };
    if (equipment) filter.equipment = equipment;
    if (result) filter.result = result;
    if (type) filter.type = type;
    filter = await applyChildEquipmentScope(req, filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      CalibrationRecord.find(filter)
        .populate('equipment', 'assetTag name')
        .sort({ calibrationDate: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      CalibrationRecord.countDocuments(filter),
    ]);
    res.json({ success: true, data: records, total });
  } catch (error) {
    logger.error('[MedEquip] List calibrations error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب سجلات المعايرة', error: safeError(error) });
  }
});

router.post('/calibrations', async (req, res) => {
  try {
    if (req.body.equipment && !(await gateEquipmentId(req, res, req.body.equipment))) return;
    const record = new CalibrationRecord({ ...stripUpdateMeta(req.body), createdBy: req.user?.id });
    await record.save();

    // Update equipment calibration dates
    if (req.body.equipment) {
      await MedicalEquipment.findOneAndUpdate(scopedEquipById(req, req.body.equipment), {
        'calibration.lastCalibrationDate': record.calibrationDate,
        'calibration.nextCalibrationDate': record.nextDueDate,
        status: record.result === 'fail' ? 'pending_calibration' : 'active',
      });
    }

    logger.info(`[MedEquip] Calibration recorded: ${record.calibrationNumber}`);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('[MedEquip] Create calibration error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تسجيل المعايرة', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MAINTENANCE — الصيانة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/maintenance', async (req, res) => {
  try {
    const { equipment, status, type, priority, page = 1, limit = 20 } = req.query;
    let filter = { isDeleted: { $ne: true } };
    if (equipment) filter.equipment = equipment;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    filter = await applyChildEquipmentScope(req, filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      EquipmentMaintenance.find(filter)
        .populate('equipment', 'assetTag name')
        .populate('reportedBy', 'name')
        .sort({ reportedDate: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      EquipmentMaintenance.countDocuments(filter),
    ]);
    res.json({ success: true, data: records, total });
  } catch (error) {
    logger.error('[MedEquip] List maintenance error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب سجلات الصيانة', error: safeError(error) });
  }
});

router.post('/maintenance', async (req, res) => {
  try {
    if (req.body.equipment && !(await gateEquipmentId(req, res, req.body.equipment))) return;
    const record = new EquipmentMaintenance({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?.id,
    });
    await record.save();

    // Update equipment status
    if (req.body.equipment && req.body.type !== 'inspection') {
      await MedicalEquipment.findOneAndUpdate(scopedEquipById(req, req.body.equipment), {
        status: 'in_maintenance',
      });
    }

    logger.info(`[MedEquip] Maintenance WO created: ${record.workOrderNumber}`);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('[MedEquip] Create maintenance error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء أمر الصيانة', error: safeError(error) });
  }
});

router.patch('/maintenance/:id/complete', async (req, res) => {
  try {
    const existing = await EquipmentMaintenance.findById(req.params.id).select('equipment').lean();
    if (!existing)
      return res.status(404).json({ success: false, message: 'أمر الصيانة غير موجود' });
    if (!(await gateEquipmentId(req, res, existing.equipment))) return;
    const record = await EquipmentMaintenance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date(),
        workPerformed: req.body.workPerformed,
        partsUsed: req.body.partsUsed,
        laborHours: req.body.laborHours,
        laborCost: req.body.laborCost,
        partsCost: req.body.partsCost,
        totalCost: (req.body.laborCost || 0) + (req.body.partsCost || 0),
        equipmentConditionAfter: req.body.equipmentConditionAfter || 'fully_operational',
      },
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ success: false, message: 'أمر الصيانة غير موجود' });

    // Restore equipment status
    const newStatus =
      req.body.equipmentConditionAfter === 'out_of_service' ? 'out_of_service' : 'active';
    await MedicalEquipment.findOneAndUpdate(scopedEquipById(req, record.equipment), {
      status: newStatus,
      'maintenance.lastMaintenanceDate': new Date(),
    });

    logger.info(`[MedEquip] Maintenance completed: ${record.workOrderNumber}`);
    res.json({ success: true, data: record, message: 'تم إكمال الصيانة بنجاح' });
  } catch (error) {
    safeError(res, error, '[MedEquip] Complete maintenance error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CERTIFICATES — شهادات السلامة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/certificates', async (req, res) => {
  try {
    const { equipment, status, type, page = 1, limit = 20 } = req.query;
    let filter = { isDeleted: { $ne: true } };
    if (equipment) filter.equipment = equipment;
    if (status) filter.status = status;
    if (type) filter.type = type;
    filter = await applyChildEquipmentScope(req, filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [certs, total] = await Promise.all([
      SafetyCertificate.find(filter)
        .populate('equipment', 'assetTag name')
        .sort({ expiryDate: 1 })
        .limit(parseInt(limit))
        .skip(skip),
      SafetyCertificate.countDocuments(filter),
    ]);
    res.json({ success: true, data: certs, total });
  } catch (error) {
    safeError(res, error, '[MedEquip] List certificates error');
  }
});

router.post('/certificates', async (req, res) => {
  try {
    if (req.body.equipment && !(await gateEquipmentId(req, res, req.body.equipment))) return;
    const cert = new SafetyCertificate({ ...stripUpdateMeta(req.body), createdBy: req.user?.id });
    await cert.save();
    logger.info(`[MedEquip] Certificate added: ${cert.certificateNumber}`);
    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    safeError(res, error, '[MedEquip] Create certificate error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS — التنبيهات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const equipIds = await equipmentIdsInScope(req);
    const certBase = { isDeleted: { $ne: true } };
    if (equipIds) certBase.equipment = { $in: equipIds };

    const [
      calibrationDue,
      calibrationOverdue,
      maintenanceDue,
      warrantyExpiring,
      certExpiring,
      certExpired,
      outOfService,
    ] = await Promise.all([
      MedicalEquipment.find({
        ...mergeEquipFilter(req, {}),
        'calibration.requiresCalibration': true,
        'calibration.nextCalibrationDate': { $lte: thirtyDays, $gte: now },
        status: { $ne: 'retired' },
      })
        .select('assetTag name calibration.nextCalibrationDate')
        .sort({ 'calibration.nextCalibrationDate': 1 }),
      MedicalEquipment.find({
        ...mergeEquipFilter(req, {}),
        'calibration.requiresCalibration': true,
        'calibration.nextCalibrationDate': { $lt: now },
        status: { $ne: 'retired' },
      })
        .select('assetTag name calibration.nextCalibrationDate')
        .sort({ 'calibration.nextCalibrationDate': 1 }),
      MedicalEquipment.find({
        ...mergeEquipFilter(req, {}),
        'maintenance.nextMaintenanceDate': { $lte: thirtyDays },
        status: { $nin: ['retired', 'disposed'] },
      })
        .select('assetTag name maintenance.nextMaintenanceDate')
        .sort({ 'maintenance.nextMaintenanceDate': 1 }),
      MedicalEquipment.find({
        ...mergeEquipFilter(req, {}),
        'purchaseInfo.warrantyEnd': { $lte: thirtyDays, $gte: now },
      })
        .select('assetTag name purchaseInfo.warrantyEnd')
        .sort({ 'purchaseInfo.warrantyEnd': 1 }),
      SafetyCertificate.find({
        ...certBase,
        expiryDate: { $lte: thirtyDays, $gte: now },
      })
        .populate('equipment', 'assetTag name')
        .sort({ expiryDate: 1 }),
      SafetyCertificate.find({
        ...certBase,
        expiryDate: { $lt: now },
        status: { $ne: 'revoked' },
      })
        .populate('equipment', 'assetTag name')
        .sort({ expiryDate: 1 }),
      MedicalEquipment.countDocuments({ status: 'out_of_service', isDeleted: { $ne: true } }),
    ]);

    res.json({
      success: true,
      data: {
        calibrationDue: calibrationDue.length,
        calibrationOverdue: calibrationOverdue.length,
        maintenanceDue: maintenanceDue.length,
        warrantyExpiring: warrantyExpiring.length,
        certExpiring: certExpiring.length,
        certExpired: certExpired.length,
        outOfService,
        details: {
          calibrationDue,
          calibrationOverdue,
          maintenanceDue,
          warrantyExpiring,
          certExpiring,
          certExpired,
        },
      },
    });
  } catch (error) {
    safeError(res, error, '[MedEquip] Alerts error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة التحكم
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalEquipment,
      activeEquipment,
      inMaintenance,
      outOfService,
      openWorkOrders,
      criticalWorkOrders,
      categoryBreakdown,
    ] = await Promise.all([
      MedicalEquipment.countDocuments(mergeEquipFilter(req, {})),
      MedicalEquipment.countDocuments(mergeEquipFilter(req, { status: 'active' })),
      MedicalEquipment.countDocuments(mergeEquipFilter(req, { status: 'in_maintenance' })),
      MedicalEquipment.countDocuments(mergeEquipFilter(req, { status: 'out_of_service' })),
      EquipmentMaintenance.countDocuments(
        await applyChildEquipmentScope(req, {
          status: { $in: ['requested', 'scheduled', 'in_progress'] },
          isDeleted: { $ne: true },
        })
      ),
      EquipmentMaintenance.countDocuments(
        await applyChildEquipmentScope(req, {
          status: { $in: ['requested', 'scheduled', 'in_progress'] },
          priority: 'critical',
          isDeleted: { $ne: true },
        })
      ),
      MedicalEquipment.aggregate([
        { $match: mergeEquipFilter(req, {}) },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Total asset value
    const valueAgg = await MedicalEquipment.aggregate([
      { $match: mergeEquipFilter(req, {}) },
      {
        $group: {
          _id: null,
          totalPurchaseValue: { $sum: '$purchaseInfo.purchasePrice' },
          totalCurrentValue: { $sum: '$depreciationInfo.currentBookValue' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        equipment: { total: totalEquipment, active: activeEquipment, inMaintenance, outOfService },
        workOrders: { open: openWorkOrders, critical: criticalWorkOrders },
        categoryBreakdown,
        assetValue: valueAgg[0] || { totalPurchaseValue: 0, totalCurrentValue: 0 },
      },
    });
  } catch (error) {
    safeError(res, error, '[MedEquip] Dashboard error');
  }
});

module.exports = router;
