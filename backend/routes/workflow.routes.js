/**
 * Workflow Management System - Unified Routes
 * نظام سير العمل الشامل والذكي - المسارات الموحدة
 *
 * Wraps the existing IntelligentWorkflowEngine with comprehensive API endpoints
 * covering definitions, templates, instances, tasks, analytics and bulk operations.
 */

const express = require('express');
const mongoose = require('mongoose');
const { safeError } = require('../utils/safeError');
const router = express.Router();

const {
  IntelligentWorkflowEngine,
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
  WorkflowAuditLog,
} = require('../workflow/intelligent-workflow-engine');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { escapeRegex } = require('../utils/sanitize');

const engine = new IntelligentWorkflowEngine();

// ─── Helper: Extract user id safely ─────────────────────────────────────────
const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ============================================================================
// DASHBOARD  ─  GET /dashboard
// ============================================================================

router.get('/dashboard', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel queries
    const [
      pendingTasks,
      overdueTasks,
      completedThisWeek,
      completedThisMonth,
      myRunningWorkflows,
      totalDefinitions,
      activeDefinitions,
      totalRunning,
      totalCompleted,
      recentTasks,
      recentInstances,
      slaViolations,
    ] = await Promise.all([
      TaskInstance.countDocuments({
        assignee: userId,
        status: { $in: ['assigned', 'in_progress'] },
      }),
      TaskInstance.countDocuments({
        assignee: userId,
        status: { $in: ['assigned', 'in_progress'] },
        'sla.deadline': { $lt: now },
      }),
      TaskInstance.countDocuments({
        assignee: userId,
        status: 'completed',
        completedAt: { $gte: weekStart },
      }),
      TaskInstance.countDocuments({
        assignee: userId,
        status: 'completed',
        completedAt: { $gte: monthStart },
      }),
      WorkflowInstance.countDocuments({ requester: userId, status: 'running' }),
      WorkflowDefinition.countDocuments({}),
      WorkflowDefinition.countDocuments({ status: 'active' }),
      WorkflowInstance.countDocuments({ status: 'running' }),
      WorkflowInstance.countDocuments({ status: 'completed' }),
      TaskInstance.find({ assignee: userId, status: { $in: ['assigned', 'in_progress'] } })
        .populate({
          path: 'workflowInstance',
          populate: { path: 'definition', select: 'name nameAr code category' },
        })
        .sort({ 'sla.deadline': 1, createdAt: -1 })
        .limit(8)
        .lean(),
      WorkflowInstance.find({ $or: [{ requester: userId }, { currentAssignee: userId }] })
        .populate('definition', 'name nameAr code category')
        .populate('requester', 'name')
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
      WorkflowInstance.countDocuments({ status: 'running', 'sla.violated': true }),
    ]);

    // Task distribution by priority
    const tasksByPriority = await TaskInstance.aggregate([
      {
        $match: {
          assignee: new mongoose.Types.ObjectId(userId),
          status: { $in: ['assigned', 'in_progress'] },
        },
      },
      { $group: { _id: '$sla.violated', count: { $sum: 1 } } },
    ]);

    // Workflows by category
    const workflowsByCategory = await WorkflowDefinition.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          pendingTasks,
          overdueTasks,
          completedThisWeek,
          completedThisMonth,
          myRunningWorkflows,
          totalDefinitions,
          activeDefinitions,
          totalRunning,
          totalCompleted,
          slaViolations,
        },
        recentTasks,
        recentInstances,
        tasksByPriority,
        workflowsByCategory,
      },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// ============================================================================
// DEFINITIONS  ─  CRUD + publish/clone/export
// ============================================================================

router.get('/definitions', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { code: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const [definitions, total] = await Promise.all([
      WorkflowDefinition.find(query)
        .populate('createdBy', 'name')
        .populate('publishedBy', 'name')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      WorkflowDefinition.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: definitions,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.get('/definitions/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await WorkflowDefinition.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('publishedBy', 'name');
    if (!def) return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    res.json({ success: true, data: def });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.post('/definitions', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    req.body.createdBy = uid(req);
    const def = await engine.createWorkflow(req.body);
    res.status(201).json({ success: true, data: def, message: 'تم إنشاء سير العمل بنجاح' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ في الإنشاء' });
  }
});

router.put('/definitions/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await WorkflowDefinition.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedBy: uid(req) } },
      { new: true, runValidators: true }
    );
    if (!def) return res.status(404).json({ success: false, message: 'سير العمل غير موجود' });
    res.json({ success: true, data: def, message: 'تم تحديث سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ في التحديث' });
  }
});

router.post('/definitions/:id/publish', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await engine.publishWorkflow(req.params.id, uid(req));
    res.json({ success: true, data: def, message: 'تم نشر سير العمل وتفعيله' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ في النشر' });
  }
});

router.post('/definitions/:id/clone', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const original = await WorkflowDefinition.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ success: false, message: 'غير موجود' });
    delete original._id;
    original.name = `${original.name} (نسخة)`;
    original.nameAr = `${original.nameAr} (نسخة)`;
    original.code = `${original.code}_copy_${Date.now()}`;
    original.status = 'draft';
    original.version = 1;
    original.createdBy = uid(req);
    original.publishedAt = null;
    original.publishedBy = null;
    const clone = new WorkflowDefinition(original);
    await clone.save();
    res.status(201).json({ success: true, data: clone, message: 'تم نسخ سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ في النسخ' });
  }
});

router.delete('/definitions/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await WorkflowDefinition.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!def) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم أرشفة سير العمل' });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// Export definition as JSON
router.get('/definitions/:id/export', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await WorkflowDefinition.findById(req.params.id).lean();
    if (!def) return res.status(404).json({ success: false, message: 'غير موجود' });
    delete def._id;
    delete def.__v;
    res.json({ success: true, data: def });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// Import definition from JSON
router.post('/definitions/import', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const data = req.body;
    data.code = `imported_${Date.now()}`;
    data.status = 'draft';
    data.createdBy = uid(req);
    const def = new WorkflowDefinition(data);
    await def.save();
    res.status(201).json({ success: true, data: def, message: 'تم استيراد سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في الاستيراد' });
  }
});

// ============================================================================
// TEMPLATES  ─  Pre-built workflow templates
// ============================================================================

function getBuiltInTemplates() {
  return [
    {
      id: 'leave-request',
      name: 'Leave Request',
      nameAr: 'طلب إجازة',
      category: 'request',
      description: 'سير عمل طلب الإجازة مع موافقة المدير المباشر ثم الموارد البشرية',
      icon: 'EventBusy',
      stepsCount: 5,
      estimatedDuration: '2-3 أيام',
      tags: ['موارد بشرية', 'إجازات'],
      steps: [
        {
          id: 's1',
          name: 'Start',
          nameAr: 'البداية',
          type: 'start',
          nextSteps: ['s2'],
          position: { x: 100, y: 200 },
        },
        {
          id: 's2',
          name: 'Manager Approval',
          nameAr: 'موافقة المدير',
          type: 'approval',
          assignment: { type: 'manager' },
          sla: { enabled: true, duration: 1440 },
          taskConfig: {
            priority: 'medium',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'موافقة',
                type: 'approve',
                nextStep: 's3',
              },
              { id: 'reject', label: 'Reject', labelAr: 'رفض', type: 'reject', nextStep: 's5' },
            ],
          },
          nextSteps: ['s3'],
          position: { x: 300, y: 200 },
        },
        {
          id: 's3',
          name: 'HR Review',
          nameAr: 'مراجعة الموارد البشرية',
          type: 'approval',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 480 },
          taskConfig: {
            priority: 'medium',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'موافقة',
                type: 'approve',
                nextStep: 's4',
              },
              { id: 'return', label: 'Return', labelAr: 'إعادة', type: 'return', nextStep: 's2' },
            ],
          },
          nextSteps: ['s4'],
          position: { x: 500, y: 200 },
        },
        {
          id: 's4',
          name: 'Notification',
          nameAr: 'إشعار',
          type: 'notification',
          nextSteps: ['s5'],
          position: { x: 700, y: 200 },
        },
        { id: 's5', name: 'End', nameAr: 'النهاية', type: 'end', position: { x: 900, y: 200 } },
      ],
    },
    {
      id: 'purchase-order',
      name: 'Purchase Order',
      nameAr: 'أمر شراء',
      category: 'approval',
      description: 'سير عمل أمر الشراء مع التحقق من الميزانية ومستويات الموافقة المتعددة',
      icon: 'ShoppingCart',
      stepsCount: 7,
      estimatedDuration: '3-5 أيام',
      tags: ['مشتريات', 'مالية'],
      steps: [
        {
          id: 's1',
          name: 'Start',
          nameAr: 'البداية',
          type: 'start',
          nextSteps: ['s2'],
          position: { x: 50, y: 200 },
        },
        {
          id: 's2',
          name: 'Budget Check',
          nameAr: 'فحص الميزانية',
          type: 'condition',
          conditions: [
            { id: 'c1', field: 'amount', operator: 'lte', value: 5000, nextStep: 's3' },
            { id: 'c2', field: 'amount', operator: 'gt', value: 5000, nextStep: 's4' },
          ],
          defaultNextStep: 's3',
          position: { x: 200, y: 200 },
        },
        {
          id: 's3',
          name: 'Dept Head Approval',
          nameAr: 'موافقة رئيس القسم',
          type: 'approval',
          assignment: { type: 'manager' },
          sla: { enabled: true, duration: 1440 },
          taskConfig: {
            priority: 'high',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'موافقة',
                type: 'approve',
                nextStep: 's5',
              },
              { id: 'reject', label: 'Reject', labelAr: 'رفض', type: 'reject', nextStep: 's7' },
            ],
          },
          nextSteps: ['s5'],
          position: { x: 400, y: 100 },
        },
        {
          id: 's4',
          name: 'Director Approval',
          nameAr: 'موافقة المدير العام',
          type: 'approval',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 2880 },
          taskConfig: {
            priority: 'urgent',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'موافقة',
                type: 'approve',
                nextStep: 's5',
              },
              { id: 'reject', label: 'Reject', labelAr: 'رفض', type: 'reject', nextStep: 's7' },
            ],
          },
          nextSteps: ['s5'],
          position: { x: 400, y: 300 },
        },
        {
          id: 's5',
          name: 'Finance Processing',
          nameAr: 'المعالجة المالية',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 480 },
          nextSteps: ['s6'],
          position: { x: 600, y: 200 },
        },
        {
          id: 's6',
          name: 'Notify Requester',
          nameAr: 'إشعار مقدم الطلب',
          type: 'notification',
          nextSteps: ['s7'],
          position: { x: 750, y: 200 },
        },
        { id: 's7', name: 'End', nameAr: 'النهاية', type: 'end', position: { x: 900, y: 200 } },
      ],
    },
    {
      id: 'employee-onboarding',
      name: 'Employee Onboarding',
      nameAr: 'تهيئة موظف جديد',
      category: 'project',
      description: 'سير عمل شامل لتهيئة الموظف الجديد - من تجهيز المكتب إلى اعتماد فترة التجربة',
      icon: 'PersonAdd',
      stepsCount: 8,
      estimatedDuration: '7-14 يوم',
      tags: ['موارد بشرية', 'تهيئة'],
      steps: [
        {
          id: 's1',
          name: 'Start',
          nameAr: 'البداية',
          type: 'start',
          nextSteps: ['s2'],
          position: { x: 50, y: 200 },
        },
        {
          id: 's2',
          name: 'IT Setup',
          nameAr: 'إعداد تقنية المعلومات',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 2880 },
          nextSteps: ['s3'],
          position: { x: 200, y: 100 },
        },
        {
          id: 's3',
          name: 'Workspace Setup',
          nameAr: 'تجهيز مكان العمل',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 1440 },
          nextSteps: ['s4'],
          position: { x: 350, y: 200 },
        },
        {
          id: 's4',
          name: 'HR Documentation',
          nameAr: 'مستندات الموارد البشرية',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 1440 },
          nextSteps: ['s5'],
          position: { x: 500, y: 200 },
        },
        {
          id: 's5',
          name: 'Training Enrollment',
          nameAr: 'التسجيل في التدريب',
          type: 'task',
          assignment: { type: 'role' },
          nextSteps: ['s6'],
          position: { x: 650, y: 200 },
        },
        {
          id: 's6',
          name: 'Manager Welcome',
          nameAr: 'ترحيب المدير',
          type: 'notification',
          nextSteps: ['s7'],
          position: { x: 800, y: 200 },
        },
        {
          id: 's7',
          name: 'Probation Review',
          nameAr: 'مراجعة فترة التجربة',
          type: 'approval',
          assignment: { type: 'manager' },
          sla: { enabled: true, duration: 129600 },
          taskConfig: {
            priority: 'medium',
            actions: [
              { id: 'pass', label: 'Pass', labelAr: 'اجتياز', type: 'approve', nextStep: 's8' },
              { id: 'extend', label: 'Extend', labelAr: 'تمديد', type: 'return', nextStep: 's7' },
            ],
          },
          nextSteps: ['s8'],
          position: { x: 950, y: 200 },
        },
        { id: 's8', name: 'End', nameAr: 'النهاية', type: 'end', position: { x: 1100, y: 200 } },
      ],
    },
    {
      id: 'document-approval',
      name: 'Document Approval',
      nameAr: 'اعتماد مستند',
      category: 'approval',
      description: 'سير عمل اعتماد المستندات والوثائق الرسمية',
      icon: 'Description',
      stepsCount: 5,
      estimatedDuration: '1-2 يوم',
      tags: ['مستندات', 'اعتماد'],
      steps: [
        {
          id: 's1',
          name: 'Start',
          nameAr: 'البداية',
          type: 'start',
          nextSteps: ['s2'],
          position: { x: 100, y: 200 },
        },
        {
          id: 's2',
          name: 'Review',
          nameAr: 'المراجعة',
          type: 'approval',
          assignment: { type: 'manager' },
          sla: { enabled: true, duration: 720 },
          taskConfig: {
            priority: 'high',
            requireComment: true,
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'اعتماد',
                type: 'approve',
                nextStep: 's3',
              },
              { id: 'revise', label: 'Revise', labelAr: 'تعديل', type: 'return', nextStep: 's1' },
              { id: 'reject', label: 'Reject', labelAr: 'رفض', type: 'reject', nextStep: 's5' },
            ],
          },
          nextSteps: ['s3'],
          position: { x: 350, y: 200 },
        },
        {
          id: 's3',
          name: 'Final Approval',
          nameAr: 'الاعتماد النهائي',
          type: 'approval',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 1440 },
          taskConfig: {
            priority: 'high',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'اعتماد',
                type: 'approve',
                nextStep: 's4',
              },
              { id: 'reject', label: 'Reject', labelAr: 'رفض', type: 'reject', nextStep: 's5' },
            ],
          },
          nextSteps: ['s4'],
          position: { x: 600, y: 200 },
        },
        {
          id: 's4',
          name: 'Publish',
          nameAr: 'النشر',
          type: 'notification',
          nextSteps: ['s5'],
          position: { x: 800, y: 200 },
        },
        { id: 's5', name: 'End', nameAr: 'النهاية', type: 'end', position: { x: 950, y: 200 } },
      ],
    },
    {
      id: 'incident-report',
      name: 'Incident Report',
      nameAr: 'بلاغ حادثة',
      category: 'incident',
      description: 'سير عمل الإبلاغ عن الحوادث والتحقيق والمتابعة',
      icon: 'ReportProblem',
      stepsCount: 6,
      estimatedDuration: '3-7 أيام',
      tags: ['سلامة', 'حوادث'],
      steps: [
        {
          id: 's1',
          name: 'Start',
          nameAr: 'البداية',
          type: 'start',
          nextSteps: ['s2'],
          position: { x: 50, y: 200 },
        },
        {
          id: 's2',
          name: 'Investigation',
          nameAr: 'التحقيق',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 2880 },
          nextSteps: ['s3'],
          position: { x: 200, y: 200 },
        },
        {
          id: 's3',
          name: 'Assessment',
          nameAr: 'التقييم',
          type: 'approval',
          assignment: { type: 'manager' },
          sla: { enabled: true, duration: 1440 },
          taskConfig: {
            priority: 'urgent',
            actions: [
              {
                id: 'approve',
                label: 'Close',
                labelAr: 'إغلاق',
                type: 'approve',
                nextStep: 's5',
              },
              {
                id: 'escalate',
                label: 'Escalate',
                labelAr: 'تصعيد',
                type: 'custom',
                nextStep: 's4',
              },
            ],
          },
          nextSteps: ['s4', 's5'],
          position: { x: 400, y: 200 },
        },
        {
          id: 's4',
          name: 'Executive Review',
          nameAr: 'مراجعة الإدارة العليا',
          type: 'approval',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 4320 },
          taskConfig: {
            priority: 'urgent',
            actions: [
              { id: 'resolve', label: 'Resolve', labelAr: 'حل', type: 'approve', nextStep: 's5' },
            ],
          },
          nextSteps: ['s5'],
          position: { x: 600, y: 100 },
        },
        {
          id: 's5',
          name: 'Notification',
          nameAr: 'إشعار',
          type: 'notification',
          nextSteps: ['s6'],
          position: { x: 750, y: 200 },
        },
        { id: 's6', name: 'End', nameAr: 'النهاية', type: 'end', position: { x: 900, y: 200 } },
      ],
    },
    {
      id: 'change-request',
      name: 'Change Request',
      nameAr: 'طلب تغيير',
      category: 'change',
      description: 'سير عمل طلبات التغيير مع تقييم الأثر والموافقة',
      icon: 'SwapHoriz',
      stepsCount: 6,
      estimatedDuration: '5-10 أيام',
      tags: ['تغيير', 'إدارة'],
      steps: [
        {
          id: 's1',
          name: 'Start',
          nameAr: 'البداية',
          type: 'start',
          nextSteps: ['s2'],
          position: { x: 50, y: 200 },
        },
        {
          id: 's2',
          name: 'Impact Assessment',
          nameAr: 'تقييم الأثر',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 4320 },
          nextSteps: ['s3'],
          position: { x: 200, y: 200 },
        },
        {
          id: 's3',
          name: 'CAB Review',
          nameAr: 'مراجعة لجنة التغيير',
          type: 'approval',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 2880 },
          taskConfig: {
            priority: 'high',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                labelAr: 'موافقة',
                type: 'approve',
                nextStep: 's4',
              },
              { id: 'reject', label: 'Reject', labelAr: 'رفض', type: 'reject', nextStep: 's6' },
            ],
          },
          nextSteps: ['s4'],
          position: { x: 400, y: 200 },
        },
        {
          id: 's4',
          name: 'Implementation',
          nameAr: 'التنفيذ',
          type: 'task',
          assignment: { type: 'role' },
          sla: { enabled: true, duration: 10080 },
          nextSteps: ['s5'],
          position: { x: 600, y: 200 },
        },
        {
          id: 's5',
          name: 'Verification',
          nameAr: 'التحقق',
          type: 'approval',
          assignment: { type: 'manager' },
          taskConfig: {
            priority: 'medium',
            actions: [
              {
                id: 'approve',
                label: 'Verify',
                labelAr: 'تحقق',
                type: 'approve',
                nextStep: 's6',
              },
            ],
          },
          nextSteps: ['s6'],
          position: { x: 800, y: 200 },
        },
        { id: 's6', name: 'End', nameAr: 'النهاية', type: 'end', position: { x: 950, y: 200 } },
      ],
    },
  ];
}

router.get('/templates', authMiddleware, requireBranchAccess, async (_req, res) => {
  try {
    const templates = getBuiltInTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// Deploy template as new definition — looks up template server-side
router.post('/templates/:templateId/deploy', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    // Use the same template list from GET /templates (extracted as helper)
    const templates = getBuiltInTemplates();
    const tpl = templates.find(t => t.id === req.params.templateId);
    if (!tpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });

    const def = new WorkflowDefinition({
      name: tpl.name,
      nameAr: tpl.nameAr,
      code: `${tpl.id}_${Date.now()}`,
      category: tpl.category || 'general',
      description: tpl.description,
      steps: tpl.steps || [],
      status: 'draft',
      version: 1,
      createdBy: uid(req),
    });
    await def.save();
    res.status(201).json({ success: true, data: def, message: 'تم نشر القالب كسير عمل جديد' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ في النشر' });
  }
});

// ============================================================================
// INSTANCES  ─  Start / list / detail / cancel / suspend / resume
// ============================================================================

router.post('/instances/start', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { workflowCode, title, variables, priority } = req.body;
    const instance = await engine.startWorkflow(workflowCode, uid(req), variables || {}, title);
    if (priority) {
      instance.priority = priority;
      await instance.save();
    }
    res.status(201).json({ success: true, data: instance, message: 'تم بدء سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ' });
  }
});

router.get('/instances', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { status, priority, _category, _search, mine, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Filter by user involvement
    if (mine === 'true') {
      query.$or = [{ requester: uid(req) }, { currentAssignee: uid(req) }];
    }

    const [instances, total] = await Promise.all([
      WorkflowInstance.find(query)
        .populate('definition', 'name nameAr code category')
        .populate('requester', 'name')
        .populate('currentAssignee', 'name')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      WorkflowInstance.countDocuments(query),
    ]);

    // Status counts
    const statusCounts = await WorkflowInstance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: instances,
      statusCounts: statusCounts.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.get('/instances/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const instance = await WorkflowInstance.findById(req.params.id)
      .populate('definition')
      .populate('requester', 'name email')
      .populate('currentAssignee', 'name email');
    if (!instance) return res.status(404).json({ success: false, message: 'غير موجود' });

    const [tasks, auditLog] = await Promise.all([
      TaskInstance.find({ workflowInstance: instance._id })
        .populate('assignee', 'name email')
        .populate('delegatedFrom', 'name')
        .sort({ createdAt: 1 })
        .lean(),
      WorkflowAuditLog.find({ workflowInstance: instance._id })
        .populate('performedBy', 'name')
        .sort({ performedAt: -1 })
        .limit(100)
        .lean(),
    ]);

    res.json({ success: true, data: { instance, tasks, auditLog } });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.post('/instances/:id/cancel', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const instance = await engine.cancelWorkflow(req.params.id, uid(req), req.body.reason || '');
    res.json({ success: true, data: instance, message: 'تم إلغاء سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ' });
  }
});

router.post('/instances/:id/suspend', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const instance = await WorkflowInstance.findById(req.params.id);
    if (!instance || instance.status !== 'running')
      return res.status(400).json({ success: false, message: 'لا يمكن تعليق سير العمل' });
    instance.status = 'suspended';
    await instance.save();
    await engine.createAuditLog({
      workflowInstance: instance._id,
      action: 'suspend',
      performedBy: uid(req),
      comment: req.body.reason || 'تعليق سير العمل',
    });
    res.json({ success: true, data: instance, message: 'تم تعليق سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/instances/:id/resume', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const instance = await WorkflowInstance.findById(req.params.id);
    if (!instance || instance.status !== 'suspended')
      return res.status(400).json({ success: false, message: 'لا يمكن استئناف سير العمل' });
    instance.status = 'running';
    await instance.save();
    await engine.createAuditLog({
      workflowInstance: instance._id,
      action: 'restart',
      performedBy: uid(req),
      comment: 'استئناف سير العمل',
    });
    res.json({ success: true, data: instance, message: 'تم استئناف سير العمل' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ' });
  }
});

// ============================================================================
// TASKS  ─  My tasks / detail / complete / reassign / delegate / bulk
// ============================================================================

router.get('/tasks', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { status, _priority, overdue, _search, page = 1, limit = 20 } = req.query;
    const query = { assignee: uid(req) };

    if (status) {
      query.status = { $in: status.split(',') };
    } else {
      query.status = { $in: ['assigned', 'in_progress'] };
    }

    if (overdue === 'true') {
      query['sla.deadline'] = { $lt: new Date() };
    }

    const [tasks, total] = await Promise.all([
      TaskInstance.find(query)
        .populate({
          path: 'workflowInstance',
          populate: [
            { path: 'definition', select: 'name nameAr code category' },
            { path: 'requester', select: 'name' },
          ],
        })
        .populate('assignee', 'name')
        .sort({ 'sla.deadline': 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      TaskInstance.countDocuments(query),
    ]);

    // Status counts for current user
    const counts = await TaskInstance.aggregate([
      { $match: { assignee: new mongoose.Types.ObjectId(uid(req)) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: tasks,
      counts: counts.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.get('/tasks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const task = await TaskInstance.findById(req.params.id)
      .populate({
        path: 'workflowInstance',
        populate: [{ path: 'definition' }, { path: 'requester', select: 'name email' }],
      })
      .populate('assignee', 'name email')
      .populate('delegatedFrom', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });

    // Get audit log for this task
    const auditLog = await WorkflowAuditLog.find({ taskInstance: task._id })
      .populate('performedBy', 'name')
      .sort({ performedAt: -1 })
      .lean();

    res.json({ success: true, data: { task, auditLog } });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.post('/tasks/:id/start', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const task = await TaskInstance.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'غير موجودة' });
    task.status = 'in_progress';
    task.startedAt = new Date();
    await task.save();
    res.json({ success: true, data: task, message: 'تم بدء العمل على المهمة' });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.post('/tasks/:id/complete', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { action, comment, attachments } = req.body;
    const task = await engine.completeTask(
      req.params.id,
      action,
      uid(req),
      comment || '',
      attachments || []
    );
    res.json({ success: true, data: task, message: 'تم إتمام المهمة بنجاح' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ' });
  }
});

router.post('/tasks/:id/reassign', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { assigneeId, reason } = req.body;
    const task = await engine.reassignTask(req.params.id, assigneeId, uid(req), reason || '');
    res.json({ success: true, data: task, message: 'تم إعادة التعيين' });
  } catch (error) {
    res.status(400).json({ success: false, message: safeError(error) || 'حدث خطأ' });
  }
});

// Bulk complete tasks
router.post('/tasks/bulk/complete', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { taskIds, action, comment } = req.body;
    const results = [];
    for (const taskId of taskIds || []) {
      try {
        const _task = await engine.completeTask(taskId, action, uid(req), comment || '');
        results.push({ taskId, success: true });
      } catch (err) {
        results.push({ taskId, success: false, error: safeError(err) });
      }
    }
    res.json({ success: true, data: results, message: `تم معالجة ${results.length} مهمة` });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// ============================================================================
// ANALYTICS  ─  Statistics / performance / bottlenecks / SLA compliance
// ============================================================================

router.get('/analytics/overview', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { startDate, endDate, workflowId } = req.query;
    const match = {};
    if (workflowId) match.definition = new mongoose.Types.ObjectId(workflowId);
    if (startDate || endDate) {
      match.startedAt = {};
      if (startDate) match.startedAt.$gte = new Date(startDate);
      if (endDate) match.startedAt.$lte = new Date(endDate);
    }

    const [workflowStats, taskStats, overdueTasks] = await Promise.all([
      engine.getWorkflowStatistics(workflowId, startDate, endDate),
      engine.getTaskStatistics(null, startDate, endDate),
      engine.getOverdueTasks(),
    ]);

    // Completion trend (last 30 days) — both completed + started
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [completedTrend, startedTrend] = await Promise.all([
      WorkflowInstance.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            completed: { $sum: 1 },
            avgDuration: { $avg: { $subtract: ['$completedAt', '$startedAt'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WorkflowInstance.aggregate([
        { $match: { startedAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
            started: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Merge completed + started into unified trend
    const trendMap = {};
    completedTrend.forEach(d => {
      trendMap[d._id] = {
        ...trendMap[d._id],
        _id: d._id,
        completed: d.completed,
        avgDuration: d.avgDuration,
      };
    });
    startedTrend.forEach(d => {
      trendMap[d._id] = { ...trendMap[d._id], _id: d._id, started: d.started };
    });
    const completionTrend = Object.values(trendMap)
      .map(d => ({
        _id: d._id,
        completed: d.completed || 0,
        started: d.started || 0,
        avgDuration: d.avgDuration || 0,
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Category distribution
    const categoryDist = await WorkflowInstance.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'workflowdefinitions',
          localField: 'definition',
          foreignField: '_id',
          as: 'def',
        },
      },
      { $unwind: '$def' },
      { $group: { _id: '$def.category', count: { $sum: 1 } } },
    ]);

    // SLA compliance rate — return full breakdown object
    const slaStats = await WorkflowInstance.aggregate([
      { $match: { status: 'completed', ...match } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          violated: { $sum: { $cond: ['$sla.violated', 1, 0] } },
        },
      },
    ]);

    const slaTotal = slaStats[0]?.total || 0;
    const slaViolated = slaStats[0]?.violated || 0;
    const slaOnTime = slaTotal - slaViolated;

    // Average completion time in hours
    const avgCompletionAgg = await WorkflowInstance.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $exists: true },
          startedAt: { $exists: true },
        },
      },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$completedAt', '$startedAt'] } } } },
    ]);
    const avgCompletionTime = avgCompletionAgg[0]
      ? Math.round(avgCompletionAgg[0].avgMs / 3600000)
      : null;

    res.json({
      success: true,
      data: {
        workflows: workflowStats,
        tasks: taskStats,
        overdueCount: overdueTasks.length,
        completionTrend,
        categoryDistribution: categoryDist,
        slaCompliance: {
          total: slaTotal,
          onTime: slaOnTime,
          overdue: slaViolated,
          rate: slaTotal > 0 ? Math.round((slaOnTime / slaTotal) * 100 * 10) / 10 : 100,
        },
        avgCompletionTime,
      },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

router.get('/analytics/performance', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    // Average processing time per step
    const stepPerformance = await TaskInstance.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$name',
          avgDuration: {
            $avg: { $subtract: ['$completedAt', '$createdAt'] },
          },
          count: { $sum: 1 },
          slaViolations: { $sum: { $cond: ['$sla.violated', 1, 0] } },
        },
      },
      { $sort: { avgDuration: -1 } },
      { $limit: 20 },
    ]);

    // Top performers (users)
    const topPerformers = await TaskInstance.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$assignee',
          completed: { $sum: 1 },
          avgDuration: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
          onTime: { $sum: { $cond: [{ $eq: ['$sla.violated', false] }, 1, 0] } },
        },
      },
      { $sort: { completed: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          completed: 1,
          avgDuration: 1,
          onTime: 1,
          onTimeRate: {
            $cond: [
              { $gt: ['$completed', 0] },
              { $multiply: [{ $divide: ['$onTime', '$completed'] }, 100] },
              100,
            ],
          },
        },
      },
    ]);

    // Bottleneck detection (steps taking longest)
    const bottlenecks = await TaskInstance.aggregate([
      { $match: { status: { $in: ['assigned', 'in_progress'] } } },
      {
        $group: {
          _id: '$name',
          waiting: { $sum: 1 },
          avgWait: { $avg: { $subtract: [new Date(), '$createdAt'] } },
          overdue: { $sum: { $cond: ['$sla.violated', 1, 0] } },
        },
      },
      { $sort: { waiting: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: { stepPerformance, topPerformers, bottlenecks },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// ============================================================================
// SLA  ─  Check violations (cron-friendly)
// ============================================================================

router.post('/sla/check', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const result = await engine.checkSLAViolations();
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

router.get('/audit-log', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceId, action, page = 1, limit = 50 } = req.query;
    const query = {};
    if (instanceId) query.workflowInstance = instanceId;
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      WorkflowAuditLog.find(query)
        .populate('performedBy', 'name')
        .populate('workflowInstance', 'title')
        .sort({ performedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      WorkflowAuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    safeError(res, error, 'workflow');
  }
});

module.exports = router;
