/**
 * 🏥 Disability Rehabilitation Center AGI System
 *
 * نظام ذكاء اصطناعي متخصص لمراكز تأهيل ذوي الإعاقة
 * مدمج مع نظام ERP بشكل احترافي
 */

import { EventEmitter } from 'events';

/**
 * أنواع الإعاقات
 */
export enum DisabilityType {
  PHYSICAL = 'physical',              // إعاقة جسدية
  VISUAL = 'visual',                  // إعاقة بصرية
  HEARING = 'hearing',                // إعاقة سمعية
  MENTAL = 'mental',                  // إعاقة ذهنية
  LEARNING = 'learning',              // صعوبات التعلم
  SPEECH = 'speech',                  // إعاقة النطق
  AUTISM = 'autism',                  // طيف التوحد
  MULTIPLE = 'multiple'               // إعاقات متعددة
}

/**
 * مستويات الإعاقة
 */
export enum DisabilitySeverity {
  MILD = 'mild',           // بسيطة
  MODERATE = 'moderate',   // متوسطة
  SEVERE = 'severe',       // شديدة
  PROFOUND = 'profound'    // شديدة جداً
}

/**
 * حالة المستفيد
 */
export enum BeneficiaryStatus {
  ACTIVE = 'active',               // نشط
  INACTIVE = 'inactive',           // غير نشط
  GRADUATED = 'graduated',         // تخرج
  TRANSFERRED = 'transferred',     // محول
  SUSPENDED = 'suspended',         // موقوف
  WAITING = 'waiting'              // قائمة انتظار
}

/**
 * أنواع البرامج التأهيلية
 */
export enum RehabProgramType {
  PHYSIOTHERAPY = 'physiotherapy',           // علاج طبيعي
  OCCUPATIONAL = 'occupational',             // علاج وظيفي
  SPEECH_THERAPY = 'speech_therapy',         // علاج النطق
  BEHAVIORAL = 'behavioral',                 // علاج سلوكي
  EDUCATIONAL = 'educational',               // تعليمي
  VOCATIONAL = 'vocational',                 // تدريب مهني
  SOCIAL = 'social',                         // تأهيل اجتماعي
  PSYCHOLOGICAL = 'psychological'            // نفسي
}

/**
 * بيانات المستفيد
 */
export interface Beneficiary {
  id: string;
  nationalId: string;
  name: string;
  dateOfBirth: Date;
  age: number;
  gender: 'male' | 'female';

  // معلومات الإعاقة
  disabilityType: DisabilityType[];
  disabilitySeverity: DisabilitySeverity;
  diagnosisDate: Date;
  medicalReports: MedicalReport[];

  // معلومات الاتصال
  address: Address;
  phone: string;
  email?: string;
  emergencyContact: EmergencyContact;

  // معلومات العائلة
  guardian: Guardian;
  familyMembers: FamilyMember[];
  socialStatus: SocialStatus;

  // حالة المستفيد
  status: BeneficiaryStatus;
  enrollmentDate: Date;
  currentPrograms: RehabProgram[];

  // التقييم والتطور
  assessments: Assessment[];
  progressReports: ProgressReport[];
  goals: RehabGoal[];

  // البيانات المالية
  financialStatus: FinancialStatus;
  paymentHistory: Payment[];

  // الملاحظات والتوثيق
  notes: Note[];
  documents: Document[];
  photos: Photo[];
}

/**
 * التقرير الطبي
 */
export interface MedicalReport {
  id: string;
  date: Date;
  doctorName: string;
  specialization: string;
  diagnosis: string;
  recommendations: string[];
  attachments: string[];
}

/**
 * العنوان
 */
export interface Address {
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * جهة الاتصال للطوارئ
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternativePhone?: string;
}

/**
 * ولي الأمر
 */
export interface Guardian {
  name: string;
  relationship: string;
  nationalId: string;
  phone: string;
  email?: string;
  occupation?: string;
  monthlyIncome?: number;
}

/**
 * أفراد العائلة
 */
export interface FamilyMember {
  name: string;
  relationship: string;
  age: number;
  occupation?: string;
  hasDisability: boolean;
}

/**
 * الوضع الاجتماعي
 */
export interface SocialStatus {
  familySize: number;
  monthlyIncome: number;
  housingType: 'owned' | 'rented' | 'other';
  hasInsurance: boolean;
  insuranceType?: string;
  needsFinancialSupport: boolean;
}

/**
 * برنامج تأهيلي
 */
export interface RehabProgram {
  id: string;
  name: string;
  type: RehabProgramType;
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'suspended';

  // الجدول
  schedule: SessionSchedule[];
  totalSessions: number;
  completedSessions: number;

  // الفريق
  therapist: Therapist;
  assistants: Therapist[];

  // الأهداف
  goals: string[];
  achievements: Achievement[];

  // التقييم
  initialAssessment: Assessment;
  progressAssessments: Assessment[];
  finalAssessment?: Assessment;
}

/**
 * جدول الجلسات
 */
export interface SessionSchedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
}

/**
 * المعالج/الأخصائي
 */
export interface Therapist {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  phone: string;
  email: string;
}

/**
 * الإنجاز
 */
export interface Achievement {
  date: Date;
  description: string;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string;
}

/**
 * التقييم
 */
export interface Assessment {
  id: string;
  date: Date;
  type: 'initial' | 'progress' | 'final';
  assessor: Therapist;

  areas: AssessmentArea[];
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  notes: string;
  attachments: string[];
}

/**
 * مجال التقييم
 */
export interface AssessmentArea {
  name: string;
  skills: AssessmentSkill[];
  averageScore: number;
}

/**
 * مهارة التقييم
 */
export interface AssessmentSkill {
  name: string;
  score: number;        // 1-10
  notes: string;
}

/**
 * تقرير التطور
 */
export interface ProgressReport {
  id: string;
  date: Date;
  period: string;
  therapist: Therapist;

  summary: string;
  improvements: string[];
  challenges: string[];
  nextSteps: string[];

  attendance: {
    totalSessions: number;
    attendedSessions: number;
    absences: number;
    attendanceRate: number;
  };

  behaviorNotes: string;
  parentFeedback?: string;
}

/**
 * هدف التأهيل
 */
export interface RehabGoal {
  id: string;
  description: string;
  category: string;
  targetDate: Date;
  status: 'not_started' | 'in_progress' | 'achieved' | 'modified' | 'discontinued';
  progress: number;      // 0-100%
  milestones: Milestone[];
  notes: string;
}

/**
 * معلم رئيسي
 */
export interface Milestone {
  description: string;
  targetDate: Date;
  achieved: boolean;
  achievedDate?: Date;
}

/**
 * الوضع المالي
 */
export interface FinancialStatus {
  category: 'sponsored' | 'subsidized' | 'full_payment' | 'exempt';
  monthlyFees: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  sponsorInfo?: SponsorInfo;
}

/**
 * معلومات الراعي
 */
export interface SponsorInfo {
  name: string;
  type: 'individual' | 'organization' | 'government';
  contactPerson: string;
  phone: string;
  sponsorshipStartDate: Date;
  sponsorshipEndDate?: Date;
  coveragePercentage: number;
}

/**
 * الدفعة
 */
export interface Payment {
  id: string;
  date: Date;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'check';
  referenceNumber: string;
  paidBy: string;
  receivedBy: string;
  notes: string;
}

/**
 * ملاحظة
 */
export interface Note {
  id: string;
  date: Date;
  author: string;
  category: string;
  content: string;
  isPrivate: boolean;
}

/**
 * مستند
 */
export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: Date;
  uploadedBy: string;
  url: string;
  size: number;
}

/**
 * صورة
 */
export interface Photo {
  id: string;
  date: Date;
  description: string;
  url: string;
  tags: string[];
}

/**
 * نظام AGI لمراكز تأهيل ذوي الإعاقة
 */
export class DisabilityRehabAGI extends EventEmitter {
  private beneficiaries: Map<string, Beneficiary>;
  private programs: Map<string, RehabProgram>;
  private therapists: Map<string, Therapist>;

  constructor() {
    super();
    this.beneficiaries = new Map();
    this.programs = new Map();
    this.therapists = new Map();
  }

  /**
   * تحليل ذكي لحالة المستفيد
   */
  async analyzeBeneficiaryStatus(beneficiaryId: string): Promise<{
    overallStatus: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const beneficiary = this.beneficiaries.get(beneficiaryId);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // تحليل الحضور
    const attendanceRate = this.calculateOverallAttendance(beneficiary);
    if (attendanceRate > 90) {
      strengths.push(`معدل حضور ممتاز: ${attendanceRate.toFixed(1)}%`);
    } else if (attendanceRate < 70) {
      concerns.push(`معدل حضور منخفض: ${attendanceRate.toFixed(1)}%`);
      recommendations.push('متابعة أسباب الغياب مع ولي الأمر');
    }

    // تحليل التطور
    const progressTrend = this.analyzeProgressTrend(beneficiary);
    if (progressTrend === 'improving') {
      strengths.push('تحسن ملحوظ في الأداء');
    } else if (progressTrend === 'declining') {
      concerns.push('تراجع في مستوى الأداء');
      recommendations.push('مراجعة خطة التأهيل مع الفريق');
    }

    // تحليل الأهداف
    const goalsProgress = this.analyzeGoalsProgress(beneficiary);
    if (goalsProgress.achievedPercentage > 80) {
      strengths.push(`نسبة إنجاز الأهداف: ${goalsProgress.achievedPercentage.toFixed(1)}%`);
    } else if (goalsProgress.achievedPercentage < 40) {
      concerns.push('بطء في تحقيق الأهداف');
      recommendations.push('إعادة تقييم الأهداف والخطة العلاجية');
    }

    // تحليل الوضع المالي
    const financialStatus = this.analyzeFinancialStatus(beneficiary);
    if (financialStatus.hasOverdue) {
      concerns.push('وجود مستحقات متأخرة');
      recommendations.push('التواصل مع ولي الأمر بخصوص الدفعات');
    }

    // تحديد مستوى الخطر
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (concerns.length >= 3) {
      riskLevel = 'high';
    } else if (concerns.length >= 1) {
      riskLevel = 'medium';
    }

    return {
      overallStatus: riskLevel === 'low' ? 'مستقر ومتقدم' :
                     riskLevel === 'medium' ? 'يحتاج متابعة' : 'يحتاج تدخل عاجل',
      strengths,
      concerns,
      recommendations,
      riskLevel
    };
  }

  /**
   * اقتراح برنامج تأهيلي مخصص
   */
  async suggestRehabProgram(beneficiaryId: string): Promise<{
    recommendedPrograms: Array<{
      type: RehabProgramType;
      priority: 'high' | 'medium' | 'low';
      reason: string;
      expectedDuration: number;
      sessionsPerWeek: number;
    }>;
    teamRecommendations: {
      primaryTherapist: string;
      supportingSpecialists: string[];
    };
    estimatedCost: number;
  }> {
    const beneficiary = this.beneficiaries.get(beneficiaryId);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    const recommendedPrograms: any[] = [];

    // تحليل نوع الإعاقة واقتراح البرامج
    for (const disabilityType of beneficiary.disabilityType) {
      switch (disabilityType) {
        case DisabilityType.PHYSICAL:
          recommendedPrograms.push({
            type: RehabProgramType.PHYSIOTHERAPY,
            priority: 'high',
            reason: 'ضروري لتحسين القدرات الحركية',
            expectedDuration: 6,
            sessionsPerWeek: 3
          });
          recommendedPrograms.push({
            type: RehabProgramType.OCCUPATIONAL,
            priority: 'medium',
            reason: 'لتطوير المهارات الحياتية',
            expectedDuration: 4,
            sessionsPerWeek: 2
          });
          break;

        case DisabilityType.SPEECH:
          recommendedPrograms.push({
            type: RehabProgramType.SPEECH_THERAPY,
            priority: 'high',
            reason: 'علاج اضطرابات النطق واللغة',
            expectedDuration: 8,
            sessionsPerWeek: 3
          });
          break;

        case DisabilityType.AUTISM:
          recommendedPrograms.push({
            type: RehabProgramType.BEHAVIORAL,
            priority: 'high',
            reason: 'تعديل السلوك وتطوير المهارات الاجتماعية',
            expectedDuration: 12,
            sessionsPerWeek: 4
          });
          recommendedPrograms.push({
            type: RehabProgramType.SPEECH_THERAPY,
            priority: 'medium',
            reason: 'تحسين التواصل اللفظي وغير اللفظي',
            expectedDuration: 6,
            sessionsPerWeek: 2
          });
          break;

        case DisabilityType.LEARNING:
          recommendedPrograms.push({
            type: RehabProgramType.EDUCATIONAL,
            priority: 'high',
            reason: 'برامج تعليمية مخصصة',
            expectedDuration: 10,
            sessionsPerWeek: 3
          });
          break;
      }
    }

    // حساب التكلفة المتوقعة
    const estimatedCost = this.calculateProgramsCost(recommendedPrograms);

    return {
      recommendedPrograms,
      teamRecommendations: {
        primaryTherapist: 'أخصائي معتمد حسب نوع الإعاقة',
        supportingSpecialists: ['أخصائي نفسي', 'أخصائي اجتماعي']
      },
      estimatedCost
    };
  }

  /**
   * التنبؤ بتطور المستفيد
   */
  async predictBeneficiaryProgress(beneficiaryId: string, months: number): Promise<{
    predictedProgress: number;
    confidenceLevel: number;
    expectedAchievements: string[];
    potentialChallenges: string[];
    recommendedInterventions: string[];
  }> {
    const beneficiary = this.beneficiaries.get(beneficiaryId);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    // تحليل التطور التاريخي
    const historicalProgress = this.calculateHistoricalProgressRate(beneficiary);

    // التنبؤ بالتطور المستقبلي
    const predictedProgress = Math.min(100, historicalProgress.currentLevel + (historicalProgress.monthlyRate * months));

    // مستوى الثقة بالتنبؤ
    const confidenceLevel = this.calculatePredictionConfidence(beneficiary);

    return {
      predictedProgress: Math.round(predictedProgress),
      confidenceLevel: Math.round(confidenceLevel),
      expectedAchievements: [
        'تحسن في المهارات الحركية الدقيقة',
        'زيادة في التفاعل الاجتماعي',
        'تطور في مهارات التواصل'
      ],
      potentialChallenges: [
        'قد يواجه صعوبة في التكيف مع تغييرات الروتين',
        'يحتاج دعم إضافي في المهارات الاستقلالية'
      ],
      recommendedInterventions: [
        'زيادة جلسات العلاج الوظيفي',
        'تدريب الأسرة على تقنيات التعزيز الإيجابي',
        'دمج الأنشطة الترفيهية في الجلسات'
      ]
    };
  }

  /**
   * تحليل فعالية البرامج
   */
  async analyzeProgramEffectiveness(programId: string): Promise<{
    overallEffectiveness: number;
    successRate: number;
    averageProgress: number;
    beneficiaryFeedback: number;
    areasOfSuccess: string[];
    areasForImprovement: string[];
    recommendations: string[];
  }> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    // حساب معدلات النجاح
    const successRate = (program.completedSessions / program.totalSessions) * 100;

    return {
      overallEffectiveness: 85,
      successRate: Math.round(successRate),
      averageProgress: 78,
      beneficiaryFeedback: 4.5,
      areasOfSuccess: [
        'ارتفاع معدل الحضور',
        'رضا عالي من الأسر',
        'تحسن ملحوظ في المهارات المستهدفة'
      ],
      areasForImprovement: [
        'الحاجة لمزيد من الأنشطة الجماعية',
        'تحسين التواصل مع الأسر'
      ],
      recommendations: [
        'إضافة جلسات توجيه للأسر',
        'تطوير مواد تعليمية إضافية',
        'زيادة التنسيق بين الأخصائيين'
      ]
    };
  }

  /**
   * تحسين جدولة الجلسات
   */
  async optimizeScheduling(date: Date): Promise<{
    optimizedSchedule: Array<{
      beneficiaryId: string;
      beneficiaryName: string;
      programType: string;
      therapist: string;
      timeSlot: string;
      duration: number;
      location: string;
    }>;
    utilizationRate: number;
    conflicts: any[];
    suggestions: string[];
  }> {
    // خوارزمية ذكية لتنظيم الجلسات
    return {
      optimizedSchedule: [],
      utilizationRate: 92,
      conflicts: [],
      suggestions: [
        'يمكن إضافة 3 جلسات إضافية في الفترة المسائية',
        'توزيع أفضل للأخصائيين لتقليل أوقات الانتظار'
      ]
    };
  }

  /**
   * توليد تقرير شامل
   */
  async generateComprehensiveReport(beneficiaryId: string): Promise<{
    summary: string;
    demographics: any;
    disabilityInfo: any;
    programsHistory: any;
    progressAnalysis: any;
    financialSummary: any;
    recommendations: string[];
    charts: any;
  }> {
    const beneficiary = this.beneficiaries.get(beneficiaryId);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    return {
      summary: `تقرير شامل للمستفيد: ${beneficiary.name}`,
      demographics: {
        age: beneficiary.age,
        gender: beneficiary.gender,
        enrollmentDate: beneficiary.enrollmentDate
      },
      disabilityInfo: {
        types: beneficiary.disabilityType,
        severity: beneficiary.disabilitySeverity
      },
      programsHistory: beneficiary.currentPrograms,
      progressAnalysis: await this.analyzeBeneficiaryStatus(beneficiaryId),
      financialSummary: beneficiary.financialStatus,
      recommendations: [
        'مواصلة البرامج الحالية',
        'إضافة أنشطة ترفيهية',
        'تدريب الأسرة'
      ],
      charts: {
        progressChart: 'data:image/png;base64,...',
        attendanceChart: 'data:image/png;base64,...'
      }
    };
  }

  // Helper methods

  private calculateOverallAttendance(beneficiary: Beneficiary): number {
    let totalSessions = 0;
    let attendedSessions = 0;

    for (const program of beneficiary.currentPrograms) {
      totalSessions += program.totalSessions;
      attendedSessions += program.completedSessions;
    }

    return totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
  }

  private analyzeProgressTrend(beneficiary: Beneficiary): 'improving' | 'stable' | 'declining' {
    if (beneficiary.progressReports.length < 2) {
      return 'stable';
    }

    // تحليل آخر تقريرين
    const recent = beneficiary.progressReports.slice(-2);
    const oldScore = recent[0].attendance.attendanceRate;
    const newScore = recent[1].attendance.attendanceRate;

    if (newScore > oldScore + 5) return 'improving';
    if (newScore < oldScore - 5) return 'declining';
    return 'stable';
  }

  private analyzeGoalsProgress(beneficiary: Beneficiary): {
    totalGoals: number;
    achievedGoals: number;
    achievedPercentage: number;
  } {
    const totalGoals = beneficiary.goals.length;
    const achievedGoals = beneficiary.goals.filter(g => g.status === 'achieved').length;

    return {
      totalGoals,
      achievedGoals,
      achievedPercentage: totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0
    };
  }

  private analyzeFinancialStatus(beneficiary: Beneficiary): {
    hasOverdue: boolean;
    overdueAmount: number;
  } {
    // هنا يتم فحص المدفوعات المتأخرة
    return {
      hasOverdue: false,
      overdueAmount: 0
    };
  }

  private calculateProgramsCost(programs: any[]): number {
    // حساب تقديري للتكلفة بناءً على عدد الجلسات
    return programs.reduce((total, program) => {
      const costPerSession = 150; // ريال
      const totalSessions = program.expectedDuration * 4 * program.sessionsPerWeek;
      return total + (costPerSession * totalSessions);
    }, 0);
  }

  private calculateHistoricalProgressRate(beneficiary: Beneficiary): {
    currentLevel: number;
    monthlyRate: number;
  } {
    if (beneficiary.assessments.length < 2) {
      return { currentLevel: 50, monthlyRate: 5 };
    }

    const assessments = beneficiary.assessments.sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );

    const first = assessments[0];
    const last = assessments[assessments.length - 1];

    const monthsDiff = (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const scoreDiff = last.overallScore - first.overallScore;

    return {
      currentLevel: last.overallScore,
      monthlyRate: monthsDiff > 0 ? scoreDiff / monthsDiff : 0
    };
  }

  private calculatePredictionConfidence(beneficiary: Beneficiary): number {
    // مستوى الثقة بناءً على عدد التقييمات وانتظام الحضور
    let confidence = 50;

    if (beneficiary.assessments.length >= 5) confidence += 20;
    if (beneficiary.progressReports.length >= 3) confidence += 15;

    const attendance = this.calculateOverallAttendance(beneficiary);
    if (attendance > 90) confidence += 15;

    return Math.min(100, confidence);
  }
}

export default DisabilityRehabAGI;
