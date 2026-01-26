/**
 * PHASE 17: ADVANCED AI & AUTOMATION ROUTES
 * Chatbot, Advanced Analytics, Workflow Builder
 * AlAwael ERP v1.4 | 2026-01-24
 */

const express = require('express');
const router = express.Router();
const Chatbot = require('../utils/intelligent-chatbot');
const Analytics = require('../utils/advanced-predictive-analytics');
const Workflow = require('../utils/workflow-builder');
const auth = require('../middleware/auth');

// Initialize services
const chatbot = new Chatbot.IntelligentChatbot(db);
const forecastingService = new Analytics.ForecastingService(db);
const workflowEngine = new Workflow.WorkflowEngine(db);

// ============================================================================
// CHATBOT ENDPOINTS
// ============================================================================

/**
 * POST /api/v17/chatbot/message
 * Send message to chatbot
 */
router.post('/chatbot/message', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message required',
      });
    }

    const result = await chatbot.processMessage(userId, message);

    res.json({
      success: result.success,
      response: result.response || null,
      intent: result.intent,
      confidence: result.confidence,
      entities: result.entities,
      suggestions: result.suggestions,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v17/chatbot/history
 * Get conversation history
 */
router.get('/chatbot/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit || 20;

    const history = chatbot.getConversationHistory(userId, parseInt(limit));

    res.json({
      success: true,
      history: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v17/chatbot/save
 * Save conversation
 */
router.post('/chatbot/save', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await chatbot.saveConversation(userId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v17/chatbot/history
 * Clear conversation
 */
router.delete('/chatbot/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = chatbot.clearConversation(userId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ADVANCED ANALYTICS ENDPOINTS
// ============================================================================

/**
 * POST /api/v17/analytics/forecast
 * Generate advanced forecast
 */
router.post('/analytics/forecast', auth, async (req, res) => {
  try {
    const { startDate, endDate, periods = 30, method = 'sarima' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate required',
      });
    }

    const result = await forecastingService.generateSalesForecast(startDate, endDate, periods);

    res.json({
      success: result.success,
      forecast: result.forecast,
      dataPoints: result.dataPoints,
      avgHistorical: result.avgHistorical,
      method: method,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v17/analytics/anomalies
 * Detect anomalies
 */
router.post('/analytics/anomalies', auth, async (req, res) => {
  try {
    const { collection, field, threshold = 2 } = req.body;

    if (!collection || !field) {
      return res.status(400).json({
        success: false,
        error: 'collection and field required',
      });
    }

    const result = await forecastingService.detectAnomalies(collection, field, threshold);

    res.json({
      success: result.success,
      anomalies: result.anomalies,
      count: result.count,
      threshold: result.threshold,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v17/analytics/correlation
 * Analyze correlation
 */
router.post('/analytics/correlation', auth, async (req, res) => {
  try {
    const { metric1, metric2 } = req.body;

    if (!metric1 || !metric2) {
      return res.status(400).json({
        success: false,
        error: 'metric1 and metric2 required',
      });
    }

    const result = await forecastingService.correlationAnalysis(metric1, metric2);

    res.json({
      success: result.success,
      metric1: result.metric1,
      metric2: result.metric2,
      correlation: result.correlation,
      relationship: result.relationship,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v17/analytics/decomposition
 * Seasonal decomposition
 */
router.get('/analytics/decomposition', auth, async (req, res) => {
  try {
    const analytics = new Analytics.AdvancedPredictiveAnalytics(db);
    const timeSeries = [100, 110, 105, 115, 120, 125, 130, 128, 135, 140, 145, 150];

    const decomposition = analytics.seasonalDecomposition(timeSeries, 4);

    res.json({
      success: true,
      decomposition: decomposition,
      components: ['trend', 'seasonal', 'residual'],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// WORKFLOW BUILDER ENDPOINTS
// ============================================================================

/**
 * POST /api/v17/workflows
 * Create workflow
 */
router.post('/workflows', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const workflowData = req.body;

    const result = await workflowEngine.createWorkflow(userId, workflowData);

    res.json({
      success: result.success,
      workflow: result.workflow,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v17/workflows
 * List user workflows
 */
router.get('/workflows', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const workflows = await workflowEngine.listUserWorkflows(userId);

    res.json({
      success: true,
      workflows: workflows,
      count: workflows.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v17/workflows/:workflowId
 * Get workflow details
 */
router.get('/workflows/:workflowId', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;

    const workflow = await workflowEngine.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      workflow: workflow,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v17/workflows/:workflowId/steps
 * Add step to workflow
 */
router.post('/workflows/:workflowId/steps', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const step = req.body;

    const result = await workflowEngine.addStep(workflowId, step);

    res.json({
      success: result.success,
      step: result.step,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v17/workflows/:workflowId/conditions
 * Add condition to workflow
 */
router.post('/workflows/:workflowId/conditions', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const condition = req.body;

    const result = await workflowEngine.addCondition(workflowId, condition);

    res.json({
      success: result.success,
      condition: result.condition,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v17/workflows/:workflowId/execute
 * Execute workflow
 */
router.post('/workflows/:workflowId/execute', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { data } = req.body;

    const result = await workflowEngine.executeWorkflow(workflowId, data);

    res.json({
      success: result.success,
      execution: result.execution,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v17/workflows/:workflowId/history
 * Get workflow execution history
 */
router.get('/workflows/:workflowId/history', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const limit = req.query.limit || 20;

    const history = await workflowEngine.getExecutionHistory(workflowId, parseInt(limit));

    res.json({
      success: true,
      history: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v17/workflows/:workflowId/enabled
 * Enable/Disable workflow
 */
router.put('/workflows/:workflowId/enabled', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { enabled } = req.body;

    const result = await workflowEngine.setWorkflowEnabled(workflowId, enabled);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v17/workflows/:workflowId
 * Delete workflow
 */
router.delete('/workflows/:workflowId', auth, async (req, res) => {
  try {
    const { workflowId } = req.params;

    const result = await workflowEngine.deleteWorkflow(workflowId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// WORKFLOW TEMPLATES ENDPOINTS
// ============================================================================

/**
 * GET /api/v17/workflows/templates
 * Get workflow templates
 */
router.get('/workflows/templates', auth, async (req, res) => {
  try {
    const templates = Workflow.WorkflowTemplates.listTemplates();

    res.json({
      success: true,
      templates: templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v17/workflows/templates/:templateId
 * Get specific template
 */
router.get('/workflows/templates/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = Workflow.WorkflowTemplates.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      template: template,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
