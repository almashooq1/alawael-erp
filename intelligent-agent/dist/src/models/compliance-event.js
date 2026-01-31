"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// نموذج حدث الامتثال (Compliance Event)
const mongoose_1 = __importDefault(require("mongoose"));
const ComplianceEventSchema = new mongoose_1.default.Schema({
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: false },
    action: { type: String, required: true }, // مثال: 'login', 'update', 'delete', 'permission-change'
    resource: { type: String, required: true }, // مثال: 'contract', 'meeting', 'user', ...
    resourceId: { type: String, required: false },
    status: { type: String, required: true }, // 'success' | 'fail' | 'warning'
    resolved: { type: Boolean, default: false }, // تم حل المشكلة أو لا
    details: { type: String },
    policy: { type: String }, // اسم سياسة الامتثال المرتبطة
});
exports.default = mongoose_1.default.model('ComplianceEvent', ComplianceEventSchema);
