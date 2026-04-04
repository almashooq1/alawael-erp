/**
 * Telehealth Models — نماذج الطب عن بعد
 * Covers: Teleconsultations, VirtualSessions, RemotePrescriptions,
 *         WaitingRooms, SessionRecordings, TelehealthDevices,
 *         ProviderAvailabilitySlots, TeleconsultationParticipants
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Teleconsultation ────────────────────────────────────────────────────────

const teleconsultationSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    consultationNumber: { type: String, unique: true }, // TC-2026-00001
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }, // المعالج/الطبيب
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },

    type: {
      type: String,
      enum: ['video', 'audio', 'chat', 'hybrid'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'scheduled',
        'waiting',
        'in_progress',
        'paused',
        'completed',
        'cancelled',
        'no_show',
        'technical_failure',
      ],
      default: 'scheduled',
    },
    specialty: { type: String, trim: true }, // speech_therapy, physiotherapy, etc.
    priority: { type: String, enum: ['urgent', 'routine', 'follow_up'], default: 'routine' },
    isEmergency: { type: Boolean, default: false },

    scheduledAt: { type: Date, required: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
    durationMinutes: { type: Number },
    scheduledDurationMinutes: { type: Number, default: 30 },

    // WebRTC / Agora
    roomId: { type: String },
    roomToken: { type: String },
    agoraConfig: { type: Schema.Types.Mixed },
    platformSource: {
      type: String,
      enum: ['sehhaty', 'mawid', 'sehha', 'internal'],
      default: 'internal',
    },
    externalAppointmentId: { type: String },

    // Recording
    isRecorded: { type: Boolean, default: false },
    recordingUrl: { type: String },
    recordingPath: { type: String },
    recordingSizeBytes: { type: Number },

    // Clinical
    chiefComplaint: { type: String },
    notesBefore: { type: String },
    clinicalNotes: { type: String },
    summary: { type: String },
    vitalSigns: { type: Schema.Types.Mixed }, // {bp, spo2, temp, pulse}

    // Connection Quality
    connectionQualityScore: { type: Number, min: 0, max: 5 },
    patientBandwidth: { type: String, enum: ['low', 'medium', 'high', 'excellent'] },

    // Consent
    patientConsentObtained: { type: Boolean, default: false },
    consentObtainedAt: { type: Date },

    // Cancellation
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
    collection: 'teleconsultations',
  }
);

teleconsultationSchema.index({ branch: 1, status: 1, scheduledAt: -1 });
teleconsultationSchema.index({ beneficiary: 1, scheduledAt: -1 });
teleconsultationSchema.index({ provider: 1, scheduledAt: -1 });
teleconsultationSchema.index({ consultationNumber: 1 });

// ─── VirtualSession ──────────────────────────────────────────────────────────

const virtualSessionSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    teleconsultation: { type: Schema.Types.ObjectId, ref: 'Teleconsultation', required: true },
    sessionType: {
      type: String,
      enum: ['therapy', 'assessment', 'family_meeting', 'group'],
      required: true,
    },
    screenSharingEnabled: { type: Boolean, default: false },
    whiteboardEnabled: { type: Boolean, default: false },
    fileSharingEnabled: { type: Boolean, default: true },
    whiteboardData: { type: Schema.Types.Mixed },
    sharedFiles: [{ type: Schema.Types.Mixed }],
    chatHistory: [{ type: Schema.Types.Mixed }],
    exercisesCompleted: [{ type: Schema.Types.Mixed }],
    goalsReviewed: [{ type: Schema.Types.Mixed }],
    participantCount: { type: Number, default: 1 },
    familyMemberJoined: { type: Boolean, default: false },
    interpreterRequired: { type: Boolean, default: false },
    interpreterLanguage: { type: String },
    breakoutRoomsCount: { type: Number, default: 0 },
    breakoutRoomsData: { type: Schema.Types.Mixed },
    recordingConsent: { type: String, enum: ['pending', 'granted', 'denied'], default: 'pending' },
    therapistAssessment: { type: String },
    patientEngagementScore: { type: Number, min: 1, max: 10 },
    technicalIssues: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true, collection: 'virtual_sessions' }
);

// ─── RemotePrescription ──────────────────────────────────────────────────────

const remotePrescriptionSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    prescriptionNumber: { type: String, unique: true }, // RX-2026-00001
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    teleconsultation: { type: Schema.Types.ObjectId, ref: 'Teleconsultation', required: true },
    prescriber: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'dispensed', 'cancelled', 'expired'],
      default: 'draft',
    },
    type: {
      type: String,
      enum: ['medication', 'therapy', 'equipment', 'referral'],
      default: 'medication',
    },
    medications: [
      {
        name: String,
        dose: String,
        frequency: String,
        duration: String,
        drugCode: String,
        notes: String,
        quantity: { type: Number, default: 1 },
      },
    ],
    therapyInstructions: [{ type: Schema.Types.Mixed }],
    equipmentNeeded: [{ type: Schema.Types.Mixed }],
    generalInstructions: { type: String },
    specialNotes: { type: String },

    // Wasfaty Integration
    wasfatyPrescriptionId: { type: String },
    wasfatyStatus: { type: String },

    issuedAt: { type: Date },
    validUntil: { type: Date },
    isControlledSubstance: { type: Boolean, default: false },
    digitalSignature: { type: String },
    qrCodePath: { type: String },
    patientAllergiesChecked: [{ type: Schema.Types.Mixed }],
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    dispensedAt: { type: Date },
  },
  { timestamps: true, collection: 'remote_prescriptions' }
);

remotePrescriptionSchema.index({ branch: 1, status: 1 });
remotePrescriptionSchema.index({ beneficiary: 1, issuedAt: -1 });

// ─── TelehealthWaitingRoom ────────────────────────────────────────────────────

const telehealthWaitingRoomSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    teleconsultation: { type: Schema.Types.ObjectId, ref: 'Teleconsultation', required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    status: {
      type: String,
      enum: ['waiting', 'admitted', 'left', 'timeout'],
      default: 'waiting',
    },
    joinedAt: { type: Date, required: true },
    admittedAt: { type: Date },
    leftAt: { type: Date },
    waitTimeMinutes: { type: Number },
    queuePosition: { type: Number, default: 1 },

    // Device Info
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'] },
    browser: { type: String },
    os: { type: String },

    // Device Tests
    cameraTested: { type: Boolean, default: false },
    microphoneTested: { type: Boolean, default: false },
    connectionTested: { type: Boolean, default: false },
    connectionQuality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
    bandwidthKbps: { type: Number },

    preSessionQuestionnaire: { type: Schema.Types.Mixed },
    waitingMessage: { type: String },
    reminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date },
  },
  { timestamps: true, collection: 'telehealth_waiting_rooms' }
);

telehealthWaitingRoomSchema.index({ teleconsultation: 1, status: 1 });

// ─── SessionRecording ────────────────────────────────────────────────────────

const sessionRecordingSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    teleconsultation: { type: Schema.Types.ObjectId, ref: 'Teleconsultation', required: true },
    recordingType: { type: String, enum: ['full', 'audio_only', 'screen_share'], default: 'full' },
    filePath: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    fileSizeBytes: { type: Number },
    durationSeconds: { type: Number },
    storageDriver: { type: String, enum: ['local', 's3', 'r2'], default: 'local' },
    storageBucket: { type: String },
    encryptionKeyId: { type: String },
    isEncrypted: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed', 'deleted'],
      default: 'processing',
    },
    consentDocumented: { type: Boolean, default: false },
    retentionUntil: { type: Date },
    isAccessibleToPatient: { type: Boolean, default: false },
    accessLog: [{ type: Schema.Types.Mixed }],
    thumbnailPath: { type: String },
    transcription: { type: String },
  },
  { timestamps: true, collection: 'session_recordings' }
);

// ─── TelehealthDevice ────────────────────────────────────────────────────────

const telehealthDeviceSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    deviceType: {
      type: String,
      enum: ['pulse_oximeter', 'blood_pressure', 'glucose_meter', 'thermometer', 'other'],
      required: true,
    },
    deviceName: { type: String, required: true },
    manufacturer: { type: String },
    modelNumber: { type: String },
    serialNumber: { type: String },
    macAddress: { type: String },
    connectionType: { type: String, enum: ['bluetooth', 'wifi', 'cellular'] },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'retired'],
      default: 'active',
    },
    lastReadingAt: { type: Date },
    lastReadingData: { type: Schema.Types.Mixed },
    normalRanges: { type: Schema.Types.Mixed },
    alertEnabled: { type: Boolean, default: true },
    alertThresholds: { type: Schema.Types.Mixed },
    calibrationDue: { type: Date },
    firmwareVersion: { type: String },
  },
  { timestamps: true, collection: 'telehealth_devices' }
);

telehealthDeviceSchema.index({ beneficiary: 1, deviceType: 1 });

// ─── ProviderAvailabilitySlot ─────────────────────────────────────────────────

const providerAvailabilitySlotSchema = new Schema(
  {
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    slotDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // HH:MM
    endTime: { type: String, required: true }, // HH:MM
    durationMinutes: { type: Number, default: 30 },
    slotType: { type: String, enum: ['telehealth', 'in_person', 'both'], default: 'telehealth' },
    status: {
      type: String,
      enum: ['available', 'booked', 'blocked', 'past'],
      default: 'available',
    },
    teleconsultation: { type: Schema.Types.ObjectId, ref: 'Teleconsultation', default: null },
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: { type: String, enum: ['weekly', 'biweekly'] },
    specialtiesOffered: [{ type: String }],
    platformSyncedTo: { type: String, enum: ['mawid', 'sehhaty'] },
    externalSlotId: { type: String },
    notes: { type: String },
  },
  { timestamps: true, collection: 'provider_availability_slots' }
);

providerAvailabilitySlotSchema.index({ provider: 1, slotDate: 1, status: 1 });
providerAvailabilitySlotSchema.index({ branch: 1, slotDate: 1, status: 1 });

// ─── TeleconsultationParticipant ──────────────────────────────────────────────

const teleconsultationParticipantSchema = new Schema(
  {
    teleconsultation: { type: Schema.Types.ObjectId, ref: 'Teleconsultation', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    participantType: {
      type: String,
      enum: ['provider', 'beneficiary', 'family_member', 'supervisor', 'interpreter'],
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestName: { type: String },
    guestPhone: { type: String },
    guestRelation: { type: String },
    roleInSession: { type: String, enum: ['observer', 'active_participant'], default: 'observer' },
    joinToken: { type: String },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    durationSeconds: { type: Number },
    audioEnabled: { type: Boolean, default: true },
    videoEnabled: { type: Boolean, default: true },
    consentGiven: { type: Boolean, default: false },
    connectionQuality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
    deviceInfo: { type: String },
  },
  { timestamps: true, collection: 'teleconsultation_participants' }
);

teleconsultationParticipantSchema.index({ teleconsultation: 1, participantType: 1 });

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  Teleconsultation: mongoose.model('Teleconsultation', teleconsultationSchema),
  VirtualSession: mongoose.model('VirtualSession', virtualSessionSchema),
  RemotePrescription: mongoose.model('RemotePrescription', remotePrescriptionSchema),
  TelehealthWaitingRoom: mongoose.model('TelehealthWaitingRoom', telehealthWaitingRoomSchema),
  SessionRecording: mongoose.model('SessionRecording', sessionRecordingSchema),
  TelehealthDevice: mongoose.model('TelehealthDevice', telehealthDeviceSchema),
  ProviderAvailabilitySlot: mongoose.model(
    'ProviderAvailabilitySlot',
    providerAvailabilitySlotSchema
  ),
  TeleconsultationParticipant: mongoose.model(
    'TeleconsultationParticipant',
    teleconsultationParticipantSchema
  ),
};
