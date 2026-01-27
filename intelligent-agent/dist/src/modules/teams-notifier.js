"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTeamsMessage = sendTeamsMessage;
// Teams Notifier Module
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = __importDefault(require("./config"));
async function sendTeamsMessage(text) {
    const url = config_1.default.get('TEAMS_WEBHOOK_URL');
    if (!url)
        throw new Error('TEAMS_WEBHOOK_URL not set');
    await (0, node_fetch_1.default)(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
}
