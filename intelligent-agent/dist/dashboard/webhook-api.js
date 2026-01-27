"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const webhook_integration_1 = require("../src/modules/webhook-integration");
const router = express_1.default.Router();
// إرسال Webhook يدوي
router.post('/send', async (req, res) => {
    const { url, event, data } = req.body;
    if (!url || !event)
        return res.status(400).json({ error: 'url, event required' });
    try {
        await (0, webhook_integration_1.sendWebhook)({ url, event, data });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
