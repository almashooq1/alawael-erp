"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleExternalLearningImport = scheduleExternalLearningImport;
// External Learning Data Import Scheduler
const node_schedule_1 = __importDefault(require("node-schedule"));
const axios_1 = __importDefault(require("axios"));
const interaction_logger_1 = require("./interaction-logger");
function scheduleExternalLearningImport(url, token, cron = '0 8 * * 0') {
    node_schedule_1.default.scheduleJob(cron, async () => {
        try {
            const response = await axios_1.default.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            let arr = response.data;
            if (!Array.isArray(arr))
                arr = [arr];
            for (const row of arr) {
                interaction_logger_1.InteractionLogger.log({
                    timestamp: new Date().toISOString(),
                    input: JSON.stringify(row),
                    output: '',
                });
            }
            console.log(`[ExternalLearning] Imported ${arr.length} records from external API.`);
        }
        catch (e) {
            console.error('[ExternalLearning] Import failed:', e.message);
        }
    });
}
