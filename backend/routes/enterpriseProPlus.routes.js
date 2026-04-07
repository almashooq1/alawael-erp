/**
 * Enterprise Pro Plus Routes — مسارات الميزات المؤسسية الاحترافية المتقدمة
 *
 * 6 modules, ~90+ endpoints:
 *  1. /talent/*            — Talent Acquisition & ATS
 *  2. /facilities/*        — Facility & Real Estate Management
 *  3. /vendors/*           — Vendor & Supplier Management
 *  4. /itsm/*              — IT Service Management
 *  5. /ehs/*               — Environmental, Health & Safety
 *  6. /strategy/*          — Strategic Planning & OKR
 */

const router = require('express').Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');

const {
  JobPosting,
  Candidate,
  JobApplication,
  InterviewSchedule,
  Facility,
  SpaceBooking,
  LeaseContract,
  UtilityReading,
  Vendor,
  RFQ,
  VendorEvaluation,
  ITIncident,
  ITAsset,
  ServiceCatalogItem,
  ChangeRequest,
  SafetyIncident,
  SafetyInspection,
  HazardRegister,
  PPERecord,
  StrategicObjective,
  StrategicInitiative,
  SWOTAnalysis,
} = require('../models/EnterpriseProPlus');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const { safeError } = require('../utils/safeError');

// Helper
const _oid = id => new mongoose.Types.ObjectId(id);
const _safeBody = (body, fields) => {
  const obj = {};
  fields.forEach(f => {
    if (body[f] !== undefined) obj[f] = body[f];
  });
  return obj;
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  1. TALENT ACQUISITION & ATS — التوظيف واستقطاب المواهب                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- Job Postings ---
router.get('/talent/jobs', authenticateToken, async (req, res) => {
  try {
    const { status, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    const total = await JobPosting.countDocuments(filter);
    const data = await JobPosting.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('hiringManager', 'name email')
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/talent/jobs', authenticateToken, async (req, res) => {
  try {
    const job = await JobPosting.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/talent/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id)
      .populate('hiringManager', 'name email')
      .lean();
    if (!job) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/talent/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!job) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/talent/jobs/:id', authenticateToken, async (req, res) => {
  try {
    await JobPosting.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.get('/talent/jobs/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const [total, open, filled, apps] = await Promise.all([
      JobPosting.countDocuments(),
      JobPosting.countDocuments({ status: 'open' }),
      JobPosting.countDocuments({ status: 'filled' }),
      JobApplication.countDocuments(),
    ]);
    res.json({
      success: true,
      data: { totalJobs: total, openJobs: open, filledJobs: filled, totalApplications: apps },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Candidates ---
router.get('/talent/candidates', authenticateToken, async (req, res) => {
  try {
    const { status, source, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (search)
      filter.$or = [
        { firstName: { $regex: escapeRegex(search), $options: 'i' } },
        { lastName: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    const total = await Candidate.countDocuments(filter);
    const data = await Candidate.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/talent/candidates', authenticateToken, async (req, res) => {
  try {
    const candidate = await Candidate.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/talent/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Candidate.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// --- Applications ---
router.get('/talent/applications', authenticateToken, async (req, res) => {
  try {
    const { jobPosting, stage, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (jobPosting) filter.jobPosting = jobPosting;
    if (stage) filter.stage = stage;
    const total = await JobApplication.countDocuments(filter);
    const data = await JobApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('candidate', 'firstName lastName email')
      .populate('jobPosting', 'title department')
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/talent/applications', authenticateToken, async (req, res) => {
  try {
    const app = await JobApplication.create({ ...req.body, appliedAt: new Date() });
    res.status(201).json({ success: true, data: app });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/talent/applications/:id/stage', authenticateToken, async (req, res) => {
  try {
    const { stage } = req.body;
    const doc = await JobApplication.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.stageHistory.push({ stage: doc.stage, changedAt: new Date(), changedBy: req.user?.id });
    doc.stage = stage;
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/talent/pipeline', authenticateToken, async (req, res) => {
  try {
    const pipeline = await JobApplication.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: pipeline });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Interviews ---
router.get('/talent/interviews', authenticateToken, async (req, res) => {
  try {
    const data = await InterviewSchedule.find()
      .sort({ scheduledAt: 1 })
      .populate('application')
      .populate('interviewers', 'name email')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/talent/interviews', authenticateToken, async (req, res) => {
  try {
    const interview = await InterviewSchedule.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: interview });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/talent/interviews/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await InterviewSchedule.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  2. FACILITY & REAL ESTATE MANAGEMENT — إدارة المرافق والعقارات            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- Facilities ---
router.get('/facilities', authenticateToken, async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const data = await Facility.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/facilities', authenticateToken, async (req, res) => {
  try {
    const doc = await Facility.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/facilities/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Facility.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/facilities/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Facility.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/facilities/:id', authenticateToken, async (req, res) => {
  try {
    await Facility.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.get('/facilities/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const [total, active, maintenance, bookings, leases] = await Promise.all([
      Facility.countDocuments(),
      Facility.countDocuments({ status: 'active' }),
      Facility.countDocuments({ status: 'under_maintenance' }),
      SpaceBooking.countDocuments(),
      LeaseContract.countDocuments({ status: 'active' }),
    ]);
    res.json({
      success: true,
      data: {
        totalFacilities: total,
        active,
        underMaintenance: maintenance,
        totalBookings: bookings,
        activeLeases: leases,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Space Bookings ---
router.get('/facilities/bookings/list', authenticateToken, async (req, res) => {
  try {
    const { facility, status, from, to } = req.query;
    const filter = {};
    if (facility) filter.facility = facility;
    if (status) filter.status = status;
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }
    const data = await SpaceBooking.find(filter)
      .sort({ startTime: 1 })
      .populate('facility', 'name type')
      .populate('bookedBy', 'name email')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/facilities/bookings', authenticateToken, async (req, res) => {
  try {
    const booking = await SpaceBooking.create({ ...req.body, bookedBy: req.user?.id });
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/facilities/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await SpaceBooking.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/facilities/bookings/:id', authenticateToken, async (req, res) => {
  try {
    await SpaceBooking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Lease Contracts ---
router.get('/facilities/leases', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const data = await LeaseContract.find(filter)
      .sort({ endDate: 1 })
      .populate('facility', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/facilities/leases', authenticateToken, async (req, res) => {
  try {
    const doc = await LeaseContract.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/facilities/leases/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await LeaseContract.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// --- Utility Readings ---
router.get('/facilities/utilities', authenticateToken, async (req, res) => {
  try {
    const { facility, type } = req.query;
    const filter = {};
    if (facility) filter.facility = facility;
    if (type) filter.type = type;
    const data = await UtilityReading.find(filter)
      .sort({ readingDate: -1 })
      .limit(100)
      .populate('facility', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/facilities/utilities', authenticateToken, async (req, res) => {
  try {
    const doc = await UtilityReading.create({ ...req.body, recordedBy: req.user?.id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  3. VENDOR & SUPPLIER MANAGEMENT — إدارة علاقات الموردين                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- Vendors ---
router.get('/vendors', authenticateToken, async (req, res) => {
  try {
    const { category, qualificationStatus, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (qualificationStatus) filter.qualificationStatus = qualificationStatus;
    if (search)
      filter.$or = [
        { companyName: { $regex: escapeRegex(search), $options: 'i' } },
        { companyNameAr: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    const total = await Vendor.countDocuments(filter);
    const data = await Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/vendors', authenticateToken, async (req, res) => {
  try {
    const doc = await Vendor.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Vendor.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Vendor.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/vendors/:id', authenticateToken, async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.get('/vendors/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const [total, qualified, preferred, rfqs, pendingEvals] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ qualificationStatus: 'qualified' }),
      Vendor.countDocuments({ preferredVendor: true }),
      RFQ.countDocuments(),
      VendorEvaluation.countDocuments(),
    ]);
    res.json({
      success: true,
      data: {
        totalVendors: total,
        qualified,
        preferred,
        totalRFQs: rfqs,
        totalEvaluations: pendingEvals,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- RFQs ---
router.get('/vendors/rfqs/list', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const data = await RFQ.find(filter)
      .sort({ createdAt: -1 })
      .populate('invitedVendors', 'companyName')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/vendors/rfqs', authenticateToken, async (req, res) => {
  try {
    const count = await RFQ.countDocuments();
    const doc = await RFQ.create({
      ...req.body,
      rfqNumber: `RFQ-${Date.now()}-${count + 1}`,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/vendors/rfqs/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await RFQ.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/vendors/rfqs/:id/award', authenticateToken, async (req, res) => {
  try {
    const { vendorId } = req.body;
    const doc = await RFQ.findByIdAndUpdate(
      req.params.id,
      { status: 'awarded', awardedTo: vendorId },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// --- Vendor Evaluations ---
router.get('/vendors/evaluations/list', authenticateToken, async (req, res) => {
  try {
    const data = await VendorEvaluation.find()
      .sort({ createdAt: -1 })
      .populate('vendor', 'companyName')
      .populate('evaluator', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/vendors/evaluations', authenticateToken, async (req, res) => {
  try {
    const scores = req.body.scores || {};
    let weightedScore = 0;
    let totalWeight = 0;
    Object.values(scores).forEach(s => {
      if (s.score && s.weight) {
        weightedScore += s.score * s.weight;
        totalWeight += s.weight;
      }
    });
    const doc = await VendorEvaluation.create({
      ...req.body,
      evaluator: req.user?.id,
      weightedScore: totalWeight > 0 ? weightedScore / totalWeight : 0,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  4. IT SERVICE MANAGEMENT (ITSM) — إدارة خدمات تقنية المعلومات              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- IT Incidents ---
router.get('/itsm/incidents', authenticateToken, async (req, res) => {
  try {
    const { status, priority, category, assignedTo, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    const total = await ITIncident.countDocuments(filter);
    const data = await ITIncident.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/itsm/incidents', authenticateToken, async (req, res) => {
  try {
    const count = await ITIncident.countDocuments();
    const doc = await ITIncident.create({
      ...req.body,
      ticketNumber: `INC-${Date.now()}-${count + 1}`,
      reportedBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/itsm/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await ITIncident.findById(req.params.id)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.author', 'name')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/itsm/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await ITIncident.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.post('/itsm/incidents/:id/comments', authenticateToken, async (req, res) => {
  try {
    const doc = await ITIncident.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.comments.push({
      author: req.user?.id,
      text: req.body.text,
      isInternal: req.body.isInternal || false,
    });
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/itsm/incidents/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const doc = await ITIncident.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolution: {
          description: req.body.resolution,
          resolvedAt: new Date(),
          resolvedBy: req.user?.id,
        },
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/itsm/incidents/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const [total, open, critical, breached, resolved] = await Promise.all([
      ITIncident.countDocuments(),
      ITIncident.countDocuments({ status: { $in: ['new', 'assigned', 'in_progress'] } }),
      ITIncident.countDocuments({ priority: 'critical', status: { $nin: ['resolved', 'closed'] } }),
      ITIncident.countDocuments({ 'sla.breached': true }),
      ITIncident.countDocuments({ status: 'resolved' }),
    ]);
    res.json({ success: true, data: { total, open, critical, slaBreached: breached, resolved } });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- IT Assets ---
router.get('/itsm/assets', authenticateToken, async (req, res) => {
  try {
    const { type, status, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (department) filter.department = department;
    const total = await ITAsset.countDocuments(filter);
    const data = await ITAsset.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('assignedTo', 'name email')
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/itsm/assets', authenticateToken, async (req, res) => {
  try {
    const doc = await ITAsset.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/itsm/assets/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await ITAsset.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/itsm/assets/:id', authenticateToken, async (req, res) => {
  try {
    await ITAsset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Service Catalog ---
router.get('/itsm/catalog', authenticateToken, async (req, res) => {
  try {
    const data = await ServiceCatalogItem.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/itsm/catalog', authenticateToken, async (req, res) => {
  try {
    const doc = await ServiceCatalogItem.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/itsm/catalog/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await ServiceCatalogItem.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// --- Change Requests ---
router.get('/itsm/changes', authenticateToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const data = await ChangeRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/itsm/changes', authenticateToken, async (req, res) => {
  try {
    const count = await ChangeRequest.countDocuments();
    const doc = await ChangeRequest.create({
      ...req.body,
      changeNumber: `CHG-${Date.now()}-${count + 1}`,
      requestedBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/itsm/changes/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await ChangeRequest.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/itsm/changes/:id/approve', authenticateToken, async (req, res) => {
  try {
    const doc = await ChangeRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.approvals.push({
      approver: req.user?.id,
      status: 'approved',
      date: new Date(),
      comments: req.body.comments,
    });
    doc.status = 'approved';
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  5. EHS — SAFETY & HEALTH — السلامة والصحة المهنية والبيئة                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- Safety Incidents ---
router.get('/ehs/incidents', authenticateToken, async (req, res) => {
  try {
    const { status, severity, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    const total = await SafetyIncident.countDocuments(filter);
    const data = await SafetyIncident.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('reportedBy', 'name email')
      .populate('investigator', 'name email')
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/ehs/incidents', authenticateToken, async (req, res) => {
  try {
    const count = await SafetyIncident.countDocuments();
    const doc = await SafetyIncident.create({
      ...req.body,
      incidentNumber: `SI-${Date.now()}-${count + 1}`,
      reportedBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/ehs/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await SafetyIncident.findById(req.params.id)
      .populate('reportedBy', 'name')
      .populate('investigator', 'name')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/ehs/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await SafetyIncident.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/ehs/incidents/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const [total, open, critical, lostDays] = await Promise.all([
      SafetyIncident.countDocuments(),
      SafetyIncident.countDocuments({ status: { $in: ['reported', 'investigating'] } }),
      SafetyIncident.countDocuments({ severity: 'critical' }),
      SafetyIncident.aggregate([{ $group: { _id: null, total: { $sum: '$lostWorkDays' } } }]),
    ]);
    res.json({
      success: true,
      data: {
        totalIncidents: total,
        openIncidents: open,
        criticalIncidents: critical,
        totalLostWorkDays: lostDays[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Safety Inspections ---
router.get('/ehs/inspections', authenticateToken, async (req, res) => {
  try {
    const { status, facility } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (facility) filter.facility = facility;
    const data = await SafetyInspection.find(filter)
      .sort({ scheduledDate: -1 })
      .populate('inspector', 'name email')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/ehs/inspections', authenticateToken, async (req, res) => {
  try {
    const count = await SafetyInspection.countDocuments();
    const doc = await SafetyInspection.create({
      ...req.body,
      inspectionNumber: `INSP-${Date.now()}-${count + 1}`,
      inspector: req.user?.id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/ehs/inspections/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await SafetyInspection.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// --- Hazard Register ---
router.get('/ehs/hazards', authenticateToken, async (req, res) => {
  try {
    const { category, status, riskLevel } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (riskLevel) filter['riskAssessment.riskLevel'] = riskLevel;
    const data = await HazardRegister.find(filter)
      .sort({ 'riskAssessment.riskScore': -1 })
      .populate('responsiblePerson', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/ehs/hazards', authenticateToken, async (req, res) => {
  try {
    const count = await HazardRegister.countDocuments();
    const doc = await HazardRegister.create({
      ...req.body,
      hazardId: `HAZ-${Date.now()}-${count + 1}`,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/ehs/hazards/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await HazardRegister.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// --- PPE Records ---
router.get('/ehs/ppe', authenticateToken, async (req, res) => {
  try {
    const { employee, department } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (department) filter.department = department;
    const data = await PPERecord.find(filter)
      .sort({ createdAt: -1 })
      .populate('employee', 'name email')
      .populate('issuedBy', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/ehs/ppe', authenticateToken, async (req, res) => {
  try {
    const doc = await PPERecord.create({ ...req.body, issuedBy: req.user?.id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/ehs/ppe/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await PPERecord.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  6. STRATEGIC PLANNING & OKR — التخطيط الاستراتيجي وإدارة الأهداف           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- Strategic Objectives / OKR ---
router.get('/strategy/objectives', authenticateToken, async (req, res) => {
  try {
    const { status, perspective, level, year, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (perspective) filter.perspective = perspective;
    if (level) filter.level = level;
    if (year) filter['period.year'] = Number(year);
    const total = await StrategicObjective.countDocuments(filter);
    const data = await StrategicObjective.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('owner', 'name email')
      .lean();
    res.json({
      success: true,
      data,
      pagination: { total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/strategy/objectives', authenticateToken, async (req, res) => {
  try {
    const doc = await StrategicObjective.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/strategy/objectives/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await StrategicObjective.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('parentObjective', 'title')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/strategy/objectives/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await StrategicObjective.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/strategy/objectives/:id', authenticateToken, async (req, res) => {
  try {
    await StrategicObjective.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/strategy/objectives/:id/key-results/:krIndex', authenticateToken, async (req, res) => {
  try {
    const doc = await StrategicObjective.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const kr = doc.keyResults[Number(req.params.krIndex)];
    if (!kr) return res.status(404).json({ success: false, message: 'Key result not found' });
    const { currentValue, note } = req.body;
    if (currentValue !== undefined) {
      kr.currentValue = currentValue;
      kr.progress = Math.min(
        100,
        Math.round(((currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100)
      );
      kr.updates.push({ value: currentValue, note, updatedBy: req.user?.id });
    }
    Object.assign(kr, stripUpdateMeta(req.body));
    // Recalculate objective progress
    const krCount = doc.keyResults.length;
    if (krCount > 0) {
      doc.progress = Math.round(
        doc.keyResults.reduce((sum, k) => sum + (k.progress || 0), 0) / krCount
      );
    }
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.get('/strategy/objectives/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const [total, active, onTrack, atRisk, behind, completed, initiatives] = await Promise.all([
      StrategicObjective.countDocuments(),
      StrategicObjective.countDocuments({ status: 'active' }),
      StrategicObjective.countDocuments({ status: 'on_track' }),
      StrategicObjective.countDocuments({ status: 'at_risk' }),
      StrategicObjective.countDocuments({ status: 'behind' }),
      StrategicObjective.countDocuments({ status: 'completed' }),
      StrategicInitiative.countDocuments(),
    ]);
    const avgProgress = await StrategicObjective.aggregate([
      { $match: { status: { $in: ['active', 'on_track', 'at_risk', 'behind'] } } },
      { $group: { _id: null, avg: { $avg: '$progress' } } },
    ]);
    res.json({
      success: true,
      data: {
        totalObjectives: total,
        active,
        onTrack,
        atRisk,
        behind,
        completed,
        totalInitiatives: initiatives,
        avgProgress: Math.round(avgProgress[0]?.avg || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- Strategic Initiatives ---
router.get('/strategy/initiatives', authenticateToken, async (req, res) => {
  try {
    const { objective, status } = req.query;
    const filter = {};
    if (objective) filter.objective = objective;
    if (status) filter.status = status;
    const data = await StrategicInitiative.find(filter)
      .sort({ createdAt: -1 })
      .populate('objective', 'title')
      .populate('owner', 'name email')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/strategy/initiatives', authenticateToken, async (req, res) => {
  try {
    const doc = await StrategicInitiative.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/strategy/initiatives/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await StrategicInitiative.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/strategy/initiatives/:id', authenticateToken, async (req, res) => {
  try {
    await StrategicInitiative.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// --- SWOT Analysis ---
router.get('/strategy/swot', authenticateToken, async (req, res) => {
  try {
    const data = await SWOTAnalysis.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/strategy/swot', authenticateToken, async (req, res) => {
  try {
    const doc = await SWOTAnalysis.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.put('/strategy/swot/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await SWOTAnalysis.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

router.delete('/strategy/swot/:id', authenticateToken, async (req, res) => {
  try {
    await SWOTAnalysis.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
