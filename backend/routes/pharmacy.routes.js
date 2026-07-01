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
const { escapeRegex } = require('../utils/sanitize');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');

// All pharmacy routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);

// W1565 — controlled-substance / prescription actions were gated by authenticate ONLY,
// so any authenticated branch user (caregiver, therapist, …) could prescribe, verify,
// dispense, cancel, or toggle a drug's controlledSubstance flag. Mirror the role-list
// gating already in the sibling mar.routes.js / medication-reconciliation.routes.js.
const RX_WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'physician', 'doctor'];
const PHARMACY_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'pharmacist'];

async function beneficiaryScopeFilter(req) {
  const bf = branchFilter(req);
  if (!bf || Object.keys(bf).length === 0) return {};
  const ids = await Beneficiary.find(bf).select('_id').lean();
  return { beneficiary: { $in: ids.map(r => r._id) } };
}

async function scopedPrescriptionById(req, id) {
  const scope = await beneficiaryScopeFilter(req);
  return Prescription.findOne({ _id: id, isDeleted: { $ne: true }, ...scope });
}

async function scopedDispensingById(req, id) {
  const scope = await beneficiaryScopeFilter(req);
  return Dispensing.findOne({ _id: id, isDeleted: { $ne: true }, ...scope });
}
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
  'items',
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

router.post('/medications', requireRole(PHARMACY_ROLES), async (req, res) => {
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

router.put('/medications/:id', requireRole(PHARMACY_ROLES), async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      { ...pick(req.body, MEDICATION_FIELDS), updatedBy: req.user?.id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!medication) return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    res.json({ success: true, data: medication });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Update medication error');
  }
});

router.delete('/medications/:id', requireRole(PHARMACY_ROLES), async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { returnDocument: 'after' }
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
    const filter = { isDeleted: { $ne: true }, ...(await beneficiaryScopeFilter(req)) };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (prescriber) filter.prescriber = prescriber;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate('beneficiary', 'name firstName')
        .populate('prescriber', 'fullName username')
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
    const prescription = await scopedPrescriptionById(req, req.params.id);
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    await prescription.populate([
      { path: 'beneficiary' },
      { path: 'prescriber', select: 'name email' },
      { path: 'items.medication' },
    ]);
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Get prescription error');
  }
});

router.post('/prescriptions', requireRole(RX_WRITE_ROLES), async (req, res) => {
  try {
    const beneficiaryId = req.body.beneficiary || req.body.patient;
    if (beneficiaryId) await enforceBeneficiaryBranch(req, beneficiaryId);
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

router.put('/prescriptions/:id', requireRole(RX_WRITE_ROLES), async (req, res) => {
  try {
    const existing = await scopedPrescriptionById(req, req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    // Whitelist editable clinical fields only — stripUpdateMeta merely removes a
    // prototype-pollution blacklist, so it let any caller forge status/verifiedBy/
    // beneficiary (self-verify a prescription, re-point it to another beneficiary,
    // bypass the dedicated /verify + /cancel transitions). Lifecycle + identity
    // fields are intentionally NOT editable here.
    const PRESCRIPTION_UPDATABLE = [
      'medications',
      'diagnosis',
      'notes',
      'startDate',
      'endDate',
      'refills',
    ];
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      pick(req.body, PRESCRIPTION_UPDATABLE),
      { returnDocument: 'after', runValidators: true }
    );
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Update prescription error');
  }
});

router.patch('/prescriptions/:id/verify', requireRole(PHARMACY_ROLES), async (req, res) => {
  try {
    const existing = await scopedPrescriptionById(req, req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        status: 'verified',
        verifiedBy: req.user?.id,
        verifiedAt: new Date(),
        pharmacistNotes: req.body.notes,
      },
      { returnDocument: 'after' }
    );
    if (!prescription)
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    logger.info(`[Pharmacy] Prescription verified: ${prescription.prescriptionNumber}`);
    res.json({ success: true, data: prescription });
  } catch (error) {
    safeError(res, error, '[Pharmacy] Verify prescription error');
  }
});

router.patch('/prescriptions/:id/cancel', requireRole(RX_WRITE_ROLES), async (req, res) => {
  try {
    const existing = await scopedPrescriptionById(req, req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', notes: req.body.reason },
      { returnDocument: 'after' }
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
    const filter = { isDeleted: { $ne: true }, ...(await beneficiaryScopeFilter(req)) };
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

router.post('/dispensing', requireRole(PHARMACY_ROLES), async (req, res) => {
  try {
    const beneficiaryId = req.body.beneficiary || req.body.patient;
    if (beneficiaryId) await enforceBeneficiaryBranch(req, beneficiaryId);
    if (req.body.prescription) {
      const rx = await scopedPrescriptionById(req, req.body.prescription);
      if (!rx) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    }
    // W1564 — the schema field is `items` (was whitelisted as `medications`, a
    // non-schema key dropped by strict mode → dispensing.items was ALWAYS empty, so the
    // inventory deduction loop below never ran and dispensing records carried no line
    // items). Capture `items`, accept a legacy `medications` body, and set the required
    // `beneficiary` from the resolved id (covers the `patient` alias).
    const dispensingData = pick(req.body, DISPENSING_FIELDS);
    if (!dispensingData.items && Array.isArray(req.body.medications)) {
      dispensingData.items = req.body.medications;
    }
    const dispensing = new Dispensing({
      ...dispensingData,
      beneficiary: beneficiaryId || dispensingData.beneficiary,
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
          { returnDocument: 'after' }
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

router.patch('/dispensing/:id/return', requireRole(PHARMACY_ROLES), async (req, res) => {
  try {
    const existing = await scopedDispensingById(req, req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'سجل الصرف غير موجود' });
    const dispensing = await Dispensing.findByIdAndUpdate(
      req.params.id,
      { status: 'returned' },
      { returnDocument: 'after' }
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

router.post('/inventory', requireRole(PHARMACY_ROLES), async (req, res) => {
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

router.put('/inventory/:id', requireRole(PHARMACY_ROLES), async (req, res) => {
  try {
    const updates = {};
    for (const key of INVENTORY_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const batch = await PharmacyInventory.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
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

router.post('/interactions', requireRole(PHARMACY_ROLES), async (req, res) => {
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
