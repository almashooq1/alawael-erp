"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportImportLogger = void 0;
// سجل عمليات التصدير/الاستيراد
// يتم تسجيل كل عملية مع الوقت، المستخدم (إن وجد)، نوع العملية، التفاصيل
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_PATH = path_1.default.join(__dirname, '../../data/export-import-log.jsonl');
class ExportImportLogger {
    static log(entry) {
        const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
        fs_1.default.appendFileSync(LOG_PATH, line + '\n', 'utf8');
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
exports.ExportImportLogger = ExportImportLogger;
