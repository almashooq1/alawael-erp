/**
 * Public Relations Models — نظام العلاقات العامة والإعلام
 */
const mongoose = require('mongoose');

/* ── Media Coverage — التغطية الإعلامية ──────────────────── */
const mediaCoverageSchema = new mongoose.Schema(
  {
    coverageCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    type: {
      type: String,
      enum: ['press_release', 'news_article', 'tv_coverage', 'radio', 'social_media', 'interview', 'report', 'other'],
      default: 'press_release',
    },
    outlet: { name: String, type: { type: String, enum: ['newspaper', 'tv', 'radio', 'website', 'social_media', 'magazine'] }, contact: String },
    publicationDate: Date,
    content: String,
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    reach: { type: Number, default: 0 },
    url: String,
    attachments: [{ name: String, url: String }],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ── Campaign — الحملات الإعلامية ────────────────────────── */
const campaignSchema = new mongoose.Schema(
  {
    campaignCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    type: {
      type: String,
      enum: ['awareness', 'promotional', 'crisis', 'branding', 'community', 'internal', 'social_responsibility'],
      default: 'awareness',
    },
    description: String,
    objectives: [String],
    targetAudience: [String],
    channels: [{ type: String, enum: ['social_media', 'tv', 'radio', 'print', 'digital', 'outdoor', 'events'] }],
    startDate: Date,
    endDate: Date,
    budget: { estimated: { type: Number, default: 0 }, actual: { type: Number, default: 0 }, currency: { type: String, default: 'SAR' } },
    kpis: [{ metric: String, target: Number, actual: Number }],
    status: {
      type: String,
      enum: ['draft', 'planning', 'active', 'paused', 'completed', 'cancelled'],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ── Partnership — الشراكات ──────────────────────────────── */
const partnershipSchema = new mongoose.Schema(
  {
    partnerCode: { type: String, required: true, unique: true },
    partnerName: { type: String, required: true },
    type: {
      type: String,
      enum: ['strategic', 'media', 'sponsorship', 'community', 'academic', 'government', 'other'],
      default: 'strategic',
    },
    contactPerson: { name: String, email: String, phone: String },
    startDate: Date,
    endDate: Date,
    description: String,
    agreements: [{ title: String, signDate: Date, expiryDate: Date }],
    status: { type: String, enum: ['active', 'pending', 'expired', 'terminated'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const MediaCoverage = mongoose.models.MediaCoverage || mongoose.model('MediaCoverage', mediaCoverageSchema);
const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
const Partnership = mongoose.models.Partnership || mongoose.model('Partnership', partnershipSchema);

module.exports = { MediaCoverage, Campaign, Partnership };
