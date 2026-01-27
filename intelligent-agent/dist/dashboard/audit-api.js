"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const express_1 = __importDefault(require("express"));
const audit_trail_1 = require("../src/modules/audit-trail");
const router = express_1.default.Router();
// إضافة سجل تدقيق (تستخدم داخلياً)
function logAudit(userId, action, resource, details) {
    audit_trail_1.AuditTrail.log({ userId, action, resource, details });
}
// API: استعراض سجل التدقيق (مدير فقط)
router.get('/audit', (req, res) => {
    // ... تحقق من صلاحية الجلسة هنا ...
    res.json(audit_trail_1.AuditTrail.query());
});
exports.default = router;
