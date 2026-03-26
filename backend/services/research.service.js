/**
 * Research & Evidence-Based Practice Service — خدمة البحث العلمي وقياس الأثر
 *
 * Business logic for:
 *  - Research study management
 *  - Anonymized data collection
 *  - Outcome measures (internationally recognized)
 *  - Program effectiveness reports (evidence-based)
 *  - Benchmarking comparisons
 *  - Data export to research platforms
 */
const _mongoose = require('mongoose');
const _logger = require('../utils/logger');

const ResearchStudy = require('../models/ResearchStudy');
const OutcomeMeasure = require('../models/OutcomeMeasure');
const AnonymizedDataset = require('../models/AnonymizedDataset');
const ProgramEffectiveness = require('../models/ProgramEffectiveness');
const BenchmarkingReport = require('../models/BenchmarkingReport');
const ResearchDataExport = require('../models/ResearchDataExport');
const { escapeRegex } = require('../utils/sanitize');

// ═══════════════════════════════════════════════════════════════════════════
// §1  Research Studies — الدراسات البحثية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List studies with filtering, search, and pagination.
 */
const getStudies = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    studyType,
    principalInvestigator,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = { isActive: true };
  if (status) filter.status = status;
  if (studyType) filter.studyType = studyType;
  if (principalInvestigator) filter.principalInvestigator = principalInvestigator;
  if (search) {
    filter.$or = [
      { title: { $regex: escapeRegex(search), $options: 'i' } },
      { abstract: { $regex: escapeRegex(search), $options: 'i' } },
      { keywords: { $regex: escapeRegex(search), $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    ResearchStudy.find(filter)
      .populate('principalInvestigator', 'fullName email role')
      .populate('outcomeMeasures', 'name abbreviation category')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ResearchStudy.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getStudyById = async id => {
  return ResearchStudy.findById(id)
    .populate('principalInvestigator', 'fullName email role')
    .populate('coInvestigators.userId', 'fullName email role')
    .populate('outcomeMeasures')
    .populate('createdBy', 'fullName email')
    .lean();
};

const createStudy = async (data, userId) => {
  return ResearchStudy.create({ ...data, createdBy: userId });
};

const updateStudy = async (id, data) => {
  return ResearchStudy.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('principalInvestigator', 'fullName email role')
    .lean();
};

const deleteStudy = async id => {
  return ResearchStudy.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
};

// ═══════════════════════════════════════════════════════════════════════════
// §2  Outcome Measures — مقاييس النتائج الدولية
// ═══════════════════════════════════════════════════════════════════════════

const getOutcomeMeasures = async (query = {}) => {
  const {
    page = 1,
    limit = 50,
    category,
    domain,
    internationallyRecognized,
    search,
    sortBy = 'name',
    sortOrder = 'asc',
  } = query;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (domain) filter.domain = domain;
  if (internationallyRecognized !== undefined) {
    filter.internationallyRecognized = internationallyRecognized === 'true';
  }
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { abbreviation: { $regex: escapeRegex(search), $options: 'i' } },
      { description: { $regex: escapeRegex(search), $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    OutcomeMeasure.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
    OutcomeMeasure.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getOutcomeMeasureById = async id => {
  return OutcomeMeasure.findById(id).lean();
};

const createOutcomeMeasure = async (data, userId) => {
  return OutcomeMeasure.create({ ...data, createdBy: userId });
};

const updateOutcomeMeasure = async (id, data) => {
  return OutcomeMeasure.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
};

const deleteOutcomeMeasure = async id => {
  return OutcomeMeasure.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
};

/**
 * Seed standard internationally-recognized outcome measures.
 */
const seedStandardMeasures = async userId => {
  const standardMeasures = [
    {
      name: 'Functional Independence Measure',
      nameAr: 'مقياس الاستقلالية الوظيفية',
      abbreviation: 'FIM',
      description:
        'Assesses functional independence in self-care, sphincter control, transfers, locomotion, communication, and social cognition',
      category: 'functional-independence',
      domain: 'activities-participation',
      standardBody: 'other',
      internationallyRecognized: true,
      scoringType: 'numeric',
      scoreRange: { min: 18, max: 126 },
      higherScoreMeaning: 'better',
      minimumClinicallyImportantDifference: 22,
      administrationMethod: 'clinician-rated',
      administrationTimeMinutes: 30,
      predefined: true,
      version: '7.0',
    },
    {
      name: 'WHO Disability Assessment Schedule',
      nameAr: 'جدول تقييم الإعاقة لمنظمة الصحة العالمية',
      abbreviation: 'WHODAS-2.0',
      description:
        'WHO-developed measure of functioning and disability across 6 domains: cognition, mobility, self-care, getting along, life activities, participation',
      category: 'participation',
      domain: 'multi-domain',
      standardBody: 'WHO',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2015 },
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 100 },
      higherScoreMeaning: 'worse',
      minimumClinicallyImportantDifference: 8,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 20,
      predefined: true,
      version: '2.0',
    },
    {
      name: 'Barthel Index',
      nameAr: 'مؤشر بارثل',
      abbreviation: 'BI',
      description:
        'Measures performance in 10 activities of daily living: feeding, bathing, grooming, dressing, bowels, bladder, toilet use, transfers, mobility, stairs',
      category: 'self-care',
      domain: 'activities-participation',
      standardBody: 'other',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2012 },
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 100 },
      higherScoreMeaning: 'better',
      minimumClinicallyImportantDifference: 10,
      administrationMethod: 'clinician-rated',
      administrationTimeMinutes: 10,
      predefined: true,
    },
    {
      name: 'Canadian Occupational Performance Measure',
      nameAr: 'المقياس الكندي للأداء الوظيفي',
      abbreviation: 'COPM',
      description:
        'Client-centered measure for detecting change in self-perception of occupational performance over time',
      category: 'participation',
      domain: 'activities-participation',
      standardBody: 'AOTA',
      internationallyRecognized: true,
      scoringType: 'numeric',
      scoreRange: { min: 1, max: 10 },
      higherScoreMeaning: 'better',
      minimumClinicallyImportantDifference: 2,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 40,
      predefined: true,
      version: '5',
    },
    {
      name: 'Goal Attainment Scaling',
      nameAr: 'مقياس تحقيق الأهداف',
      abbreviation: 'GAS',
      description:
        'Evaluates individual achievement on personally meaningful goals using a 5-point scale (-2 to +2)',
      category: 'general',
      domain: 'multi-domain',
      standardBody: 'other',
      internationallyRecognized: true,
      scoringType: 'ordinal',
      scoreRange: { min: -2, max: 2 },
      higherScoreMeaning: 'better',
      administrationMethod: 'clinician-rated',
      administrationTimeMinutes: 20,
      predefined: true,
    },
    {
      name: 'Patient Health Questionnaire-9',
      nameAr: 'استبيان صحة المريض-9',
      abbreviation: 'PHQ-9',
      description: 'Screens, diagnoses, monitors and measures severity of depression',
      category: 'mental-health',
      domain: 'body-functions',
      standardBody: 'other',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2010 },
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 27 },
      higherScoreMeaning: 'worse',
      minimumClinicallyImportantDifference: 5,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 5,
      predefined: true,
    },
    {
      name: 'Generalized Anxiety Disorder-7',
      nameAr: 'مقياس اضطراب القلق المعمم-7',
      abbreviation: 'GAD-7',
      description: 'Screens and measures severity of generalized anxiety disorder',
      category: 'mental-health',
      domain: 'body-functions',
      standardBody: 'other',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2011 },
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 21 },
      higherScoreMeaning: 'worse',
      minimumClinicallyImportantDifference: 4,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 5,
      predefined: true,
    },
    {
      name: 'Pediatric Evaluation of Disability Inventory',
      nameAr: 'التقييم التأهيلي للأطفال ذوي الإعاقة',
      abbreviation: 'PEDI-CAT',
      description:
        'Measures functional capabilities and performance in children (ages 0-20) across daily activities, mobility, social/cognitive, and responsibility domains',
      category: 'pediatric',
      domain: 'activities-participation',
      standardBody: 'other',
      internationallyRecognized: true,
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 100 },
      higherScoreMeaning: 'better',
      administrationMethod: 'clinician-rated',
      administrationTimeMinutes: 15,
      predefined: true,
      version: 'CAT',
    },
    {
      name: 'EuroQoL Five-Dimension',
      nameAr: 'مقياس جودة الحياة الأوروبي',
      abbreviation: 'EQ-5D-5L',
      description:
        'Generic measure of health-related quality of life across 5 dimensions: mobility, self-care, usual activities, pain/discomfort, anxiety/depression',
      category: 'quality-of-life',
      domain: 'multi-domain',
      standardBody: 'other',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2016 },
      scoringType: 'composite',
      scoreRange: { min: -0.59, max: 1 },
      higherScoreMeaning: 'better',
      minimumClinicallyImportantDifference: 0.08,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 5,
      predefined: true,
      version: '5L',
    },
    {
      name: 'Zarit Burden Interview',
      nameAr: 'مقابلة عبء مقدم الرعاية (زاريت)',
      abbreviation: 'ZBI',
      description:
        'Measures the perceived burden of caregivers across health, psychological well-being, finances, social life, and relationship domains',
      category: 'caregiver-burden',
      domain: 'personal-factors',
      standardBody: 'other',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2014 },
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 88 },
      higherScoreMeaning: 'worse',
      minimumClinicallyImportantDifference: 7,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 15,
      predefined: true,
    },
    {
      name: 'Visual Analogue Scale for Pain',
      nameAr: 'المقياس البصري التماثلي للألم',
      abbreviation: 'VAS',
      description:
        'Unidimensional pain intensity measure using a 100mm line from "no pain" to "worst pain imaginable"',
      category: 'pain',
      domain: 'body-functions',
      standardBody: 'other',
      internationallyRecognized: true,
      arabicValidation: { validated: true, validationYear: 2008 },
      scoringType: 'numeric',
      scoreRange: { min: 0, max: 100 },
      higherScoreMeaning: 'worse',
      minimumClinicallyImportantDifference: 13,
      administrationMethod: 'self-report',
      administrationTimeMinutes: 1,
      predefined: true,
    },
    {
      name: 'Gross Motor Function Measure',
      nameAr: 'مقياس الوظيفة الحركية الكبرى',
      abbreviation: 'GMFM-88',
      description:
        'Evaluates gross motor function in children with cerebral palsy across 5 dimensions: lying/rolling, sitting, crawling/kneeling, standing, walking/running/jumping',
      category: 'motor-function',
      domain: 'activities-participation',
      standardBody: 'other',
      internationallyRecognized: true,
      scoringType: 'percentage',
      scoreRange: { min: 0, max: 100 },
      higherScoreMeaning: 'better',
      minimumClinicallyImportantDifference: 5,
      administrationMethod: 'clinician-rated',
      administrationTimeMinutes: 60,
      predefined: true,
      version: '88-item',
    },
  ];

  let created = 0;
  let skipped = 0;
  for (const m of standardMeasures) {
    const exists = await OutcomeMeasure.findOne({ abbreviation: m.abbreviation });
    if (!exists) {
      await OutcomeMeasure.create({ ...m, createdBy: userId });
      created++;
    } else {
      skipped++;
    }
  }
  return { created, skipped, total: standardMeasures.length };
};

// ═══════════════════════════════════════════════════════════════════════════
// §3  Anonymized Datasets — مجموعات البيانات مجهولة الهوية
// ═══════════════════════════════════════════════════════════════════════════

const getDatasets = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    studyId,
    status,
    sourceModule,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;
  const filter = { isActive: true };
  if (studyId) filter.studyId = studyId;
  if (status) filter.status = status;
  if (sourceModule) filter.sourceModule = sourceModule;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    AnonymizedDataset.find(filter)
      .populate('studyId', 'title status')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AnonymizedDataset.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getDatasetById = async id => {
  return AnonymizedDataset.findById(id)
    .populate('studyId', 'title status principalInvestigator')
    .populate('anonymization.anonymizedBy', 'fullName')
    .lean();
};

const createDataset = async (data, userId) => {
  return AnonymizedDataset.create({ ...data, createdBy: userId });
};

const updateDataset = async (id, data) => {
  return AnonymizedDataset.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
};

const deleteDataset = async id => {
  return AnonymizedDataset.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
};

/**
 * Log access to a dataset for audit compliance.
 */
const logDatasetAccess = async (datasetId, userId, action, ipAddress, purpose) => {
  return AnonymizedDataset.findByIdAndUpdate(
    datasetId,
    {
      $push: {
        accessLog: { userId, action, ipAddress, purpose, timestamp: new Date() },
      },
    },
    { new: true }
  ).lean();
};

// ═══════════════════════════════════════════════════════════════════════════
// §4  Program Effectiveness Reports — تقارير فعالية البرامج
// ═══════════════════════════════════════════════════════════════════════════

const getEffectivenessReports = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    programType,
    status,
    studyId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;
  const filter = { isActive: true };
  if (programType) filter.programType = programType;
  if (status) filter.status = status;
  if (studyId) filter.studyId = studyId;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    ProgramEffectiveness.find(filter)
      .populate('studyId', 'title')
      .populate('outcomeResults.measureId', 'name abbreviation')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ProgramEffectiveness.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getEffectivenessReportById = async id => {
  return ProgramEffectiveness.findById(id)
    .populate('studyId', 'title status')
    .populate('outcomeResults.measureId')
    .populate('reviewedBy', 'fullName')
    .populate('approvedBy', 'fullName')
    .lean();
};

const createEffectivenessReport = async (data, userId) => {
  return ProgramEffectiveness.create({ ...data, createdBy: userId });
};

const updateEffectivenessReport = async (id, data) => {
  return ProgramEffectiveness.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
};

const deleteEffectivenessReport = async id => {
  return ProgramEffectiveness.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
};

// ═══════════════════════════════════════════════════════════════════════════
// §5  Benchmarking Reports — تقارير المقارنة المعيارية
// ═══════════════════════════════════════════════════════════════════════════

const getBenchmarkingReports = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    reportType,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;
  const filter = { isActive: true };
  if (reportType) filter.reportType = reportType;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    BenchmarkingReport.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
    BenchmarkingReport.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getBenchmarkingReportById = async id => {
  return BenchmarkingReport.findById(id).lean();
};

const createBenchmarkingReport = async (data, userId) => {
  return BenchmarkingReport.create({ ...data, createdBy: userId });
};

const updateBenchmarkingReport = async (id, data) => {
  return BenchmarkingReport.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
};

const deleteBenchmarkingReport = async id => {
  return BenchmarkingReport.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
};

// ═══════════════════════════════════════════════════════════════════════════
// §6  Research Data Exports — تصدير بيانات لمنصات البحث
// ═══════════════════════════════════════════════════════════════════════════

const getExports = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    studyId,
    status,
    targetPlatform,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;
  const filter = { isActive: true };
  if (studyId) filter.studyId = studyId;
  if (status) filter.status = status;
  if (targetPlatform) filter.targetPlatform = targetPlatform;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    ResearchDataExport.find(filter)
      .populate('studyId', 'title')
      .populate('datasetId', 'datasetName')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ResearchDataExport.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getExportById = async id => {
  return ResearchDataExport.findById(id)
    .populate('studyId', 'title status')
    .populate('datasetId', 'datasetName status recordCount')
    .populate('compliance.dataUseAgreement.signedBy', 'fullName')
    .populate('compliance.exportApprovedBy', 'fullName')
    .lean();
};

const createExport = async (data, userId) => {
  return ResearchDataExport.create({
    ...data,
    createdBy: userId,
    auditTrail: [{ action: 'created', performedBy: userId, details: 'Export request created' }],
  });
};

const updateExport = async (id, data, userId) => {
  if (userId) {
    data.$push = {
      auditTrail: { action: 'configured', performedBy: userId, details: 'Export updated' },
    };
  }
  return ResearchDataExport.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
};

const approveExport = async (id, userId) => {
  return ResearchDataExport.findByIdAndUpdate(
    id,
    {
      status: 'approved',
      'compliance.exportApprovedBy': userId,
      'compliance.exportApprovalDate': new Date(),
      $push: {
        auditTrail: { action: 'approved', performedBy: userId, details: 'Export approved' },
      },
    },
    { new: true }
  ).lean();
};

const revokeExport = async (id, userId, reason) => {
  return ResearchDataExport.findByIdAndUpdate(
    id,
    {
      status: 'revoked',
      $push: {
        auditTrail: { action: 'revoked', performedBy: userId, details: reason || 'Export revoked' },
      },
    },
    { new: true }
  ).lean();
};

const deleteExport = async id => {
  return ResearchDataExport.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
};

// ═══════════════════════════════════════════════════════════════════════════
// §7  Dashboard & Statistics — لوحة المعلومات والإحصائيات
// ═══════════════════════════════════════════════════════════════════════════

const getDashboardStats = async organizationId => {
  const orgFilter = organizationId ? { organizationId } : {};

  const [
    studiesByStatus,
    studiesByType,
    measuresCount,
    datasetsCount,
    effectivenessCount,
    benchmarkCount,
    exportsCount,
    recentStudies,
  ] = await Promise.all([
    ResearchStudy.aggregate([
      { $match: { isActive: true, ...orgFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ResearchStudy.aggregate([
      { $match: { isActive: true, ...orgFilter } },
      { $group: { _id: '$studyType', count: { $sum: 1 } } },
    ]),
    OutcomeMeasure.countDocuments({ isActive: true }),
    AnonymizedDataset.countDocuments({ isActive: true, ...orgFilter }),
    ProgramEffectiveness.countDocuments({ isActive: true, ...orgFilter }),
    BenchmarkingReport.countDocuments({ isActive: true, ...orgFilter }),
    ResearchDataExport.countDocuments({ isActive: true, ...orgFilter }),
    ResearchStudy.find({ isActive: true, ...orgFilter })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status studyType createdAt')
      .lean(),
  ]);

  return {
    studies: {
      byStatus: studiesByStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byType: studiesByType.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      total: studiesByStatus.reduce((sum, s) => sum + s.count, 0),
    },
    outcomeMeasures: measuresCount,
    anonymizedDatasets: datasetsCount,
    effectivenessReports: effectivenessCount,
    benchmarkingReports: benchmarkCount,
    dataExports: exportsCount,
    recentStudies,
  };
};

module.exports = {
  // Studies
  getStudies,
  getStudyById,
  createStudy,
  updateStudy,
  deleteStudy,

  // Outcome Measures
  getOutcomeMeasures,
  getOutcomeMeasureById,
  createOutcomeMeasure,
  updateOutcomeMeasure,
  deleteOutcomeMeasure,
  seedStandardMeasures,

  // Anonymized Datasets
  getDatasets,
  getDatasetById,
  createDataset,
  updateDataset,
  deleteDataset,
  logDatasetAccess,

  // Effectiveness Reports
  getEffectivenessReports,
  getEffectivenessReportById,
  createEffectivenessReport,
  updateEffectivenessReport,
  deleteEffectivenessReport,

  // Benchmarking Reports
  getBenchmarkingReports,
  getBenchmarkingReportById,
  createBenchmarkingReport,
  updateBenchmarkingReport,
  deleteBenchmarkingReport,

  // Data Exports
  getExports,
  getExportById,
  createExport,
  updateExport,
  approveExport,
  revokeExport,
  deleteExport,

  // Dashboard
  getDashboardStats,
};
