"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// نموذج سياسة الامتثال (Compliance Policy)
const mongoose_1 = __importDefault(require("mongoose"));
const CompliancePolicySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    rules: { type: Object, default: {} }, // يمكن تخصيص القواعد لاحقاً
    riskAlertThreshold: { type: Number, default: 70 }, // عتبة التنبيه الافتراضية لهذه السياسة
    userThresholdOverrides: { type: Object, default: {} }, // { userId: threshold }
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
CompliancePolicySchema.pre('save', function () {
    this.updatedAt = new Date();
});
exports.default = mongoose_1.default.model('CompliancePolicy', CompliancePolicySchema);
