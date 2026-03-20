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

const admissionSchema = new mongoose.Schema(
  {
    applicationNo: { type: String, unique: true },
    academicYear: { type: String, required: true },
    studentInfo: {
      nameAr: { type: String, required: true },
      nameEn: String,
      nationalId: String,
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female'] },
      nationality: String,
      photo: String,
    },
    parentInfo: {
      fatherName: String,
      fatherPhone: String,
      fatherEmail: String,
      fatherJob: String,
      motherName: String,
      motherPhone: String,
      motherEmail: String,
      motherJob: String,
      guardianName: String,
      guardianRelation: String,
      guardianPhone: String,
    },
    program: {
      type: String,
      enum: ['nursery', 'kindergarten', 'preschool', 'elementary', 'intermediate', 'rehabilitation', 'special-needs'],
      required: true,
    },
    gradeApplied: String,
    previousSchool: { name: String, type: String, lastGrade: String, transferReason: String },
    healthInfo: { bloodType: String, allergies: [String], conditions: [String], medications: [String], specialNeeds: [String] },
    documents: [{ name: String, type: String, url: String, verified: Boolean }],
    assessment: { date: Date, score: Number, notes: String, assessedBy: String },
    interview: { date: Date, notes: String, interviewedBy: String, result: String },
    priority: { type: String, enum: ['normal', 'sibling', 'staff-child', 'vip', 'waitlist'], default: 'normal' },
    feePackage: { packageId: String, amount: Number, discount: Number },
    status: {
      type: String,
      enum: [
        'submitted',
        'under-review',
        'assessment-scheduled',
        'assessed',
        'interview-scheduled',
        'interviewed',
        'accepted',
        'waitlisted',
        'rejected',
        'enrolled',
        'withdrawn',
      ],
      default: 'submitted',
    },
    statusHistory: [{ status: String, date: { type: Date, default: Date.now }, by: String, reason: String }],
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

admissionSchema.pre('save', async function (next) {
  if (!this.applicationNo) {
    const count = await this.constructor.countDocuments();
    this.applicationNo = `ADM-${this.academicYear}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const enrollmentSchema = new mongoose.Schema(
  {
    enrollmentNo: { type: String, unique: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    studentId: { type: String, required: true },
    studentName: String,
    academicYear: String,
    program: String,
    grade: String,
    section: String,
    enrollDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'suspended', 'transferred-out', 'withdrawn', 'graduated', 'expelled'], default: 'active' },
    statusHistory: [{ status: String, date: Date, reason: String, by: String }],
    notes: String,
  },
  { timestamps: true },
);

enrollmentSchema.pre('save', async function (next) {
  if (!this.enrollmentNo) {
    const count = await this.constructor.countDocuments();
    this.enrollmentNo = `ENR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const transferSchema = new mongoose.Schema(
  {
    transferNo: { type: String, unique: true },
    studentId: String,
    studentName: String,
    type: { type: String, enum: ['internal-grade', 'internal-section', 'internal-branch', 'external-in', 'external-out'], required: true },
    from: { grade: String, section: String, branch: String, school: String },
    to: { grade: String, section: String, branch: String, school: String },
    reason: String,
    documents: [{ name: String, url: String }],
    effectiveDate: Date,
    approvedBy: { userId: String, name: String, date: Date },
    status: { type: String, enum: ['requested', 'approved', 'in-progress', 'completed', 'rejected'], default: 'requested' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

transferSchema.pre('save', async function (next) {
  if (!this.transferNo) {
    const count = await this.constructor.countDocuments();
    this.transferNo = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const certificateSchema = new mongoose.Schema(
  {
    certificateNo: { type: String, unique: true },
    studentId: String,
    studentName: String,
    type: {
      type: String,
      enum: ['enrollment', 'transfer', 'graduation', 'good-conduct', 'grade-report', 'attendance', 'experience', 'custom'],
      required: true,
    },
    titleAr: String,
    titleEn: String,
    content: String,
    templateId: String,
    issuedDate: { type: Date, default: Date.now },
    validUntil: Date,
    verificationCode: String,
    issuedBy: { userId: String, name: String },
    status: { type: String, enum: ['draft', 'issued', 'revoked'], default: 'issued' },
  },
  { timestamps: true },
);

certificateSchema.pre('save', async function (next) {
  if (!this.certificateNo) {
    const count = await this.constructor.countDocuments();
    this.certificateNo = `CRT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    this.verificationCode = `V${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
  next();
});

const complaintSchema = new mongoose.Schema(
  {
    complaintNo: { type: String, unique: true },
    type: {
      type: String,
      enum: ['academic', 'behavioral', 'facility', 'staff', 'transport', 'food', 'safety', 'billing', 'general'],
      required: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    submittedBy: { userId: String, name: String, role: String, phone: String, email: String },
    studentId: String,
    studentName: String,
    subject: String,
    description: { type: String, required: true },
    attachments: [{ name: String, url: String }],
    assignedTo: { userId: String, name: String, department: String },
    resolution: { action: String, resolvedBy: String, resolvedDate: Date, satisfactionRating: Number },
    escalation: [{ level: Number, escalatedTo: String, date: Date, reason: String }],
    status: { type: String, enum: ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed', 'reopened'], default: 'submitted' },
    statusHistory: [{ status: String, date: Date, by: String, notes: String }],
  },
  { timestamps: true },
);

complaintSchema.pre('save', async function (next) {
  if (!this.complaintNo) {
    const count = await this.constructor.countDocuments();
    this.complaintNo = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Admission = mongoose.model('Admission', admissionSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Transfer = mongoose.model('Transfer', transferSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_lifecycle';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3570;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const lifecycleQueue = new Queue('student-lifecycle-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({ status: mongo && red ? 'ok' : 'degraded', service: 'student-lifecycle-service', mongo, redis: red, uptime: process.uptime() });
});

// Admissions
app.post('/api/admissions', async (req, res) => {
  try {
    res.status(201).json(await Admission.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/admissions', async (req, res) => {
  const { academicYear, program, status, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (academicYear) q.academicYear = academicYear;
  if (program) q.program = program;
  if (status) q.status = status;
  if (search)
    q.$or = [
      { 'studentInfo.nameAr': new RegExp(search, 'i') },
      { 'studentInfo.nameEn': new RegExp(search, 'i') },
      { applicationNo: new RegExp(search, 'i') },
    ];
  const [data, total] = await Promise.all([
    Admission.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Admission.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/admissions/:id', async (req, res) => {
  const a = await Admission.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'الطلب غير موجود' });
  res.json(a);
});
app.put('/api/admissions/:id', async (req, res) => {
  const doc = await Admission.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (req.body.status && req.body.status !== doc.status) {
    doc.statusHistory.push({ status: req.body.status, by: req.body.updatedBy, reason: req.body.statusReason });
  }
  Object.assign(doc, req.body);
  await doc.save();
  res.json(doc);
});

// Enrollments
app.post('/api/enrollments', async (req, res) => {
  try {
    res.status(201).json(await Enrollment.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/enrollments', async (req, res) => {
  const { academicYear, program, grade, status, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (academicYear) q.academicYear = academicYear;
  if (program) q.program = program;
  if (grade) q.grade = grade;
  if (status) q.status = status;
  if (search) q.$or = [{ studentName: new RegExp(search, 'i') }, { enrollmentNo: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    Enrollment.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ enrollDate: -1 }),
    Enrollment.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});

// Transfers
app.post('/api/transfers', async (req, res) => {
  try {
    res.status(201).json(await Transfer.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/transfers', async (req, res) => {
  const { type, status } = req.query;
  const q = {};
  if (type) q.type = type;
  if (status) q.status = status;
  res.json(await Transfer.find(q).sort({ createdAt: -1 }));
});
app.put('/api/transfers/:id', async (req, res) => {
  res.json(await Transfer.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Certificates
app.post('/api/certificates', async (req, res) => {
  try {
    res.status(201).json(await Certificate.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/certificates', async (req, res) => {
  const { studentId, type, status } = req.query;
  const q = {};
  if (studentId) q.studentId = studentId;
  if (type) q.type = type;
  if (status) q.status = status;
  res.json(await Certificate.find(q).sort({ issuedDate: -1 }));
});
app.get('/api/certificates/verify/:code', async (req, res) => {
  const cert = await Certificate.findOne({ verificationCode: req.params.code, status: 'issued' });
  if (!cert) return res.status(404).json({ valid: false, error: 'الشهادة غير صالحة' });
  res.json({ valid: true, certificate: cert });
});

// Complaints
app.post('/api/complaints', async (req, res) => {
  try {
    res.status(201).json(await Complaint.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/complaints', async (req, res) => {
  const { type, priority, status, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (priority) q.priority = priority;
  if (status) q.status = status;
  if (search) q.$or = [{ subject: new RegExp(search, 'i') }, { complaintNo: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    Complaint.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Complaint.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/complaints/:id', async (req, res) => {
  const doc = await Complaint.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'الشكوى غير موجودة' });
  if (req.body.status && req.body.status !== doc.status) {
    doc.statusHistory.push({ status: req.body.status, date: new Date(), by: req.body.updatedBy, notes: req.body.statusNotes });
  }
  Object.assign(doc, req.body);
  await doc.save();
  res.json(doc);
});

// Dashboard
app.get('/api/lifecycle/dashboard', async (_req, res) => {
  const cacheKey = 'lifecycle:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const year = new Date().getFullYear().toString();
  const [totalAdmissions, pendingAdmissions, activeEnrollments, openComplaints, byProgram, admissionFunnel] = await Promise.all([
    Admission.countDocuments({ academicYear: { $regex: year } }),
    Admission.countDocuments({ status: { $in: ['submitted', 'under-review'] } }),
    Enrollment.countDocuments({ status: 'active' }),
    Complaint.countDocuments({ status: { $nin: ['resolved', 'closed'] } }),
    Enrollment.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$program', count: { $sum: 1 } } }]),
    Admission.aggregate([{ $match: { academicYear: { $regex: year } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const result = { totalAdmissions, pendingAdmissions, activeEnrollments, openComplaints, byProgram, admissionFunnel };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: escalate unresolved complaints older than 3 days
cron.schedule('0 9 * * *', async () => {
  const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const stale = await Complaint.find({ status: { $in: ['submitted', 'acknowledged'] }, createdAt: { $lte: threshold } });
  for (const c of stale) {
    const level = (c.escalation?.length || 0) + 1;
    c.escalation.push({ level, escalatedTo: 'management', date: new Date(), reason: 'تجاوز المدة المحددة' });
    c.status = 'investigating';
    c.statusHistory.push({ status: 'investigating', date: new Date(), by: 'system', notes: `تصعيد تلقائي - المستوى ${level}` });
    await c.save();
  }
  if (stale.length) console.log(`⚠️ Auto-escalated ${stale.length} complaints`);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — student-lifecycle');
    app.listen(PORT, () => console.log(`🎓 Student-Lifecycle Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
