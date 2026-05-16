'use strict';

/**
 * OnboardingChecklist.js — structured onboarding/offboarding workflow.
 * One doc per employee per flow (onboarding or offboarding).
 */
const mongoose = require('mongoose');

const ChecklistItemSchema = new mongoose.Schema(
  {
    _id: false,
    key: { type: String, required: true, maxlength: 100 }, // 'collect_iqama_copy'
    label: { type: String, required: true, maxlength: 200 },
    ownerRole: {
      type: String,
      enum: ['hr', 'manager', 'it', 'finance', 'employee'],
      default: 'hr',
    },
    required: { type: Boolean, default: true },
    completedAt: { type: Date, default: null },
    completedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedByName: { type: String, default: null },
    notes: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const OnboardingChecklistSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    flow: { type: String, enum: ['onboarding', 'offboarding'], required: true, index: true },
    startedAt: { type: Date, default: Date.now },
    targetCompletionDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'overdue'],
      default: 'active',
      index: true,
    },
    items: { type: [ChecklistItemSchema], default: [] },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true, collection: 'hr_onboarding_checklists' }
);

OnboardingChecklistSchema.virtual('completionPercent').get(function () {
  if (!this.items || this.items.length === 0) return 0;
  const done = this.items.filter(i => i.completedAt).length;
  return Math.round((done / this.items.length) * 100);
});

OnboardingChecklistSchema.set('toJSON', { virtuals: true });
OnboardingChecklistSchema.set('toObject', { virtuals: true });

// Default onboarding template (HR can override per employee)
OnboardingChecklistSchema.statics.DEFAULT_ONBOARDING_ITEMS = [
  { key: 'employment_contract_signed', label: 'توقيع عقد العمل', ownerRole: 'hr', required: true },
  {
    key: 'national_id_collected',
    label: 'استلام صورة الهوية / الإقامة',
    ownerRole: 'hr',
    required: true,
  },
  {
    key: 'gosi_registered',
    label: 'تسجيل في التأمينات الاجتماعية (GOSI)',
    ownerRole: 'hr',
    required: true,
  },
  {
    key: 'bank_account_setup',
    label: 'فتح حساب بنكي + IBAN للراتب',
    ownerRole: 'finance',
    required: true,
  },
  { key: 'badge_issued', label: 'إصدار بطاقة الموظف', ownerRole: 'hr', required: true },
  { key: 'laptop_assigned', label: 'تسليم لابتوب + جوال', ownerRole: 'it', required: false },
  {
    key: 'email_account_created',
    label: 'إنشاء حساب البريد الإلكتروني',
    ownerRole: 'it',
    required: true,
  },
  { key: 'system_access_granted', label: 'منح صلاحيات الأنظمة', ownerRole: 'it', required: true },
  { key: 'orientation_session', label: 'جلسة التعريف بالشركة', ownerRole: 'hr', required: true },
  {
    key: 'mandatory_training_completed',
    label: 'إكمال التدريب الإلزامي (سلامة + جودة)',
    ownerRole: 'hr',
    required: true,
  },
  {
    key: 'first_week_checkin',
    label: 'لقاء مع المدير المباشر (أسبوع 1)',
    ownerRole: 'manager',
    required: true,
  },
];

OnboardingChecklistSchema.statics.DEFAULT_OFFBOARDING_ITEMS = [
  {
    key: 'resignation_letter',
    label: 'استلام خطاب الاستقالة / إنهاء الخدمة',
    ownerRole: 'hr',
    required: true,
  },
  { key: 'exit_interview', label: 'مقابلة الخروج', ownerRole: 'hr', required: true },
  { key: 'knowledge_transfer', label: 'نقل المهام والمعرفة', ownerRole: 'manager', required: true },
  { key: 'badge_returned', label: 'إعادة بطاقة الموظف', ownerRole: 'hr', required: true },
  {
    key: 'laptop_returned',
    label: 'إعادة اللابتوب + الجوال + المعدات',
    ownerRole: 'it',
    required: false,
  },
  { key: 'system_access_revoked', label: 'إلغاء صلاحيات الأنظمة', ownerRole: 'it', required: true },
  { key: 'email_archived', label: 'أرشفة البريد الإلكتروني', ownerRole: 'it', required: true },
  {
    key: 'final_settlement',
    label: 'احتساب مكافأة نهاية الخدمة + التسوية النهائية',
    ownerRole: 'finance',
    required: true,
  },
  {
    key: 'gosi_deregistered',
    label: 'إلغاء التسجيل في التأمينات',
    ownerRole: 'hr',
    required: true,
  },
  { key: 'experience_certificate', label: 'إصدار شهادة الخبرة', ownerRole: 'hr', required: false },
];

module.exports =
  mongoose.models.HrOnboardingChecklist ||
  mongoose.model('HrOnboardingChecklist', OnboardingChecklistSchema);
