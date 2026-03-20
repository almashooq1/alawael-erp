/**
 * Community Integration Service — خدمة الدمج المجتمعي
 *
 * Business logic for community activities, civil partnerships,
 * event participation, integration assessments, and awareness programs.
 */

const CommunityActivity = require('../models/CommunityActivity');
const CivilPartnership = require('../models/CivilPartnership');
const EventParticipation = require('../models/EventParticipation');
const IntegrationAssessment = require('../models/IntegrationAssessment');
const AwarenessProgram = require('../models/AwarenessProgram');
const _logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY ACTIVITIES — الأنشطة المجتمعية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new community activity
 */
async function createActivity(data, userId) {
  const activity = new CommunityActivity({ ...data, createdBy: userId });
  await activity.save();
  return activity;
}

/**
 * Get all activities with filtering, pagination, search
 */
async function getActivities(query = {}) {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    disabilityType,
    city,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDateFrom,
    startDateTo,
  } = query;

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (disabilityType) filter.targetDisabilityTypes = disabilityType;
  if (city) filter['location.city'] = city;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { titleAr: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (startDateFrom || startDateTo) {
    filter.startDate = {};
    if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
    if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [activities, total] = await Promise.all([
    CommunityActivity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('coordinator', 'name email')
      .populate('partnerOrganization', 'organizationName')
      .lean(),
    CommunityActivity.countDocuments(filter),
  ]);

  return {
    activities,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

/**
 * Get a single activity by ID
 */
async function getActivityById(id) {
  return CommunityActivity.findById(id)
    .populate('coordinator', 'name email')
    .populate('supervisors', 'name email')
    .populate('partnerOrganization', 'organizationName organizationType')
    .lean();
}

/**
 * Update an activity
 */
async function updateActivity(id, data, userId) {
  return CommunityActivity.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
}

/**
 * Delete an activity
 */
async function deleteActivity(id) {
  return CommunityActivity.findByIdAndDelete(id);
}

/**
 * Get activity statistics
 */
async function getActivityStats() {
  const [categoryStats, statusStats, totalCount] = await Promise.all([
    CommunityActivity.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$satisfactionRating' },
        },
      },
    ]),
    CommunityActivity.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    CommunityActivity.countDocuments(),
  ]);

  return { totalActivities: totalCount, byCategory: categoryStats, byStatus: statusStats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIVIL PARTNERSHIPS — الشراكات مع المجتمع المدني
// ═══════════════════════════════════════════════════════════════════════════════

async function createPartnership(data, userId) {
  const partnership = new CivilPartnership({ ...data, createdBy: userId });
  await partnership.save();
  return partnership;
}

async function getPartnerships(query = {}) {
  const {
    page = 1,
    limit = 20,
    organizationType,
    partnershipType,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};
  if (organizationType) filter.organizationType = organizationType;
  if (partnershipType) filter.partnershipType = partnershipType;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { organizationName: { $regex: search, $options: 'i' } },
      { organizationNameAr: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [partnerships, total] = await Promise.all([
    CivilPartnership.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    CivilPartnership.countDocuments(filter),
  ]);

  return {
    partnerships,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getPartnershipById(id) {
  return CivilPartnership.findById(id)
    .populate('linkedActivities', 'title category status')
    .populate('linkedAwarenessPrograms', 'title programType status')
    .lean();
}

async function updatePartnership(id, data, userId) {
  return CivilPartnership.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
}

async function deletePartnership(id) {
  return CivilPartnership.findByIdAndDelete(id);
}

async function getPartnershipStats() {
  const [typeStats, statusStats, total] = await Promise.all([
    CivilPartnership.aggregate([{ $group: { _id: '$organizationType', count: { $sum: 1 } } }]),
    CivilPartnership.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    CivilPartnership.countDocuments(),
  ]);
  return { totalPartnerships: total, byType: typeStats, byStatus: statusStats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PARTICIPATION — تتبع المشاركة
// ═══════════════════════════════════════════════════════════════════════════════

async function registerParticipation(data, userId) {
  const participation = new EventParticipation({ ...data, createdBy: userId });
  await participation.save();

  // Increment activity participant count
  await CommunityActivity.findByIdAndUpdate(data.activity, { $inc: { currentParticipants: 1 } });

  return participation;
}

async function getParticipations(query = {}) {
  const {
    page = 1,
    limit = 20,
    beneficiary,
    activity,
    participationStatus,
    registrationStatus,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};
  if (beneficiary) filter.beneficiary = beneficiary;
  if (activity) filter.activity = activity;
  if (participationStatus) filter.participationStatus = participationStatus;
  if (registrationStatus) filter.registrationStatus = registrationStatus;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [participations, total] = await Promise.all([
    EventParticipation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('beneficiary', 'name fileNumber')
      .populate('activity', 'title category startDate')
      .lean(),
    EventParticipation.countDocuments(filter),
  ]);

  return {
    participations,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getParticipationById(id) {
  return EventParticipation.findById(id)
    .populate('beneficiary', 'name fileNumber')
    .populate('activity', 'title category startDate location')
    .populate('registeredBy', 'name email')
    .populate('supportPersonnel', 'name email')
    .lean();
}

async function updateParticipation(id, data, userId) {
  return EventParticipation.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
}

async function recordAttendance(participationId, attendanceData) {
  const participation = await EventParticipation.findById(participationId);
  if (!participation) return null;

  participation.attendanceRecords.push(attendanceData);
  if (attendanceData.attended) {
    participation.totalSessionsAttended += 1;
  } else {
    participation.totalSessionsMissed += 1;
  }

  await participation.save();
  return participation;
}

async function submitFeedback(participationId, feedbackData, feedbackType = 'participant') {
  const update =
    feedbackType === 'guardian' ? { guardianFeedback: feedbackData } : { feedback: feedbackData };
  return EventParticipation.findByIdAndUpdate(participationId, update, { new: true });
}

async function getParticipationStats(activityId) {
  const match = activityId ? { activity: activityId } : {};
  const [statusStats, engagementStats, totalCount] = await Promise.all([
    EventParticipation.aggregate([
      { $match: match },
      { $group: { _id: '$participationStatus', count: { $sum: 1 } } },
    ]),
    EventParticipation.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          avgAttendance: { $avg: '$attendanceRate' },
          avgSocialScore: { $avg: '$socialInteractionScore' },
          avgSkillScore: { $avg: '$skillDevelopmentScore' },
          avgIndependence: { $avg: '$independenceScore' },
        },
      },
    ]),
    EventParticipation.countDocuments(match),
  ]);

  return {
    totalParticipations: totalCount,
    byStatus: statusStats,
    averages: engagementStats[0] || {},
  };
}

/**
 * Get a beneficiary's participation history
 */
async function getBeneficiaryHistory(beneficiaryId) {
  return EventParticipation.find({ beneficiary: beneficiaryId })
    .sort({ createdAt: -1 })
    .populate('activity', 'title category startDate status')
    .lean();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION ASSESSMENTS — قياس الاندماج
// ═══════════════════════════════════════════════════════════════════════════════

async function createAssessment(data, userId) {
  // Fetch previous assessment to set previousOverallScore
  const lastAssessment = await IntegrationAssessment.findOne({
    beneficiary: data.beneficiary,
    status: { $in: ['completed', 'approved'] },
  })
    .sort({ assessmentDate: -1 })
    .lean();

  if (lastAssessment) {
    data.previousOverallScore = lastAssessment.overallIntegrationScore;
    // Also set previous dimension scores
    if (data.dimensionScores && lastAssessment.dimensionScores) {
      data.dimensionScores = data.dimensionScores.map(ds => {
        const prev = lastAssessment.dimensionScores.find(p => p.dimension === ds.dimension);
        return prev ? { ...ds, previousScore: prev.score } : ds;
      });
    }
  }

  const assessment = new IntegrationAssessment({ ...data, createdBy: userId });
  await assessment.save();
  return assessment;
}

async function getAssessments(query = {}) {
  const {
    page = 1,
    limit = 20,
    beneficiary,
    assessmentType,
    integrationLevel,
    status,
    trend,
    sortBy = 'assessmentDate',
    sortOrder = 'desc',
  } = query;

  const filter = {};
  if (beneficiary) filter.beneficiary = beneficiary;
  if (assessmentType) filter.assessmentType = assessmentType;
  if (integrationLevel) filter.integrationLevel = integrationLevel;
  if (status) filter.status = status;
  if (trend) filter.trend = trend;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [assessments, total] = await Promise.all([
    IntegrationAssessment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('beneficiary', 'name fileNumber')
      .populate('assessor', 'name email')
      .lean(),
    IntegrationAssessment.countDocuments(filter),
  ]);

  return {
    assessments,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getAssessmentById(id) {
  return IntegrationAssessment.findById(id)
    .populate('beneficiary', 'name fileNumber')
    .populate('assessor', 'name email')
    .populate('linkedActivities', 'title category')
    .populate('linkedParticipations')
    .populate('reviewedBy', 'name email')
    .lean();
}

async function updateAssessment(id, data, userId) {
  return IntegrationAssessment.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
}

async function deleteAssessment(id) {
  return IntegrationAssessment.findByIdAndDelete(id);
}

/**
 * Get integration progress for a beneficiary over time
 */
async function getIntegrationProgress(beneficiaryId) {
  const assessments = await IntegrationAssessment.find({
    beneficiary: beneficiaryId,
    status: { $in: ['completed', 'approved'] },
  })
    .sort({ assessmentDate: 1 })
    .select('assessmentDate overallIntegrationScore integrationLevel dimensionScores trend')
    .lean();

  return {
    beneficiary: beneficiaryId,
    totalAssessments: assessments.length,
    history: assessments,
    latestScore:
      assessments.length > 0 ? assessments[assessments.length - 1].overallIntegrationScore : null,
    latestLevel:
      assessments.length > 0 ? assessments[assessments.length - 1].integrationLevel : null,
  };
}

async function getAssessmentStats() {
  const [levelStats, trendStats, scoreDistribution, totalCount] = await Promise.all([
    IntegrationAssessment.aggregate([
      { $match: { status: { $in: ['completed', 'approved'] } } },
      {
        $group: {
          _id: '$integrationLevel',
          count: { $sum: 1 },
          avgScore: { $avg: '$overallIntegrationScore' },
        },
      },
    ]),
    IntegrationAssessment.aggregate([
      { $match: { status: { $in: ['completed', 'approved'] } } },
      { $group: { _id: '$trend', count: { $sum: 1 } } },
    ]),
    IntegrationAssessment.aggregate([
      { $match: { status: { $in: ['completed', 'approved'] } } },
      {
        $bucket: {
          groupBy: '$overallIntegrationScore',
          boundaries: [0, 20, 40, 60, 80, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    IntegrationAssessment.countDocuments(),
  ]);

  return {
    totalAssessments: totalCount,
    byLevel: levelStats,
    byTrend: trendStats,
    scoreDistribution,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AWARENESS PROGRAMS — برامج التوعية
// ═══════════════════════════════════════════════════════════════════════════════

async function createAwarenessProgram(data, userId) {
  const program = new AwarenessProgram({ ...data, createdBy: userId });
  await program.save();
  return program;
}

async function getAwarenessPrograms(query = {}) {
  const {
    page = 1,
    limit = 20,
    programType,
    status,
    focusArea,
    coverageArea,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};
  if (programType) filter.programType = programType;
  if (status) filter.status = status;
  if (focusArea) filter.focusAreas = focusArea;
  if (coverageArea) filter.coverageArea = coverageArea;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { titleAr: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [programs, total] = await Promise.all([
    AwarenessProgram.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('partnerOrganizations', 'organizationName')
      .populate('programManager', 'name email')
      .lean(),
    AwarenessProgram.countDocuments(filter),
  ]);

  return {
    programs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getAwarenessProgramById(id) {
  return AwarenessProgram.findById(id)
    .populate('partnerOrganizations', 'organizationName organizationType status')
    .populate('programManager', 'name email')
    .lean();
}

async function updateAwarenessProgram(id, data, userId) {
  return AwarenessProgram.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
}

async function deleteAwarenessProgram(id) {
  return AwarenessProgram.findByIdAndDelete(id);
}

/**
 * Add a workshop to an awareness program
 */
async function addWorkshop(programId, workshopData) {
  const program = await AwarenessProgram.findById(programId);
  if (!program) return null;
  program.workshops.push(workshopData);
  await program.save();
  return program;
}

/**
 * Add campaign material to an awareness program
 */
async function addMaterial(programId, materialData) {
  const program = await AwarenessProgram.findById(programId);
  if (!program) return null;
  program.materials.push(materialData);
  await program.save();
  return program;
}

async function getAwarenessProgramStats() {
  const [typeStats, statusStats, impactStats, totalCount] = await Promise.all([
    AwarenessProgram.aggregate([{ $group: { _id: '$programType', count: { $sum: 1 } } }]),
    AwarenessProgram.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AwarenessProgram.aggregate([
      {
        $group: {
          _id: null,
          totalReach: { $sum: '$actualReach' },
          avgSatisfaction: { $avg: '$averageSatisfaction' },
          totalImpressions: { $sum: '$socialMediaImpressions' },
          totalWorkshops: { $sum: '$totalWorkshopsCompleted' },
        },
      },
    ]),
    AwarenessProgram.countDocuments(),
  ]);

  return {
    totalPrograms: totalCount,
    byType: typeStats,
    byStatus: statusStats,
    impact: impactStats[0] || {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة المتابعة الشاملة
// ═══════════════════════════════════════════════════════════════════════════════

async function getCommunityIntegrationDashboard() {
  const [activityStats, partnershipStats, participationStats, assessmentStats, awarenessStats] =
    await Promise.all([
      getActivityStats(),
      getPartnershipStats(),
      getParticipationStats(),
      getAssessmentStats(),
      getAwarenessProgramStats(),
    ]);

  return {
    activities: activityStats,
    partnerships: partnershipStats,
    participation: participationStats,
    assessments: assessmentStats,
    awarenessPrograms: awarenessStats,
    generatedAt: new Date(),
  };
}

module.exports = {
  // Activities
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivityStats,

  // Partnerships
  createPartnership,
  getPartnerships,
  getPartnershipById,
  updatePartnership,
  deletePartnership,
  getPartnershipStats,

  // Participation
  registerParticipation,
  getParticipations,
  getParticipationById,
  updateParticipation,
  recordAttendance,
  submitFeedback,
  getParticipationStats,
  getBeneficiaryHistory,

  // Integration Assessments
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  getIntegrationProgress,
  getAssessmentStats,

  // Awareness Programs
  createAwarenessProgram,
  getAwarenessPrograms,
  getAwarenessProgramById,
  updateAwarenessProgram,
  deleteAwarenessProgram,
  addWorkshop,
  addMaterial,
  getAwarenessProgramStats,

  // Dashboard
  getCommunityIntegrationDashboard,
};
