"use strict";
// src/modules/rbac.ts
// Advanced Role-Based Access Control (RBAC) module
// Provides user roles, permissions, and policy enforcement for all system modules
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacApi = void 0;
exports.addRoleToUser = addRoleToUser;
exports.removeRoleFromUser = removeRoleFromUser;
exports.setPolicy = setPolicy;
exports.getUserRoles = getUserRoles;
exports.getRolePermissions = getRolePermissions;
exports.checkPermission = checkPermission;
exports.requirePermission = requirePermission;
// In-memory stores (replace with DB in production)
const policies = [];
const userRoles = [];
// RBAC core logic
function addRoleToUser(userId, role) {
    let user = userRoles.find(u => u.userId === userId);
    if (!user) {
        user = { userId, roles: [] };
        userRoles.push(user);
    }
    if (!user.roles.includes(role))
        user.roles.push(role);
}
function removeRoleFromUser(userId, role) {
    const user = userRoles.find(u => u.userId === userId);
    if (user)
        user.roles = user.roles.filter(r => r !== role);
}
function setPolicy(role, permissions) {
    const idx = policies.findIndex(p => p.role === role);
    if (idx >= 0)
        policies[idx].permissions = permissions;
    else
        policies.push({ role, permissions });
}
function getUserRoles(userId) {
    return userRoles.find(u => u.userId === userId)?.roles || [];
}
function getRolePermissions(role) {
    return policies.find(p => p.role === role)?.permissions || [];
}
function checkPermission(userId, resource, action) {
    const roles = getUserRoles(userId);
    for (const role of roles) {
        const perms = getRolePermissions(role);
        if (perms.some(p => p.resource === resource && p.action === action))
            return true;
    }
    return false;
}
// Express middleware for RBAC enforcement
function requirePermission(resource, action) {
    return (req, res, next) => {
        const userId = req.headers['x-user-id'];
        if (!userId)
            return res.status(401).json({ error: 'Missing user ID' });
        if (!checkPermission(userId, resource, action)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        next();
    };
}
// REST API helpers (to be wired in server.ts)
exports.rbacApi = {
    addRoleToUser,
    removeRoleFromUser,
    setPolicy,
    getUserRoles,
    getRolePermissions,
    checkPermission,
};
