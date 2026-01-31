"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDataToWebhook = exportDataToWebhook;
// Generic Webhook Export Module
const axios_1 = __importDefault(require("axios"));
const export_import_logger_1 = require("./export-import-logger");
async function exportDataToWebhook({ userId, webhookUrl, payload, headers = {}, eventType = 'generic', }) {
    const response = await axios_1.default.post(webhookUrl, payload, { headers });
    export_import_logger_1.ExportImportLogger.log({
        timestamp: new Date().toISOString(),
        userId,
        operation: 'export',
        format: 'webhook',
        details: { webhookUrl, eventType, status: response.status }
    });
    return response.status;
}
