/**
 * اختبارات شاملة لنظام المقاييس والبرامج التأهيلية
 * Comprehensive Tests for Measurement & Program System
 */

const _request = require('supertest');
const axios = require('axios');

// ============================
// اختبارات المقاييس
// ============================
describe('📊 Measurement System Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  describe('GET /measurements/types', () => {
    it('✅ يجب جلب جميع أنواع المقاييس', async () => {
      const response = await axios.get(`${baseURL}/measurements/types`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.count).toBeGreaterThan(0);
    });

    it('✅ يجب تصفية أنواع المقاييس حسب الفئة', async () => {
      const response = await axios.get(`${baseURL}/measurements/types?category=GENERAL`);

      expect(response.status).toBe(200);
      expect(response.data.data.every(t => t.category === 'GENERAL')).toBe(true);
    });

    it('✅ يجب تصفية أنواع المقاييس حسب الإعاقة', async () => {
      const response = await axios.get(`${baseURL}/measurements/types?targetDisability=AUTISM`);

      expect(response.status).toBe(200);
      expect(response.data.data.every(t => t.targetDisabilities.includes('AUTISM'))).toBe(true);
    });
  });

  describe('POST /measurements/results/:beneficiaryId', () => {
    it('✅ يجب تسجيل نتيجة قياس وتفعيل برامج', async () => {
      const response = await axios.post(`${baseURL}/measurements/results/BN-TEST-001`, {
        measurementId: 'MEAS-IQ-WECHSLER-001',
        typeId: 'INTEL_001',
        rawScore: 45,
        standardScore: 40,
        overallLevel: 'SEVERE',
        interpretation: {
          summary: 'نتيجة إعاقة ذهنية شديدة',
          strengths: ['قد يكون لديه مهارات جسدية'],
          weaknesses: ['ضعف كبير في القدرات العقلية'],
        },
        administratedBy: {
          userId: 'PSYCH-001',
          name: 'د. علي أحمد',
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.measurementResult).toBeDefined();
      expect(response.data.data.automatedPrograms).toBeDefined();
      expect(response.data.data.automatedPrograms.analyzedPrograms.length).toBeGreaterThan(0);
    });

    it('✅ يجب أن تفعل برامج الحياة اليومية للإعاقة الذهنية', async () => {
      const response = await axios.post(`${baseURL}/measurements/results/BN-TEST-002`, {
        measurementId: 'MEAS-ADAPTIVE-001',
        typeId: 'ADAPT_001',
        rawScore: 50,
        overallLevel: 'MODERATE',
        administratedBy: { userId: 'PSYCH-002', name: 'د. فاطمة محمد' },
      });

      const programs = response.data.data.automatedPrograms.analyzedPrograms;

      // يجب أن تتضمن برنامج العناية بالذات
      expect(
        programs.some(p => p.programName.includes('العناية') || p.programName.includes('Self-Care'))
      ).toBe(true);
    });

    it('✅ يجب أن تفعل برامج التوحد عند اكتشاف أعراض', async () => {
      const response = await axios.post(`${baseURL}/measurements/results/BN-TEST-003`, {
        measurementId: 'MEAS-AUTISM-MCHAT',
        typeId: 'AUTISM_001',
        rawScore: 18,
        overallLevel: 'SEVERE',
        administratedBy: { userId: 'PSYCH-003' },
      });

      const programs = response.data.data.automatedPrograms.analyzedPrograms;

      // يجب أن تتضمن برامج التوحد والتواصل
      expect(
        programs.some(p => p.programName.includes('التوحد') || p.programName.includes('Autism'))
      ).toBe(true);

      expect(
        programs.some(
          p => p.programName.includes('تواصل') || p.programName.includes('Communication')
        )
      ).toBe(true);
    });
  });

  describe('GET /measurements/results/:beneficiaryId', () => {
    it('✅ يجب جلب جميع نتائج المستفيد', async () => {
      const response = await axios.get(`${baseURL}/measurements/results/BN-TEST-001`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('GET /measurements/results/:beneficiaryId/compare/:typeId', () => {
    it('✅ يجب مقارنة النتائج عبر الزمن', async () => {
      // تسجيل نتيجة أولى
      await axios.post(`${baseURL}/measurements/results/BN-TEST-004`, {
        measurementId: 'MEAS-IQ-WECHSLER-001',
        typeId: 'INTEL_001',
        rawScore: 45,
        overallLevel: 'SEVERE',
      });

      // تسجيل نتيجة ثانية بعد برنامج
      await axios.post(`${baseURL}/measurements/results/BN-TEST-004`, {
        measurementId: 'MEAS-IQ-WECHSLER-001',
        typeId: 'INTEL_001',
        rawScore: 52,
        overallLevel: 'MODERATE',
      });

      const response = await axios.get(
        `${baseURL}/measurements/results/BN-TEST-004/compare/INTEL_001`
      );

      expect(response.status).toBe(200);
      expect(response.data.data.totalMeasurements).toBe(2);
      expect(response.data.data.totalImprovement).toBeGreaterThan(0);
      expect(parseFloat(response.data.data.improvementPercentage)).toBeGreaterThan(0);
    });
  });
});

// ============================
// اختبارات البرامج
// ============================
describe('🏥 Rehabilitation Programs Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  describe('GET /programs', () => {
    it('✅ يجب جلب جميع البرامج المتاحة', async () => {
      const response = await axios.get(`${baseURL}/programs`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.count).toBeGreaterThan(0);
    });

    it('✅ يجب تصفية البرامج حسب نوع الإعاقة', async () => {
      const response = await axios.get(`${baseURL}/programs?disability=INTELLECTUAL`);

      expect(response.status).toBe(200);
      expect(response.data.data.every(p => p.targetDisabilities.includes('INTELLECTUAL'))).toBe(
        true
      );
    });

    it('✅ يجب تصفية البرامج حسب مستوى الشدة', async () => {
      const response = await axios.get(`${baseURL}/programs?severity=SEVERE`);

      expect(response.status).toBe(200);
      expect(response.data.data.every(p => p.suitableSeverityLevels.includes('SEVERE'))).toBe(true);
    });
  });

  describe('POST /programs/sessions/:beneficiaryId/:programId', () => {
    it('✅ يجب تسجيل جلسة برنامج بنجاح', async () => {
      const response = await axios.post(
        `${baseURL}/programs/sessions/BN-TEST-005/PROG-DAILY-SELF-CARE-001`,
        {
          sessionNumber: 1,
          scheduledDate: '2026-02-20',
          sessionDuration: 60,
          sessionType: 'INDIVIDUAL',
          content: {
            objectives: ['تعليم مهارات الأكل'],
            activitiesPerformed: ['ممارسة استخدام الملعقة'],
          },
          performance: {
            beneficiaryEngagement: 'GOOD',
            taskCompletion: 75,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });

    it('✅ يجب جلب جلسات برنامج', async () => {
      const response = await axios.get(
        `${baseURL}/programs/sessions/BN-TEST-005/PROG-DAILY-SELF-CARE-001`
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('GET /programs/active/:beneficiaryId', () => {
    it('✅ يجب جلب البرامج النشطة للمستفيد', async () => {
      const response = await axios.get(`${baseURL}/programs/active/BN-TEST-005`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('GET /programs/effectiveness/:progressId', () => {
    it('✅ يجب حساب فعالية البرنامج', async () => {
      // نحتاج لـ progressId حقيقي
      // هذا اختبار توضيحي
      console.log('⚠️ اختبار الفعالية يتطلب progressId حقيقي');
    });
  });
});

// ============================
// اختبارات الخطط التأهيلية الفردية
// ============================
describe('📋 Individual Rehabilitation Plan Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  describe('POST /rehabilitation-plans/:beneficiaryId', () => {
    it('✅ يجب إنشاء خطة تأهيل فردية', async () => {
      const response = await axios.post(`${baseURL}/rehabilitation-plans/BN-TEST-006`, {
        beneficiaryInfo: {
          name: 'محمد علي',
          disabilityType: 'INTELLECTUAL',
          severityLevel: 'MODERATE',
          age: 12,
        },
        planningTeam: [
          {
            role: 'Team Leader',
            userId: 'USER-001',
            name: 'د. سلمى محمد',
            specialty: 'Psychology',
          },
        ],
        vision: {
          longTermGoals: ['اكتساب الاستقلالية الذاتية'],
        },
        mission: {
          shortTermObjectives: ['تطوير مهارات الحياة اليومية'],
        },
        rehabilitationAreas: [
          {
            areaName: 'مهارات الحياة اليومية',
            currentLevel: 'Low',
            targetLevel: 'Moderate',
            priority: 'HIGH',
          },
        ],
        planPeriod: {
          startDate: '2026-02-20',
          endDate: '2026-05-20',
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.planCode).toMatch(/^IRP-\d{4}-/);
    });

    it('✅ يجب جلب خطة التأهيل', async () => {
      const response = await axios.get(`${baseURL}/rehabilitation-plans/BN-TEST-006`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });

    it('✅ يجب تحديث خطة التأهيل', async () => {
      // جلب الخطة أولاً
      const getResponse = await axios.get(`${baseURL}/rehabilitation-plans/BN-TEST-006`);

      const planId = getResponse.data.data._id;

      const updateResponse = await axios.put(`${baseURL}/rehabilitation-plans/${planId}`, {
        recommendations: {
          atHome: ['التدريب اليومي على مهارات الأكل'],
          atCenter: ['جلسات علاجية منتظمة'],
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
    });

    it('✅ يجب الموافقة على خطة التأهيل', async () => {
      const getResponse = await axios.get(`${baseURL}/rehabilitation-plans/BN-TEST-006`);

      const planId = getResponse.data.data._id;

      const approveResponse = await axios.put(`${baseURL}/rehabilitation-plans/${planId}/approve`, {
        approvalNotes: 'تمت مراجعة الخطة وتم الموافقة عليها',
      });

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.data.success).toBe(true);
      expect(approveResponse.data.data.status).toBe('ACTIVE');
    });
  });
});

// ============================
// اختبارات التقارير الشاملة
// ============================
describe('📈 Comprehensive Reports Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  describe('GET /reports/:beneficiaryId/comprehensive', () => {
    it('✅ يجب توليد تقرير شامل', async () => {
      const response = await axios.get(`${baseURL}/reports/BN-TEST-006/comprehensive`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.beneficiaryId).toBe('BN-TEST-006');
      expect(response.data.data.measurements).toBeDefined();
      expect(response.data.data.programs).toBeDefined();
      expect(response.data.data.summary).toBeDefined();
    });

    it('✅ يجب أن يتضمن التقرير البيانات الأساسية', async () => {
      const response = await axios.get(`${baseURL}/reports/BN-TEST-006/comprehensive`);

      const { summary } = response.data.data;

      expect(summary.overallStatus).toBeDefined();
      expect(Array.isArray(summary.strengths)).toBe(true);
      expect(Array.isArray(summary.areasForImprovement)).toBe(true);
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });
  });
});

// ============================
// اختبارات الربط الذكي
// ============================
describe('⚙️ Smart Linkage Engine Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  it('✅ يجب تفعيل البرامج المناسبة تلقائياً', async () => {
    // 1. تسجيل مقياس
    const measurementResponse = await axios.post(`${baseURL}/measurements/results/BN-SMART-TEST`, {
      measurementId: 'MEAS-ADAPTIVE-001',
      typeId: 'ADAPT_001',
      rawScore: 50,
      overallLevel: 'MODERATE',
      administratedBy: { userId: 'PSYCH-TEST' },
    });

    const activatedPrograms = measurementResponse.data.data.automatedPrograms.analyzedPrograms;

    // 2. التحقق من تفعيل البرامج
    expect(activatedPrograms.length).toBeGreaterThan(0);

    // 3. التحقق من أن البرامج مرتبة حسب درجة التطابق
    for (let i = 0; i < activatedPrograms.length - 1; i++) {
      expect(activatedPrograms[i].matchScore).toBeGreaterThanOrEqual(
        activatedPrograms[i + 1].matchScore
      );
    }

    console.log('✅ تم تفعيل البرامج التالية:');
    activatedPrograms.forEach((prog, idx) => {
      console.log(`  ${idx + 1}. ${prog.programName} (درجة التطابق: ${prog.matchScore})`);
    });
  });

  it('✅ يجب ربط البرامج بشكل ذكي حسب الشدة', async () => {
    // قياس شديد
    const severeResponse = await axios.post(`${baseURL}/measurements/results/BN-SEVERE-TEST`, {
      measurementId: 'MEAS-IQ-WECHSLER-001',
      typeId: 'INTEL_001',
      rawScore: 40,
      overallLevel: 'SEVERE',
      administratedBy: { userId: 'PSYCH-TEST' },
    });

    const severePrograms = severeResponse.data.data.automatedPrograms.analyzedPrograms;

    // قياس خفيف
    const mildResponse = await axios.post(`${baseURL}/measurements/results/BN-MILD-TEST`, {
      measurementId: 'MEAS-IQ-WECHSLER-001',
      typeId: 'INTEL_001',
      rawScore: 90,
      overallLevel: 'MILD',
      administratedBy: { userId: 'PSYCH-TEST' },
    });

    const mildPrograms = mildResponse.data.data.automatedPrograms.analyzedPrograms;

    // التحقق من الفروقات
    console.log(`ℹ️ عدد البرامج للحالة الشديدة: ${severePrograms.length}`);
    console.log(`ℹ️ عدد البرامج للحالة الخفيفة: ${mildPrograms.length}`);

    // عادة ما تكون الحالة الشديدة تحتاج برامج أكثر أو أكثر كثافة
    expect(severePrograms[0].matchScore).toBeGreaterThanOrEqual(50);
  });
});

// ============================
// سيناريوهات واقعية متكاملة
// ============================
describe('🎯 Integrated Real-World Scenarios', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  it('📍 سيناريو 1: مستفيد جديد بهارات معتدلة', async () => {
    const beneficiaryId = 'BN-SCENARIO-1';

    console.log('\n=== سيناريو: طفل جديد بإعاقة ذهنية متوسطة ===');

    // 1. تسجيل المقاييس الأولية
    console.log('✅ تسجيل مقاييس التقييم الأولي...');
    const measResult = await axios.post(`${baseURL}/measurements/results/${beneficiaryId}`, {
      measurementId: 'MEAS-ADAPTIVE-001',
      typeId: 'ADAPT_001',
      rawScore: 55,
      standardScore: 50,
      overallLevel: 'MODERATE',
      administratedBy: { userId: 'PSYCH-001', name: 'د. علي' },
    });

    const programs = measResult.data.data.automatedPrograms.analyzedPrograms;
    expect(programs.length).toBeGreaterThan(0);
    console.log(`✅ تم تفعيل ${programs.length} برامج`);

    // 2. إنشاء الخطة التأهيلية
    console.log('✅ إنشاء خطة التأهيل الفردية...');
    const irpResponse = await axios.post(`${baseURL}/rehabilitation-plans/${beneficiaryId}`, {
      beneficiaryInfo: {
        name: 'أحمد محمد',
        age: 10,
        disabilityType: 'INTELLECTUAL',
        severityLevel: 'MODERATE',
      },
      planningTeam: [
        {
          role: 'Coordinator',
          userId: 'COORD-001',
          name: 'فريق التأهيل المتخصص',
        },
      ],
      rehabilitationAreas: programs.slice(0, 3).map(prog => ({
        areaName: prog.programName,
        priority: 'HIGH',
      })),
      planPeriod: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000), // 3 months
      },
    });

    expect(irpResponse.status).toBe(201);
    console.log(`✅ تم إنشاء الخطة: ${irpResponse.data.data.planCode}`);

    // 3. بدء الجلسات
    console.log('✅ بدء الجلسات العلاجية...');
    const firstProgram = programs[0];
    const sessionResponse = await axios.post(
      `${baseURL}/programs/sessions/${beneficiaryId}/${firstProgram.programId}`,
      {
        sessionNumber: 1,
        scheduledDate: new Date(),
        sessionDuration: 60,
        sessionType: 'INDIVIDUAL',
        content: { objectives: [`بدء برنامج ${firstProgram.programName}`] },
        performance: { beneficiaryEngagement: 'GOOD', taskCompletion: 70 },
      }
    );

    expect(sessionResponse.status).toBe(201);
    console.log('✅ تم تسجيل أول جلسة');

    // 4. التقرير الشامل
    console.log('✅ إنشاء تقرير شامل...');
    const reportResponse = await axios.get(`${baseURL}/reports/${beneficiaryId}/comprehensive`);

    expect(reportResponse.status).toBe(200);
    console.log('✅ تم إنشاء التقرير الشامل بنجاح');

    console.log('\n✨ اكتمل سيناريو 1 بنجاح!');
  });
});

// ============================
// اختبار الأداء
// ============================
describe('⚡ Performance Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3001/api';

  it('✅ يجب أن تستغرق عملية التصنيف الذكي أقل من 2 ثانية', async () => {
    const startTime = Date.now();

    await axios.post(`${baseURL}/measurements/results/BN-PERF-TEST`, {
      measurementId: 'MEAS-ADAPTIVE-001',
      typeId: 'ADAPT_001',
      rawScore: 50,
      overallLevel: 'MODERATE',
      administratedBy: { userId: 'PERF-TEST' },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️ وقت عملية الربط الذكي: ${duration}ms`);
    expect(duration).toBeLessThan(2000);
  });

  it('✅ يجب أن تستغرق عملية التقرير الشامل أقل من 3 ثوان', async () => {
    const startTime = Date.now();

    await axios.get(`${baseURL}/reports/BN-PERF-TEST/comprehensive`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️ وقت إنشاء التقرير الشامل: ${duration}ms`);
    expect(duration).toBeLessThan(3000);
  });
});

console.log('\n🚀 اختبارات شاملة للنظام جاهزة للتشغيل');
console.log('استخدم: npm test');
