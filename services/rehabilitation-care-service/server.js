'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3400;
app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_rehab', { maxPoolSize: 15 })
  .then(() => console.log('✅ Rehab DB connected'));
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/7');
const notifyQueue = new Queue('rehab-notifications', { connection: redis });

/* ─── Schemas ─── */
const beneficiarySchema = new mongoose.Schema(
  {
    fileNumber: { type: String, unique: true },
    fullName: { ar: String, en: String },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },
    nationalId: String,
    guardian: { name: { ar: String, en: String }, phone: String, email: String, relation: String },
    disabilityType: {
      type: String,
      enum: ['physical', 'intellectual', 'visual', 'hearing', 'speech', 'autism', 'down-syndrome', 'cerebral-palsy', 'multiple', 'other'],
    },
    disabilitySeverity: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
    disabilityCard: { number: String, issueDate: Date, expiryDate: Date, authority: String },
    icfCodes: [{ code: String, qualifier: Number, description: String }],
    allergies: [String],
    medications: [{ name: String, dosage: String, frequency: String }],
    insuranceInfo: { provider: String, policyNumber: String, expiryDate: Date },
    referralSource: String,
    admissionDate: Date,
    dischargeDate: Date,
    status: { type: String, enum: ['active', 'discharged', 'waitlist', 'suspended'], default: 'active' },
    branch: String,
  },
  { timestamps: true },
);
beneficiarySchema.index({ 'fullName.ar': 'text', 'fullName.en': 'text' });
const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

const therapistSchema = new mongoose.Schema(
  {
    employeeId: String,
    fullName: { ar: String, en: String },
    specialization: {
      type: String,
      enum: ['OT', 'PT', 'SLP', 'psychology', 'behavior', 'special-education', 'social-work', 'music-therapy', 'art-therapy'],
    },
    license: { number: String, issueDate: Date, expiryDate: Date },
    availability: [
      {
        dayOfWeek: Number,
        startTime: String,
        endTime: String,
      },
    ],
    maxCaseload: { type: Number, default: 15 },
    currentCaseload: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Therapist = mongoose.model('Therapist', therapistSchema);

const iepSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    academicYear: String,
    startDate: Date,
    endDate: Date,
    teamMembers: [{ therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' }, role: String }],
    presentLevels: {
      cognitive: String,
      communication: String,
      motor: String,
      social: String,
      selfCare: String,
      behavior: String,
    },
    goals: [
      {
        domain: {
          type: String,
          enum: ['cognitive', 'communication', 'motor-gross', 'motor-fine', 'social', 'self-care', 'behavior', 'academic', 'vocational'],
        },
        longTerm: { ar: String, en: String },
        shortTermObjectives: [
          {
            description: { ar: String, en: String },
            criteria: String,
            targetDate: Date,
            status: { type: String, enum: ['not-started', 'in-progress', 'achieved', 'modified', 'discontinued'], default: 'not-started' },
            progress: [{ date: Date, percentage: Number, notes: String, measuredBy: mongoose.Schema.Types.ObjectId }],
          },
        ],
        baseline: String,
        measurement: String,
      },
    ],
    accommodations: [{ type: String, description: String }],
    services: [{ type: String, frequency: String, duration: String, provider: mongoose.Schema.Types.ObjectId }],
    guardianConsent: { signed: Boolean, date: Date, signedBy: String },
    reviewDates: [Date],
    status: { type: String, enum: ['draft', 'active', 'review', 'completed'], default: 'draft' },
  },
  { timestamps: true },
);
const IEP = mongoose.model('IEP', iepSchema);

const sessionSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', index: true },
    iep: { type: mongoose.Schema.Types.ObjectId, ref: 'IEP' },
    sessionType: { type: String, enum: ['individual', 'group', 'assessment', 'consultation', 'home-visit', 'telehealth'] },
    specialization: String,
    scheduledDate: Date,
    startTime: String,
    endTime: String,
    duration: Number, // minutes
    room: String,
    status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
    objectives: [{ description: String, goalsAddressed: [mongoose.Schema.Types.ObjectId] }],
    notes: {
      subjective: String, // Parent/beneficiary report
      objective: String, // Therapist observation
      assessment: String, // Clinical reasoning
      plan: String, // Next steps
    },
    attendance: {
      beneficiaryPresent: Boolean,
      guardianPresent: Boolean,
      lateMinutes: Number,
    },
    measurements: [{ scale: String, score: Number, previousScore: Number }],
    attachments: [{ name: String, url: String, type: String }],
    cancelReason: String,
  },
  { timestamps: true },
);
sessionSchema.index({ scheduledDate: 1, therapist: 1 });
const TherapySession = mongoose.model('TherapySession', sessionSchema);

const assessmentSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    assessor: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' },
    type: { type: String, enum: ['initial', 'progress', 'discharge', 'annual', 'specialized'] },
    tool: String, // e.g. Vineland, ABLLS-R, PEP-3, etc.
    domain: String,
    scores: mongoose.Schema.Types.Mixed,
    rawScore: Number,
    standardScore: Number,
    percentile: Number,
    ageEquivalent: String,
    interpretation: String,
    recommendations: [String],
    date: Date,
    nextAssessmentDate: Date,
    attachments: [String],
  },
  { timestamps: true },
);
const Assessment = mongoose.model('Assessment', assessmentSchema);

const mdtSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    meetingDate: Date,
    type: { type: String, enum: ['initial-review', 'progress-review', 'iep-review', 'discharge-planning', 'crisis'] },
    attendees: [{ therapist: mongoose.Schema.Types.ObjectId, role: String, attended: Boolean }],
    agenda: [String],
    decisions: [{ description: String, responsible: mongoose.Schema.Types.ObjectId, deadline: Date, status: String }],
    minutes: String,
    nextMeeting: Date,
  },
  { timestamps: true },
);
const MDTMeeting = mongoose.model('MDTMeeting', mdtSchema);

const treatmentAuthSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    insuranceProvider: String,
    requestDate: Date,
    services: [{ type: String, sessions: Number, frequency: String }],
    diagnosisCodes: [String],
    approvedSessions: Number,
    approvedUntil: Date,
    status: { type: String, enum: ['pending', 'approved', 'denied', 'expired', 'renewed'], default: 'pending' },
    referenceNumber: String,
    notes: String,
  },
  { timestamps: true },
);
const TreatmentAuth = mongoose.model('TreatmentAuth', treatmentAuthSchema);

/* ─── Beneficiary Routes ─── */
app.get('/api/beneficiaries', async (req, res) => {
  const { page = 1, limit = 20, status, disabilityType, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (disabilityType) filter.disabilityType = disabilityType;
  if (search) filter.$text = { $search: search };
  const [beneficiaries, total] = await Promise.all([
    Beneficiary.find(filter)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Beneficiary.countDocuments(filter),
  ]);
  res.json({ beneficiaries, total, page: +page, pages: Math.ceil(total / limit) });
});

app.post('/api/beneficiaries', async (req, res) => {
  try {
    const count = await Beneficiary.countDocuments();
    const fileNumber = `BEN-${String(count + 1).padStart(5, '0')}`;
    const b = await Beneficiary.create({ ...req.body, fileNumber });
    res.status(201).json(b);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/beneficiaries/:id', async (req, res) => {
  const b = await Beneficiary.findById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  res.json(b);
});

app.put('/api/beneficiaries/:id', async (req, res) => {
  const b = await Beneficiary.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(b);
});

// Beneficiary dashboard
app.get('/api/beneficiaries/:id/dashboard', async (req, res) => {
  const id = req.params.id;
  const [beneficiary, activeIEP, recentSessions, assessments, upcomingSessions, mdtMeetings] = await Promise.all([
    Beneficiary.findById(id),
    IEP.findOne({ beneficiary: id, status: 'active' }).populate('teamMembers.therapist'),
    TherapySession.find({ beneficiary: id, status: 'completed' }).sort({ scheduledDate: -1 }).limit(10).populate('therapist'),
    Assessment.find({ beneficiary: id }).sort({ date: -1 }).limit(5).populate('assessor'),
    TherapySession.find({ beneficiary: id, status: 'scheduled', scheduledDate: { $gte: new Date() } })
      .sort({ scheduledDate: 1 })
      .limit(5)
      .populate('therapist'),
    MDTMeeting.find({ beneficiary: id }).sort({ meetingDate: -1 }).limit(3),
  ]);
  res.json({ beneficiary, activeIEP, recentSessions, assessments, upcomingSessions, mdtMeetings });
});

/* ─── Therapist Routes ─── */
app.get('/api/therapists', async (req, res) => {
  const filter = req.query.specialization ? { specialization: req.query.specialization, isActive: true } : { isActive: true };
  res.json(await Therapist.find(filter));
});

app.post('/api/therapists', async (req, res) => {
  try {
    res.status(201).json(await Therapist.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/therapists/:id/schedule', async (req, res) => {
  const { startDate, endDate } = req.query;
  const sessions = await TherapySession.find({
    therapist: req.params.id,
    scheduledDate: { $gte: new Date(startDate || Date.now()), $lte: new Date(endDate || Date.now() + 7 * 86400000) },
    status: { $ne: 'cancelled' },
  })
    .populate('beneficiary')
    .sort({ scheduledDate: 1 });
  res.json(sessions);
});

/* ─── IEP Routes ─── */
app.get('/api/ieps', async (req, res) => {
  const filter = {};
  if (req.query.beneficiary) filter.beneficiary = req.query.beneficiary;
  if (req.query.status) filter.status = req.query.status;
  const ieps = await IEP.find(filter).populate('beneficiary teamMembers.therapist').sort({ createdAt: -1 });
  res.json(ieps);
});

app.post('/api/ieps', async (req, res) => {
  try {
    res.status(201).json(await IEP.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/ieps/:id', async (req, res) => {
  const iep = await IEP.findById(req.params.id).populate('beneficiary teamMembers.therapist');
  if (!iep) return res.status(404).json({ error: 'Not found' });
  res.json(iep);
});

app.put('/api/ieps/:id', async (req, res) => {
  const iep = await IEP.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(iep);
});

// Update IEP goal progress
app.post('/api/ieps/:id/goals/:goalIdx/progress', async (req, res) => {
  const iep = await IEP.findById(req.params.id);
  if (!iep) return res.status(404).json({ error: 'IEP not found' });
  const goal = iep.goals[+req.params.goalIdx];
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  const { objectiveIdx, percentage, notes, measuredBy } = req.body;
  const obj = goal.shortTermObjectives[objectiveIdx];
  if (!obj) return res.status(404).json({ error: 'Objective not found' });
  obj.progress.push({ date: new Date(), percentage, notes, measuredBy });
  if (percentage >= 80) obj.status = 'achieved';
  else if (percentage > 0) obj.status = 'in-progress';
  await iep.save();
  res.json(iep);
});

/* ─── Therapy Session Routes ─── */
app.get('/api/sessions', async (req, res) => {
  const { beneficiary, therapist, status, date, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (beneficiary) filter.beneficiary = beneficiary;
  if (therapist) filter.therapist = therapist;
  if (status) filter.status = status;
  if (date) {
    const d = new Date(date);
    filter.scheduledDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }
  const [sessions, total] = await Promise.all([
    TherapySession.find(filter)
      .populate('beneficiary therapist')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ scheduledDate: -1 }),
    TherapySession.countDocuments(filter),
  ]);
  res.json({ sessions, total, page: +page });
});

app.post('/api/sessions', async (req, res) => {
  try {
    const session = await TherapySession.create(req.body);
    await notifyQueue.add('session-scheduled', { sessionId: session._id, beneficiaryId: session.beneficiary });
    res.status(201).json(session);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/sessions/:id/complete', async (req, res) => {
  const session = await TherapySession.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      status: 'completed',
    },
    { new: true },
  );
  if (!session) return res.status(404).json({ error: 'Not found' });
  await notifyQueue.add('session-completed', { sessionId: session._id });
  res.json(session);
});

app.put('/api/sessions/:id/cancel', async (req, res) => {
  const session = await TherapySession.findByIdAndUpdate(
    req.params.id,
    {
      status: 'cancelled',
      cancelReason: req.body.reason,
    },
    { new: true },
  );
  res.json(session);
});

/* ─── Assessment Routes ─── */
app.get('/api/assessments', async (req, res) => {
  const filter = {};
  if (req.query.beneficiary) filter.beneficiary = req.query.beneficiary;
  if (req.query.type) filter.type = req.query.type;
  const assessments = await Assessment.find(filter).populate('beneficiary assessor').sort({ date: -1 });
  res.json(assessments);
});

app.post('/api/assessments', async (req, res) => {
  try {
    res.status(201).json(await Assessment.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Progress comparison
app.get('/api/assessments/compare/:beneficiaryId', async (req, res) => {
  const assessments = await Assessment.find({
    beneficiary: req.params.beneficiaryId,
    tool: req.query.tool,
  }).sort({ date: 1 });
  const timeline = assessments.map(a => ({ date: a.date, rawScore: a.rawScore, standardScore: a.standardScore, percentile: a.percentile }));
  res.json({
    tool: req.query.tool,
    timeline,
    improvement: timeline.length >= 2 ? timeline[timeline.length - 1].standardScore - timeline[0].standardScore : 0,
  });
});

/* ─── MDT Meeting Routes ─── */
app.get('/api/mdt', async (req, res) => {
  const filter = req.query.beneficiary ? { beneficiary: req.query.beneficiary } : {};
  res.json(await MDTMeeting.find(filter).populate('beneficiary attendees.therapist').sort({ meetingDate: -1 }));
});

app.post('/api/mdt', async (req, res) => {
  try {
    res.status(201).json(await MDTMeeting.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Treatment Authorization ─── */
app.get('/api/treatment-auth', async (req, res) => {
  const filter = {};
  if (req.query.beneficiary) filter.beneficiary = req.query.beneficiary;
  if (req.query.status) filter.status = req.query.status;
  res.json(await TreatmentAuth.find(filter).populate('beneficiary').sort({ requestDate: -1 }));
});

app.post('/api/treatment-auth', async (req, res) => {
  try {
    const auth = await TreatmentAuth.create({ ...req.body, referenceNumber: `TA-${uuidv4().slice(0, 8).toUpperCase()}` });
    res.status(201).json(auth);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/treatment-auth/:id', async (req, res) => {
  const auth = await TreatmentAuth.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(auth);
});

/* ─── Stats ─── */
app.get('/api/rehab/stats', async (_, res) => {
  const [totalBeneficiaries, active, therapists, activeIEPs, sessionsThisMonth, pendingAuth] = await Promise.all([
    Beneficiary.countDocuments(),
    Beneficiary.countDocuments({ status: 'active' }),
    Therapist.countDocuments({ isActive: true }),
    IEP.countDocuments({ status: 'active' }),
    TherapySession.countDocuments({
      status: 'completed',
      scheduledDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }),
    TreatmentAuth.countDocuments({ status: 'pending' }),
  ]);
  const byDisability = await Beneficiary.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
  ]);
  res.json({ totalBeneficiaries, active, therapists, activeIEPs, sessionsThisMonth, pendingAuth, byDisability });
});

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'rehabilitation-care-service', uptime: process.uptime() }));
app.listen(PORT, () => console.log(`🏥 Rehabilitation Care Service running on port ${PORT}`));
