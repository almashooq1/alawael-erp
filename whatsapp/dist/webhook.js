"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_1 = __importDefault(require("express"));
const persistence_1 = require("./persistence");
const logger_1 = require("./infra/logger");
const templates_1 = __importDefault(require("./api/templates"));
const app = (0, express_1.default)();
exports.app = app;
// Register routes
app.use('/api/templates', templates_1.default);
// Keep raw body for signature verification
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
const APP_SECRET = process.env.APP_SECRET || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';
function verifySignature(req) {
    const sig = req.header('X-Hub-Signature-256');
    if (!sig || !APP_SECRET)
        return false;
    const hmac = crypto_1.default.createHmac('sha256', APP_SECRET).update(req.rawBody || '').digest('hex');
    return sig === `sha256=${hmac}`;
}
app.get('/webhook', (req, res) => {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (token === VERIFY_TOKEN && challenge) {
        return res.send(challenge);
    }
    return res.status(403).send('Invalid verify token');
});
app.post('/webhook', async (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).send('Bad signature');
    }
    try {
        const change = req.body?.entry?.[0]?.changes?.[0];
        const message = change?.value?.messages?.[0];
        const from = message?.from;
        const body = message?.text?.body;
        if (from && body) {
            await (0, persistence_1.persistInboundMessage)({ from, body, raw: message });
        }
        return res.sendStatus(200);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Webhook processing failed');
        return res.status(500).send('Internal error');
    }
});
