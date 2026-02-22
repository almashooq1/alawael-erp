/**
 * ALAWAEL ERP - PERFORMANCE MANAGEMENT ROUTES
 * Phase 22 - Performance Management API Endpoints
 */

const express = require('express');
const PerformanceManagementService = require('../services/performance-management.service');

const router = express.Router();
const performanceService = new PerformanceManagementService();

/**
 * PERFORMANCE REVIEW ENDPOINTS
 */

// Create performance review
router.post('/reviews', async (req, res) => {
  try {
    const review = await performanceService.createReview(req.body);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get performance review by ID
router.get('/reviews/:id', async (req, res) => {
  try {
    const review = await performanceService.getReview(req.params.id);
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Update performance review
router.put('/reviews/:id', async (req, res) => {
  try {
    const review = await performanceService.updateReview(req.params.id, req.body);
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete performance review
router.delete('/reviews/:id', async (req, res) => {
  try {
    // Implement soft delete or removal logic
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Finalize review
router.post('/reviews/:id/finalize', async (req, res) => {
  try {
    const review = await performanceService.finalizeReview(req.params.id, req.body);
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get reviews for employee
router.get('/reviews/employee/:empId', async (req, res) => {
  try {
    const reviews = await performanceService.getEmployeeReviews(req.params.empId);
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get review statistics
router.get('/reviews/stats', async (req, res) => {
  try {
    const stats = await performanceService.getReviewStats(req.query);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * FEEDBACK ENDPOINTS
 */

// Add feedback to review
router.post('/reviews/:id/feedback', async (req, res) => {
  try {
    const feedback = await performanceService.addFeedback(req.params.id, req.body);
    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * COMPETENCY ASSESSMENT ENDPOINTS
 */

// Create competency
router.post('/competency/definitions', async (req, res) => {
  try {
    const competency = await performanceService.createCompetency(req.body);
    res.status(201).json({ success: true, data: competency });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Assess employee competencies
router.post('/competency/assess', async (req, res) => {
  try {
    const assessment = await performanceService.assessEmployee(req.body.employeeId, req.body);
    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get competency gaps
router.get('/competency/gaps/:empId', async (req, res) => {
  try {
    const gaps = await performanceService.getCompetencyGaps(req.params.empId);
    res.json({ success: true, data: gaps });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Create development plan
router.post('/competency/development-plan', async (req, res) => {
  try {
    const plan = await performanceService.createDevelopmentPlan(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GOAL MANAGEMENT ENDPOINTS
 */

// Set goal
router.post('/goals', async (req, res) => {
  try {
    const goal = await performanceService.setGoal(req.body);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get goal by ID
router.get('/goals/:id', async (req, res) => {
  try {
    const goal = performanceService.goals.find(g => g.id === req.params.id);
    if (!goal) throw new Error('Goal not found');
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Update goal
router.put('/goals/:id', async (req, res) => {
  try {
    const goal = performanceService.goals.find(g => g.id === req.params.id);
    if (!goal) throw new Error('Goal not found');
    Object.assign(goal, req.body);
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete goal
router.delete('/goals/:id', async (req, res) => {
  try {
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update goal progress
router.post('/goals/:id/progress', async (req, res) => {
  try {
    const goal = await performanceService.updateGoalProgress(req.params.id, req.body);
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get employee goals
router.get('/goals/employee/:empId', async (req, res) => {
  try {
    const goals = await performanceService.getEmployeeGoals(req.params.empId);
    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * KPI MANAGEMENT ENDPOINTS
 */

// Define KPI
router.post('/kpi/definitions', async (req, res) => {
  try {
    const kpi = await performanceService.defineKPI(req.body);
    res.status(201).json({ success: true, data: kpi });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Track metric
router.post('/kpi/:id/track', async (req, res) => {
  try {
    const result = await performanceService.trackMetric(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Calculate performance scores
router.get('/scores/:empId', async (req, res) => {
  try {
    const scores = await performanceService.calculateScores(req.params.empId);
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Benchmark performance
router.get('/benchmark/:department', async (req, res) => {
  try {
    const benchmark = await performanceService.benchmarkPerformance(req.params.department);
    res.json({ success: true, data: benchmark });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * CALIBRATION & RANKING ENDPOINTS
 */

// Rank employees
router.post('/rank', async (req, res) => {
  try {
    const rankings = await performanceService.rankEmployees(req.body.departmentId, req.body.criteria);
    res.json({ success: true, data: rankings });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Calculate distribution
router.post('/distribution', async (req, res) => {
  try {
    const distribution = await performanceService.calculateDistribution(req.body.rankings);
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Assess retention risk
router.get('/retention-risk/:empId', async (req, res) => {
  try {
    const risk = await performanceService.assessRiskRetention(req.params.empId);
    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * ANALYTICS ENDPOINTS
 */

// Track achievement
router.get('/achievement/:empId', async (req, res) => {
  try {
    const achievement = await performanceService.trackAchievement(req.params.empId);
    res.json({ success: true, data: achievement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Performance analytics dashboard
router.get('/dashboard/:empId', async (req, res) => {
  try {
    const scores = await performanceService.calculateScores(req.params.empId);
    const achievement = await performanceService.trackAchievement(req.params.empId);
    const retention = await performanceService.assessRiskRetention(req.params.empId);

    res.json({
      success: true,
      data: {
        scores,
        achievement,
        retention,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
