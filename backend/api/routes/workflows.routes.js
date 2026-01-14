/**
 * Workflow API Routes - Backend
 * مسارات API لنظام سير العمل والمصادقات
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware للتحقق من المصادقة
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// In-memory storage (في الإنتاج، استخدم قاعدة بيانات حقيقية)
const workflows = new Map();
const workflowTemplates = new Map();
const approvals = new Map();
const delegations = new Map();
const auditLog = [];

// ============================================
// WORKFLOW ROUTES
// ============================================

/**
 * GET /api/workflows
 * Get all workflows with filters
 */
router.get('/workflows', authenticateToken, async (req, res) => {
  try {
    const { status, priority, category, userId } = req.query;

    let results = Array.from(workflows.values());

    // Apply filters
    if (status) results = results.filter(w => w.status === status);
    if (priority) results = results.filter(w => w.priority === priority);
    if (category) results = results.filter(w => w.category === category);
    if (userId) results = results.filter(w => w.initiator === userId || w.stages.some(s => s.assignees.includes(userId)));

    res.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/workflows', authenticateToken, async (req, res) => {
  try {
    const { templateId, title, description, metadata, priority, category } = req.body;

    const template = workflowTemplates.get(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const workflow = {
      id: `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      title,
      description,
      metadata: metadata || {},
      priority: priority || 'normal',
      category: category || template.category,
      initiator: req.user.id,
      initiatorName: req.user.name,

      stages: template.stages.map((stage, index) => ({
        id: `STAGE-${Date.now()}-${index}`,
        name: stage.name,
        assignedTo: stage.assignedTo,
        assignees: [req.user.id], // Assign to current user for testing
        status: 'pending',
        startTime: null,
        endTime: null,
        approvals: [],
        sla: stage.sla,
      })),

      currentStage: 0,
      status: 'initiated',

      sla: {
        startTime: new Date(),
        expectedCompletion: calculateExpectedCompletion(template.stages),
        alerts: [],
        breached: false,
      },

      history: [
        {
          action: 'workflow_created',
          timestamp: new Date(),
          actor: req.user.id,
          actorName: req.user.name,
          stage: 'initiation',
          details: 'Workflow initiated',
        },
      ],

      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workflows.set(workflow.id, workflow);

    // Log audit
    addAuditLog('workflow_created', req.user.id, workflow.id, 'Workflow created');

    // Send notification
    await sendNotification(workflow, 'workflow_created');

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get specific workflow details
 */
router.get('/workflows/:id', authenticateToken, async (req, res) => {
  try {
    const workflow = workflows.get(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check permissions
    if (!canAccessWorkflow(req.user, workflow)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workflows/:id/approve
 * Process approval/rejection for a workflow stage
 */
router.post('/workflows/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { stageId, decision, comments, attachments, signatureId } = req.body;

    const workflow = workflows.get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const stage = workflow.stages.find(s => s.id === stageId);
    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Validate permissions
    if (!stage.assignees.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized to approve this stage' });
    }

    const approval = {
      id: `APR-${Date.now()}`,
      approverId: req.user.id,
      approverName: req.user.name,
      decision, // 'approve', 'reject', 'revise', 'delegate'
      comments,
      attachments: attachments || [],
      signatureId,
      timestamp: new Date(),
      ipAddress: req.ip,
    };

    stage.approvals.push(approval);

    // Update workflow based on decision
    switch (decision) {
      case 'approve':
        stage.status = 'approved';
        stage.endTime = new Date();

        // Move to next stage
        const nextStageIndex = workflow.currentStage + 1;
        if (nextStageIndex < workflow.stages.length) {
          workflow.currentStage = nextStageIndex;
          workflow.stages[nextStageIndex].status = 'in-progress';
          workflow.stages[nextStageIndex].startTime = new Date();
          // Update workflow status to in-progress if not already
          if (workflow.status === 'initiated') {
            workflow.status = 'in-progress';
          }
        } else {
          workflow.status = 'completed';
          workflow.completedAt = new Date();
        }
        break;

      case 'reject':
        workflow.status = 'rejected';
        stage.status = 'rejected';
        stage.endTime = new Date();
        break;

      case 'revise':
        workflow.status = 'revision-required';
        stage.status = 'revision-required';
        break;

      default:
        return res.status(400).json({ error: 'Invalid decision' });
    }

    // Add to history
    workflow.history.push({
      action: `stage_${decision}`,
      timestamp: new Date(),
      actor: req.user.id,
      actorName: req.user.name,
      stage: stageId,
      details: `Stage ${stage.name}: ${decision}`,
      comments,
    });

    workflow.updatedAt = new Date();
    workflows.set(workflow.id, workflow);

    // Log audit
    addAuditLog(`stage_${decision}`, req.user.id, workflow.id, `Stage ${decision}ed`);

    // Send notifications
    await sendNotification(workflow, `stage_${decision}`, { stage, approval });

    res.json({
      success: true,
      data: workflow,
      message: `Workflow ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : decision === 'revise' ? 'revision-required' : 'delegated'} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workflows/:id/delegate
 * Delegate approval to another user
 */
router.post('/workflows/:id/delegate', authenticateToken, async (req, res) => {
  try {
    const { stageId, delegateToUserId, reason } = req.body;

    const workflow = workflows.get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const stage = workflow.stages.find(s => s.id === stageId);
    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    const delegation = {
      id: `DEL-${Date.now()}`,
      workflowId: workflow.id,
      stageId,
      fromUserId: req.user.id,
      toUserId: delegateToUserId,
      reason,
      timestamp: new Date(),
      status: 'active',
    };

    delegations.set(delegation.id, delegation);

    // Update stage assignee
    stage.assignees = [delegateToUserId];
    stage.delegated = true;

    workflow.history.push({
      action: 'delegated',
      timestamp: new Date(),
      actor: req.user.id,
      stage: stageId,
      details: `Delegated to user ${delegateToUserId}`,
    });

    workflow.updatedAt = new Date();
    workflows.set(workflow.id, workflow);

    // Notify delegate
    await sendNotification(workflow, 'delegated', { delegation });

    res.json({
      success: true,
      data: workflow,
      delegation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/analytics
 * Get workflow analytics and statistics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const workflowArray = Array.from(workflows.values());

    const analytics = {
      overview: {
        total: workflowArray.length,
        active: workflowArray.filter(w => w.status === 'in-progress').length,
        completed: workflowArray.filter(w => w.status === 'completed').length,
        rejected: workflowArray.filter(w => w.status === 'rejected').length,
        overdue: workflowArray.filter(w => w.sla.breached).length,
      },

      byCategory: groupBy(workflowArray, 'category'),
      byPriority: groupBy(workflowArray, 'priority'),
      byStatus: groupBy(workflowArray, 'status'),

      performance: {
        averageCompletionTime: calculateAverageCompletionTime(workflowArray),
        slaCompliance: calculateSLACompliance(workflowArray),
        approvalRates: calculateApprovalRates(workflowArray),
      },
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/templates
 * Get all workflow templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = Array.from(workflowTemplates.values());

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/audit-log
 * Get audit trail
 */
router.get('/audit-log', authenticateToken, async (req, res) => {
  try {
    const { workflowId, userId, action, startDate, endDate } = req.query;

    let results = [...auditLog];

    // Apply filters
    if (workflowId) results = results.filter(log => log.workflowId === workflowId);
    if (userId) results = results.filter(log => log.userId === userId);
    if (action) results = results.filter(log => log.action === action);
    if (startDate) results = results.filter(log => log.timestamp >= new Date(startDate));
    if (endDate) results = results.filter(log => log.timestamp <= new Date(endDate));

    res.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateExpectedCompletion(stages) {
  const totalHours = stages.reduce((sum, stage) => {
    const stageSla = stage.sla || { hours: 24 };
    return sum + (stageSla.hours || stageSla.days * 24 || 24);
  }, 0);

  return new Date(Date.now() + totalHours * 60 * 60 * 1000);
}

function canAccessWorkflow(user, workflow) {
  // Check if user is initiator or assigned to any stage
  return workflow.initiator === user.id || workflow.stages.some(stage => stage.assignees.includes(user.id));
}

function groupBy(array, key) {
  return array.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function calculateAverageCompletionTime(workflows) {
  const completed = workflows.filter(w => w.completedAt);
  if (completed.length === 0) return 0;

  const totalTime = completed.reduce((sum, w) => {
    return sum + (w.completedAt - w.createdAt);
  }, 0);

  return totalTime / completed.length;
}

function calculateSLACompliance(workflows) {
  const completedWorkflows = workflows.filter(w => w.status === 'completed');
  if (completedWorkflows.length === 0) return 100;

  const withinSLA = completedWorkflows.filter(w => !w.sla.breached).length;
  return (withinSLA / completedWorkflows.length) * 100;
}

function calculateApprovalRates(workflows) {
  const completed = workflows.filter(w => w.status === 'completed' || w.status === 'rejected');

  if (completed.length === 0) {
    return { approved: 0, rejected: 0, avgRevisionsPerWorkflow: 0 };
  }

  return {
    approved: (workflows.filter(w => w.status === 'completed').length / completed.length) * 100,
    rejected: (workflows.filter(w => w.status === 'rejected').length / completed.length) * 100,
    avgRevisionsPerWorkflow: calculateAverageRevisions(workflows),
  };
}

function calculateAverageRevisions(workflows) {
  const revisionsCount = workflows.reduce((sum, w) => {
    return sum + w.history.filter(h => h.action === 'revision_required').length;
  }, 0);

  return workflows.length > 0 ? revisionsCount / workflows.length : 0;
}

function addAuditLog(action, userId, workflowId, details) {
  auditLog.push({
    id: `LOG-${Date.now()}`,
    action,
    userId,
    workflowId,
    details,
    timestamp: new Date(),
  });
}

async function sendNotification(workflow, eventType, data = {}) {
  // في التطبيق الحقيقي، أرسل إشعارات عبر البريد الإلكتروني، SMS، Push
  console.log(`Notification sent: ${eventType} for workflow ${workflow.id}`);
  return true;
}

// Initialize default templates
function initializeDefaultTemplates() {
  const templates = [
    {
      id: 'license-renewal',
      name: 'تجديد الرخصة',
      category: 'licenses',
      stages: [
        { id: 1, name: 'طلب التجديد', assignedTo: 'requester', sla: { hours: 2 } },
        { id: 2, name: 'مراجعة المدير', assignedTo: 'manager', sla: { hours: 24 } },
        { id: 3, name: 'الاعتماد النهائي', assignedTo: 'director', sla: { hours: 48 } },
      ],
    },
    {
      id: 'document-approval',
      name: 'اعتماد المستندات',
      category: 'documents',
      stages: [
        { id: 1, name: 'رفع المستند', assignedTo: 'requester', sla: { hours: 1 } },
        { id: 2, name: 'المراجعة', assignedTo: 'reviewer', sla: { hours: 12 } },
        { id: 3, name: 'التوقيع', assignedTo: 'signatory', sla: { hours: 24 } },
      ],
    },
  ];

  templates.forEach(template => {
    workflowTemplates.set(template.id, template);
  });
}

// Initialize templates on startup
initializeDefaultTemplates();

module.exports = router;
