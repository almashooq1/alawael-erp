/**
 * Workflow API Routes
 * مسارات API لنظام سير العمل
 */

const express = require('express');
const router = express.Router();
const { 
  IntelligentWorkflowEngine, 
  WorkflowDefinition, 
  WorkflowInstance, 
  TaskInstance, 
  WorkflowAuditLog 
} = require('./intelligent-workflow-engine');

const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../permissions/permission-middleware');

const workflowEngine = new IntelligentWorkflowEngine();

// ============================================
// WORKFLOW DEFINITION ROUTES
// ============================================

/**
 * @route   GET /api/workflow/definitions
 * @desc    Get all workflow definitions
 * @access  Private (workflow.view)
 */
router.get('/definitions', authMiddleware, checkPermission('workflow.view'), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    
    const definitions = await WorkflowDefinition.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await WorkflowDefinition.countDocuments(query);
    
    res.json({
      success: true,
      data: definitions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workflow/definitions/:id
 * @desc    Get workflow definition by ID
 * @access  Private (workflow.view)
 */
router.get('/definitions/:id', authMiddleware, checkPermission('workflow.view'), async (req, res) => {
  try {
    const definition = await WorkflowDefinition.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('publishedBy', 'name');
    
    if (!definition) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    
    res.json({ success: true, data: definition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workflow/definitions
 * @desc    Create workflow definition
 * @access  Private (workflow.create)
 */
router.post('/definitions', authMiddleware, checkPermission('workflow.create'), async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    const definition = await workflowEngine.createWorkflow(req.body);
    res.status(201).json({ success: true, data: definition, message: 'تم إنشاء سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/workflow/definitions/:id
 * @desc    Update workflow definition
 * @access  Private (workflow.edit)
 */
router.put('/definitions/:id', authMiddleware, checkPermission('workflow.edit'), async (req, res) => {
  try {
    const definition = await WorkflowDefinition.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedBy: req.user.id } },
      { new: true, runValidators: true }
    );
    
    if (!definition) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    
    res.json({ success: true, data: definition, message: 'تم تحديث سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workflow/definitions/:id/publish
 * @desc    Publish workflow definition
 * @access  Private (workflow.publish)
 */
router.post('/definitions/:id/publish', authMiddleware, checkPermission('workflow.publish'), async (req, res) => {
  try {
    const definition = await workflowEngine.publishWorkflow(req.params.id, req.user.id);
    res.json({ success: true, data: definition, message: 'تم نشر سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/workflow/definitions/:id
 * @desc    Delete workflow definition
 * @access  Private (workflow.delete)
 */
router.delete('/definitions/:id', authMiddleware, checkPermission('workflow.delete'), async (req, res) => {
  try {
    const definition = await WorkflowDefinition.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    
    if (!definition) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    
    res.json({ success: true, message: 'تم أرشفة سير العمل' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// WORKFLOW INSTANCE ROUTES
// ============================================

/**
 * @route   POST /api/workflow/start
 * @desc    Start workflow instance
 * @access  Private
 */
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { workflowCode, title, variables } = req.body;
    
    const instance = await workflowEngine.startWorkflow(
      workflowCode,
      req.user.id,
      variables || {},
      title
    );
    
    res.status(201).json({ 
      success: true, 
      data: instance, 
      message: 'تم بدء سير العمل' 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workflow/instances
 * @desc    Get workflow instances
 * @access  Private (workflow.view)
 */
router.get('/instances', authMiddleware, checkPermission('workflow.view'), async (req, res) => {
  try {
    const { status, requester, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (requester) query.requester = requester;
    
    // If not admin, show only user's instances
    if (!req.user.isAdmin) {
      query.$or = [
        { requester: req.user.id },
        { currentAssignee: req.user.id },
      ];
    }
    
    const instances = await WorkflowInstance.find(query)
      .populate('definition', 'name nameAr code')
      .populate('requester', 'name')
      .populate('currentAssignee', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await WorkflowInstance.countDocuments(query);
    
    res.json({
      success: true,
      data: instances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workflow/instances/:id
 * @desc    Get workflow instance details
 * @access  Private
 */
router.get('/instances/:id', authMiddleware, async (req, res) => {
  try {
    const instance = await WorkflowInstance.findById(req.params.id)
      .populate('definition')
      .populate('requester', 'name email')
      .populate('currentAssignee', 'name email');
    
    if (!instance) {
      return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    }
    
    // Get tasks
    const tasks = await TaskInstance.find({ workflowInstance: instance._id })
      .populate('assignee', 'name email')
      .sort({ createdAt: 1 });
    
    // Get audit log
    const auditLog = await WorkflowAuditLog.find({ workflowInstance: instance._id })
      .populate('performedBy', 'name')
      .sort({ performedAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: {
        instance,
        tasks,
        auditLog,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workflow/instances/:id/cancel
 * @desc    Cancel workflow instance
 * @access  Private
 */
router.post('/instances/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const instance = await workflowEngine.cancelWorkflow(req.params.id, req.user.id, reason);
    res.json({ success: true, data: instance, message: 'تم إلغاء سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// TASK ROUTES
// ============================================

/**
 * @route   GET /api/workflow/tasks
 * @desc    Get user tasks
 * @access  Private
 */
router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    
    const query = { assignee: req.user.id };
    if (status) {
      const statuses = status.split(',');
      query.status = { $in: statuses };
    } else {
      query.status = { $in: ['assigned', 'in_progress'] };
    }
    if (priority) query.priority = priority;
    
    const tasks = await TaskInstance.find(query)
      .populate({
        path: 'workflowInstance',
        populate: { path: 'definition', select: 'name nameAr code' }
      })
      .sort({ 'sla.deadline': 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await TaskInstance.countDocuments(query);
    
    // Count by status
    const counts = await TaskInstance.aggregate([
      { $match: { assignee: mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    
    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      counts: counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workflow/tasks/:id
 * @desc    Get task details
 * @access  Private
 */
router.get('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await TaskInstance.findById(req.params.id)
      .populate({
        path: 'workflowInstance',
        populate: { path: 'definition requester', select: 'name nameAr code email' }
      })
      .populate('assignee', 'name email');
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workflow/tasks/:id/complete
 * @desc    Complete task
 * @access  Private
 */
router.post('/tasks/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { action, comment, attachments } = req.body;
    
    const task = await workflowEngine.completeTask(
      req.params.id,
      action,
      req.user.id,
      comment || '',
      attachments || []
    );
    
    res.json({ success: true, data: task, message: 'تم إتمام المهمة' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workflow/tasks/:id/reassign
 * @desc    Reassign task
 * @access  Private
 */
router.post('/tasks/:id/reassign', authMiddleware, async (req, res) => {
  try {
    const { assigneeId, reason } = req.body;
    
    const task = await workflowEngine.reassignTask(
      req.params.id,
      assigneeId,
      req.user.id,
      reason || ''
    );
    
    res.json({ success: true, data: task, message: 'تم إعادة تعيين المهمة' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workflow/tasks/:id/start
 * @desc    Start working on task
 * @access  Private
 */
router.post('/tasks/:id/start', authMiddleware, async (req, res) => {
  try {
    const task = await TaskInstance.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }
    
    if (task.assignee.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بهذه المهمة' });
    }
    
    task.status = 'in_progress';
    task.startedAt = new Date();
    await task.save();
    
    res.json({ success: true, data: task, message: 'تم بدء العمل على المهمة' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/workflow/statistics
 * @desc    Get workflow statistics
 * @access  Private (workflow.view)
 */
router.get('/statistics', authMiddleware, checkPermission('workflow.view'), async (req, res) => {
  try {
    const { workflowId, startDate, endDate } = req.query;
    
    const workflowStats = await workflowEngine.getWorkflowStatistics(workflowId, startDate, endDate);
    const taskStats = await workflowEngine.getTaskStatistics(null, startDate, endDate);
    
    // Get overdue tasks
    const overdueTasks = await workflowEngine.getOverdueTasks();
    
    res.json({
      success: true,
      data: {
        workflows: workflowStats,
        tasks: taskStats,
        overdueCount: overdueTasks.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workflow/dashboard
 * @desc    Get workflow dashboard data
 * @access  Private
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get pending tasks count
    const pendingTasks = await TaskInstance.countDocuments({
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] },
    });
    
    // Get overdue tasks count
    const overdueTasks = await TaskInstance.countDocuments({
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] },
      'sla.deadline': { $lt: new Date() },
    });
    
    // Get completed this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const completedThisWeek = await TaskInstance.countDocuments({
      assignee: userId,
      status: 'completed',
      completedAt: { $gte: weekStart },
    });
    
    // Get started workflows
    const startedWorkflows = await WorkflowInstance.countDocuments({
      requester: userId,
      status: 'running',
    });
    
    // Get recent tasks
    const recentTasks = await TaskInstance.find({
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] },
    })
      .populate({
        path: 'workflowInstance',
        populate: { path: 'definition', select: 'name nameAr' }
      })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      success: true,
      data: {
        pendingTasks,
        overdueTasks,
        completedThisWeek,
        startedWorkflows,
        recentTasks,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// SLA ROUTES
// ============================================

/**
 * @route   POST /api/workflow/sla/check
 * @desc    Check SLA violations (Cron job)
 * @access  Private (system)
 */
router.post('/sla/check', async (req, res) => {
  try {
    const result = await workflowEngine.checkSLAViolations();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;