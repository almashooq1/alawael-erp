import { Permission } from './permissions';
import { Request, Response, NextFunction } from 'express';


// Middleware: التأكد من صلاحية المستخدم
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    // مثال: جلب الدور من الجلسة أو التوكن
    const user = req.user || { role: 'viewer' };
    let rolePerms: string[] = ['view_contracts'];
    if (user && typeof user === 'object') {
      if (Array.isArray((user as any).permissions)) {
        rolePerms = (user as any).permissions;
      } else if (user.role && typeof user.role === 'object' && Array.isArray((user.role as any).permissions)) {
        rolePerms = (user.role as any).permissions;
      }
    }
    if (rolePerms.includes(permission) || rolePerms.includes('manage_contracts')) return next();
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  };
}

