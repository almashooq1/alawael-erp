/**
 * EMR (Electronic Medical Record) Lite Routes — مسارات السجل الطبي الإلكتروني
 *
 * Endpoints:
 *   /api/emr/records         — Medical records CRUD
 *   /api/emr/vitals          — Vital signs
 *   /api/emr/lab-results     — Lab results
 *   /api/emr/clinical-notes  — Clinical notes (SOAP)
 *   /api/emr/allergies       — Allergies
 *   /api/emr/patient-summary — Patient summary view
 *   /api/emr/dashboard       — EMR dashboard
 */

const express = require('express');
const router = express.Router();
const {
  MedicalRecord,
  VitalSign,
  LabResult,
  ClinicalNote,
  Allergy,
} = require('../models/emr.model');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');
const { safeError } = require('../utils/safeError');

// ── Auth: all EMR routes require authentication (PHI data) ───────────────
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL RECORDS — السجلات الطبية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/records', async (req, res) => {
  try {
    const { beneficiary, search, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (search) {
      filter.$or = [{ mrn: { $regex: escapeRegex(search), $options: 'i' } }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      MedicalRecord.find(filter)
        .populate('beneficiary', 'name')
        .populate('primaryProvider', 'name')
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      MedicalRecord.countDocuments(filter),
    ]);
    res.json({ success: true, data: records, total });
  } catch (error) {
    logger.error('[EMR] List records error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب السجلات الطبية', error: safeError(error) });
  }
});

router.get('/records/:id', async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('beneficiary', 'name dateOfBirth gender')
      .populate('primaryProvider', 'name')
      .populate('careTeam.provider', 'name')
      .populate('primaryDiagnosis.diagnosedBy', 'name');
    if (!record) return res.status(404).json({ success: false, message: 'السجل الطبي غير موجود' });
    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('[EMR] Get record error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب السجل الطبي', error: safeError(error) });
  }
});

// Get or create medical record by beneficiary
router.get('/records/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    let record = await MedicalRecord.findOne({
      beneficiary: req.params.beneficiaryId,
      isDeleted: { $ne: true },
    })
      .populate('beneficiary', 'name dateOfBirth gender')
      .populate('primaryProvider', 'name');

    if (!record) {
      record = new MedicalRecord({
        beneficiary: req.params.beneficiaryId,
        createdBy: req.user?.id,
      });
      await record.save();
      record = await MedicalRecord.findById(record._id).populate(
        'beneficiary',
        'name dateOfBirth gender'
      );
      logger.info(`[EMR] Auto-created medical record: ${record.mrn}`);
    }
    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('[EMR] Get by beneficiary error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب السجل الطبي', error: safeError(error) });
  }
});

router.post('/records', async (req, res) => {
  try {
    const record = new MedicalRecord({ ...req.body, createdBy: req.user?.id });
    await record.save();
    logger.info(`[EMR] Medical record created: ${record.mrn}`);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('[EMR] Create record error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء السجل الطبي', error: safeError(error) });
  }
});

router.put('/records/:id', async (req, res) => {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!record) return res.status(404).json({ success: false, message: 'السجل الطبي غير موجود' });
    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('[EMR] Update record error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث السجل الطبي', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VITAL SIGNS — العلامات الحيوية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/vitals', async (req, res) => {
  try {
    const { beneficiary, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (dateFrom || dateTo) {
      filter.recordedAt = {};
      if (dateFrom) filter.recordedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.recordedAt.$lte = new Date(dateTo);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [vitals, total] = await Promise.all([
      VitalSign.find(filter)
        .populate('recordedBy', 'name')
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      VitalSign.countDocuments(filter),
    ]);
    res.json({ success: true, data: vitals, total });
  } catch (error) {
    logger.error('[EMR] List vitals error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب العلامات الحيوية', error: safeError(error) });
  }
});

router.get('/vitals/latest/:beneficiaryId', async (req, res) => {
  try {
    const latest = await VitalSign.findOne({
      beneficiary: req.params.beneficiaryId,
      isDeleted: { $ne: true },
    })
      .populate('recordedBy', 'name')
      .sort({ recordedAt: -1 });
    res.json({ success: true, data: latest });
  } catch (error) {
    logger.error('[EMR] Latest vitals error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب آخر العلامات الحيوية', error: safeError(error) });
  }
});

router.post('/vitals', async (req, res) => {
  try {
    const vital = new VitalSign({ ...req.body, recordedBy: req.body.recordedBy || req.user?.id });
    await vital.save();

    // Update medical record last visit
    if (req.body.medicalRecord) {
      await MedicalRecord.findByIdAndUpdate(req.body.medicalRecord, { lastVisitDate: new Date() });
    }

    res.status(201).json({ success: true, data: vital });
  } catch (error) {
    logger.error('[EMR] Create vital error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تسجيل العلامات الحيوية', error: safeError(error) });
  }
});

// Vitals trend chart data
router.get('/vitals/trend/:beneficiaryId', async (req, res) => {
  try {
    const { parameter = 'bloodPressure', days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const vitals = await VitalSign.find({
      beneficiary: req.params.beneficiaryId,
      recordedAt: { $gte: since },
      isDeleted: { $ne: true },
    })
      .select(`recordedAt ${parameter} weight.value height bmi`)
      .sort({ recordedAt: 1 });
    res.json({ success: true, data: vitals });
  } catch (error) {
    logger.error('[EMR] Vitals trend error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب اتجاه العلامات الحيوية', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LAB RESULTS — نتائج المختبر
// ═══════════════════════════════════════════════════════════════════════════

router.get('/lab-results', async (req, res) => {
  try {
    const { beneficiary, category, overallStatus, search, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (category) filter.category = category;
    if (overallStatus) filter.overallStatus = overallStatus;
    if (search) {
      filter.$or = [
        { labOrderNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { 'testName.ar': { $regex: escapeRegex(search), $options: 'i' } },
        { 'testName.en': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [results, total] = await Promise.all([
      LabResult.find(filter)
        .populate('beneficiary', 'name')
        .populate('orderedBy', 'name')
        .sort({ orderedDate: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      LabResult.countDocuments(filter),
    ]);
    res.json({ success: true, data: results, total });
  } catch (error) {
    logger.error('[EMR] List lab results error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب نتائج المختبر', error: safeError(error) });
  }
});

router.get('/lab-results/:id', async (req, res) => {
  try {
    const result = await LabResult.findById(req.params.id)
      .populate('beneficiary', 'name')
      .populate('orderedBy', 'name');
    if (!result)
      return res.status(404).json({ success: false, message: 'نتيجة المختبر غير موجودة' });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[EMR] Get lab result error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب النتيجة', error: safeError(error) });
  }
});

router.post('/lab-results', async (req, res) => {
  try {
    const result = new LabResult(req.body);
    await result.save();
    logger.info(`[EMR] Lab result created: ${result.labOrderNumber}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('[EMR] Create lab result error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء نتيجة المختبر', error: safeError(error) });
  }
});

router.put('/lab-results/:id', async (req, res) => {
  try {
    const result = await LabResult.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!result) return res.status(404).json({ success: false, message: 'النتيجة غير موجودة' });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[EMR] Update lab result error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في تحديث النتيجة', error: safeError(error) });
  }
});

// Critical lab results needing attention
router.get('/lab-results-critical', async (req, res) => {
  try {
    const results = await LabResult.find({
      'criticalValues.hasCritical': true,
      'criticalValues.acknowledgedBy': { $exists: false },
      isDeleted: { $ne: true },
    })
      .populate('beneficiary', 'name')
      .populate('orderedBy', 'name')
      .sort({ orderedDate: -1 });
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    logger.error('[EMR] Critical results error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب النتائج الحرجة', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL NOTES — الملاحظات السريرية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/clinical-notes', async (req, res) => {
  try {
    const { beneficiary, noteType, author, status, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (noteType) filter.noteType = noteType;
    if (author) filter.author = author;
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notes, total] = await Promise.all([
      ClinicalNote.find(filter)
        .populate('beneficiary', 'name')
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      ClinicalNote.countDocuments(filter),
    ]);
    res.json({ success: true, data: notes, total });
  } catch (error) {
    logger.error('[EMR] List clinical notes error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الملاحظات السريرية', error: safeError(error) });
  }
});

router.get('/clinical-notes/:id', async (req, res) => {
  try {
    const note = await ClinicalNote.findById(req.params.id)
      .populate('beneficiary', 'name')
      .populate('author', 'name')
      .populate('coSignedBy', 'name')
      .populate('objective.vitalSigns');
    if (!note)
      return res.status(404).json({ success: false, message: 'الملاحظة السريرية غير موجودة' });
    res.json({ success: true, data: note });
  } catch (error) {
    logger.error('[EMR] Get clinical note error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب الملاحظة', error: safeError(error) });
  }
});

router.post('/clinical-notes', async (req, res) => {
  try {
    const note = new ClinicalNote({ ...req.body, author: req.body.author || req.user?.id });
    await note.save();

    // Update medical record last visit
    if (req.body.medicalRecord) {
      await MedicalRecord.findByIdAndUpdate(req.body.medicalRecord, { lastVisitDate: new Date() });
    }

    logger.info(`[EMR] Clinical note created: ${note.noteType} for ${note.beneficiary}`);
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    logger.error('[EMR] Create clinical note error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء الملاحظة السريرية', error: safeError(error) });
  }
});

router.put('/clinical-notes/:id', async (req, res) => {
  try {
    const note = await ClinicalNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    if (note.status === 'final') {
      return res
        .status(400)
        .json({ success: false, message: 'لا يمكن تعديل ملاحظة نهائية، استخدم التعديل' });
    }
    Object.assign(note, req.body);
    await note.save();
    res.json({ success: true, data: note });
  } catch (error) {
    logger.error('[EMR] Update clinical note error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث الملاحظة', error: safeError(error) });
  }
});

router.patch('/clinical-notes/:id/finalize', async (req, res) => {
  try {
    const note = await ClinicalNote.findByIdAndUpdate(
      req.params.id,
      { status: 'final' },
      { new: true }
    );
    if (!note) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    logger.info(`[EMR] Clinical note finalized: ${note._id}`);
    res.json({ success: true, data: note, message: 'تم اعتماد الملاحظة' });
  } catch (error) {
    logger.error('[EMR] Finalize note error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في اعتماد الملاحظة', error: safeError(error) });
  }
});

router.patch('/clinical-notes/:id/amend', async (req, res) => {
  try {
    const note = await ClinicalNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    note.status = 'amended';
    note.amendments.push({
      date: new Date(),
      by: req.user?.id,
      reason: req.body.reason,
      changes: req.body.changes,
    });
    await note.save();
    res.json({ success: true, data: note });
  } catch (error) {
    logger.error('[EMR] Amend note error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تعديل الملاحظة', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ALLERGIES — الحساسية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/allergies', async (req, res) => {
  try {
    const { beneficiary, allergenType, clinicalStatus, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (allergenType) filter['allergen.type'] = allergenType;
    if (clinicalStatus) filter.clinicalStatus = clinicalStatus;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [allergies, total] = await Promise.all([
      Allergy.find(filter)
        .populate('beneficiary', 'name')
        .populate('recordedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Allergy.countDocuments(filter),
    ]);
    res.json({ success: true, data: allergies, total });
  } catch (error) {
    logger.error('[EMR] List allergies error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب الحساسية', error: safeError(error) });
  }
});

router.get('/allergies/patient/:beneficiaryId', async (req, res) => {
  try {
    const allergies = await Allergy.find({
      beneficiary: req.params.beneficiaryId,
      clinicalStatus: 'active',
      isDeleted: { $ne: true },
    }).sort({ 'reaction.severity': -1 });
    res.json({ success: true, data: allergies, count: allergies.length });
  } catch (error) {
    logger.error('[EMR] Patient allergies error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب حساسية المريض', error: safeError(error) });
  }
});

router.post('/allergies', async (req, res) => {
  try {
    const allergy = new Allergy({ ...req.body, recordedBy: req.body.recordedBy || req.user?.id });
    await allergy.save();
    logger.info(`[EMR] Allergy recorded: ${allergy.allergen.name.ar} for ${allergy.beneficiary}`);
    res.status(201).json({ success: true, data: allergy });
  } catch (error) {
    logger.error('[EMR] Create allergy error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تسجيل الحساسية', error: safeError(error) });
  }
});

router.put('/allergies/:id', async (req, res) => {
  try {
    const allergy = await Allergy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!allergy)
      return res.status(404).json({ success: false, message: 'سجل الحساسية غير موجود' });
    res.json({ success: true, data: allergy });
  } catch (error) {
    logger.error('[EMR] Update allergy error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث الحساسية', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT SUMMARY — ملخص المريض
// ═══════════════════════════════════════════════════════════════════════════

router.get('/patient-summary/:beneficiaryId', async (req, res) => {
  try {
    const beneficiaryId = req.params.beneficiaryId;

    const [medicalRecord, latestVitals, activeAllergies, recentLabResults, recentNotes] =
      await Promise.all([
        MedicalRecord.findOne({ beneficiary: beneficiaryId, isDeleted: { $ne: true } })
          .populate('beneficiary', 'name dateOfBirth gender')
          .populate('primaryProvider', 'name'),
        VitalSign.findOne({ beneficiary: beneficiaryId, isDeleted: { $ne: true } }).sort({
          recordedAt: -1,
        }),
        Allergy.find({
          beneficiary: beneficiaryId,
          clinicalStatus: 'active',
          isDeleted: { $ne: true },
        }),
        LabResult.find({ beneficiary: beneficiaryId, isDeleted: { $ne: true } })
          .sort({ orderedDate: -1 })
          .limit(5),
        ClinicalNote.find({ beneficiary: beneficiaryId, isDeleted: { $ne: true } })
          .populate('author', 'name')
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    res.json({
      success: true,
      data: {
        medicalRecord,
        latestVitals,
        activeAllergies,
        allergyCount: activeAllergies.length,
        recentLabResults,
        recentNotes,
      },
    });
  } catch (error) {
    logger.error('[EMR] Patient summary error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب ملخص المريض', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة التحكم
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalRecords,
      todayVitals,
      todayNotes,
      pendingLabResults,
      criticalLabResults,
      draftNotes,
      activeAllergies,
    ] = await Promise.all([
      MedicalRecord.countDocuments({ isDeleted: { $ne: true } }),
      VitalSign.countDocuments({
        recordedAt: { $gte: today, $lt: tomorrow },
        isDeleted: { $ne: true },
      }),
      ClinicalNote.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        isDeleted: { $ne: true },
      }),
      LabResult.countDocuments({
        overallStatus: { $in: ['ordered', 'collected', 'processing'] },
        isDeleted: { $ne: true },
      }),
      LabResult.countDocuments({
        'criticalValues.hasCritical': true,
        'criticalValues.acknowledgedBy': { $exists: false },
        isDeleted: { $ne: true },
      }),
      ClinicalNote.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
      Allergy.countDocuments({ clinicalStatus: 'active', isDeleted: { $ne: true } }),
    ]);

    res.json({
      success: true,
      data: {
        records: { total: totalRecords },
        today: { vitalsRecorded: todayVitals, notesWritten: todayNotes },
        lab: { pending: pendingLabResults, critical: criticalLabResults },
        notes: { drafts: draftNotes },
        allergies: { active: activeAllergies },
      },
    });
  } catch (error) {
    logger.error('[EMR] Dashboard error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في لوحة التحكم', error: safeError(error) });
  }
});

module.exports = router;
