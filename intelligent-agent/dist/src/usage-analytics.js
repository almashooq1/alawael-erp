"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageAnalytics = void 0;
// وحدة تحليلات الاستخدام (Usage Analytics)
const fs_1 = __importDefault(require("fs"));
class UsageAnalytics {
    static track(event, details) {
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            details
        };
        fs_1.default.appendFileSync('usage.log', JSON.stringify(entry) + '\n');
    }
}
exports.UsageAnalytics = UsageAnalytics;
