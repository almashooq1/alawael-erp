"use strict";
// عقد: سجل نشاطات ذكي
// يسجل كل عملية على العقد (إنشاء، تعديل، حذف، رفع ملف، تغيير حالة، تجديد)
// ويتيح الاستعلام حسب العقد
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractActivityLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_PATH = path_1.default.join(__dirname, '../../data/contract-activity-logs.jsonl');
class ContractActivityLogger {
    static log(entry) {
        const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
        fs_1.default.appendFileSync(LOG_PATH, line + '\n', 'utf8');
    }
    static getByContract(contractId) {
        if (!fs_1.default.existsSync(LOG_PATH))
            return [];
        return fs_1.default.readFileSync(LOG_PATH, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line))
            .filter((l) => l.contractId === contractId);
    }
    static getAll() {
        if (!fs_1.default.existsSync(LOG_PATH))
            return [];
        return fs_1.default.readFileSync(LOG_PATH, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line));
    }
    static clearAll() {
        if (fs_1.default.existsSync(LOG_PATH))
            fs_1.default.writeFileSync(LOG_PATH, '', 'utf8');
    }
}
exports.ContractActivityLogger = ContractActivityLogger;
