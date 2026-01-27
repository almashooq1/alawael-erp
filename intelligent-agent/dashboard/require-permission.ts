import { Permission } from '../src/modules/permissions';
import { Request, Response, NextFunction } from 'express';

// Middleware: التأكد من صلاحية المستخدم
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    // مثال: جلب الدور من الجلسة أو التوكن
    const user = req.user || { role: 'viewer' };
    const rolePerms = (user.permissions || user.role?.permissions || ['view_contracts']);
    if (rolePerms.includes(permission) || rolePerms.includes('manage_contracts')) return next();
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  };
}
