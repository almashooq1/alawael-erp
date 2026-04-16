/**
 * Policy: caseload-access
 *
 * Therapists (and similar L5 clinical roles) may read/write beneficiary,
 * assessment, IRP, and session records only when they are on the case team.
 */

'use strict';

const CLINICAL_L5_ROLES = new Set([
  'therapist',
  'doctor',
  'teacher',
  'nurse',
  'social_worker',
  'psychologist',
]);

const RESOURCE_TYPES = new Set([
  'Beneficiary',
  'Assessment',
  'IRP',
  'Session',
  'SessionNote',
  'Measurement',
]);

module.exports = {
  id: 'caseload-access',
  description: 'L5 clinical roles may only access records for beneficiaries in their caseload.',

  applies({ subject, resource }) {
    if (!subject || !subject.roles) return false;
    const isClinical = subject.roles.some(r => CLINICAL_L5_ROLES.has(r));
    if (!isClinical) return false;
    return RESOURCE_TYPES.has(resource.type);
  },

  evaluate({ subject, resource }) {
    const userId = String(subject.userId || '');
    const caseTeam = (resource.caseTeam || []).map(String);
    const assigned = String(resource.assignedTherapistId || '');

    if (caseTeam.includes(userId) || assigned === userId) {
      return { effect: 'permit' };
    }
    return { effect: 'deny', reason: 'not_in_case_team' };
  },
};
