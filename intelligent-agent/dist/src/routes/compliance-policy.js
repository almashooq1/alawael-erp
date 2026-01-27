"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rbac_1 = require("../middleware/rbac");
const compliance_policy_1 = __importDefault(require("../models/compliance-policy"));
// استيراد middleware التحقق المركزي
const { sanitizeInput, commonValidations, handleValidationErrors } = require('../../../backend/middleware/requestValidation');
const router = express_1.default.Router();
// قائمة السياسات
router.get('/', (0, rbac_1.requirePermission)('view-policies'), sanitizeInput, async (req, res) => {
    const policies = await compliance_policy_1.default.find().lean();
    res.json(policies);
});
// إضافة سياسة
router.post('/', (0, rbac_1.requirePermission)('manage-policies'), sanitizeInput, [
    commonValidations.requiredString('name', 2, 100),
    commonValidations.optionalString('description', 500),
    commonValidations.boolean('enabled'),
    handleValidationErrors
], async (req, res) => {
    try {
        const p = await compliance_policy_1.default.create(req.body);
        res.status(201).json(p);
    }
    catch (e) {
        const err = e;
        res.status(400).json({ error: err.message });
    }
});
// تعديل سياسة
router.put('/:id', (0, rbac_1.requirePermission)('manage-policies'), sanitizeInput, [
    commonValidations.mongoId('id'),
    commonValidations.optionalString('name', 100),
    commonValidations.optionalString('description', 500),
    commonValidations.boolean('enabled'),
    handleValidationErrors
], async (req, res) => {
    try {
        const p = await compliance_policy_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!p)
            return res.status(404).json({ error: 'Not found' });
        res.json(p);
    }
    catch (e) {
        const err = e;
        res.status(400).json({ error: err.message });
    }
});
// حذف سياسة
router.delete('/:id', (0, rbac_1.requirePermission)('manage-policies'), sanitizeInput, [commonValidations.mongoId('id'), handleValidationErrors], async (req, res) => {
    try {
        const deleted = await compliance_policy_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
    }
    catch (e) {
        const err = e;
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
