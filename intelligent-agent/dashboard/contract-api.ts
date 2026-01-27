
import express from 'express';
import { ContractManager } from '../src/modules/contract-manager';
import { ContractActivityLogger } from '../src/modules/contract-activity-logger';
import { requirePermission } from '../src/modules/require-permission';
import { Permission } from '../src/modules/permissions';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: string;
      role?: string;
      permissions?: Permission[];
    }
    interface Request {
      user?: User;
    }
  }
}

const router = express.Router();
const manager = new ContractManager();

// قائمة العقود
// بحث وتصفية ذكية للعقود
import { getContractsWithRisk } from '../src/modules/contract-smart-analysis';
// ...existing code...
router.get('/list', requirePermission('view_contracts'), (req, res) => {
  let contracts = getContractsWithRisk();
  const user = req.user;
  // المدير يرى كل العقود، المستخدم يرى فقط عقوده
  if (user?.role !== 'admin') {
    contracts = contracts.filter(c => c.ownerId === user?.id);
  }
  const { title, party, status, risk, minValue, maxValue, startDate, endDate } = req.query;
  if (typeof title === 'string' && title) contracts = contracts.filter(c => c.title && c.title.includes(title));
  if (typeof party === 'string' && party) contracts = contracts.filter(c => c.parties && c.parties.some((p:string)=>p.includes(party)));
  if (typeof status === 'string' && status) contracts = contracts.filter(c => c.status === status);
  if (typeof risk === 'string' && risk) contracts = contracts.filter(c => c.riskLevel === risk);
  if (typeof minValue === 'string' && minValue) contracts = contracts.filter(c => c.value >= Number(minValue));
  if (typeof maxValue === 'string' && maxValue) contracts = contracts.filter(c => c.value <= Number(maxValue));
  if (typeof startDate === 'string' && startDate) contracts = contracts.filter(c => c.startDate >= startDate);
  if (typeof endDate === 'string' && endDate) contracts = contracts.filter(c => c.endDate <= endDate);
  res.json(contracts);
});
// تفاصيل عقد
router.get('/:id', requirePermission('view_contracts'), (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const c = manager.getContract(id);
  if (!c) return res.status(404).json({ error: 'not found' });
  res.json(c);
});

// إنشاء عقد
router.post('/', requirePermission('manage_contracts'), (req, res) => {
  const { title, parties, startDate, endDate, value, terms, metadata } = req.body;
  if (!title || !parties || !startDate || !endDate || !value || !terms)
    return res.status(400).json({ error: 'بيانات ناقصة' });
  const c = manager.createContract({ title, parties, startDate, endDate, value, terms, metadata });
  ContractActivityLogger.log({ contractId: c.id, userId: req.user?.id, action: 'create', details: c, timestamp: new Date().toISOString() });
  res.json(c);
});

// تحديث عقد
router.put('/:id', requirePermission('manage_contracts'), (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const c = manager.updateContract(id, req.body);
  if (!c) return res.status(404).json({ error: 'not found' });
  ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'update', details: req.body, timestamp: new Date().toISOString() });
  res.json(c);
});

// حذف عقد
router.delete('/:id', requirePermission('manage_contracts'), (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ok = manager.deleteContract(id);
  if (ok) ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'delete', timestamp: new Date().toISOString() });
  res.json({ deleted: ok });
});

// تجديد عقد
router.post('/:id/renew', requirePermission('manage_contracts'), (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { newEndDate } = req.body;
  const c = manager.renewContract(id, newEndDate);
  if (!c) return res.status(404).json({ error: 'not found' });
  ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'renew', details: { newEndDate }, timestamp: new Date().toISOString() });
  res.json(c);
});

// تغيير حالة عقد
router.post('/:id/status', requirePermission('manage_contracts'), (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body;
  const c = manager.setStatus(id, status);
  if (!c) return res.status(404).json({ error: 'not found' });
  ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'status', details: { status }, timestamp: new Date().toISOString() });
  res.json(c);
});

export default router;
