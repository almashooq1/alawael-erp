/**
 * recipientResolver.js — resolves a catalog `audience` + scopeKey into
 * a list of (User | Guardian | Employee | Beneficiary) records shaped
 * for the channel adapters.
 *
 * Phase 10 Commit 2.
 *
 * Output shape per recipient:
 *   {
 *     id:                ObjectId (recipientId)
 *     recipientModel:    'User' | 'Guardian' | 'Employee' | 'Beneficiary'
 *     email:             string | undefined
 *     phone:             string | undefined
 *     locale:            'ar' | 'en'
 *     branchId:          ObjectId | undefined
 *     preferredChannels: string[] | undefined
 *   }
 *
 * Every lookup method is injected so production wires real Mongoose
 * models and tests hand in fakes — same discipline as the engine.
 *
 * scopeKey grammar (optional but when present, exact strings):
 *   "beneficiary:<oid>"
 *   "branch:<oid>"
 *   "employee:<oid>"
 *   (anything else is ignored and audiences that need scope return [])
 */

'use strict';

function parseScope(scopeKey) {
  if (!scopeKey || typeof scopeKey !== 'string') return null;
  const idx = scopeKey.indexOf(':');
  if (idx === -1) return null;
  return {
    type: scopeKey.slice(0, idx),
    id: scopeKey.slice(idx + 1),
  };
}

function toRecipient(doc, role, modelName = 'User') {
  if (!doc) return null;
  return {
    id: doc._id || doc.id,
    recipientModel: modelName,
    email: doc.email || doc.primaryEmail || undefined,
    phone: doc.phone || doc.mobile || doc.primaryPhone || doc.whatsapp || undefined,
    locale: doc.preferredLocale || doc.locale || 'ar',
    branchId: doc.branchId || doc.branch || undefined,
    preferredChannels: doc.preferredChannels || undefined,
    role,
  };
}

// Resolve the rbac.aliases group expander lazily so the resolver
// doesn't require it at import time (tests can still inject their
// own roleMap when mocking).
function _defaultRoleMap() {
  try {
    const { resolveRoles, ROLE_GROUPS } = require('../../config/rbac.aliases');
    return {
      // audience → rbac canonical role values
      supervisor: resolveRoles('supervisor').length ? resolveRoles('supervisor') : ['supervisor'],
      branch_manager: resolveRoles('branch_manager').length
        ? resolveRoles('branch_manager')
        : ['branch_manager'],
      executive: [...(ROLE_GROUPS.executive || [])],
      quality: [resolveRoles('quality_manager')[0]].filter(Boolean), // → quality_coordinator
      finance: [
        ...resolveRoles('finance_manager'), // → finance_supervisor
        'accountant',
        ...resolveRoles('cfo'), // → group_cfo
      ].filter(Boolean),
      hr: ['hr_manager', 'hr_officer'],
    };
  } catch (_) {
    // rbac.aliases may not be loadable (circular / test env); fall
    // back to the legacy literals so the engine stays operable.
    return {
      supervisor: ['supervisor'],
      branch_manager: ['branch_manager'],
      executive: ['ceo', 'group_gm', 'group_cfo', 'group_chro'],
      quality: ['quality_coordinator'],
      finance: ['finance_supervisor', 'accountant', 'group_cfo'],
      hr: ['hr_manager', 'hr_officer'],
    };
  }
}

function createRecipientResolver({
  BeneficiaryModel,
  GuardianModel,
  UserModel,
  EmployeeModel,
  SessionModel,
  roleMap,
  logger = console,
} = {}) {
  const effectiveRoleMap = roleMap || _defaultRoleMap();
  function getModel(m) {
    return m && (m.model || m);
  }
  const Beneficiary = getModel(BeneficiaryModel);
  const Guardian = getModel(GuardianModel);
  const User = getModel(UserModel);
  const Employee = getModel(EmployeeModel);
  const Session = getModel(SessionModel);

  async function resolveBeneficiary(scope) {
    if (!Beneficiary || !scope || scope.type !== 'beneficiary') return [];
    const doc = await Beneficiary.findOne({ _id: scope.id, isActive: { $ne: false } });
    return doc ? [toRecipient(doc, 'beneficiary', 'Beneficiary')] : [];
  }

  async function resolveGuardian(scope) {
    if (!Guardian || !scope || scope.type !== 'beneficiary') return [];
    const docs = await Guardian.find({
      $or: [{ beneficiaryId: scope.id }, { beneficiary: scope.id }],
      isPrimary: { $ne: false },
    });
    return (docs || []).map(d => toRecipient(d, 'guardian', 'Guardian')).filter(Boolean);
  }

  async function resolveTherapist(scope) {
    if (!User || !scope || scope.type !== 'beneficiary') return [];
    let userIds = [];
    if (Session) {
      try {
        userIds = await Session.distinct('therapistId', {
          $or: [{ beneficiaryId: scope.id }, { beneficiary: scope.id }],
        });
      } catch (err) {
        logger.warn && logger.warn(`session.distinct failed: ${err.message}`);
      }
    }
    if (!userIds.length) return [];
    const users = await User.find({ _id: { $in: userIds } });
    return (users || []).map(u => toRecipient(u, 'therapist', 'User')).filter(Boolean);
  }

  async function resolveByRoleList(rolesKey, scope) {
    if (!User) return [];
    const roles = effectiveRoleMap[rolesKey];
    if (!roles || !roles.length) return [];
    const q = { role: { $in: roles } };
    if (scope && scope.type === 'branch') q.branchId = scope.id;
    const users = await User.find(q);
    return (users || []).map(u => toRecipient(u, rolesKey, 'User')).filter(Boolean);
  }

  return {
    /**
     * @param {string} audience — one of AUDIENCES
     * @param {string} [scopeKey]
     * @param {Object} [ctx] — unused today; reserved for future
     */
    async resolve(audience, scopeKey /* , ctx */) {
      const scope = parseScope(scopeKey);
      try {
        switch (audience) {
          case 'beneficiary':
            return await resolveBeneficiary(scope);
          case 'guardian':
            return await resolveGuardian(scope);
          case 'therapist':
            return await resolveTherapist(scope);
          case 'supervisor':
            return await resolveByRoleList('supervisor', scope);
          case 'branch_manager':
            return await resolveByRoleList('branch_manager', scope);
          case 'executive':
            return await resolveByRoleList('executive', null); // tenant-wide
          case 'quality':
            return await resolveByRoleList('quality', null);
          case 'finance':
            return await resolveByRoleList('finance', null);
          case 'hr':
            return await resolveByRoleList('hr', null);
          default:
            return [];
        }
      } catch (err) {
        logger.warn && logger.warn(`recipientResolver(${audience}): ${err.message}`);
        return [];
      }
    },
    // Exposed for tests / direct use.
    _parseScope: parseScope,
    _toRecipient: toRecipient,
  };
}

module.exports = { createRecipientResolver, parseScope, toRecipient };
