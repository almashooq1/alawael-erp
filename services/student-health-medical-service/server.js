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
   التخطيطات — Schemas
   ═══════════════════════════════════════════════════════════════ */

// ── السجل الصحي  HealthRecord ───────────────────────────────────
const healthRecordSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    studentName: String,
    dateOfBirth: Date,
    bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'], default: 'unknown' },
    allergies: [{ type: String, severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'] }, notes: String }],
    chronicConditions: [{ condition: String, diagnosedDate: Date, medications: [String], notes: String }],
    disabilities: [{ type: String, level: String, accommodations: [String] }],
    medications: [{ name: String, dosage: String, frequency: String, startDate: Date, endDate: Date, prescribedBy: String }],
    vaccinations: [
      {
        vaccine: String,
        dose: String,
        dateGiven: Date,
        nextDue: Date,
        administeredBy: String,
        batchNo: String,
        verified: { type: Boolean, default: false },
      },
    ],
    emergencyContacts: [{ name: String, relation: String, phone: String, altPhone: String }],
    insuranceInfo: { provider: String, policyNo: String, expiryDate: Date, className: String },
    dietaryRestrictions: [String],
    physicalExams: [
      {
        date: Date,
        height: Number,
        weight: Number,
        bmi: Number,
        vision: { left: String, right: String },
        hearing: { left: String, right: String },
        dental: String,
        notes: String,
        examinedBy: { userId: String, name: String },
      },
    ],
    lastUpdated: Date,
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

// ── زيارة العيادة  ClinicVisit ──────────────────────────────────
const clinicVisitSchema = new mongoose.Schema(
  {
    visitNo: { type: String, unique: true },
    studentId: { type: String, required: true },
    studentName: String,
    classId: String,
    date: { type: Date, default: Date.now },
    arrivalTime: String,
    departureTime: String,
    type: { type: String, enum: ['walk-in', 'emergency', 'scheduled', 'referral', 'follow-up'], default: 'walk-in' },
    chiefComplaint: String,
    symptoms: [String],
    vitalSigns: { temperature: Number, heartRate: Number, bloodPressure: String, oxygenSat: Number, weight: Number },
    assessment: String,
    diagnosis: String,
    icdCode: String,
    treatment: String,
    medicationsGiven: [{ name: String, dosage: String, time: String, route: String }],
    firstAid: { applied: Boolean, details: String },
    disposition: {
      type: String,
      enum: ['return-to-class', 'rest-in-clinic', 'sent-home', 'referred-hospital', 'referred-specialist', 'ambulance-called'],
      default: 'return-to-class',
    },
    parentNotified: { type: Boolean, default: false },
    parentNotifiedAt: Date,
    followUpNeeded: { type: Boolean, default: false },
    followUpDate: Date,
    attendedBy: { userId: String, name: String, role: String },
    notes: String,
    attachments: [String],
  },
  { timestamps: true },
);

clinicVisitSchema.pre('save', async function (next) {
  if (!this.visitNo) {
    const count = await this.constructor.countDocuments();
    this.visitNo = `CLV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── حادثة / إصابة  Incident ────────────────────────────────────
const healthIncidentSchema = new mongoose.Schema(
  {
    incidentNo: { type: String, unique: true },
    studentId: { type: String, required: true },
    studentName: String,
    date: Date,
    time: String,
    location: String,
    type: {
      type: String,
      enum: ['injury', 'illness', 'allergic-reaction', 'seizure', 'fainting', 'behavioral', 'infectious', 'other'],
      required: true,
    },
    severity: { type: String, enum: ['minor', 'moderate', 'major', 'critical'], default: 'minor' },
    description: String,
    witnesses: [{ name: String, role: String, statement: String }],
    actionTaken: String,
    firstAid: { applied: Boolean, details: String, appliedBy: String },
    ambulanceCalled: { type: Boolean, default: false },
    hospitalReferral: { referred: Boolean, hospital: String, referralDate: Date },
    parentNotified: { type: Boolean, default: false },
    parentNotifiedAt: Date,
    outcome: String,
    followUp: [{ date: Date, notes: String, by: String }],
    reportedBy: { userId: String, name: String },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  },
  { timestamps: true },
);

healthIncidentSchema.pre('save', async function (next) {
  if (!this.incidentNo) {
    const count = await this.constructor.countDocuments();
    this.incidentNo = `HI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── حملة تطعيم  VaccinationCampaign ─────────────────────────────
const vaccinationCampaignSchema = new mongoose.Schema(
  {
    campaignNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    vaccine: String,
    targetGroup: { ageFrom: Number, ageTo: Number, grades: [String] },
    scheduledDate: Date,
    location: String,
    provider: String,
    status: { type: String, enum: ['planned', 'in-progress', 'completed', 'cancelled'], default: 'planned' },
    consent: { required: { type: Boolean, default: true }, received: Number, declined: Number },
    records: [
      {
        studentId: String,
        studentName: String,
        status: { type: String, enum: ['vaccinated', 'declined', 'absent', 'deferred'] },
        notes: String,
      },
    ],
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

vaccinationCampaignSchema.pre('save', async function (next) {
  if (!this.campaignNo) {
    const count = await this.constructor.countDocuments();
    this.campaignNo = `VAC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// ── مخزون الأدوية  MedicineInventory ────────────────────────────
const medicineInventorySchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: String,
    genericName: String,
    category: {
      type: String,
      enum: ['analgesic', 'antibiotic', 'antiseptic', 'bandage', 'topical', 'inhaler', 'epipen', 'other'],
      default: 'other',
    },
    form: { type: String, enum: ['tablet', 'syrup', 'cream', 'injection', 'drops', 'spray', 'bandage', 'other'] },
    quantity: { type: Number, default: 0 },
    unit: String,
    reorderPoint: { type: Number, default: 5 },
    expiryDate: Date,
    batchNo: String,
    storageConditions: String,
    prescriptionRequired: { type: Boolean, default: false },
    supplier: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);
const ClinicVisit = mongoose.model('ClinicVisit', clinicVisitSchema);
const HealthIncident = mongoose.model('HealthIncident', healthIncidentSchema);
const VaccinationCampaign = mongoose.model('VaccinationCampaign', vaccinationCampaignSchema);
const MedicineInventory = mongoose.model('MedicineInventory', medicineInventorySchema);

/* ═══════════════════════════════════════════════════════════════ */
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_health';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3470;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const healthQueue = new Queue('health-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════
   المسارات — Routes
   ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'student-health-medical-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// ─── Health Records ──────────────────────────────────────────
app.post('/api/health-records', async (req, res) => {
  try {
    res.status(201).json(await HealthRecord.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/health-records', async (req, res) => {
  const { search, bloodType, hasAllergies, hasChronicConditions } = req.query;
  const q = {};
  if (search) q.$or = [{ studentId: new RegExp(search, 'i') }, { studentName: new RegExp(search, 'i') }];
  if (bloodType) q.bloodType = bloodType;
  if (hasAllergies === 'true') q['allergies.0'] = { $exists: true };
  if (hasChronicConditions === 'true') q['chronicConditions.0'] = { $exists: true };
  res.json(await HealthRecord.find(q).sort({ studentName: 1 }));
});
app.get('/api/health-records/:studentId', async (req, res) => {
  const r = await HealthRecord.findOne({ studentId: req.params.studentId });
  if (!r) return res.status(404).json({ error: 'السجل الصحي غير موجود' });
  const visits = await ClinicVisit.find({ studentId: req.params.studentId }).sort({ date: -1 }).limit(10);
  const incidents = await HealthIncident.find({ studentId: req.params.studentId }).sort({ date: -1 }).limit(10);
  res.json({ ...r.toObject(), recentVisits: visits, recentIncidents: incidents });
});
app.put('/api/health-records/:studentId', async (req, res) => {
  req.body.lastUpdated = new Date();
  const r = await HealthRecord.findOneAndUpdate({ studentId: req.params.studentId }, req.body, { new: true, upsert: true });
  res.json(r);
});
app.post('/api/health-records/:studentId/vaccination', async (req, res) => {
  const r = await HealthRecord.findOne({ studentId: req.params.studentId });
  if (!r) return res.status(404).json({ error: 'السجل غير موجود' });
  r.vaccinations.push(req.body);
  await r.save();
  res.json(r);
});

// ─── Clinic Visits ───────────────────────────────────────────
app.post('/api/clinic-visits', async (req, res) => {
  try {
    const visit = await ClinicVisit.create(req.body);
    if (visit.disposition === 'sent-home' || visit.disposition === 'referred-hospital' || visit.disposition === 'ambulance-called') {
      await healthQueue.add('notify-parent', { visitId: visit._id.toString(), studentId: visit.studentId, disposition: visit.disposition });
    }
    res.status(201).json(visit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/clinic-visits', async (req, res) => {
  const { studentId, date, type, disposition, from, to, page = 1, limit = 50 } = req.query;
  const q = {};
  if (studentId) q.studentId = studentId;
  if (date) q.date = new Date(date);
  if (type) q.type = type;
  if (disposition) q.disposition = disposition;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    ClinicVisit.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ date: -1, createdAt: -1 }),
    ClinicVisit.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});

// ─── Incidents ───────────────────────────────────────────────
app.post('/api/health-incidents', async (req, res) => {
  try {
    const inc = await HealthIncident.create(req.body);
    if (inc.severity === 'major' || inc.severity === 'critical') {
      await healthQueue.add('critical-incident', { incidentId: inc._id.toString(), severity: inc.severity });
    }
    res.status(201).json(inc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/health-incidents', async (req, res) => {
  const { status, severity, type, from, to } = req.query;
  const q = {};
  if (status) q.status = status;
  if (severity) q.severity = severity;
  if (type) q.type = type;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  res.json(await HealthIncident.find(q).sort({ date: -1 }));
});
app.put('/api/health-incidents/:id', async (req, res) => {
  res.json(await HealthIncident.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// ─── Vaccination Campaigns ───────────────────────────────────
app.post('/api/vaccination-campaigns', async (req, res) => {
  try {
    res.status(201).json(await VaccinationCampaign.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/vaccination-campaigns', async (req, res) => {
  res.json(await VaccinationCampaign.find(req.query.status ? { status: req.query.status } : {}).sort({ scheduledDate: -1 }));
});

// ─── Medicine Inventory ──────────────────────────────────────
app.post('/api/medicines', async (req, res) => {
  try {
    res.status(201).json(await MedicineInventory.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/medicines', async (req, res) => {
  const { category, lowStock, expiringSoon } = req.query;
  const q = { isActive: true };
  if (category) q.category = category;
  if (lowStock === 'true') q.$expr = { $lte: ['$quantity', '$reorderPoint'] };
  if (expiringSoon === 'true') {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    q.expiryDate = { $lte: d };
  }
  res.json(await MedicineInventory.find(q).sort({ nameAr: 1 }));
});
app.put('/api/medicines/:id', async (req, res) => {
  res.json(await MedicineInventory.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// ─── Dashboard ───────────────────────────────────────────────
app.get('/api/health/dashboard', async (_req, res) => {
  const cacheKey = 'health:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [totalRecords, todayVisits, openIncidents, lowMeds, visitsByType] = await Promise.all([
    HealthRecord.countDocuments(),
    ClinicVisit.countDocuments({ date: { $gte: today } }),
    HealthIncident.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
    MedicineInventory.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$reorderPoint'] } }),
    ClinicVisit.aggregate([{ $match: { date: { $gte: today } } }, { $group: { _id: '$disposition', count: { $sum: 1 } } }]),
  ]);
  const result = { totalRecords, todayVisits, openIncidents, lowStockMedicines: lowMeds, visitsByType };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
  res.json(result);
});

// Cron: تنبيه الأدوية المنتهية — daily 8 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiring = await MedicineInventory.find({ expiryDate: { $lte: soon }, isActive: true });
    for (const med of expiring) {
      await healthQueue.add('medicine-expiry-alert', { medicineId: med._id.toString(), nameAr: med.nameAr, expiryDate: med.expiryDate });
    }
    console.log(`[CRON] Medicine expiry check: ${expiring.length} items expiring soon`);
  } catch (e) {
    console.error('[CRON] Medicine expiry error:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════ */
mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — student-health-medical');
    app.listen(PORT, () => console.log(`🏥 Student-Health-Medical Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
