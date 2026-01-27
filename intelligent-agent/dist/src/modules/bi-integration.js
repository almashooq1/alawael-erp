"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIIntegration = void 0;
// وحدة تكامل ذكاء الأعمال (BI Integration)
const fs_1 = __importDefault(require("fs"));
class BIIntegration {
    // Export audit log as CSV for BI tools
    static exportAuditCSV() {
        if (!fs_1.default.existsSync('audit.log'))
            return '';
        const lines = fs_1.default.readFileSync('audit.log', 'utf8').split('\n').filter(Boolean);
        const rows = lines.map(line => {
            try {
                const entry = JSON.parse(line);
                return [entry.timestamp, entry.action, entry.userId, entry.requestId, JSON.stringify(entry.details || {})].join(',');
            }
            catch {
                return '';
            }
        });
        return ['timestamp,action,userId,requestId,details', ...rows].filter(Boolean).join('\n');
    }
}
exports.BIIntegration = BIIntegration;
