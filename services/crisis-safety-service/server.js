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

/* ═══════════════════════════════════════════════════════════════
   Schemas
   ═══════════════════════════════════════════════════════════════ */

const emergencyPlanSchema = new mongoose.Schema(
  {
    planNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: {
      type: String,
      enum: [
        'fire',
        'earthquake',
        'flood',
        'lockdown',
        'medical',
        'chemical',
        'storm',
        'bomb-threat',
        'active-shooter',
        'pandemic',
        'general',
      ],
      required: true,
    },
    version: { type: String, default: '1.0' },
    scope: String,
    objectives: [String],
    procedures: [
      {
        stepNo: Number,
        titleAr: String,
        description: String,
        responsible: { role: String, name: String, phone: String },
        timeframe: String,
        resources: [String],
      },
    ],
    assemblyPoints: [{ nameAr: String, location: String, capacity: Number, primaryFor: [String] }],
    emergencyContacts: [{ role: String, name: String, phone: String, altPhone: String, priority: Number }],
    equipment: [{ item: String, location: String, quantity: Number, lastChecked: Date }],
    evacuationRoutes: [{ from: String, to: String, primaryRoute: String, alternateRoute: String }],
    trainingSchedule: [{ type: String, frequency: String, lastConducted: Date, nextDue: Date }],
    status: { type: String, enum: ['draft', 'review', 'approved', 'active', 'archived'], default: 'draft' },
    approvedBy: { userId: String, name: String, date: Date },
    lastReviewDate: Date,
    nextReviewDate: Date,
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

emergencyPlanSchema.pre('save', async function (next) {
  if (!this.planNo) {
    const count = await this.constructor.countDocuments();
    this.planNo = `EP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const crisisIncidentSchema = new mongoose.Schema(
  {
    incidentNo: { type: String, unique: true },
    type: {
      type: String,
      enum: [
        'fire',
        'earthquake',
        'flood',
        'lockdown',
        'medical-emergency',
        'chemical-spill',
        'structural',
        'security-threat',
        'weather',
        'pandemic',
        'utility-failure',
        'other',
      ],
      required: true,
    },
    severity: { type: String, enum: ['level-1-minor', 'level-2-moderate', 'level-3-major', 'level-4-critical'], required: true },
    title: String,
    description: String,
    location: { building: String, floor: String, room: String, area: String },
    reportedAt: { type: Date, default: Date.now },
    reportedBy: { userId: String, name: String, phone: String },
    affectedPersons: { students: Number, staff: Number, visitors: Number, total: Number },
    injuries: [{ name: String, type: String, severity: String, treatment: String, hospitalized: Boolean }],
    evacuationInitiated: { type: Boolean, default: false },
    evacuationTime: Date,
    evacuationComplete: Date,
    headcount: { expected: Number, accounted: Number, missing: Number, status: String },
    civilDefenseNotified: { type: Boolean, default: false },
    civilDefenseRef: String,
    ambulanceCalled: { type: Boolean, default: false },
    responseTeam: [{ userId: String, name: String, role: String, arrivedAt: Date }],
    actions: [{ timestamp: Date, action: String, by: String, notes: String }],
    resolution: { resolvedAt: Date, summary: String, rootCause: String, preventiveMeasures: [String] },
    status: {
      type: String,
      enum: ['reported', 'responding', 'contained', 'resolved', 'closed', 'under-investigation'],
      default: 'reported',
    },
    attachments: [String],
  },
  { timestamps: true },
);

crisisIncidentSchema.pre('save', async function (next) {
  if (!this.incidentNo) {
    const count = await this.constructor.countDocuments();
    this.incidentNo = `CRI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const safetyInspectionSchema = new mongoose.Schema(
  {
    inspectionNo: { type: String, unique: true },
    type: {
      type: String,
      enum: ['fire-safety', 'electrical', 'structural', 'playground', 'lab', 'kitchen', 'general', 'civil-defense', 'annual'],
      required: true,
    },
    building: String,
    area: String,
    scheduledDate: Date,
    conductedDate: Date,
    inspector: { userId: String, name: String, certification: String },
    externalInspector: { name: String, company: String, licenseNo: String },
    checklist: [
      {
        item: String,
        category: String,
        status: { type: String, enum: ['pass', 'fail', 'not-applicable', 'needs-attention'] },
        notes: String,
        photo: String,
        priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      },
    ],
    summary: { totalItems: Number, passed: Number, failed: Number, needsAttention: Number },
    overallResult: { type: String, enum: ['pass', 'conditional-pass', 'fail'] },
    correctiveActions: [{ issue: String, action: String, assignedTo: String, dueDate: Date, status: String }],
    followUpDate: Date,
    status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'follow-up-needed'], default: 'scheduled' },
    attachments: [String],
  },
  { timestamps: true },
);

safetyInspectionSchema.pre('save', async function (next) {
  if (!this.inspectionNo) {
    const count = await this.constructor.countDocuments();
    this.inspectionNo = `SI-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.checklist?.length) {
    this.summary = {
      totalItems: this.checklist.length,
      passed: this.checklist.filter(c => c.status === 'pass').length,
      failed: this.checklist.filter(c => c.status === 'fail').length,
      needsAttention: this.checklist.filter(c => c.status === 'needs-attention').length,
    };
  }
  next();
});

const drillLogSchema = new mongoose.Schema(
  {
    drillNo: { type: String, unique: true },
    type: { type: String, enum: ['fire', 'earthquake', 'lockdown', 'evacuation', 'medical', 'chemical', 'full-scale'], required: true },
    title: String,
    scheduledDate: Date,
    conducteDate: Date,
    startTime: String,
    endTime: String,
    duration: Number,
    participants: { students: Number, staff: Number, total: Number },
    evacuationTime: Number,
    assemblyPointUsed: String,
    observations: [{ item: String, rating: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] }, notes: String }],
    issues: [{ description: String, severity: String, corrective: String }],
    score: Number,
    result: { type: String, enum: ['successful', 'partial', 'failed'] },
    conductedBy: { userId: String, name: String },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

drillLogSchema.pre('save', async function (next) {
  if (!this.drillNo) {
    const count = await this.constructor.countDocuments();
    this.drillNo = `DRL-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

const EmergencyPlan = mongoose.model('EmergencyPlan', emergencyPlanSchema);
const CrisisIncident = mongoose.model('CrisisIncident', crisisIncidentSchema);
const SafetyInspection = mongoose.model('SafetyInspection', safetyInspectionSchema);
const DrillLog = mongoose.model('DrillLog', drillLogSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_crisis';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3490;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const crisisQueue = new Queue('crisis-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({ status: mongo && red ? 'ok' : 'degraded', service: 'crisis-safety-service', mongo, redis: red, uptime: process.uptime() });
});

// Emergency Plans
app.post('/api/emergency-plans', async (req, res) => {
  try {
    res.status(201).json(await EmergencyPlan.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/emergency-plans', async (req, res) => {
  const { type, status } = req.query;
  const q = {};
  if (type) q.type = type;
  if (status) q.status = status;
  res.json(await EmergencyPlan.find(q).sort({ type: 1 }));
});
app.get('/api/emergency-plans/:id', async (req, res) => {
  const p = await EmergencyPlan.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'الخطة غير موجودة' });
  res.json(p);
});
app.put('/api/emergency-plans/:id', async (req, res) => {
  res.json(await EmergencyPlan.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Crisis Incidents
app.post('/api/crisis-incidents', async (req, res) => {
  try {
    const inc = await CrisisIncident.create(req.body);
    if (inc.severity === 'level-3-major' || inc.severity === 'level-4-critical') {
      await crisisQueue.add('critical-alert', { incidentId: inc._id.toString(), severity: inc.severity, type: inc.type });
    }
    res.status(201).json(inc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/crisis-incidents', async (req, res) => {
  const { status, severity, type, from, to } = req.query;
  const q = {};
  if (status) q.status = status;
  if (severity) q.severity = severity;
  if (type) q.type = type;
  if (from || to) {
    q.reportedAt = {};
    if (from) q.reportedAt.$gte = new Date(from);
    if (to) q.reportedAt.$lte = new Date(to);
  }
  res.json(await CrisisIncident.find(q).sort({ reportedAt: -1 }));
});
app.put('/api/crisis-incidents/:id', async (req, res) => {
  res.json(await CrisisIncident.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
app.post('/api/crisis-incidents/:id/action', async (req, res) => {
  const inc = await CrisisIncident.findById(req.params.id);
  if (!inc) return res.status(404).json({ error: 'الحادثة غير موجودة' });
  inc.actions.push({ ...req.body, timestamp: new Date() });
  await inc.save();
  res.json(inc);
});

// Safety Inspections
app.post('/api/safety-inspections', async (req, res) => {
  try {
    res.status(201).json(await SafetyInspection.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/safety-inspections', async (req, res) => {
  const { type, status, building } = req.query;
  const q = {};
  if (type) q.type = type;
  if (status) q.status = status;
  if (building) q.building = building;
  res.json(await SafetyInspection.find(q).sort({ conductedDate: -1 }));
});
app.put('/api/safety-inspections/:id', async (req, res) => {
  res.json(await SafetyInspection.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Drill Logs
app.post('/api/drills', async (req, res) => {
  try {
    res.status(201).json(await DrillLog.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/drills', async (req, res) => {
  const { type, result } = req.query;
  const q = {};
  if (type) q.type = type;
  if (result) q.result = result;
  res.json(await DrillLog.find(q).sort({ conducteDate: -1 }));
});

// Dashboard
app.get('/api/crisis/dashboard', async (_req, res) => {
  const cacheKey = 'crisis:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [activePlans, activeIncidents, pendingInspections, drillsThisYear] = await Promise.all([
    EmergencyPlan.countDocuments({ status: 'active' }),
    CrisisIncident.countDocuments({ status: { $in: ['reported', 'responding', 'contained'] } }),
    SafetyInspection.countDocuments({ status: { $in: ['scheduled', 'follow-up-needed'] } }),
    DrillLog.countDocuments({ conducteDate: { $gte: new Date(new Date().getFullYear(), 0, 1) } }),
  ]);
  const result = { activePlans, activeIncidents, pendingInspections, drillsThisYear };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
  res.json(result);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — crisis-safety');
    app.listen(PORT, () => console.log(`🚨 Crisis-Safety Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
