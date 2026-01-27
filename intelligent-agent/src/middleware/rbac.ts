// RBAC middleware: تحقق من صلاحيات المستخدم قبل تنفيذ أي عملية حساسة
import { Request, Response, NextFunction } from 'express';
import { UserProfileManager } from '../modules/user-profile';

const userProfileManager = new UserProfileManager();

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const user = userProfileManager.getUser(userId);
    if (!user || !user.roles) return res.status(403).json({ error: 'لا يوجد أدوار' });
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
function getPermissionsForRole(role: string): string[] {
  // مثال ثابت، يفضل ربطه بقاعدة بيانات أو ملف إعدادات
  const rolePermissions: Record<string, string[]> = {
    admin: ['manage-users', 'manage-policies', 'view-reports', 'delete-any'],
    auditor: ['view-reports', 'view-policies'],
    user: ['view-policies'],
  };
  return rolePermissions[role] || [];
}
