/**
 * Policy: guardian-own-child
 *
 * A parent/guardian may only read beneficiary records they are linked to.
 */

'use strict';

const GUARDIAN_ROLES = new Set(['parent', 'student', 'viewer']);

const BENEFICIARY_TYPES = new Set([
  'Beneficiary',
  'Assessment',
  'IRP',
  'Session',
  'Measurement',
  'Invoice',
  'Document',
  'Appointment',
]);

module.exports = {
  id: 'guardian-own-child',
  description: 'Guardians can access only records of beneficiaries linked to them.',

  applies({ subject, resource }) {
    if (!subject || !subject.roles) return false;
    const isGuardian = subject.roles.some(r => GUARDIAN_ROLES.has(r));
    if (!isGuardian) return false;
    return BENEFICIARY_TYPES.has(resource.type);
  },

  evaluate({ subject, resource }) {
    const linked = (subject.linkedBeneficiaries || []).map(String);
    const targetBeneficiaryId = String(
      resource.beneficiaryId || (resource.type === 'Beneficiary' ? resource.id : '')
    );

    if (targetBeneficiaryId && linked.includes(targetBeneficiaryId)) {
      return { effect: 'permit' };
    }
    return { effect: 'deny', reason: 'not_linked_beneficiary' };
  },
};
