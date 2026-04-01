/**
 * assessmentToolsSeeder.js — بيانات أولية لمكتبة المقاييس المعتمدة
 * Seeder for Standardized Assessment Tools Library
 *
 * يشمل 17 مقياساً معتمداً:
 * Vineland-3, CARS-2, GARS-3, VB-MAPP, ABLLS-R, PEP-3,
 * Stanford-Binet 5, WISC-V/WAIS-IV, Conners-3, GMFM-88,
 * BOT-2, CELF-5, PLS-5, Bayley-4, BASC-3, GFTA-3, AFLS
 */

'use strict';

const mongoose = require('mongoose');
const AssessmentTool = require('../../models/assessmentScales/AssessmentTool');
const AssessmentToolDomain = require('../../models/assessmentScales/AssessmentToolDomain');
const AssessmentToolItem = require('../../models/assessmentScales/AssessmentToolItem');

// ─── بيانات المقاييس الأساسية ────────────────────────────────────
const TOOLS_DATA = [
  // ─── 1. Vineland-3 ────────────────────────────────────────────
  {
    code: 'VINELAND3',
    name_ar: 'مقياس فاينلاند للسلوك التكيفي - الإصدار الثالث',
    name_en: 'Vineland Adaptive Behavior Scales, Third Edition',
    abbreviation: 'Vineland-3',
    version: '3',
    publisher: 'Pearson',
    category: 'adaptive_behavior',
    specializations: ['psychology', 'special_education', 'aba'],
    target_disabilities: ['intellectual', 'autism', 'developmental'],
    min_age_months: 0,
    max_age_months: 1080, // 90 سنة
    scoring_system: 'standard_scores',
    scoring_config: {
      mean: 100,
      sd: 15,
      min: 20,
      max: 160,
      levels: {
        high: [115, 999],
        adequate: [86, 114],
        moderately_low: [71, 85],
        low: [0, 70],
      },
    },
    administration_format: 'interview',
    estimated_duration_minutes: 40,
    respondent_types: ['parent', 'caregiver'],
    description_ar:
      'يقيس السلوك التكيفي في مجالات: التواصل، مهارات الحياة اليومية، المهارات الاجتماعية، والمهارات الحركية.',
    sort_order: 1,
    domains: [
      {
        code: 'COMM',
        name_ar: 'التواصل',
        name_en: 'Communication',
        scoring_type: 'standard_score',
        sort_order: 1,
        items_count: 98,
        children: [
          {
            code: 'COMM_REC',
            name_ar: 'التواصل الاستقبالي',
            name_en: 'Receptive',
            scoring_type: 'sum',
            sort_order: 1,
          },
          {
            code: 'COMM_EXP',
            name_ar: 'التواصل التعبيري',
            name_en: 'Expressive',
            scoring_type: 'sum',
            sort_order: 2,
          },
          {
            code: 'COMM_WRI',
            name_ar: 'التواصل الكتابي',
            name_en: 'Written',
            scoring_type: 'sum',
            sort_order: 3,
          },
        ],
      },
      {
        code: 'DLS',
        name_ar: 'مهارات الحياة اليومية',
        name_en: 'Daily Living Skills',
        scoring_type: 'standard_score',
        sort_order: 2,
        items_count: 134,
        children: [
          {
            code: 'DLS_PER',
            name_ar: 'مهارات شخصية',
            name_en: 'Personal',
            scoring_type: 'sum',
            sort_order: 1,
          },
          {
            code: 'DLS_DOM',
            name_ar: 'مهارات منزلية',
            name_en: 'Domestic',
            scoring_type: 'sum',
            sort_order: 2,
          },
          {
            code: 'DLS_COM',
            name_ar: 'مهارات مجتمعية',
            name_en: 'Community',
            scoring_type: 'sum',
            sort_order: 3,
          },
        ],
      },
      {
        code: 'SOC',
        name_ar: 'المهارات الاجتماعية',
        name_en: 'Socialization',
        scoring_type: 'standard_score',
        sort_order: 3,
        items_count: 99,
        children: [
          {
            code: 'SOC_INT',
            name_ar: 'علاقات بين شخصية',
            name_en: 'Interpersonal',
            scoring_type: 'sum',
            sort_order: 1,
          },
          {
            code: 'SOC_PLY',
            name_ar: 'لعب ووقت فراغ',
            name_en: 'Play & Leisure',
            scoring_type: 'sum',
            sort_order: 2,
          },
          {
            code: 'SOC_COP',
            name_ar: 'مهارات التكيف',
            name_en: 'Coping Skills',
            scoring_type: 'sum',
            sort_order: 3,
          },
        ],
      },
      {
        code: 'MOT',
        name_ar: 'المهارات الحركية',
        name_en: 'Motor Skills',
        scoring_type: 'standard_score',
        sort_order: 4,
        items_count: 71,
        is_required: false,
        children: [
          {
            code: 'MOT_GRO',
            name_ar: 'حركي كبير',
            name_en: 'Gross',
            scoring_type: 'sum',
            sort_order: 1,
          },
          {
            code: 'MOT_FIN',
            name_ar: 'حركي دقيق',
            name_en: 'Fine',
            scoring_type: 'sum',
            sort_order: 2,
          },
        ],
      },
    ],
  },

  // ─── 2. CARS-2 ────────────────────────────────────────────────
  {
    code: 'CARS2',
    name_ar: 'مقياس تقييم التوحد في الطفولة - الإصدار الثاني',
    name_en: 'Childhood Autism Rating Scale, Second Edition',
    abbreviation: 'CARS-2',
    version: '2',
    publisher: 'WPS',
    category: 'autism',
    specializations: ['psychology', 'aba', 'special_education'],
    target_disabilities: ['autism'],
    min_age_months: 24,
    max_age_months: null,
    scoring_system: 'custom',
    scoring_config: {
      total_min: 15,
      total_max: 60,
      allows_half_scores: true,
      cutoffs: {
        'لا يوجد توحد': [15, 29.5],
        'توحد خفيف إلى متوسط': [30, 36.5],
        'توحد شديد': [37, 60],
      },
    },
    administration_format: 'observation',
    estimated_duration_minutes: 30,
    respondent_types: ['clinician'],
    description_ar: 'مقياس لتقييم شدة التوحد يتألف من 15 بنداً، كل منها يُصنَّف من 1 إلى 4.',
    sort_order: 2,
    domains: [
      {
        code: 'CARS_MAIN',
        name_ar: 'بنود التقييم الرئيسية',
        name_en: 'Main Items',
        scoring_type: 'sum',
        max_raw_score: 60,
        min_raw_score: 15,
        items_count: 15,
        sort_order: 1,
        items: [
          { item_number: '1', text_ar: 'العلاقة بالناس', text_en: 'Relating to People' },
          { item_number: '2', text_ar: 'التقليد', text_en: 'Imitation' },
          { item_number: '3', text_ar: 'الاستجابة العاطفية', text_en: 'Emotional Response' },
          { item_number: '4', text_ar: 'استخدام الجسد', text_en: 'Body Use' },
          { item_number: '5', text_ar: 'استخدام الأشياء', text_en: 'Object Use' },
          { item_number: '6', text_ar: 'التكيف مع التغيير', text_en: 'Adaptation to Change' },
          { item_number: '7', text_ar: 'الاستجابة البصرية', text_en: 'Visual Response' },
          { item_number: '8', text_ar: 'الاستجابة السمعية', text_en: 'Listening Response' },
          {
            item_number: '9',
            text_ar: 'استجابة الذوق والشم واللمس',
            text_en: 'Taste/Smell/Touch Response',
          },
          { item_number: '10', text_ar: 'الخوف والقلق', text_en: 'Fear or Nervousness' },
          { item_number: '11', text_ar: 'التواصل اللفظي', text_en: 'Verbal Communication' },
          { item_number: '12', text_ar: 'التواصل غير اللفظي', text_en: 'Nonverbal Communication' },
          { item_number: '13', text_ar: 'مستوى النشاط', text_en: 'Activity Level' },
          {
            item_number: '14',
            text_ar: 'مستوى واتساق الاستجابة الذهنية',
            text_en: 'Level/Consistency of Intellectual Response',
          },
          { item_number: '15', text_ar: 'الانطباعات العامة', text_en: 'General Impressions' },
        ],
      },
    ],
  },

  // ─── 3. GARS-3 ────────────────────────────────────────────────
  {
    code: 'GARS3',
    name_ar: 'مقياس جيليام لتقييم التوحد - الإصدار الثالث',
    name_en: 'Gilliam Autism Rating Scale, Third Edition',
    abbreviation: 'GARS-3',
    version: '3',
    publisher: 'Pro-Ed',
    category: 'autism',
    specializations: ['psychology', 'aba'],
    target_disabilities: ['autism'],
    min_age_months: 36,
    max_age_months: 264, // 22 سنة
    scoring_system: 'standard_scores',
    scoring_config: {
      mean: 100,
      sd: 15,
      autism_quotient_cutoffs: {
        'احتمال منخفض جداً': [0, 69],
        'احتمال منخفض': [70, 79],
        'احتمال متوسط': [80, 89],
        'احتمال مرتفع': [90, 99],
        'احتمال مرتفع جداً': [100, 999],
      },
    },
    administration_format: 'questionnaire',
    estimated_duration_minutes: 20,
    respondent_types: ['parent', 'teacher'],
    description_ar: 'يقيّم احتمالية الإصابة بالتوحد ويحسب حاصل التوحد (AQ).',
    sort_order: 3,
    domains: [
      {
        code: 'RRB',
        name_ar: 'السلوكيات النمطية المتكررة',
        name_en: 'Restricted/Repetitive Behaviors',
        scoring_type: 'standard_score',
        items_count: 14,
        sort_order: 1,
      },
      {
        code: 'SC',
        name_ar: 'التواصل الاجتماعي',
        name_en: 'Social Communication',
        scoring_type: 'standard_score',
        items_count: 14,
        sort_order: 2,
      },
      {
        code: 'SI',
        name_ar: 'التفاعل الاجتماعي',
        name_en: 'Social Interaction',
        scoring_type: 'standard_score',
        items_count: 14,
        sort_order: 3,
      },
      {
        code: 'ER',
        name_ar: 'الاستجابات العاطفية',
        name_en: 'Emotional Responses',
        scoring_type: 'standard_score',
        items_count: 8,
        sort_order: 4,
      },
      {
        code: 'CS',
        name_ar: 'الأسلوب المعرفي',
        name_en: 'Cognitive Style',
        scoring_type: 'standard_score',
        items_count: 8,
        sort_order: 5,
      },
      {
        code: 'MS',
        name_ar: 'الكلام غير التكيفي',
        name_en: 'Maladaptive Speech',
        scoring_type: 'standard_score',
        items_count: 7,
        sort_order: 6,
      },
    ],
  },

  // ─── 4. VB-MAPP ──────────────────────────────────────────────
  {
    code: 'VBMAPP',
    name_ar: 'تقييم مراحل اللغة والأحداث المحورية',
    name_en: 'Verbal Behavior Milestones Assessment and Placement Program',
    abbreviation: 'VB-MAPP',
    version: '2',
    publisher: 'AVB Press',
    category: 'language',
    specializations: ['aba', 'speech'],
    target_disabilities: ['autism', 'intellectual', 'language_delay'],
    min_age_months: 0,
    max_age_months: 48,
    scoring_system: 'mastery_based',
    scoring_config: {
      mastery_values: [0, 0.5, 1],
      levels: [1, 2, 3],
      level_ranges: { 1: '0-18 شهر', 2: '18-30 شهر', 3: '30-48 شهر' },
    },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 60,
    respondent_types: ['clinician'],
    description_ar:
      'يقيّم المهارات اللغوية والاجتماعية عبر 3 مستويات نمائية، ويشمل 170 هدفاً و24 عائقاً سلوكياً.',
    sort_order: 4,
    domains: [
      {
        code: 'MAND',
        name_ar: 'الطلب (Mand)',
        name_en: 'Mand',
        scoring_type: 'sum',
        sort_order: 1,
      },
      {
        code: 'TACT',
        name_ar: 'التسمية (Tact)',
        name_en: 'Tact',
        scoring_type: 'sum',
        sort_order: 2,
      },
      {
        code: 'LR',
        name_ar: 'استجابة المستمع',
        name_en: 'Listener Responding',
        scoring_type: 'sum',
        sort_order: 3,
      },
      {
        code: 'ECH',
        name_ar: 'التقليد الصوتي',
        name_en: 'Echoic',
        scoring_type: 'sum',
        sort_order: 4,
      },
      {
        code: 'INTRAV',
        name_ar: 'السلوك اللفظي التبادلي',
        name_en: 'Intraverbal',
        scoring_type: 'sum',
        sort_order: 5,
      },
      {
        code: 'SP',
        name_ar: 'مهارات اجتماعية',
        name_en: 'Social Skills',
        scoring_type: 'sum',
        sort_order: 6,
      },
      {
        code: 'VIS',
        name_ar: 'الإدراك البصري',
        name_en: 'Visual Perceptual',
        scoring_type: 'sum',
        sort_order: 7,
      },
      {
        code: 'PLAY',
        name_ar: 'اللعب المستقل',
        name_en: 'Independent Play',
        scoring_type: 'sum',
        sort_order: 8,
      },
    ],
  },

  // ─── 5. PEP-3 ────────────────────────────────────────────────
  {
    code: 'PEP3',
    name_ar: 'البروفايل النفسي التعليمي للتوحد - الإصدار الثالث',
    name_en: 'Psychoeducational Profile, Third Edition',
    abbreviation: 'PEP-3',
    version: '3',
    publisher: 'Pro-Ed',
    category: 'developmental',
    specializations: ['psychology', 'special_education', 'aba'],
    target_disabilities: ['autism', 'developmental'],
    min_age_months: 24,
    max_age_months: 90, // 7.5 سنة
    scoring_system: 'developmental_index',
    scoring_config: {
      item_scores: { fail: 0, emerging: 1, pass: 2 },
    },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 90,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم نقاط القوة والضعف وأعمار النمو لدى الأطفال ذوي التوحد.',
    sort_order: 5,
    domains: [
      {
        code: 'COG_VRB',
        name_ar: 'معرفي لفظي/لغوي',
        name_en: 'Cognitive Verbal/Preverbal',
        scoring_type: 'age_equivalent',
        sort_order: 1,
      },
      {
        code: 'LANG_EXP',
        name_ar: 'لغة تعبيرية',
        name_en: 'Expressive Language',
        scoring_type: 'age_equivalent',
        sort_order: 2,
      },
      {
        code: 'LANG_REC',
        name_ar: 'لغة استقبالية',
        name_en: 'Receptive Language',
        scoring_type: 'age_equivalent',
        sort_order: 3,
      },
      {
        code: 'FMT',
        name_ar: 'حركي دقيق',
        name_en: 'Fine Motor',
        scoring_type: 'age_equivalent',
        sort_order: 4,
      },
      {
        code: 'GMT',
        name_ar: 'حركي كبير',
        name_en: 'Gross Motor',
        scoring_type: 'age_equivalent',
        sort_order: 5,
      },
      {
        code: 'VIM',
        name_ar: 'تقليد بصري حركي',
        name_en: 'Visual Motor Imitation',
        scoring_type: 'age_equivalent',
        sort_order: 6,
      },
    ],
  },

  // ─── 6. Stanford-Binet 5 ─────────────────────────────────────
  {
    code: 'SB5',
    name_ar: 'مقياس ستانفورد-بينيه للذكاء - الإصدار الخامس',
    name_en: 'Stanford-Binet Intelligence Scales, Fifth Edition',
    abbreviation: 'SB-5',
    version: '5',
    publisher: 'Riverside',
    category: 'intelligence',
    specializations: ['psychology'],
    target_disabilities: ['intellectual', 'gifted', 'learning'],
    min_age_months: 24,
    max_age_months: 1020,
    scoring_system: 'iq_scores',
    scoring_config: {
      mean: 100,
      sd: 15,
      classification_cutoffs: {
        'متفوق جداً': [130, 999],
        متفوق: [120, 129],
        'فوق المتوسط': [110, 119],
        متوسط: [90, 109],
        'تحت المتوسط': [80, 89],
        حدّي: [70, 79],
        'إعاقة ذهنية': [0, 69],
      },
    },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 90,
    respondent_types: ['clinician'],
    description_ar:
      'يقيس نسبة الذكاء عبر 10 اختبارات فرعية في 5 عوامل: الاستدلال السائل، المعرفة، الاستدلال الكمي، المعالجة البصرية المكانية، الذاكرة العاملة.',
    sort_order: 6,
    domains: [
      {
        code: 'FR',
        name_ar: 'الاستدلال السائل',
        name_en: 'Fluid Reasoning',
        scoring_type: 'standard_score',
        sort_order: 1,
      },
      {
        code: 'KN',
        name_ar: 'المعرفة',
        name_en: 'Knowledge',
        scoring_type: 'standard_score',
        sort_order: 2,
      },
      {
        code: 'QR',
        name_ar: 'الاستدلال الكمي',
        name_en: 'Quantitative Reasoning',
        scoring_type: 'standard_score',
        sort_order: 3,
      },
      {
        code: 'VS',
        name_ar: 'المعالجة البصرية المكانية',
        name_en: 'Visual-Spatial Processing',
        scoring_type: 'standard_score',
        sort_order: 4,
      },
      {
        code: 'WM',
        name_ar: 'الذاكرة العاملة',
        name_en: 'Working Memory',
        scoring_type: 'standard_score',
        sort_order: 5,
      },
    ],
  },

  // ─── 7. WISC-V ────────────────────────────────────────────────
  {
    code: 'WISCV',
    name_ar: 'مقياس وكسلر للذكاء للأطفال - الإصدار الخامس',
    name_en: 'Wechsler Intelligence Scale for Children, Fifth Edition',
    abbreviation: 'WISC-V',
    version: '5',
    publisher: 'Pearson',
    category: 'intelligence',
    specializations: ['psychology'],
    target_disabilities: ['intellectual', 'learning', 'adhd'],
    min_age_months: 72, // 6 سنوات
    max_age_months: 192, // 16 سنة
    scoring_system: 'iq_scores',
    scoring_config: { mean: 100, sd: 15 },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 90,
    respondent_types: ['clinician'],
    description_ar: 'يقيس الذكاء الشامل والقدرات المعرفية لدى الأطفال من 6 إلى 16 سنة.',
    sort_order: 7,
    domains: [
      {
        code: 'VCI',
        name_ar: 'الفهم اللفظي',
        name_en: 'Verbal Comprehension Index',
        scoring_type: 'standard_score',
        sort_order: 1,
      },
      {
        code: 'VSI',
        name_ar: 'الاستدلال البصري المكاني',
        name_en: 'Visual-Spatial Index',
        scoring_type: 'standard_score',
        sort_order: 2,
      },
      {
        code: 'FRI',
        name_ar: 'الاستدلال السائل',
        name_en: 'Fluid Reasoning Index',
        scoring_type: 'standard_score',
        sort_order: 3,
      },
      {
        code: 'WMI',
        name_ar: 'الذاكرة العاملة',
        name_en: 'Working Memory Index',
        scoring_type: 'standard_score',
        sort_order: 4,
      },
      {
        code: 'PSI',
        name_ar: 'سرعة المعالجة',
        name_en: 'Processing Speed Index',
        scoring_type: 'standard_score',
        sort_order: 5,
      },
    ],
  },

  // ─── 8. Conners-3 ────────────────────────────────────────────
  {
    code: 'CONNERS3',
    name_ar: 'مقياس كونرز لتقييم فرط الحركة وقصور الانتباه - الإصدار الثالث',
    name_en: 'Conners Rating Scales, Third Edition',
    abbreviation: 'Conners-3',
    version: '3',
    publisher: 'MHS',
    category: 'behavioral',
    specializations: ['psychology'],
    target_disabilities: ['adhd', 'learning'],
    min_age_months: 72, // 6 سنوات
    max_age_months: 216, // 18 سنة
    scoring_system: 't_scores',
    scoring_config: {
      mean: 50,
      sd: 10,
      clinical_cutoffs: {
        طبيعي: [0, 59],
        'مرتفع (عرضة للخطر)': [60, 69],
        'مرتفع جداً (ذو دلالة إكلينيكية)': [70, 999],
      },
    },
    administration_format: 'questionnaire',
    estimated_duration_minutes: 20,
    respondent_types: ['parent', 'teacher', 'self'],
    description_ar: 'يقيّم أعراض فرط الحركة وقصور الانتباه من تقرير الوالدين أو المعلم أو المراهق.',
    sort_order: 8,
    domains: [
      {
        code: 'IA',
        name_ar: 'قصور الانتباه',
        name_en: 'Inattention',
        scoring_type: 't_scores',
        sort_order: 1,
      },
      {
        code: 'HY',
        name_ar: 'فرط الحركة/الاندفاعية',
        name_en: 'Hyperactivity/Impulsivity',
        scoring_type: 't_scores',
        sort_order: 2,
      },
      {
        code: 'LP',
        name_ar: 'مشكلات التعلم',
        name_en: 'Learning Problems',
        scoring_type: 't_scores',
        sort_order: 3,
      },
      {
        code: 'EF',
        name_ar: 'المشكلات التنفيذية',
        name_en: 'Executive Functioning',
        scoring_type: 't_scores',
        sort_order: 4,
      },
      {
        code: 'DA',
        name_ar: 'التحدي/العدوانية',
        name_en: 'Defiance/Aggression',
        scoring_type: 't_scores',
        sort_order: 5,
      },
      {
        code: 'PR',
        name_ar: 'علاقات الأقران',
        name_en: 'Peer Relations',
        scoring_type: 't_scores',
        sort_order: 6,
      },
    ],
  },

  // ─── 9. GMFM-88 ──────────────────────────────────────────────
  {
    code: 'GMFM88',
    name_ar: 'مقياس الوظائف الحركية الكبرى',
    name_en: 'Gross Motor Function Measure - 88 Items',
    abbreviation: 'GMFM-88',
    version: '88',
    publisher: 'Mac Keith Press',
    category: 'motor',
    specializations: ['pt'],
    target_disabilities: ['cp', 'neuromuscular', 'developmental'],
    min_age_months: 5,
    max_age_months: 192, // 16 سنة
    scoring_system: 'percentage',
    scoring_config: {
      dimensions: ['A', 'B', 'C', 'D', 'E'],
      dimension_names: {
        A: 'الاستلقاء والتقلب',
        B: 'الجلوس',
        C: 'الحبو والركوع',
        D: 'الوقوف',
        E: 'المشي والركض والقفز',
      },
    },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 60,
    respondent_types: ['clinician'],
    description_ar:
      'يقيّم الوظائف الحركية الكبرى عبر 5 أبعاد و88 بنداً، كل بند يُسجَّل من 0 إلى 3.',
    sort_order: 9,
    domains: [
      {
        code: 'A',
        name_ar: 'الاستلقاء والتقلب',
        name_en: 'Lying & Rolling',
        scoring_type: 'percentage',
        max_raw_score: 51,
        items_count: 17,
        sort_order: 1,
      },
      {
        code: 'B',
        name_ar: 'الجلوس',
        name_en: 'Sitting',
        scoring_type: 'percentage',
        max_raw_score: 60,
        items_count: 20,
        sort_order: 2,
      },
      {
        code: 'C',
        name_ar: 'الحبو والركوع',
        name_en: 'Crawling & Kneeling',
        scoring_type: 'percentage',
        max_raw_score: 42,
        items_count: 14,
        sort_order: 3,
      },
      {
        code: 'D',
        name_ar: 'الوقوف',
        name_en: 'Standing',
        scoring_type: 'percentage',
        max_raw_score: 39,
        items_count: 13,
        sort_order: 4,
      },
      {
        code: 'E',
        name_ar: 'المشي والركض والقفز',
        name_en: 'Walking/Running/Jumping',
        scoring_type: 'percentage',
        max_raw_score: 72,
        items_count: 24,
        sort_order: 5,
      },
    ],
  },

  // ─── 10. BOT-2 ───────────────────────────────────────────────
  {
    code: 'BOT2',
    name_ar: 'مقياس بروينينكس-أوسيريتسكي للكفاءة الحركية',
    name_en: 'Bruininks-Oseretsky Test of Motor Proficiency, 2nd Edition',
    abbreviation: 'BOT-2',
    version: '2',
    publisher: 'Pearson',
    category: 'motor',
    specializations: ['ot'],
    target_disabilities: ['developmental', 'learning', 'cp'],
    min_age_months: 48, // 4 سنوات
    max_age_months: 252, // 21 سنة
    scoring_system: 'standard_scores',
    scoring_config: { mean: 50, sd: 10 },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 60,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم الكفاءة الحركية الدقيقة والكبرى عبر 8 اختبارات فرعية.',
    sort_order: 10,
    domains: [
      {
        code: 'FMF',
        name_ar: 'الدقة الحركية الدقيقة',
        name_en: 'Fine Motor Precision',
        scoring_type: 'standard_score',
        sort_order: 1,
      },
      {
        code: 'FMI',
        name_ar: 'التكامل الحركي الدقيق',
        name_en: 'Fine Motor Integration',
        scoring_type: 'standard_score',
        sort_order: 2,
      },
      {
        code: 'MD',
        name_ar: 'البراعة اليدوية',
        name_en: 'Manual Dexterity',
        scoring_type: 'standard_score',
        sort_order: 3,
      },
      {
        code: 'BC',
        name_ar: 'التنسيق الثنائي',
        name_en: 'Bilateral Coordination',
        scoring_type: 'standard_score',
        sort_order: 4,
      },
      {
        code: 'BA',
        name_ar: 'التوازن',
        name_en: 'Balance',
        scoring_type: 'standard_score',
        sort_order: 5,
      },
      {
        code: 'RS',
        name_ar: 'سرعة الركض وخفة الحركة',
        name_en: 'Running Speed & Agility',
        scoring_type: 'standard_score',
        sort_order: 6,
      },
      {
        code: 'UC',
        name_ar: 'تنسيق الأطراف العليا',
        name_en: 'Upper Limb Coordination',
        scoring_type: 'standard_score',
        sort_order: 7,
      },
      {
        code: 'ST',
        name_ar: 'القوة',
        name_en: 'Strength',
        scoring_type: 'standard_score',
        sort_order: 8,
      },
    ],
  },

  // ─── 11. CELF-5 ──────────────────────────────────────────────
  {
    code: 'CELF5',
    name_ar: 'التقييم السريري لأساسيات اللغة - الإصدار الخامس',
    name_en: 'Clinical Evaluation of Language Fundamentals, Fifth Edition',
    abbreviation: 'CELF-5',
    version: '5',
    publisher: 'Pearson',
    category: 'language',
    specializations: ['speech'],
    target_disabilities: ['language_disorder', 'learning', 'autism'],
    min_age_months: 60, // 5 سنوات
    max_age_months: 252, // 21 سنة
    scoring_system: 'standard_scores',
    scoring_config: { mean: 100, sd: 15 },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 60,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم اللغة الاستقبالية والتعبيرية وبنية اللغة ومحتواها.',
    sort_order: 11,
    domains: [
      {
        code: 'RLC',
        name_ar: 'اللغة الاستقبالية',
        name_en: 'Receptive Language Composite',
        scoring_type: 'standard_score',
        sort_order: 1,
      },
      {
        code: 'ELC',
        name_ar: 'اللغة التعبيرية',
        name_en: 'Expressive Language Composite',
        scoring_type: 'standard_score',
        sort_order: 2,
      },
      {
        code: 'LLC',
        name_ar: 'محتوى اللغة',
        name_en: 'Language Content Composite',
        scoring_type: 'standard_score',
        sort_order: 3,
      },
      {
        code: 'LSC',
        name_ar: 'بنية اللغة',
        name_en: 'Language Structure Composite',
        scoring_type: 'standard_score',
        sort_order: 4,
      },
    ],
  },

  // ─── 12. PLS-5 ───────────────────────────────────────────────
  {
    code: 'PLS5',
    name_ar: 'مقياس اللغة لمرحلة ما قبل المدرسة - الإصدار الخامس',
    name_en: 'Preschool Language Scales, Fifth Edition',
    abbreviation: 'PLS-5',
    version: '5',
    publisher: 'Pearson',
    category: 'language',
    specializations: ['speech'],
    target_disabilities: ['language_delay', 'autism', 'developmental'],
    min_age_months: 0,
    max_age_months: 95, // 7 سنوات و11 شهر
    scoring_system: 'standard_scores',
    scoring_config: { mean: 100, sd: 15 },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 45,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم اللغة الاستقبالية والتعبيرية للرضع والأطفال الصغار.',
    sort_order: 12,
    domains: [
      {
        code: 'AC',
        name_ar: 'الفهم السمعي',
        name_en: 'Auditory Comprehension',
        scoring_type: 'standard_score',
        sort_order: 1,
      },
      {
        code: 'EC',
        name_ar: 'التواصل التعبيري',
        name_en: 'Expressive Communication',
        scoring_type: 'standard_score',
        sort_order: 2,
      },
      {
        code: 'TLS',
        name_ar: 'اللغة الكلية',
        name_en: 'Total Language Score',
        scoring_type: 'standard_score',
        sort_order: 3,
      },
    ],
  },

  // ─── 13. Bayley-4 ────────────────────────────────────────────
  {
    code: 'BAYLEY4',
    name_ar: 'مقياس بايلي لتقييم نمو الرضع والأطفال الصغار - الإصدار الرابع',
    name_en: 'Bayley Scales of Infant and Toddler Development, Fourth Edition',
    abbreviation: 'Bayley-4',
    version: '4',
    publisher: 'Pearson',
    category: 'developmental',
    specializations: ['psychology', 'pt', 'ot', 'speech'],
    target_disabilities: ['developmental', 'premature', 'autism'],
    min_age_months: 0.53, // 16 يوم
    max_age_months: 42,
    scoring_system: 'developmental_index',
    scoring_config: { mean: 100, sd: 15 },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 90,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم النمو المعرفي واللغوي والحركي والاجتماعي العاطفي والسلوك التكيفي للرضع.',
    sort_order: 13,
    domains: [
      {
        code: 'COG',
        name_ar: 'المعرفي',
        name_en: 'Cognitive',
        scoring_type: 'developmental_index',
        items_count: 91,
        sort_order: 1,
      },
      {
        code: 'LANG',
        name_ar: 'اللغوي',
        name_en: 'Language',
        scoring_type: 'developmental_index',
        sort_order: 2,
        children: [
          {
            code: 'LANG_REC',
            name_ar: 'استقبالي',
            name_en: 'Receptive',
            items_count: 49,
            sort_order: 1,
          },
          {
            code: 'LANG_EXP',
            name_ar: 'تعبيري',
            name_en: 'Expressive',
            items_count: 48,
            sort_order: 2,
          },
        ],
      },
      {
        code: 'MOT',
        name_ar: 'الحركي',
        name_en: 'Motor',
        scoring_type: 'developmental_index',
        sort_order: 3,
        children: [
          { code: 'MOT_GRO', name_ar: 'كبير', name_en: 'Gross', items_count: 72, sort_order: 1 },
          { code: 'MOT_FIN', name_ar: 'دقيق', name_en: 'Fine', items_count: 66, sort_order: 2 },
        ],
      },
      {
        code: 'SE',
        name_ar: 'الاجتماعي العاطفي',
        name_en: 'Social-Emotional',
        scoring_type: 'developmental_index',
        sort_order: 4,
        is_required: false,
      },
      {
        code: 'AB',
        name_ar: 'السلوك التكيفي',
        name_en: 'Adaptive Behavior',
        scoring_type: 'developmental_index',
        sort_order: 5,
        is_required: false,
      },
    ],
  },

  // ─── 14. BASC-3 ──────────────────────────────────────────────
  {
    code: 'BASC3',
    name_ar: 'نظام تقييم السلوك للأطفال - الإصدار الثالث',
    name_en: 'Behavior Assessment System for Children, Third Edition',
    abbreviation: 'BASC-3',
    version: '3',
    publisher: 'Pearson',
    category: 'behavioral',
    specializations: ['psychology'],
    target_disabilities: ['adhd', 'autism', 'emotional', 'learning'],
    min_age_months: 24,
    max_age_months: 252,
    scoring_system: 't_scores',
    scoring_config: {
      mean: 50,
      sd: 10,
      clinical_scale_cutoffs: {
        طبيعي: [0, 59],
        'عرضة للخطر': [60, 69],
        'ذو دلالة إكلينيكية': [70, 999],
      },
      adaptive_scale_cutoffs: {
        طبيعي: [40, 999],
        'عرضة للخطر': [31, 39],
        'ذو دلالة إكلينيكية (منخفض)': [0, 30],
      },
    },
    administration_format: 'questionnaire',
    estimated_duration_minutes: 25,
    respondent_types: ['parent', 'teacher', 'self'],
    description_ar: 'نظام شامل لتقييم السلوك يشمل المقاييس السريرية والتكيفية.',
    sort_order: 14,
    domains: [
      {
        code: 'EXT',
        name_ar: 'المشكلات الخارجية',
        name_en: 'Externalizing Problems',
        scoring_type: 't_scores',
        sort_order: 1,
      },
      {
        code: 'INT',
        name_ar: 'المشكلات الداخلية',
        name_en: 'Internalizing Problems',
        scoring_type: 't_scores',
        sort_order: 2,
      },
      {
        code: 'BSI',
        name_ar: 'مؤشر أعراض السلوك',
        name_en: 'Behavioral Symptoms Index',
        scoring_type: 't_scores',
        sort_order: 3,
      },
      {
        code: 'ADC',
        name_ar: 'مهارات التكيف',
        name_en: 'Adaptive Skills Composite',
        scoring_type: 't_scores',
        sort_order: 4,
      },
    ],
  },

  // ─── 15. GFTA-3 ──────────────────────────────────────────────
  {
    code: 'GFTA3',
    name_ar: 'اختبار جولدمان-فريستو للنطق - الإصدار الثالث',
    name_en: 'Goldman-Fristoe Test of Articulation, Third Edition',
    abbreviation: 'GFTA-3',
    version: '3',
    publisher: 'Pearson',
    category: 'language',
    specializations: ['speech'],
    target_disabilities: ['speech_disorder', 'hearing', 'autism'],
    min_age_months: 24,
    max_age_months: 252,
    scoring_system: 'standard_scores',
    scoring_config: { mean: 100, sd: 15 },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 20,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم نطق الأصوات في 3 مواضع: بداية الكلمة، وسط الكلمة، نهاية الكلمة.',
    sort_order: 15,
    domains: [
      {
        code: 'SOUNDS_IN_WORDS',
        name_ar: 'الأصوات في الكلمات',
        name_en: 'Sounds in Words',
        scoring_type: 'standard_score',
        sort_order: 1,
      },
      {
        code: 'SOUNDS_IN_SENTENCES',
        name_ar: 'الأصوات في الجمل',
        name_en: 'Sounds in Sentences',
        scoring_type: 'standard_score',
        sort_order: 2,
      },
    ],
  },

  // ─── 16. ABLLS-R ─────────────────────────────────────────────
  {
    code: 'ABLLS_R',
    name_ar: 'تقييم مهارات اللغة والتعلم الأساسية - نسخة معدلة',
    name_en: 'Assessment of Basic Language and Learning Skills - Revised',
    abbreviation: 'ABLLS-R',
    version: 'R',
    publisher: 'Behavior Analysts',
    category: 'language',
    specializations: ['aba'],
    target_disabilities: ['autism', 'intellectual', 'language_delay'],
    min_age_months: 0,
    max_age_months: 120,
    scoring_system: 'criterion_based',
    scoring_config: {
      item_scores: { 0: 'غير متقن', 1: 'ناشئ', 2: 'متقن جزئياً', 3: 'متقن', 4: 'متقن بالكامل' },
    },
    administration_format: 'direct_assessment',
    estimated_duration_minutes: 120,
    respondent_types: ['clinician'],
    description_ar: 'يقيّم 544 مهارة في 25 مجالاً تشمل اللغة والأكاديميات والمهارات الاجتماعية.',
    sort_order: 16,
    domains: [
      {
        code: 'A',
        name_ar: 'التعاون وفعالية المعززات',
        name_en: 'Cooperation/Reinforcer Effectiveness',
        scoring_type: 'sum',
        sort_order: 1,
      },
      {
        code: 'B',
        name_ar: 'الأداء البصري',
        name_en: 'Visual Performance',
        scoring_type: 'sum',
        sort_order: 2,
      },
      {
        code: 'C',
        name_ar: 'اللغة الاستقبالية',
        name_en: 'Receptive Language',
        scoring_type: 'sum',
        sort_order: 3,
      },
      {
        code: 'D',
        name_ar: 'التقليد الحركي',
        name_en: 'Motor Imitation',
        scoring_type: 'sum',
        sort_order: 4,
      },
      {
        code: 'E',
        name_ar: 'التقليد الصوتي',
        name_en: 'Vocal Imitation',
        scoring_type: 'sum',
        sort_order: 5,
      },
      { code: 'F', name_ar: 'الطلب', name_en: 'Mand', scoring_type: 'sum', sort_order: 6 },
      { code: 'G', name_ar: 'التسمية', name_en: 'Tact', scoring_type: 'sum', sort_order: 7 },
      {
        code: 'H',
        name_ar: 'السلوك اللفظي التبادلي',
        name_en: 'Intraverbal',
        scoring_type: 'sum',
        sort_order: 8,
      },
    ],
  },

  // ─── 17. AFLS ────────────────────────────────────────────────
  {
    code: 'AFLS',
    name_ar: 'تقييم المهارات الوظيفية الحياتية',
    name_en: 'Assessment of Functional Living Skills',
    abbreviation: 'AFLS',
    publisher: 'AFLS Institute',
    category: 'functional',
    specializations: ['aba', 'vocational'],
    target_disabilities: ['autism', 'intellectual'],
    min_age_months: 36,
    max_age_months: null,
    scoring_system: 'criterion_based',
    scoring_config: {
      item_scores: { 0: 'غير متقن', 1: 'ناشئ', 2: 'متقن جزئياً', 3: 'متقن', 4: 'متقن بالكامل' },
    },
    administration_format: 'mixed',
    estimated_duration_minutes: 60,
    respondent_types: ['parent', 'clinician'],
    description_ar:
      'يقيّم مهارات الحياة الوظيفية في 6 مجالات: أساسي، منزل، مجتمع، مدرسة، عمل مستقل، توظيف.',
    sort_order: 17,
    domains: [
      {
        code: 'BASIC',
        name_ar: 'المهارات الأساسية للتعلم',
        name_en: 'Basic Living Skills',
        scoring_type: 'sum',
        sort_order: 1,
      },
      {
        code: 'HOME',
        name_ar: 'مهارات المنزل',
        name_en: 'Home Skills',
        scoring_type: 'sum',
        sort_order: 2,
      },
      {
        code: 'COMMUNITY',
        name_ar: 'مهارات المجتمع',
        name_en: 'Community Participation Skills',
        scoring_type: 'sum',
        sort_order: 3,
      },
      {
        code: 'SCHOOL',
        name_ar: 'مهارات المدرسة',
        name_en: 'School Skills',
        scoring_type: 'sum',
        sort_order: 4,
      },
      {
        code: 'INDEP',
        name_ar: 'مهارات العمل المستقل',
        name_en: 'Independent Living Skills',
        scoring_type: 'sum',
        sort_order: 5,
      },
      {
        code: 'VOC',
        name_ar: 'مهارات التوظيف المهني',
        name_en: 'Vocational Skills',
        scoring_type: 'sum',
        sort_order: 6,
      },
    ],
  },
];

// ─── خيارات التسجيل المشتركة ─────────────────────────────────────

const CARS_SCORING_OPTIONS = [
  { value: 1, label_ar: 'مناسب للعمر / طبيعي', label_en: 'Age-appropriate / Normal' },
  { value: 1.5, label_ar: 'بين الطبيعي والخفيف', label_en: 'Between normal and mild' },
  { value: 2, label_ar: 'غير طبيعي بشكل طفيف', label_en: 'Mildly abnormal' },
  { value: 2.5, label_ar: 'بين الطفيف والمعتدل', label_en: 'Between mild and moderate' },
  { value: 3, label_ar: 'غير طبيعي بشكل معتدل', label_en: 'Moderately abnormal' },
  { value: 3.5, label_ar: 'بين المعتدل والشديد', label_en: 'Between moderate and severe' },
  { value: 4, label_ar: 'غير طبيعي بشكل شديد', label_en: 'Severely abnormal' },
];

const GMFM_SCORING_OPTIONS = [
  { value: 0, label_ar: 'لا يبدأ', label_en: 'Does not initiate' },
  { value: 1, label_ar: 'يبدأ (أقل من 10%)', label_en: 'Initiates (< 10%)' },
  { value: 2, label_ar: 'يكمل جزئياً (10-99%)', label_en: 'Partially completes (10-99%)' },
  { value: 3, label_ar: 'يكمل المهمة', label_en: 'Completes' },
];

const VBMAPP_SCORING_OPTIONS = [
  { value: 0, label_ar: 'غير متقن', label_en: 'Not mastered' },
  { value: 0.5, label_ar: 'ناشئ', label_en: 'Emerging' },
  { value: 1, label_ar: 'متقن', label_en: 'Mastered' },
];

const CRITERION_0_4_OPTIONS = [
  { value: 0, label_ar: 'غير متقن', label_en: 'Not acquired' },
  { value: 1, label_ar: 'ناشئ', label_en: 'Emerging' },
  { value: 2, label_ar: 'متقن جزئياً', label_en: 'Partially mastered' },
  { value: 3, label_ar: 'متقن', label_en: 'Mastered' },
  { value: 4, label_ar: 'متقن بالكامل', label_en: 'Fully mastered' },
];

// ─── الدالة الرئيسية ──────────────────────────────────────────────

async function seedAssessmentTools(force = false) {
  try {
    const existingCount = await AssessmentTool.countDocuments();
    if (existingCount > 0 && !force) {
      console.log(`[Seeder] مكتبة المقاييس محمّلة بالفعل (${existingCount} مقياس) — تخطي.`);
      return { skipped: true, count: existingCount };
    }

    if (force) {
      await AssessmentTool.deleteMany({});
      await AssessmentToolDomain.deleteMany({});
      await AssessmentToolItem.deleteMany({});
      console.log('[Seeder] تم مسح البيانات القديمة.');
    }

    let toolsCreated = 0;
    let domainsCreated = 0;
    let itemsCreated = 0;

    for (const toolData of TOOLS_DATA) {
      const { domains, ...toolFields } = toolData;

      // إنشاء المقياس
      const tool = await AssessmentTool.create(toolFields);
      toolsCreated++;

      if (!domains) continue;

      // إنشاء المجالات
      for (const domainData of domains) {
        const { children, items, ...domainFields } = domainData;

        const domain = await AssessmentToolDomain.create({
          ...domainFields,
          tool_id: tool._id,
        });
        domainsCreated++;

        // إنشاء بنود المجال الجذر (للمقاييس التي تحدد بنودها)
        if (items && items.length > 0) {
          const scoringOptions = _getScoringOptions(tool.code);
          const itemDocs = items.map((item, i) => ({
            ...item,
            tool_id: tool._id,
            domain_id: domain._id,
            scoring_options: item.scoring_options || scoringOptions,
            min_score: item.min_score ?? _getMinScore(tool.code),
            max_score: item.max_score ?? _getMaxScore(tool.code),
            allows_half_scores: item.allows_half_scores ?? _allowsHalf(tool.code),
            sort_order: item.sort_order ?? i + 1,
          }));
          await AssessmentToolItem.insertMany(itemDocs);
          itemsCreated += itemDocs.length;
        }

        // إنشاء المجالات الفرعية
        if (children && children.length > 0) {
          for (const childData of children) {
            await AssessmentToolDomain.create({
              ...childData,
              tool_id: tool._id,
              parent_domain_id: domain._id,
            });
            domainsCreated++;
          }
        }
      }

      console.log(`[Seeder] ✅ ${tool.abbreviation} — تم إنشاؤه`);
    }

    console.log(`\n[Seeder] 🎉 اكتملت عملية البذر:
  • المقاييس:    ${toolsCreated}
  • المجالات:    ${domainsCreated}
  • البنود:      ${itemsCreated}`);

    return { success: true, tools: toolsCreated, domains: domainsCreated, items: itemsCreated };
  } catch (err) {
    console.error('[Seeder] ❌ خطأ:', err.message);
    throw err;
  }
}

// ─── دوال مساعدة ──────────────────────────────────────────────────

function _getScoringOptions(toolCode) {
  switch (toolCode) {
    case 'CARS2':
      return CARS_SCORING_OPTIONS;
    case 'GMFM88':
      return GMFM_SCORING_OPTIONS;
    case 'VBMAPP':
      return VBMAPP_SCORING_OPTIONS;
    case 'ABLLS_R':
    case 'AFLS':
      return CRITERION_0_4_OPTIONS;
    default:
      return CARS_SCORING_OPTIONS;
  }
}

function _getMinScore(toolCode) {
  switch (toolCode) {
    case 'GMFM88':
      return 0;
    case 'VBMAPP':
      return 0;
    default:
      return 1;
  }
}

function _getMaxScore(toolCode) {
  switch (toolCode) {
    case 'CARS2':
      return 4;
    case 'GMFM88':
      return 3;
    case 'VBMAPP':
      return 1;
    case 'ABLLS_R':
    case 'AFLS':
      return 4;
    default:
      return 4;
  }
}

function _allowsHalf(toolCode) {
  return toolCode === 'CARS2' || toolCode === 'VBMAPP';
}

// ─── تشغيل مستقل ──────────────────────────────────────────────────
if (require.main === module) {
  const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/rehab_erp';
  mongoose
    .connect(dbUrl)
    .then(async () => {
      console.log('[Seeder] متصل بقاعدة البيانات');
      const force = process.argv.includes('--force');
      await seedAssessmentTools(force);
      await mongoose.disconnect();
      console.log('[Seeder] تم قطع الاتصال');
    })
    .catch(err => {
      console.error('[Seeder] خطأ في الاتصال:', err.message);
      process.exit(1);
    });
}

module.exports = { seedAssessmentTools };
