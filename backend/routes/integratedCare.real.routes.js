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
    const session = await TherapySession.create({ ...req.body, therapist: req.user?.id });
    res.status(201).json({ success: true, data: session, message: 'تم إنشاء الجلسة' });
  } catch (err) {
    logger.error('Integrated care session error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الجلسة' });
  }
});

// POST /plans
router.post('/plans', async (req, res) => {
  try {
    const plan = await CarePlan.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: plan, message: 'تم إنشاء خطة الرعاية' });
  } catch (err) {
    logger.error('Care plan create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء خطة الرعاية' });
  }
});

// GET /plans
router.get('/plans', async (req, res) => {
  try {
    const data = await CarePlan.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Care plans error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب خطط الرعاية' });
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
    logger.error('Care plan by student error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب خطة الطالب' });
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
    logger.error('IC students list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب قائمة الطلاب' });
  }
});

module.exports = router;
