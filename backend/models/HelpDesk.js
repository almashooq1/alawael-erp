/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');
const { safeModel } = require('../utils/safeModel');

// ── نموذج التذكرة — Support Ticket ──────────────────────────────────
const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    titleEn: { type: String, default: '', trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'hardware',
        'software',
        'network',
        'access',
        'email',
        'printer',
        'phone',
        'security',
        'general',
        'other',
      ],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'reopened'],
      default: 'open',
    },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterDepartment: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: { type: String, default: '' },
    slaDeadline: { type: Date },
    slaBreached: { type: Boolean, default: false },
    resolution: { type: String, default: '' },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    attachments: [{ filename: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String },
        isInternal: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tags: [String],
    satisfaction: { rating: { type: Number, min: 1, max: 5 }, feedback: String, ratedAt: Date },
  },
  { timestamps: true }
);

// ticketNumber already has unique:true → index auto-created
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ requester: 1 });
ticketSchema.index({ assignedTo: 1 });

// Auto-generate ticket number
ticketSchema.pre('validate', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('HelpDeskTicket').countDocuments();
    this.ticketNumber = `HD-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── نموذج قاعدة المعرفة — Knowledge Article ─────────────────────────
const knowledgeArticleSchema = new mongoose.Schema(
  {
    articleCode: { type: String, required: true, unique: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    titleEn: { type: String, default: '', trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ['how_to', 'troubleshooting', 'faq', 'policy', 'guide', 'best_practice'],
      default: 'how_to',
    },
    tags: [String],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    views: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

knowledgeArticleSchema.index({ category: 1, status: 1 });
knowledgeArticleSchema.index({ tags: 1 });

const HelpDeskTicket = safeModel('HelpDeskTicket', ticketSchema);
const HelpDeskArticle = safeModel('HelpDeskArticle', knowledgeArticleSchema);

module.exports = { HelpDeskTicket, HelpDeskArticle };
