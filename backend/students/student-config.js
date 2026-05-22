'use strict';

/**
 * student-config.js — extracted from students/student-service.js.
 *
 * Pure-data configuration: student statuses, disability types +
 * subtypes, severity levels, rehabilitation programs, days of week,
 * shift periods. Bilingual labels (AR/EN).
 *
 * Adding a new program or status: edit here, no service-class change
 * needed. The exports preserve the legacy  identifier
 * so existing call sites (and the module.exports of student-service.js)
 * keep working unchanged.
 */

/**
 * Student Configuration
 */
const studentConfig = {
  // حالات الطالب
  studentStatuses: {
    active: { label: 'نشط', color: 'green' },
    inactive: { label: 'غير نشط', color: 'gray' },
    suspended: { label: 'موقوف', color: 'yellow' },
    graduated: { label: 'تخرج', color: 'blue' },
    transferred: { label: 'منقول', color: 'purple' },
    waiting: { label: 'قائمة انتظار', color: 'orange' },
  },

  // أنواع الإعاقة
  disabilityTypes: {
    physical: {
      label: 'إعاقة حركية',
      code: 'PH',
      subtypes: ['شلل سفلي', 'شلل رباعي', 'بتر', 'ضمور عضلي', 'شلل دماغي'],
    },
    visual: {
      label: 'إعاقة بصرية',
      code: 'VI',
      subtypes: ['كفيف', 'ضعف بصر شديد', 'ضعف بصر متوسط'],
    },
    hearing: {
      label: 'إعاقة سمعية',
      code: 'HI',
      subtypes: ['صمم كامل', 'ضعف سمع شديد', 'ضعف سمع متوسط'],
    },
    intellectual: {
      label: 'إعاقة ذهنية',
      code: 'ID',
      subtypes: ['بسيطة', 'متوسطة', 'شديدة', 'شديدة جداً'],
    },
    autism: {
      label: 'اضطراب طيف التوحد',
      code: 'ASD',
      subtypes: ['مستوى 1', 'مستوى 2', 'مستوى 3'],
    },
    learning: {
      label: 'صعوبات تعلم',
      code: 'LD',
      subtypes: ['ديسليكسيا', 'ديسكالكوليا', 'ديسجرافيا', 'ADHD'],
    },
    speech: {
      label: 'اضطرابات نطق ولغة',
      code: 'SL',
      subtypes: ['تأخر لغوي', 'لثغة', 'تلعثم', 'حبسة'],
    },
    multiple: {
      label: 'إعاقات متعددة',
      code: 'MD',
      subtypes: ['متعددة'],
    },
  },

  // مستوى شدة الإعاقة
  severityLevels: {
    mild: { label: 'بسيط', percentage: 25 },
    moderate: { label: 'متوسط', percentage: 50 },
    severe: { label: 'شديد', percentage: 75 },
    profound: { label: 'شديد جداً', percentage: 100 },
  },

  // البرامج التأهيلية
  programs: {
    physical_therapy: { label: 'علاج طبيعي', code: 'PT' },
    occupational_therapy: { label: 'علاج وظيفي', code: 'OT' },
    speech_therapy: { label: 'علاج نطق', code: 'ST' },
    behavioral_therapy: { label: 'علاج سلوكي', code: 'BT' },
    special_education: { label: 'تربية خاصة', code: 'SE' },
    vocational_training: { label: 'تأهيل مهني', code: 'VT' },
    social_skills: { label: 'مهارات اجتماعية', code: 'SS' },
    daily_living: { label: 'مهارات حياتية', code: 'DL' },
    cognitive_training: { label: 'تدريب معرفي', code: 'CT' },
    sensory_integration: { label: 'تكامل حسي', code: 'SI' },
  },

  // أيام الأسبوع
  weekDays: {
    sun: { label: 'الأحد', index: 0 },
    mon: { label: 'الاثنين', index: 1 },
    tue: { label: 'الثلاثاء', index: 2 },
    wed: { label: 'الأربعاء', index: 3 },
    thu: { label: 'الخميس', index: 4 },
  },

  // فترات الدوام
  shifts: {
    morning: { label: 'صباحية', start: '07:00', end: '12:00' },
    evening: { label: 'مسائية', start: '13:00', end: '18:00' },
    full: { label: 'يوم كامل', start: '07:00', end: '18:00' },
  },
};

module.exports = { studentConfig };
