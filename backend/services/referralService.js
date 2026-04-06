/**
 * ReferralService — خدمة بوابة التحويلات الطبية
 * Manages referral lifecycle, auto-assignment, priority scoring,
 * FHIR R4 integration, MOH sync, communications
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../utils/logger');

const {
  Referral,
  ReferralDocument,
  ReferringFacility,
  ReferralCommunication,
  ReferralAssessment,
  FhirIntegrationLog,
} = require('../models/Referral');

// ─── Status Transition Map ────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  received: ['under_review', 'cancelled'],
  under_review: ['accepted', 'rejected'],
  accepted: ['scheduled'],
  scheduled: ['in_progress'],
  in_progress: ['completed'],
  rejected: [],
  completed: [],
  cancelled: [],
};

function canTransition(currentStatus, newStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

// ─── Priority Scorer ──────────────────────────────────────────────────────────

function calculatePriorityScore(data) {
  let score = 50;

  // Age factor
  if (data.patientDob) {
    const age = Math.floor((Date.now() - new Date(data.patientDob).getTime()) / 31557600000);
    if (age < 5 || age > 65) score += 15;
    else if (age < 12) score += 10;
  }

  // Specialty urgency
  const urgentSpecialties = [
    'autism',
    'cerebral_palsy',
    'developmental_delay',
    'speech_delay',
    'down_syndrome',
  ];
  if (urgentSpecialties.includes((data.specialtyRequired || '').toLowerCase())) {
    score += 10;
  }

  // Reason keywords
  const urgentKeywords = ['عاجل', 'طارئ', 'خطر', 'فوري', 'urgent', 'emergency', 'critical'];
  const reason = (data.referralReason || '').toLowerCase();
  if (urgentKeywords.some(k => reason.includes(k.toLowerCase()))) {
    score += 20;
  }

  // Source system
  if (data.sourceSystem === 'moh') score += 10;

  // Facility type
  if (data.facilityType === 'hospital') score += 5;

  return Math.min(100, Math.max(0, score));
}

function priorityFromScore(score) {
  if (score >= 70) return 'urgent';
  if (score >= 40) return 'routine';
  return 'elective';
}

// ─── Next Referral Number ─────────────────────────────────────────────────────

async function nextReferralNumber() {
  const count = await Referral.countDocuments();
  return `REF-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

// ─── Receive Referral ─────────────────────────────────────────────────────────

async function receiveReferral(data) {
  const priorityScore = calculatePriorityScore(data);
  const priority = priorityFromScore(priorityScore);
  const referralNumber = await nextReferralNumber();

  const referral = await Referral.create({
    uuid: uuidv4(),
    referralNumber,
    branch: data.branchId || data.branch,
    patientName: data.patientName,
    patientNationalId: data.patientNationalId,
    patientDob: data.patientDob,
    patientGender: data.patientGender,
    patientPhone: data.patientPhone,
    beneficiary: data.beneficiaryId || data.beneficiary || null,
    referringFacility: data.referringFacilityId || data.referringFacility,
    referringPhysicianName: data.referringPhysicianName,
    referringPhysicianLicense: data.referringPhysicianLicense,
    referringPhysicianPhone: data.referringPhysicianPhone,
    referringPhysicianEmail: data.referringPhysicianEmail,
    specialtyRequired: data.specialtyRequired,
    referralReason: data.referralReason,
    clinicalSummary: data.clinicalSummary,
    diagnosisCodes: data.diagnosisCodes || [],
    requestedServices: data.requestedServices || [],
    requestedDate: data.requestedDate,
    sourceSystem: data.sourceSystem || 'manual',
    fhirResourceId: data.fhirResourceId,
    mohReferralId: data.mohReferralId,
    priorityScore,
    priority,
    status: 'received',
  });

  // Attempt auto-assignment
  await attemptAutoAssignment(referral).catch(err =>
    logger.error('[Referral] Auto-assignment error:', err.message)
  );

  // Update facility stats
  await ReferringFacility.findByIdAndUpdate(referral.referringFacility, {
    $inc: { totalReferralsSent: 1 },
  });

  return await Referral.findById(referral._id)
    .populate('referringFacility', 'name city type')
    .populate('assignedTo', 'name specialty');
}

// ─── Auto Assignment ──────────────────────────────────────────────────────────

async function attemptAutoAssignment(referral) {
  // Import Employee model dynamically to avoid circular deps
  let Employee;
  try {
    Employee = require('../models/Employee');
  } catch {
    return false;
  }

  // Find least-loaded employee with matching specialty
  const employees = await Employee.aggregate([
    {
      $match: {
        branch: referral.branch,
        specialty: referral.specialtyRequired,
        isActive: true,
      },
    },
    {
      $lookup: {
        from: 'referrals',
        let: { empId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$assignedTo', '$$empId'] },
              status: { $in: ['accepted', 'scheduled', 'in_progress'] },
            },
          },
          { $count: 'total' },
        ],
        as: 'activeReferrals',
      },
    },
    {
      $addFields: {
        activeCount: { $ifNull: [{ $arrayElemAt: ['$activeReferrals.total', 0] }, 0] },
      },
    },
    { $match: { activeCount: { $lt: 20 } } },
    { $sort: { activeCount: 1 } },
    { $limit: 1 },
  ]);

  if (!employees.length) return false;

  const assignee = employees[0];
  await Referral.findByIdAndUpdate(referral._id, {
    assignedTo: assignee._id,
    assignedAt: new Date(),
  });

  return true;
}

// ─── Review Referral ──────────────────────────────────────────────────────────

async function reviewReferral(referralId, reviewerId, reviewData) {
  const referral = await Referral.findById(referralId);
  if (!referral) throw new Error('التحويل غير موجود');

  const decision = reviewData.decision; // 'accepted' or 'rejected'
  if (!canTransition(referral.status, decision)) {
    throw new Error(`لا يمكن الانتقال من ${referral.status} إلى ${decision}`);
  }

  await referral.updateOne({
    status: decision,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    reviewNotes: reviewData.notes,
    rejectionReason: reviewData.rejectionReason,
  });

  // Create assessment record
  if (reviewData.assessment) {
    await ReferralAssessment.create({
      referral: referralId,
      branch: referral.branch,
      assessedBy: reviewerId,
      assessmentDate: new Date(),
      recommendation: decision === 'accepted' ? 'accept' : 'reject',
      clinicalOpinion: reviewData.assessment.clinicalOpinion || reviewData.notes || '',
      servicesRecommended: reviewData.assessment.servicesRecommended || [],
      priorityFactors: reviewData.assessment.priorityFactors || [],
      requiresHomeVisit: reviewData.assessment.requiresHomeVisit || false,
      requiresMultidisciplinary: reviewData.assessment.requiresMultidisciplinary || false,
      teamMembersNeeded: reviewData.assessment.teamMembersNeeded || [],
      notes: reviewData.assessment.notes,
    });
  }

  // Notify referring facility
  await notifyReferringFacility(referral, decision).catch(err =>
    logger.error('[Referral] Notification error:', err.message)
  );

  return await Referral.findById(referralId)
    .populate('referringFacility', 'name')
    .populate('reviewedBy', 'name')
    .populate('assignedTo', 'name');
}

// ─── Transition Status ────────────────────────────────────────────────────────

async function transitionStatus(referralId, newStatus, data = {}, userId = null) {
  const referral = await Referral.findById(referralId);
  if (!referral) throw new Error('التحويل غير موجود');

  if (!canTransition(referral.status, newStatus)) {
    throw new Error(`لا يمكن الانتقال من ${referral.status} إلى ${newStatus}`);
  }

  const updateData = { status: newStatus, ...data };

  if (newStatus === 'completed') {
    updateData.completedDate = new Date();
    updateData.completedBy = userId;
    updateData.completionNotes = data.completionNotes;
  }

  await referral.updateOne(updateData);

  return await Referral.findById(referralId);
}

// ─── Send Communication ───────────────────────────────────────────────────────

async function sendCommunication(referralId, senderId, messageData) {
  const referral = await Referral.findById(referralId);
  if (!referral) throw new Error('التحويل غير موجود');

  const communication = await ReferralCommunication.create({
    referral: referralId,
    branch: referral.branch,
    direction: 'outbound',
    channel: messageData.channel || 'email',
    subject: messageData.subject,
    content: messageData.content,
    senderName: messageData.senderName,
    recipientName: referral.referringPhysicianName,
    sentBy: senderId,
    attachments: messageData.attachments || [],
  });

  // Send via channel
  if (communication.channel === 'email' && referral.referringPhysicianEmail) {
    // Email sending placeholder — integrate with nodemailer/SendGrid
    logger.info(`[Referral] Email queued to ${referral.referringPhysicianEmail}`);
  } else if (communication.channel === 'sms' && referral.referringPhysicianPhone) {
    // SMS sending placeholder
    logger.info(`[Referral] SMS queued to ${referral.referringPhysicianPhone}`);
  }

  return communication;
}

// ─── FHIR Import ──────────────────────────────────────────────────────────────

async function importFromFhir(fhirResource, branchId, facilityId) {
  const logStart = Date.now();
  let logStatus = 'success';
  let errorMsg = null;
  let referral = null;

  try {
    // Parse FHIR ServiceRequest resource
    const parsed = parseFhirServiceRequest(fhirResource);
    parsed.branchId = branchId;
    parsed.referringFacility = facilityId;
    parsed.sourceSystem = 'fhir';
    parsed.fhirResourceId = fhirResource.id;

    referral = await receiveReferral(parsed);
  } catch (err) {
    logStatus = 'failed';
    errorMsg = err.message;
    throw err;
  } finally {
    await FhirIntegrationLog.create({
      branch: branchId,
      operation: 'create',
      resourceType: 'ServiceRequest',
      resourceId: fhirResource.id,
      referral: referral?._id || null,
      facility: facilityId,
      direction: 'inbound',
      status: logStatus,
      requestPayload: fhirResource,
      errorMessage: errorMsg,
      durationMs: Date.now() - logStart,
      fhirVersion: 'R4',
    });
  }

  return referral;
}

function parseFhirServiceRequest(resource) {
  // Map FHIR R4 ServiceRequest fields to our referral model
  const patient = resource.subject?.reference || '';
  const requester = resource.requester?.reference || '';

  return {
    patientName: resource.subject?.display || 'غير محدد',
    patientNationalId: extractIdentifier(resource.subject?.identifier),
    referralReason: resource.reasonCode?.[0]?.text || resource.note?.[0]?.text || '',
    clinicalSummary: resource.note?.map(n => n.text).join('\n'),
    specialtyRequired: resource.code?.text || resource.code?.coding?.[0]?.display || '',
    diagnosisCodes: (resource.reasonCode || []).map(r => r.coding?.[0]?.code).filter(Boolean),
    requestedServices: (resource.code?.coding || []).map(c => c.display).filter(Boolean),
    requestedDate: resource.occurrenceDateTime ? new Date(resource.occurrenceDateTime) : null,
    referringPhysicianName: resource.requester?.display,
    fhirResourceId: resource.id,
  };
}

function extractIdentifier(identifier) {
  if (!identifier) return null;
  if (Array.isArray(identifier)) return identifier[0]?.value;
  return identifier.value;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

async function getAnalytics(branchId, filters = {}) {
  const match = {
    branch: require('mongoose').Types.ObjectId.createFromHexString
      ? typeof branchId === 'string'
        ? branchId
        : branchId.toString()
      : branchId,
  };

  if (filters.from) match.createdAt = { $gte: new Date(filters.from) };
  if (filters.to) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$lte = new Date(filters.to);
  }

  const [total, byStatus, bySpecialty, urgentPending, avgProcessing] = await Promise.all([
    Referral.countDocuments({ branch: branchId }),
    Referral.aggregate([
      { $match: { branch: require('mongoose').Types.ObjectId(branchId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).catch(() => Referral.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])),
    Referral.aggregate([
      { $group: { _id: '$specialtyRequired', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Referral.countDocuments({
      branch: branchId,
      priority: 'urgent',
      status: { $nin: ['completed', 'rejected', 'cancelled'] },
    }),
    Referral.aggregate([
      {
        $match: {
          reviewedAt: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          processingDays: {
            $divide: [{ $subtract: ['$reviewedAt', '$createdAt'] }, 86400000],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$processingDays' } } },
    ]),
  ]);

  const statusMap = {};
  byStatus.forEach(s => {
    statusMap[s._id] = s.count;
  });

  const specialtyMap = {};
  bySpecialty.forEach(s => {
    specialtyMap[s._id] = s.count;
  });

  const acceptanceRate =
    total > 0 ? Math.round(((statusMap.accepted || 0) / total) * 100 * 10) / 10 : 0;

  return {
    total,
    byStatus: statusMap,
    bySpecialty: specialtyMap,
    avgProcessingDays: Math.round((avgProcessing[0]?.avg || 0) * 10) / 10,
    urgentPending,
    acceptanceRate,
  };
}

// ─── Notify Referring Facility ────────────────────────────────────────────────

async function notifyReferringFacility(referral, decision) {
  if (!referral.referringPhysicianEmail) return;

  const subject =
    decision === 'accepted'
      ? `تم قبول تحويل المريض ${referral.patientName}`
      : `اعتذار بشأن تحويل المريض ${referral.patientName}`;

  const content =
    decision === 'accepted'
      ? `نود إعلامكم بأنه تم قبول تحويل المريض ${referral.patientName} (رقم التحويل: ${referral.referralNumber}). سيتم التواصل معكم لتحديد موعد المراجعة.`
      : `نود إعلامكم بأنه لا يمكننا قبول تحويل المريض ${referral.patientName} (رقم التحويل: ${referral.referralNumber}) في الوقت الحالي. نشكركم على ثقتكم.`;

  await ReferralCommunication.create({
    referral: referral._id,
    branch: referral.branch,
    direction: 'outbound',
    channel: 'email',
    subject,
    content,
    recipientName: referral.referringPhysicianName,
    isRead: false,
  });

  // Placeholder: actual email sending via nodemailer/SendGrid
  logger.info(`[Referral] Notification email queued to ${referral.referringPhysicianEmail}`);
}

// ─── Recalculate Priority ─────────────────────────────────────────────────────

async function recalculatePriority(referralId) {
  const referral = await Referral.findById(referralId).lean();
  if (!referral) throw new Error('التحويل غير موجود');

  const score = calculatePriorityScore(referral);
  const priority = priorityFromScore(score);

  await Referral.findByIdAndUpdate(referralId, { priorityScore: score, priority });
  return { score, priority };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  receiveReferral,
  reviewReferral,
  transitionStatus,
  sendCommunication,
  importFromFhir,
  getAnalytics,
  attemptAutoAssignment,
  calculatePriorityScore,
  priorityFromScore,
  recalculatePriority,
  canTransition,
  STATUS_TRANSITIONS,
};
