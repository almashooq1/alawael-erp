/**
 * Registry of read-only detail views, powering <EntityDetailPage> routes
 * (see AuthenticatedShell). Fixes dashboard row/view links that navigated to
 * `/x/:id` detail routes that did not exist (404s).
 *
 * Each getBase + ":id" was smoke-tested on prod (GET resolves, non-404).
 * Static "/new" create routes outrank these dynamic ":id" routes in RR v6.
 */
const DETAIL_VIEWS = {
  'ar-rehab/:id': { getBase: '/ar-vr', backTo: '/ar-rehab', title: 'تفاصيل جلسة الواقع المعزّز/الافتراضي' },
  'audit/:id': { getBase: '/internal-audit/audit-plans', backTo: '/audit', title: 'تفاصيل خطة التدقيق' },
  'cms/content/:id': { getBase: '/cms/pages', backTo: '/cms', title: 'تفاصيل المحتوى' },
  'community/activities/:id': { getBase: '/community-integration/activities', backTo: '/community', title: 'تفاصيل النشاط المجتمعي' },
  'crisis/incidents/:id': { getBase: '/crisis/incidents', backTo: '/crisis', title: 'تفاصيل الحادثة الطارئة' },
  'documents/:id': { getBase: '/documents', backTo: '/documents', title: 'تفاصيل المستند' },
  'facility/:id': { getBase: '/facilities/rooms', backTo: '/facility', title: 'تفاصيل المرفق' },
  'gps-tracking/vehicles/:id': { getBase: '/vehicles', backTo: '/gps-tracking', title: 'تفاصيل المركبة' },
  'icf/:id': { getBase: '/icf-assessments', backTo: '/icf', title: 'تفاصيل تقييم ICF' },
  'kitchen/meals/:id': { getBase: '/kitchen/menu-items', backTo: '/kitchen', title: 'تفاصيل عنصر القائمة' },
  'knowledge/:id': { getBase: '/knowledge-center/articles', backTo: '/knowledge', title: 'تفاصيل المقال المعرفي' },
  'laundry/orders/:id': { getBase: '/laundry/orders', backTo: '/laundry', title: 'تفاصيل طلب الغسيل' },
  'leave-management/requests/:id': { getBase: '/leave-requests', backTo: '/leave-management', title: 'تفاصيل طلب الإجازة' },
  'legal/cases/:id': { getBase: '/legal-affairs/cases', backTo: '/legal', title: 'تفاصيل القضية القانونية' },
  'meetings/:id': { getBase: '/meetings', backTo: '/meetings', title: 'تفاصيل الاجتماع' },
  'messages/:id': { getBase: '/messages', backTo: '/messages', title: 'تفاصيل الرسالة' },
  'research/studies/:id': { getBase: '/research', backTo: '/research', title: 'تفاصيل الدراسة البحثية' },
  'supply-chain/orders/:id': { getBase: '/supply-chain/orders', backTo: '/supply-chain', title: 'تفاصيل أمر الشراء' },
  'volunteers/:id': { getBase: '/volunteers', backTo: '/volunteers', title: 'تفاصيل المتطوع' },
  'waitlist/entries/:id': { getBase: '/waitlist', backTo: '/waitlist', title: 'تفاصيل طلب قائمة الانتظار' },
  'mhpss/cases/:id': { getBase: '/mhpss/cases', backTo: '/mhpss', title: 'تفاصيل الحالة النفسية' },
  'recruitment/applicants/:id': { getBase: '/recruitment/applicants', backTo: '/recruitment', title: 'تفاصيل المتقدّم' },
  'warehouse/items/:id': { getBase: '/warehouse/items', backTo: '/warehouse', title: 'تفاصيل صنف المستودع' },
  'independent-living/beneficiaries/:id': { getBase: '/independent-living/beneficiaries', backTo: '/independent-living', title: 'تفاصيل مستفيد الاستقلالية' },
  'hse/incidents/:id': { getBase: '/hse/incidents', backTo: '/hse', title: 'تفاصيل حادثة السلامة' },
};

export default DETAIL_VIEWS;
