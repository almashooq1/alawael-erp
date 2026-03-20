'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3300;

app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_hr', { maxPoolSize: 15 })
  .then(() => console.log('✅ HR DB connected'));

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/6');
const payrollQueue = new Queue('payroll-processing', { connection: redis });

/* ─── Schemas ─── */
const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true },
    nationalId: { type: String, index: true },
    fullName: { ar: String, en: String },
    email: String,
    phone: String,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    hireDate: Date,
    contractType: { type: String, enum: ['full-time', 'part-time', 'contract', 'probation'] },
    contractEnd: Date,
    salary: {
      basic: Number,
      housing: Number,
      transport: Number,
      food: Number,
      other: Number,
      currency: { type: String, default: 'SAR' },
    },
    bankInfo: { bankName: String, iban: String, accountNumber: String },
    gosiNumber: String,
    nationality: String,
    gender: { type: String, enum: ['male', 'female'] },
    maritalStatus: String,
    dependents: Number,
    education: { degree: String, university: String, graduationYear: Number },
    emergencyContact: { name: String, phone: String, relation: String },
    documents: [{ type: String, name: String, url: String, expiresAt: Date }],
    status: { type: String, enum: ['active', 'on-leave', 'terminated', 'resigned', 'probation'], default: 'probation' },
    terminationDate: Date,
    terminationReason: String,
    leaveBalance: {
      annual: { type: Number, default: 21 },
      sick: { type: Number, default: 30 },
      personal: { type: Number, default: 5 },
      maternity: { type: Number, default: 70 },
      paternity: { type: Number, default: 3 },
      hajj: { type: Number, default: 10 },
      unpaid: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);
employeeSchema.index({ department: 1, status: 1 });
employeeSchema.index({ 'fullName.ar': 'text', 'fullName.en': 'text' });
const Employee = mongoose.model('Employee', employeeSchema);

const departmentSchema = new mongoose.Schema(
  {
    name: { ar: String, en: String },
    code: { type: String, unique: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    costCenter: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Department = mongoose.model('Department', departmentSchema);

const positionSchema = new mongoose.Schema(
  {
    title: { ar: String, en: String },
    code: { type: String, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    grade: String,
    salaryRange: { min: Number, max: Number },
    requirements: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Position = mongoose.model('Position', positionSchema);

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
    type: { type: String, enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'hajj', 'unpaid', 'emergency'] },
    startDate: Date,
    endDate: Date,
    days: Number,
    reason: String,
    attachments: [String],
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approvedAt: Date,
    rejectionReason: String,
    substitute: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);
leaveSchema.index({ employee: 1, startDate: 1, endDate: 1 });
const Leave = mongoose.model('Leave', leaveSchema);

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
    period: { year: Number, month: Number },
    earnings: {
      basic: Number,
      housing: Number,
      transport: Number,
      food: Number,
      overtime: Number,
      bonus: Number,
      commission: Number,
      other: Number,
    },
    deductions: {
      gosiEmployee: Number,
      gosiEmployer: Number,
      tax: Number,
      loanInstallment: Number,
      absence: Number,
      latePenalty: Number,
      advanceSalary: Number,
      other: Number,
    },
    grossSalary: Number,
    netSalary: Number,
    currency: { type: String, default: 'SAR' },
    status: { type: String, enum: ['draft', 'calculated', 'approved', 'paid', 'cancelled'], default: 'draft' },
    paymentDate: Date,
    paymentRef: String,
    approvedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);
payrollSchema.index({ 'period.year': 1, 'period.month': 1 });
const Payroll = mongoose.model('Payroll', payrollSchema);

const gratuitySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    yearsOfService: Number,
    lastBasicSalary: Number,
    totalAmount: Number,
    calculationMethod: { type: String, enum: ['resignation', 'termination', 'retirement', 'contract-end'] },
    breakdown: { firstFiveYears: Number, afterFiveYears: Number },
    status: { type: String, enum: ['calculated', 'approved', 'paid'], default: 'calculated' },
  },
  { timestamps: true },
);
const Gratuity = mongoose.model('Gratuity', gratuitySchema);

const recruitmentSchema = new mongoose.Schema(
  {
    title: { ar: String, en: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
    requirements: [String],
    description: String,
    salaryRange: { min: Number, max: Number },
    type: { type: String, enum: ['internal', 'external', 'both'], default: 'external' },
    status: { type: String, enum: ['draft', 'open', 'closed', 'filled', 'cancelled'], default: 'draft' },
    applicants: [
      {
        name: String,
        email: String,
        phone: String,
        resumeUrl: String,
        score: Number,
        status: { type: String, enum: ['new', 'screened', 'interviewed', 'offered', 'hired', 'rejected'], default: 'new' },
        notes: String,
        appliedAt: { type: Date, default: Date.now },
      },
    ],
    deadline: Date,
    filledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true },
);
const Recruitment = mongoose.model('Recruitment', recruitmentSchema);

/* ─── Payroll Calculation ─── */
const GOSI_EMPLOYEE_RATE = 0.0975;
const GOSI_EMPLOYER_RATE = 0.1175;
const GOSI_CAP = 45000;

function calculatePayroll(employee, overtime = 0, bonus = 0, deductionDays = 0) {
  const s = employee.salary;
  const basic = s.basic || 0;
  const totalEarnings = basic + (s.housing || 0) + (s.transport || 0) + (s.food || 0) + (s.other || 0) + overtime + bonus;
  const gosiBase = Math.min(basic + (s.housing || 0), GOSI_CAP);
  const gosiEmployee = Math.round(gosiBase * GOSI_EMPLOYEE_RATE);
  const gosiEmployer = Math.round(gosiBase * GOSI_EMPLOYER_RATE);
  const dailyRate = totalEarnings / 30;
  const absenceDeduction = Math.round(dailyRate * deductionDays);
  const totalDeductions = gosiEmployee + absenceDeduction;
  return {
    earnings: { basic, housing: s.housing, transport: s.transport, food: s.food, overtime, bonus, other: s.other || 0 },
    deductions: { gosiEmployee, gosiEmployer, absence: absenceDeduction },
    grossSalary: totalEarnings,
    netSalary: totalEarnings - totalDeductions,
  };
}

// Saudi Labor Law gratuity
function calculateGratuity(basicSalary, yearsOfService, method) {
  let amount = 0;
  if (yearsOfService <= 5) {
    amount = (basicSalary / 2) * yearsOfService;
  } else {
    amount = (basicSalary / 2) * 5 + basicSalary * (yearsOfService - 5);
  }
  if (method === 'resignation' && yearsOfService < 2) amount = 0;
  else if (method === 'resignation' && yearsOfService < 5) amount *= 1 / 3;
  else if (method === 'resignation' && yearsOfService < 10) amount *= 2 / 3;
  return Math.round(amount);
}

/* ─── Employee Routes ─── */
app.get('/api/employees', async (req, res) => {
  const { page = 1, limit = 20, department, status, search } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('department position manager')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Employee.countDocuments(filter),
  ]);
  res.json({ employees, total, page: +page, pages: Math.ceil(total / limit) });
});

app.post('/api/employees', async (req, res) => {
  try {
    const count = await Employee.countDocuments();
    const employeeId = `EMP-${String(count + 1).padStart(5, '0')}`;
    const employee = await Employee.create({ ...req.body, employeeId });
    res.status(201).json(employee);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  const emp = await Employee.findById(req.params.id).populate('department position manager');
  if (!emp) return res.status(404).json({ error: 'Not found' });
  res.json(emp);
});

app.put('/api/employees/:id', async (req, res) => {
  const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(emp);
});

// Terminate / Resign
app.post('/api/employees/:id/terminate', async (req, res) => {
  const emp = await Employee.findById(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  const { reason, type } = req.body; // type: termination, resignation, retirement
  emp.status = type === 'resignation' ? 'resigned' : 'terminated';
  emp.terminationDate = new Date();
  emp.terminationReason = reason;
  await emp.save();
  const years = (Date.now() - emp.hireDate.getTime()) / (365.25 * 86400000);
  const amount = calculateGratuity(emp.salary.basic, years, type);
  const gratuity = await Gratuity.create({
    employee: emp._id,
    yearsOfService: Math.round(years * 10) / 10,
    lastBasicSalary: emp.salary.basic,
    totalAmount: amount,
    calculationMethod: type,
    breakdown: { firstFiveYears: (Math.min(years, 5) * emp.salary.basic) / 2, afterFiveYears: Math.max(0, years - 5) * emp.salary.basic },
  });
  res.json({ employee: emp, gratuity });
});

/* ─── Department & Position Routes ─── */
app.get('/api/departments', async (_, res) => res.json(await Department.find().populate('head parent')));
app.post('/api/departments', async (req, res) => {
  try {
    res.status(201).json(await Department.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.put('/api/departments/:id', async (req, res) => res.json(await Department.findByIdAndUpdate(req.params.id, req.body, { new: true })));

app.get('/api/positions', async (req, res) =>
  res.json(await Position.find(req.query.department ? { department: req.query.department } : {}).populate('department')),
);
app.post('/api/positions', async (req, res) => {
  try {
    res.status(201).json(await Position.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Leave Routes ─── */
app.get('/api/leaves', async (req, res) => {
  const { employee, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (employee) filter.employee = employee;
  if (status) filter.status = status;
  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate('employee substitute approvedBy')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Leave.countDocuments(filter),
  ]);
  res.json({ leaves, total, page: +page });
});

app.post('/api/leaves', async (req, res) => {
  try {
    const emp = await Employee.findById(req.body.employee);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const days = Math.ceil((new Date(req.body.endDate) - new Date(req.body.startDate)) / 86400000) + 1;
    if (emp.leaveBalance[req.body.type] !== undefined && emp.leaveBalance[req.body.type] < days && req.body.type !== 'unpaid') {
      return res.status(400).json({ error: 'Insufficient leave balance', available: emp.leaveBalance[req.body.type], requested: days });
    }
    const leave = await Leave.create({ ...req.body, days });
    res.status(201).json(leave);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/leaves/:id/approve', async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave || leave.status !== 'pending') return res.status(400).json({ error: 'Cannot approve' });
  leave.status = 'approved';
  leave.approvedBy = req.body.approvedBy;
  leave.approvedAt = new Date();
  await leave.save();
  const emp = await Employee.findById(leave.employee);
  if (emp.leaveBalance[leave.type] !== undefined) {
    emp.leaveBalance[leave.type] -= leave.days;
    await emp.save();
  }
  res.json(leave);
});

app.put('/api/leaves/:id/reject', async (req, res) => {
  const leave = await Leave.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectionReason: req.body.reason, approvedBy: req.body.rejectedBy },
    { new: true },
  );
  res.json(leave);
});

/* ─── Payroll Routes ─── */
app.post('/api/payroll/calculate', async (req, res) => {
  try {
    const { year, month } = req.body;
    const employees = await Employee.find({ status: { $in: ['active', 'on-leave'] } });
    const results = [];
    for (const emp of employees) {
      const existing = await Payroll.findOne({ employee: emp._id, 'period.year': year, 'period.month': month });
      if (existing) {
        results.push(existing);
        continue;
      }
      const calc = calculatePayroll(emp, req.body.overtime?.[emp._id] || 0, req.body.bonuses?.[emp._id] || 0);
      const payroll = await Payroll.create({
        employee: emp._id,
        period: { year, month },
        ...calc,
        status: 'calculated',
      });
      results.push(payroll);
    }
    res.json({ count: results.length, payrolls: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payroll', async (req, res) => {
  const { year, month, status, employee, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (year) filter['period.year'] = +year;
  if (month) filter['period.month'] = +month;
  if (status) filter.status = status;
  if (employee) filter.employee = employee;
  const [payrolls, total] = await Promise.all([
    Payroll.find(filter)
      .populate('employee')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ 'period.year': -1, 'period.month': -1 }),
    Payroll.countDocuments(filter),
  ]);
  res.json({ payrolls, total, page: +page });
});

app.put('/api/payroll/:id/approve', async (req, res) => {
  const p = await Payroll.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.body.approvedBy }, { new: true });
  res.json(p);
});

app.post('/api/payroll/batch-approve', async (req, res) => {
  const { year, month, approvedBy } = req.body;
  const result = await Payroll.updateMany(
    { 'period.year': year, 'period.month': month, status: 'calculated' },
    { status: 'approved', approvedBy },
  );
  res.json({ modified: result.modifiedCount });
});

/* ─── Recruitment Routes ─── */
app.get('/api/recruitment', async (req, res) => {
  const jobs = await Recruitment.find(req.query.status ? { status: req.query.status } : {})
    .populate('department position')
    .sort({ createdAt: -1 });
  res.json(jobs);
});

app.post('/api/recruitment', async (req, res) => {
  try {
    res.status(201).json(await Recruitment.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/recruitment/:id/apply', async (req, res) => {
  const job = await Recruitment.findById(req.params.id);
  if (!job || job.status !== 'open') return res.status(400).json({ error: 'Job not open' });
  job.applicants.push(req.body);
  await job.save();
  res.json({ message: 'Application received', applicantCount: job.applicants.length });
});

app.put('/api/recruitment/:id/applicant/:appIdx/status', async (req, res) => {
  const job = await Recruitment.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const idx = +req.params.appIdx;
  if (!job.applicants[idx]) return res.status(404).json({ error: 'Applicant not found' });
  job.applicants[idx].status = req.body.status;
  job.applicants[idx].notes = req.body.notes || job.applicants[idx].notes;
  await job.save();
  res.json(job.applicants[idx]);
});

/* ─── Gratuity ─── */
app.get('/api/gratuity/:employeeId', async (req, res) => {
  const emp = await Employee.findById(req.params.employeeId);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  const years = (Date.now() - emp.hireDate.getTime()) / (365.25 * 86400000);
  const scenarios = ['resignation', 'termination', 'retirement'].map(method => ({
    method,
    amount: calculateGratuity(emp.salary.basic, years, method),
  }));
  res.json({ employee: emp.fullName, yearsOfService: Math.round(years * 10) / 10, scenarios });
});

/* ─── Stats ─── */
app.get('/api/hr/stats', async (_, res) => {
  const [totalEmployees, activeEmployees, departments, pendingLeaves, openPositions] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ status: 'active' }),
    Department.countDocuments({ isActive: true }),
    Leave.countDocuments({ status: 'pending' }),
    Recruitment.countDocuments({ status: 'open' }),
  ]);
  const byDepartment = await Employee.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$department', count: { $sum: 1 } } }]);
  res.json({ totalEmployees, activeEmployees, departments, pendingLeaves, openPositions, byDepartment });
});

/* ─── Payroll Worker ─── */
new Worker(
  'payroll-processing',
  async job => {
    console.log(`Processing payroll: ${JSON.stringify(job.data)}`);
  },
  { connection: redis },
);

// Annual leave reset (January 1)
cron.schedule('0 0 1 1 *', async () => {
  await Employee.updateMany({ status: 'active' }, { $set: { 'leaveBalance.annual': 21, 'leaveBalance.personal': 5 } });
  console.log('✅ Annual leave balances reset');
});

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'hr-payroll-service', uptime: process.uptime() }));

app.listen(PORT, () => console.log(`👥 HR-Payroll Service running on port ${PORT}`));
