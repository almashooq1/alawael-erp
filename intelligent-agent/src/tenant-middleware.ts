// Middleware لدعم تعدد المستأجرين (Multi-Tenancy)
import { Request, Response, NextFunction } from 'express';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // مثال: استخراج tenantId من الهيدر أو الكويري أو التوكن
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenantId' });
  }
  // يمكن ربط tenantId مع قاعدة بيانات أو config خاص
  (req as any).tenantId = tenantId;
  next();
}
