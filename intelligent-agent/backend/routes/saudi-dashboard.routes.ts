/**
 * Saudi HR Dashboard API Routes
 * لوحة تحكم الموارد البشرية للنظام السعودي
 */

import express, { Request, Response } from 'express';
import SaudiEmployee from '../models/saudi-employee.model';
import SaudiComplianceMonitoringService from '../services/saudi-compliance-monitoring.service';
import SaudiIntegrationService from '../services/saudi-integration.service';

const router = express.Router();

// ============================================
// Dashboard Overview
// ============================================

/**
 * GET /api/saudi-dashboard/overview
 * Get dashboard overview statistics
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const totalEmployees = await SaudiEmployee.countDocuments({ status: 'active' });
    const saudiEmployees = await SaudiEmployee.countDocuments({
      status: 'active',
      identificationType: 'national-id',
    });
    const expatEmployees = await SaudiEmployee.countDocuments({
      status: 'active',
      identificationType: 'iqama',
    });

    const saudizationRate = totalEmployees > 0 ? (saudiEmployees / totalEmployees) * 100 : 0;

    // Compliance statistics
    const compliantEmployees = await SaudiEmployee.countDocuments({
      status: 'active',
      'compliance.isCompliant': true,
    });

    const complianceRate = totalEmployees > 0 ? (compliantEmployees / totalEmployees) * 100 : 0;

    // Upcoming expirations
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringIqamas = await SaudiEmployee.countDocuments({
      'iqamaDetails.expiryDate': { $lte: thirtyDaysFromNow, $gte: new Date() },
      status: 'active',
    });

    const expiringInsurances = await SaudiEmployee.countDocuments({
      'medicalInsurance.expiryDate': { $lte: thirtyDaysFromNow, $gte: new Date() },
      status: 'active',
    });

    // GOSI statistics
    const gosiRegistered = await SaudiEmployee.countDocuments({
      status: 'active',
      'gosi.subscriptionStatus': 'active',
    });

    res.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          saudi: saudiEmployees,
          expat: expatEmployees,
          saudizationRate: saudizationRate.toFixed(2),
        },
        compliance: {
          compliant: compliantEmployees,
          nonCompliant: totalEmployees - compliantEmployees,
          complianceRate: complianceRate.toFixed(2),
        },
        expirations: {
          iqamas: expiringIqamas,
          insurances: expiringInsurances,
        },
        gosi: {
          registered: gosiRegistered,
          notRegistered: totalEmployees - gosiRegistered,
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

// ============================================
// Expiration Alerts
// ============================================

/**
 * GET /api/saudi-dashboard/expirations
 * Get all expiring documents
 */
router.get('/expirations', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Number(days));

    // Expiring Iqamas
    const expiringIqamas = await SaudiEmployee.find({
      'iqamaDetails.expiryDate': { $lte: targetDate, $gte: new Date() },
      status: 'active',
    }).select('employeeCode fullNameArabic iqamaDetails.expiryDate mobileNumber');

    // Expiring Insurances
    const expiringInsurances = await SaudiEmployee.find({
      'medicalInsurance.expiryDate': { $lte: targetDate, $gte: new Date() },
      status: 'active',
    }).select('employeeCode fullNameArabic medicalInsurance.expiryDate mobileNumber');

    // Expiring Contracts
    const expiringContracts = await SaudiEmployee.find({
      'mol.endDate': { $lte: targetDate, $gte: new Date() },
      'mol.contractType': 'limited',
      status: 'active',
    }).select('employeeCode fullNameArabic mol.endDate mobileNumber');

    res.json({
      success: true,
      data: {
        iqamas: expiringIqamas.map(emp => ({
          employeeCode: emp.employeeCode,
          fullName: emp.fullNameArabic,
          expiryDate: emp.iqamaDetails?.expiryDate,
          daysRemaining: Math.floor(
            ((emp.iqamaDetails?.expiryDate?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
          ),
          mobile: emp.mobileNumber,
        })),
        insurances: expiringInsurances.map(emp => ({
          employeeCode: emp.employeeCode,
          fullName: emp.fullNameArabic,
          expiryDate: emp.medicalInsurance.expiryDate,
          daysRemaining: Math.floor(
            (emp.medicalInsurance.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
          mobile: emp.mobileNumber,
        })),
        contracts: expiringContracts.map(emp => ({
          employeeCode: emp.employeeCode,
          fullName: emp.fullNameArabic,
          endDate: emp.mol.endDate,
          daysRemaining: Math.floor(
            ((emp.mol.endDate?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
          ),
          mobile: emp.mobileNumber,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Compliance Report
// ============================================

/**
 * GET /api/saudi-dashboard/compliance-report
 * Get detailed compliance report
 */
router.get('/compliance-report', async (req: Request, res: Response) => {
  try {
    const report = await SaudiComplianceMonitoringService.runDailyComplianceCheck();

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Nitaqat Status
// ============================================

/**
 * GET /api/saudi-dashboard/nitaqat
 * Get Nitaqat status and recommendations
 */
router.get('/nitaqat', async (req: Request, res: Response) => {
  try {
    const establishmentId = process.env.MOL_ESTABLISHMENT_ID || '';
    const nitaqat = await SaudiIntegrationService.getNitaqatStatus(establishmentId);

    // Calculate what's needed for next tier
    const totalEmployees = nitaqat.saudiEmployees + nitaqat.foreignEmployees;
    let recommendation = '';

    if (nitaqat.nitaqatColor === 'red') {
      const neededSaudis = Math.ceil(totalEmployees * 0.3) - nitaqat.saudiEmployees;
      recommendation = `يجب توظيف ${neededSaudis} موظف سعودي للخروج من النطاق الأحمر`;
    } else if (nitaqat.nitaqatColor === 'yellow') {
      const neededSaudis = Math.ceil(totalEmployees * 0.5) - nitaqat.saudiEmployees;
      recommendation = `يوصى بتوظيف ${neededSaudis} موظف سعودي للوصول للنطاق الأخضر`;
    } else if (nitaqat.nitaqatColor === 'green') {
      recommendation = 'المنشأة في النطاق الأخضر - ممتاز!';
    } else if (nitaqat.nitaqatColor === 'platinum') {
      recommendation = 'المنشأة في النطاق البلاتيني - مستوى استثنائي!';
    }

    res.json({
      success: true,
      data: {
        ...nitaqat,
        recommendation,
        totalEmployees,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Department Statistics
// ============================================

/**
 * GET /api/saudi-dashboard/departments
 * Get statistics by department
 */
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const departments = await SaudiEmployee.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$employment.department',
          totalEmployees: { $sum: 1 },
          saudiEmployees: {
            $sum: { $cond: [{ $eq: ['$identificationType', 'national-id'] }, 1, 0] },
          },
          averageSalary: { $avg: '$salary.totalSalary' },
        },
      },
      {
        $project: {
          department: '$_id',
          totalEmployees: 1,
          saudiEmployees: 1,
          expatEmployees: { $subtract: ['$totalEmployees', '$saudiEmployees'] },
          saudizationRate: {
            $multiply: [{ $divide: ['$saudiEmployees', '$totalEmployees'] }, 100],
          },
          averageSalary: { $round: ['$averageSalary', 2] },
        },
      },
      { $sort: { totalEmployees: -1 } },
    ]);

    res.json({
      success: true,
      data: departments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Salary Statistics
// ============================================

/**
 * GET /api/saudi-dashboard/salary-stats
 * Get salary statistics
 */
router.get('/salary-stats', async (req: Request, res: Response) => {
  try {
    const stats = await SaudiEmployee.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalPayroll: { $sum: '$salary.totalSalary' },
          averageSalary: { $avg: '$salary.totalSalary' },
          minSalary: { $min: '$salary.totalSalary' },
          maxSalary: { $max: '$salary.totalSalary' },
          totalGOSIEmployer: { $sum: '$gosi.employerContribution' },
          totalGOSIEmployee: { $sum: '$gosi.employeeContribution' },
        },
      },
    ]);

    // Salary by nationality
    const byNationality = await SaudiEmployee.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$identificationType',
          count: { $sum: 1 },
          totalSalary: { $sum: '$salary.totalSalary' },
          averageSalary: { $avg: '$salary.totalSalary' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {},
        byNationality,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Recent Activities
// ============================================

/**
 * GET /api/saudi-dashboard/recent-activities
 * Get recent HR activities
 */
router.get('/recent-activities', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const recentEmployees = await SaudiEmployee.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select('employeeCode fullNameArabic createdAt status employment.department');

    const activities = recentEmployees.map(emp => ({
      type: 'new_employee',
      employeeCode: emp.employeeCode,
      employeeName: emp.fullNameArabic,
      department: emp.employment?.department,
      date: emp.createdAt,
      status: emp.status,
    }));

    res.json({
      success: true,
      data: activities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Search Employees
// ============================================

/**
 * GET /api/saudi-dashboard/search
 * Search employees
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, department, status, nationality } = req.query;

    const query: any = {};

    if (q) {
      query.$or = [
        { employeeCode: { $regex: q, $options: 'i' } },
        { fullNameArabic: { $regex: q, $options: 'i' } },
        { fullNameEnglish: { $regex: q, $options: 'i' } },
        { nationalId: { $regex: q, $options: 'i' } },
        { iqamaNumber: { $regex: q, $options: 'i' } },
      ];
    }

    if (department) query['employment.department'] = department;
    if (status) query.status = status;
    if (nationality) query.nationality = nationality;

    const employees = await SaudiEmployee.find(query)
      .limit(50)
      .select(
        'employeeCode fullNameArabic fullNameEnglish identificationType nationalId iqamaNumber employment.department status'
      );

    res.json({
      success: true,
      data: employees,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
