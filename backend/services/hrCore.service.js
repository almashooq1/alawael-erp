// Mock models for demo
const User = require('../models/User');

class HRCoreService {
  /**
   * Check for Expiring Contracts
   * Returns alert list for HR Manager
   */
  static async checkExpiringContracts() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + 60); // 60 Days Notice

    // Mock query: User.find({ 'contract.endDate': { $lte: thresholdDate } })
    const expiringEmployees = [
      { name: 'Ahmed Ali', role: 'Therapist', endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }, // 15 days left
      { name: 'Sara Noor', role: 'Receptionist', endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) }, // 45 days left
    ];

    return expiringEmployees.map(emp => ({
      employee: emp.name,
      role: emp.role,
      daysRemaining: Math.ceil((emp.endDate - new Date()) / (1000 * 60 * 60 * 24)),
      actionRequired: 'Renew or Terminate',
    }));
  }

  /**
   * Calculate Monthly Payroll with Deductions/Bonuses
   * Integrates Attendance + Performance
   */
  static async generatePayrollRun(month, year) {
    // 1. Get Base Salary
    const employee = { name: 'Dr. Khaled', baseSalary: 5000, hourlyRate: 50 };

    // 2. Attendance Data (Mock)
    const attendance = {
      daysPresent: 22,
      latenessMinutes: 120, // 2 hours late total
      overtimeHours: 5,
    };

    // 3. Performance Bonus (Phase 17 Smart Payroll Integration)
    const performanceBonus = 500; // Passed from Smart Service

    // 4. Calculations
    const lateDeduction = (attendance.latenessMinutes / 60) * employee.hourlyRate; // 100
    const overtimePay = attendance.overtimeHours * (employee.hourlyRate * 1.5); // 375

    const netSalary = employee.baseSalary - lateDeduction + overtimePay + performanceBonus;

    return {
      employee: employee.name,
      month: `${month}/${year}`,
      earnings: {
        base: employee.baseSalary,
        overtime: overtimePay,
        performanceBonus: performanceBonus,
      },
      deductions: {
        lateness: lateDeduction,
        socialSecurity: 0, // Simplification
      },
      netPayable: netSalary,
    };
  }
}

module.exports = HRCoreService;
module.exports.instance = new HRCoreService();
