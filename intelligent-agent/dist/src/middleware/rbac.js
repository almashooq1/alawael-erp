"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacObj = void 0;
exports.requirePermission = requirePermission;
exports.rbac = rbac;
const user_profile_1 = require("../modules/user-profile");
const userProfileManager = new user_profile_1.UserProfileManager();
function requirePermission(permission) {
    return (req, res, next) => {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'غير مصرح' });
        const user = userProfileManager.getUser(userId);
        if (!user || !user.roles)
            return res.status(403).json({ error: 'لا يوجد أدوار' });
        // جلب صلاحيات المستخدم من الأدوار
        // (يفترض أن كل دور له مجموعة صلاحيات)
        const userPermissions = user.roles.flatMap(role => getPermissionsForRole(role));
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({ error: 'صلاحية غير كافية' });
        }
        next();
    };
}
// دالة مساعدة: جلب الصلاحيات لدور معين (يفترض وجود قاعدة بيانات أو ثابت)
function getPermissionsForRole(role) {
    // مثال ثابت، يفضل ربطه بقاعدة بيانات أو ملف إعدادات
    const rolePermissions = {
        admin: ['manage-users', 'manage-policies', 'view-reports', 'delete-any'],
        auditor: ['view-reports', 'view-policies'],
        user: ['view-policies'],
    };
    return rolePermissions[role] || [];
}
function rbac(allowedRoles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.roles) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        const hasRole = user.roles.some((role) => allowedRoles.includes(role));
        if (!hasRole) {
            return res.status(403).json({ error: 'صلاحية غير كافية' });
        }
        next();
    };
}
exports.rbacObj = {
    requirePermission,
    getPermissionsForRole,
};
