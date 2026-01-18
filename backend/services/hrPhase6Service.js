const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');
const Attendance = require('../models/attendance.model');
const Leave = require('../models/leave.model');
const Performance = require('../models/performance.model');

class HRPhase6Service {
  // --- Employee Management ---
  async getEmployees(filter = {}) {
    return await Employee.find(filter).select('-password');
  }

  async getEmployeeById(id) {
    return await Employee.findById(id);
  }

  // --- Payroll System ---
  async generatePayroll(month, year) {
    // e.g., '10', 2025
    const employees = await Employee.find({ status: 'active' });
    const payrolls = [];

    for (const emp of employees) {
      // Calculate salary based on base salary + allowances - deductions
      // This is a simplified logic for Phase 6
      const baseSalary = emp.salary?.base || 0;

      // Allowances placeholder logic
      const allowances = emp.salary?.allowances || [];
      const totalAllowances = allowances.reduce((sum, item) => sum + item.amount, 0);

      // Deductions placeholder
      const deductions = emp.salary?.deductions || [];
      const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

      const netSalary = baseSalary + totalAllowances - totalDeductions;

      const payrollRecord = new Payroll({
        employeeId: emp._id,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        year,
        baseSalary,
        allowances,
        deductions,
        totalGross: baseSalary + totalAllowances,
        totalDeductions,
        totalNet: netSalary,
        status: 'draft',
      });

      // Save or update existing draft
      const existing = await Payroll.findOne({ employeeId: emp._id, month: payrollRecord.month });
      if (existing) {
        if (existing.status === 'draft') {
          Object.assign(existing, payrollRecord.toObject());
          payrolls.push(await existing.save());
        } else {
          payrolls.push(existing); // Skip if already finalized
        }
      } else {
        payrolls.push(await payrollRecord.save());
      }
    }
    return payrolls;
  }

  async getPayrollRecords(month, year) {
    const query = {};
    if (month && year) {
      query.month = `${year}-${month.toString().padStart(2, '0')}`;
    }
    return await Payroll.find(query).populate('employeeId', 'firstName lastName position');
  }

  // --- Attendance System ---
  async checkIn(employeeId, location) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await Attendance.findOne({ employeeId, date: today });
    if (!record) {
      record = new Attendance({
        employeeId,
        date: today,
        checkIn: new Date(),
        status: 'present',
        location,
      });
    } else {
      if (!record.checkIn) record.checkIn = new Date();
    }
    return await record.save();
  }

  async checkOut(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await Attendance.findOne({ employeeId, date: today });

    if (record) {
      record.checkOut = new Date();
      return await record.save();
    }
    throw new Error('No check-in record found for today');
  }

  async getAttendance(date) {
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    return await Attendance.find({ date: queryDate }).populate('employeeId', 'firstName lastName');
  }

  // --- Leave Management ---
  async requestLeave(leaveData) {
    const leave = new Leave(leaveData);
    return await leave.save();
  }

  async approveLeave(leaveId, approverId) {
    return await Leave.findByIdAndUpdate(leaveId, { status: 'approved', approvedBy: approverId }, { new: true });
  }

  async getLeaves(status) {
    const query = status ? { status } : {};
    return await Leave.find(query).populate('employeeId', 'firstName lastName');
  }

  // --- Performance Appraisal ---
  async createAppraisal(appraisalData) {
    const appraisal = new Performance(appraisalData);
    return await appraisal.save();
  }

  async getEmployeePerformance(employeeId) {
    return await Performance.find({ employeeId }).sort({ 'period.startDate': -1 });
  }
}

module.exports = HRPhase6Service;
