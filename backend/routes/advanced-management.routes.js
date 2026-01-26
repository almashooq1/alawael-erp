/**
 * Advanced Management System
 * Scheduling, Resource Management, Workflow Automation, Budget Tracking
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');

// Schedule Schema
const ScheduleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  resourceType: { type: String, enum: ['therapist', 'equipment', 'room'], default: 'therapist' },
  resourceId: String,
  event: {
    title: String,
    description: String,
    start: Date,
    end: Date,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'once'] },
    endDate: Date,
  },
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled'] },
  createdAt: { type: Date, default: Date.now },
});

const Schedule = mongoose.model('Schedule', ScheduleSchema);

// Resource Schema
const ResourceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  name: String,
  type: { type: String, enum: ['therapist', 'equipment', 'room', 'material'] },
  availability: {
    totalHours: Number,
    usedHours: Number,
    availableHours: Number,
  },
  allocation: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      hours: Number,
      startDate: Date,
      endDate: Date,
    },
  ],
  cost: Number,
  status: { type: String, enum: ['available', 'allocated', 'maintenance'] },
  createdAt: { type: Date, default: Date.now },
});

const Resource = mongoose.model('Resource', ResourceSchema);

// Budget Schema
const BudgetSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  year: Number,
  department: String,
  allocatedBudget: Number,
  spentBudget: { type: Number, default: 0 },
  remaining: Number,
  categories: [
    {
      name: String,
      allocatedAmount: Number,
      spentAmount: Number,
    },
  ],
  expenses: [
    {
      description: String,
      amount: Number,
      category: String,
      date: Date,
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Budget = mongoose.model('Budget', BudgetSchema);

// Workflow Schema
const WorkflowSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  name: String,
  description: String,
  steps: [
    {
      stepNumber: Number,
      title: String,
      description: String,
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'in-progress', 'completed'] },
      dueDate: Date,
      completedAt: Date,
      conditions: [String],
    },
  ],
  status: { type: String, enum: ['draft', 'active', 'archived'] },
  instances: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startDate: Date,
      completedDate: Date,
      status: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Workflow = mongoose.model('Workflow', WorkflowSchema);

class AdvancedManagementService {
  /**
   * Create schedule
   */
  async createSchedule(organizationId, scheduleData) {
    try {
      const schedule = new Schedule({
        organizationId,
        ...scheduleData,
      });

      await schedule.save();
      return schedule;
    } catch (error) {
      console.error('Schedule creation error:', error);
      throw error;
    }
  }

  /**
   * Get schedule for date range
   */
  async getSchedule(organizationId, startDate, endDate) {
    try {
      const schedules = await Schedule.find({
        organizationId,
        'event.start': { $gte: startDate, $lte: endDate },
      }).populate('event.participants');

      return schedules;
    } catch (error) {
      console.error('Get schedule error:', error);
      throw error;
    }
  }

  /**
   * Allocate resource
   */
  async allocateResource(organizationId, resourceId, allocationData) {
    try {
      const resource = await Resource.findById(resourceId);

      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check availability
      if (allocationData.hours > resource.availability.availableHours) {
        throw new Error('Insufficient resource availability');
      }

      // Add allocation
      resource.allocation.push(allocationData);
      resource.availability.usedHours += allocationData.hours;
      resource.availability.availableHours -= allocationData.hours;

      if (resource.availability.availableHours === 0) {
        resource.status = 'allocated';
      }

      await resource.save();
      return resource;
    } catch (error) {
      console.error('Resource allocation error:', error);
      throw error;
    }
  }

  /**
   * Get resource utilization report
   */
  async getResourceUtilization(organizationId) {
    try {
      const resources = await Resource.find({ organizationId });

      const utilization = resources.map(resource => ({
        name: resource.name,
        type: resource.type,
        totalHours: resource.availability.totalHours,
        usedHours: resource.availability.usedHours,
        utilizationRate: (resource.availability.usedHours / resource.availability.totalHours) * 100,
        costPerHour: resource.cost / resource.availability.totalHours,
      }));

      return utilization;
    } catch (error) {
      console.error('Utilization report error:', error);
      throw error;
    }
  }

  /**
   * Track budget spending
   */
  async trackBudgetSpending(organizationId, year) {
    try {
      const budget = await Budget.findOne({ organizationId, year });

      if (!budget) {
        throw new Error('Budget not found');
      }

      // Calculate spending
      const totalSpent = budget.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      budget.spentBudget = totalSpent;
      budget.remaining = budget.allocatedBudget - totalSpent;

      // Update categories
      budget.categories.forEach(category => {
        category.spentAmount = budget.expenses
          .filter(e => e.category === category.name)
          .reduce((sum, e) => sum + e.amount, 0);
      });

      await budget.save();
      return budget;
    } catch (error) {
      console.error('Budget tracking error:', error);
      throw error;
    }
  }

  /**
   * Create workflow
   */
  async createWorkflow(organizationId, workflowData) {
    try {
      const workflow = new Workflow({
        organizationId,
        ...workflowData,
      });

      await workflow.save();
      return workflow;
    } catch (error) {
      console.error('Workflow creation error:', error);
      throw error;
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId, userId) {
    try {
      const workflow = await Workflow.findById(workflowId);

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Add instance
      workflow.instances.push({
        userId,
        startDate: new Date(),
        status: 'in-progress',
      });

      await workflow.save();
      return workflow;
    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
    }
  }

  /**
   * Update workflow step
   */
  async updateWorkflowStep(workflowId, stepNumber, status, userId) {
    try {
      const workflow = await Workflow.findById(workflowId);

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const step = workflow.steps.find(s => s.stepNumber === stepNumber);
      if (!step) {
        throw new Error('Step not found');
      }

      step.status = status;
      if (status === 'completed') {
        step.completedAt = new Date();
      }

      await workflow.save();
      return workflow;
    } catch (error) {
      console.error('Workflow step update error:', error);
      throw error;
    }
  }

  /**
   * Get management dashboard data
   */
  async getDashboardData(organizationId) {
    try {
      const [resources, schedules, budget, workflows] = await Promise.all([
        Resource.find({ organizationId }),
        Schedule.find({ organizationId, status: 'scheduled' }),
        Budget.findOne({ organizationId }),
        Workflow.find({ organizationId, status: 'active' }),
      ]);

      return {
        resourceCount: resources.length,
        utilizationRate:
          resources.length > 0
            ? (resources.reduce((sum, r) => sum + r.availability.usedHours, 0) /
                resources.reduce((sum, r) => sum + r.availability.totalHours, 0)) *
              100
            : 0,
        upcomingSchedules: schedules.length,
        budgetUtilization: budget ? (budget.spentBudget / budget.allocatedBudget) * 100 : 0,
        activeWorkflows: workflows.length,
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      throw error;
    }
  }
}

// Routes
const managementService = new AdvancedManagementService();

/**
 * Create schedule
 * POST /api/management/schedule
 */
router.post('/schedule', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId, event, recurrence } = req.body;

    const schedule = await managementService.createSchedule(req.user.organizationId, {
      resourceType,
      resourceId,
      event,
      recurrence,
    });

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get schedule
 * GET /api/management/schedule
 */
router.get('/schedule', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const schedules = await managementService.getSchedule(
      req.user.organizationId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ success: true, schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Allocate resource
 * POST /api/management/resources/:resourceId/allocate
 */
router.post(
  '/resources/:resourceId/allocate',
  authenticate,
  async (req, res) => {
    try {
      const { userId, hours, startDate, endDate } = req.body;

      const resource = await managementService.allocateResource(
        req.user.organizationId,
        req.params.resourceId,
        {
          userId,
          hours,
          startDate,
          endDate,
        }
      );

      res.json({ success: true, resource });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get resource utilization
 * GET /api/management/resources/utilization
 */
router.get('/resources/utilization', authenticate, async (req, res) => {
  try {
    const utilization = await managementService.getResourceUtilization(req.user.organizationId);

    res.json({ success: true, utilization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get budget
 * GET /api/management/budget
 */
router.get('/budget', authenticate, async (req, res) => {
  try {
    const { year } = req.query;

    const budget = await managementService.trackBudgetSpending(
      req.user.organizationId,
      parseInt(year) || new Date().getFullYear()
    );

    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create workflow
 * POST /api/management/workflow
 */
router.post('/workflow', authenticate, async (req, res) => {
  try {
    const { name, description, steps } = req.body;

    const workflow = await managementService.createWorkflow(req.user.organizationId, {
      name,
      description,
      steps,
    });

    res.status(201).json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute workflow
 * POST /api/management/workflow/:workflowId/execute
 */
router.post('/workflow/:workflowId/execute', authenticate, async (req, res) => {
  try {
    const workflow = await managementService.executeWorkflow(req.params.workflowId, req.user.id);

    res.json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update workflow step
 * PUT /api/management/workflow/:workflowId/step/:stepNumber
 */
router.put('/workflow/:workflowId/step/:stepNumber', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const workflow = await managementService.updateWorkflowStep(
      req.params.workflowId,
      parseInt(req.params.stepNumber),
      status,
      req.user.id
    );

    res.json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get management dashboard
 * GET /api/management/dashboard
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const data = await managementService.getDashboardData(req.user.organizationId);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.AdvancedManagementService = AdvancedManagementService;

