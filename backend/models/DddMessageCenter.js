'use strict';
/**
 * DddMessageCenter — Mongoose Models & Constants
 * Auto-extracted from services/dddMessageCenter.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const CONVERSATION_TYPES = [
  'direct',
  'group',
  'clinical_team',
  'family_communication',
  'case_discussion',
  'broadcast',
  'support_ticket',
  'referral',
  'consultation',
  'emergency',
  'department_channel',
  'announcement',
];

const CONVERSATION_STATUSES = [
  'active',
  'archived',
  'closed',
  'muted',
  'blocked',
  'pending',
  'locked',
  'flagged',
  'resolved',
  'deleted',
];

const MESSAGE_TYPES = [
  'text',
  'image',
  'file',
  'audio',
  'video',
  'location',
  'clinical_note',
  'assessment_link',
  'appointment_request',
  'system',
  'template',
  'rich_text',
];

const MESSAGE_STATUSES = [
  'draft',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'recalled',
  'expired',
  'flagged',
  'deleted',
];

const TEMPLATE_CATEGORIES = [
  'appointment_reminder',
  'session_summary',
  'progress_update',
  'billing_notice',
  'welcome_message',
  'discharge_summary',
  'follow_up',
  'consent_request',
  'feedback_request',
  'emergency_alert',
  'general',
  'clinical',
];

const MESSAGE_PRIORITIES = ['low', 'normal', 'high', 'urgent', 'critical', 'emergency'];

/* ── Built-in message templates ─────────────────────────────────────────── */
const BUILTIN_TEMPLATES = [
  {
    code: 'TPL-APPT-REM',
    name: 'Appointment Reminder',
    category: 'appointment_reminder',
    subject: 'Upcoming Appointment',
    bodyTemplate: 'Dear {{name}}, your appointment is on {{date}} at {{time}}.',
  },
  {
    code: 'TPL-SESS-SUM',
    name: 'Session Summary',
    category: 'session_summary',
    subject: 'Session Summary',
    bodyTemplate: 'Session on {{date}}: Goals addressed: {{goals}}. Progress: {{progress}}.',
  },
  {
    code: 'TPL-PROG-UPD',
    name: 'Progress Update',
    category: 'progress_update',
    subject: 'Progress Report',
    bodyTemplate: 'Dear {{familyName}}, here is the latest progress for {{beneficiaryName}}.',
  },
  {
    code: 'TPL-BILL-NOT',
    name: 'Billing Notice',
    category: 'billing_notice',
    subject: 'Invoice Available',
    bodyTemplate: 'Invoice #{{invoiceNumber}} for {{amount}} is now available.',
  },
  {
    code: 'TPL-WELCOME',
    name: 'Welcome Message',
    category: 'welcome_message',
    subject: 'Welcome to Our Center',
    bodyTemplate: 'Welcome {{name}}! We are glad to have you join our rehabilitation program.',
  },
  {
    code: 'TPL-DISCHARGE',
    name: 'Discharge Summary',
    category: 'discharge_summary',
    subject: 'Discharge Summary',
    bodyTemplate: 'Discharge summary for {{beneficiaryName}}, discharged on {{date}}.',
  },
  {
    code: 'TPL-FOLLOWUP',
    name: 'Follow Up',
    category: 'follow_up',
    subject: 'Follow-Up Reminder',
    bodyTemplate: 'Dear {{name}}, this is a follow-up regarding your recent visit on {{date}}.',
  },
  {
    code: 'TPL-CONSENT',
    name: 'Consent Request',
    category: 'consent_request',
    subject: 'Consent Required',
    bodyTemplate: 'Dear {{name}}, please review and sign the consent form for {{procedure}}.',
  },
  {
    code: 'TPL-FEEDBACK',
    name: 'Feedback Request',
    category: 'feedback_request',
    subject: 'Your Feedback Matters',
    bodyTemplate: 'Dear {{name}}, please share your experience with us.',
  },
  {
    code: 'TPL-EMERGENCY',
    name: 'Emergency Alert',
    category: 'emergency_alert',
    subject: 'Emergency Alert',
    bodyTemplate: 'URGENT: {{message}}. Please respond immediately.',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Conversation ──────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const conversationSchema = new Schema(
  {
    conversationCode: { type: String, required: true, unique: true },
    type: { type: String, enum: CONVERSATION_TYPES, required: true },
    status: { type: String, enum: CONVERSATION_STATUSES, default: 'active' },
    title: { type: String },
    participants: [
      {
        userId: Schema.Types.ObjectId,
        role: String,
        joinedAt: { type: Date, default: Date.now },
        lastReadAt: Date,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },
    messageCount: { type: Number, default: 0 },
    isEncrypted: { type: Boolean, default: false },
    tags: [{ type: String }],
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

conversationSchema.index({ 'participants.userId': 1, status: 1 });
conversationSchema.index({ type: 1, status: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const DDDConversation =
  mongoose.models.DDDConversation || mongoose.model('DDDConversation', conversationSchema);

/* ── Message ───────────────────────────────────────────────────────────── */
const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'DDDConversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'sent' },
    priority: { type: String, enum: MESSAGE_PRIORITIES, default: 'normal' },
    content: { type: String, required: true },
    subject: { type: String },
    attachments: [{ name: String, url: String, mimeType: String, size: Number }],
    replyTo: { type: Schema.Types.ObjectId, ref: 'DDDMessage' },
    readBy: [{ userId: Schema.Types.ObjectId, readAt: Date }],
    reactions: [{ userId: Schema.Types.ObjectId, emoji: String }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    deletedAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

const messageTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: TEMPLATE_CATEGORIES, required: true },
    subject: { type: String },
    bodyTemplate: { type: String, required: true },
    bodyTemplateAr: { type: String },
    variables: [{ name: String, description: String, required: Boolean }],
    channels: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageTemplateSchema.index({ category: 1, isActive: 1 });

const DDDMessageTemplate =
  mongoose.models.DDDMessageTemplate || mongoose.model('DDDMessageTemplate', messageTemplateSchema);

/* ── Message Draft ─────────────────────────────────────────────────────── */
const messageDraftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'DDDConversation' },
    recipientIds: [{ type: Schema.Types.ObjectId }],
    subject: { type: String },
    content: { type: String },
    attachments: [{ name: String, url: String, mimeType: String }],
    templateId: { type: Schema.Types.ObjectId, ref: 'DDDMessageTemplate' },
    scheduledAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageDraftSchema.index({ userId: 1, updatedAt: -1 });

const DDDMessageDraft =
  mongoose.models.DDDMessageDraft || mongoose.model('DDDMessageDraft', messageDraftSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDMessage = mongoose.models.DDDMessage || mongoose.model('DDDMessage', messageSchema);

/* ── Message Template ──────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
  MESSAGE_TYPES,
  MESSAGE_STATUSES,
  TEMPLATE_CATEGORIES,
  MESSAGE_PRIORITIES,
  BUILTIN_TEMPLATES,
  DDDConversation,
  DDDMessage,
  DDDMessageTemplate,
  DDDMessageDraft,
};
