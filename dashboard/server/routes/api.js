/**
 * API Routes for Quality Dashboard
 */

const express = require('express');
const router = express.Router();
const qualityService = require('../services/quality');
const database = require('../services/database');
const mlAnalytics = require('../services/ml-analytics');

// Get all services status
router.get('/status', async (req, res) => {
  try {
    const services = await qualityService.getAllServicesStatus();
    const system = {
      health: qualityService.calculateSystemHealth(services),
      totalTests: services.reduce((sum, s) => sum + (s.tests || 0), 0),
      totalPassing: services.filter(s => s.status === 'pass').length,
      totalServices: services.length,
    };

    res.json({ services, system });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Get specific service details
router.get('/service/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const details = await qualityService.getServiceDetails(name);
    const history = await database.getServiceHistory(name, 10);

    res.json({ ...details, history });
  } catch (error) {
    console.error(`Error getting service ${req.params.name}:`, error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Run tests for a service
router.post('/run/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const jobId = await qualityService.runQualityCheck(service);

    res.json({
      jobId,
      status: 'queued',
      message: `Quality check for ${service} started`,
    });
  } catch (error) {
    console.error(`Error running tests for ${req.params.service}:`, error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Get job status
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await qualityService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error(`Error getting job ${req.params.jobId}:`, error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Get quality trends
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const service = req.query.service;

    const trends = await database.getTrends(service, days);

    res.json(trends);
  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Get recent test runs
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const runs = await database.getRecentRuns(limit);

    res.json(runs);
  } catch (error) {
    console.error('Error getting recent runs:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Send daily summary to Slack
router.post('/slack/daily-summary', async (req, res) => {
  try {
    const result = await qualityService.sendDailySummary();
    res.json(result);
  } catch (error) {
    console.error('Error sending daily summary:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// ML Analytics endpoints

// Analyze patterns for a service
router.get('/analytics/patterns/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const days = parseInt(req.query.days) || 30;
    const patterns = await mlAnalytics.analyzePatterns(service, days);
    res.json(patterns);
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Predict failure probability
router.get('/analytics/predict/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const prediction = await mlAnalytics.predictFailure(service);
    res.json(prediction);
  } catch (error) {
    console.error('Error predicting failure:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Calculate risk score
router.get('/analytics/risk/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const riskScore = await mlAnalytics.calculateRiskScore(service);
    res.json(riskScore);
  } catch (error) {
    console.error('Error calculating risk score:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// Get analytics for all services
router.get('/analytics/overview', async (req, res) => {
  try {
    const services = qualityService.SERVICES.map(s => s.name);
    const overview = await Promise.all(
      services.map(async service => {
        try {
          const [prediction, risk] = await Promise.all([
            mlAnalytics.predictFailure(service),
            mlAnalytics.calculateRiskScore(service),
          ]);
          return {
            service,
            prediction,
            risk,
          };
        } catch (error) {
          return {
            service,
            error: 'حدث خطأ داخلي',
          };
        }
      })
    );
    res.json(overview);
  } catch (error) {
    console.error('Error getting analytics overview:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
