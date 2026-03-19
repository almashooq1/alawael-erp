/**
 * Recruitment & Talent Acquisition Routes — مسارات التوظيف والاستقطاب
 *
 * Endpoints:
 *   /api/recruitment/jobs          — Job postings CRUD
 *   /api/recruitment/applications  — Applications pipeline
 *   /api/recruitment/interviews    — Interview scheduling
 *   /api/recruitment/dashboard     — Recruitment dashboard
 */

const express = require('express');
const router = express.Router();
const { JobPosting, JobApplication, Interview } = require('../models/recruitment.model');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// JOB POSTINGS — الوظائف
// ═══════════════════════════════════════════════════════════════════════════

router.get('/jobs', async (req, res) => {
  try {
    const { status, department, type, level, search, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (type) filter.type = type;
    if (level) filter.level = level;
    if (search) {
      filter.$or = [
        { 'title.ar': { $regex: search, $options: 'i' } },
        { 'title.en': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [jobs, total] = await Promise.all([
      JobPosting.find(filter)
        .populate('hiringManager', 'name')
        .populate('recruiter', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      JobPosting.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Recruitment] Jobs list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id)
      .populate('hiringManager', 'name email')
      .populate('recruiter', 'name email')
      .lean();
    if (!job) return res.status(404).json({ success: false, error: 'الوظيفة غير موجودة' });
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const job = await JobPosting.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/jobs/:id', async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!job) return res.status(404).json({ success: false, error: 'الوظيفة غير موجودة' });
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/jobs/:id/publish', async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { status: 'open', publishDate: new Date() },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, error: 'الوظيفة غير موجودة' });
    res.json({ success: true, data: job, message: 'تم نشر الوظيفة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/jobs/:id/close', async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, error: 'الوظيفة غير موجودة' });
    res.json({ success: true, data: job, message: 'تم إغلاق الوظيفة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, error: 'الوظيفة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATIONS — طلبات التوظيف
// ═══════════════════════════════════════════════════════════════════════════

router.get('/applications', async (req, res) => {
  try {
    const { jobPosting, stage, source, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (jobPosting) filter.jobPosting = jobPosting;
    if (stage) filter.stage = stage;
    if (source) filter.source = source;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [applications, total] = await Promise.all([
      JobApplication.find(filter)
        .populate('jobPosting', 'title jobNumber department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      JobApplication.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/applications/pipeline', async (req, res) => {
  try {
    const { jobPosting } = req.query;
    const match = { isDeleted: { $ne: true } };
    if (jobPosting) match.jobPosting = new (require('mongoose').Types.ObjectId)(jobPosting);

    const pipeline = await JobApplication.aggregate([
      { $match: match },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const stages = [
      'new',
      'screening',
      'phone_interview',
      'technical_test',
      'interview',
      'final_interview',
      'offer',
      'hired',
      'rejected',
      'withdrawn',
    ];
    const pipelineMap = Object.fromEntries(pipeline.map(p => [p._id, p.count]));
    const data = stages.map(s => ({ stage: s, count: pipelineMap[s] || 0 }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const app = await JobApplication.findById(req.params.id)
      .populate('jobPosting', 'title jobNumber department')
      .populate('stageHistory.changedBy', 'name')
      .lean();
    if (!app) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    res.json({ success: true, data: app });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/applications', async (req, res) => {
  try {
    const application = await JobApplication.create(req.body);

    // Increment applications count on job posting
    await JobPosting.findByIdAndUpdate(application.jobPosting, {
      $inc: { applicationsCount: 1 },
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/applications/:id/stage', async (req, res) => {
  try {
    const { stage, notes } = req.body;
    const application = await JobApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    application.stage = stage;
    application.stageHistory.push({
      stage,
      notes,
      changedBy: req.user?._id,
    });

    if (stage === 'rejected' && req.body.rejectionReason) {
      application.rejectionReason = req.body.rejectionReason;
    }

    await application.save();
    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/applications/:id/rate', async (req, res) => {
  try {
    const { rating, evaluationNotes } = req.body;
    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { rating, evaluationNotes },
      { new: true }
    );
    if (!application) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/applications/:id/offer', async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    application.stage = 'offer';
    application.offerDetails = {
      ...req.body,
      offerDate: new Date(),
      status: 'pending',
    };
    application.stageHistory.push({
      stage: 'offer',
      notes: 'تم تقديم العرض الوظيفي',
      changedBy: req.user?._id,
    });

    await application.save();
    res.json({ success: true, data: application, message: 'تم إرسال العرض الوظيفي' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERVIEWS — المقابلات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/interviews', async (req, res) => {
  try {
    const { status, type, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .populate('application', 'applicant applicationNumber')
        .populate('jobPosting', 'title jobNumber')
        .populate('interviewers.user', 'name')
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Interview.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: interviews,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/interviews', async (req, res) => {
  try {
    const interview = await Interview.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/interviews/:id', async (req, res) => {
  try {
    const interview = await Interview.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!interview) return res.status(404).json({ success: false, error: 'المقابلة غير موجودة' });
    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/interviews/:id/evaluate', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, error: 'المقابلة غير موجودة' });

    interview.evaluation = req.body.evaluation;
    interview.status = 'completed';
    if (req.body.questions) interview.questions = req.body.questions;
    if (req.body.notes) interview.notes = req.body.notes;

    await interview.save();
    res.json({ success: true, data: interview, message: 'تم حفظ التقييم' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم التوظيف
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const [
      openJobs,
      totalApplications,
      newApplicationsThisMonth,
      hiredThisMonth,
      upcomingInterviews,
      applicationsByStage,
      applicationsBySource,
    ] = await Promise.all([
      JobPosting.countDocuments({ status: 'open', isDeleted: { $ne: true } }),
      JobApplication.countDocuments({ isDeleted: { $ne: true } }),
      JobApplication.countDocuments({
        isDeleted: { $ne: true },
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      JobApplication.countDocuments({
        stage: 'hired',
        isDeleted: { $ne: true },
        updatedAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      Interview.countDocuments({
        status: { $in: ['scheduled', 'confirmed'] },
        scheduledDate: { $gte: new Date() },
      }),
      JobApplication.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      JobApplication.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        openJobs,
        totalApplications,
        newApplicationsThisMonth,
        hiredThisMonth,
        upcomingInterviews,
        pipeline: Object.fromEntries(applicationsByStage.map(s => [s._id, s.count])),
        sources: applicationsBySource,
      },
    });
  } catch (error) {
    logger.error('[Recruitment] Dashboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
