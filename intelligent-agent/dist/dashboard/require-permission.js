"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
// Middleware: التأكد من صلاحية المستخدم
function requirePermission(permission) {
    return (req, res, next) => {
        // مثال: جلب الدور من الجلسة أو التوكن
        const user = req.user || { role: 'viewer' };
        const rolePerms = (user.permissions || user.role?.permissions || ['view_contracts']);
        if (rolePerms.includes(permission) || rolePerms.includes('manage_contracts'))
            return next();
        return res.status(403).json({ error: 'ليس لديك صلاحية' });
    };
}
