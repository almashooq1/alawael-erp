import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DisabilityRehabAGI, DisabilityType, DisabilitySeverity, BeneficiaryStatus, RehabProgramType } from '../specialized/disability-rehab-agi';

describe('Disability Rehabilitation AGI System', () => {
  let rehabAGI: DisabilityRehabAGI;

  beforeEach(() => {
    rehabAGI = new DisabilityRehabAGI();
  });

  describe('Beneficiary Analysis', () => {
    it('should analyze beneficiary status with good attendance', async () => {
      const beneficiaryId = 'TEST-001';

      // إضافة مستفيد للاختبار
      const beneficiary = {
        id: beneficiaryId,
        name: 'أحمد محمد',
        dateOfBirth: new Date('2015-01-01'),
        gender: 'male' as const,
        nationalId: '1234567890',
        disabilityType: DisabilityType.PHYSICAL,
        disabilitySeverity: DisabilitySeverity.MODERATE,
        diagnosis: 'شلل دماغي',
        medicalReports: [],
        address: {
          street: 'شارع الملك فهد',
          city: 'الرياض',
          state: 'الرياض',
          country: 'السعودية',
          postalCode: '12345'
        },
        phone: '0501234567',
        emergencyContact: {
          name: 'محمد أحمد',
          relationship: 'والد',
          phone: '0501234568'
        },
        guardian: {
          name: 'محمد أحمد',
          relationship: 'والد',
          nationalId: '0987654321',
          phone: '0501234568',
          email: 'father@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'متوسط',
          housingType: 'ملك',
          familySize: 5
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2025-01-01'),
        currentPrograms: ['PROG-001'],
        assessments: [
          {
            id: 'ASSESS-001',
            beneficiaryId: beneficiaryId,
            date: new Date(),
            assessor: 'د. سارة محمد',
            assessorRole: 'أخصائي علاج طبيعي',
            areas: {
              motorSkills: 6,
              communication: 7,
              socialInteraction: 8,
              dailyLiving: 5,
              cognition: 7
            },
            overallScore: 6.6,
            strengths: ['تواصل جيد', 'تفاعل اجتماعي إيجابي'],
            weaknesses: ['صعوبة في المهارات الحركية الدقيقة'],
            recommendations: ['زيادة جلسات العلاج الطبيعي']
          }
        ],
        progressReports: [
          {
            id: 'PROG-REP-001',
            beneficiaryId: beneficiaryId,
            programId: 'PROG-001',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // قبل شهر
            period: 'شهري',
            progressPercentage: 20,
            goalsAchieved: 3,
            totalGoals: 10,
            attendanceRate: 95,
            therapistNotes: 'تقدم جيد',
            challenges: [],
            improvements: ['تحسن في التوازن'],
            nextSteps: ['الاستمرار في البرنامج']
          },
          {
            id: 'PROG-REP-002',
            beneficiaryId: beneficiaryId,
            programId: 'PROG-001',
            date: new Date(),
            period: 'شهري',
            progressPercentage: 25,
            goalsAchieved: 4,
            totalGoals: 10,
            attendanceRate: 95,
            therapistNotes: 'تقدم مستمر',
            challenges: [],
            improvements: ['تحسن في القوة العضلية'],
            nextSteps: ['زيادة صعوبة التمارين']
          }
        ],
        payments: []
      };

      // حفظ المستفيد (استخدام reflection للوصول للخريطة الخاصة)
      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      const result = await rehabAGI.analyzeBeneficiaryStatus(beneficiaryId);

      expect(result).toBeDefined();
      expect(result.overallStatus).toBe('good');
      expect(result.strengths).toContain('حضور منتظم بنسبة 95%');
      expect(result.riskLevel).toBe('low');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect concerns with low attendance', async () => {
      const beneficiaryId = 'TEST-002';

      const beneficiary = {
        id: beneficiaryId,
        name: 'فاطمة علي',
        dateOfBirth: new Date('2016-06-15'),
        gender: 'female' as const,
        nationalId: '2345678901',
        disabilityType: DisabilityType.HEARING,
        disabilitySeverity: DisabilitySeverity.MILD,
        diagnosis: 'ضعف سمع متوسط',
        medicalReports: [],
        address: {
          street: 'شارع العليا',
          city: 'الرياض',
          state: 'الرياض',
          country: 'السعودية',
          postalCode: '12346'
        },
        phone: '0502345678',
        emergencyContact: {
          name: 'علي حسن',
          relationship: 'والد',
          phone: '0502345679'
        },
        guardian: {
          name: 'علي حسن',
          relationship: 'والد',
          nationalId: '1987654321',
          phone: '0502345679',
          email: 'ali@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'متوسط',
          housingType: 'إيجار',
          familySize: 4
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2025-01-01'),
        currentPrograms: ['PROG-002'],
        assessments: [],
        progressReports: [
          {
            id: 'PROG-REP-003',
            beneficiaryId: beneficiaryId,
            programId: 'PROG-002',
            date: new Date(),
            period: 'شهري',
            progressPercentage: 15,
            goalsAchieved: 2,
            totalGoals: 10,
            attendanceRate: 65, // حضور منخفض
            therapistNotes: 'حضور غير منتظم',
            challenges: ['غياب متكرر'],
            improvements: [],
            nextSteps: ['التواصل مع الأسرة']
          }
        ],
        payments: []
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      const result = await rehabAGI.analyzeBeneficiaryStatus(beneficiaryId);

      expect(result.concerns).toContain('حضور منخفض: 65%');
      expect(result.riskLevel).toBe('medium');
    });

    it('should throw error for non-existent beneficiary', async () => {
      await expect(
        rehabAGI.analyzeBeneficiaryStatus('NON-EXISTENT')
      ).rejects.toThrow('المستفيد غير موجود');
    });
  });

  describe('Program Suggestions', () => {
    it('should suggest physiotherapy for physical disability', async () => {
      const beneficiaryId = 'TEST-003';

      const beneficiary = {
        id: beneficiaryId,
        name: 'خالد سعيد',
        dateOfBirth: new Date('2014-03-20'),
        gender: 'male' as const,
        nationalId: '3456789012',
        disabilityType: DisabilityType.PHYSICAL,
        disabilitySeverity: DisabilitySeverity.SEVERE,
        diagnosis: 'ضمور عضلي',
        medicalReports: [
          {
            id: 'MED-001',
            date: new Date(),
            doctor: 'د. أحمد خالد',
            diagnosis: 'ضمور عضلي شديد',
            recommendations: ['علاج طبيعي مكثف', 'علاج وظيفي'],
            medications: [],
            restrictions: []
          }
        ],
        address: {
          street: 'شارع الأمير محمد',
          city: 'جدة',
          state: 'مكة',
          country: 'السعودية',
          postalCode: '21511'
        },
        phone: '0503456789',
        emergencyContact: {
          name: 'سعيد محمد',
          relationship: 'والد',
          phone: '0503456780'
        },
        guardian: {
          name: 'سعيد محمد',
          relationship: 'والد',
          nationalId: '2876543210',
          phone: '0503456780',
          email: 'saeed@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'منخفض',
          housingType: 'إيجار',
          familySize: 6
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2025-01-15'),
        currentPrograms: [],
        assessments: [
          {
            id: 'ASSESS-002',
            beneficiaryId: beneficiaryId,
            date: new Date(),
            assessor: 'د. نورة عبدالله',
            assessorRole: 'أخصائي علاج طبيعي',
            areas: {
              motorSkills: 3,
              communication: 8,
              socialInteraction: 7,
              dailyLiving: 4,
              cognition: 8
            },
            overallScore: 6.0,
            strengths: ['قدرات إدراكية جيدة', 'تواصل ممتاز'],
            weaknesses: ['ضعف شديد في المهارات الحركية', 'صعوبة في الحركة'],
            recommendations: ['علاج طبيعي مكثف', 'استخدام أجهزة مساعدة']
          }
        ],
        progressReports: [],
        payments: []
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      const result = await rehabAGI.suggestRehabProgram(beneficiaryId);

      expect(result.recommendedPrograms.length).toBeGreaterThan(0);

      const physioProgram = result.recommendedPrograms.find(
        p => p.type === RehabProgramType.PHYSIOTHERAPY
      );

      expect(physioProgram).toBeDefined();
      expect(physioProgram?.priority).toBe('high');
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it('should suggest speech therapy for speech disability', async () => {
      const beneficiaryId = 'TEST-004';

      const beneficiary = {
        id: beneficiaryId,
        name: 'نورة حسن',
        dateOfBirth: new Date('2017-08-10'),
        gender: 'female' as const,
        nationalId: '4567890123',
        disabilityType: DisabilityType.SPEECH,
        disabilitySeverity: DisabilitySeverity.MODERATE,
        diagnosis: 'تأخر نطق',
        medicalReports: [],
        address: {
          street: 'شارع التحلية',
          city: 'الدمام',
          state: 'الشرقية',
          country: 'السعودية',
          postalCode: '31411'
        },
        phone: '0504567890',
        emergencyContact: {
          name: 'حسن عمر',
          relationship: 'والد',
          phone: '0504567891'
        },
        guardian: {
          name: 'حسن عمر',
          relationship: 'والد',
          nationalId: '3765432109',
          phone: '0504567891',
          email: 'hassan@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'متوسط',
          housingType: 'ملك',
          familySize: 4
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2025-01-20'),
        currentPrograms: [],
        assessments: [
          {
            id: 'ASSESS-003',
            beneficiaryId: beneficiaryId,
            date: new Date(),
            assessor: 'أ. ريم محمد',
            assessorRole: 'أخصائي نطق ولغة',
            areas: {
              motorSkills: 8,
              communication: 4,
              socialInteraction: 6,
              dailyLiving: 7,
              cognition: 7
            },
            overallScore: 6.4,
            strengths: ['مهارات حركية جيدة', 'قدرة على الفهم'],
            weaknesses: ['تأخر واضح في النطق', 'محدودية المفردات'],
            recommendations: ['علاج نطق مكثف', 'تدريبات يومية في المنزل']
          }
        ],
        progressReports: [],
        payments: []
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      const result = await rehabAGI.suggestRehabProgram(beneficiaryId);

      const speechProgram = result.recommendedPrograms.find(
        p => p.type === RehabProgramType.SPEECH_THERAPY
      );

      expect(speechProgram).toBeDefined();
      expect(speechProgram?.priority).toBe('high');
    });
  });

  describe('Progress Prediction', () => {
    it('should predict progress for 6 months', async () => {
      const beneficiaryId = 'TEST-005';

      const beneficiary = {
        id: beneficiaryId,
        name: 'عبدالله يوسف',
        dateOfBirth: new Date('2015-05-25'),
        gender: 'male' as const,
        nationalId: '5678901234',
        disabilityType: DisabilityType.LEARNING,
        disabilitySeverity: DisabilitySeverity.MILD,
        diagnosis: 'صعوبات تعلم',
        medicalReports: [],
        address: {
          street: 'شارع الملك عبدالعزيز',
          city: 'الرياض',
          state: 'الرياض',
          country: 'السعودية',
          postalCode: '11564'
        },
        phone: '0505678901',
        emergencyContact: {
          name: 'يوسف محمد',
          relationship: 'والد',
          phone: '0505678902'
        },
        guardian: {
          name: 'يوسف محمد',
          relationship: 'والد',
          nationalId: '4654321098',
          phone: '0505678902',
          email: 'youssef@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'جيد',
          housingType: 'ملك',
          familySize: 5
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2024-09-01'),
        currentPrograms: ['PROG-003'],
        assessments: [],
        progressReports: [
          {
            id: 'PROG-REP-004',
            beneficiaryId: beneficiaryId,
            programId: 'PROG-003',
            date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // قبل 3 أشهر
            period: 'ربع سنوي',
            progressPercentage: 15,
            goalsAchieved: 5,
            totalGoals: 15,
            attendanceRate: 92,
            therapistNotes: 'تحسن تدريجي',
            challenges: ['يحتاج مزيد من الوقت'],
            improvements: ['تحسن في القراءة'],
            nextSteps: ['تدريبات إضافية']
          },
          {
            id: 'PROG-REP-005',
            beneficiaryId: beneficiaryId,
            programId: 'PROG-003',
            date: new Date(),
            period: 'ربع سنوي',
            progressPercentage: 25,
            goalsAchieved: 8,
            totalGoals: 15,
            attendanceRate: 95,
            therapistNotes: 'تقدم ممتاز',
            challenges: [],
            improvements: ['تحسن كبير في الحساب', 'تركيز أفضل'],
            nextSteps: ['الانتقال لمستوى أعلى']
          }
        ],
        payments: []
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      const result = await rehabAGI.predictBeneficiaryProgress(beneficiaryId, 6);

      expect(result.predictedProgress).toBeDefined();
      expect(result.predictedProgress).toBeGreaterThan(0);
      expect(result.predictedProgress).toBeLessThanOrEqual(100);
      expect(result.confidenceLevel).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(1);
      expect(result.expectedAchievements.length).toBeGreaterThan(0);
      expect(result.recommendedInterventions.length).toBeGreaterThan(0);
    });

    it('should reject invalid months parameter', async () => {
      const beneficiaryId = 'TEST-006';

      const beneficiary = {
        id: beneficiaryId,
        name: 'سارة أحمد',
        dateOfBirth: new Date('2016-11-30'),
        gender: 'female' as const,
        nationalId: '6789012345',
        disabilityType: DisabilityType.AUTISM,
        disabilitySeverity: DisabilitySeverity.MODERATE,
        diagnosis: 'اضطراب طيف التوحد',
        medicalReports: [],
        address: {
          street: 'شارع الشفا',
          city: 'مكة',
          state: 'مكة',
          country: 'السعودية',
          postalCode: '24231'
        },
        phone: '0506789012',
        emergencyContact: {
          name: 'أحمد علي',
          relationship: 'والد',
          phone: '0506789013'
        },
        guardian: {
          name: 'أحمد علي',
          relationship: 'والد',
          nationalId: '5543210987',
          phone: '0506789013',
          email: 'ahmed@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'متوسط',
          housingType: 'ملك',
          familySize: 3
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2025-01-01'),
        currentPrograms: [],
        assessments: [],
        progressReports: [],
        payments: []
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      await expect(
        rehabAGI.predictBeneficiaryProgress(beneficiaryId, 0)
      ).rejects.toThrow('عدد الأشهر يجب أن يكون بين 1 و 12');

      await expect(
        rehabAGI.predictBeneficiaryProgress(beneficiaryId, 15)
      ).rejects.toThrow('عدد الأشهر يجب أن يكون بين 1 و 12');
    });

    it('should require progress reports for prediction', async () => {
      const beneficiaryId = 'TEST-007';

      const beneficiary = {
        id: beneficiaryId,
        name: 'محمد صالح',
        dateOfBirth: new Date('2018-02-14'),
        gender: 'male' as const,
        nationalId: '7890123456',
        disabilityType: DisabilityType.VISUAL,
        disabilitySeverity: DisabilitySeverity.SEVERE,
        diagnosis: 'كف بصر',
        medicalReports: [],
        address: {
          street: 'شارع الملك سعود',
          city: 'المدينة المنورة',
          state: 'المدينة',
          country: 'السعودية',
          postalCode: '42311'
        },
        phone: '0507890123',
        emergencyContact: {
          name: 'صالح حسن',
          relationship: 'والد',
          phone: '0507890124'
        },
        guardian: {
          name: 'صالح حسن',
          relationship: 'والد',
          nationalId: '6432109876',
          phone: '0507890124',
          email: 'saleh@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'منخفض',
          housingType: 'إيجار',
          familySize: 7
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2025-01-25'),
        currentPrograms: [],
        assessments: [],
        progressReports: [], // لا توجد تقارير
        payments: []
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      await expect(
        rehabAGI.predictBeneficiaryProgress(beneficiaryId, 6)
      ).rejects.toThrow('لا توجد تقارير تقدم كافية للتنبؤ');
    });
  });

  describe('Program Effectiveness Analysis', () => {
    it('should analyze program with participants', async () => {
      const programId = 'PROG-TEST-001';

      const program = {
        id: programId,
        name: 'برنامج العلاج الطبيعي المكثف',
        type: RehabProgramType.PHYSIOTHERAPY,
        description: 'برنامج متقدم لتحسين المهارات الحركية',
        objectives: ['تحسين القوة العضلية', 'تحسين التوازن'],
        duration: 12,
        sessionsPerWeek: 3,
        sessionDuration: 60,
        therapists: [],
        beneficiaries: ['BEN-001', 'BEN-002'],
        schedule: [],
        cost: 150,
        startDate: new Date('2025-01-01'),
        goals: [],
        achievements: [],
        status: 'active' as const
      };

      (rehabAGI as any).programs.set(programId, program);

      // إضافة مستفيدين
      const ben1 = {
        id: 'BEN-001',
        name: 'مستفيد 1',
        progressReports: [
          {
            id: 'REP-1',
            beneficiaryId: 'BEN-001',
            programId: programId,
            date: new Date(),
            period: 'شهري',
            progressPercentage: 30,
            goalsAchieved: 5,
            totalGoals: 10,
            attendanceRate: 90,
            therapistNotes: 'تقدم جيد',
            challenges: [],
            improvements: ['تحسن ملحوظ'],
            nextSteps: []
          }
        ]
      };

      const ben2 = {
        id: 'BEN-002',
        name: 'مستفيد 2',
        progressReports: [
          {
            id: 'REP-2',
            beneficiaryId: 'BEN-002',
            programId: programId,
            date: new Date(),
            period: 'شهري',
            progressPercentage: 25,
            goalsAchieved: 4,
            totalGoals: 10,
            attendanceRate: 85,
            therapistNotes: 'تقدم مقبول',
            challenges: ['يحتاج دعم إضافي'],
            improvements: ['تحسن طفيف'],
            nextSteps: []
          }
        ]
      };

      (rehabAGI as any).beneficiaries.set('BEN-001', ben1);
      (rehabAGI as any).beneficiaries.set('BEN-002', ben2);

      const result = await rehabAGI.analyzeProgramEffectiveness(programId);

      expect(result.overallEffectiveness).toBe('high');
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.averageProgress).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Schedule Optimization', () => {
    it('should generate optimized schedule', async () => {
      const date = new Date('2026-02-01');

      const result = await rehabAGI.optimizeScheduling(date);

      expect(result.optimizedSchedule).toBeDefined();
      expect(Array.isArray(result.optimizedSchedule)).toBe(true);
      expect(result.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(result.utilizationRate).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('Comprehensive Report Generation', () => {
    it('should generate report for beneficiary', async () => {
      const beneficiaryId = 'TEST-REPORT-001';

      const beneficiary = {
        id: beneficiaryId,
        name: 'تقرير شامل - مستفيد',
        dateOfBirth: new Date('2015-06-15'),
        gender: 'male' as const,
        nationalId: '8901234567',
        disabilityType: DisabilityType.MULTIPLE,
        disabilitySeverity: DisabilitySeverity.SEVERE,
        diagnosis: 'إعاقات متعددة',
        medicalReports: [],
        address: {
          street: 'شارع',
          city: 'الرياض',
          state: 'الرياض',
          country: 'السعودية',
          postalCode: '12345'
        },
        phone: '0508901234',
        emergencyContact: {
          name: 'ولي الأمر',
          relationship: 'والد',
          phone: '0508901235'
        },
        guardian: {
          name: 'ولي الأمر',
          relationship: 'والد',
          nationalId: '7321098765',
          phone: '0508901235',
          email: 'guardian@example.com'
        },
        familyInfo: [],
        socialStatus: {
          income: 'متوسط',
          housingType: 'ملك',
          familySize: 4
        },
        status: BeneficiaryStatus.ACTIVE,
        enrollmentDate: new Date('2024-06-01'),
        currentPrograms: ['PROG-001'],
        assessments: [
          {
            id: 'ASSESS-REPORT',
            beneficiaryId: beneficiaryId,
            date: new Date(),
            assessor: 'فريق التقييم',
            assessorRole: 'متعدد التخصصات',
            areas: {
              motorSkills: 5,
              communication: 6,
              socialInteraction: 7,
              dailyLiving: 5,
              cognition: 6
            },
            overallScore: 5.8,
            strengths: ['تعاون جيد'],
            weaknesses: ['يحتاج دعم شامل'],
            recommendations: ['برامج متعددة']
          }
        ],
        progressReports: [
          {
            id: 'PROG-REP-REPORT',
            beneficiaryId: beneficiaryId,
            programId: 'PROG-001',
            date: new Date(),
            period: 'شهري',
            progressPercentage: 20,
            goalsAchieved: 3,
            totalGoals: 12,
            attendanceRate: 88,
            therapistNotes: 'تقدم مستمر',
            challenges: [],
            improvements: ['تحسن عام'],
            nextSteps: ['الاستمرار']
          }
        ],
        payments: [
          {
            id: 'PAY-001',
            beneficiaryId: beneficiaryId,
            amount: 1500,
            date: new Date(),
            method: 'cash',
            reference: 'REF-001',
            status: 'completed',
            description: 'دفعة شهرية'
          }
        ]
      };

      (rehabAGI as any).beneficiaries.set(beneficiaryId, beneficiary);

      const result = await rehabAGI.generateComprehensiveReport(beneficiaryId);

      expect(result.summary).toBeDefined();
      expect(result.demographics).toBeDefined();
      expect(result.disabilityInfo).toBeDefined();
      expect(result.progressAnalysis).toBeDefined();
      expect(result.financialSummary).toBeDefined();
      expect(result.charts).toBeDefined();
    });
  });
});
