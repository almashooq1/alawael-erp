const express = require('express');
const router = express.Router();
const SmartIRPService = require('../services/smartIRP.service');
const SmartIRP = require('../models/SmartIRP');

/**
 * @route   POST /api/smart-irp
 * @desc    Create new Smart IRP
 * @access  Private (Coordinator, Therapist)
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const irp = await SmartIRPService.createIRP(req.body, userId);

    res.status(201).json({
      success: true,
      message: 'Smart IRP created successfully',
      data: irp,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/smart-irp
 * @desc    Get all Smart IRPs with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status, beneficiary, program, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (beneficiary) query.beneficiary = beneficiary;
    if (program) query.program = program;

    const skip = (page - 1) * limit;

    const irps = await SmartIRP.find(query)
      .populate('beneficiary', 'name age gender')
      .populate('program', 'name')
      .populate('team.member', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SmartIRP.countDocuments(query);

    res.json({
      success: true,
      data: {
        irps,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/smart-irp/:id
 * @desc    Get Smart IRP by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const irp = await SmartIRP.findById(req.params.id)
      .populate('beneficiary')
      .populate('program')
      .populate('team.member', 'name email role')
      .populate('goals.progressUpdates.recordedBy', 'name')
      .populate('assessments.assessor', 'name');

    if (!irp) {
      return res.status(404).json({
        success: false,
        message: 'Smart IRP not found',
      });
    }

    res.json({
      success: true,
      data: irp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/smart-irp/:id
 * @desc    Update Smart IRP
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const irp = await SmartIRP.findById(req.params.id);

    if (!irp) {
      return res.status(404).json({
        success: false,
        message: 'Smart IRP not found',
      });
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'team', 'autoReview'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        irp[key] = req.body[key];
      }
    });

    irp.addHistory('updated', userId, { updates: Object.keys(req.body) });
    await irp.save();

    res.json({
      success: true,
      message: 'Smart IRP updated successfully',
      data: irp,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/smart-irp/:id/goals
 * @desc    Add SMART goal to IRP
 * @access  Private
 */
router.post('/:id/goals', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const irp = await SmartIRPService.addGoal(req.params.id, req.body, userId);

    res.status(201).json({
      success: true,
      message: 'SMART goal added successfully',
      data: irp,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/smart-irp/:id/goals/:goalId
 * @desc    Update goal
 * @access  Private
 */
router.put('/:id/goals/:goalId', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const irp = await SmartIRP.findById(req.params.id);

    if (!irp) {
      return res.status(404).json({
        success: false,
        message: 'Smart IRP not found',
      });
    }

    const goal = irp.goals.id(req.params.goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Update goal fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id') {
        goal[key] = req.body[key];
      }
    });

    irp.addHistory('goal_updated', userId, {
      goalId: req.params.goalId,
      goalTitle: goal.title,
    });

    await irp.save();

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: goal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/smart-irp/:id/goals/:goalId/progress
 * @desc    Update goal progress
 * @access  Private
 */
router.post('/:id/goals/:goalId/progress', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await SmartIRPService.updateGoalProgress(
      req.params.id,
      req.params.goalId,
      req.body,
      userId
    );

    res.json({
      success: true,
      message: `Progress updated: ${result.percentage}% achieved`,
      data: {
        goal: result.goal,
        percentage: result.percentage,
        status: result.goal.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/smart-irp/:id/assessments
 * @desc    Perform periodic assessment
 * @access  Private
 */
router.post('/:id/assessments', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const irp = await SmartIRPService.performAssessment(req.params.id, req.body, userId);

    res.status(201).json({
      success: true,
      message: 'Assessment completed successfully',
      data: irp,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/smart-irp/:id/analytics
 * @desc    Get IRP analytics and statistics
 * @access  Private
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const analytics = await SmartIRPService.getAnalytics(req.params.id);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/smart-irp/:id/review
 * @desc    Perform manual review (triggers alert check)
 * @access  Private
 */
router.post('/:id/review', async (req, res) => {
  try {
    const result = await SmartIRPService.performAutoReview(req.params.id);

    res.json({
      success: true,
      message: 'Review completed successfully',
      data: {
        summary: result.reviewSummary,
        alerts: result.alerts,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/smart-irp/:id/benchmarks
 * @desc    Update benchmarks comparison
 * @access  Private
 */
router.put('/:id/benchmarks', async (req, res) => {
  try {
    const benchmarks = await SmartIRPService.updateBenchmarks(req.params.id);

    res.json({
      success: true,
      message: 'Benchmarks updated successfully',
      data: benchmarks,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/smart-irp/:id/reports/family
 * @desc    Generate family progress report
 * @access  Private
 */
router.post('/:id/reports/family', async (req, res) => {
  try {
    const irp = await SmartIRP.findById(req.params.id);
    if (!irp) {
      return res.status(404).json({
        success: false,
        message: 'Smart IRP not found',
      });
    }

    const report = await SmartIRPService.generateFamilyReport(irp);

    res.json({
      success: true,
      message: 'Family report generated successfully',
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/smart-irp/:id/reports
 * @desc    Get all reports for an IRP
 * @access  Private
 */
router.get('/:id/reports', async (req, res) => {
  try {
    const irp = await SmartIRP.findById(req.params.id).select('reports');

    if (!irp) {
      return res.status(404).json({
        success: false,
        message: 'Smart IRP not found',
      });
    }

    res.json({
      success: true,
      data: irp.reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/smart-irp/:id/goals/:goalId/alerts/:alertIndex/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private
 */
router.put('/:id/goals/:goalId/alerts/:alertIndex/acknowledge', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const irp = await SmartIRP.findById(req.params.id);

    if (!irp) {
      return res.status(404).json({
        success: false,
        message: 'Smart IRP not found',
      });
    }

    const goal = irp.goals.id(req.params.goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    const alert = goal.alerts[req.params.alertIndex];
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedDate = new Date();

    await irp.save();

    res.json({
      success: true,
      message: 'Alert acknowledged',
      data: alert,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/smart-irp/stats/dashboard
 * @desc    Get dashboard statistics for all IRPs
 * @access  Private
 */
router.get('/stats/dashboard', async (req, res) => {
  try {
    const totalIRPs = await SmartIRP.countDocuments();
    const activeIRPs = await SmartIRP.countDocuments({ status: 'active' });
    const completedIRPs = await SmartIRP.countDocuments({ status: 'completed' });

    // Get all active IRPs for aggregate stats
    const activeIRPsList = await SmartIRP.find({ status: 'active' });

    const totalGoals = activeIRPsList.reduce((sum, irp) => sum + irp.goals.length, 0);
    const achievedGoals = activeIRPsList.reduce((sum, irp) => sum + irp.kpis.goalsAchieved, 0);
    const onTrackGoals = activeIRPsList.reduce((sum, irp) => sum + irp.kpis.goalsOnTrack, 0);
    const atRiskGoals = activeIRPsList.reduce((sum, irp) => sum + irp.kpis.goalsAtRisk, 0);
    const delayedGoals = activeIRPsList.reduce((sum, irp) => sum + irp.kpis.goalsDelayed, 0);

    const avgProgress =
      activeIRPsList.length > 0
        ? activeIRPsList.reduce((sum, irp) => sum + irp.kpis.overallProgress, 0) /
          activeIRPsList.length
        : 0;

    // Get IRPs needing attention
    const irpsNeedingAttention = activeIRPsList.filter(irp => {
      return irp.goals.some(g => g.alerts.some(a => !a.acknowledged));
    }).length;

    res.json({
      success: true,
      data: {
        overview: {
          totalIRPs,
          activeIRPs,
          completedIRPs,
          averageProgress: Math.round(avgProgress),
        },
        goals: {
          total: totalGoals,
          achieved: achievedGoals,
          onTrack: onTrackGoals,
          atRisk: atRiskGoals,
          delayed: delayedGoals,
        },
        alerts: {
          irpsNeedingAttention,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/smart-irp/run-scheduled-reviews
 * @desc    Run scheduled auto-reviews (cron job endpoint)
 * @access  Private (System/Admin)
 */
router.post('/run-scheduled-reviews', async (req, res) => {
  try {
    const results = await SmartIRPService.runScheduledReviews();

    res.json({
      success: true,
      message: `Scheduled reviews completed: ${results.successful} successful, ${results.failed} failed`,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
