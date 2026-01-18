const Payroll = require('../models/payroll.model');
const Employee = require('../models/Employee');
const TherapySession = require('../models/TherapySession');
const SmartNotificationService = require('./smartNotificationService');

class SmartPayrollService {
  /**
   * Generate Monthly Payroll for All Active Employees
   * Includes "Smart Commission" calculation based on Therapy Sessions
   */
  static async generatePayroll(month, year, runByUserId) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    console.log(`Generating payroll for ${monthStr}...`);

    const employees = await Employee.find({ status: 'ACTIVE' });
    const results = [];

    for (const emp of employees) {
      // 1. Check if already exists
      const existing = await Payroll.findOne({ employeeId: emp._id, month: monthStr });
      if (existing && existing.status === 'PAID') {
        results.push({ name: emp.fullName, status: 'SKIPPED_ALREADY_PAID' });
        continue;
      }

      // 2. Base Calculation
      let gross = emp.basicSalary || 0;
      const allowances = [];
      const deductions = [];

      // Add fixed allowances
      if (emp.allowances) {
        if (emp.allowances.housing) {
          allowances.push({ name: 'Housing', amount: emp.allowances.housing, type: 'FIXED' });
          gross += emp.allowances.housing;
        }
        if (emp.allowances.transport) {
          allowances.push({ name: 'Transport', amount: emp.allowances.transport, type: 'FIXED' });
          gross += emp.allowances.transport;
        }
      }

      // 3. SMART Part: Session Commissions (For Therapists)
      let sessionCount = 0;
      if (emp.role === 'THERAPIST' || emp.position.toLowerCase().includes('therapist')) {
        const sessions = await TherapySession.find({
          therapist: emp._id,
          date: { $gte: startDate, $lte: endDate },
          status: 'COMPLETED',
        });

        sessionCount = sessions.length;
        if (sessionCount > 0) {
          const commissionRate = 50; // Configurable ideally
          const commAmount = sessionCount * commissionRate;
          allowances.push({
            name: `Clinical Commission (${sessionCount} Sessions)`,
            amount: commAmount,
            type: 'PERFORMANCE',
          });
          gross += commAmount;
        }

        // High Performance Bonus (Rating > 4.8)
        const ratedSessions = sessions.filter(s => s.rating);
        if (ratedSessions.length > 5) {
          const avgRating = ratedSessions.reduce((sum, s) => sum + s.rating, 0) / ratedSessions.length;
          if (avgRating >= 4.8) {
            allowances.push({
              name: 'Star Therapist Bonus (High Ratings)',
              amount: 500,
              type: 'PERFORMANCE',
            });
            gross += 500;
          }
        }
      }

      // 4. Calculate Net
      // Simple logic: No tax logic implemented yet
      const totalDeductions = 0;
      const net = gross - totalDeductions;

      // 5. Update or Create
      const payrollData = {
        employeeId: emp._id,
        month: monthStr,
        year: year,
        baseSalary: emp.basicSalary,
        allowances,
        deductions,
        totalGross: gross,
        totalDeductions,
        totalNet: net,
        status: 'DRAFT',
        generatedBy: runByUserId,
        generatedAt: new Date(),
      };

      if (existing) {
        await Payroll.updateOne({ _id: existing._id }, payrollData);
        results.push({ name: emp.fullName, net, status: 'UPDATED' });
      } else {
        await Payroll.create(payrollData);
        results.push({ name: emp.fullName, net, status: 'CREATED' });
      }
    }

    // Notify Admin
    await SmartNotificationService.send(
      runByUserId,
      'Payroll Generated',
      `Payroll for ${monthStr} generated for ${results.length} employees.`,
      'INFO',
      `/hr/payroll?month=${monthStr}`,
    );

    return { success: true, count: results.length, details: results };
  }

  /**
   * Get Stats for a Month
   */
  static async getMonthStats(monthStr) {
    return await Payroll.aggregate([
      { $match: { month: monthStr } },
      {
        $group: {
          _id: null,
          totalPayout: { $sum: '$totalNet' },
          count: { $sum: 1 },
          avgSalary: { $avg: '$totalNet' },
        },
      },
    ]);
  }
}

module.exports = SmartPayrollService;
module.exports.instance = new SmartPayrollService();
