'use strict';

/**
 * productivity-features.registry.js — Wave 25.
 *
 * Catalog of premium productivity features. Each entry is metadata
 * the UI reads to decide placement, eligibility, and trigger. The
 * registry is the contract — Wave 26 UI doesn't hard-code where
 * features live; it reads this catalog.
 *
 * See `docs/blueprint/33-premium-productivity-features.md`.
 */

const STATUSES = Object.freeze(['ready', 'partial', 'planned']);
const TRIGGER_TYPES = Object.freeze([
  'scheduled', // auto-fires on a cron-like schedule
  'on-demand', // user invokes (button click)
  'event-driven', // fires when another event happens
  'shortcut', // keyboard shortcut
]);

const FEATURES = Object.freeze({
  'morning-briefing': {
    titleAr: 'ملخص الصباح',
    titleEn: 'Morning briefing',
    category: 'briefing',
    valueAr:
      'ملخص ثنائي اللغة يقرأه المسؤول في دقيقتين كل صباح. يكشف التنبيهات الحرجة الليلية والقرارات المعلّقة. يحل محل التنقل بين عدة لوحات.',
    valueEn:
      'Two-minute bilingual digest the operator reads each morning. Surfaces overnight critical alerts + pending decisions. Replaces multi-dashboard scrolling.',
    placement: 'landing-card-top',
    triggerType: 'scheduled',
    triggerSpec: { cron: '0 6 * * *', tz: 'Asia/Riyadh' },
    roleGroups: [
      'executive_leadership',
      'head_office',
      'branch_manager',
      'clinical_supervisor',
      'finance',
      'hr',
      'quality_compliance',
      'therapist',
      'reception',
    ],
    status: 'ready',
    persistsAt: '/briefings/morning/:date',
    generatorId: 'morning-briefing.v1',
  },

  'end-of-day-wrap-up': {
    titleAr: 'ملخص نهاية اليوم',
    titleEn: 'End-of-day wrap-up',
    category: 'briefing',
    valueAr:
      'في الساعة 5 مساءً: ماذا أُنجز اليوم، ماذا تأجّل، ما التنبيهات المفتوحة، ماذا يحتاج اعتمادك قبل المغادرة. طقس إغلاق يومي.',
    valueEn:
      'At 5 pm: what was achieved today, what was deferred, what alerts remain open, what needs your sign-off before leaving. Clean-desk closure ritual.',
    placement: 'landing-card-afternoon',
    triggerType: 'scheduled',
    triggerSpec: { cron: '30 16 * * *', tz: 'Asia/Riyadh' },
    roleGroups: ['branch_manager', 'clinical_supervisor', 'therapist', 'finance', 'reception'],
    status: 'ready',
    persistsAt: '/briefings/eod/:date',
    generatorId: 'end-of-day.v1',
  },

  'weekly-executive-digest': {
    titleAr: 'ملخص تنفيذي أسبوعي',
    titleEn: 'Weekly executive digest',
    category: 'briefing',
    valueAr:
      'كل يوم اثنين 7 صباحاً: الأسبوع الماضي مقارنة بالسابق. تفسيرات بمستوى Insight لا فروقات خام. يُصدّر إلى PDF / DOCX لاجتماعات المجلس.',
    valueEn:
      'Every Monday 7 am: last week vs. previous week. Insight-grade explanations (not raw deltas). Exports to PDF/DOCX for board meetings.',
    placement: 'executive-landing-monday',
    triggerType: 'scheduled',
    triggerSpec: { cron: '0 7 * * 1', tz: 'Asia/Riyadh' },
    roleGroups: ['executive_leadership', 'head_office'],
    status: 'ready',
    persistsAt: '/briefings/weekly/:weekNumber',
    generatorId: 'executive-digest.v1',
  },

  'saved-views': {
    titleAr: 'العروض المحفوظة',
    titleEn: 'Saved views',
    category: 'personalization',
    valueAr: 'احفظ مجموعة فلاتر تحت اسم وارجع إليها بنقرة. كل عرض له رابط مشاركة.',
    valueEn:
      'Save a filter set under a name, return to it with one click. Each view has a sharable URL.',
    placement: 'dashboard-header-dropdown',
    triggerType: 'on-demand',
    roleGroups: 'all',
    status: 'ready',
    storedIn: 'UserPreferences.savedViews',
  },

  'dashboard-presets': {
    titleAr: 'إعدادات اللوحة الشخصية',
    titleEn: 'Personalized dashboard presets',
    category: 'personalization',
    valueAr:
      'الكثافة، السكاكشن المطوية، التاريخ الافتراضي — تحفظ لكل مستخدم. تجاوز ذكي لإعدادات الدور.',
    valueEn:
      'Density, collapsed sections, default date range — persisted per user. Smart override of role defaults.',
    placement: 'settings-side-panel',
    triggerType: 'on-demand',
    roleGroups: 'all',
    status: 'ready',
    storedIn: 'UserPreferences.dashboardPresets',
  },

  'pinned-widgets': {
    titleAr: 'المؤشرات المثبتة',
    titleEn: 'Pinned widgets',
    category: 'personalization',
    valueAr: 'ثبّت أي widget على لوحتك. حد أقصى 6 (الواجهة تمنع الازدحام). يظهر تحت بطاقة الصباح.',
    valueEn:
      'Pin any widget to your dashboard. Max 6 (UI enforces — no clutter). Renders below the morning briefing.',
    placement: 'landing-pinned-row',
    triggerType: 'on-demand',
    roleGroups: 'all',
    status: 'ready',
    storedIn: 'UserPreferences.pinnedWidgets',
    maxItems: 6,
  },

  'quick-action-center': {
    titleAr: 'مركز الإجراءات السريعة',
    titleEn: 'Quick action center',
    category: 'productivity',
    valueAr: 'Ctrl+K يفتح لوحة بحث ضبابي لجميع الإجراءات المسموحة لدورك. ينفذ في ضغطة.',
    valueEn:
      'Ctrl+K opens a fuzzy palette of every action your role can take. One keystroke to execute.',
    placement: 'global-shortcut',
    triggerType: 'shortcut',
    triggerSpec: { keyboardShortcut: 'Ctrl+K' },
    roleGroups: 'all',
    status: 'ready',
    actionsFrom: 'role-profiles.registry.quickActions',
  },

  'kpi-annotations': {
    titleAr: 'تعليقات داخلية على المؤشرات',
    titleEn: 'KPI annotations',
    category: 'collaboration',
    valueAr:
      'ملاحظات نصية على KPI. يحل محل المعرفة القبلية في WhatsApp. كل تعليق يُسجّل في AuditLog.',
    valueEn:
      'Text notes on any KPI. Replaces tribal knowledge in WhatsApp. Every comment AuditLogged.',
    placement: 'kpi-card-drawer',
    triggerType: 'on-demand',
    roleGroups: 'all',
    status: 'ready',
    modelName: 'Annotation',
  },

  'handoff-notes': {
    titleAr: 'ملاحظات التسليم بين الفرق',
    titleEn: 'Team handoff notes',
    category: 'collaboration',
    valueAr:
      'ملاحظة من فريق إلى فريق عند تسليم النوبة. تظهر في ملخص الصباح للمستلِم. تسد فجوة "نسيت أخبره".',
    valueEn:
      'Note from team to team at shift change. Surfaces in the recipient\'s morning briefing. Closes the "I forgot to mention" gap.',
    placement: 'beneficiary-record-side + /handoffs',
    triggerType: 'on-demand',
    roleGroups: ['therapist', 'clinical_supervisor', 'reception', 'branch_manager'],
    status: 'ready',
    modelName: 'HandoffNote',
  },

  'printable-summaries': {
    titleAr: 'تقارير تنفيذية قابلة للطباعة',
    titleEn: 'Printable executive summaries',
    category: 'reporting',
    valueAr: 'زر "طباعة" على كل لوحة ينتج PDF عربي RTL منسق في 5 ثوانٍ. مثالي للقاءات مع المجلس.',
    valueEn:
      'A "Print" button on every dashboard generates a polished Arabic RTL PDF in 5 seconds. Board-ready.',
    placement: 'dashboard-header-button',
    triggerType: 'on-demand',
    roleGroups: ['executive_leadership', 'head_office', 'branch_manager'],
    status: 'partial', // backend ready; UI library Wave 26
    rendererSpec: { format: 'pdf', rtl: true, fontFamily: 'Cairo, Tajawal' },
  },

  'follow-up-queue': {
    titleAr: 'قائمة المتابعة التشغيلية',
    titleEn: 'Operational follow-up queue',
    category: 'productivity',
    valueAr: 'كل تأكيد أو ack ينشئ متابعة. القائمة هي دفتر المحاسبة الشخصي للمسؤول.',
    valueEn:
      "Every confirm/ack creates a follow-up. The queue is the operator's personal accountability ledger.",
    placement: '/me/follow-ups + topnav chip',
    triggerType: 'event-driven',
    triggerSpec: { events: ['alert.acknowledge', 'insight.confirm'] },
    roleGroups: 'all',
    status: 'ready',
    modelName: 'FollowUp',
    defaultDueByHours: 24,
  },

  watchlists: {
    titleAr: 'قوائم المراقبة',
    titleEn: 'Watchlists',
    category: 'personalization',
    valueAr:
      'قائمة كيانات شخصية يراقبها المستخدم. يظهر مؤشر "1 من قائمتك واجه حالة حرجة" في الصباح.',
    valueEn:
      'Personal list of entities the user watches. "1 from your watchlist hit a critical condition" appears in the morning briefing.',
    placement: '/me/watchlists + briefing-block',
    triggerType: 'on-demand',
    roleGroups: 'all',
    status: 'ready',
    modelName: 'Watchlist',
    supportedEntityTypes: ['Beneficiary', 'Employee', 'Invoice', 'Complaint', 'Incident'],
  },

  'branch-scorecards': {
    titleAr: 'بطاقات أداء الفروع',
    titleEn: 'Branch scorecards',
    category: 'reporting',
    valueAr: 'بطاقة واحدة لكل فرع تلخص 12 مؤشر أساسي + درجة + لون. للمراجعات الشهرية.',
    valueEn:
      'One-page per-branch scorecard summarizing the 12 priority KPIs + score + tier color. For monthly reviews.',
    placement: '/scorecards/branches[/:branchId]',
    triggerType: 'on-demand',
    roleGroups: ['executive_leadership', 'head_office', 'branch_manager'],
    status: 'partial', // Phase 16 base; Wave 25 adds printable + compare
    aggregatorRef: 'kpi.registry + branch.performance',
  },

  'exception-review-center': {
    titleAr: 'مركز مراجعة الاستثناءات',
    titleEn: 'Exception review center',
    category: 'productivity',
    valueAr:
      'مركز للاجتماعات الأسبوعية. كل تنبيه حرج + كل insight مرفوض + كل شكوى مصعّدة في الأسبوع الماضي. للمراجعة الأسبوعية.',
    valueEn:
      'A weekly meeting hub. Every critical alert + dismissed insight + escalated complaint from the past week — laid out for review.',
    placement: '/exceptions/review-center',
    triggerType: 'scheduled',
    triggerSpec: { cron: '0 9 * * 0', tz: 'Asia/Riyadh' }, // Sunday 9 am
    roleGroups: ['branch_manager', 'clinical_supervisor', 'quality_compliance'],
    status: 'ready',
    aggregatorRef: 'alerts + insights + complaints over 7d',
  },
});

function listFeatureKeys() {
  return Object.keys(FEATURES);
}

function getFeature(key) {
  return FEATURES[key] || null;
}

function listForRoleGroup(roleGroup) {
  return listFeatureKeys().filter(k => {
    const f = FEATURES[k];
    if (f.roleGroups === 'all') return true;
    return Array.isArray(f.roleGroups) && f.roleGroups.includes(roleGroup);
  });
}

module.exports = {
  FEATURES,
  STATUSES,
  TRIGGER_TYPES,
  listFeatureKeys,
  getFeature,
  listForRoleGroup,
};
