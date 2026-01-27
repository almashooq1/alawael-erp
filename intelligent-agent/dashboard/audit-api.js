"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const express_1 = __importDefault(require("express"));
const audit_trail_1 = require("../src/modules/audit-trail");
const router = express_1.default.Router();
const audit = new audit_trail_1.AuditTrail();
// إضافة سجل تدقيق (تستخدم داخلياً)
function logAudit(userId, action, resource, details) {
    audit.log({ userId, action, resource, details, timestamp: new Date().toISOString() });
}
// API: استعراض سجل التدقيق (مدير فقط)
router.get('/audit', (req, res) => {
    // ... تحقق من صلاحية الجلسة هنا ...
    res.json(audit.query());
});
exports.default = router;
