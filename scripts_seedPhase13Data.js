// scripts/seedPhase13Data.js
// ملف بيانات البذر لـ Phase 13 - البرامج المتخصصة والجلسات المتقدمة

const mongoose = require('mongoose');
require('dotenv').config();

// استيراد النماذج
const SpecializedProgram = require('../backend/models/specializedProgram');
const AdvancedSession = require('../backend/models/advancedSession');
const SmartScheduler = require('../backend/models/smartScheduler');

// بيانات البرامج المتخصصة
const seedPrograms = [
  {
    name: 'برنامج العلاج الطبيعي للإعاقة الحركية',
    code: 'PROG-MOTOR-PT-001',
    description: 'برنامج متخصص للعلاج الطبيعي والتأهيل الحركي',
    disabilityType: 'MOTOR',
    supportedSeverityLevels: ['MILD', 'MODERATE', 'SEVERE'],
    sessionConfig: {
      standardDuration: 60,
      frequencyPerWeek: 2,
      maxConcurrentParticipants: 1
    },
    ageGroup: { min: 3, max: 18 },
    programGoals: [
      {
        title: 'تحسين القوة العضلية',
        category: 'physical',
        measurable: true,
        timeline: 12
      },
      {
        title: 'تحسين التوازن والتنسيق',
        category: 'physical',
        measurable: true,
        timeline: 16
      },
      {
        title: 'زيادة استقلالية الحركة',
        category: 'functional',
        measurable: true,
        timeline: 20
      }
    ],
    activities: [
      {
        name: 'تمارين التمدد والمرونة',
        difficulty: 'easy',
        equipment: ['حصيرة تمرين', 'كرات طبية'],
        estimatedDuration: 15
      },
      {
        name: 'تمارين تقوية العضلات',
        difficulty: 'medium',
        equipment: ['أوزان خفيفة', 'حبل مقاومة'],
        estimatedDuration: 25
      },
      {
        name: 'تمارين التوازن والتنسيق',
        difficulty: 'medium',
        equipment: ['عصا التوازن', 'منصة'],
        estimatedDuration: 20
      }
    ],
    requiredQualifications: ['PT', 'OT'],
    statistics: {
      totalBeneficiaries: 15,
      totalSessions: 120,
      successfulSessions: 110,
      averageOutcomeImprovement: 75,
      successRate: 91
    },
    pricing: {
      sessionCost: 100,
      packagePrice: { sessions: 10, price: 900 }
    },
    isActive: true
  },
  {
    name: 'برنامج تحسين النطق والتواصل',
    code: 'PROG-COMM-ST-001',
    description: 'برنامج متخصص لاضطرابات النطق والتواصل',
    disabilityType: 'COMMUNICATION',
    supportedSeverityLevels: ['MILD', 'MODERATE', 'SEVERE'],
    sessionConfig: {
      standardDuration: 45,
      frequencyPerWeek: 3,
      maxConcurrentParticipants: 1
    },
    ageGroup: { min: 2, max: 12 },
    programGoals: [
      {
        title: 'تحسين الوضوح النطقي',
        category: 'speech',
        measurable: true,
        timeline: 12
      },
      {
        title: 'زيادة المفردات اللغوية',
        category: 'language',
        measurable: true,
        timeline: 16
      },
      {
        title: 'تحسين التفاعل الاجتماعي',
        category: 'social',
        measurable: true,
        timeline: 20
      }
    ],
    activities: [
      {
        name: 'تمارين النطق الأساسية',
        difficulty: 'easy',
        equipment: ['مرآة', 'بطاقات أصوات'],
        estimatedDuration: 15
      },
      {
        name: 'التدريب اللغوي التفاعلي',
        difficulty: 'medium',
        equipment: ['ألعاب تفاعلية', 'صور'],
        estimatedDuration: 20
      },
      {
        name: 'تطبيق اجتماعي في المحادثة',
        difficulty: 'medium',
        equipment: ['سيناريوهات حوارية'],
        estimatedDuration: 10
      }
    ],
    requiredQualifications: ['SLP'],
    statistics: {
      totalBeneficiaries: 20,
      totalSessions: 180,
      successfulSessions: 165,
      averageOutcomeImprovement: 82,
      successRate: 92
    },
    pricing: {
      sessionCost: 80,
      packagePrice: { sessions: 10, price: 750 }
    },
    isActive: true
  },
  {
    name: 'برنامج تحسين المهارات البصرية',
    code: 'PROG-VISUAL-VI-001',
    description: 'برنامج متخصص لتنمية المهارات البصرية والتكيف',
    disabilityType: 'VISUAL',
    supportedSeverityLevels: ['MODERATE', 'SEVERE'],
    sessionConfig: {
      standardDuration: 60,
      frequencyPerWeek: 2,
      maxConcurrentParticipants: 1
    },
    ageGroup: { min: 5, max: 16 },
    programGoals: [
      {
        title: 'تحسين استخدام البصر المتبقي',
        category: 'vision',
        measurable: true,
        timeline: 12
      },
      {
        title: 'اكتساب مهارات التنقل الآمن',
        category: 'mobility',
        measurable: true,
        timeline: 16
      },
      {
        title: 'تطوير الاستقلالية في الحياة اليومية',
        category: 'functional',
        measurable: true,
        timeline: 20
      }
    ],
    activities: [
      {
        name: 'تمارين تنمية البصر',
        difficulty: 'medium',
        equipment: ['عينات ملونة', 'أضاءة مختلفة'],
        estimatedDuration: 20
      },
      {
        name: 'تدريب التنقل والاتجاه',
        difficulty: 'medium',
        equipment: ['عصا بيضاء', 'مسار معلم'],
        estimatedDuration: 25
      },
      {
        name: 'مهارات الحياة اليومية',
        difficulty: 'medium',
        equipment: ['أدوات منزلية', 'قاموس برايل'],
        estimatedDuration: 15
      }
    ],
    requiredQualifications: ['VI', 'OT', 'TVI'],
    statistics: {
      totalBeneficiaries: 8,
      totalSessions: 64,
      successfulSessions: 60,
      averageOutcomeImprovement: 78,
      successRate: 94
    },
    pricing: {
      sessionCost: 120,
      packagePrice: { sessions: 10, price: 1100 }
    },
    isActive: true
  },
  {
    name: 'برنامج تحسين المهارات السمعية واللغوية',
    code: 'PROG-HEARING-AU-001',
    description: 'برنامج متخصص لتطوير المهارات السمعية',
    disabilityType: 'HEARING',
    supportedSeverityLevels: ['MODERATE', 'SEVERE', 'PROFOUND'],
    sessionConfig: {
      standardDuration: 50,
      frequencyPerWeek: 3,
      maxConcurrentParticipants: 1
    },
    ageGroup: { min: 3, max: 18 },
    programGoals: [
      {
        title: 'تطوير المهارات السمعية',
        category: 'auditory',
        measurable: true,
        timeline: 12
      },
      {
        title: 'اكتساب المهارات اللغوية',
        category: 'language',
        measurable: true,
        timeline: 16
      },
      {
        title: 'تحسين التواصل والتفاعل الاجتماعي',
        category: 'social',
        measurable: true,
        timeline: 20
      }
    ],
    activities: [
      {
        name: 'تمارين الوعي الصوتي',
        difficulty: 'easy',
        equipment: ['آلات موسيقية', 'مسجل صوتي'],
        estimatedDuration: 15
      },
      {
        name: 'تطوير الكلام والنطق',
        difficulty: 'medium',
        equipment: ['مرآة', 'نماذج كلامية'],
        estimatedDuration: 20
      },
      {
        name: 'مهارات التواصل المتقدمة',
        difficulty: 'medium',
        equipment: ['لغة الإشارة', 'نصوص'],
        estimatedDuration: 15
      }
    ],
    requiredQualifications: ['AUD', 'SLP'],
    statistics: {
      totalBeneficiaries: 12,
      totalSessions: 108,
      successfulSessions: 102,
      averageOutcomeImprovement: 80,
      successRate: 94
    },
    pricing: {
      sessionCost: 90,
      packagePrice: { sessions: 10, price: 850 }
    },
    isActive: true
  }
];

// ملف مساعد لإنشاء جلسات اختبار
const seedSessions = [
  {
    title: 'جلسة علاج طبيعي - الأسبوع الأول',
    description: 'جلسة تدريب على تمارين التمدد والمرونة',
    scheduledDateTime: new Date('2026-01-25T10:00:00Z'),
    scheduledDuration: 60,
    sessionStatus: 'completed',
    beneficiaryAttendance: {
      status: 'present',
      arrivalTime: '2026-01-25T10:00:00Z',
      departureTime: '2026-01-25T11:00:00Z',
      remarks: 'حضر المستفيد بنشاط وتعاون جيد'
    },
    implementedActivities: [
      {
        name: 'تمارين التمدد',
        completed: true,
        competencyLevel: 'supervised',
        modifications: 'لا توجد تعديلات',
        successIndicators: ['تحسن في المرونة', 'عدم الشكوى من الألم']
      },
      {
        name: 'تمارين التقوية',
        completed: true,
        competencyLevel: 'assisted',
        modifications: 'تقليل الأوزان قليلاً',
        successIndicators: ['أداء صحيحة', 'تحمل جيد']
      }
    ],
    performanceAssessment: {
      overallEngagement: 'excellent',
      engagement: 'المستفيد أظهر اهتماماً عالياً جداً',
      motivation: 'high',
      concentration: 'excellent',
      cooperation: 'excellent',
      progressTowardGoals: 'good',
      estimatedGoalAttainment: 75
    },
    specialistNotes: {
      generalObservations: 'تطور ملحوظ في المرونة والقوة',
      strengthsObserved: ['تعاون جيد', 'التزام عالي', 'تحسن سريع'],
      challengesIdentified: ['بعض الألم الخفيف', 'إرهاق بعد النشاط الشديد'],
      recommendations: [
        'زيادة مدة الجلسات تدريجياً',
        'تكرار التمارين في البيت',
        'المراقبة المستمرة للألم'
      ],
      homeExercises: [
        {
          exerciseName: 'تمارين التمدد',
          frequency: 'يومياً',
          duration: 10,
          instructions: 'تكرار كل تمرين 5 مرات'
        },
        {
          exerciseName: 'المشي والحركة',
          frequency: 'يومياً',
          duration: 20,
          instructions: 'مشي بطيء متزامن'
        }
      ]
    },
    usedEquipment: [
      { name: 'حصيرة تمرين', quantity: 1 },
      { name: 'أوزان خفيفة', quantity: 2 },
      { name: 'حبل مقاومة', quantity: 1 }
    ],
    attachments: [
      {
        type: 'video',
        name: 'تمارين التمدد',
        description: 'فيديو يوضح التمارين المناسبة'
      },
      {
        type: 'document',
        name: 'ملاحظات الأخصائي',
        description: 'ملاحظات مفصلة عن أداء الجلسة'
      }
    ]
  },
  {
    title: 'جلسة نطق والتواصل - جلسة اختبار',
    description: 'جلسة تطوير مهارات النطق والتواصل',
    scheduledDateTime: new Date('2026-01-24T14:00:00Z'),
    scheduledDuration: 45,
    sessionStatus: 'scheduled',
    beneficiaryAttendance: {
      status: 'pending',
      remarks: ''
    },
    implementedActivities: [],
    performanceAssessment: {}
  }
];

// دالة الاتصال بقاعدة البيانات
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael');
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
    process.exit(1);
  }
};

// دالة إنشاء بيانات البذر
const seedData = async () => {
  try {
    await connectDB();

    // حذف البيانات القديمة
    console.log('🗑️ حذف البيانات القديمة...');
    await SpecializedProgram.deleteMany({});
    await AdvancedSession.deleteMany({});
    await SmartScheduler.deleteMany({});

    // إدراج البرامج
    console.log('📚 إدراج البرامج المتخصصة...');
    const createdPrograms = await SpecializedProgram.insertMany(seedPrograms);
    console.log(`✅ تم إنشاء ${createdPrograms.length} برنامج`);

    // إدراج جلسات اختبار
    console.log('📅 إدراج الجلسات...');
    const sessionsWithPrograms = seedSessions.map(session => ({
      ...session,
      programId: createdPrograms[0]._id,
      beneficiaryId: new mongoose.Types.ObjectId(),
      specialistId: new mongoose.Types.ObjectId()
    }));
    
    const createdSessions = await AdvancedSession.insertMany(sessionsWithPrograms);
    console.log(`✅ تم إنشاء ${createdSessions.length} جلسة`);

    // إنشاء جدولة ذكية واحدة كمثال
    console.log('⏰ إنشاء جدولة ذكية...');
    const smartScheduler = new SmartScheduler({
      beneficiaryId: new mongoose.Types.ObjectId(),
      programId: createdPrograms[0]._id,
      frequency: 'weekly',
      sessionsPerWeek: 2,
      planDuration: 90,
      status: 'draft',
      schedulingCriteria: {
        availableSpecialists: [
          {
            specialistId: new mongoose.Types.ObjectId(),
            availabilitySlots: [
              { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }
            ]
          }
        ],
        beneficiaryNeeds: {
          preferredTimeOfDay: 'morning',
          preferredDays: [0, 2, 4],
          specialRequirements: ['مواصلات توفر', 'معدات خاصة']
        }
      },
      analytics: {
        schedulingEfficiency: 92,
        resourceUtilization: 88,
        specialistUtilization: 85
      }
    });

    await smartScheduler.save();
    console.log('✅ تم إنشاء جدولة ذكية واحدة');

    console.log('\n🎉 تم إكمال عملية البذر بنجاح!');
    console.log(`
📊 الإحصائيات:
- البرامج المتخصصة: ${createdPrograms.length}
- الجلسات: ${createdSessions.length}
- الجداول الذكية: 1
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ أثناء البذر:', error);
    process.exit(1);
  }
};

// تشغيل البذر
seedData();
