"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.sendAndPersist = sendAndPersist;
const node_fetch_1 = __importDefault(require("node-fetch"));
const rateLimit_1 = require("./rateLimit");
const persistence_1 = require("./persistence");
const logger_1 = require("./infra/logger");
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_ID = process.env.PHONE_NUMBER_ID || '';
const GRAPH = process.env.GRAPH_VERSION || 'v19.0';
async function sendMessage({ to, body, template }) {
    const payload = template
        ? { messaging_product: 'whatsapp', to, type: 'template', template }
        : { messaging_product: 'whatsapp', to, type: 'text', text: { body } };
    const url = `https://graph.facebook.com/${GRAPH}/${PHONE_ID}/messages`;
    const res = await (0, node_fetch_1.default)(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Send failed ${res.status}: ${text}`);
    }
    return res.json();
}
async function sendAndPersist(payload) {
    await (0, rateLimit_1.enforceRateLimit)(payload.to);
    const result = await sendMessage(payload);
    const messageId = result?.messages?.[0]?.id;
    await (0, persistence_1.persistOutboundMessage)({
        to: payload.to,
        body: payload.body,
        templateName: payload.templateName,
        waMessageId: messageId,
        status: 'sent',
    });
    logger_1.logger.info({ to: payload.to, messageId }, 'Outbound sent and stored');
    return { messageId, raw: result };
}
