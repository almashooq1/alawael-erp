"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contract_manager_1 = require("../src/modules/contract-manager");
const contract_activity_logger_1 = require("../src/modules/contract-activity-logger");
const require_permission_1 = require("../src/modules/require-permission");
const router = express_1.default.Router();
const manager = new contract_manager_1.ContractManager();
// قائمة العقود
// بحث وتصفية ذكية للعقود
const contract_smart_analysis_1 = require("../src/modules/contract-smart-analysis");
// ...existing code...
router.get('/list', (0, require_permission_1.requirePermission)('view_contracts'), (req, res) => {
    let contracts = (0, contract_smart_analysis_1.getContractsWithRisk)();
    const user = req.user;
    // المدير يرى كل العقود، المستخدم يرى فقط عقوده
    if (user?.role !== 'admin') {
        contracts = contracts.filter(c => c.ownerId === user?.id);
    }
    const { title, party, status, risk, minValue, maxValue, startDate, endDate } = req.query;
    if (typeof title === 'string' && title)
        contracts = contracts.filter(c => c.title && c.title.includes(title));
    if (typeof party === 'string' && party)
        contracts = contracts.filter(c => c.parties && c.parties.some((p) => p.includes(party)));
    if (typeof status === 'string' && status)
        contracts = contracts.filter(c => c.status === status);
    if (typeof risk === 'string' && risk)
        contracts = contracts.filter(c => c.riskLevel === risk);
    if (typeof minValue === 'string' && minValue)
        contracts = contracts.filter(c => c.value >= Number(minValue));
    if (typeof maxValue === 'string' && maxValue)
        contracts = contracts.filter(c => c.value <= Number(maxValue));
    if (typeof startDate === 'string' && startDate)
        contracts = contracts.filter(c => c.startDate >= startDate);
    if (typeof endDate === 'string' && endDate)
        contracts = contracts.filter(c => c.endDate <= endDate);
    res.json(contracts);
});
// تفاصيل عقد
router.get('/:id', (0, require_permission_1.requirePermission)('view_contracts'), (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const c = manager.getContract(id);
    if (!c)
        return res.status(404).json({ error: 'not found' });
    res.json(c);
});
// إنشاء عقد
router.post('/', (0, require_permission_1.requirePermission)('manage_contracts'), (req, res) => {
    const { title, parties, startDate, endDate, value, terms, metadata } = req.body;
    if (!title || !parties || !startDate || !endDate || !value || !terms)
        return res.status(400).json({ error: 'بيانات ناقصة' });
    const c = manager.createContract({ title, parties, startDate, endDate, value, terms, metadata });
    contract_activity_logger_1.ContractActivityLogger.log({ contractId: c.id, userId: req.user?.id, action: 'create', details: c, timestamp: new Date().toISOString() });
    res.json(c);
});
// تحديث عقد
router.put('/:id', (0, require_permission_1.requirePermission)('manage_contracts'), (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const c = manager.updateContract(id, req.body);
    if (!c)
        return res.status(404).json({ error: 'not found' });
    contract_activity_logger_1.ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'update', details: req.body, timestamp: new Date().toISOString() });
    res.json(c);
});
// حذف عقد
router.delete('/:id', (0, require_permission_1.requirePermission)('manage_contracts'), (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const ok = manager.deleteContract(id);
    if (ok)
        contract_activity_logger_1.ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'delete', timestamp: new Date().toISOString() });
    res.json({ deleted: ok });
});
// تجديد عقد
router.post('/:id/renew', (0, require_permission_1.requirePermission)('manage_contracts'), (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { newEndDate } = req.body;
    const c = manager.renewContract(id, newEndDate);
    if (!c)
        return res.status(404).json({ error: 'not found' });
    contract_activity_logger_1.ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'renew', details: { newEndDate }, timestamp: new Date().toISOString() });
    res.json(c);
});
// تغيير حالة عقد
router.post('/:id/status', (0, require_permission_1.requirePermission)('manage_contracts'), (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;
    const c = manager.setStatus(id, status);
    if (!c)
        return res.status(404).json({ error: 'not found' });
    contract_activity_logger_1.ContractActivityLogger.log({ contractId: id, userId: req.user?.id, action: 'status', details: { status }, timestamp: new Date().toISOString() });
    res.json(c);
});
exports.default = router;
