'use strict';

/**
 * benefits-navigator.lib.js — W469.
 *
 * Pure library mapping family financial situation + beneficiary
 * disability profile to relevant Saudi government benefits + insurance
 * pathways. Per Phase C Innovation 4 (Family Wellbeing).
 *
 * Catalogs the canonical Saudi benefit programs that families of
 * persons with disabilities should be aware of:
 *
 * SOURCES (publicly documented programs):
 *   • Disability Authority (هيئة رعاية الأشخاص ذوي الإعاقة)
 *   • Ministry of Human Resources and Social Development (HRSD)
 *   • General Organization for Social Insurance (GOSI / تأمينات)
 *   • Saudi Health Council / NPHIES insurance coverage
 *   • Sehhaty national health platform integrations
 *
 * Note: this is INFORMATIONAL ONLY. Actual eligibility + amounts
 * depend on annual budget cycles + per-program rules; the family
 * MUST verify with the operating authority. The lib returns POINTERS
 * (program codes + names + descriptionAr) for the Financial Navigator
 * to surface to the family counsellor.
 *
 * Pure functions only.
 */

const BENEFIT_PROGRAMS = Object.freeze([
  {
    code: 'da_monthly_allowance',
    nameAr: 'الإعانة الشهرية لذوي الإعاقة',
    nameEn: 'Disability monthly allowance',
    authority: 'disability_authority',
    descriptionAr: 'إعانة شهرية مقدّمة من هيئة رعاية الأشخاص ذوي الإعاقة للحالات المسجلة',
    eligibilityHints: ['has_disability_card', 'saudi_citizen'],
    pathway: 'authority_app_portal',
  },
  {
    code: 'da_assistive_devices',
    nameAr: 'دعم الأجهزة المساعدة',
    nameEn: 'Assistive devices funding',
    authority: 'disability_authority',
    descriptionAr: 'تمويل أو دعم تكلفة الأجهزة المساعدة (كراسي / سماعات / تواصل)',
    eligibilityHints: ['has_disability_card', 'medical_recommendation'],
    pathway: 'authority_referral_with_prescription',
  },
  {
    code: 'da_transportation_subsidy',
    nameAr: 'بدل المواصلات',
    nameEn: 'Transportation subsidy',
    authority: 'disability_authority',
    descriptionAr: 'بدل لتغطية تكاليف نقل المستفيد إلى جلسات التأهيل',
    eligibilityHints: ['active_rehab_program'],
    pathway: 'authority_app_portal',
  },
  {
    code: 'hrsd_social_security',
    nameAr: 'الضمان الاجتماعي المطوّر',
    nameEn: 'Citizen Account / Social Security',
    authority: 'hrsd',
    descriptionAr: 'برنامج الضمان الاجتماعي للأسر منخفضة الدخل',
    eligibilityHints: ['low_income_household', 'saudi_citizen'],
    pathway: 'absher_application',
  },
  {
    code: 'hrsd_caregiver_leave',
    nameAr: 'إجازة رعاية ذوي الإعاقة (نظام العمل)',
    nameEn: 'Caregiver leave (Labor Law)',
    authority: 'hrsd',
    descriptionAr: 'إجازة سنوية مدفوعة الأجر لرعاية المُعال من ذوي الإعاقة',
    eligibilityHints: ['employed_caregiver', 'has_disability_card'],
    pathway: 'employer_hr_request',
  },
  {
    code: 'nphies_eligibility_check',
    nameAr: 'التحقق من تغطية التأمين الصحي عبر منصة نفيس',
    nameEn: 'NPHIES insurance eligibility check',
    authority: 'nphies',
    descriptionAr: 'فحص تغطية التأمين الصحي لخدمات التأهيل عبر منصة نفيس',
    eligibilityHints: ['has_health_insurance'],
    pathway: 'automated_via_platform',
  },
  {
    code: 'sehhaty_chronic_care_track',
    nameAr: 'مسار الرعاية المستمرة عبر صحتي',
    nameEn: 'Sehhaty chronic care track',
    authority: 'sehhaty',
    descriptionAr: 'إضافة المستفيد إلى مسار الرعاية الصحية المستمرة',
    eligibilityHints: ['chronic_condition', 'sehhaty_account'],
    pathway: 'automated_via_platform',
  },
  {
    code: 'mowaamah_employment',
    nameAr: 'برنامج موائمة للتوظيف',
    nameEn: 'Mowaamah employment program',
    authority: 'hrsd',
    descriptionAr: 'برنامج وطني لتوظيف ذوي الإعاقة في القطاع الخاص',
    eligibilityHints: ['working_age', 'employment_ready'],
    pathway: 'mowaamah_portal',
  },
]);

const AUTHORITIES = ['disability_authority', 'hrsd', 'nphies', 'sehhaty'];

/**
 * Suggest applicable benefit programs based on family profile.
 *
 * @param {Object} profile
 * @param {boolean} [profile.hasDisabilityCard]
 * @param {boolean} [profile.isSaudiCitizen]
 * @param {boolean} [profile.lowIncomeHousehold]
 * @param {boolean} [profile.employedCaregiver]
 * @param {boolean} [profile.hasHealthInsurance]
 * @param {boolean} [profile.activeRehabProgram]
 * @param {boolean} [profile.workingAge]
 * @returns {{ programs: Array, unmetHints: Array }}
 */
function suggestPrograms(profile = {}) {
  const programs = [];
  const allHints = new Set();

  for (const p of BENEFIT_PROGRAMS) {
    const hintMatches = p.eligibilityHints.map(h => {
      switch (h) {
        case 'has_disability_card':
          return profile.hasDisabilityCard === true;
        case 'saudi_citizen':
          return profile.isSaudiCitizen === true;
        case 'low_income_household':
          return profile.lowIncomeHousehold === true;
        case 'employed_caregiver':
          return profile.employedCaregiver === true;
        case 'has_health_insurance':
          return profile.hasHealthInsurance === true;
        case 'active_rehab_program':
          return profile.activeRehabProgram === true;
        case 'medical_recommendation':
          return profile.hasMedicalRecommendation === true;
        case 'chronic_condition':
          return profile.hasChronicCondition === true;
        case 'sehhaty_account':
          return profile.hasSehhatyAccount === true;
        case 'working_age':
          return profile.workingAge === true;
        case 'employment_ready':
          return profile.employmentReady === true;
        default:
          allHints.add(h);
          return null; // unknown hint — neither pass nor fail
      }
    });

    const allKnownPassed = hintMatches.every(m => m === true || m === null);
    const someKnown = hintMatches.some(m => m === true);

    if (allKnownPassed && someKnown) {
      programs.push({
        ...p,
        relevanceScore: hintMatches.filter(m => m === true).length,
      });
    }
  }

  programs.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return { programs, unmetHints: [...allHints] };
}

/**
 * Compute financial stress Likert (1-5, 5=highest) from a budget snapshot.
 * Returns null if insufficient data.
 */
function computeFinancialStress(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const { monthlyIncome, monthlyExpenses, monthlyDisabilityCosts, savingsMonths } = snapshot;
  if (typeof monthlyIncome !== 'number' || typeof monthlyExpenses !== 'number') {
    return null;
  }

  const burdenRatio = monthlyExpenses / Math.max(1, monthlyIncome);
  const disabilityPctIncome =
    typeof monthlyDisabilityCosts === 'number'
      ? monthlyDisabilityCosts / Math.max(1, monthlyIncome)
      : 0;
  const savingsBuffer = typeof savingsMonths === 'number' ? savingsMonths : 0;

  let stress = 1;
  if (burdenRatio >= 1) stress += 2;
  else if (burdenRatio >= 0.85) stress += 1;
  if (disabilityPctIncome >= 0.3) stress += 1;
  else if (disabilityPctIncome >= 0.15) stress += 0.5;
  if (savingsBuffer < 1) stress += 1;
  else if (savingsBuffer < 3) stress += 0.5;

  return Math.max(1, Math.min(5, Math.round(stress)));
}

module.exports = Object.freeze({
  suggestPrograms,
  computeFinancialStress,
  // Constants
  BENEFIT_PROGRAMS,
  AUTHORITIES,
});
