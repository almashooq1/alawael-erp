/**
 * Approval chain declarations.
 *
 * Each chain has:
 *   - id              stable key (e.g. 'A-01')
 *   - name            human label
 *   - resourceType    e.g. 'IRP'
 *   - steps[]         ordered array of { role, branchScope, dueHours, canDelegate }
 *
 * `branchScope` ∈ { 'branch', 'region', 'group' } determines where the
 * approver must be scoped. Caller resolves the concrete user when invoking.
 *
 * `dueHours` optional per-step SLA; breach triggers escalation.
 *
 * Chains can be looked up by id (common use) or selected at runtime
 * based on resource attributes (e.g. materiality) via selectChain().
 */

'use strict';

const CHAINS = {
  'A-01': {
    name: 'IRP activation',
    resourceType: 'IRP',
    steps: [
      { role: 'clinical_supervisor', branchScope: 'branch', dueHours: 48 },
      { role: 'manager', branchScope: 'branch', dueHours: 48 },
      { role: 'parent_nafath_sign', branchScope: 'external', dueHours: 72 },
    ],
  },

  'A-02': {
    name: 'IRP early termination',
    resourceType: 'IRP',
    steps: [
      { role: 'clinical_supervisor', branchScope: 'branch', dueHours: 24 },
      { role: 'manager', branchScope: 'branch', dueHours: 24 },
      { role: 'hq_cmo', branchScope: 'group', dueHours: 72 },
    ],
  },

  'A-03': {
    name: 'Clinical report release',
    resourceType: 'Report',
    steps: [
      { role: 'clinical_supervisor', branchScope: 'branch', dueHours: 48 },
      { role: 'parent_portal_ack', branchScope: 'external', dueHours: 168 },
    ],
  },

  'A-04': {
    name: 'Beneficiary discharge',
    resourceType: 'Beneficiary',
    steps: [
      { role: 'clinical_supervisor', branchScope: 'branch', dueHours: 72 },
      { role: 'manager', branchScope: 'branch', dueHours: 72 },
    ],
  },

  'A-05': {
    name: 'Cross-branch transfer',
    resourceType: 'BeneficiaryTransfer',
    steps: [
      { role: 'manager', branchScope: 'receiving_branch', dueHours: 72 },
      { role: 'manager', branchScope: 'sending_branch', dueHours: 72 },
      { role: 'head_office_admin', branchScope: 'group', dueHours: 72 },
    ],
  },

  'A-06-short': {
    name: 'Leave request (< 5 days)',
    resourceType: 'LeaveRequest',
    steps: [{ role: 'hr_supervisor', branchScope: 'branch', dueHours: 48 }],
  },

  'A-06-mid': {
    name: 'Leave request (5–14 days)',
    resourceType: 'LeaveRequest',
    steps: [
      { role: 'hr_supervisor', branchScope: 'branch', dueHours: 48 },
      { role: 'manager', branchScope: 'branch', dueHours: 72 },
    ],
  },

  'A-06-long': {
    name: 'Leave request (> 14 days)',
    resourceType: 'LeaveRequest',
    steps: [
      { role: 'hr_supervisor', branchScope: 'branch', dueHours: 48 },
      { role: 'manager', branchScope: 'branch', dueHours: 72 },
      { role: 'hq_chro', branchScope: 'group', dueHours: 72 },
    ],
  },

  'A-07-small': {
    name: 'Invoice cancellation (< 1k SAR)',
    resourceType: 'Invoice',
    steps: [{ role: 'accountant', branchScope: 'branch', dueHours: 24 }],
  },
  'A-07-mid': {
    name: 'Invoice cancellation (1k–10k SAR)',
    resourceType: 'Invoice',
    steps: [{ role: 'manager', branchScope: 'branch', dueHours: 48 }],
  },
  'A-07-large': {
    name: 'Invoice cancellation (> 10k SAR)',
    resourceType: 'Invoice',
    steps: [
      { role: 'manager', branchScope: 'branch', dueHours: 48 },
      { role: 'hq_cfo', branchScope: 'group', dueHours: 72 },
    ],
  },

  'A-08-small': {
    name: 'PO approval (< 5k SAR)',
    resourceType: 'PurchaseOrder',
    steps: [{ role: 'finance_supervisor', branchScope: 'branch', dueHours: 48 }],
  },
  'A-08-mid': {
    name: 'PO approval (5k–50k SAR)',
    resourceType: 'PurchaseOrder',
    steps: [
      { role: 'finance_supervisor', branchScope: 'branch', dueHours: 48 },
      { role: 'manager', branchScope: 'branch', dueHours: 72 },
    ],
  },
  'A-08-large': {
    name: 'PO approval (> 50k SAR)',
    resourceType: 'PurchaseOrder',
    steps: [
      { role: 'manager', branchScope: 'branch', dueHours: 48 },
      { role: 'hq_cfo', branchScope: 'group', dueHours: 72 },
    ],
  },

  'A-09': {
    name: 'Vendor contract',
    resourceType: 'Contract',
    steps: [
      { role: 'procurement_officer', branchScope: 'branch', dueHours: 48 },
      { role: 'manager', branchScope: 'branch', dueHours: 72 },
      { role: 'hq_cfo', branchScope: 'group', dueHours: 96, condition: 'total >= 100000' },
      { role: 'legal_reviewer', branchScope: 'group', dueHours: 96 },
    ],
  },

  'A-10': {
    name: 'Employee termination',
    resourceType: 'EmploymentTermination',
    steps: [
      { role: 'hr_officer', branchScope: 'branch', dueHours: 72 },
      { role: 'branch_hr_manager', branchScope: 'branch', dueHours: 72 },
      { role: 'manager', branchScope: 'branch', dueHours: 72 },
      { role: 'hq_chro', branchScope: 'group', dueHours: 96 },
    ],
  },

  'A-11': {
    name: 'Salary change',
    resourceType: 'SalaryChange',
    steps: [
      { role: 'hr_officer', branchScope: 'branch', dueHours: 72 },
      { role: 'branch_hr_manager', branchScope: 'branch', dueHours: 72 },
      { role: 'hq_chro', branchScope: 'group', dueHours: 96 },
    ],
  },

  'A-13': {
    name: 'PDPL Data Subject Request',
    resourceType: 'DataSubjectRequest',
    steps: [
      { role: 'dpo', branchScope: 'group', dueHours: 72 },
      { role: 'department_owner', branchScope: 'group', dueHours: 168 },
      { role: 'dpo', branchScope: 'group', dueHours: 72 },
    ],
  },

  'A-15': {
    name: 'CAPA closure',
    resourceType: 'CAPA',
    steps: [
      { role: 'quality_officer', branchScope: 'branch', dueHours: 72 },
      { role: 'hq_cqo', branchScope: 'group', dueHours: 168 },
    ],
  },
};

/**
 * Select the right chain based on a resource snapshot.
 *
 * @param {string} family Base chain family (e.g. 'A-07', 'A-08')
 * @param {object} resource Loaded resource used for amount / type decisions
 * @returns {string|null} chain id
 */
function selectChain(family, resource = {}) {
  const amount = resource.total ?? resource.amount ?? 0;
  if (family === 'A-07') {
    if (amount < 1000) return 'A-07-small';
    if (amount < 10000) return 'A-07-mid';
    return 'A-07-large';
  }
  if (family === 'A-08') {
    if (amount < 5000) return 'A-08-small';
    if (amount < 50000) return 'A-08-mid';
    return 'A-08-large';
  }
  if (family === 'A-06') {
    const days = resource.days || 0;
    if (days < 5) return 'A-06-short';
    if (days <= 14) return 'A-06-mid';
    return 'A-06-long';
  }
  return CHAINS[family] ? family : null;
}

module.exports = { CHAINS, selectChain };
