"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
// Middleware: التأكد من صلاحية المستخدم
function requirePermission(permission) {
    return (req, res, next) => {
        // مثال: جلب الدور من الجلسة أو التوكن
        const user = req.user || { role: 'viewer' };
        let rolePerms = ['view_contracts'];
        if (user && typeof user === 'object') {
            if (Array.isArray(user.permissions)) {
                rolePerms = user.permissions;
            }
            else if (user.role && typeof user.role === 'object' && Array.isArray(user.role.permissions)) {
                rolePerms = user.role.permissions;
            }
        }
        if (rolePerms.includes(permission) || rolePerms.includes('manage_contracts'))
            return next();
        return res.status(403).json({ error: 'ليس لديك صلاحية' });
    };
}
