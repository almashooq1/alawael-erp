/**
 * ALAWAEL ERP - ADVANCED CRM & CUSTOMER MANAGEMENT ROUTES
 * Phase 16 - CRM & Customer Management API
 *
 * Endpoints for customer profiles, lead management, opportunities,
 * activities, segmentation, and CRM analytics
 */

const express = require('express');
const router = express.Router();
const crmService = require('../services/crm.service');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * CUSTOMER PROFILE ENDPOINTS
 */

/**
 * POST /api/v1/crm/customers
 * Create a new customer
 */
router.post('/customers', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      industry,
      website,
      address,
      city,
      state,
      country,
      zipCode,
      customProperties,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, email',
      });
    }

    const customer = await crmService.createCustomer({
      firstName,
      lastName,
      email,
      phone,
      company,
      industry,
      website,
      address,
      city,
      state,
      country,
      zipCode,
      customProperties,
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/customers
 * Get all customers with optional filtering
 */
router.get('/customers', async (req, res) => {
  try {
    const { segment, industry, status, search } = req.query;

    const customers = await crmService.getCustomers({
      segment,
      industry,
      status,
      search,
    });

    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/customers/:customerId
 * Get customer profile with related data
 */
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const profile = await crmService.getCustomerProfile(customerId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/crm/customers/:customerId
 * Update customer information
 */
router.put('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const updates = req.body;

    const customer = await crmService.updateCustomer(customerId, updates);

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * LEAD MANAGEMENT ENDPOINTS
 */

/**
 * POST /api/v1/crm/leads
 * Create a new lead
 */
router.post('/leads', async (req, res) => {
  try {
    const { name, email, phone, company, source, status, score } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email',
      });
    }

    const lead = await crmService.createLead({
      name,
      email,
      phone,
      company,
      source,
      status,
      score,
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/leads
 * Get all leads with optional filtering
 */
router.get('/leads', async (req, res) => {
  try {
    const { status, source, minScore } = req.query;

    const leads = await crmService.getLeads({
      status,
      source,
      minScore: minScore ? parseFloat(minScore) : undefined,
    });

    res.json({
      success: true,
      data: leads,
      count: leads.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/crm/leads/:leadId/score
 * Score a lead based on engagement and fit
 */
router.post('/leads/:leadId/score', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { engagementScore, fitScore, behavioralScore, activityScore } = req.body;

    const lead = await crmService.scoreLead(leadId, {
      engagementScore: engagementScore || 0,
      fitScore: fitScore || 0,
      behavioralScore: behavioralScore || 0,
      activityScore: activityScore || 0,
    });

    res.json({
      success: true,
      message: 'Lead scored successfully',
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/crm/leads/:leadId/convert
 * Convert a lead to a customer
 */
router.post('/leads/:leadId/convert', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: customerId',
      });
    }

    const lead = await crmService.convertLead(leadId, customerId);

    res.json({
      success: true,
      message: 'Lead converted to customer successfully',
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * OPPORTUNITY MANAGEMENT ENDPOINTS
 */

/**
 * POST /api/v1/crm/opportunities
 * Create a new opportunity
 */
router.post('/opportunities', async (req, res) => {
  try {
    const { customerId, name, description, value, stage, expectedCloseDate, probability } =
      req.body;

    if (!customerId || !name || !value) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerId, name, value',
      });
    }

    const opportunity = await crmService.createOpportunity({
      customerId,
      name,
      description,
      value,
      stage,
      expectedCloseDate,
      probability,
    });

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      data: opportunity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/crm/opportunities/:opportunityId/stage
 * Update opportunity stage
 */
router.put('/opportunities/:opportunityId/stage', async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: stage',
      });
    }

    const opportunity = await crmService.updateOpportunityStage(opportunityId, stage);

    res.json({
      success: true,
      message: 'Opportunity stage updated successfully',
      data: opportunity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/customers/:customerId/opportunities
 * Get all opportunities for a customer
 */
router.get('/customers/:customerId/opportunities', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await crmService.getOpportunitiesByCustomer(customerId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/pipeline
 * Get sales pipeline by stage
 */
router.get('/pipeline', async (req, res) => {
  try {
    const pipeline = await crmService.getSalesPipeline();

    res.json({
      success: true,
      data: pipeline,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ACTIVITY & INTERACTION ENDPOINTS
 */

/**
 * POST /api/v1/crm/customers/:customerId/activities
 * Log an activity for a customer
 */
router.post('/customers/:customerId/activities', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { type, description, createdBy, dueDate } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: type',
      });
    }

    const activity = await crmService.logActivity(customerId, {
      type,
      description,
      createdBy,
      dueDate,
    });

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: activity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/crm/activities/:activityId/complete
 * Mark activity as complete
 */
router.put('/activities/:activityId/complete', async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await crmService.completeActivity(activityId);

    res.json({
      success: true,
      message: 'Activity marked as complete',
      data: activity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/customers/:customerId/activities
 * Get all activities for a customer
 */
router.get('/customers/:customerId/activities', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit } = req.query;

    const activities = await crmService.getCustomerActivities(customerId, limit || 50);

    res.json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * CUSTOMER SEGMENTATION ENDPOINTS
 */

/**
 * POST /api/v1/crm/segments
 * Create a new customer segment
 */
router.post('/segments', async (req, res) => {
  try {
    const { name, description, criteria, color } = req.body;

    if (!name || !criteria) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, criteria',
      });
    }

    const segment = await crmService.createSegment({
      name,
      description,
      criteria,
      color,
    });

    res.status(201).json({
      success: true,
      message: 'Segment created successfully',
      data: segment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/segments
 * Get all customer segments
 */
router.get('/segments', async (req, res) => {
  try {
    const segments = await crmService.getSegments();

    res.json({
      success: true,
      data: segments,
      count: segments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * CONTACT MANAGEMENT ENDPOINTS
 */

/**
 * POST /api/v1/crm/customers/:customerId/contacts
 * Create a contact at a customer company
 */
router.post('/customers/:customerId/contacts', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { firstName, lastName, title, email, phone, role } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName',
      });
    }

    const contact = await crmService.createContact({
      customerId,
      firstName,
      lastName,
      title,
      email,
      phone,
      role,
    });

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/customers/:customerId/contacts
 * Get all contacts for a customer
 */
router.get('/customers/:customerId/contacts', async (req, res) => {
  try {
    const { customerId } = req.params;

    const contacts = await crmService.getCustomerContacts(customerId);

    res.json({
      success: true,
      data: contacts,
      count: contacts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * CUSTOMER LIFECYCLE ENDPOINTS
 */

/**
 * PUT /api/v1/crm/customers/:customerId/lifecycle
 * Update customer lifecycle stage
 */
router.put('/customers/:customerId/lifecycle', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: stage',
      });
    }

    const customer = await crmService.updateCustomerLifecycleStage(customerId, stage);

    res.json({
      success: true,
      message: 'Customer lifecycle stage updated',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/crm/lifecycle-report
 * Get customer lifecycle report
 */
router.get('/lifecycle-report', async (req, res) => {
  try {
    const report = await crmService.getCustomerLifecycleReport();

    res.json({
      success: true,
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
 * CRM ANALYTICS & INSIGHTS ENDPOINTS
 */

/**
 * GET /api/v1/crm/analytics
 * Get comprehensive CRM analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await crmService.getCRMAnalytics();

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
 * GET /api/v1/crm/customers/:customerId/insights
 * Get detailed insights for a specific customer
 */
router.get('/customers/:customerId/insights', async (req, res) => {
  try {
    const { customerId } = req.params;

    const insights = await crmService.getCustomerInsights(customerId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * HEALTH CHECK
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CRM',
    timestamp: new Date(),
  });
});

module.exports = router;
