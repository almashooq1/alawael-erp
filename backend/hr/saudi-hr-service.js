/**
 * Saudi HR Service - Comprehensive Human Resources System
 * نظام الموارد البشرية السعودي الشامل
 * 
 * Features:
 * - GOSI Integration (التأمينات الاجتماعية)
 * - Muqeem/Iqama Management (إدارة الإقامات)
 * - Wage Protection System (حماية الأجور)
 * - Nitaqat/Saudization (نطاقات/السعودة)
 * - Saudi Labor Law Compliance (نظام العمل السعودي)
 * - Leave Management (إدارة الإجازات)
 * - Payroll System (نظام الرواتب)
 * - Employee Lifecycle (دورة حياة الموظف)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// SCHEMAS
// ============================================

// Employee Schema
const EmployeeSchema = new Schema({
  // Basic Info
  employeeId: { type: String, required: true, unique: true },
  firstNameAr: { type: String, required: true },
  lastNameAr: { type: String, required: true },
  firstNameEn: { type: String },
  lastNameEn: { type: String },
  
  // National Identity
  nationalId: { type: String, required: true, unique: true },
  nationality: { type: String, required: true, default: 'SA' },
  
  // Iqama/Muqeem (For Non-Saudis)
  iqamaNumber: { type: String },
  iqamaExpiry: { type: Date },
  iqamaProfession: { type: String },
  sponsorName: { type: String },
  
  // Passport
  passportNumber: { type: String },
  passportExpiry: { type: Date },
  passportCountry: { type: String },
  
  // Contact
  mobile: { type: String, required: true },
  email: { type: String },
  address: {
    street: String,
    city: String,
    region: String,
    postalCode: String,
  },
  
  // Employment Details
  jobTitle: { type: String, required: true },
  jobTitleAr: { type: String },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  
  // Employment Type
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'temporary', 'remote'],
    default: 'full_time'
  },
  
  // Work Schedule
  workSchedule: {
    startTime: { type: String, default: '08:00' },
    endTime: { type: String, default: '16:00' },
    workingDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
    weeklyHours: { type: Number, default: 48 },
  },
  
  // Contract Details
  contract: {
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    probationPeriod: { type: Number, default: 90 }, // Days
    contractType: { type: String, enum: ['limited', 'unlimited'], default: 'unlimited' },
  },
  
  // Salary
  salary: {
    basic: { type: Number, required: true },
    housingAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    total: { type: Number },
    currency: { type: String, default: 'SAR' },
    bankAccount: {
      bankName: String,
      accountNumber: String,
      iban: String,
    },
  },
  
  // GOSI
  gosi: {
    registered: { type: Boolean, default: false },
    registrationNumber: { type: String },
    registrationDate: { type: Date },
    contributionRate: { type: Number, default: 12 }, // 12% for Saudis
    employeeShare: { type: Number, default: 10 }, // 10% employee
    employerShare: { type: Number, default: 12 }, // 12% employer
    hazardCategory: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  },
  
  // Nitaqat/Saudization
  nitaqat: {
    category: { type: String, enum: ['platinum', 'green', 'yellow', 'red'], default: 'green' },
    saudiCount: { type: Number, default: 0 },
    nonSaudiCount: { type: Number, default: 0 },
    saudizationPercentage: { type: Number, default: 0 },
    lastUpdated: { type: Date },
  },
  
  // Leave Balance
  leaveBalance: {
    annual: { type: Number, default: 30 }, // Days per year
    sick: { type: Number, default: 120 }, // Days per year
    emergency: { type: Number, default: 4 }, // Days per year
    maternity: { type: Number, default: 90 }, // Days for female
    hajj: { type: Number, default: 15 }, // Days once every 5 years
    used: {
      annual: { type: Number, default: 0 },
      sick: { type: Number, default: 0 },
      emergency: { type: Number, default: 0 },
    },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'on_leave', 'terminated', 'suspended', 'probation'],
    default: 'probation'
  },
  
  // Documents
  documents: [{
    type: { type: String },
    name: { type: String },
    url: { type: String },
    expiryDate: { type: Date },
    uploadedAt: { type: Date, default: Date.now },
  }],
  
  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Leave Request Schema
const LeaveRequestSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'emergency', 'maternity', 'hajj', 'unpaid', 'marriage', 'bereavement'],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String },
  attachment: { type: String },
  
  // Approval
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  
  // Salary Impact
  paidLeave: { type: Boolean, default: true },
  salaryDeduction: { type: Number, default: 0 },
  
}, { timestamps: true });

// Attendance Schema
const AttendanceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  
  // Work Hours
  totalHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  earlyDepartureMinutes: { type: Number, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'early_departure', 'on_leave', 'holiday', 'weekend'],
    default: 'present'
  },
  
  // Location
  checkInLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  checkOutLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  
  notes: { type: String },
}, { timestamps: true });

// Payroll Schema
const PayrollSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  
  // Earnings
  earnings: {
    basicSalary: { type: Number, default: 0 },
    housingAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  
  // Deductions
  deductions: {
    gosiEmployee: { type: Number, default: 0 },
    gosiEmployer: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 }, // For non-Saudis
    leaveDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
  },
  
  // Net Salary
  netSalary: { type: Number, default: 0 },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paymentDate: { type: Date },
  paymentReference: { type: String },
  
  // WPS
  wpsSubmitted: { type: Boolean, default: false },
  wpsReference: { type: String },
  
}, { timestamps: true });

// ============================================
// MODELS
// ============================================

const Employee = mongoose.model('Employee', EmployeeSchema);
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Payroll = mongoose.model('Payroll', PayrollSchema);

// ============================================
// SERVICE CLASS
// ============================================

class SaudiHRService {
  
  // ================================
  // EMPLOYEE MANAGEMENT
  // ================================
  
  /**
   * Create new employee with Saudi-specific validations
   */
  async createEmployee(employeeData) {
    try {
      // Validate national ID
      if (!this.validateSaudiNationalId(employeeData.nationalId)) {
        // Check if it's a valid Iqama number for non-Saudis
        if (!this.validateIqamaNumber(employeeData.nationalId)) {
          throw new Error('رقم الهوية/الإقامة غير صحيح');
        }
      }
      
      // Generate employee ID
      employeeData.employeeId = await this.generateEmployeeId();
      
      // Calculate total salary
      employeeData.salary.total = 
        employeeData.salary.basic +
        (employeeData.salary.housingAllowance || 0) +
        (employeeData.salary.transportAllowance || 0) +
        (employeeData.salary.otherAllowances || 0);
      
      // Set default work schedule (Saudi standard)
      employeeData.workSchedule = {
        startTime: '08:00',
        endTime: '16:00',
        workingDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
        weeklyHours: 48,
      };
      
      const employee = new Employee(employeeData);
      await employee.save();
      
      // Register with GOSI if Saudi
      if (employee.nationality === 'SA') {
        await this.registerWithGOSI(employee._id);
      }
      
      return employee;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate employee ID
   */
  async generateEmployeeId() {
    const count = await Employee.countDocuments();
    return `EMP-${String(count + 1).padStart(5, '0')}`;
  }
  
  /**
   * Validate Saudi National ID (10 digits, starts with 1 or 2)
   */
  validateSaudiNationalId(id) {
    if (!id || id.length !== 10) return false;
    if (!/^[12]/.test(id)) return false;
    return this.validateLuhn(id);
  }
  
  /**
   * Validate Iqama Number (10 digits, starts with 2)
   */
  validateIqamaNumber(id) {
    if (!id || id.length !== 10) return false;
    if (!/^2/.test(id)) return false;
    return this.validateLuhn(id);
  }
  
  /**
   * Luhn algorithm for ID validation
   */
  validateLuhn(id) {
    let sum = 0;
    let isEven = false;
    
    for (let i = id.length - 1; i >= 0; i--) {
      let digit = parseInt(id[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  // ================================
  // GOSI MANAGEMENT
  // ================================
  
  /**
   * Register employee with GOSI
   */
  async registerWithGOSI(employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    
    // Only Saudis need GOSI registration
    if (employee.nationality !== 'SA') {
      throw new Error('التسجيل في التأمينات للمواطنين السعوديين فقط');
    }
    
    // Generate GOSI registration number
    const gosiNumber = `GOSI-${employee.nationalId}-${Date.now()}`;
    
    // Calculate contribution rates based on hazard category
    const contributionRates = this.getGOSIContributionRates(employee.gosi.hazardCategory);
    
    employee.gosi = {
      registered: true,
      registrationNumber: gosiNumber,
      registrationDate: new Date(),
      ...contributionRates,
    };
    
    await employee.save();
    return employee.gosi;
  }
  
  /**
   * Get GOSI contribution rates
   */
  getGOSIContributionRates(hazardCategory = 'low') {
    const rates = {
      low: { contributionRate: 12, employeeShare: 10, employerShare: 12 },
      medium: { contributionRate: 14, employeeShare: 10, employerShare: 14 },
      high: { contributionRate: 16, employeeShare: 10, employerShare: 16 },
    };
    return rates[hazardCategory];
  }
  
  /**
   * Calculate GOSI deduction
   */
  calculateGOSIDeduction(employee) {
    if (!employee.gosi.registered) return { employee: 0, employer: 0 };
    
    const basicSalary = employee.salary.basic;
    const housingAllowance = employee.salary.housingAllowance || 0;
    const taxableAmount = basicSalary + housingAllowance;
    
    const employeeShare = (taxableAmount * employee.gosi.employeeShare) / 100;
    const employerShare = (taxableAmount * employee.gosi.employerShare) / 100;
    
    return {
      employee: Math.round(employeeShare * 100) / 100,
      employer: Math.round(employerShare * 100) / 100,
    };
  }
  
  // ================================
  // NITAQAT/SAUDIZATION
  // ================================
  
  /**
   * Calculate Saudization percentage
   */
  async calculateSaudization(departmentId) {
    const employees = await Employee.find({ 
      department: departmentId, 
      status: { $ne: 'terminated' } 
    });
    
    const saudiCount = employees.filter(e => e.nationality === 'SA').length;
    const nonSaudiCount = employees.filter(e => e.nationality !== 'SA').length;
    const total = employees.length;
    
    const saudizationPercentage = total > 0 ? (saudiCount / total) * 100 : 0;
    
    // Determine Nitaqat category
    let category = 'red';
    if (saudizationPercentage >= 75) category = 'platinum';
    else if (saudizationPercentage >= 50) category = 'green';
    else if (saudizationPercentage >= 25) category = 'yellow';
    
    return {
      saudiCount,
      nonSaudiCount,
      total,
      saudizationPercentage: Math.round(saudizationPercentage * 100) / 100,
      category,
    };
  }
  
  /**
   * Get Nitaqat requirements
   */
  getNitaqatRequirements(activityType, totalEmployees) {
    const requirements = {
      // Based on Saudi Nitaqat program
      'government': { platinum: 75, green: 50, yellow: 25 },
      'private': { platinum: 50, green: 35, yellow: 20 },
      'construction': { platinum: 40, green: 25, yellow: 15 },
      'retail': { platinum: 60, green: 40, yellow: 25 },
    };
    
    return requirements[activityType] || requirements['private'];
  }
  
  // ================================
  // LEAVE MANAGEMENT
  // ================================
  
  /**
   * Request leave
   */
  async requestLeave(leaveData) {
    const employee = await Employee.findById(leaveData.employee);
    if (!employee) throw new Error('الموظف غير موجود');
    
    // Calculate total days
    const startDate = new Date(leaveData.startDate);
    const endDate = new Date(leaveData.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Check leave balance
    const leaveType = leaveData.leaveType;
    const usedDays = employee.leaveBalance.used[leaveType] || 0;
    const availableDays = employee.leaveBalance[leaveType] - usedDays;
    
    if (totalDays > availableDays && leaveType !== 'unpaid') {
      throw new Error(`رصيد الإجازة غير كافٍ. المتاح: ${availableDays} يوم`);
    }
    
    const leaveRequest = new LeaveRequest({
      ...leaveData,
      totalDays,
      paidLeave: leaveType !== 'unpaid',
    });
    
    await leaveRequest.save();
    return leaveRequest;
  }
  
  /**
   * Approve leave request
   */
  async approveLeave(leaveId, approverId) {
    const leaveRequest = await LeaveRequest.findById(leaveId).populate('employee');
    if (!leaveRequest) throw new Error('طلب الإجازة غير موجود');
    
    if (leaveRequest.status !== 'pending') {
      throw new Error('تم معالجة هذا الطلب مسبقاً');
    }
    
    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = approverId;
    leaveRequest.approvedAt = new Date();
    
    // Update leave balance
    const employee = leaveRequest.employee;
    if (employee.leaveBalance.used[leaveRequest.leaveType] !== undefined) {
      employee.leaveBalance.used[leaveRequest.leaveType] += leaveRequest.totalDays;
      await employee.save();
    }
    
    await leaveRequest.save();
    return leaveRequest;
  }
  
  /**
   * Get Saudi leave types and entitlements
   */
  getSaudiLeaveEntitlements() {
    return {
      annual: {
        name: 'إجازة سنوية',
        nameEn: 'Annual Leave',
        days: 30,
        paid: true,
        description: '30 يوم لكل سنة خدمة',
      },
      sick: {
        name: 'إجازة مرضية',
        nameEn: 'Sick Leave',
        days: 120,
        paid: true,
        description: '120 يوم (الربع الأول بء كامل، النصف الثاني بنصف راتب)',
      },
      emergency: {
        name: 'إجازة طارئة',
        nameEn: 'Emergency Leave',
        days: 4,
        paid: true,
        description: '4 أيام في السنة',
      },
      maternity: {
        name: 'إجازة أمومة',
        nameEn: 'Maternity Leave',
        days: 90,
        paid: true,
        gender: 'female',
        description: '90 يوم للأم',
      },
      hajj: {
        name: 'إجازة حج',
        nameEn: 'Hajj Leave',
        days: 15,
        paid: true,
        onceEvery: 5,
        description: '15 يوم مرة كل 5 سنوات',
      },
      marriage: {
        name: 'إجازة زواج',
        nameEn: 'Marriage Leave',
        days: 5,
        paid: true,
        once: true,
        description: '5 أيام لمرة واحدة',
      },
      bereavement: {
        name: 'إجازة عزاء',
        nameEn: 'Bereavement Leave',
        days: 5,
        paid: true,
        description: '5 أيام لوفاة قريب من الدرجة الأولى',
      },
      unpaid: {
        name: 'إجازة بدون راتب',
        nameEn: 'Unpaid Leave',
        days: 0,
        paid: false,
        description: 'بحسب الاتفاق بين الطرفين',
      },
    };
  }
  
  // ================================
  // ATTENDANCE MANAGEMENT
  // ================================
  
  /**
   * Record check-in
   */
  async checkIn(employeeId, location) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });
    
    if (attendance && attendance.checkIn) {
      throw new Error('تم تسجيل الحضور مسبقاً');
    }
    
    const employee = await Employee.findById(employeeId);
    const now = new Date();
    
    // Calculate late minutes
    const [startHour, startMinute] = employee.workSchedule.startTime.split(':').map(Number);
    const expectedStart = new Date(today);
    expectedStart.setHours(startHour, startMinute, 0, 0);
    
    let lateMinutes = 0;
    if (now > expectedStart) {
      lateMinutes = Math.floor((now - expectedStart) / (1000 * 60));
    }
    
    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        date: today,
        checkIn: now,
        lateMinutes,
        status: lateMinutes > 15 ? 'late' : 'present',
        checkInLocation: location,
      });
    } else {
      attendance.checkIn = now;
      attendance.lateMinutes = lateMinutes;
      attendance.status = lateMinutes > 15 ? 'late' : 'present';
      attendance.checkInLocation = location;
    }
    
    await attendance.save();
    return attendance;
  }
  
  /**
   * Record check-out
   */
  async checkOut(employeeId, location) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });
    
    if (!attendance || !attendance.checkIn) {
      throw new Error('لم يتم تسجيل الحضور بعد');
    }
    
    if (attendance.checkOut) {
      throw new Error('تم تسجيل الانصراف مسبقاً');
    }
    
    const employee = await Employee.findById(employeeId);
    const now = new Date();
    
    // Calculate work hours
    const totalHours = (now - attendance.checkIn) / (1000 * 60 * 60);
    
    // Calculate early departure
    const [endHour, endMinute] = employee.workSchedule.endTime.split(':').map(Number);
    const expectedEnd = new Date(today);
    expectedEnd.setHours(endHour, endMinute, 0, 0);
    
    let earlyDepartureMinutes = 0;
    if (now < expectedEnd) {
      earlyDepartureMinutes = Math.floor((expectedEnd - now) / (1000 * 60));
    }
    
    // Calculate overtime
    const standardHours = employee.workSchedule.weeklyHours / 5; // Daily hours
    let overtimeHours = 0;
    if (totalHours > standardHours) {
      overtimeHours = totalHours - standardHours;
    }
    
    attendance.checkOut = now;
    attendance.totalHours = Math.round(totalHours * 100) / 100;
    attendance.overtimeHours = Math.round(overtimeHours * 100) / 100;
    attendance.earlyDepartureMinutes = earlyDepartureMinutes;
    attendance.checkOutLocation = location;
    
    await attendance.save();
    return attendance;
  }
  
  // ================================
  // PAYROLL MANAGEMENT
  // ================================
  
  /**
   * Calculate payroll for employee
   */
  async calculatePayroll(employeeId, month, year) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    
    // Get attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendance = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });
    
    // Calculate worked days
    const workedDays = attendance.filter(a => 
      a.status === 'present' || a.status === 'late' || a.status === 'early_departure'
    ).length;
    
    // Calculate overtime hours
    const totalOvertimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    
    // Calculate daily and hourly rates
    const monthlySalary = employee.salary.total;
    const dailyRate = monthlySalary / 30;
    const hourlyRate = dailyRate / 8;
    
    // Calculate earnings
    const basicSalary = employee.salary.basic;
    const housingAllowance = employee.salary.housingAllowance || 0;
    const transportAllowance = employee.salary.transportAllowance || 0;
    const otherAllowances = employee.salary.otherAllowances || 0;
    const overtime = Math.round(totalOvertimeHours * hourlyRate * 1.5 * 100) / 100; // 1.5x rate
    
    const totalEarnings = basicSalary + housingAllowance + transportAllowance + otherAllowances + overtime;
    
    // Calculate deductions
    const gosiDeduction = this.calculateGOSIDeduction(employee);
    
    // Calculate leave deductions
    const leaveDeduction = 0; // Based on leave requests
    
    const totalDeductions = gosiDeduction.employee + leaveDeduction;
    
    // Calculate net salary
    const netSalary = totalEarnings - totalDeductions;
    
    const payroll = {
      employee: employeeId,
      month,
      year,
      earnings: {
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        overtime,
        totalEarnings,
      },
      deductions: {
        gosiEmployee: gosiDeduction.employee,
        gosiEmployer: gosiDeduction.employer,
        leaveDeduction,
        totalDeductions,
      },
      netSalary,
    };
    
    // Check if payroll already exists
    let existingPayroll = await Payroll.findOne({ employee: employeeId, month, year });
    
    if (existingPayroll) {
      Object.assign(existingPayroll, payroll);
      await existingPayroll.save();
      return existingPayroll;
    }
    
    const newPayroll = new Payroll(payroll);
    await newPayroll.save();
    return newPayroll;
  }
  
  /**
   * Process monthly payroll for all employees
   */
  async processMonthlyPayroll(month, year, departmentId = null) {
    const query = { status: 'active' };
    if (departmentId) query.department = departmentId;
    
    const employees = await Employee.find(query);
    const results = [];
    
    for (const employee of employees) {
      try {
        const payroll = await this.calculatePayroll(employee._id, month, year);
        results.push({ employee: employee._id, payroll, success: true });
      } catch (error) {
        results.push({ employee: employee._id, error: error.message, success: false });
      }
    }
    
    return results;
  }
  
  // ================================
  // WAGE PROTECTION SYSTEM (WPS)
  // ================================
  
  /**
   * Generate WPS file for bank submission
   */
  async generateWPSFile(month, year) {
    const payrolls = await Payroll.find({
      month,
      year,
      paymentStatus: 'pending',
    }).populate('employee');
    
    const wpsRecords = payrolls.map(p => ({
      employeeId: p.employee.employeeId,
      nationalId: p.employee.nationalId,
      employeeName: `${p.employee.firstNameAr} ${p.employee.lastNameAr}`,
      bankAccount: p.employee.salary.bankAccount.iban,
      netSalary: p.netSalary,
      paymentDate: new Date().toISOString().split('T')[0],
    }));
    
    return {
      month,
      year,
      totalRecords: wpsRecords.length,
      totalAmount: wpsRecords.reduce((sum, r) => sum + r.netSalary, 0),
      records: wpsRecords,
      generatedAt: new Date(),
    };
  }
  
  // ================================
  // REPORTS
  // ================================
  
  /**
   * Get employee statistics
   */
  async getEmployeeStatistics() {
    const total = await Employee.countDocuments({ status: { $ne: 'terminated' } });
    const saudis = await Employee.countDocuments({ 
      nationality: 'SA', 
      status: { $ne: 'terminated' } 
    });
    const nonSaudis = total - saudis;
    
    const byDepartment = await Employee.aggregate([
      { $match: { status: { $ne: 'terminated' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    
    const byStatus = await Employee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    
    return {
      total,
      saudis,
      nonSaudis,
      saudizationRate: total > 0 ? ((saudis / total) * 100).toFixed(2) : 0,
      byDepartment,
      byStatus,
    };
  }
  
  /**
   * Get attendance report
   */
  async getAttendanceReport(startDate, endDate, departmentId = null) {
    const query = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    
    if (departmentId) {
      const employees = await Employee.find({ department: departmentId }).select('_id');
      query.employee = { $in: employees.map(e => e._id) };
    }
    
    const attendance = await Attendance.find(query).populate('employee');
    
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      onLeave: attendance.filter(a => a.status === 'on_leave').length,
      totalOvertimeHours: attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
    };
    
    return { attendance, summary };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  SaudiHRService,
  Employee,
  LeaveRequest,
  Attendance,
  Payroll,
};