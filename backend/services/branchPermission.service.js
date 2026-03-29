/**
 * Branch Permission Service - خدمة صلاحيات الفروع
 * RBAC Matrix: 5 Roles × 10 Modules × 12 Branches
 */

// ─── Permission Constants ─────────────────────────────────────────────────────
const ROLES = {
  HQ_SUPER_ADMIN: 'hq_super_admin',
  HQ_ADMIN: 'hq_admin',
  BRANCH_MANAGER: 'branch_manager',
  THERAPIST: 'therapist',
  DRIVER: 'driver',
  RECEPTIONIST: 'receptionist',
  ADMIN: 'admin',
};

const MODULES = {
  PATIENTS: 'patients',
  SCHEDULE: 'schedule',
  STAFF: 'staff',
  FINANCE: 'finance',
  TRANSPORT: 'transport',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  BRANCHES: 'branches',
  AUDIT: 'audit',
  NOTIFICATIONS: 'notifications',
};

const ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  EXPORT: 'export',
  OVERRIDE: 'override',
};

// ─── Permission Matrix ────────────────────────────────────────────────────────
// Format: { module: { action: true/false } }
const PERMISSION_MATRIX = {
  [ROLES.HQ_SUPER_ADMIN]: {
    // Full access to ALL branches, ALL modules
    scope: 'all_branches',
    override: true,
    [MODULES.PATIENTS]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.SCHEDULE]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.STAFF]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.FINANCE]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.TRANSPORT]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.REPORTS]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.SETTINGS]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.BRANCHES]: { read: true, write: true, delete: true, export: true, override: true },
    [MODULES.AUDIT]: { read: true, write: true, delete: false, export: true, override: true },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: true,
      delete: true,
      export: true,
      override: true,
    },
  },

  [ROLES.HQ_ADMIN]: {
    // All branches read + write, no delete finance/audit
    scope: 'all_branches',
    override: false,
    [MODULES.PATIENTS]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.SCHEDULE]: { read: true, write: true, delete: true, export: true, override: false },
    [MODULES.STAFF]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.FINANCE]: { read: true, write: false, delete: false, export: true, override: false },
    [MODULES.TRANSPORT]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.REPORTS]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.SETTINGS]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.BRANCHES]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.AUDIT]: { read: true, write: false, delete: false, export: true, override: false },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: true,
      delete: false,
      export: false,
      override: false,
    },
  },

  [ROLES.BRANCH_MANAGER]: {
    // Own branch: full RW. Other branches: READ only
    scope: 'own_branch_rw_others_ro',
    override: false,
    [MODULES.PATIENTS]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.SCHEDULE]: { read: true, write: true, delete: true, export: true, override: false },
    [MODULES.STAFF]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.FINANCE]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.TRANSPORT]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.REPORTS]: { read: true, write: true, delete: false, export: true, override: false },
    [MODULES.SETTINGS]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.BRANCHES]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.AUDIT]: { read: true, write: false, delete: false, export: true, override: false },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: true,
      delete: false,
      export: false,
      override: false,
    },
  },

  [ROLES.THERAPIST]: {
    // Own branch only: own patients + schedule
    scope: 'own_branch_own_patients',
    override: false,
    [MODULES.PATIENTS]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.SCHEDULE]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.STAFF]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.FINANCE]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.TRANSPORT]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.REPORTS]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.SETTINGS]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.BRANCHES]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.AUDIT]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
  },

  [ROLES.DRIVER]: {
    // Own branch transport only
    scope: 'own_branch',
    override: false,
    [MODULES.PATIENTS]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.SCHEDULE]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.STAFF]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.FINANCE]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.TRANSPORT]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.REPORTS]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.SETTINGS]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.BRANCHES]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.AUDIT]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
  },

  [ROLES.RECEPTIONIST]: {
    // Own branch: basic read + appointment booking
    scope: 'own_branch',
    override: false,
    [MODULES.PATIENTS]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.SCHEDULE]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.STAFF]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.FINANCE]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.TRANSPORT]: {
      read: true,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.REPORTS]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.SETTINGS]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.BRANCHES]: {
      read: false,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.AUDIT]: { read: false, write: false, delete: false, export: false, override: false },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
  },

  [ROLES.ADMIN]: {
    // Own branch: limited admin tasks
    scope: 'own_branch',
    override: false,
    [MODULES.PATIENTS]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.SCHEDULE]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.STAFF]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.FINANCE]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.TRANSPORT]: {
      read: true,
      write: false,
      delete: false,
      export: false,
      override: false,
    },
    [MODULES.REPORTS]: { read: true, write: false, delete: false, export: true, override: false },
    [MODULES.SETTINGS]: { read: true, write: true, delete: false, export: false, override: false },
    [MODULES.BRANCHES]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.AUDIT]: { read: true, write: false, delete: false, export: false, override: false },
    [MODULES.NOTIFICATIONS]: {
      read: true,
      write: true,
      delete: false,
      export: false,
      override: false,
    },
  },
};

// ─── Core Permission Check ────────────────────────────────────────────────────
/**
 * Check if user has permission for module+action on a specific branch
 * @param {Object} user - { role, branch_id, branch_code, extra_permissions }
 * @param {string} targetBranchCode - The branch being accessed
 * @param {string} module - One of MODULES
 * @param {string} action - One of ACTIONS
 * @returns {{ allowed: boolean, reason: string }}
 */
function hasPermission(user, targetBranchCode, module, action = ACTIONS.READ) {
  if (!user || !user.role) {
    return { allowed: false, reason: 'No user or role provided' };
  }

  const rolePerms = PERMISSION_MATRIX[user.role];
  if (!rolePerms) {
    return { allowed: false, reason: `Unknown role: ${user.role}` };
  }

  // ─── HQ Super Admin: bypass everything ─────────────────────────────────
  if (user.role === ROLES.HQ_SUPER_ADMIN) {
    return { allowed: true, reason: 'HQ Super Admin has full access' };
  }

  // ─── Scope check ───────────────────────────────────────────────────────
  const scope = rolePerms.scope;
  const isOwnBranch = user.branch_code === targetBranchCode;

  if (scope === 'own_branch' && !isOwnBranch) {
    return { allowed: false, reason: `${user.role} can only access own branch` };
  }

  if (scope === 'own_branch_own_patients' && !isOwnBranch) {
    return { allowed: false, reason: 'Therapist can only access own branch' };
  }

  // Branch Manager: READ is allowed for other branches
  if (scope === 'own_branch_rw_others_ro' && !isOwnBranch) {
    if (action !== ACTIONS.READ) {
      return { allowed: false, reason: 'Branch Manager can only READ other branches' };
    }
  }

  // ─── Module permission check ────────────────────────────────────────────
  const modulePerm = rolePerms[module];
  if (!modulePerm) {
    return { allowed: false, reason: `No permissions defined for module: ${module}` };
  }

  const actionAllowed = modulePerm[action] === true;

  // ─── Extra/granular permissions (user-level overrides) ──────────────────
  if (!actionAllowed && user.extra_permissions) {
    const extra = user.extra_permissions[module];
    if (extra && extra[action] === true) {
      return { allowed: true, reason: 'Allowed via extra permissions' };
    }
  }

  if (!actionAllowed) {
    return { allowed: false, reason: `Role ${user.role} cannot ${action} on ${module}` };
  }

  return { allowed: true, reason: 'Permission granted' };
}

// ─── Get Accessible Branches ─────────────────────────────────────────────────
/**
 * Returns branch filter based on user role
 * @param {Object} user
 * @returns {{ filter: Object, crossBranch: boolean }}
 */
function getBranchFilter(user) {
  if (!user) return { filter: { _id: null }, crossBranch: false };

  const role = user.role;

  // HQ roles see all branches
  if ([ROLES.HQ_SUPER_ADMIN, ROLES.HQ_ADMIN].includes(role)) {
    return { filter: {}, crossBranch: true };
  }

  // Branch-scoped roles see only their branch
  if (
    [ROLES.BRANCH_MANAGER, ROLES.THERAPIST, ROLES.DRIVER, ROLES.RECEPTIONIST, ROLES.ADMIN].includes(
      role
    )
  ) {
    const filter = user.branch_id
      ? { branch_id: user.branch_id }
      : { branch_code: user.branch_code };
    return { filter, crossBranch: false };
  }

  return { filter: { _id: null }, crossBranch: false };
}

// ─── Get User Menu Permissions ────────────────────────────────────────────────
/**
 * Returns all modules a user can access (for frontend menu)
 */
function getUserMenuPermissions(user) {
  const rolePerms = PERMISSION_MATRIX[user.role];
  if (!rolePerms) return {};

  const menu = {};
  Object.values(MODULES).forEach(mod => {
    const perms = rolePerms[mod];
    if (perms && Object.values(perms).some(v => v === true)) {
      menu[mod] = perms;
    }
  });
  return menu;
}

// ─── Audit Trail Helper ───────────────────────────────────────────────────────
/**
 * Creates audit trail entry for permission checks
 */
function createAuditEntry(user, branchCode, module, action, allowed, reason) {
  return {
    timestamp: new Date(),
    user_id: user._id || user.id,
    username: user.username,
    role: user.role,
    user_branch: user.branch_code,
    target_branch: branchCode,
    module,
    action,
    allowed,
    reason,
    ip: user._ip || null,
  };
}

module.exports = {
  ROLES,
  MODULES,
  ACTIONS,
  PERMISSION_MATRIX,
  hasPermission,
  getBranchFilter,
  getUserMenuPermissions,
  createAuditEntry,
};
