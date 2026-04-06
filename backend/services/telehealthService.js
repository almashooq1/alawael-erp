/**
 * TelehealthService — خدمة الطب عن بعد
 * Manages teleconsultations, waiting rooms, prescriptions,
 * Agora token generation, Saudi platform sync (Sehhaty/Mawid/Sehha)
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../utils/logger');

const {
  Teleconsultation,
  VirtualSession,
  RemotePrescription,
  TelehealthWaitingRoom,
  SessionRecording,
  TelehealthDevice,
  ProviderAvailabilitySlot,
  TeleconsultationParticipant,
} = require('../models/Telehealth');

// ─── Counter helper ───────────────────────────────────────────────────────────

async function nextConsultationNumber() {
  const count = await Teleconsultation.countDocuments();
  return `TC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

async function nextPrescriptionNumber() {
  const count = await RemotePrescription.countDocuments();
  return `RX-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

// ─── Agora Token (stub — replace with real SDK) ───────────────────────────────

function generateAgoraToken(channelName, uid, role = 'publisher') {
  const appId = process.env.AGORA_APP_ID || '';
  const appCert = process.env.AGORA_APP_CERTIFICATE || '';

  if (!appId || !appCert) {
    // Development mode: return placeholder token
    return `dev_token_${Buffer.from(`${channelName}:${uid}:${role}`).toString('base64')}`;
  }

  // Production: use agora-access-token npm package
  try {
    const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
    const expireTime = Math.floor(Date.now() / 1000) + 3600;
    const roleVal = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    return RtcTokenBuilder.buildTokenWithUid(appId, appCert, channelName, uid, roleVal, expireTime);
  } catch {
    return `dev_token_${Buffer.from(`${channelName}:${uid}:${role}`).toString('base64')}`;
  }
}

// ─── Schedule Consultation ────────────────────────────────────────────────────

async function scheduleConsultation(data) {
  const consultationNumber = await nextConsultationNumber();
  const roomId = `room_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

  const consultation = await Teleconsultation.create({
    uuid: uuidv4(),
    consultationNumber,
    roomId,
    branch: data.branchId || data.branch,
    beneficiary: data.beneficiaryId || data.beneficiary,
    provider: data.providerId || data.provider,
    appointment: data.appointmentId || data.appointment || null,
    type: data.type,
    specialty: data.specialty,
    scheduledAt: data.scheduledAt,
    scheduledDurationMinutes: data.scheduledDurationMinutes || 30,
    priority: data.priority || 'routine',
    isEmergency: data.isEmergency || false,
    chiefComplaint: data.chiefComplaint,
    notesBefore: data.notesBefore,
    platformSource: data.platformSource || 'internal',
    patientConsentObtained: data.patientConsentObtained || false,
  });

  // Sync with external platforms if needed
  if (data.platformSource && data.platformSource !== 'internal') {
    await syncWithSaudiPlatform(consultation, data.platformSource).catch(err =>
      logger.error('[Telehealth] Platform sync error:', err.message)
    );
  }

  return consultation;
}

// ─── Start Consultation ───────────────────────────────────────────────────────

async function startConsultation(consultationId) {
  const consultation = await Teleconsultation.findById(consultationId);
  if (!consultation) throw new Error('الاستشارة غير موجودة');

  const allowedStatuses = ['scheduled', 'waiting'];
  if (!allowedStatuses.includes(consultation.status)) {
    throw new Error(`لا يمكن بدء الجلسة في وضعها الحالي: ${consultation.status}`);
  }

  await consultation.updateOne({
    status: 'in_progress',
    startedAt: new Date(),
  });

  // Generate Agora tokens
  const providerToken = generateAgoraToken(consultation.roomId, consultation.provider.toString());
  const patientToken = generateAgoraToken(
    consultation.roomId,
    consultation.beneficiary.toString(),
    'subscriber'
  );

  // Admit from waiting room
  await TelehealthWaitingRoom.findOneAndUpdate(
    { teleconsultation: consultationId, status: 'waiting' },
    {
      status: 'admitted',
      admittedAt: new Date(),
    }
  );

  return {
    providerToken,
    patientToken,
    roomId: consultation.roomId,
    appId: process.env.AGORA_APP_ID || '',
    uid: consultation.provider.toString(),
  };
}

// ─── End Consultation ─────────────────────────────────────────────────────────

async function endConsultation(consultationId, clinicalData = {}) {
  const consultation = await Teleconsultation.findById(consultationId);
  if (!consultation) throw new Error('الاستشارة غير موجودة');

  if (consultation.status !== 'in_progress') {
    throw new Error('الجلسة ليست جارية حالياً');
  }

  const startedAt = consultation.startedAt || new Date(Date.now() - 30 * 60 * 1000);
  const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

  await consultation.updateOne({
    status: 'completed',
    endedAt: new Date(),
    durationMinutes,
    clinicalNotes: clinicalData.clinicalNotes,
    summary: clinicalData.summary,
    vitalSigns: clinicalData.vitalSigns,
  });

  // Update all participants
  await TeleconsultationParticipant.updateMany(
    { teleconsultation: consultationId, leftAt: null },
    { leftAt: new Date() }
  );

  // Schedule follow-up if requested
  if (clinicalData.scheduleFollowUp) {
    const days = clinicalData.followUpDays || 14;
    const followUpDate = new Date(consultation.endedAt || Date.now());
    followUpDate.setDate(followUpDate.getDate() + days);

    await scheduleConsultation({
      branch: consultation.branch,
      beneficiary: consultation.beneficiary,
      provider: consultation.provider,
      type: consultation.type,
      specialty: consultation.specialty,
      scheduledAt: followUpDate,
      scheduledDurationMinutes: consultation.scheduledDurationMinutes,
      priority: 'follow_up',
      notesBefore: `متابعة للجلسة #${consultation.consultationNumber}`,
    });
  }

  return await Teleconsultation.findById(consultationId)
    .populate('beneficiary', 'name nationalId')
    .populate('provider', 'name');
}

// ─── Join Waiting Room ────────────────────────────────────────────────────────

async function joinWaitingRoom(consultationId, deviceInfo = {}) {
  const consultation = await Teleconsultation.findById(consultationId);
  if (!consultation) throw new Error('الاستشارة غير موجودة');

  // Check if already in waiting room
  const existing = await TelehealthWaitingRoom.findOne({
    teleconsultation: consultationId,
    status: 'waiting',
  });
  if (existing) return existing;

  const queuePosition =
    (await TelehealthWaitingRoom.countDocuments({
      branch: consultation.branch,
      status: 'waiting',
    })) + 1;

  const waitingRoom = await TelehealthWaitingRoom.create({
    uuid: uuidv4(),
    branch: consultation.branch,
    teleconsultation: consultationId,
    beneficiary: consultation.beneficiary,
    status: 'waiting',
    joinedAt: new Date(),
    queuePosition,
    deviceType: deviceInfo.deviceType || 'desktop',
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    bandwidthKbps: deviceInfo.bandwidthKbps,
  });

  // Update consultation status to waiting
  await consultation.updateOne({ status: 'waiting' });

  return waitingRoom;
}

// ─── Update Device Test ───────────────────────────────────────────────────────

async function updateDeviceTest(waitingRoomId, testData) {
  const room = await TelehealthWaitingRoom.findByIdAndUpdate(
    waitingRoomId,
    {
      cameraTested: testData.cameraTested,
      microphoneTested: testData.microphoneTested,
      connectionTested: testData.connectionTested,
      connectionQuality: testData.connectionQuality,
      bandwidthKbps: testData.bandwidthKbps,
    },
    { new: true }
  );
  const isReady = room.cameraTested && room.microphoneTested && room.connectionTested;
  return { room, isReady };
}

// ─── Add Participant ──────────────────────────────────────────────────────────

async function addParticipant(consultationId, participantData) {
  const consultation = await Teleconsultation.findById(consultationId);
  if (!consultation) throw new Error('الاستشارة غير موجودة');

  if (!['in_progress', 'waiting'].includes(consultation.status)) {
    throw new Error('الجلسة غير نشطة');
  }

  const joinToken = uuidv4().replace(/-/g, '');

  const participant = await TeleconsultationParticipant.create({
    teleconsultation: consultationId,
    branch: consultation.branch,
    participantType: participantData.type,
    guestName: participantData.name,
    guestPhone: participantData.phone,
    guestRelation: participantData.relation,
    joinToken,
    roleInSession: participantData.role || 'observer',
    consentGiven: false,
  });

  const agoraToken = generateAgoraToken(
    consultation.roomId,
    participant._id.toString(),
    'subscriber'
  );

  return {
    participantId: participant._id,
    joinToken,
    agoraToken,
    roomId: consultation.roomId,
    joinUrl: `${process.env.FRONTEND_URL || ''}/telehealth/join/${joinToken}`,
  };
}

// ─── Detect and Adjust Quality ────────────────────────────────────────────────

async function detectAndAdjustQuality(consultationId, bandwidthKbps) {
  let quality;
  if (bandwidthKbps >= 2000) quality = 'excellent';
  else if (bandwidthKbps >= 1000) quality = 'good';
  else if (bandwidthKbps >= 500) quality = 'fair';
  else quality = 'poor';

  const settingsMap = {
    excellent: { resolution: '1080p', framerate: 30, bitrate: 2000 },
    good: { resolution: '720p', framerate: 25, bitrate: 1200 },
    fair: { resolution: '480p', framerate: 20, bitrate: 600 },
    poor: { resolution: '360p', framerate: 15, bitrate: 300 },
  };

  await Teleconsultation.findByIdAndUpdate(consultationId, {
    patientBandwidth:
      quality === 'excellent' || quality === 'good'
        ? 'high'
        : quality === 'fair'
          ? 'medium'
          : 'low',
    connectionQualityScore: Math.min(5, bandwidthKbps / 500),
  });

  return { quality, ...settingsMap[quality] };
}

// ─── Issue Remote Prescription ────────────────────────────────────────────────

async function issuePrescription(consultationId, prescriberId, data) {
  const consultation = await Teleconsultation.findById(consultationId);
  if (!consultation) throw new Error('الاستشارة غير موجودة');

  const prescriptionNumber = await nextPrescriptionNumber();

  const prescription = await RemotePrescription.create({
    uuid: uuidv4(),
    prescriptionNumber,
    branch: consultation.branch,
    teleconsultation: consultationId,
    prescriber: prescriberId,
    beneficiary: consultation.beneficiary,
    type: data.type || 'medication',
    medications: data.medications || [],
    therapyInstructions: data.therapyInstructions || [],
    equipmentNeeded: data.equipmentNeeded || [],
    generalInstructions: data.generalInstructions,
    specialNotes: data.specialNotes,
    validUntil: data.validUntil,
    isControlledSubstance: data.isControlledSubstance || false,
    patientAllergiesChecked: data.patientAllergiesChecked || [],
    status: 'draft',
  });

  // Send to Wasfaty if requested
  if (data.sendToWasfaty) {
    const wasfatyResult = await sendToWasfaty(prescription).catch(err => ({
      success: false,
      error: err.message,
    }));
    if (wasfatyResult.success) {
      await prescription.updateOne({
        wasfatyPrescriptionId: wasfatyResult.prescriptionId,
        wasfatyStatus: wasfatyResult.status,
        status: 'sent',
        issuedAt: new Date(),
      });
    }
  } else {
    await prescription.updateOne({ status: 'issued', issuedAt: new Date() });
  }

  return await RemotePrescription.findById(prescription._id)
    .populate('prescriber', 'name licenseNumber')
    .populate('beneficiary', 'name nationalId');
}

// ─── Wasfaty Integration ──────────────────────────────────────────────────────

async function sendToWasfaty(prescription) {
  const baseUrl = process.env.WASFATY_BASE_URL || 'https://api.wasfaty.med.sa/v1';
  const apiKey = process.env.WASFATY_API_KEY || '';

  if (!apiKey) {
    logger.warn('[Wasfaty] API key not configured — skipping');
    return { success: false, error: 'Wasfaty API key not configured' };
  }

  const populated = await RemotePrescription.findById(prescription._id)
    .populate('beneficiary', 'nationalId')
    .populate('prescriber', 'licenseNumber');

  const payload = {
    patient_national_id: populated.beneficiary?.nationalId,
    prescriber_id: populated.prescriber?.licenseNumber || '',
    prescription_date: new Date().toISOString().split('T')[0],
    valid_until: populated.validUntil?.toISOString().split('T')[0],
    medications: (populated.medications || []).map(m => ({
      drug_code: m.drugCode || '',
      drug_name: m.name,
      dosage: m.dose,
      frequency: m.frequency,
      duration: m.duration,
      quantity: m.quantity || 1,
      instructions: m.notes || '',
    })),
    is_controlled: populated.isControlledSubstance,
  };

  const response = await axios.post(`${baseUrl}/prescriptions`, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  return {
    success: true,
    prescriptionId: response.data?.prescription_id,
    status: response.data?.status || 'issued',
  };
}

// ─── Saudi Platform Sync ──────────────────────────────────────────────────────

async function syncWithSaudiPlatform(consultation, platform) {
  const populated = await Teleconsultation.findById(consultation._id)
    .populate('beneficiary', 'nationalId')
    .populate('provider', 'licenseNumber mawidProviderId');

  const configs = {
    sehhaty: {
      url: process.env.SEHHATY_BASE_URL,
      token: process.env.SEHHATY_TOKEN,
      clientId: process.env.SEHHATY_CLIENT_ID,
    },
    mawid: {
      url: process.env.MAWID_BASE_URL,
      apiKey: process.env.MAWID_API_KEY,
    },
    sehha: {
      url: process.env.SEHHA_BASE_URL,
    },
  };

  const cfg = configs[platform];
  if (!cfg?.url) return;

  if (platform === 'sehhaty') {
    const resp = await axios.post(
      `${cfg.url}/telehealth/appointments`,
      {
        beneficiary_national_id: populated.beneficiary?.nationalId,
        provider_license: populated.provider?.licenseNumber,
        appointment_datetime: consultation.scheduledAt.toISOString(),
        specialty: consultation.specialty,
        consultation_type: consultation.type,
        internal_reference: consultation.consultationNumber,
      },
      {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'X-Client-ID': cfg.clientId,
        },
        timeout: 10000,
      }
    );
    if (resp.data?.appointment_id) {
      await consultation.updateOne({ externalAppointmentId: resp.data.appointment_id });
    }
  } else if (platform === 'mawid') {
    await axios.post(
      `${cfg.url}/appointments/telehealth`,
      {
        patient_id: populated.beneficiary?.nationalId,
        doctor_id: populated.provider?.mawidProviderId || '',
        appointment_time: consultation.scheduledAt.toISOString(),
        duration: consultation.scheduledDurationMinutes,
        type: 'virtual',
      },
      { headers: { Authorization: `Bearer ${cfg.apiKey}` }, timeout: 10000 }
    );
  }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

async function getDashboardStats(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayCount, activeCount, completedToday, thisWeekCount] = await Promise.all([
    Teleconsultation.countDocuments({
      branch: branchId,
      scheduledAt: { $gte: today, $lt: tomorrow },
    }),
    Teleconsultation.countDocuments({
      branch: branchId,
      status: { $in: ['in_progress', 'waiting'] },
    }),
    Teleconsultation.countDocuments({
      branch: branchId,
      status: 'completed',
      endedAt: { $gte: today },
    }),
    Teleconsultation.countDocuments({
      branch: branchId,
      scheduledAt: {
        $gte: new Date(today.getTime() - today.getDay() * 86400000),
        $lte: new Date(today.getTime() + (6 - today.getDay()) * 86400000 + 86399999),
      },
    }),
  ]);

  return { todayCount, activeCount, completedToday, thisWeekCount };
}

// ─── Provider Queue ───────────────────────────────────────────────────────────

async function getProviderQueue(branchId, providerId) {
  return TelehealthWaitingRoom.find({ branch: branchId, status: 'waiting' })
    .populate('beneficiary', 'name')
    .populate({
      path: 'teleconsultation',
      match: { provider: providerId },
      populate: { path: 'provider', select: 'name' },
    })
    .sort({ queuePosition: 1 })
    .lean();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  scheduleConsultation,
  startConsultation,
  endConsultation,
  joinWaitingRoom,
  updateDeviceTest,
  addParticipant,
  detectAndAdjustQuality,
  issuePrescription,
  sendToWasfaty,
  syncWithSaudiPlatform,
  getDashboardStats,
  getProviderQueue,
  generateAgoraToken,
};
