"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFromGitHubRaw = importFromGitHubRaw;
// GitHub Learning Data Importer
const axios_1 = __importDefault(require("axios"));
const interaction_logger_1 = require("./interaction-logger");
async function importFromGitHubRaw(rawUrl) {
    const response = await axios_1.default.get(rawUrl);
    let arr = response.data;
    if (typeof arr === 'string' && rawUrl.endsWith('.json'))
        arr = JSON.parse(arr);
    if (!Array.isArray(arr))
        arr = [arr];
    for (const row of arr)
        interaction_logger_1.InteractionLogger.log({
            timestamp: new Date().toISOString(),
            input: JSON.stringify(row),
            output: '',
        });
    return arr.length;
}
