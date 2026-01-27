import express from 'express';
import axios from 'axios';
import Risk from '../models/risk.model';

const router = express.Router();

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
export async function sendRiskToIntegration(risk: any, action: string) {
  if (!INTEGRATION_URL) return;
  try {
    await axios.post(INTEGRATION_URL, { risk, action });
  } catch (e) {
    // يمكن تسجيل الخطأ في سجل خاص
    console.error('Integration error:', e.message);
  }
}

export default router;
