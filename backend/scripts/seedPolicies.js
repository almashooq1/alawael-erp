/* eslint-disable no-unused-vars */
/**
 * Seed Data for Policy Management System
 * إنشاء بيانات تجريبية لنظام إدارة السياسات
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import models
const Policy = require('../models/Policy');
const PolicyAcknowledgement = require('../models/PolicyAcknowledgement');

const samplePolicies = [
  {
    policyId: uuidv4(),
    policyName: 'Salary and Incentives Policy',
    policyNameAr: 'سياسة الرواتب والحوافز',
    description: 'Guidelines for salary structure, bonuses, and performance incentives',
    descriptionAr: 'إرشادات حول هيكل الرواتب والمكافآت والحوافز الأداء',
    policyType: 'SALARY_INCENTIVES',
    status: 'ACTIVE',
    effectiveDate: new Date(2024, 0, 1),
    dueDate: new Date(2026, 2, 31),
    applicableDepartments: ['HR', 'Finance', 'Operations'],
    applicableToAllDepartments: false,
    applicableEmployeeCategories: ['FULL_TIME', 'PART_TIME'],
    totalEmployeesApplicable: 150,
    acknowledgedCount: 45,
    pendingCount: 105,
    overDueCount: 5,
    createdBy: 'admin@company.com',
    createdByName: 'Admin User',
    versionNumber: 1,
    requiresSignature: true,
    requiresTraining: true,
    priority: 'HIGH',
    content: {
      ar: 'تحدد هذه السياسة آليات الرواتب والحوافز...',
      en: 'This policy defines salary and incentive mechanisms...',
    },
  },
  {
    policyId: uuidv4(),
    policyName: 'Leave and Vacation Policy',
    policyNameAr: 'سياسة الإجازات والعطل',
    description: 'Comprehensive guidelines for annual leave, sick leave, and special leave',
    descriptionAr: 'إرشادات شاملة للإجازة السنوية والإجازة المرضية والإجازات الخاصة',
    policyType: 'LEAVE_VACATION',
    status: 'ACTIVE',
    effectiveDate: new Date(2024, 0, 1),
    dueDate: new Date(2026, 2, 31),
    applicableToAllDepartments: true,
    applicableEmployeeCategories: ['FULL_TIME'],
    totalEmployeesApplicable: 200,
    acknowledgedCount: 180,
    pendingCount: 20,
    overDueCount: 2,
    createdBy: 'hr@company.com',
    createdByName: 'HR Manager',
    versionNumber: 2,
    requiresSignature: true,
    requiresTraining: false,
    priority: 'HIGH',
    content: {
      ar: 'سياسة الإجازات تحدد حقوق الموظفين...',
      en: 'Leave policy defines employee rights...',
    },
  },
  {
    policyId: uuidv4(),
    policyName: 'Code of Conduct',
    policyNameAr: 'قواعس السلوك',
    description: 'Professional conduct standards and ethical guidelines for all employees',
    descriptionAr: 'معايير السلوك المهني والإرشادات الأخلاقية لجميع الموظفين',
    policyType: 'CODE_OF_CONDUCT',
    status: 'PENDING_APPROVAL',
    effectiveDate: new Date(2026, 2, 1),
    dueDate: new Date(2026, 4, 31),
    applicableToAllDepartments: true,
    applicableEmployeeCategories: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
    totalEmployeesApplicable: 250,
    acknowledgedCount: 0,
    pendingCount: 250,
    overDueCount: 0,
    createdBy: 'compliance@company.com',
    createdByName: 'Compliance Officer',
    versionNumber: 1,
    requiresSignature: true,
    requiresTraining: true,
    priority: 'CRITICAL',
    approvals: [
      {
        approverRole: 'POLICY_MANAGER',
        approverName: 'Muhammad Al-Dosari',
        status: 'APPROVED',
        approvalDate: new Date(),
      },
      {
        approverRole: 'HR_DIRECTOR',
        approverName: 'Sarah Freeman',
        status: 'PENDING',
      },
    ],
    content: {
      ar: 'هذه السياسة توضح متطلبات السلوك...',
      en: 'This policy outlines conduct requirements...',
    },
  },
  {
    policyId: uuidv4(),
    policyName: 'Workplace Safety Policy',
    policyNameAr: 'سياسة سلامة مكان العمل',
    description: 'Safety regulations and emergency procedures for all facilities',
    descriptionAr: 'اللوائح الأمنية وإجراءات الطوارئ لجميع المرافق',
    policyType: 'WORKPLACE_SAFETY',
    status: 'ACTIVE',
    effectiveDate: new Date(2024, 0, 1),
    dueDate: new Date(2026, 5, 30),
    applicableToAllDepartments: true,
    applicableEmployeeCategories: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY'],
    totalEmployeesApplicable: 280,
    acknowledgedCount: 250,
    pendingCount: 30,
    overDueCount: 8,
    createdBy: 'safety@company.com',
    createdByName: 'Safety Manager',
    versionNumber: 3,
    requiresSignature: true,
    requiresTraining: true,
    priority: 'CRITICAL',
    content: {
      ar: 'ضمان سلامة جميع الموظفين في مكان العمل...',
      en: 'Ensuring safety of all employees at work...',
    },
  },
  {
    policyId: uuidv4(),
    policyName: 'Data Confidentiality Policy',
    policyNameAr: 'سياسة سرية البيانات',
    description: 'Information security and data protection guidelines',
    descriptionAr: 'إرشادات أمان المعلومات وحماية البيانات',
    policyType: 'CONFIDENTIALITY',
    status: 'ACTIVE',
    effectiveDate: new Date(2024, 0, 1),
    dueDate: new Date(2026, 3, 30),
    applicableToAllDepartments: true,
    applicableEmployeeCategories: ['FULL_TIME', 'PART_TIME'],
    totalEmployeesApplicable: 200,
    acknowledgedCount: 190,
    pendingCount: 10,
    overDueCount: 1,
    createdBy: 'security@company.com',
    createdByName: 'Security Officer',
    versionNumber: 1,
    requiresSignature: true,
    requiresTraining: true,
    priority: 'CRITICAL',
    content: {
      ar: 'حماية البيانات السرية للشركة...',
      en: 'Protection of company confidential data...',
    },
  },
];

/**
 * Seed the database
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/policy_management',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await Policy.deleteMany({});
    await PolicyAcknowledgement.deleteMany({});
    console.log('✓ Cleared existing data');

    // Insert sample policies
    const createdPolicies = await Policy.create(samplePolicies);
    console.log(`✓ Created ${createdPolicies.length} sample policies`);

    // Create sample acknowledgements
    const sampleAcknowledgements = [];
    for (const policy of createdPolicies) {
      for (let i = 0; i < Math.min(5, policy.acknowledgedCount); i++) {
        sampleAcknowledgements.push({
          policyId: policy._id,
          employeeId: `EMP-${String(i + 1).padStart(4, '0')}`,
          employeeName: `Employee ${i + 1}`,
          department: policy.applicableDepartments?.[0] || 'General',
          status: 'ACKNOWLEDGED',
          acknowledgedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          ipAddress: `192.168.1.${100 + i}`,
          trainingCompletedDate: policy.requiresTraining ? new Date() : null,
          trainingScore: policy.requiresTraining ? Math.floor(Math.random() * 40) + 60 : null,
        });
      }
    }

    if (sampleAcknowledgements.length > 0) {
      await PolicyAcknowledgement.create(sampleAcknowledgements);
      console.log(`✓ Created ${sampleAcknowledgements.length} sample acknowledgements`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Policies created: ${createdPolicies.length}`);
    console.log(`   - Acknowledgements created: ${sampleAcknowledgements.length}`);
    console.log('\n💾 You can now test the Policy Management System');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();
