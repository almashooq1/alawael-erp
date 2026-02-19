/**
 * ALAWAEL ERP - PHASE 19: CUSTOMER EXPERIENCE & SATISFACTION ROUTES
 * REST API endpoints for customer feedback, NPS, complaints, and experience management
 */

const express = require('express');

module.exports = customerExperienceService => {
  const router = express.Router();

  // ═══════════════════════════════════════════════════════════════════════════
  // SURVEY MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /surveys
   * Create a new customer satisfaction survey
   */
  router.post('/surveys', (req, res) => {
    try {
      const { title, questions, targetAudience, description, type, createdBy } = req.body;

      if (!title || !questions || !targetAudience) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, questions, targetAudience',
        });
      }

      const survey = customerExperienceService.createSurvey({
        title,
        questions,
        targetAudience,
        description,
        type,
        createdBy,
      });

      res.status(201).json({
        success: true,
        message: 'Survey created successfully',
        data: survey,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * POST /surveys/:surveyId/responses
   * Submit response to a survey
   */
  router.post('/surveys/:surveyId/responses', (req, res) => {
    try {
      const { surveyId } = req.params;
      const { customerId, answers, completionTime, deviceType, location } = req.body;

      if (!customerId || !answers) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customerId, answers',
        });
      }

      const response = customerExperienceService.submitSurveyResponse(surveyId, {
        customerId,
        answers,
        completionTime,
        deviceType,
        location,
      });

      res.status(201).json({
        success: true,
        message: 'Survey response submitted successfully',
        data: response,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /surveys/:surveyId/results
   * Get survey results and analysis
   */
  router.get('/surveys/:surveyId/results', (req, res) => {
    try {
      const { surveyId } = req.params;
      const results = customerExperienceService.getSurveyResults(surveyId);

      res.status(200).json({
        success: true,
        message: 'Survey results retrieved successfully',
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NPS (NET PROMOTER SCORE) ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /nps
   * Record NPS score from customer
   */
  router.post('/nps', (req, res) => {
    try {
      const { customerId, score, feedback, touchpoint, deviceType, location, source } = req.body;

      if (customerId === undefined || score === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customerId, score',
        });
      }

      const npsScore = customerExperienceService.recordNPSScore({
        customerId,
        score,
        feedback,
        touchpoint,
        deviceType,
        location,
        source,
      });

      res.status(201).json({
        success: true,
        message: 'NPS score recorded successfully',
        data: npsScore,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /nps/analysis
   * Calculate NPS and analyze trends
   */
  router.get('/nps/analysis', (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const npsAnalysis = customerExperienceService.calculateNPS(start, end);

      res.status(200).json({
        success: true,
        message: 'NPS analysis retrieved successfully',
        data: npsAnalysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /feedback
   * Submit customer feedback
   */
  router.post('/feedback', (req, res) => {
    try {
      const { customerId, content, category, rating, source, sentiment, keywords } = req.body;

      if (!customerId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customerId, content',
        });
      }

      const feedback = customerExperienceService.submitFeedback({
        customerId,
        content,
        category,
        rating,
        source,
        sentiment,
        keywords,
      });

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: feedback,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * POST /feedback/:feedbackId/response
   * Respond to customer feedback
   */
  router.post('/feedback/:feedbackId/response', (req, res) => {
    try {
      const { feedbackId } = req.params;
      const { respondedBy, message, resolution, status } = req.body;

      const response = customerExperienceService.respondToFeedback(feedbackId, {
        respondedBy,
        message,
        resolution,
        status,
      });

      res.status(201).json({
        success: true,
        message: 'Feedback response recorded successfully',
        data: response,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /feedback/analytics
   * Get feedback analytics and insights
   */
  router.get('/feedback/analytics', (req, res) => {
    try {
      const { category, status } = req.query;
      const analytics = customerExperienceService.getFeedbackAnalytics({ category, status });

      res.status(200).json({
        success: true,
        message: 'Feedback analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLAINT MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /complaints
   * Register a new customer complaint
   */
  router.post('/complaints', (req, res) => {
    try {
      const { customerId, description, severity, category, assignedTo } = req.body;

      if (!customerId || !description || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customerId, description, severity',
        });
      }

      const complaint = customerExperienceService.registerComplaint({
        customerId,
        description,
        severity,
        category,
        assignedTo,
      });

      res.status(201).json({
        success: true,
        message: 'Complaint registered successfully',
        data: complaint,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * PATCH /complaints/:complaintId/status
   * Update complaint status and progress
   */
  router.patch('/complaints/:complaintId/status', (req, res) => {
    try {
      const { complaintId } = req.params;
      const { status, assignedTo, resolution } = req.body;

      const updatedComplaint = customerExperienceService.updateComplaintStatus(complaintId, {
        status,
        assignedTo,
        resolution,
      });

      res.status(200).json({
        success: true,
        message: 'Complaint status updated successfully',
        data: updatedComplaint,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /complaints/analytics
   * Get complaint analytics and resolution metrics
   */
  router.get('/complaints/analytics', (req, res) => {
    try {
      const { status, severity } = req.query;
      const analytics = customerExperienceService.getComplaintAnalytics({ status, severity });

      res.status(200).json({
        success: true,
        message: 'Complaint analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIENCE METRICS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /metrics
   * Track experience metrics
   */
  router.post('/metrics', (req, res) => {
    try {
      const { name, value, dimension, threshold, metadata } = req.body;

      if (!name || value === undefined || !dimension) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, value, dimension',
        });
      }

      const metric = customerExperienceService.trackExperienceMetric({
        name,
        value,
        dimension,
        threshold,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Experience metric tracked successfully',
        data: metric,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /metrics/:dimension
   * Get metrics by dimension with trend analysis
   */
  router.get('/metrics/:dimension', (req, res) => {
    try {
      const { dimension } = req.params;
      const { timeframe } = req.query;
      const result = customerExperienceService.getExperienceMetricsByDimension(
        dimension,
        parseInt(timeframe) || 30
      );

      res.status(200).json({
        success: true,
        message: 'Experience metrics retrieved successfully',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER JOURNEY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /journeys
   * Create customer journey map
   */
  router.post('/journeys', (req, res) => {
    try {
      const { name, stages, customerId } = req.body;

      if (!name || !stages || !customerId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, stages, customerId',
        });
      }

      const journey = customerExperienceService.createJourneyMap({
        name,
        stages,
        customerId,
      });

      res.status(201).json({
        success: true,
        message: 'Customer journey created successfully',
        data: journey,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * POST /journeys/:journeyId/touchpoints
   * Log touchpoint in customer journey
   */
  router.post('/journeys/:journeyId/touchpoints', (req, res) => {
    try {
      const { journeyId } = req.params;
      const { stageId, name, channel, sentiment, duration, outcome } = req.body;

      const touchpoint = customerExperienceService.logJourneyTouchpoint(journeyId, {
        stageId,
        name,
        channel,
        sentiment,
        duration,
        outcome,
      });

      res.status(201).json({
        success: true,
        message: 'Journey touchpoint logged successfully',
        data: touchpoint,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIENCE DASHBOARD ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /dashboards
   * Create experience dashboard
   */
  router.post('/dashboards', (req, res) => {
    try {
      const { name, createdBy, customizations, targetAudience } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: name',
        });
      }

      const dashboard = customerExperienceService.createExperienceDashboard({
        name,
        createdBy,
        customizations,
        targetAudience,
      });

      res.status(201).json({
        success: true,
        message: 'Experience dashboard created successfully',
        data: dashboard,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /dashboards/:dashboardId/data
   * Get real-time dashboard data
   */
  router.get('/dashboards/:dashboardId/data', (req, res) => {
    try {
      const { dashboardId } = req.params;
      const dashboardData = customerExperienceService.getExperienceDashboardData(dashboardId);

      res.status(200).json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: dashboardData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /sentiment/analyze
   * Analyze sentiment from text content
   */
  router.post('/sentiment/analyze', (req, res) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: content',
        });
      }

      const analysis = customerExperienceService.analyzeSentiment(content);

      res.status(201).json({
        success: true,
        message: 'Sentiment analysis completed successfully',
        data: analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
};
