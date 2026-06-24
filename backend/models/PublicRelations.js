/**
 * Public Relations models — العلاقات العامة
 *
 * Missing dependency of the LIVE routes/public-relations.routes.js, which
 * resolves MediaCoverage / Partnership via require('../models/PublicRelations').
 * The model had been archived, so those endpoints threw at runtime.
 *
 * IMPORTANT: the archived file also registered a 'Campaign' model whose NAME
 * collides with the canonical donations model (models/Campaign.js). We
 * deliberately register ONLY MediaCoverage + Partnership here and do NOT
 * re-register 'Campaign' — the PR route's unused /campaigns endpoints fall back
 * to the donations Campaign harmlessly. Registration-guarded.
 */
const mongoose = require('mongoose');

const mediaCoverageSchema = new mongoose.Schema(
  {
    coverageCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'press_release',
        'news_article',
        'tv_coverage',
        'radio',
        'social_media',
        'interview',
        'report',
        'other',
      ],
      default: 'press_release',
    },
    outlet: {
      name: String,
      type: { type: String, enum: ['newspaper', 'tv', 'radio', 'website', 'social_media', 'magazine'] },
      contact: String,
    },
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

const MediaCoverage =
  mongoose.models.MediaCoverage || mongoose.model('MediaCoverage', mediaCoverageSchema);
const Partnership =
  mongoose.models.Partnership || mongoose.model('Partnership', partnershipSchema);

module.exports = { MediaCoverage, Partnership };
