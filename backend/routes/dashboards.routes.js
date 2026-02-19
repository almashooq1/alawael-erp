/**
 * Dashboard Routes
 * طرق API لوحات المعلومات
 */

const express = require('express');
const router = express.Router();
const executiveDashboardService = require('../services/executive-dashboard.service');
const hrDashboardService = require('../services/hr-dashboard.service');
const employeeDashboardService = require('../services/employee-dashboard.service');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// ============================================
// EXECUTIVE DASHBOARD ROUTES
// ============================================

/**
 * GET /dashboards/executive
 * Get executive dashboard
 */
router.get('/executive', auth, authorize(['admin', 'executive']), async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
      departmentId: req.query.departmentId
    };

    const dashboard = await executiveDashboardService.getExecutiveDashboard(filters);
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Failed to get executive dashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get executive dashboard',
      message: error.message
    });
  }
});

/**
 * GET /dashboards/executive/kpis
 * Get executive KPIs only
 */
router.get('/executive/kpis', auth, authorize(['admin', 'executive']), async (req, res) => {
  try {
    const dashboard = await executiveDashboardService.getExecutiveDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard.kpis
    });
  } catch (error) {
    logger.error('Failed to get executive KPIs', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KPIs'
    });
  }
});

/**
 * POST /dashboards/executive/export
 * Export executive dashboard
 */
router.post('/executive/export', auth, authorize(['admin', 'executive']), async (req, res) => {
  try {
    const { format = 'pdf' } = req.body;
    
    const result = await executiveDashboardService.exportDashboard(format);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to export executive dashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export dashboard'
    });
  }
});

/**
 * POST /dashboards/executive/schedule-email
 * Schedule dashboard email
 */
router.post('/executive/schedule-email', auth, authorize(['admin', 'executive']), async (req, res) => {
  try {
    const { recipientEmail, frequency = 'weekly' } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required'
      });
    }

    const result = await executiveDashboardService.scheduleDashboardEmail(recipientEmail, frequency);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to schedule dashboard email', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule email'
    });
  }
});

// ============================================
// HR DASHBOARD ROUTES
// ============================================

/**
 * GET /dashboards/hr
 * Get HR dashboard
 */
router.get('/hr', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const filters = {
      departmentId: req.query.departmentId,
      dateRange: req.query.dateRange || 'month',
      statusFilter: req.query.statusFilter
    };

    const dashboard = await hrDashboardService.getHRDashboard(filters);
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Failed to get HR dashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get HR dashboard',
      message: error.message
    });
  }
});

/**
 * GET /dashboards/hr/employee-roster
 * Get employee roster
 */
router.get('/hr/employee-roster', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const dashboard = await hrDashboardService.getHRDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard.employeeRoster
    });
  } catch (error) {
    logger.error('Failed to get employee roster', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employee roster'
    });
  }
});

/**
 * GET /dashboards/hr/payroll
 * Get payroll information
 */
router.get('/hr/payroll', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const dashboard = await hrDashboardService.getHRDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard.payrollCompensation
    });
  } catch (error) {
    logger.error('Failed to get payroll data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payroll data'
    });
  }
});

/**
 * GET /dashboards/hr/benefits
 * Get benefits information
 */
router.get('/hr/benefits', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const dashboard = await hrDashboardService.getHRDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard.benefitsManagement
    });
  } catch (error) {
    logger.error('Failed to get benefits data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get benefits data'
    });
  }
});

/**
 * GET /dashboards/hr/recruitment
 * Get recruitment pipeline
 */
router.get('/hr/recruitment', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const dashboard = await hrDashboardService.getHRDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard.recruitmentPipeline
    });
  } catch (error) {
    logger.error('Failed to get recruitment data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recruitment data'
    });
  }
});

/**
 * GET /dashboards/hr/compliance
 * Get compliance data
 */
router.get('/hr/compliance', auth, authorize(['hr_manager', 'admin', 'compliance']), async (req, res) => {
  try {
    const dashboard = await hrDashboardService.getHRDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard.complianceDocuments
    });
  } catch (error) {
    logger.error('Failed to get compliance data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance data'
    });
  }
});

/**
 * GET /dashboards/hr/employee/:employeeId
 * Get specific employee details
 */
router.get('/hr/employee/:employeeId', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employeeDetails = await hrDashboardService.getEmployeeDetails(employeeId);
    
    res.status(200).json({
      success: true,
      data: employeeDetails
    });
  } catch (error) {
    logger.error('Failed to get employee details', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employee details'
    });
  }
});

/**
 * POST /dashboards/hr/export
 * Export HR report
 */
router.post('/hr/export', auth, authorize(['hr_manager', 'admin']), async (req, res) => {
  try {
    const { format = 'excel' } = req.body;
    
    const result = await hrDashboardService.exportHRReport(format);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to export HR report', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export HR report'
    });
  }
});

// ============================================
// EMPLOYEE DASHBOARD ROUTES
// ============================================

/**
 * GET /dashboards/employee
 * Get employee dashboard
 */
router.get('/employee', auth, authorize(['employee', 'hr_manager', 'admin']), async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.employeeId;
    
    // HR Manager can view other employee dashboards, but employees can only view their own
    if (req.user.role === 'employee' && employeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this employee dashboard'
      });
    }

    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Failed to get employee dashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employee dashboard',
      message: error.message
    });
  }
});

/**
 * GET /dashboards/employee/salary
 * Get employee salary information
 */
router.get('/employee/salary', auth, authorize(['employee', 'hr_manager']), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard.salaryCompensation
    });
  } catch (error) {
    logger.error('Failed to get salary information', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get salary information'
    });
  }
});

/**
 * GET /dashboards/employee/gosi
 * Get employee GOSI information
 */
router.get('/employee/gosi', auth, authorize(['employee', 'hr_manager']), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard.gosiInfo
    });
  } catch (error) {
    logger.error('Failed to get GOSI information', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get GOSI information'
    });
  }
});

/**
 * GET /dashboards/employee/benefits
 * Get employee benefits information
 */
router.get('/employee/benefits', auth, authorize(['employee', 'hr_manager']), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard.insuranceBenefits
    });
  } catch (error) {
    logger.error('Failed to get benefits information', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get benefits information'
    });
  }
});

/**
 * GET /dashboards/employee/leave
 * Get employee leave and attendance
 */
router.get('/employee/leave', auth, authorize(['employee', 'hr_manager']), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard.leaveAttendance
    });
  } catch (error) {
    logger.error('Failed to get leave information', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leave information'
    });
  }
});

/**
 * GET /dashboards/employee/documents
 * Get employee documents
 */
router.get('/employee/documents', auth, authorize(['employee', 'hr_manager']), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard.documents
    });
  } catch (error) {
    logger.error('Failed to get documents', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get documents'
    });
  }
});

/**
 * GET /dashboards/employee/performance
 * Get employee performance and development
 */
router.get('/employee/performance', auth, authorize(['employee', 'hr_manager']), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    const dashboard = await employeeDashboardService.getEmployeeDashboard(employeeId);
    
    res.status(200).json({
      success: true,
      data: dashboard.performanceDevelopment
    });
  } catch (error) {
    logger.error('Failed to get performance data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance data'
    });
  }
});

/**
 * POST /dashboards/employee/request-leave
 * Request leave
 */
router.post('/employee/request-leave', auth, authorize(['employee']), async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await employeeDashboardService.requestLeave(req.user.employeeId, {
      type,
      startDate,
      endDate,
      reason
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to request leave', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request leave',
      message: error.message
    });
  }
});

/**
 * GET /dashboards/employee/download/:documentType
 * Download employee document
 */
router.get('/employee/download/:documentType', auth, authorize(['employee']), async (req, res) => {
  try {
    const { documentType } = req.params;
    
    const result = await employeeDashboardService.downloadDocument(
      req.user.employeeId,
      documentType
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to download document', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

/**
 * GET /dashboards/status
 * Get dashboard status and health
 */
router.get('/status', auth, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        status: 'operational',
        lastUpdate: new Date(),
        services: {
          executive: 'operational',
          hr: 'operational',
          employee: 'operational'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard status'
    });
  }
});

module.exports = router;
