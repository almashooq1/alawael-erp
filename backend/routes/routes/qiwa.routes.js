/**
 * 🇸🇦 Qiwa Integration Routes
 * Ministry of Labor (MOL) API Endpoints
 *
 * Routes:
 * ✅ Employee Verification
 * ✅ Contract Management
 * ✅ Wage Management
 * ✅ WPS Integration
 * ✅ Nitaqat Tracking
 * ✅ Batch Operations
 * ✅ Health & Monitoring
 *
 * @version 2.0.0
 * @author AI Integration Team
 * @date 2026-02-17
 */

const express = require('express');
const router = express.Router();
const QiwaService = require('../services/qiwa.service');

const qiwaService = new QiwaService();

// Middleware for request validation
const validateRequest = (req, res, next) => {
  req.requestId = require('crypto').randomUUID();
  next();
};

const handleAsyncError = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.use(validateRequest);

// =====================================================
// HEALTH & MONITORING
// =====================================================

/**
 * GET /api/qiwa/health
 * Health check endpoint
 */
router.get('/health', handleAsyncError(async (req, res) => {
  const health = await qiwaService.healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
}));

/**
 * GET /api/qiwa/metrics
 * Get service metrics
 */
router.get('/metrics', handleAsyncError(async (req, res) => {
  const metrics = qiwaService.getMetrics();
  res.json({
    success: true,
    metrics,
    timestamp: new Date(),
  });
}));

/**
 * GET /api/qiwa/history
 * Get request history
 */
router.get('/history', handleAsyncError(async (req, res) => {
  const history = qiwaService.getRequestHistory({
    level: req.query.level,
    limit: parseInt(req.query.limit || 100),
  });

  res.json({
    success: true,
    history,
    total: history.length,
    timestamp: new Date(),
  });
}));

/**
 * POST /api/qiwa/cache/clear
 * Clear cache with optional pattern
 */
router.post('/cache/clear', handleAsyncError(async (req, res) => {
  const result = qiwaService.clearCache(req.body.pattern);
  res.json({
    success: true,
    message: `Cache cleared`,
    result,
    timestamp: new Date(),
  });
}));

// =====================================================
// EMPLOYEE VERIFICATION
// =====================================================

/**
 * POST /api/qiwa/employees/verify/iqama
 * Verify employee by Iqama number
 *
 * Body:
 * {
 *   "iqamaNumber": "2345678901"
 * }
 */
router.post('/employees/verify/iqama', handleAsyncError(async (req, res) => {
  const { iqamaNumber } = req.body;

  if (!iqamaNumber) {
    return res.status(400).json({
      success: false,
      error: 'Iqama number is required',
    });
  }

  const result = await qiwaService.verifyEmployeeByIqama(iqamaNumber);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * POST /api/qiwa/employees/verify/national-id
 * Verify employee by National ID
 *
 * Body:
 * {
 *   "nationalId": "1234567890"
 * }
 */
router.post('/employees/verify/national-id', handleAsyncError(async (req, res) => {
  const { nationalId } = req.body;

  if (!nationalId) {
    return res.status(400).json({
      success: false,
      error: 'National ID is required',
    });
  }

  const result = await qiwaService.verifyEmployeeByNationalId(nationalId);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/employees/:iqamaNumber/labor-record
 * Get employee labor record
 */
router.get('/employees/:iqamaNumber/labor-record', handleAsyncError(async (req, res) => {
  const { iqamaNumber } = req.params;

  const result = await qiwaService.getEmployeeLaborRecord(iqamaNumber);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

// =====================================================
// CONTRACT MANAGEMENT
// =====================================================

/**
 * POST /api/qiwa/contracts/register
 * Register new labor contract
 *
 * Body:
 * {
 *   "employeeIqama": "2345678901",
 *   "contractType": "unlimited|limited",
 *   "jobTitle": "Software Engineer",
 *   "jobTitleArabic": "مهندس برمجيات",
 *   "basicSalary": 15000,
 *   "housingAllowance": 5000,
 *   "transportAllowance": 1000,
 *   "startDate": "2026-02-17",
 *   "endDate": "2027-02-17",
 *   "workingHours": 8,
 *   "workingDays": ["sun", "mon", "tue", "wed", "thu"]
 * }
 */
router.post('/contracts/register', handleAsyncError(async (req, res) => {
  const contractData = req.body;

  const result = await qiwaService.registerContract(contractData);

  res.status(201).json({
    success: true,
    message: 'Contract registered successfully',
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/contracts/:contractId
 * Get contract details
 */
router.get('/contracts/:contractId', handleAsyncError(async (req, res) => {
  const { contractId } = req.params;

  const result = await qiwaService.getContract(contractId);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/contracts
 * List establishment contracts with optional filters
 *
 * Query:
 * - status: active|terminated|pending
 * - limit: 50
 * - offset: 0
 */
router.get('/contracts', handleAsyncError(async (req, res) => {
  const filters = {
    status: req.query.status,
    limit: parseInt(req.query.limit || 50),
    offset: parseInt(req.query.offset || 0),
  };

  const result = await qiwaService.listContracts(filters);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * PUT /api/qiwa/contracts/:contractId
 * Update existing contract
 *
 * Body: {contract update fields}
 */
router.put('/contracts/:contractId', handleAsyncError(async (req, res) => {
  const { contractId } = req.params;
  const updates = req.body;

  const result = await qiwaService.updateContract(contractId, updates);

  res.json({
    success: true,
    message: 'Contract updated successfully',
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * POST /api/qiwa/contracts/:contractId/terminate
 * Terminate labor contract
 *
 * Body:
 * {
 *   "reason": "resignation|dismissal|end-of-contract",
 *   "terminationDate": "2026-02-17"
 * }
 */
router.post('/contracts/:contractId/terminate', handleAsyncError(async (req, res) => {
  const { contractId } = req.params;
  const { reason, terminationDate } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Termination reason is required',
    });
  }

  const result = await qiwaService.terminateContract(
    contractId,
    reason,
    terminationDate
  );

  res.json({
    success: true,
    message: 'Contract terminated successfully',
    data: result,
    requestId: req.requestId,
  });
}));

// =====================================================
// WAGE MANAGEMENT
// =====================================================

/**
 * PUT /api/qiwa/employees/:iqamaNumber/wage
 * Update employee wage
 *
 * Body:
 * {
 *   "basicSalary": 15000,
 *   "housingAllowance": 5000,
 *   "transportAllowance": 1000,
 *   "otherAllowances": 0,
 *   "effectiveDate": "2026-02-17"
 * }
 */
router.put('/employees/:iqamaNumber/wage', handleAsyncError(async (req, res) => {
  const { iqamaNumber } = req.params;
  const wageData = req.body;

  const result = await qiwaService.updateEmployeeWage(iqamaNumber, wageData);

  res.json({
    success: true,
    message: 'Wage updated successfully',
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/employees/:iqamaNumber/wage-history
 * Get employee wage history
 *
 * Query:
 * - months: 12 (default)
 */
router.get('/employees/:iqamaNumber/wage-history', handleAsyncError(async (req, res) => {
  const { iqamaNumber } = req.params;
  const months = parseInt(req.query.months || 12);

  const result = await qiwaService.getWageHistory(iqamaNumber, months);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * POST /api/qiwa/wages/compliance-check
 * Check wage change compliance
 *
 * Body:
 * {
 *   "iqamaNumber": "2345678901",
 *   "newWage": {...}
 * }
 */
router.post('/wages/compliance-check', handleAsyncError(async (req, res) => {
  const { iqamaNumber, newWage } = req.body;

  if (!iqamaNumber || !newWage) {
    return res.status(400).json({
      success: false,
      error: 'Iqama number and new wage are required',
    });
  }

  const result = await qiwaService.calculateWageCompliance(iqamaNumber, newWage);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

// =====================================================
// WAGE PROTECTION SYSTEM (WPS)
// =====================================================

/**
 * POST /api/qiwa/wps/submit
 * Submit payroll to WPS
 *
 * Body:
 * {
 *   "period": "2026-02",
 *   "submissionType": "regular|adjustment",
 *   "employees": [
 *     {
 *       "iqamaNumber": "2345678901",
 *       "basicSalary": 15000,
 *       "allowances": {..},
 *       "deductions": {..},
 *       "netSalary": 19000
 *     }
 *   ]
 * }
 */
router.post('/wps/submit', handleAsyncError(async (req, res) => {
  const payrollData = req.body;

  if (!payrollData.period || !payrollData.employees) {
    return res.status(400).json({
      success: false,
      error: 'Period and employees list are required',
    });
  }

  const result = await qiwaService.submitPayrollToWPS(payrollData);

  res.status(201).json({
    success: true,
    message: 'Payroll submitted to WPS successfully',
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/wps/:submissionId/status
 * Get WPS submission status
 */
router.get('/wps/:submissionId/status', handleAsyncError(async (req, res) => {
  const { submissionId } = req.params;

  const result = await qiwaService.getWPSStatus(submissionId);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/wps/compliance-report
 * Get WPS compliance report
 *
 * Query:
 * - period: 2026-02
 */
router.get('/wps/compliance-report', handleAsyncError(async (req, res) => {
  const { period } = req.query;

  if (!period) {
    return res.status(400).json({
      success: false,
      error: 'Period is required (format: YYYY-MM)',
    });
  }

  const result = await qiwaService.getWPSComplianceReport(period);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

// =====================================================
// NITAQAT (WORKFORCE LOCALIZATION)
// =====================================================

/**
 * GET /api/qiwa/nitaqat/status
 * Get establishment Nitaqat status
 */
router.get('/nitaqat/status', handleAsyncError(async (req, res) => {
  const result = await qiwaService.getNitaqatStatus();

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * GET /api/qiwa/nitaqat/compliance
 * Get Nitaqat compliance details
 */
router.get('/nitaqat/compliance', handleAsyncError(async (req, res) => {
  const result = await qiwaService.getNitaqatCompliance();

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * POST /api/qiwa/nitaqat/calculate-points
 * Calculate Nitaqat points for labor force
 *
 * Body:
 * {
 *   "workforce": [
 *     {
 *       "iqamaNumber": "2345678901",
 *       "nationality": "Saudi|Non-Saudi",
 *       "position": "Manager|Specialist|Technician"
 *     }
 *   ]
 * }
 */
router.post('/nitaqat/calculate-points', handleAsyncError(async (req, res) => {
  const { workforce } = req.body;

  if (!workforce || !Array.isArray(workforce)) {
    return res.status(400).json({
      success: false,
      error: 'Workforce array is required',
    });
  }

  const result = await qiwaService.calculateNitaqatPoints(workforce);

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}));

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * POST /api/qiwa/batch/register-contracts
 * Batch register multiple contracts
 *
 * Body:
 * {
 *   "contracts": [
 *     {contract data},
 *     {contract data}
 *   ]
 * }
 */
router.post('/batch/register-contracts', handleAsyncError(async (req, res) => {
  const { contracts } = req.body;

  if (!contracts || !Array.isArray(contracts)) {
    return res.status(400).json({
      success: false,
      error: 'Contracts array is required',
    });
  }

  const result = await qiwaService.batchRegisterContracts(contracts);

  res.status(207).json({
    success: true,
    message: 'Batch contract registration completed',
    data: result,
    requestId: req.requestId,
  });
}));

/**
 * POST /api/qiwa/batch/update-wages
 * Batch update wages
 *
 * Body:
 * {
 *   "updates": [
 *     {
 *       "iqamaNumber": "2345678901",
 *       "wageData": {...}
 *     }
 *   ]
 * }
 */
router.post('/batch/update-wages', handleAsyncError(async (req, res) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({
      success: false,
      error: 'Updates array is required',
    });
  }

  const result = await qiwaService.batchUpdateWages(updates);

  res.status(207).json({
    success: true,
    message: 'Batch wage update completed',
    data: result,
    requestId: req.requestId,
  });
}));

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Global error handler
 */
router.use((error, req, res, next) => {
  console.error('[Qiwa Routes Error]', error);

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: error.message || 'Internal server error',
    requestId: req.requestId,
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = error.data || {};
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
});

module.exports = router;
