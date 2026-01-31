"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRiskToIntegration = sendRiskToIntegration;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
// إعدادات التكامل (يمكن جعلها ديناميكية من قاعدة البيانات لاحقاً)
const INTEGRATION_URL = process.env.ERP_DMS_WEBHOOK_URL || '';
// Webhook: استقبال بيانات من نظام خارجي
router.post('/integrations/risk-webhook', async (req, res) => {
    // مثال: استقبال مخاطرة من ERP أو DMS
    const data = req.body;
    // يمكن تخصيص المنطق حسب نوع النظام
    // ...
    res.json({ received: true, data });
});
// إرسال مخاطرة عالية تلقائياً إلى النظام الخارجي
async function sendRiskToIntegration(risk, action) {
    if (!INTEGRATION_URL)
        return;
    try {
        await axios_1.default.post(INTEGRATION_URL, { risk, action });
    }
    catch (e) {
        // يمكن تسجيل الخطأ في سجل خاص
        console.error('Integration error:', e.message);
    }
}
exports.default = router;
