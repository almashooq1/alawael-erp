/**
 * clinical-decision-support.js
 * ═══════════════════════════════════════════════════════════════
 * نظام دعم القرار السريري — Clinical Decision Support System
 *
 * المهام:
 *   1. ربط التشخيص بالبروتوكول العلاجي (Evidence-Based)
 *   2. توصيات الأهداف بناءً على نتائج التقييم
 *   3. تحديد تكرار الجلسات والكثافة العلاجية
 *   4. تنبيهات المخاطر (تراجع، جمود، انسحاب)
 *   5. تقييم جاهزية التخريج
 *   6. بطارية التقييم المقترحة حسب العمر والتشخيص
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ══════════════════════════════════════════════════════════════
// 1. DIAGNOSIS → TREATMENT PROTOCOL MAPPING
//    ربط التشخيص بالبروتوكول العلاجي المبني على الأدلة
// ══════════════════════════════════════════════════════════════

const TREATMENT_PROTOCOLS = {
  // ─── اضطراب طيف التوحد ASD ────────────────────────────────
  autism: {
    name_ar: 'بروتوكول تأهيل اضطراب طيف التوحد',
    evidence_level: 'A', // مستوى الدليل: A=قوي جداً
    recommended_services: [
      {
        service: 'ABA',
        name_ar: 'تحليل السلوك التطبيقي',
        intensity: { hours_per_week: 25, min: 15, max: 40 },
        duration_months: { min: 12, recommended: 24, max: 36 },
        evidence: 'BACB Guidelines + NICE (2021)',
        age_specific: {
          '0-3': { hours: 15, focus: 'تدخل مبكر طبيعي (ESDM, JASPER)' },
          '3-6': { hours: 25, focus: 'DTT + NET + VB' },
          '6-12': { hours: 20, focus: 'مهارات اجتماعية + أكاديميات' },
          '12+': { hours: 15, focus: 'مهارات حياتية + مهنية' },
        },
      },
      {
        service: 'speech_therapy',
        name_ar: 'علاج النطق واللغة',
        intensity: { sessions_per_week: 3, min: 2, max: 5 },
        session_duration_minutes: 45,
        evidence: 'ASHA Practice Portal',
        approaches: ['PECS', 'AAC', 'Hanen', 'Social Communication'],
      },
      {
        service: 'occupational_therapy',
        name_ar: 'العلاج الوظيفي',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 45,
        evidence: 'AOTA Practice Guidelines',
        approaches: ['Sensory Integration (ASI)', 'Self-Care Training', 'Fine Motor'],
      },
      {
        service: 'social_skills',
        name_ar: 'مهارات اجتماعية',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 60,
        evidence: 'Bellini (2006), White et al. (2007)',
        approaches: ['Social Stories', 'Video Modeling', 'Peer-Mediated', 'Social Thinking'],
      },
    ],
    assessment_battery: [
      'CARS-2',
      'ADOS-2',
      'Vineland-3',
      'PEP-3',
      'SRS-2',
      'Sensory Profile 2',
      'VB-MAPP/ABLLS-R',
    ],
    review_schedule: { months: [3, 6, 9, 12] },
  },

  // ─── الإعاقة الذهنية Intellectual Disability ──────────────
  intellectual_disability: {
    name_ar: 'بروتوكول تأهيل الإعاقة الذهنية',
    evidence_level: 'A',
    recommended_services: [
      {
        service: 'special_education',
        name_ar: 'تربية خاصة',
        intensity: { hours_per_week: 15, min: 10, max: 25 },
        evidence: 'AAIDD Guidelines (2021)',
        approaches: ['Functional Curriculum', 'Task Analysis', 'Community-Based Instruction'],
      },
      {
        service: 'speech_therapy',
        name_ar: 'علاج النطق واللغة',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 30,
        approaches: ['Total Communication', 'AAC', 'Functional Communication'],
      },
      {
        service: 'occupational_therapy',
        name_ar: 'العلاج الوظيفي',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 30,
        approaches: ['ADL Training', 'Fine Motor', 'Handwriting'],
      },
      {
        service: 'life_skills',
        name_ar: 'مهارات حياتية',
        intensity: { sessions_per_week: 3, min: 2, max: 5 },
        session_duration_minutes: 45,
        approaches: ['Self-Care', 'Home Living', 'Community Skills', 'Safety'],
      },
    ],
    assessment_battery: [
      'Stanford-Binet 5',
      'Vineland-3',
      'ABAS-3',
      'Portage Guide',
      'ADL Assessment',
    ],
    review_schedule: { months: [3, 6, 12] },
  },

  // ─── الشلل الدماغي Cerebral Palsy ────────────────────────
  cerebral_palsy: {
    name_ar: 'بروتوكول تأهيل الشلل الدماغي',
    evidence_level: 'A',
    recommended_services: [
      {
        service: 'physical_therapy',
        name_ar: 'العلاج الطبيعي',
        intensity: { sessions_per_week: 4, min: 3, max: 5 },
        session_duration_minutes: 45,
        evidence: 'AACPDM Systematic Reviews',
        approaches: [
          'NDT/Bobath',
          'CIMT',
          'Functional Training',
          'Aquatic Therapy',
          'Hippotherapy',
        ],
        gmfcs_specific: {
          'I-II': { sessions: 3, focus: 'تحسين التوازن والمشي' },
          III: { sessions: 4, focus: 'مشي مع أجهزة مساعدة + تقوية' },
          'IV-V': { sessions: 4, focus: 'وضعيات + وقاية من التشوهات + ADL' },
        },
      },
      {
        service: 'occupational_therapy',
        name_ar: 'العلاج الوظيفي',
        intensity: { sessions_per_week: 3, min: 2, max: 4 },
        session_duration_minutes: 45,
        approaches: [
          'CIMT for Upper Limb',
          'Bimanual Training',
          'Splinting',
          'Seating & Positioning',
        ],
      },
      {
        service: 'speech_therapy',
        name_ar: 'علاج النطق واللغة',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 30,
        approaches: ['Oral Motor', 'Dysphagia Management', 'AAC if needed'],
      },
    ],
    assessment_battery: ['GMFM-88', 'GMFCS', 'MACS', 'CFCS', 'Barthel Index', 'WeeFIM', 'COPM'],
    review_schedule: { months: [3, 6, 12] },
  },

  // ─── متلازمة داون Down Syndrome ──────────────────────────
  down_syndrome: {
    name_ar: 'بروتوكول تأهيل متلازمة داون',
    evidence_level: 'B',
    recommended_services: [
      {
        service: 'early_intervention',
        name_ar: 'تدخل مبكر',
        intensity: { sessions_per_week: 3, min: 2, max: 5 },
        age_range: '0-3 سنوات',
        approaches: ['Motor Stimulation', 'Oro-Motor Training', 'Cognitive Stimulation'],
      },
      {
        service: 'speech_therapy',
        name_ar: 'علاج النطق واللغة',
        intensity: { sessions_per_week: 3, min: 2, max: 4 },
        session_duration_minutes: 30,
        approaches: ['Sign Language + Speech', 'Oral Motor', 'Reading Program (Macquarie)'],
      },
      {
        service: 'physical_therapy',
        name_ar: 'العلاج الطبيعي',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 30,
        approaches: ['Gross Motor Development', 'Balance', 'Postural Control'],
      },
      {
        service: 'occupational_therapy',
        name_ar: 'العلاج الوظيفي',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 30,
        approaches: ['Fine Motor', 'Self-Care', 'Sensory'],
      },
    ],
    assessment_battery: ['Bayley-4', 'Vineland-3', 'Portage Guide', 'GMFM-88', 'PLS-5'],
    review_schedule: { months: [3, 6, 12] },
  },

  // ─── اضطراب فرط الحركة وتشتت الانتباه ADHD ───────────────
  adhd: {
    name_ar: 'بروتوكول تأهيل اضطراب فرط الحركة وتشتت الانتباه',
    evidence_level: 'A',
    recommended_services: [
      {
        service: 'behavioral_therapy',
        name_ar: 'علاج سلوكي',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 50,
        approaches: ['Self-Monitoring', 'Token Economy', 'Behavioral Contracting'],
      },
      {
        service: 'cognitive_training',
        name_ar: 'تدريب معرفي',
        intensity: { sessions_per_week: 2, min: 1, max: 3 },
        session_duration_minutes: 30,
        approaches: [
          'Working Memory Training',
          'Executive Function Training',
          'Attention Training',
        ],
      },
      {
        service: 'parent_training',
        name_ar: 'تدريب الوالدين',
        intensity: { sessions_per_week: 1 },
        session_duration_minutes: 60,
        evidence: 'AAP Clinical Guidelines (2019)',
        approaches: ['Positive Parenting', 'Behavior Management', 'Daily Routines'],
      },
      {
        service: 'social_skills',
        name_ar: 'مهارات اجتماعية',
        intensity: { sessions_per_week: 1, min: 1, max: 2 },
        session_duration_minutes: 45,
        approaches: ['Self-Regulation', 'Impulse Control', 'Friendship Skills'],
      },
    ],
    assessment_battery: ['Conners-3', 'BRIEF-2', 'WISC-V', 'BASC-3', 'CPT-3'],
    review_schedule: { months: [3, 6] },
  },

  // ─── الإعاقة السمعية Hearing Impairment ────────────────────
  hearing_impairment: {
    name_ar: 'بروتوكول تأهيل الإعاقة السمعية',
    evidence_level: 'A',
    recommended_services: [
      {
        service: 'auditory_verbal_therapy',
        name_ar: 'علاج سمعي لفظي (AVT)',
        intensity: { sessions_per_week: 3, min: 2, max: 5 },
        session_duration_minutes: 45,
        evidence: 'AG Bell Academy AVT Guidelines',
        approaches: ['Auditory-Verbal', 'Auditory-Oral', 'Total Communication'],
      },
      {
        service: 'speech_therapy',
        name_ar: 'علاج النطق واللغة',
        intensity: { sessions_per_week: 3, min: 2, max: 4 },
        session_duration_minutes: 30,
        approaches: ['Articulation', 'Voice Therapy', 'Language Enrichment'],
      },
    ],
    assessment_battery: ['PLS-5', 'CELF-5', 'GFTA-3', 'Ling 6 Sound Test'],
    review_schedule: { months: [3, 6, 12] },
  },

  // ─── صعوبات التعلم Learning Disabilities ───────────────────
  learning_disability: {
    name_ar: 'بروتوكول تأهيل صعوبات التعلم',
    evidence_level: 'A',
    recommended_services: [
      {
        service: 'special_education',
        name_ar: 'تربية خاصة',
        intensity: { sessions_per_week: 5, min: 3, max: 5 },
        session_duration_minutes: 45,
        approaches: ['Orton-Gillingham', 'Multisensory Teaching', 'Direct Instruction'],
      },
      {
        service: 'occupational_therapy',
        name_ar: 'العلاج الوظيفي (كتابة وتنسيق)',
        intensity: { sessions_per_week: 1, min: 1, max: 2 },
        session_duration_minutes: 30,
        approaches: ['Handwriting Without Tears', 'Visual-Motor Integration'],
      },
    ],
    assessment_battery: ['WISC-V', 'Woodcock-Johnson IV', 'BRIEF-2', 'BOT-2', 'Bender-Gestalt'],
    review_schedule: { months: [3, 6] },
  },
};

// ══════════════════════════════════════════════════════════════
// 2. RISK DETECTION ENGINE
//    محرك كشف المخاطر والتنبيهات
// ══════════════════════════════════════════════════════════════

const RISK_RULES = [
  {
    id: 'REGRESSION_DETECTED',
    name_ar: 'تراجع مُكتشف في الأداء',
    severity: 'high',
    color: '#F44336',
    check: (current, previous) => {
      if (!previous) return false;
      const currentComposite =
        current.total_score || current.standard_scores?.adaptive_behavior_composite || 0;
      const prevComposite =
        previous.total_score || previous.standard_scores?.adaptive_behavior_composite || 0;
      return prevComposite > 0 && currentComposite < prevComposite * 0.85; // 15%+ decline
    },
    action_ar: 'مراجعة الخطة العلاجية فوراً — تحقق من أسباب طبية/بيئية/دوائية محتملة',
  },
  {
    id: 'PLATEAU_3_MONTHS',
    name_ar: 'ثبات في الأداء لمدة 3 أشهر',
    severity: 'medium',
    color: '#FF9800',
    check: (current, assessmentHistory) => {
      if (!assessmentHistory || assessmentHistory.length < 3) return false;
      const last3 = assessmentHistory.slice(-3);
      const scores = last3.map(
        a => a.total_score || a.standard_scores?.adaptive_behavior_composite || 0
      );
      const range = Math.max(...scores) - Math.min(...scores);
      return range < 3; // Less than 3-point change over 3 assessments
    },
    action_ar: 'مراجعة الأهداف والتكتيكات العلاجية — قد يحتاج لتعديل المنهج أو زيادة الكثافة',
  },
  {
    id: 'MISSED_SESSIONS',
    name_ar: 'غياب متكرر عن الجلسات',
    severity: 'medium',
    color: '#FF9800',
    check: attendanceData => {
      if (!attendanceData) return false;
      const { attended, total } = attendanceData;
      return total > 0 && attended / total < 0.75; // Less than 75% attendance
    },
    action_ar: 'تواصل مع الأسرة لمعرفة الأسباب — قد يحتاج لدعم نقل أو تعديل مواعيد',
  },
  {
    id: 'BEHAVIOR_ESCALATION',
    name_ar: 'تصاعد في السلوكيات المشكلة',
    severity: 'high',
    color: '#F44336',
    check: behaviorData => {
      if (!behaviorData || behaviorData.length < 2) return false;
      const recent = behaviorData.slice(-7);
      const older = behaviorData.slice(-14, -7);
      const recentAvg = recent.reduce((s, d) => s + d.frequency, 0) / recent.length;
      const olderAvg = older.reduce((s, d) => s + d.frequency, 0) / (older.length || 1);
      return recentAvg > olderAvg * 1.5; // 50%+ increase
    },
    action_ar: 'مراجعة عاجلة لخطة التدخل السلوكي — تحقق من تغييرات بيئية أو دوائية',
  },
  {
    id: 'DROPOUT_RISK',
    name_ar: 'خطر انسحاب من البرنامج',
    severity: 'high',
    color: '#F44336',
    check: beneficiaryData => {
      if (!beneficiaryData) return false;
      const { missedLastWeek, parentSatisfaction, progressPercentage } = beneficiaryData;
      return (
        missedLastWeek >= 3 ||
        parentSatisfaction <= 2 ||
        (progressPercentage < 10 && beneficiaryData.monthsEnrolled > 6)
      );
    },
    action_ar: 'اجتماع عاجل مع الأسرة — مراجعة الأهداف وتوقعات البرنامج ورضا الأسرة',
  },
  {
    id: 'MEDICATION_REVIEW',
    name_ar: 'مراجعة دوائية مطلوبة',
    severity: 'low',
    color: '#2196F3',
    check: medicationData => {
      if (!medicationData) return false;
      const lastReview = new Date(medicationData.lastReviewDate);
      const monthsSinceReview = (Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsSinceReview >= 3;
    },
    action_ar: 'تحويل لطبيب الأعصاب/النفسية لمراجعة الأدوية',
  },
];

// ══════════════════════════════════════════════════════════════
// 3. DISCHARGE READINESS SCORING
//    تقييم جاهزية التخريج
// ══════════════════════════════════════════════════════════════

const DISCHARGE_CRITERIA = {
  goals_met_percentage: { threshold: 80, weight: 0.3 },
  functional_independence: { threshold: 70, weight: 0.25 },
  family_training_completion: { threshold: 80, weight: 0.15 },
  behavior_stability: { threshold: 75, weight: 0.1 },
  community_integration_readiness: { threshold: 70, weight: 0.1 },
  transition_plan_completed: { threshold: 100, weight: 0.1 },
};

// ══════════════════════════════════════════════════════════════
// 4. ASSESSMENT BATTERY RECOMMENDER
//    نظام اقتراح بطارية التقييم المناسبة
// ══════════════════════════════════════════════════════════════

const ASSESSMENT_BY_AGE_DIAGNOSIS = {
  // Age bands → Diagnosis → Recommended assessments
  '0-2': {
    default: ['Bayley-4', 'Portage Guide', 'ASQ-3', 'M-CHAT-R/F'],
    autism: ['M-CHAT-R/F', 'Bayley-4', 'Portage Guide', 'CSBS-DP'],
    hearing: ['Bayley-4', 'IT-MAIS', 'LittlEARS'],
    motor: ['Bayley-4', 'AIMS (Alberta)', 'Portage Guide'],
  },
  '2-6': {
    default: ['Vineland-3', 'PEP-3', 'Portage Guide', 'Sensory Profile 2'],
    autism: ['CARS-2', 'ADOS-2', 'Vineland-3', 'PEP-3', 'VB-MAPP', 'SRS-2', 'Sensory Profile 2'],
    intellectual: ['Stanford-Binet 5', 'Vineland-3', 'ABAS-3', 'Portage Guide'],
    cp: ['GMFM-88', 'GMFCS', 'WeeFIM', 'Vineland-3', 'BOT-2'],
    down_syndrome: ['Bayley-4', 'Vineland-3', 'Portage Guide', 'PLS-5'],
    adhd: ['Conners-3', 'BRIEF-2', 'BASC-3'],
    speech: ['PLS-5', 'CELF-5', 'GFTA-3'],
  },
  '6-12': {
    default: ['WISC-V', 'Vineland-3', 'BRIEF-2', 'Sensory Profile 2'],
    autism: ['CARS-2', 'Vineland-3', 'SRS-2', 'BRIEF-2', 'ABLLS-R/AFLS', 'Sensory Profile 2'],
    intellectual: ['WISC-V', 'Vineland-3', 'ABAS-3', 'ADL Assessment'],
    adhd: ['Conners-3', 'BRIEF-2', 'WISC-V', 'CPT-3', 'BASC-3'],
    learning: ['WISC-V', 'Woodcock-Johnson IV', 'BOT-2', 'BRIEF-2'],
  },
  '12+': {
    default: ['WISC-V', 'Vineland-3', 'ABAS-3', 'AFLS', 'Transition Readiness'],
    autism: [
      'Vineland-3',
      'SRS-2',
      'AFLS',
      'Quality of Life',
      'Transition Readiness',
      'Vocational Assessment',
    ],
    intellectual: [
      'WISC-V',
      'Vineland-3',
      'ABAS-3',
      'AFLS',
      'Transition Readiness',
      'Vocational Assessment',
    ],
    adhd: ['Conners-3', 'BRIEF-2', 'BASC-3', 'Quality of Life'],
  },
};

// ══════════════════════════════════════════════════════════════
// MAIN CDS ENGINE CLASS
// ══════════════════════════════════════════════════════════════

class ClinicalDecisionSupport {
  /**
   * احصل على البروتوكول العلاجي بناءً على التشخيص
   * @param {string} diagnosis - رمز التشخيص
   * @param {number} ageMonths - عمر المستفيد بالأشهر
   * @param {string} severityLevel - مستوى الشدة
   * @returns {object} البروتوكول العلاجي المقترح
   */
  static getProtocol(diagnosis, ageMonths, severityLevel = 'moderate') {
    const protocol = TREATMENT_PROTOCOLS[diagnosis];
    if (!protocol) {
      return {
        found: false,
        message_ar:
          'لا يوجد بروتوكول محدد لهذا التشخيص — يُرجى استخدام التقييم الفردي لتحديد الخدمات',
        suggested_services: ['تقييم شامل', 'خطة تأهيلية فردية (IRP)'],
      };
    }

    // Customize intensity by age
    const ageBand = this._getAgeBand(ageMonths);
    const customizedServices = protocol.recommended_services.map(service => {
      const customized = { ...service };
      if (service.age_specific) {
        const ageConfig = service.age_specific[ageBand];
        if (ageConfig) {
          if (ageConfig.hours)
            customized.intensity = { ...customized.intensity, hours_per_week: ageConfig.hours };
          customized.age_focus = ageConfig.focus;
        }
      }
      if (service.gmfcs_specific && severityLevel) {
        const gmfcsConfig = service.gmfcs_specific[severityLevel];
        if (gmfcsConfig) {
          customized.intensity = {
            ...customized.intensity,
            sessions_per_week: gmfcsConfig.sessions,
          };
          customized.age_focus = gmfcsConfig.focus;
        }
      }

      // Adjust intensity by severity
      if (severityLevel === 'severe' || severityLevel === 'profound') {
        if (customized.intensity.sessions_per_week) {
          customized.intensity.sessions_per_week = Math.min(
            customized.intensity.sessions_per_week + 1,
            customized.intensity.max || 5
          );
        }
        if (customized.intensity.hours_per_week) {
          customized.intensity.hours_per_week = Math.min(
            customized.intensity.hours_per_week * 1.3,
            customized.intensity.max || 40
          );
        }
      }

      return customized;
    });

    return {
      found: true,
      ...protocol,
      recommended_services: customizedServices,
      assessment_battery: this.getRecommendedAssessments(ageMonths, diagnosis),
      estimated_weekly_hours: this._calculateWeeklyHours(customizedServices),
      review_dates: this._generateReviewDates(protocol.review_schedule),
    };
  }

  /**
   * الحصول على بطارية التقييم المناسبة
   */
  static getRecommendedAssessments(ageMonths, diagnosis = 'default') {
    let ageBand;
    if (ageMonths < 24) ageBand = '0-2';
    else if (ageMonths < 72) ageBand = '2-6';
    else if (ageMonths < 144) ageBand = '6-12';
    else ageBand = '12+';

    const ageAssessments = ASSESSMENT_BY_AGE_DIAGNOSIS[ageBand] || {};
    const diagAssessments = ageAssessments[diagnosis] || ageAssessments.default || [];

    // Always add Family Needs Survey and Quality of Life for comprehensive
    const extras = ['Family Needs Survey', 'Caregiver Burden Scale'];
    if (ageMonths >= 144) extras.push('Transition Readiness', 'Quality of Life');

    return [...new Set([...diagAssessments, ...extras])];
  }

  /**
   * توليد توصيات الأهداف بناءً على نتائج التقييم
   */
  static generateGoalRecommendations(assessmentResults) {
    const recommendations = [];

    // Vineland-3 based goals
    if (assessmentResults.vineland3) {
      const v = assessmentResults.vineland3;
      for (const [domain, score] of Object.entries(v.standard_scores || {})) {
        if (domain === 'adaptive_behavior_composite') continue;
        if (score <= 70) {
          recommendations.push({
            domain,
            priority: 'critical',
            goal_type: 'rehabilitative',
            timeframe: '3 أشهر',
            recommendation_ar: `تحسين ${this._domainNameAr(domain)} — أداء منخفض بشكل ملحوظ (${score})`,
            measurement: `Vineland-3 ${domain} standard score > ${Math.min(score + 10, 85)}`,
          });
        } else if (score <= 85) {
          recommendations.push({
            domain,
            priority: 'high',
            goal_type: 'developmental',
            timeframe: '6 أشهر',
            recommendation_ar: `تطوير مهارات ${this._domainNameAr(domain)} — أداء منخفض نسبياً (${score})`,
            measurement: `Vineland-3 ${domain} standard score > ${Math.min(score + 8, 100)}`,
          });
        }
      }
    }

    // CARS-2 based goals
    if (assessmentResults.cars2) {
      const c = assessmentResults.cars2;
      if (c.classification === 'severe' || c.classification === 'mild_moderate') {
        const highItems = c.pattern_analysis?.highest_concern_items || [];
        for (const item of highItems) {
          recommendations.push({
            domain: 'autism_specific',
            priority: c.classification === 'severe' ? 'critical' : 'high',
            goal_type: 'intervention',
            timeframe: '3 أشهر',
            recommendation_ar: `التدخل في ${item.item_name_ar} (درجة ${item.score})`,
          });
        }
      }
    }

    // SRS-2 based goals
    if (assessmentResults.srs2) {
      const s = assessmentResults.srs2;
      if (s.severity_classification !== 'within_normal') {
        for (const area of s.auto_recommendations?.priority_areas || []) {
          recommendations.push({
            domain: 'social',
            priority: s.severity_classification === 'severe' ? 'critical' : 'high',
            goal_type: 'social_skills',
            timeframe: '6 أشهر',
            recommendation_ar: area,
          });
        }
      }
    }

    // BRIEF-2 based goals
    if (assessmentResults.brief2) {
      const b = assessmentResults.brief2;
      if (b.clinical_interpretation?.primary_concerns?.length) {
        for (const concern of b.clinical_interpretation.primary_concerns) {
          recommendations.push({
            domain: 'executive_function',
            priority: 'high',
            goal_type: 'cognitive',
            timeframe: '6 أشهر',
            recommendation_ar: `تحسين ${concern}`,
          });
        }
      }
    }

    // Sensory Profile based goals
    if (assessmentResults.sensoryProfile) {
      const sp = assessmentResults.sensoryProfile;
      const summary = sp.sensory_profile_summary;
      if (summary?.therapy_recommendations?.length) {
        recommendations.push({
          domain: 'sensory',
          priority: 'medium',
          goal_type: 'sensory_integration',
          timeframe: '6 أشهر',
          recommendation_ar: `برنامج تكامل حسي — النمط السائد: ${summary.dominant_quadrant_ar}`,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort(
      (a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
    );

    return recommendations;
  }

  /**
   * فحص المخاطر والتنبيهات
   */
  static checkRisks(beneficiaryData) {
    const alerts = [];

    for (const rule of RISK_RULES) {
      try {
        let triggered = false;
        switch (rule.id) {
          case 'REGRESSION_DETECTED':
            triggered = rule.check(
              beneficiaryData.currentAssessment,
              beneficiaryData.previousAssessment
            );
            break;
          case 'PLATEAU_3_MONTHS':
            triggered = rule.check(
              beneficiaryData.currentAssessment,
              beneficiaryData.assessmentHistory
            );
            break;
          case 'MISSED_SESSIONS':
            triggered = rule.check(beneficiaryData.attendance);
            break;
          case 'BEHAVIOR_ESCALATION':
            triggered = rule.check(beneficiaryData.behaviorData);
            break;
          case 'DROPOUT_RISK':
            triggered = rule.check(beneficiaryData);
            break;
          case 'MEDICATION_REVIEW':
            triggered = rule.check(beneficiaryData.medication);
            break;
        }
        if (triggered) {
          alerts.push({
            rule_id: rule.id,
            name_ar: rule.name_ar,
            severity: rule.severity,
            color: rule.color,
            action_ar: rule.action_ar,
            detected_at: new Date(),
          });
        }
      } catch (e) {
        // Skip rule if data insufficient
      }
    }

    return alerts.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });
  }

  /**
   * تقييم جاهزية التخريج
   */
  static evaluateDischargeReadiness(data) {
    let totalWeightedScore = 0;
    const details = {};

    for (const [criterion, config] of Object.entries(DISCHARGE_CRITERIA)) {
      const actualValue = data[criterion] || 0;
      const met = actualValue >= config.threshold;
      const score = Math.min(actualValue / config.threshold, 1) * 100;
      totalWeightedScore += score * config.weight;

      details[criterion] = {
        actual: actualValue,
        threshold: config.threshold,
        met,
        score: Math.round(score),
        weight: config.weight,
        weighted_contribution: Math.round(score * config.weight),
      };
    }

    const overallScore = Math.round(totalWeightedScore);
    let readiness, readiness_ar;
    if (overallScore >= 85) {
      readiness = 'ready';
      readiness_ar = 'جاهز للتخريج';
    } else if (overallScore >= 70) {
      readiness = 'approaching';
      readiness_ar = 'يقترب من الجاهزية — يحتاج بعض المتطلبات';
    } else if (overallScore >= 50) {
      readiness = 'in_progress';
      readiness_ar = 'في طور التقدم — يحتاج مزيداً من الوقت';
    } else {
      readiness = 'not_ready';
      readiness_ar = 'غير جاهز — يحتاج لاستمرار البرنامج الحالي';
    }

    const unmetCriteria = Object.entries(details)
      .filter(([, d]) => !d.met)
      .map(([criterion]) => {
        const names = {
          goals_met_percentage: 'تحقيق الأهداف',
          functional_independence: 'الاستقلالية الوظيفية',
          family_training_completion: 'تدريب الأسرة',
          behavior_stability: 'استقرار السلوك',
          community_integration_readiness: 'الجاهزية للدمج المجتمعي',
          transition_plan_completed: 'خطة الانتقال',
        };
        return names[criterion] || criterion;
      });

    return {
      overall_score: overallScore,
      readiness,
      readiness_ar,
      details,
      unmet_criteria_ar: unmetCriteria,
      recommendations_ar: this._dischargeRecommendations(readiness, unmetCriteria),
    };
  }

  // ─── Helper Methods ────────────────────────────────────────

  static _getAgeBand(ageMonths) {
    if (ageMonths < 36) return '0-3';
    if (ageMonths < 72) return '3-6';
    if (ageMonths < 144) return '6-12';
    return '12+';
  }

  static _calculateWeeklyHours(services) {
    let total = 0;
    for (const s of services) {
      if (s.intensity.hours_per_week) {
        total += s.intensity.hours_per_week;
      } else if (s.intensity.sessions_per_week && s.session_duration_minutes) {
        total += (s.intensity.sessions_per_week * s.session_duration_minutes) / 60;
      }
    }
    return Math.round(total * 10) / 10;
  }

  static _generateReviewDates(schedule) {
    if (!schedule?.months) return [];
    const now = new Date();
    return schedule.months.map(m => {
      const date = new Date(now);
      date.setMonth(date.getMonth() + m);
      return { month: m, date: date.toISOString().split('T')[0], label_ar: `مراجعة الشهر ${m}` };
    });
  }

  static _domainNameAr(domain) {
    const names = {
      communication: 'التواصل',
      daily_living: 'الحياة اليومية',
      socialization: 'التنشئة الاجتماعية',
      motor: 'المهارات الحركية',
    };
    return names[domain] || domain;
  }

  static _dischargeRecommendations(readiness, unmetCriteria) {
    const recs = [];
    if (readiness === 'ready') {
      recs.push('إعداد تقرير تخريج شامل');
      recs.push('جدولة جلسات متابعة بعد التخريج (شهرياً لمدة 3 أشهر)');
      recs.push('تسليم برنامج منزلي للأسرة');
    } else if (readiness === 'approaching') {
      recs.push('التركيز على المتطلبات غير المحققة: ' + unmetCriteria.join('، '));
      recs.push('تحديد موعد إعادة تقييم خلال شهر');
    } else {
      recs.push('استمرار البرنامج الحالي مع مراجعة الأهداف');
      recs.push('جلسة مع الأسرة لمراجعة التقدم والتوقعات');
    }
    return recs;
  }
}

module.exports = ClinicalDecisionSupport;
