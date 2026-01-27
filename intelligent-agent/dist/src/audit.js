"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Audit = void 0;
// نظام تدقيق (Audit Trail)
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
class Audit {
    static log(action, userId, details, requestId) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            userId,
            requestId,
            details
        };
        fs_1.default.appendFileSync('audit.log', JSON.stringify(entry) + '\n');
    }
    // بحث وتصفية في سجل التدقيق
    static async search(filter) {
        const results = [];
        const rl = readline_1.default.createInterface({
            input: fs_1.default.createReadStream('audit.log'),
            crlfDelay: Infinity
        });
        for await (const line of rl) {
            try {
                const entry = JSON.parse(line);
                let match = true;
                for (const key of Object.keys(filter)) {
                    if (filter[key] && entry[key] !== filter[key])
                        match = false;
                }
                if (match)
                    results.push(entry);
            }
            catch { }
        }
        return results;
    }
}
exports.Audit = Audit;
