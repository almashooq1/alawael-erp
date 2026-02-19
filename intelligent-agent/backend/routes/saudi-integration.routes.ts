/**
 * Saudi Integration API Routes
 * مسارات API للتكامل مع الأنظمة السعودية
 */

import express, { Request, Response, NextFunction } from 'express';
import SaudiIntegrationService from '../services/saudi-integration.service';
import SaudiEmployee from '../models/saudi-employee.model';

const router = express.Router();

// ============================================
// National ID / Iqama Verification
// ============================================

/**
 * POST /api/saudi-integration/verify/national-id
 * Verify Saudi National ID
 */
router.post('/verify/national-id', async (req: Request, res: Response) => {
  try {
    const { nationalId } = req.body;

    if (!nationalId) {
      return res.status(400).json({
        success: false,
        message: 'National ID is required',
      });
    }

    const result = await SaudiIntegrationService.verifySaudiNationalId(nationalId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/verify/iqama
 * Verify Iqama
 */
router.post('/verify/iqama', async (req: Request, res: Response) => {
  try {
    const { iqamaNumber } = req.body;

    if (!iqamaNumber) {
      return res.status(400).json({
        success: false,
        message: 'Iqama number is required',
      });
    }

    const result = await SaudiIntegrationService.verifyIqama(iqamaNumber);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/iqama/:iqamaNumber/expiry
 * Check Iqama expiry status
 */
router.get('/iqama/:iqamaNumber/expiry', async (req: Request, res: Response) => {
  try {
    const { iqamaNumber } = req.params;
    const result = await SaudiIntegrationService.checkIqamaExpiry(iqamaNumber);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Ministry of Labor (MOL)
// ============================================

/**
 * POST /api/saudi-integration/mol/contract/register
 * Register employee contract with MOL
 */
router.post('/mol/contract/register', async (req: Request, res: Response) => {
  try {
    const result = await SaudiIntegrationService.registerEmployeeContract(req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/saudi-integration/mol/contract/:contractId
 * Update employee contract
 */
router.put('/mol/contract/:contractId', async (req: Request, res: Response) => {
  try {
    const { contractId } = req.params;
    const result = await SaudiIntegrationService.updateEmployeeContract(contractId, req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/mol/contract/:contractId/terminate
 * Terminate employee contract
 */
router.post('/mol/contract/:contractId/terminate', async (req: Request, res: Response) => {
  try {
    const { contractId } = req.params;
    const { reason, terminationDate } = req.body;

    const result = await SaudiIntegrationService.terminateContract(
      contractId,
      reason,
      new Date(terminationDate)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/mol/establishment/:establishmentId/nitaqat
 * Get Nitaqat status
 */
router.get('/mol/establishment/:establishmentId/nitaqat', async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;
    const result = await SaudiIntegrationService.getNitaqatStatus(establishmentId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/mol/wps/submit
 * Submit Wage Protection System file
 */
router.post('/mol/wps/submit', async (req: Request, res: Response) => {
  try {
    const { payments } = req.body;
    const result = await SaudiIntegrationService.submitWageProtection(payments);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// GOSI (Social Insurance)
// ============================================

/**
 * POST /api/saudi-integration/gosi/register
 * Register employee with GOSI
 */
router.post('/gosi/register', async (req: Request, res: Response) => {
  try {
    const result = await SaudiIntegrationService.registerEmployeeWithGOSI(req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/saudi-integration/gosi/:gosiNumber/wage
 * Update GOSI subscription wage
 */
router.put('/gosi/:gosiNumber/wage', async (req: Request, res: Response) => {
  try {
    const { gosiNumber } = req.params;
    const { newWage } = req.body;

    const result = await SaudiIntegrationService.updateGOSISubscription(gosiNumber, newWage);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/gosi/calculate
 * Calculate GOSI contributions
 */
router.post('/gosi/calculate', async (req: Request, res: Response) => {
  try {
    const { basicSalary, isSaudi } = req.body;
    const result = SaudiIntegrationService.calculateGOSIContributions(basicSalary, isSaudi);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/gosi/:gosiNumber/cancel
 * Cancel GOSI subscription
 */
router.post('/gosi/:gosiNumber/cancel', async (req: Request, res: Response) => {
  try {
    const { gosiNumber } = req.params;
    const { reason, effectiveDate } = req.body;

    const result = await SaudiIntegrationService.cancelGOSISubscription(
      gosiNumber,
      reason,
      new Date(effectiveDate)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Medical Insurance
// ============================================

/**
 * POST /api/saudi-integration/medical-insurance/register
 * Register medical insurance policy
 */
router.post('/medical-insurance/register', async (req: Request, res: Response) => {
  try {
    const result = await SaudiIntegrationService.registerMedicalInsurance(req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/medical-insurance/:policyNumber/renew
 * Renew medical insurance
 */
router.post('/medical-insurance/:policyNumber/renew', async (req: Request, res: Response) => {
  try {
    const { policyNumber } = req.params;
    const { newExpiryDate } = req.body;

    const result = await SaudiIntegrationService.renewMedicalInsurance(
      policyNumber,
      new Date(newExpiryDate)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/medical-insurance/:policyNumber/validity
 * Check medical insurance validity
 */
router.get('/medical-insurance/:policyNumber/validity', async (req: Request, res: Response) => {
  try {
    const { policyNumber } = req.params;
    const result = await SaudiIntegrationService.checkMedicalInsuranceValidity(policyNumber);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Visa & Exit Re-Entry
// ============================================

/**
 * POST /api/saudi-integration/exit-reentry/request
 * Request Exit Re-Entry visa
 */
router.post('/exit-reentry/request', async (req: Request, res: Response) => {
  try {
    const { iqamaNumber, type, duration } = req.body;

    const result = await SaudiIntegrationService.requestExitReEntry(iqamaNumber, type, duration);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/exit-reentry/:requestId
 * Check Exit Re-Entry status
 */
router.get('/exit-reentry/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const result = await SaudiIntegrationService.checkExitReEntryStatus(requestId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/saudi-integration/final-exit/request
 * Request final exit
 */
router.post('/final-exit/request', async (req: Request, res: Response) => {
  try {
    const { iqamaNumber, reason } = req.body;

    const result = await SaudiIntegrationService.requestFinalExit(iqamaNumber, reason);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Compliance
// ============================================

/**
 * POST /api/saudi-integration/compliance/check
 * Run comprehensive compliance check
 */
router.post('/compliance/check', async (req: Request, res: Response) => {
  try {
    const result = await SaudiIntegrationService.runComplianceCheck(req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/employee/:employeeId/status
 * Get employee status summary
 */
router.get('/employee/:employeeId/status', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await SaudiIntegrationService.getEmployeeStatusSummary(employeeId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Employee CRUD Operations
// ============================================

/**
 * POST /api/saudi-integration/employees
 * Create new Saudi employee
 */
router.post('/employees', async (req: Request, res: Response) => {
  try {
    const employee = new SaudiEmployee(req.body);
    await employee.save();

    res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/employees
 * Get all employees
 */
router.get('/employees', async (req: Request, res: Response) => {
  try {
    const { status, nationality, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (nationality) query.nationality = nationality;

    const employees = await SaudiEmployee.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await SaudiEmployee.countDocuments(query);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/saudi-integration/employees/:id
 * Get employee by ID
 */
router.get('/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await SaudiEmployee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/saudi-integration/employees/:id
 * Update employee
 */
router.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await SaudiEmployee.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModifiedBy: req.body.userId },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/saudi-integration/employees/:id
 * Delete employee
 */
router.delete('/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await SaudiEmployee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
