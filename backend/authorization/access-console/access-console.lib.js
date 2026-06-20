'use strict';
/**
 * access-console.lib.js — W1420
 *
 * PURE, read-only serializers over the canonical authorization authority. This
 * is the presentation layer for the IAM console (web-admin /admin/access-control):
 * it makes the EXISTING decision authority VISIBLE; it does NOT add a second one
 * (ADR-035 §4 / ADR-036 — `can.js` stays the one PDP).
 *
 * Sources (single source of truth — never duplicated here):
 *   - permissions.registry.js  → P / META / ROLE_GRANTS / ROLE_DENY / ARCHETYPES
 *   - role-archetype.map.json   → the 46 live roles → 9 archetypes bridge
 *   - can.js                    → THE decision (every allow/deny below routes
 *                                 through it, so the console can never drift
 *                                 from the real PDP)
 *   - roles.constants.js        → ROLE_LEVELS / CROSS_BRANCH_ROLES / region scope
 *
 * No I/O, no Mongoose, deny-biased. Trivially unit-testable.
 */

const reg = require('../permissions.registry');
const archetypeMap = require('../role-archetype.map.json');
const { can, archetypeOf } = require('../can');
const {
  ROLE_LEVELS,
  levelOf,
  CROSS_BRANCH_ROLES,
  REGION_SCOPED_ROLES,
} = require('../../config/constants/roles.constants');

// ── Display metadata (Arabic-first; the live UI is RTL) ────────────────────

/** permission domain (1st segment of `domain:resource:action`) → Arabic label. */
const DOMAIN_LABELS_AR = Object.freeze({
  dashboard: 'لوحات المعلومات',
  branch: 'الفروع والتنظيم',
  beneficiary: 'المستفيدون',
  assessment: 'التقييمات',
  treatment_plan: 'الخطط العلاجية',
  session: 'الجلسات',
  appointment: 'المواعيد',
  attendance: 'الحضور',
  employee: 'الموظفون',
  hr: 'الموارد البشرية',
  report: 'التقارير',
  approval: 'الموافقات',
  user: 'المستخدمون والحسابات',
  rbac: 'سياسات الصلاحيات',
  audit: 'سجل التدقيق',
});

/** archetype NAME → Arabic label. */
const ARCHETYPE_LABELS_AR = Object.freeze({
  HQ_ADMIN: 'مدير المركز الرئيسي (تقني)',
  EXECUTIVE_DIRECTOR: 'الإدارة التنفيذية',
  BRANCH_MANAGER: 'مدير الفرع',
  UNIT_SUPERVISOR: 'مشرف وحدة / قسم',
  THERAPIST: 'أخصائي / مُمارس سريري',
  RECEPTIONIST: 'الاستقبال / إدخال البيانات',
  HR_OFFICER: 'الموارد البشرية',
  FINANCE_OFFICER: 'الشؤون المالية',
  AUDITOR: 'التدقيق / الالتزام (قراءة فقط)',
  NON_MATRIX: 'خارج مصفوفة الموظفين (خارجي / نقل)',
});

/** live role → Arabic label (covers all 46 mapped roles). */
const ROLE_LABELS_AR = Object.freeze({
  super_admin: 'مدير النظام الأعلى',
  head_office_admin: 'مدير الإدارة العامة',
  it_admin: 'مدير تقنية المعلومات',
  ceo: 'الرئيس التنفيذي',
  group_gm: 'المدير العام للمجموعة',
  regional_director: 'المدير الإقليمي',
  admin: 'مدير',
  manager: 'مدير عام (فرع)',
  branch_manager: 'مدير الفرع',
  clinical_director: 'المدير السريري',
  supervisor: 'مشرف',
  therapy_supervisor: 'مشرف العلاج',
  special_ed_supervisor: 'مشرف التربية الخاصة',
  doctor: 'طبيب',
  therapist: 'أخصائي علاجي',
  therapist_slp: 'أخصائي تخاطب',
  therapist_ot: 'أخصائي علاج وظيفي',
  therapist_pt: 'أخصائي علاج طبيعي',
  therapist_psych: 'أخصائي نفسي',
  teacher: 'معلم تربية خاصة',
  special_ed_teacher: 'معلم تربية خاصة',
  therapy_assistant: 'مساعد علاجي',
  receptionist: 'موظف استقبال',
  data_entry: 'مُدخل بيانات',
  group_chro: 'مدير الموارد البشرية للمجموعة',
  hr_manager: 'مدير الموارد البشرية',
  hr_supervisor: 'مشرف الموارد البشرية',
  hr_officer: 'موظف موارد بشرية',
  hr: 'موارد بشرية',
  group_cfo: 'المدير المالي للمجموعة',
  finance_supervisor: 'مشرف مالي',
  finance: 'موظف مالي',
  accountant: 'محاسب',
  internal_auditor: 'مدقق داخلي',
  compliance_officer: 'مسؤول الالتزام',
  group_quality_officer: 'مسؤول الجودة للمجموعة',
  regional_quality: 'مسؤول الجودة الإقليمي',
  quality_coordinator: 'منسق الجودة',
  parent: 'ولي أمر',
  guardian: 'وصي',
  student: 'طالب',
  viewer: 'مُشاهد',
  user: 'مستخدم',
  guest: 'زائر',
  driver: 'سائق',
  bus_assistant: 'مرافق حافلة',
  nurse: 'ممرض',
  head_nurse: 'رئيس التمريض',
  nursing_supervisor: 'مشرف التمريض',
  dpo: 'مسؤول حماية البيانات',
  family_counsellor: 'مستشار أسري',
  independent_advocate: 'مُناصر مستقل',
  cultural_officer: 'مسؤول التكيّف الثقافي',
  patient_relations_officer: 'موظف علاقات المستفيدين',
  crm_supervisor: 'مشرف علاقات العملاء',
});

/** assurance tier (ADR-019) → Arabic label. */
const TIER_LABELS_AR = Object.freeze({
  1: 'أساسي',
  2: 'حساس (تحقق ثنائي)',
  3: 'حرج (تحقق مشدّد)',
});

/** scope code (role-archetype.map.json) → Arabic label. */
const SCOPE_LABELS_AR = Object.freeze({
  G: 'كل الفروع',
  regional: 'إقليمي',
  B: 'الفرع',
  U: 'الوحدة / القسم',
  S: 'الحالات المُسندة',
  self: 'سجلاته فقط',
  none: 'بدون نطاق',
});

// ── Helpers ────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = reg.ALL; // Object.values(P) — never hardcode a count
const MAP_ENTRIES = (archetypeMap.map || []).slice();

/** first `:`-segment of a permission key. */
function domainOf(key) {
  return String(key).split(':')[0];
}

/** structured `{ domain, resource, action }` for a permission key. */
function partsOf(key) {
  const [domain, resource, action] = String(key).split(':');
  return { domain, resource: resource || '', action: action || '' };
}

/** META + display sugar for one permission key. */
function permissionMeta(key) {
  const m = reg.META[key] || { tier: null, phi: false, hqOnly: false, sod: null };
  const { domain, resource, action } = partsOf(key);
  return {
    key,
    domain,
    domainLabelAr: DOMAIN_LABELS_AR[domain] || domain,
    resource,
    action,
    tier: m.tier,
    tierLabelAr: m.tier ? TIER_LABELS_AR[m.tier] || null : null,
    phi: !!m.phi,
    hqOnly: !!m.hqOnly,
    sod: m.sod || null,
  };
}

/** archetype codes that GRANT a permission key (deny-aware). */
function archetypesGranting(key) {
  return Object.keys(reg.ARCHETYPES).filter(code => reg.can(code, key).allow);
}

// ── Public serializers ─────────────────────────────────────────────────────

/** counts for the console landing page. */
function overview() {
  const phiCount = ALL_PERMISSIONS.filter(k => reg.META[k] && reg.META[k].phi).length;
  const tierCounts = { 1: 0, 2: 0, 3: 0, none: 0 };
  ALL_PERMISSIONS.forEach(k => {
    const t = reg.META[k] && reg.META[k].tier;
    if (t === 1 || t === 2 || t === 3) tierCounts[t] += 1;
    else tierCounts.none += 1;
  });
  return {
    roles: MAP_ENTRIES.length,
    archetypes: Object.keys(reg.ARCHETYPES).length,
    permissions: ALL_PERMISSIONS.length,
    domains: Object.keys(DOMAIN_LABELS_AR).length,
    phiPermissions: phiCount,
    crossBranchRoles: CROSS_BRANCH_ROLES.length,
    tierCounts,
    decisionEngine: 'backend/authorization/can.js',
  };
}

/** the 9 archetypes with grant / deny counts. */
function listArchetypes() {
  return Object.entries(reg.ARCHETYPES).map(([code, name]) => ({
    code,
    name,
    labelAr: ARCHETYPE_LABELS_AR[name] || name,
    grantCount: Object.keys(reg.ROLE_GRANTS[code] || {}).length,
    denyCount: (reg.ROLE_DENY[code] || []).length,
  }));
}

/** count of permissions a live role effectively holds (via can.js). */
function effectiveGrantCount(role) {
  return ALL_PERMISSIONS.reduce((n, k) => (can({ role }, k).allow ? n + 1 : n), 0);
}

/** the 46 live roles, each enriched with archetype + scope + level + count. */
function listRoles() {
  return MAP_ENTRIES.map(e => {
    const role = e.live;
    const a = archetypeOf(role);
    return {
      role,
      labelAr: ROLE_LABELS_AR[role] || role,
      archetype: e.archetype,
      archetypeCode: a ? a.code : null,
      archetypeLabelAr: ARCHETYPE_LABELS_AR[e.archetype] || e.archetype,
      scope: e.scope,
      scopeLabelAr: SCOPE_LABELS_AR[e.scope] || e.scope,
      seniority: e.seniority || null,
      approver: !!e.approver,
      level: ROLE_LEVELS[role] != null ? ROLE_LEVELS[role] : levelOf(role),
      crossBranch: CROSS_BRANCH_ROLES.includes(role),
      regionScoped: REGION_SCOPED_ROLES.includes(role),
      note: e.note || null,
      permissionCount: effectiveGrantCount(role),
    };
  });
}

/**
 * full effective-permission breakdown for one live role, grouped by domain.
 * Every item's allow/reason/scope comes straight from can.js.
 */
function roleDetail(role) {
  const entry = MAP_ENTRIES.find(e => String(e.live).toLowerCase() === String(role).toLowerCase());
  const a = archetypeOf(role);

  const byDomain = {};
  let granted = 0;
  let phiGranted = 0;
  let tier3Granted = 0;

  ALL_PERMISSIONS.forEach(key => {
    const verdict = can({ role }, key);
    const meta = permissionMeta(key);
    const item = {
      ...meta,
      allow: verdict.allow,
      reason: verdict.reason,
      scope: verdict.allow ? verdict.scope || null : null,
    };
    if (verdict.allow) {
      granted += 1;
      if (meta.phi) phiGranted += 1;
      if (meta.tier === 3) tier3Granted += 1;
    }
    const d = meta.domain;
    if (!byDomain[d]) {
      byDomain[d] = { domain: d, domainLabelAr: DOMAIN_LABELS_AR[d] || d, items: [] };
    }
    byDomain[d].items.push(item);
  });

  // Order domains by DOMAIN_LABELS_AR declaration order, then any extras.
  const order = Object.keys(DOMAIN_LABELS_AR);
  const domains = Object.values(byDomain).sort(
    (x, y) => (order.indexOf(x.domain) + 1 || 999) - (order.indexOf(y.domain) + 1 || 999)
  );

  return {
    role,
    labelAr: ROLE_LABELS_AR[role] || role,
    mapped: !!entry,
    archetype: a ? a.name : null,
    archetypeCode: a ? a.code : null,
    archetypeLabelAr: a ? ARCHETYPE_LABELS_AR[a.name] || a.name : null,
    scope: entry ? entry.scope : a ? a.scope : null,
    scopeLabelAr: entry ? SCOPE_LABELS_AR[entry.scope] || entry.scope : null,
    seniority: entry ? entry.seniority || null : null,
    approver: a ? !!a.approver : false,
    level: ROLE_LEVELS[role] != null ? ROLE_LEVELS[role] : levelOf(role),
    crossBranch: CROSS_BRANCH_ROLES.includes(role),
    regionScoped: REGION_SCOPED_ROLES.includes(role),
    note: entry ? entry.note || null : null,
    summary: {
      total: ALL_PERMISSIONS.length,
      granted,
      denied: ALL_PERMISSIONS.length - granted,
      phiGranted,
      tier3Granted,
    },
    domains,
  };
}

/** the full permission catalog with META + which archetypes/roles grant each. */
function listPermissions() {
  const rolesByArchetype = {};
  MAP_ENTRIES.forEach(e => {
    const a = archetypeOf(e.live);
    if (!a || !a.code) return;
    (rolesByArchetype[a.code] = rolesByArchetype[a.code] || []).push(e.live);
  });
  return ALL_PERMISSIONS.map(key => {
    const codes = archetypesGranting(key);
    return {
      ...permissionMeta(key),
      grantedByArchetypes: codes,
      grantedByRoleCount: codes.reduce((n, c) => n + (rolesByArchetype[c] || []).length, 0),
    };
  });
}

/** detail for one permission: who grants it, who is explicitly denied. */
function permissionDetail(key) {
  if (!reg.META[key]) return null;
  const granting = Object.entries(reg.ARCHETYPES)
    .map(([code, name]) => {
      const v = reg.can(code, key);
      return v.allow ? { code, name, labelAr: ARCHETYPE_LABELS_AR[name] || name, scope: v.scope } : null;
    })
    .filter(Boolean);
  const denying = Object.entries(reg.ARCHETYPES)
    .filter(([code]) => (reg.ROLE_DENY[code] || []).includes(key))
    .map(([code, name]) => ({ code, name, labelAr: ARCHETYPE_LABELS_AR[name] || name }));
  return { ...permissionMeta(key), grantingArchetypes: granting, denyingArchetypes: denying };
}

/** archetype × permission grid for the matrix view. */
function buildMatrix() {
  const archetypes = Object.entries(reg.ARCHETYPES).map(([code, name]) => ({
    code,
    name,
    labelAr: ARCHETYPE_LABELS_AR[name] || name,
  }));
  const permissions = ALL_PERMISSIONS.map(permissionMeta);
  const cells = {};
  archetypes.forEach(({ code }) => {
    cells[code] = {};
    ALL_PERMISSIONS.forEach(key => {
      const v = reg.can(code, key);
      cells[code][key] = v.allow
        ? { allow: true, scope: v.scope || null }
        : { allow: false, reason: v.reason };
    });
  });
  return { archetypes, permissions, cells };
}

/**
 * Access simulator — answers "can this role do X, and why?" THROUGH can.js.
 * @param {string} role        a live role name
 * @param {string} permission  a canonical permission key
 */
function simulate(role, permission) {
  const verdict = can({ role }, permission);
  const a = archetypeOf(role);
  return {
    role,
    roleLabelAr: ROLE_LABELS_AR[role] || role,
    permission,
    permissionKnown: !!reg.META[permission],
    meta: reg.META[permission] ? permissionMeta(permission) : null,
    archetype: a ? a.name : null,
    archetypeLabelAr: a ? ARCHETYPE_LABELS_AR[a.name] || a.name : null,
    allow: verdict.allow,
    reason: verdict.reason,
    reasonLabelAr: REASON_LABELS_AR[verdict.reason] || verdict.reason,
    tier: verdict.tier != null ? verdict.tier : null,
    scope: verdict.allow ? verdict.scope || verdict.archetypeScope || null : null,
  };
}

/** decision reason code → Arabic explanation (mirrors can.js return reasons). */
const REASON_LABELS_AR = Object.freeze({
  granted: 'مسموح',
  'explicit-deny': 'ممنوع صراحةً (Deny يتجاوز المنح)',
  ungranted: 'غير ممنوح لهذا النوع',
  'unknown-permission': 'صلاحية غير معروفة',
  'unmapped-role': 'دور غير مُعرَّف في المصفوفة',
  'non-matrix': 'دور خارج مصفوفة الموظفين',
  'not-approver': 'يتطلب صلاحية اعتماد (Approver)',
});

module.exports = {
  // serializers
  overview,
  listArchetypes,
  listRoles,
  roleDetail,
  listPermissions,
  permissionDetail,
  buildMatrix,
  simulate,
  // pure helpers (exported for tests + the routes layer)
  domainOf,
  partsOf,
  permissionMeta,
  archetypesGranting,
  effectiveGrantCount,
  // label maps (exported so the user-effective route can reuse them)
  DOMAIN_LABELS_AR,
  ARCHETYPE_LABELS_AR,
  ROLE_LABELS_AR,
  TIER_LABELS_AR,
  SCOPE_LABELS_AR,
  REASON_LABELS_AR,
  ALL_PERMISSIONS,
};
