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
};

export default EDIT_FORMS;
