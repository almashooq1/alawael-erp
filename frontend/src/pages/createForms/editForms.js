/**
 * Registry of EDIT forms, powering <EntityFormPage config={{mode:'edit'}}>.
 * Fixes dashboard "edit" links that pointed at routes that did not exist.
 * Each entity must expose GET `${getEndpoint}/:id` (prefill) + PUT
 * `${endpoint}/:id` (save) — both smoke-tested on prod.
 *
 * Fields are derived from the fetched record when not given explicitly.
 */
const EDIT_FORMS = {
  'electronic-directives/edit/:id': {
    mode: 'edit',
    getEndpoint: '/electronic-directives',
    endpoint: '/electronic-directives',
    backTo: '/electronic-directives',
    title: 'تعديل التوجيه المسبق',
    successMsg: 'تم حفظ التعديلات ✓',
  },
  'beneficiaries/:id/edit': {
    mode: 'edit',
    getEndpoint: '/core/beneficiaries',
    endpoint: '/core/beneficiaries',
    backTo: '/beneficiaries',
    title: 'تعديل بيانات المستفيد',
    successMsg: 'تم حفظ التعديلات ✓',
  },
  // Singleton settings screen — no :id; GET + PUT a single policy object.
  'sso-admin/config': {
    mode: 'edit',
    singleton: true,
    getEndpoint: '/security/policy',
    endpoint: '/security/policy',
    backTo: '/sso-admin',
    title: 'إعدادات الأمان والدخول',
    successMsg: 'تم حفظ الإعدادات ✓',
  },
};

export default EDIT_FORMS;
