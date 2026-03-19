/* eslint-disable no-unused-vars */
/**
 * نظام الرواتب والحوافز - بيانات أولية (Seed Data)
 * Payroll & Incentives System - Sample Data
 *
 * هذا الملف ينشئ بيانات تجريبية شاملة لاختبار نظام الرواتب
 * لتشغيل: node backend/seed/payroll-seed-data.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Models
let Payroll, CompensationStructure, IndividualIncentive, PerformancePenalty, BenefitsSummary;
let Employee, Attendance, Leave;

// مساعدات
const getLastDayOfMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

const getMonthName = month => {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  return months[month - 1];
};

/**
 * إنشاء هياكل تعويضية
 */
const createCompensationStructures = async () => {
  console.log('📋 إنشاء هياكل تعويضية...');

  const structures = [
    {
      name: 'الهيكل الأساسي 2025',
      description: 'الهيكل التعويضي الافتراضي للشركة',
      effectiveDate: new Date('2025-01-01'),
      isActive: true,
      applicableTo: {
        scope: 'all',
      },
      fixedAllowances: [
        { name: 'السكن', amount: 600, period: 'monthly' },
        { name: 'النقل', amount: 200, period: 'monthly' },
        { name: 'الوجبات', amount: 150, period: 'monthly' },
        { name: 'الهاتف', amount: 100, period: 'monthly' },
      ],
      variableAllowances: [
        {
          name: 'العمل الإضافي',
          basedOn: 'other',
          percentage: 0,
          conditions: { basedOnOvertime: true },
        },
      ],
      incentiveStructure: {
        performance: { percentage: 10, minScore: 80 },
        attendance: { amount: 50, baselinePercentage: 100 },
        safety: { amount: 75, conditions: {} },
        loyalty: { percentage: 5, yearsRequired: 5 },
        project: { amount: 100, conditions: { projectCompletion: 100 } },
        seasonal: { amount: 200, months: [12] },
      },
      mandatoryDeductions: {
        incomeTax: {
          brackets: [
            { amount: 1000, rate: 0 },
            { amount: 2000, rate: 0.05 },
            { amount: 3000, rate: 0.1 },
            { amount: 6000, rate: 0.15 },
            { amount: Infinity, rate: 0.2 },
          ],
        },
        socialSecurity: { percentage: 6, maxAmount: 1000 },
        healthInsurance: { percentage: 2, amount: 50 },
        GOSI: { percentage: 3, maxAmount: 2000, minAmount: 100 },
      },
      paidLeave: {
        annualDays: 30,
        accruedPerMonth: 2.5,
      },
    },
    {
      name: 'هيكل الإدارة العليا',
      description: 'هيكل تعويضي مخصص للمديرين والمسؤولين',
      effectiveDate: new Date('2025-01-01'),
      isActive: true,
      applicableTo: {
        scope: 'custom',
        roles: ['manager', 'director', 'supervisor'],
      },
      fixedAllowances: [
        { name: 'السكن', amount: 1000, period: 'monthly' },
        { name: 'النقل', amount: 400, period: 'monthly' },
        { name: 'الوجبات', amount: 300, period: 'monthly' },
        { name: 'الهاتف', amount: 200, period: 'monthly' },
        { name: 'مكتبية', amount: 150, period: 'monthly' },
      ],
      variableAllowances: [
        { name: 'بدل المسؤولية', basedOn: 'salary', percentage: 15, conditions: {} },
      ],
      incentiveStructure: {
        performance: { percentage: 20, minScore: 85 },
        attendance: { amount: 100, baselinePercentage: 100 },
        safety: { amount: 150, conditions: {} },
        loyalty: { percentage: 10, yearsRequired: 3 },
        project: { amount: 500, conditions: {} },
        seasonal: { amount: 500, months: [12] },
      },
      mandatoryDeductions: {
        incomeTax: {
          brackets: [
            { amount: 2000, rate: 0 },
            { amount: 4000, rate: 0.05 },
            { amount: 8000, rate: 0.1 },
            { amount: 15000, rate: 0.15 },
            { amount: Infinity, rate: 0.2 },
          ],
        },
        socialSecurity: { percentage: 6, maxAmount: 1500 },
        healthInsurance: { percentage: 2.5, amount: 100 },
        GOSI: { percentage: 3, maxAmount: 2500, minAmount: 200 },
      },
      paidLeave: {
        annualDays: 35,
        accruedPerMonth: 3,
      },
    },
  ];

  const created = await CompensationStructure.insertMany(structures);
  console.log(`✅ تم إنشاء ${created.length} هيكل تعويضي`);
  return created;
};

/**
 * إنشاء سجلات رواتب
 */
const createPayrollRecords = async (employees, structures) => {
  console.log('💰 إنشاء سجلات الرواتب...');

  const payrolls = [];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // إنشاء رواتب لآخر 3 أشهر
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    let month = currentMonth - monthOffset;
    let year = currentYear;

    if (month <= 0) {
      month += 12;
      year -= 1;
    }

    for (const employee of employees) {
      const structure = structures[0]; // استخدم الهيكل الأساسي
      const baseSalary = employee.salary || 2500;

      // حساب المزايا
      const allowances = structure.fixedAllowances.map(a => ({
        name: a.name,
        type: a.name === 'السكن' ? 'housing' : 'other',
        amount: a.amount,
        isCalculated: false,
      }));

      // حساب العمل الإضافي عشوائي
      const overtimeHours = Math.floor(Math.random() * 20);
      const overtimeAmount = (baseSalary / 160) * overtimeHours * 0.5; // 50% إضافي

      // حساب المجموع
      const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalGross = baseSalary + totalAllowances + overtimeAmount;

      // حساب الحوافز
      const incentives = {
        performance: Math.random() > 0.5 ? 200 : 0,
        attendance: Math.random() > 0.2 ? 50 : 0,
        safety: Math.random() > 0.3 ? 75 : 0,
        loyalty: 0,
        project: Math.random() > 0.4 ? 100 : 0,
        seasonal: month === 12 ? 200 : 0,
        other: 0,
      };

      const totalIncentives = Object.values(incentives).reduce((sum, val) => sum + val, 0);

      // حساب العقوبات
      const penalties = {
        disciplinary: Math.random() > 0.7 ? 50 : 0,
        attendance: 0,
        misconduct: 0,
        other: 0,
      };

      const totalPenalties = Object.values(penalties).reduce((sum, val) => sum + val, 0);

      // حساب الضرائب
      const taxableIncome = totalGross + totalIncentives;
      let incomeTax = 0;
      let remaining = taxableIncome;

      for (const bracket of structure.mandatoryDeductions.incomeTax.brackets) {
        if (remaining <= 0) break;
        const taxableInThisBracket = Math.min(remaining, bracket.amount);
        incomeTax += taxableInThisBracket * bracket.rate;
        remaining -= taxableInThisBracket;
      }

      const socialSecurity = Math.min((totalGross * 6) / 100, 1000);
      const healthInsurance = (totalGross * 2) / 100;
      const GOSI = Math.max(Math.min((totalGross * 3) / 100, 2000), 100);

      const totalDeductions = incomeTax + socialSecurity + healthInsurance + GOSI + totalPenalties;
      const netSalary = totalGross + totalIncentives - totalDeductions;

      payrolls.push({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        departmentId: employee.department,
        month,
        year,
        baseSalary,
        allowances,
        deductions: [],
        attendance: {
          presentDays: Math.floor(Math.random() * 5) + 18, // 18-22 يوم حضور
          absentDays: Math.random() > 0.8 ? 1 : 0,
          leaveDays: Math.random() > 0.7 ? 2 : 0,
          overtime: {
            regular: Math.floor(Math.random() * 10),
            weekend: Math.floor(Math.random() * 5),
            holiday: Math.floor(Math.random() * 3),
          },
        },
        incentives,
        penalties,
        calculations: {
          totalAllowances,
          totalIncentives,
          totalPenalties,
          totalGross,
          totalDeductions,
          totalNet: netSalary,
          netPayable: netSalary,
          lastCalculatedAt: new Date(),
        },
        taxes: {
          incomeTax: {
            amount: incomeTax,
            percentage: (incomeTax / taxableIncome) * 100 || 0,
            taxableIncome,
          },
          socialSecurity: { amount: socialSecurity, percentage: 6 },
          healthInsurance: { amount: healthInsurance, percentage: 2 },
          GOSI: { amount: GOSI, percentage: 3 },
        },
        status: monthOffset > 0 ? 'paid' : Math.random() > 0.5 ? 'approved' : 'pending-approval',
        paymentMethod: 'bank_transfer',
        bankAccount: `SA${Math.random().toString().slice(2, 22)}`,
        transactionReference:
          monthOffset > 0 ? `TXN${Date.now()}${Math.random().toString().slice(2, 6)}` : null,
        paymentDate: monthOffset > 0 ? new Date(year, month, 25) : null,
        createdBy: employee.createdBy,
        modifiedBy: employee.modifiedBy,
        modificationCount: monthOffset > 0 ? 2 : 1,
        isLocked: monthOffset > 0,
        approvals: {
          preparedBy: { userId: 'user123', name: 'محضر الرواتب', date: new Date() },
          reviewedBy:
            monthOffset <= 1 ? { userId: 'user456', name: 'مراجع HR', date: new Date() } : null,
          approvedBy:
            monthOffset <= 0 ? { userId: 'user789', name: 'مدير HR', date: new Date() } : null,
          finalizedBy:
            monthOffset > 0 ? { userId: 'user999', name: 'مسؤول الدفع', date: new Date() } : null,
        },
      });
    }
  }

  const created = await Payroll.insertMany(payrolls, { ordered: false }).catch(err => {
    console.log('⚠️  بعض السجلات موجودة بالفعل:', err.writeErrors?.length || 0);
    return payrolls.filter(
      p =>
        !err.writeErrors?.some(
          e =>
            e.err.op.employeeId === p.employeeId &&
            e.err.op.month === p.month &&
            e.err.op.year === p.year
        )
    );
  });

  console.log(`✅ تم إنشاء ${created.length || payrolls.length} سجل راتب`);
  return payrolls;
};

/**
 * إنشاء سجلات الحوافز الفردية
 */
const createIncentives = async employees => {
  console.log('🎁 إنشاء سجلات الحوافز...');

  const incentiveTypes = [
    'performance',
    'attendance',
    'safety',
    'loyalty',
    'project',
    'seasonal',
    'referral',
    'achievement',
  ];

  const currentDate = new Date();
  const incentives = [];

  for (const employee of employees) {
    for (let i = 0; i < 3; i++) {
      const type = incentiveTypes[Math.floor(Math.random() * incentiveTypes.length)];
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      incentives.push({
        employeeId: employee._id,
        month,
        year,
        incentiveType: type,
        amount: Math.floor(Math.random() * 300) + 50,
        reason: `حافزة ${type} - ${employee.name}`,
        metrics: { score: Math.floor(Math.random() * 100) + 70 },
        status: Math.random() > 0.3 ? 'approved' : 'pending-approval',
        approvals: {
          recommendedBy: {
            userId: 'manager1',
            date: new Date(),
          },
          approvedBy: Math.random() > 0.3 ? { userId: 'hr1', date: new Date() } : null,
        },
        payment: {
          paidDate: Math.random() > 0.5 ? new Date() : null,
          transactionReference: Math.random() > 0.5 ? `INC${Date.now()}` : null,
        },
      });
    }
  }

  const created = await IndividualIncentive.insertMany(incentives, { ordered: false }).catch(
    err => {
      console.log('⚠️  بعض الحوافز موجودة بالفعل:', err.writeErrors?.length || 0);
      return incentives;
    }
  );

  console.log(`✅ تم إنشاء ${created.length || incentives.length} حافزة`);
  return incentives;
};

/**
 * إنشاء سجلات العقوبات
 */
const createPenalties = async employees => {
  console.log('⚠️  إنشاء سجلات العقوبات...');

  const penaltyTypes = ['disciplinary', 'attendance', 'misconduct'];
  const severities = ['low', 'medium', 'high'];
  const penalties = [];

  // إنشاء عقوبات عشوائية لبعض الموظفين
  for (let i = 0; i < Math.floor(employees.length / 3); i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const type = penaltyTypes[Math.floor(Math.random() * penaltyTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    penalties.push({
      employeeId: employee._id,
      penaltyType: type,
      severity,
      amount: Math.floor(Math.random() * 200) + 50,
      reason: `عقوبة ${type} - ${severity}`,
      incidentDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      status: Math.random() > 0.4 ? 'approved' : 'pending-approval',
      approvals: {
        submittedBy: { userId: 'manager1', date: new Date() },
        approvedBy: Math.random() > 0.4 ? { userId: 'director1', date: new Date() } : null,
      },
      appeal: {
        appealedDate: Math.random() > 0.8 ? new Date() : null,
        appealReason: Math.random() > 0.8 ? 'I disagree with this penalty' : null,
        appealOutcome: null,
      },
    });
  }

  const created = await PerformancePenalty.insertMany(penalties, { ordered: false }).catch(err => {
    console.log('⚠️  بعض العقوبات موجودة بالفعل:', err.writeErrors?.length || 0);
    return penalties;
  });

  console.log(`✅ تم إنشاء ${created.length || penalties.length} عقوبة`);
  return penalties;
};

/**
 * الدالة الرئيسية
 */
const seedPayrollData = async () => {
  try {
    console.log('🚀 بدء إنشاء بيانات الرواتب الأولية...\n');

    // الاتصال بقاعدة البيانات
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_erp';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ اتصل بـ MongoDB بنجاح\n');

    // استيراد النماذج
    Payroll = require('../models/payroll.model')?.Payroll || require('../models/payroll.model');
    CompensationStructure =
      require('../models/compensation.model')?.CompensationStructure ||
      require('../models/compensation.model').CompensationStructure;
    IndividualIncentive =
      require('../models/compensation.model')?.IndividualIncentive ||
      require('../models/compensation.model').IndividualIncentive;
    PerformancePenalty =
      require('../models/compensation.model')?.PerformancePenalty ||
      require('../models/compensation.model').PerformancePenalty;
    BenefitsSummary =
      require('../models/compensation.model')?.BenefitsSummary ||
      require('../models/compensation.model').BenefitsSummary;

    // الحصول على نماذج الموظفين
    const Employee = mongoose.model('Employee') || require('../models/employee.model');

    // الحصول على بعض الموظفين
    let employees = await Employee.find().limit(10);

    if (employees.length === 0) {
      console.log('⚠️  لم يتم العثور على موظفين، إنشاء موظفين تجريبيين...');
      const sampleEmployees = [
        {
          name: 'أحمد محمد علي',
          email: 'ahmed@alawael.com',
          salary: 3000,
          department: new mongoose.Types.ObjectId(),
          position: 'مهندس',
        },
        {
          name: 'فاطمة عبدالله حسن',
          email: 'fatima@alawael.com',
          salary: 2800,
          department: new mongoose.Types.ObjectId(),
          position: 'محاسبة',
        },
        {
          name: 'محمد سالم خالد',
          email: 'mohammed@alawael.com',
          salary: 2500,
          department: new mongoose.Types.ObjectId(),
          position: 'موظف',
        },
        {
          name: 'نور حميد ياسين',
          email: 'noor@alawael.com',
          salary: 2600,
          department: new mongoose.Types.ObjectId(),
          position: 'تطوير',
        },
        {
          name: 'علي رضا محمود',
          email: 'ali@alawael.com',
          salary: 3200,
          department: new mongoose.Types.ObjectId(),
          position: 'مدير',
        },
      ];
      employees = await Employee.insertMany(sampleEmployees);
    }

    console.log(`📊 عدد الموظفين: ${employees.length}\n`);

    // إنشاء البيانات الأولية
    const structures = await createCompensationStructures();
    const payrolls = await createPayrollRecords(employees, structures);
    const incentives = await createIncentives(employees);
    const penalties = await createPenalties(employees);

    console.log('\n✨ تمت عملية البذر بنجاح!');
    console.log('📝 ملخص البيانات المنشأة:');
    console.log(`   - هياكل تعويضية: ${structures.length}`);
    console.log(`   - سجلات رواتب: ${payrolls.length}`);
    console.log(`   - حوافز فردية: ${incentives.length}`);
    console.log(`   - عقوبات: ${penalties.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في عملية البذر:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// تشغيل البذر
if (require.main === module) {
  seedPayrollData();
}

module.exports = seedPayrollData;
