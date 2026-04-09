'use strict';
/**
 * DDD Health Education Service
 * ────────────────────────────
 * Phase 31 – Patient Engagement & Digital Health (Module 2/4)
 *
 * Manages health education content, learning paths for patients,
 * educational assessments, and patient literacy tracking.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const CONTENT_TYPES = [
  'article',
  'video',
  'infographic',
  'interactive',
  'quiz',
  'checklist',
  'guide',
  'animation',
  'audio',
  'webinar',
  'pamphlet',
  'ebook',
];

const CONTENT_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'published',
  'archived',
  'expired',
  'under_revision',
  'translated',
  'pending_translation',
  'rejected',
];

const HEALTH_TOPICS = [
  'rehabilitation',
  'nutrition',
  'exercise',
  'medication',
  'mental_health',
  'chronic_disease',
  'prevention',
  'post_surgery',
  'pain_management',
  'assistive_devices',
  'fall_prevention',
  'caregiver_support',
];

const TARGET_AUDIENCES = [
  'adult_patient',
  'pediatric_patient',
  'elderly_patient',
  'caregiver',
  'family_member',
  'parent',
  'adolescent',
  'pregnant_woman',
  'chronic_patient',
  'newly_diagnosed',
];

const LITERACY_LEVELS = [
  'basic',
  'intermediate',
  'advanced',
  'professional',
  'low_literacy',
  'visual_only',
  'audio_preferred',
  'multilingual',
  'simplified',
  'technical',
];

const LANGUAGE_OPTIONS = ['ar', 'en', 'ur', 'hi', 'tl', 'bn', 'fr', 'id', 'ms', 'am'];

const BUILTIN_EDUCATION_PROGRAMS = [
  { code: 'STROKE_REHAB', name: 'Stroke Rehabilitation Education', modules: 8 },
  { code: 'DIABETES_MGT', name: 'Diabetes Self-Management', modules: 10 },
  { code: 'FALL_PREV', name: 'Fall Prevention Program', modules: 5 },
  { code: 'PAIN_EDU', name: 'Pain Management Education', modules: 6 },
  { code: 'CARDIAC_RHB', name: 'Cardiac Rehabilitation Education', modules: 8 },
  { code: 'PEDS_DEV', name: 'Pediatric Development Milestones', modules: 12 },
  { code: 'MENTAL_WEL', name: 'Mental Wellness Program', modules: 7 },
  { code: 'CAREGIVER', name: 'Caregiver Training Program', modules: 9 },
  { code: 'NUTRITION', name: 'Nutrition & Healthy Eating', modules: 6 },
  { code: 'ASSIST_DEV', name: 'Assistive Device Training', modules: 5 },
];

/* ═══════════════════ Schemas ═══════════════════ */
const educationContentSchema = new Schema(
  {
    title: { type: String, required: true },
    contentType: { type: String, enum: CONTENT_TYPES, required: true },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    topic: { type: String, enum: HEALTH_TOPICS, required: true },
    targetAudience: [{ type: String, enum: TARGET_AUDIENCES }],
    literacyLevel: { type: String, enum: LITERACY_LEVELS, default: 'intermediate' },
    language: { type: String, enum: LANGUAGE_OPTIONS, default: 'ar' },
    body: { type: String },
    mediaUrl: { type: String },
    thumbnailUrl: { type: String },
    durationMinutes: { type: Number },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
educationContentSchema.index({ topic: 1, status: 1 });
educationContentSchema.index({ language: 1, literacyLevel: 1 });

const learningPathSchema = new Schema(
  {
    title: { type: String, required: true },
    programCode: { type: String },
    description: { type: String },
    topic: { type: String, enum: HEALTH_TOPICS },
    targetAudience: { type: String, enum: TARGET_AUDIENCES },
    modules: [
      {
        contentId: { type: Schema.Types.ObjectId, ref: 'DDDEducationContent' },
        order: Number,
        isRequired: { type: Boolean, default: true },
        estimatedMinutes: Number,
      },
    ],
    totalDuration: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    enrollmentCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
learningPathSchema.index({ topic: 1, isActive: 1 });

const educationAssessmentSchema = new Schema(
  {
    contentId: { type: Schema.Types.ObjectId, ref: 'DDDEducationContent' },
    pathId: { type: Schema.Types.ObjectId, ref: 'DDDLearningPath' },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    questions: [
      {
        question: String,
        options: [String],
        correctAnswer: Number,
        selectedAnswer: Number,
        isCorrect: Boolean,
      },
    ],
    score: { type: Number, min: 0, max: 100 },
    passedAt: { type: Date },
    attempts: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
educationAssessmentSchema.index({ beneficiaryId: 1, contentId: 1 });

const literacyTrackingSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessedLevel: { type: String, enum: LITERACY_LEVELS },
    preferredFormat: { type: String, enum: CONTENT_TYPES },
    preferredLanguage: { type: String, enum: LANGUAGE_OPTIONS },
    completedContents: [{ contentId: Schema.Types.ObjectId, completedAt: Date }],
    completedPaths: [{ pathId: Schema.Types.ObjectId, completedAt: Date, score: Number }],
    totalTimeSpent: { type: Number, default: 0 },
    engagementScore: { type: Number, min: 0, max: 100 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
literacyTrackingSchema.index({ beneficiaryId: 1 }, { unique: true });

/* ═══════════════════ Models ═══════════════════ */
const DDDEducationContent =
  mongoose.models.DDDEducationContent ||
  mongoose.model('DDDEducationContent', educationContentSchema);
const DDDLearningPath =
  mongoose.models.DDDLearningPath || mongoose.model('DDDLearningPath', learningPathSchema);
const DDDEducationAssessment =
  mongoose.models.DDDEducationAssessment ||
  mongoose.model('DDDEducationAssessment', educationAssessmentSchema);
const DDDLiteracyTracking =
  mongoose.models.DDDLiteracyTracking ||
  mongoose.model('DDDLiteracyTracking', literacyTrackingSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class HealthEducation {
  async createContent(data) {
    return DDDEducationContent.create(data);
  }
  async listContent(filter = {}, page = 1, limit = 20) {
    return DDDEducationContent.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getContentById(id) {
    await DDDEducationContent.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    return DDDEducationContent.findById(id).lean();
  }
  async updateContent(id, data) {
    return DDDEducationContent.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createPath(data) {
    return DDDLearningPath.create(data);
  }
  async listPaths(filter = {}) {
    return DDDLearningPath.find(filter).sort({ createdAt: -1 }).lean();
  }

  async submitAssessment(data) {
    return DDDEducationAssessment.create(data);
  }
  async listAssessments(filter = {}, page = 1, limit = 20) {
    return DDDEducationAssessment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async updateLiteracy(beneficiaryId, data) {
    return DDDLiteracyTracking.findOneAndUpdate({ beneficiaryId }, data, {
      upsert: true,
      new: true,
    }).lean();
  }
  async getLiteracy(beneficiaryId) {
    return DDDLiteracyTracking.findOne({ beneficiaryId }).lean();
  }

  async getEducationStats() {
    const [content, paths, assessments, trackers] = await Promise.all([
      DDDEducationContent.countDocuments({ status: 'published' }),
      DDDLearningPath.countDocuments({ isActive: true }),
      DDDEducationAssessment.countDocuments(),
      DDDLiteracyTracking.countDocuments(),
    ]);
    return {
      publishedContent: content,
      activePaths: paths,
      assessments,
      trackedPatients: trackers,
    };
  }

  async healthCheck() {
    const [content, paths, assessments, literacy] = await Promise.all([
      DDDEducationContent.countDocuments(),
      DDDLearningPath.countDocuments(),
      DDDEducationAssessment.countDocuments(),
      DDDLiteracyTracking.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'HealthEducation',
      counts: { content, paths, assessments, literacy },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createHealthEducationRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new HealthEducation();

  router.get('/health-education/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/health-education/content', async (req, res) => {
    try {
      res.status(201).json(await svc.createContent(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/health-education/content', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listContent(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/health-education/content/:id', async (req, res) => {
    try {
      res.json(await svc.getContentById(req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/health-education/content/:id', async (req, res) => {
    try {
      res.json(await svc.updateContent(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/health-education/paths', async (req, res) => {
    try {
      res.status(201).json(await svc.createPath(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/health-education/paths', async (req, res) => {
    try {
      res.json(await svc.listPaths(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/health-education/assessments', async (req, res) => {
    try {
      res.status(201).json(await svc.submitAssessment(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/health-education/assessments', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAssessments(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/health-education/stats', async (_req, res) => {
    try {
      res.json(await svc.getEducationStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CONTENT_TYPES,
  CONTENT_STATUSES,
  HEALTH_TOPICS,
  TARGET_AUDIENCES,
  LITERACY_LEVELS,
  LANGUAGE_OPTIONS,
  BUILTIN_EDUCATION_PROGRAMS,
  DDDEducationContent,
  DDDLearningPath,
  DDDEducationAssessment,
  DDDLiteracyTracking,
  HealthEducation,
  createHealthEducationRouter,
};
