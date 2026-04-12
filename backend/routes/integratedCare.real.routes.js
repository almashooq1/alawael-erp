const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const CarePlan = require('../models/CarePlan');

router.use(authenticate);

// POST /sessions
router.post('/sessions', async (req, res) => {
  try {
    const TherapySession = require('../models/TherapySession');
const safeError = require('../utils/safeError');
    const session = await TherapySession.create({ ...req.body, therapist: req.user?.id });
    res.status(201).json({ success: true, data: session, message: 'تم إنشاء الجلسة' });
  } catch (err) {
    safeError(res, err, 'Integrated care session error');
  }
});

// POST /plans
router.post('/plans', async (req, res) => {
  try {
    const plan = await CarePlan.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: plan, message: 'تم إنشاء خطة الرعاية' });
  } catch (err) {
    safeError(res, err, 'Care plan create error');
  }
});

// GET /plans
router.get('/plans', async (req, res) => {
  try {
    const data = await CarePlan.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Care plans error');
  }
});

// GET /plans/student/:studentId — active plan + goals for a specific student
router.get('/plans/student/:studentId', async (req, res) => {
  try {
    const plan = await CarePlan.findOne({
      beneficiary: req.params.studentId,
      status: { $in: ['ACTIVE', 'DRAFT'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!plan) {
      return res.json({ success: true, data: null, goals: [] });
    }

    // Flatten all goals from all enabled domains
    const goals = [];
    const domainGroups = ['educational', 'therapeutic', 'lifeSkills'];
    for (const group of domainGroups) {
      if (plan[group]?.enabled && plan[group]?.domains) {
        for (const [domainKey, section] of Object.entries(plan[group].domains)) {
          if (section?.goals?.length) {
            for (const g of section.goals) {
              goals.push({
                id: g._id?.toString() || `${domainKey}_${goals.length}`,
                title: g.title,
                domain: domainKey,
                type: g.type || domainKey,
                status: g.status,
                progress: g.progress,
              });
            }
          }
        }
      }
    }

    res.json({ success: true, data: plan, goals });
  } catch (err) {
    safeError(res, err, 'Care plan by student error');
  }
});

// GET /students — list students (beneficiaries) for session recording
router.get('/students', async (req, res) => {
  try {
    const User = require('../models/User');
    const students = await User.find({
      role: { $in: ['student', 'beneficiary', 'طالب', 'مستفيد'] },
    })
      .select('_id name email')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: students });
  } catch (err) {
    safeError(res, err, 'IC students list error');
  }
});

module.exports = router;
