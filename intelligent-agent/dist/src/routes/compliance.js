"use strict";
// REST API لتقارير وتنبيهات الامتثال
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rbac_1 = require("../middleware/rbac");
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
// استيراد middleware التحقق المركزي
const { sanitizeInput, commonValidations, handleValidationErrors } = require('../../../backend/middleware/requestValidation');
const router = express_1.default.Router();
// جلب أحدث أحداث الامتثال
router.get('/events', (0, rbac_1.requirePermission)('view-reports'), sanitizeInput, async (req, res) => {
    const events = await compliance_event_1.default.find().sort({ timestamp: -1 }).limit(100);
    res.json(events);
});
// جلب حدث واحد بالمعرف
router.get('/events/:id', (0, rbac_1.requirePermission)('view-reports'), sanitizeInput, [commonValidations.mongoId('id'), handleValidationErrors], async (req, res) => {
    const event = await compliance_event_1.default.findById(req.params.id);
    if (!event)
        return res.status(404).json({ error: 'Not found' });
    res.json(event);
});
// إحصائيات الامتثال
router.get('/stats', (0, rbac_1.requirePermission)('view-reports'), sanitizeInput, async (req, res) => {
    const total = await compliance_event_1.default.countDocuments();
    const byStatus = await compliance_event_1.default.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json({ total, byStatus });
});
// تنبيهات الامتثال (أحداث فشل أو تحذير فقط)
router.get('/alerts', (0, rbac_1.requirePermission)('view-reports'), sanitizeInput, async (req, res) => {
    const alerts = await compliance_event_1.default.find({ status: { $in: ['fail', 'warning'] } }).sort({ timestamp: -1 }).limit(50);
    res.json(alerts);
});
// بحث بالأحداث حسب الحالة
router.get('/status/:status', (0, rbac_1.requirePermission)('view-reports'), sanitizeInput, [commonValidations.requiredString('status', 2, 20), handleValidationErrors], async (req, res) => {
    const events = await compliance_event_1.default.find({ status: req.params.status }).sort({ timestamp: -1 }).limit(100);
    res.json(events);
});
exports.default = router;
