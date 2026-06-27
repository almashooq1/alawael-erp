const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Parent Portal Schema
 * نموذج بوابة أولياء الأمور
 */
const AccessLogEntrySchema = new Schema({
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  details: { type: String },
}, { _id: false });

const NotificationPreferenceSchema = new Schema({
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  whatsapp: { type: Boolean, default: false },
  push: { type: Boolean, default: true },
}, { _id: false });

const PermissionSchema = new Schema({
  viewICF: { type: Boolean, default: true },
  viewCarePlan: { type: Boolean, default: true },
  viewSessions: { type: Boolean, default: true },
  viewReports: { type: Boolean, default: true },
  communicateWithTeam: { type: Boolean, default: true },
  scheduleAppointments: { type: Boolean, default: false },
  viewHomePrograms: { type: Boolean, default: true },
  signDocuments: { type: Boolean, default: false },
}, { _id: false });

const ParentPortalSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  beneficiaryId: {
    type: Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: true,
    index: true,
  },
  relationship: {
    type: String,
    enum: ['father', 'mother', 'guardian', 'sibling', 'other'],
    required: true,
  },
  isPrimaryContact: {
    type: Boolean,
    default: false,
  },
  permissions: {
    type: PermissionSchema,
    default: () => ({}),
  },
  notifications: {
    type: NotificationPreferenceSchema,
    default: () => ({}),
  },
  lastLoginAt: {
    type: Date,
  },
  accessLog: {
    type: [AccessLogEntrySchema],
    default: [],
  },
  preferences: {
    language: { type: String, default: 'ar' },
    timezone: { type: String, default: 'Asia/Riyadh' },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
ParentPortalSchema.index({ beneficiaryId: 1, isActive: 1 });
ParentPortalSchema.index({ userId: 1, beneficiaryId: 1 }, { unique: true });

module.exports = mongoose.model('ParentPortal', ParentPortalSchema);
