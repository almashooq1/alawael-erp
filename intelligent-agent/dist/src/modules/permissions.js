"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRole = addRole;
exports.updateRole = updateRole;
exports.listRoles = listRoles;
exports.getRolePermissions = getRolePermissions;
const roles = [
    { id: 'admin', name: 'مدير', permissions: ['view_reports', 'export_data', 'manage_users', 'manage_sources', 'view_audit', 'view_contracts', 'manage_contracts'] },
    { id: 'viewer', name: 'مشاهد', permissions: ['view_reports', 'view_contracts'] },
];
function addRole(name, permissions) {
    const role = { id: Math.random().toString(36).slice(2), name, permissions };
    roles.push(role);
    return role;
}
function updateRole(id, patch) {
    const role = roles.find(r => r.id === id);
    if (role)
        Object.assign(role, patch);
    return role;
}
function listRoles() {
    return roles;
}
function getRolePermissions(roleId) {
    const role = roles.find(r => r.id === roleId);
    return role ? role.permissions : [];
}
