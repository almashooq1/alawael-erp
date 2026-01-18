#!/usr/bin/env node

/**
 * استيراد البيانات الأولية لنظام ERP
 * Initial Data Seeding Script
 *
 * Usage:
 * node scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Organization, Employee } = require('../models/organization.model');

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

// ============================================
// Initial Organization Data
// ============================================
const organizationData = {
  organizationId: 'ORG001',
  name: 'منظمة الأوائل لتأهيل ذوي الإعاقة',
  chairman: {
    id: 'CHR001',
    name: 'رئيس مجلس الإدارة',
    title: 'Chairman of the Board',
    email: 'chairman@alawael.com',
    phone: '+966501234567',
    location: 'الرياض',
  },

  departments: [
    {
      id: 'DEPT001',
      name: 'الإدارة العامة',
      manager: { id: 'EMP001', name: 'مدير عام المنظمة' },
      sections: [
        {
          id: 'SEC001',
          name: 'مكتب المدير العام',
          positions: [
            { id: 'POS001', title: 'مدير عام المنظمة', level: 'executive', salary: { min: 30000, max: 40000 } },
            { id: 'POS002', title: 'مساعد المدير العام', level: 'senior', salary: { min: 20000, max: 25000 } },
          ],
        },
      ],
    },
    {
      id: 'DEPT002',
      name: 'التأهيل والتدريب',
      manager: { id: 'EMP002', name: 'مدير التأهيل' },
      sections: [
        {
          id: 'SEC002',
          name: 'التأهيل الطبي',
          positions: [
            { id: 'POS003', title: 'أخصائي تأهيل طبي', level: 'specialist', salary: { min: 12000, max: 18000 } },
            { id: 'POS004', title: 'أخصائي علاج طبيعي', level: 'specialist', salary: { min: 11000, max: 16000 } },
          ],
        },
        {
          id: 'SEC003',
          name: 'التأهيل النفسي',
          positions: [{ id: 'POS005', title: 'أخصائي نفسي', level: 'specialist', salary: { min: 12000, max: 17000 } }],
        },
      ],
    },
    {
      id: 'DEPT003',
      name: 'الموارد البشرية',
      manager: { id: 'EMP003', name: 'مدير الموارد البشرية' },
      sections: [
        {
          id: 'SEC004',
          name: 'الشؤون الإدارية',
          positions: [
            { id: 'POS006', title: 'مدير موارد بشرية', level: 'management', salary: { min: 18000, max: 25000 } },
            { id: 'POS007', title: 'أخصائي موارد بشرية', level: 'specialist', salary: { min: 10000, max: 14000 } },
          ],
        },
      ],
    },
    {
      id: 'DEPT004',
      name: 'المالية والمحاسبة',
      manager: { id: 'EMP004', name: 'المدير المالي' },
      sections: [
        {
          id: 'SEC005',
          name: 'المحاسبة',
          positions: [
            { id: 'POS008', title: 'مدير مالي', level: 'management', salary: { min: 20000, max: 28000 } },
            { id: 'POS009', title: 'محاسب', level: 'specialist', salary: { min: 9000, max: 13000 } },
          ],
        },
      ],
    },
  ],

  branches: [
    {
      id: 'BR001',
      name: 'الفرع الرئيسي',
      location: 'الرياض',
      manager: { id: 'EMP001', name: 'مدير عام المنظمة' },
      departments: ['DEPT001', 'DEPT002', 'DEPT003', 'DEPT004'],
    },
    {
      id: 'BR002',
      name: 'فرع جدة',
      location: 'جدة',
      manager: { id: 'EMP005', name: 'مدير فرع جدة' },
      departments: ['DEPT002', 'DEPT003'],
    },
  ],

  kpis: {
    organizational: [
      { id: 'KPI001', name: 'نسبة رضا المستفيدين', target: 90, current: 85, unit: '%' },
      { id: 'KPI002', name: 'عدد المستفيدين', target: 500, current: 420, unit: 'person' },
    ],
    departments: {
      DEPT002: [{ id: 'KPI003', name: 'نسبة إكمال برامج التأهيل', target: 85, current: 78, unit: '%' }],
    },
  },

  careerPaths: {
    'التأهيل والتدريب': {
      entry: ['POS003', 'POS004', 'POS005'],
      mid: ['أخصائي تأهيل أول'],
      senior: ['مدير التأهيل'],
    },
  },

  trainingPrograms: [
    {
      id: 'TRN001',
      name: 'أساسيات التأهيل الطبي',
      category: 'technical',
      duration: 40,
      cost: 5000,
      targetAudience: ['أخصائي تأهيل طبي'],
      topics: ['التشخيص', 'العلاج الطبيعي', 'التمارين العلاجية'],
    },
    {
      id: 'TRN002',
      name: 'مهارات القيادة',
      category: 'leadership',
      duration: 24,
      cost: 8000,
      targetAudience: ['مدير'],
      topics: ['القيادة الفعالة', 'إدارة الفريق', 'اتخاذ القرار'],
    },
    {
      id: 'TRN003',
      name: 'خدمة العملاء المتميزة',
      category: 'soft-skills',
      duration: 16,
      cost: 3000,
      targetAudience: ['جميع الموظفين'],
      topics: ['التواصل', 'حل المشكلات', 'التعامل مع الشكاوى'],
    },
  ],
};

// ============================================
// Sample Employees Data
// ============================================
const employeesData = [
  {
    employeeId: 'EMP001',
    personalInfo: {
      firstName: 'أحمد',
      lastName: 'المحمد',
      nationalId: '1234567890',
      dateOfBirth: new Date('1980-01-15'),
      gender: 'male',
      nationality: 'Saudi',
      email: 'ahmed.almohammad@alawael.com',
      phone: '+966501234567',
      address: 'الرياض، حي الملك فهد',
    },
    employment: {
      positionId: 'POS001',
      positionTitle: 'مدير عام المنظمة',
      departmentId: 'DEPT001',
      departmentName: 'الإدارة العامة',
      branchId: 'BR001',
      hireDate: new Date('2020-01-01'),
      employmentType: 'full-time',
      contractType: 'permanent',
      status: 'active',
      supervisor: null,
    },
    salary: {
      baseSalary: 35000,
      allowances: [
        { type: 'housing', amount: 10000 },
        { type: 'transportation', amount: 2000 },
      ],
      deductions: [{ type: 'insurance', amount: 500 }],
      totalSalary: 46500,
    },
    performance: {
      currentRating: 4.5,
      reviews: [
        {
          reviewId: 'REV001',
          date: new Date('2024-12-31'),
          rating: 4.5,
          reviewer: 'CHR001',
          comments: 'أداء ممتاز، قيادة قوية',
        },
      ],
      goals: [
        {
          goalId: 'GOAL001',
          description: 'زيادة عدد المستفيدين بنسبة 20%',
          status: 'in-progress',
          progress: 75,
        },
      ],
    },
    training: [
      {
        programId: 'TRN002',
        programName: 'مهارات القيادة',
        completionDate: new Date('2024-06-30'),
        status: 'completed',
        score: 95,
        certificate: 'CERT001',
      },
    ],
    attendance: {
      totalWorkingDays: 250,
      presentDays: 240,
      absentDays: 5,
      lateDays: 3,
      leaves: [
        {
          type: 'annual',
          startDate: new Date('2024-08-01'),
          endDate: new Date('2024-08-05'),
          days: 5,
          status: 'approved',
        },
      ],
    },
  },
  {
    employeeId: 'EMP002',
    personalInfo: {
      firstName: 'فاطمة',
      lastName: 'العلي',
      nationalId: '2345678901',
      dateOfBirth: new Date('1985-05-20'),
      gender: 'female',
      nationality: 'Saudi',
      email: 'fatima.alali@alawael.com',
      phone: '+966502345678',
      address: 'الرياض، حي النرجس',
    },
    employment: {
      positionId: 'POS003',
      positionTitle: 'أخصائي تأهيل طبي',
      departmentId: 'DEPT002',
      departmentName: 'التأهيل والتدريب',
      branchId: 'BR001',
      hireDate: new Date('2021-03-15'),
      employmentType: 'full-time',
      contractType: 'permanent',
      status: 'active',
      supervisor: 'EMP001',
    },
    salary: {
      baseSalary: 15000,
      allowances: [
        { type: 'housing', amount: 4000 },
        { type: 'transportation', amount: 1500 },
      ],
      deductions: [{ type: 'insurance', amount: 300 }],
      totalSalary: 20200,
    },
    performance: {
      currentRating: 4.7,
      reviews: [
        {
          reviewId: 'REV002',
          date: new Date('2024-12-31'),
          rating: 4.7,
          reviewer: 'EMP001',
          comments: 'متميزة في عملها، تفاني واضح',
        },
      ],
      goals: [
        {
          goalId: 'GOAL002',
          description: 'تأهيل 50 مستفيد بنجاح',
          status: 'in-progress',
          progress: 85,
        },
      ],
    },
    training: [
      {
        programId: 'TRN001',
        programName: 'أساسيات التأهيل الطبي',
        completionDate: new Date('2021-06-30'),
        status: 'completed',
        score: 92,
        certificate: 'CERT002',
      },
      {
        programId: 'TRN003',
        programName: 'خدمة العملاء المتميزة',
        completionDate: new Date('2024-03-15'),
        status: 'completed',
        score: 90,
        certificate: 'CERT003',
      },
    ],
    attendance: {
      totalWorkingDays: 220,
      presentDays: 215,
      absentDays: 2,
      lateDays: 1,
      leaves: [
        {
          type: 'annual',
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-07-03'),
          days: 3,
          status: 'approved',
        },
      ],
    },
  },
  {
    employeeId: 'EMP003',
    personalInfo: {
      firstName: 'خالد',
      lastName: 'السعيد',
      nationalId: '3456789012',
      dateOfBirth: new Date('1988-09-10'),
      gender: 'male',
      nationality: 'Saudi',
      email: 'khaled.alsaeed@alawael.com',
      phone: '+966503456789',
      address: 'الرياض، حي العليا',
    },
    employment: {
      positionId: 'POS006',
      positionTitle: 'مدير موارد بشرية',
      departmentId: 'DEPT003',
      departmentName: 'الموارد البشرية',
      branchId: 'BR001',
      hireDate: new Date('2020-06-01'),
      employmentType: 'full-time',
      contractType: 'permanent',
      status: 'active',
      supervisor: 'EMP001',
    },
    salary: {
      baseSalary: 22000,
      allowances: [
        { type: 'housing', amount: 6000 },
        { type: 'transportation', amount: 1800 },
      ],
      deductions: [{ type: 'insurance', amount: 400 }],
      totalSalary: 29400,
    },
    performance: {
      currentRating: 4.3,
      reviews: [
        {
          reviewId: 'REV003',
          date: new Date('2024-12-31'),
          rating: 4.3,
          reviewer: 'EMP001',
          comments: 'جيد جداً، يحتاج لتطوير مهارات التخطيط',
        },
      ],
      goals: [
        {
          goalId: 'GOAL003',
          description: 'تطوير نظام تقييم الأداء',
          status: 'completed',
          progress: 100,
        },
      ],
    },
    training: [
      {
        programId: 'TRN002',
        programName: 'مهارات القيادة',
        completionDate: new Date('2023-11-30'),
        status: 'completed',
        score: 88,
        certificate: 'CERT004',
      },
    ],
    attendance: {
      totalWorkingDays: 245,
      presentDays: 238,
      absentDays: 3,
      lateDays: 2,
      leaves: [
        {
          type: 'sick',
          startDate: new Date('2024-10-15'),
          endDate: new Date('2024-10-17'),
          days: 3,
          status: 'approved',
        },
      ],
    },
  },
];

// ============================================
// Seed Function
// ============================================
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   📦 استيراد البيانات الأولية - Data Seeding         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Organization.deleteMany({});
    await Employee.deleteMany({});
    console.log('✅ Data cleared\n');

    // Insert organization
    console.log('🏢 Inserting organization data...');
    const organization = await Organization.create(organizationData);
    console.log('✅ Organization created:', organization.name);
    console.log('   - Departments:', organization.departments.length);
    console.log('   - Branches:', organization.branches.length);
    console.log('   - Training Programs:', organization.trainingPrograms.length);
    console.log('');

    // Insert employees
    console.log('👥 Inserting employee data...');
    for (const employeeData of employeesData) {
      const employee = await Employee.create(employeeData);
      console.log(`   ✅ ${employee.personalInfo.firstName} ${employee.personalInfo.lastName} (${employee.employment.positionTitle})`);
    }
    console.log('');

    // Summary
    const orgCount = await Organization.countDocuments();
    const empCount = await Employee.countDocuments();

    console.log('━'.repeat(60));
    console.log('📊 Summary:');
    console.log('   Organizations:', orgCount);
    console.log('   Employees:', empCount);
    console.log('━'.repeat(60));

    console.log('\n✅ Data seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// ============================================
// Run
// ============================================
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { seed };
