/**
 * Pharmacy & Medication Management Routes — مسارات الصيدلية وإدارة الأدوية
 *
 * Endpoints:
 *   /api/pharmacy/medications       — Medication catalog CRUD
 *   /api/pharmacy/prescriptions     — Prescription management
 *   /api/pharmacy/dispensing        — Medication dispensing
 *   /api/pharmacy/inventory         — Batch & stock management
 *   /api/pharmacy/interactions      — Drug interaction checks
 *   /api/pharmacy/dashboard         — Pharmacy dashboard & alerts
 */

const express = require('express');
const router = express.Router();
const {
  Medication,
  Prescription,
  Dispensing,
  PharmacyInventory,
  DrugInteraction,
} = require('../models/pharmacy.model');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

// All pharmacy routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);
// ── Field whitelists ────────────────────────────────────────────────────────
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));

const MEDICATION_FIELDS = [
  'name',
  'genericName',
  'code',
  'category',
  'dosageForm',
  'strength',
  'manufacturer',
  'supplier',
  'price',
  'controlledSubstance',
  'sideEffects',
  'contraindications',
  'storageConditions',
  'description',
  'activeIngredients',
  'requiresPrescription',
  'isActive',
];
const PRESCRIPTION_FIELDS = [
  'patient',
  'beneficiary',
  'doctor',
  'medications',
  'diagnosis',
  'notes',
  'startDate',
  'endDate',
  'refills',
  'status',
];
const DISPENSING_FIELDS = [
  'prescription',
  'patient',
  'beneficiary',
  'medications',
  'notes',
  'quantity',
  'instructions',
];
const INVENTORY_FIELDS = [
  'medication',
  'batchNumber',
  'quantity',
  'unitPrice',
  'expiryDate',
  'supplier',
  'storageLocation',
  'notes',
];
const INTERACTION_FIELDS = [
  'drug1',
  'drug2',
  'severity',
  'description',
  'mechanism',
  'recommendation',
  'evidence',
];

// ═══════════════════════════════════════════════════════════════════════════
// MEDICATIONS — كتالوج الأدوية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/medications', async (req, res) => {
  try {
    const { category, dosageForm, search, controlled, active, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (category) filter.category = category;
    if (dosageForm) filter.dosageForm = dosageForm;
    if (controlled === 'true') filter.controlledSubstance = true;
    if (active !== undefined) filter.isActive = active === 'true';
    if (search) {
      filter.$or = [
        { 'name.ar': { $regex: escapeRegex(search), $options: 'i' } },
        { 'name.en': { $regex: escapeRegex(search), $options: 'i' } },
        { genericName: { $regex: escapeRegex(search), $options: 'i' } },
        { code: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [medications, total] = await Promise.all([
      Medication.find(filter).sort({ 'name.ar': 1 }).limit(parseInt(limit)).skip(skip),
      Medication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: medications,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    safeError(res, error, '[Pharmacy] List medications error');
  }
});

router.get('/medications/:id', async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication) return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    res.json({ success: true, data: medication });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Get medication error');
  }
});

router.post('/medications', async (req, res) => {
  try {
    const medication = new Medication({
      ...pick(req.body, MEDICATION_FIELDS),
      createdBy: req.user?.id,
    });
    await medication.save();
    logger.info(`[Pharmacy] Medication created: ${medication.code}`);
    res.status(201).json({ success: true, data: medication });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Create medication error');
  }
});

router.put('/medications/:id', async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      { ...pick(req.body, MEDICATION_FIELDS), updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!medication) return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    res.json({ success: true, data: medication });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Update medication error');
  }
});

router.delete('/medications/:id', async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!medication) return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    res.json({ success: true, message: 'تم حذف الدواء بنجاح' });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Delete medication error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS — الوصفات الطبية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/prescriptions', async (req, res) => {
  try {
    const { beneficiary, prescriber, status, priority, type, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (prescriber) filter.prescriber = prescriber;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate('beneficiary', 'name')
        .populate('prescriber', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Prescription.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: prescriptions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    safeError(res, error, '[Pharmacy] List prescriptions error');
  }
});

router.get('/prescriptions/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('beneficiary')
      .populate('prescriber', 'name email')
      .populate('items.medication');
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Get prescription error');
  }
});

router.post('/prescriptions', async (req, res) => {
  try {
    const prescription = new Prescription({
      ...pick(req.body, PRESCRIPTION_FIELDS),
      createdBy: req.user?.id,
    });
    await prescription.save();
    logger.info(`[Pharmacy] Prescription created: ${prescription.prescriptionNumber}`);
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Create prescription error');
  }
});

router.put('/prescriptions/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Update prescription error');
  }
});

router.patch('/prescriptions/:id/verify', async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        status: 'verified',
        verifiedBy: req.user?.id,
        verifiedAt: new Date(),
        pharmacistNotes: req.body.notes,
      },
      { new: true }
    );
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    logger.info(`[Pharmacy] Prescription verified: ${prescription.prescriptionNumber}`);
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Verify prescription error');
  }
});

router.patch('/prescriptions/:id/cancel', async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', notes: req.body.reason },
      { new: true }
    );
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Cancel prescription error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DISPENSING — صرف الأدوية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dispensing', async (req, res) => {
  try {
    const { beneficiary, pharmacist, status, prescription, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (pharmacist) filter.pharmacist = pharmacist;
    if (status) filter.status = status;
    if (prescription) filter.prescription = prescription;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Dispensing.find(filter)
        .populate('prescription')
        .populate('beneficiary', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Dispensing.countDocuments(filter),
    ]);
    res.json({ success: true, data: records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    safeError(res, error, '[Pharmacy] List dispensing error');
  }
});

router.post('/dispensing', async (req, res) => {
  try {
    const dispensing = new Dispensing({
      ...pick(req.body, DISPENSING_FIELDS),
      pharmacist: req.user?.id,
      createdBy: req.user?.id,
    });
    await dispensing.save();

    // Update prescription status
    if (req.body.prescription) {
      await Prescription.findByIdAndUpdate(req.body.prescription, {
        status: 'dispensed',
        dispensedBy: req.user?.id,
        dispensedAt: new Date(),
      });
    }

    // Deduct from inventory — atomic guard prevents stock going negative
    for (const item of dispensing.items) {
      if (item.batch) {
        const updated = await PharmacyInventory.findOneAndUpdate(
          { _id: item.batch, quantity: { $gte: item.quantityDispensed } },
          { $inc: { quantity: -item.quantityDispensed } },
          { new: true }
        );
        if (!updated) {
          // Rollback dispensing record on insufficient stock
          await Dispensing.findByIdAndUpdate(dispensing._id, { status: 'failed' });
          return res.status(409).json({
            success: false,
            message: `الكمية غير كافية في الدفعة ${item.batch}`,
          });
        }
      }
    }

    logger.info(`[Pharmacy] Dispensing recorded: ${dispensing.dispensingNumber}`);
    res.status(201).json({ success: true, data: dispensing });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Create dispensing error');
  }
});

router.patch('/dispensing/:id/return', async (req, res) => {
  try {
    const dispensing = await Dispensing.findByIdAndUpdate(
      req.params.id,
      { status: 'returned' },
      { new: true }
    );
    if (!dispensing)
      return res.status(404).json({ success: false, message: 'سجل الصرف غير موجود' });

    // Restore inventory
    for (const item of dispensing.items) {
      if (item.batch) {
        await PharmacyInventory.findByIdAndUpdate(item.batch, {
          $inc: { quantity: item.quantityDispensed },
        });
      }
    }
    res.json({ success: true, data: dispensing, message: 'تم إرجاع الأدوية بنجاح' });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Return dispensing error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY — مخزون الصيدلية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/inventory', async (req, res) => {
  try {
    const { medication, status, expiringSoon, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (medication) filter.medication = medication;
    if (status) filter.status = status;
    if (expiringSoon === 'true') {
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      filter.expiryDate = { $lte: threeMonths, $gt: new Date() };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [batches, total] = await Promise.all([
      PharmacyInventory.find(filter)
        .populate('medication', 'name code category')
        .sort({ expiryDate: 1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      PharmacyInventory.countDocuments(filter),
    ]);
    res.json({ success: true, data: batches, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    safeError(res, error, '[Pharmacy] List inventory error');
  }
});

router.post('/inventory', async (req, res) => {
  try {
    const batch = new PharmacyInventory({
      ...pick(req.body, INVENTORY_FIELDS),
      createdBy: req.user?.id,
    });
    await batch.save();
    logger.info(`[Pharmacy] Inventory batch added: ${batch.batchNumber}`);
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Add inventory error');
  }
});

// ── Allowed fields for inventory update (prevent mass-assignment) ──
const INVENTORY_UPDATE_FIELDS = [
  'batchNumber',
  'quantity',
  'unitPrice',
  'expiryDate',
  'status',
  'supplier',
  'notes',
  'storageLocation',
  'minimumStock',
];

router.put('/inventory/:id', async (req, res) => {
  try {
    const updates = {};
    for (const key of INVENTORY_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const batch = await PharmacyInventory.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!batch) return res.status(404).json({ success: false, message: 'الدفعة غير موجودة' });
    res.json({ success: true, data: batch });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Update inventory error');
  }
});

router.get('/inventory/expiry-alerts', async (req, res) => {
  try {
    const now = new Date();
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [expired, expiringOneMonth, expiringThreeMonths, lowStock] = await Promise.all([
      PharmacyInventory.find({
        expiryDate: { $lte: now },
        status: { $ne: 'depleted' },
        isDeleted: { $ne: true },
      }).populate('medication', 'name code'),
      PharmacyInventory.find({
        expiryDate: { $gt: now, $lte: oneMonth },
        isDeleted: { $ne: true },
      }).populate('medication', 'name code'),
      PharmacyInventory.find({
        expiryDate: { $gt: oneMonth, $lte: threeMonths },
        isDeleted: { $ne: true },
      }).populate('medication', 'name code'),
      PharmacyInventory.find({
        quantity: { $lte: 10 },
        status: { $ne: 'depleted' },
        isDeleted: { $ne: true },
      }).populate('medication', 'name code reorderLevel'),
    ]);

    res.json({
      success: true,
      data: {
        expired: { count: expired.length, items: expired },
        expiringOneMonth: { count: expiringOneMonth.length, items: expiringOneMonth },
        expiringThreeMonths: { count: expiringThreeMonths.length, items: expiringThreeMonths },
        lowStock: { count: lowStock.length, items: lowStock },
      },
    });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Expiry alerts error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DRUG INTERACTIONS — التفاعلات الدوائية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/interactions', async (req, res) => {
  try {
    const { severity, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (severity) filter.severity = severity;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [interactions, total] = await Promise.all([
      DrugInteraction.find(filter)
        .populate('drugA', 'name code')
        .populate('drugB', 'name code')
        .sort({ severity: 1 })
        .limit(parseInt(limit))
        .skip(skip),
      DrugInteraction.countDocuments(filter),
    ]);
    res.json({ success: true, data: interactions, total });
  } catch (error) {
    safeError(res, error, '[Pharmacy] List interactions error');
  }
});

router.post('/interactions', async (req, res) => {
  try {
    const interaction = new DrugInteraction({
      ...pick(req.body, INTERACTION_FIELDS),
      createdBy: req.user?.id,
    });
    await interaction.save();
    res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Create interaction error');
  }
});

router.post('/interactions/check', async (req, res) => {
  try {
    const { medicationIds } = req.body;
    if (!medicationIds || medicationIds.length < 2) {
      return res.json({ success: true, data: { interactions: [], hasInteractions: false } });
    }
    const interactions = await DrugInteraction.find({
      $or: [
        { drugA: { $in: medicationIds }, drugB: { $in: medicationIds } },
        { drugB: { $in: medicationIds }, drugA: { $in: medicationIds } },
      ],
      isActive: true,
    })
      .populate('drugA', 'name code')
      .populate('drugB', 'name code');

    const hasMajor = interactions.some(
      i => i.severity === 'major' || i.severity === 'contraindicated'
    );
    res.json({
      success: true,
      data: {
        interactions,
        hasInteractions: interactions.length > 0,
        hasMajorInteraction: hasMajor,
        count: interactions.length,
      },
    });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Check interactions error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم الصيدلية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalMedications,
      activeMedications,
      pendingPrescriptions,
      todayDispensed,
      expiredBatches,
      expiringBatches,
      lowStockCount,
      totalPrescriptionsMonth,
    ] = await Promise.all([
      Medication.countDocuments({ isDeleted: { $ne: true } }),
      Medication.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
      Prescription.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
      Dispensing.countDocuments({ createdAt: { $gte: today }, isDeleted: { $ne: true } }),
      PharmacyInventory.countDocuments({
        expiryDate: { $lte: now },
        status: { $ne: 'depleted' },
        isDeleted: { $ne: true },
      }),
      PharmacyInventory.countDocuments({
        expiryDate: { $gt: now, $lte: oneMonth },
        isDeleted: { $ne: true },
      }),
      PharmacyInventory.countDocuments({
        quantity: { $lte: 10 },
        status: { $ne: 'depleted' },
        isDeleted: { $ne: true },
      }),
      Prescription.countDocuments({
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        isDeleted: { $ne: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalMedications,
        activeMedications,
        pendingPrescriptions,
        todayDispensed,
        expiredBatches,
        expiringBatches,
        lowStockCount,
        totalPrescriptionsMonth,
        alerts: {
          expired: expiredBatches > 0,
          expiringSoon: expiringBatches > 0,
          lowStock: lowStockCount > 0,
          pendingPrescriptions: pendingPrescriptions > 0,
        },
      },
    });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Dashboard error');
  }
});

module.exports = router;
