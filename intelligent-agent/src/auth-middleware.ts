// ميدل وير OAuth2 (نموذج أولي)
import { Request, Response, NextFunction } from 'express';

export function oauth2Middleware(req: Request, res: Response, next: NextFunction) {
  // مثال: تحقق من وجود توكن Bearer
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // في نظام حقيقي: تحقق من صحة التوكن مع مزود الهوية
  // هنا نقبل أي توكن تجريبي
  next();
}
