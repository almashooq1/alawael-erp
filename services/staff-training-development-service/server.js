'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const trainingProgramSchema = new mongoose.Schema(
  {
    programNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    type: {
      type: String,
      enum: [
        'workshop',
        'seminar',
        'course',
        'conference',
        'certification',
        'mentoring',
        'on-the-job',
        'e-learning',
        'orientation',
        'safety-training',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'teaching',
        'administration',
        'technology',
        'leadership',
        'safety',
        'special-needs',
        'health',
        'language',
        'soft-skills',
        'compliance',
        'other',
      ],
      default: 'other',
    },
    description: String,
    objectives: [String],
    targetAudience: [{ department: String, roles: [String] }],
    provider: { name: String, type: { type: String, enum: ['internal', 'external', 'online'] }, contact: String },
    trainer: { name: String, qualifications: String, bio: String },
    schedule: {
      startDate: Date,
      endDate: Date,
      sessions: [{ date: Date, startTime: String, endTime: String, topic: String, location: String }],
    },
    duration: { hours: Number, days: Number },
    location: { venue: String, address: String, isOnline: Boolean, meetingLink: String },
    capacity: Number,
    cost: { perPerson: Number, total: Number, currency: { type: String, default: 'SAR' } },
    materials: [{ title: String, type: String, url: String }],
    prerequisites: [String],
    certification: { offered: Boolean, name: String, validityYears: Number, issuingBody: String },
    evaluation: { method: String, passingScore: Number },
    status: { type: String, enum: ['planned', 'open-registration', 'in-progress', 'completed', 'cancelled'], default: 'planned' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

trainingProgramSchema.pre('save', async function (next) {
  if (!this.programNo) {
    const count = await this.constructor.countDocuments();
    this.programNo = `TP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const trainingEnrollmentSchema = new mongoose.Schema(
  {
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram', required: true },
    employeeId: { type: String, required: true },
    employeeName: String,
    department: String,
    position: String,
    enrollDate: { type: Date, default: Date.now },
    attendance: [{ sessionDate: Date, status: { type: String, enum: ['present', 'absent', 'excused', 'late'] } }],
    assessment: { score: Number, maxScore: Number, percentage: Number, passed: Boolean, assessDate: Date },
    feedback: { rating: Number, strengths: String, improvements: String, recommend: Boolean, comments: String },
    certificate: { issued: Boolean, issueDate: Date, certificateNo: String, expiryDate: Date },
    status: { type: String, enum: ['enrolled', 'in-progress', 'completed', 'withdrawn', 'failed'], default: 'enrolled' },
    approvedBy: { userId: String, name: String },
  },
  { timestamps: true },
);

trainingEnrollmentSchema.index({ programId: 1, employeeId: 1 }, { unique: true });

const developmentPlanSchema = new mongoose.Schema(
  {
    planNo: { type: String, unique: true },
    employeeId: { type: String, required: true },
    employeeName: String,
    department: String,
    position: String,
    academicYear: String,
    goals: [
      {
        title: String,
        category: String,
        description: String,
        targetDate: Date,
        kpis: [{ metric: String, target: String, actual: String }],
        resources: [String],
        status: { type: String, enum: ['not-started', 'in-progress', 'completed', 'deferred'], default: 'not-started' },
        progress: { type: Number, default: 0 },
      },
    ],
    competencies: [
      {
        name: String,
        currentLevel: { type: Number, min: 1, max: 5 },
        targetLevel: { type: Number, min: 1, max: 5 },
        gap: Number,
        actions: [String],
      },
    ],
    mentorId: String,
    mentorName: String,
    reviews: [{ date: Date, reviewer: String, comments: String, overallRating: Number }],
    overallProgress: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'active', 'completed', 'archived'], default: 'draft' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

developmentPlanSchema.pre('save', async function (next) {
  if (!this.planNo) {
    const count = await this.constructor.countDocuments();
    this.planNo = `DP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.goals?.length) {
    this.overallProgress = Math.round(this.goals.reduce((s, g) => s + (g.progress || 0), 0) / this.goals.length);
  }
  if (this.competencies?.length) {
    this.competencies.forEach(c => {
      c.gap = (c.targetLevel || 0) - (c.currentLevel || 0);
    });
  }
  next();
});

const TrainingProgram = mongoose.model('TrainingProgram', trainingProgramSchema);
const TrainingEnrollment = mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);
const DevelopmentPlan = mongoose.model('DevelopmentPlan', developmentPlanSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_training';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3530;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const trainingQueue = new Queue('training-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'staff-training-development-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// Training Programs
app.post('/api/training-programs', async (req, res) => {
  try {
    res.status(201).json(await TrainingProgram.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/training-programs', async (req, res) => {
  const { type, category, status, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (category) q.category = category;
  if (status) q.status = status;
  if (search) q.$or = [{ titleAr: new RegExp(search, 'i') }, { titleEn: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    TrainingProgram.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ 'schedule.startDate': -1 }),
    TrainingProgram.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/training-programs/:id', async (req, res) => {
  const p = await TrainingProgram.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'البرنامج غير موجود' });
  const enrollments = await TrainingEnrollment.find({ programId: p._id });
  res.json({ ...p.toObject(), enrollments, enrollmentCount: enrollments.length });
});
app.put('/api/training-programs/:id', async (req, res) => {
  res.json(await TrainingProgram.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Enrollments
app.post('/api/training-enrollments', async (req, res) => {
  try {
    res.status(201).json(await TrainingEnrollment.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/training-enrollments', async (req, res) => {
  const { programId, employeeId, status } = req.query;
  const q = {};
  if (programId) q.programId = programId;
  if (employeeId) q.employeeId = employeeId;
  if (status) q.status = status;
  res.json(await TrainingEnrollment.find(q).populate('programId', 'titleAr type category').sort({ enrollDate: -1 }));
});
app.put('/api/training-enrollments/:id', async (req, res) => {
  res.json(await TrainingEnrollment.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Development Plans
app.post('/api/development-plans', async (req, res) => {
  try {
    res.status(201).json(await DevelopmentPlan.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/development-plans', async (req, res) => {
  const { employeeId, department, status } = req.query;
  const q = {};
  if (employeeId) q.employeeId = employeeId;
  if (department) q.department = department;
  if (status) q.status = status;
  res.json(await DevelopmentPlan.find(q).sort({ createdAt: -1 }));
});
app.put('/api/development-plans/:id', async (req, res) => {
  res.json(await DevelopmentPlan.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Dashboard
app.get('/api/training/dashboard', async (_req, res) => {
  const cacheKey = 'training:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [activePrograms, totalEnrollments, completedThisYear, avgSatisfaction] = await Promise.all([
    TrainingProgram.countDocuments({ status: { $in: ['open-registration', 'in-progress'] } }),
    TrainingEnrollment.countDocuments({ status: { $in: ['enrolled', 'in-progress'] } }),
    TrainingEnrollment.countDocuments({ status: 'completed', updatedAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } }),
    TrainingEnrollment.aggregate([
      { $match: { 'feedback.rating': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$feedback.rating' } } },
    ]),
  ]);
  const result = { activePrograms, totalEnrollments, completedThisYear, avgSatisfaction: avgSatisfaction[0]?.avg?.toFixed(1) || 0 };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — staff-training-development');
    app.listen(PORT, () => console.log(`📖 Staff-Training-Development Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
