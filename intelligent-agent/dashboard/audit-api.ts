import express from 'express';
import { AuditTrail } from '../src/modules/audit-trail';
const router = express.Router();


// إضافة سجل تدقيق (تستخدم داخلياً)
export function logAudit(userId: string, action: string, resource?: string, details?: any) {
  AuditTrail.log({ userId, action, resource, details });
}

// API: استعراض سجل التدقيق (مدير فقط)
router.get('/audit', (req, res) => {
  // ... تحقق من صلاحية الجلسة هنا ...
  res.json(AuditTrail.query());
});

export default router;
