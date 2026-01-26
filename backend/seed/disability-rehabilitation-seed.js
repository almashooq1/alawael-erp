/**
 * Seed Script for Disability Rehabilitation Programs
 * This script creates sample data for testing the rehabilitation system
 * Run: node seed/disability-rehabilitation-seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Connect to MongoDB
const mongoUri =
  process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/alaweal_db?authSource=admin';

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB for seeding');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Import models
const DisabilityRehabilitation = require('../models/disability-rehabilitation.model');

// Sample data generator
const generateSamplePrograms = () => {
  const disabilityTypes = [
    'physical',
    'visual',
    'hearing',
    'intellectual',
    'autism',
    'learning',
    'multiple',
    'speech',
    'behavioral',
    'developmental',
  ];

  const serviceTypes = [
    'physiotherapy',
    'occupational_therapy',
    'speech_therapy',
    'psychological_counseling',
    'educational_support',
    'vocational_training',
    'mobility_assistance',
    'daily_living_skills',
  ];

  const goalCategories = [
    'mobility',
    'communication',
    'self_care',
    'independence',
    'social_integration',
    'educational',
    'vocational',
    'emotional_wellbeing',
  ];

  const programs = [];
  const startDate = new Date(2024, 0, 1);

  // Generate 25 programs with varied statuses and disabilities
  for (let i = 0; i < 25; i++) {
    const programStartDate = new Date(startDate);
    programStartDate.setDate(programStartDate.getDate() + i * 10);

    const disabilityType = disabilityTypes[i % disabilityTypes.length];
    const status = ['active', 'pending', 'completed', 'on_hold'][i % 4];
    const beneficiaryAge = 15 + (i % 50);

    const program = {
      program_info: {
        name_ar: `برنامج تأهيل ${disabilityType} #${i + 1}`,
        name_en: `Rehabilitation Program ${disabilityType} #${i + 1}`,
        description: `برنامج شامل لتأهيل الأشخاص ذوي إعاقة ${disabilityType}`,
        start_date: programStartDate,
        end_date: new Date(programStartDate.getTime() + 180 * 24 * 60 * 60 * 1000), // 180 days
        status: status,
        severity: ['mild', 'moderate', 'severe'][i % 3],
        duration_target_months: 6,
        budget_allocated: 5000 + i * 1000,
        budget_spent: status === 'completed' ? 5000 + i * 1000 : 3000 + i * 500,
      },
      beneficiary: {
        id: `BENE${String(1001 + i).padStart(4, '0')}`,
        name_ar: `مستفيد ${i + 1}`,
        name_en: `Beneficiary ${i + 1}`,
        date_of_birth: new Date(2000 + Math.floor(i / 5), i % 12, (i % 28) + 1),
        gender: i % 2 === 0 ? 'male' : 'female',
        contact_number: `+966${50000000 + i * 10000}`,
        email: `beneficiary${i + 1}@alaweal.com`,
      },
      disability_info: {
        primary_disability: disabilityType,
        secondary_disabilities: i % 3 === 0 ? ['speech', 'behavioral'] : [],
        severity_level: ['mild', 'moderate', 'severe'][i % 3],
        diagnosis_date: new Date(2023, i % 12, (i % 28) + 1),
        clinical_assessment: `تقييم سريري شامل للحالة - التقرير ${i + 1}`,
        assessment_results: {
          functional_status: 60 + (i % 40),
          cognitive_level: 50 + (i % 50),
          social_adaptation: 55 + (i % 45),
        },
      },
      rehabilitation_goals: [
        {
          goal_id: `GOAL${String(i * 3 + 1).padStart(3, '0')}`,
          category: goalCategories[i % goalCategories.length],
          description_ar: `هدف تأهيلي ${i + 1}`,
          description_en: `Rehabilitation Goal ${i + 1}`,
          target_date: new Date(programStartDate.getTime() + 90 * 24 * 60 * 60 * 1000),
          priority: ['high', 'medium', 'low'][i % 3],
          measurable_criteria: 'معايير قابلة للقياس',
          status: status === 'completed' ? 'achieved' : i % 2 === 0 ? 'in_progress' : 'pending',
          progress_percentage: status === 'completed' ? 100 : 30 + (i % 70),
        },
        {
          goal_id: `GOAL${String(i * 3 + 2).padStart(3, '0')}`,
          category: goalCategories[(i + 1) % goalCategories.length],
          description_ar: `هدف تأهيلي ثاني ${i + 1}`,
          description_en: `Secondary Goal ${i + 1}`,
          target_date: new Date(programStartDate.getTime() + 120 * 24 * 60 * 60 * 1000),
          priority: ['high', 'medium'][i % 2],
          measurable_criteria: 'معايير قابلة للقياس',
          status: i % 3 === 0 ? 'achieved' : i % 2 === 0 ? 'in_progress' : 'pending',
          progress_percentage: i % 3 === 0 ? 100 : 20 + (i % 80),
        },
      ],
      rehabilitation_services: [
        {
          service_id: `SVC${String(i * 2 + 1).padStart(3, '0')}`,
          type: serviceTypes[i % serviceTypes.length],
          frequency: ['weekly', 'twice_weekly', 'monthly'][i % 3],
          duration_per_session_minutes: 60 + (i % 60),
          start_date: programStartDate,
          end_date: new Date(programStartDate.getTime() + 150 * 24 * 60 * 60 * 1000),
          provider_name: `متخصص ${i + 1}`,
          location: 'المركز الرئيسي',
          status: status === 'completed' ? 'completed' : 'active',
        },
        {
          service_id: `SVC${String(i * 2 + 2).padStart(3, '0')}`,
          type: serviceTypes[(i + 1) % serviceTypes.length],
          frequency: ['weekly', 'monthly'][i % 2],
          duration_per_session_minutes: 45 + (i % 75),
          start_date: new Date(programStartDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          end_date: new Date(programStartDate.getTime() + 160 * 24 * 60 * 60 * 1000),
          provider_name: `متخصص ثاني ${i + 1}`,
          location: 'فرع المنطقة',
          status: status === 'completed' ? 'completed' : 'active',
        },
      ],
      therapy_sessions:
        status === 'completed' || status === 'active'
          ? [
              {
                session_id: `SES${String(i * 3 + 1).padStart(4, '0')}`,
                service_id: `SVC${String(i * 2 + 1).padStart(3, '0')}`,
                session_date: new Date(programStartDate.getTime() + 30 * 24 * 60 * 60 * 1000),
                duration_minutes: 60,
                type: 'individual',
                attendance: 'present',
                notes: 'جلسة ناجحة - تقدم ملحوظ',
                therapist_notes: 'تقدم جيد في الجلسة',
                outcome: 'positive',
              },
              {
                session_id: `SES${String(i * 3 + 2).padStart(4, '0')}`,
                service_id: `SVC${String(i * 2 + 2).padStart(3, '0')}`,
                session_date: new Date(programStartDate.getTime() + 60 * 24 * 60 * 60 * 1000),
                duration_minutes: 45,
                type: 'group',
                attendance: 'present',
                notes: 'جلسة جماعية فعالة',
                therapist_notes: 'تفاعل جيد من المستفيد',
                outcome: 'positive',
              },
              {
                session_id: `SES${String(i * 3 + 3).padStart(4, '0')}`,
                service_id: `SVC${String(i * 2 + 1).padStart(3, '0')}`,
                session_date: new Date(programStartDate.getTime() + 90 * 24 * 60 * 60 * 1000),
                duration_minutes: 60,
                type: 'individual',
                attendance: status === 'completed' ? 'present' : i % 5 === 0 ? 'absent' : 'present',
                notes: 'تطور متواصل',
                therapist_notes: 'تقدم ملحوظ نحو الأهداف',
                outcome: 'positive',
              },
            ]
          : [],
      assessments: [
        {
          assessment_id: `ASS${String(i + 1).padStart(3, '0')}`,
          assessment_date: programStartDate,
          type: 'initial_assessment',
          assessor_name: `مقيم أولي ${i + 1}`,
          findings: 'تقييم بدائي شامل',
          recommendations: 'البدء ببرنامج تأهيلي منظم',
          overall_score: 50 + (i % 50),
        },
      ],
      progress_tracking: {
        overall_progress_percentage: status === 'completed' ? 100 : 30 + (i % 70),
        goal_completion_rate: status === 'completed' ? 100 : 25 + (i % 75),
        last_update: new Date(
          programStartDate.getTime() + Math.random() * 120 * 24 * 60 * 60 * 1000
        ),
        achievements: ['تحسن في القدرات الحركية', 'تطور في المهارات الاجتماعية'],
        challenges: i % 2 === 0 ? ['التزام محدود', 'بطء في التقدم'] : [],
      },
      family_involvement: {
        primary_contact_name: `الوالد/الوالدة ${i + 1}`,
        relationship: 'parent',
        contact_number: `+966${50100000 + i * 10000}`,
        participation_level: 'regular',
        support_type: 'financial_and_emotional',
        family_education_sessions: i % 2 === 0 ? 3 : 5,
      },
      assistive_devices: [
        {
          device_id: `DEV${String(i + 1).padStart(3, '0')}`,
          name: 'جهاز مساعد 1',
          type: 'mobility_device',
          specification: 'مواصفات تقنية',
          date_provided: programStartDate,
          status: 'active',
        },
      ],
      environmental_modifications:
        i % 3 === 0
          ? [
              {
                modification_id: `MOD${String(i + 1).padStart(3, '0')}`,
                description: 'تعديلات بيئية لسهولة الوصول',
                type: 'accessibility',
                completion_date: new Date(programStartDate.getTime() + 14 * 24 * 60 * 60 * 1000),
                status: 'completed',
              },
            ]
          : [],
      audit_trail: [
        {
          action: 'created',
          timestamp: programStartDate,
          user_id: `USER${String((i % 5) + 1).padStart(3, '0')}`,
          changes: 'Initial program creation',
        },
      ],
      created_by: `therapist${(i % 5) + 1}`,
      updated_by: `therapist${(i % 5) + 1}`,
    };

    programs.push(program);
  }

  return programs;
};

// Seed the database
const seedDatabase = async () => {
  try {
    console.log('\n🔄 شروع عملية إضافة بيانات التجربة...\n');

    // Clear existing data
    const deletedCount = await DisabilityRehabilitation.deleteMany({});
    console.log(`✅ تم حذف ${deletedCount.deletedCount} برنامج سابق`);

    // Generate and insert sample data
    const samplePrograms = generateSamplePrograms();
    const insertedPrograms = await DisabilityRehabilitation.insertMany(samplePrograms);

    console.log(`✅ تم إضافة ${insertedPrograms.length} برنامج تأهيل تجريبي بنجاح\n`);

    // Display statistics
    console.log('📊 إحصائيات البيانات المضافة:\n');

    const stats = await DisabilityRehabilitation.getStatsByDisability();
    console.log('📈 توزيع البرامج حسب نوع الإعاقة:');
    stats.forEach(stat => {
      console.log(`   • ${stat._id}: ${stat.count} برنامج`);
    });

    const statusStats = await DisabilityRehabilitation.aggregate([
      { $group: { _id: '$program_info.status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log('\n📊 توزيع البرامج حسب الحالة:');
    statusStats.forEach(stat => {
      console.log(`   • ${stat._id}: ${stat.count} برنامج`);
    });

    console.log('\n✅ اكتملت عملية الإضافة بنجاح!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ أثناء إضافة البيانات:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
