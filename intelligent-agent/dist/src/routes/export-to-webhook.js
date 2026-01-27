"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Route to export data to an external webhook
const express_1 = __importDefault(require("express"));
const export_to_webhook_1 = require("../modules/export-to-webhook");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
// POST /export/webhook
router.post('/webhook', (0, rbac_1.rbac)(['admin', 'integration-manager']), async (req, res) => {
    const { userId, webhookUrl, payload, headers, eventType } = req.body;
    if (!webhookUrl || !payload)
        return res.status(400).json({ error: 'webhookUrl and payload required' });
    try {
        const status = await (0, export_to_webhook_1.exportDataToWebhook)({ userId, webhookUrl, payload, headers, eventType });
        res.json({ success: true, status });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
