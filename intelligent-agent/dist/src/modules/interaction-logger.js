"use strict";
// Self-Learning Data Collector
// Logs user interactions and system outputs for continuous learning
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_PATH = path_1.default.join(__dirname, '../../data/interaction-logs.jsonl');
class InteractionLogger {
    static log(entry) {
        const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
        fs_1.default.appendFileSync(LOG_PATH, line + '\n', 'utf8');
    }
    static getAll(filter) {
        if (!fs_1.default.existsSync(LOG_PATH))
            return [];
        let logs = fs_1.default.readFileSync(LOG_PATH, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line));
        if (filter) {
            if (filter.userId)
                logs = logs.filter(l => l.userId === filter.userId);
            if (filter.from !== undefined)
                logs = logs.filter(l => l.timestamp >= filter.from);
            if (filter.to !== undefined)
                logs = logs.filter(l => l.timestamp <= filter.to);
        }
        return logs;
    }
    static clearAll() {
        if (fs_1.default.existsSync(LOG_PATH))
            fs_1.default.writeFileSync(LOG_PATH, '', 'utf8');
    }
    static deleteByUser(userId) {
        if (!fs_1.default.existsSync(LOG_PATH))
            return;
        const logs = InteractionLogger.getAll().filter(l => l.userId !== userId);
        fs_1.default.writeFileSync(LOG_PATH, logs.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');
    }
}
exports.InteractionLogger = InteractionLogger;
