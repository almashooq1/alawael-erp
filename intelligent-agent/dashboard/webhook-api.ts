import express from 'express';
import { sendWebhook } from '../src/modules/webhook-integration';
const router = express.Router();

// إرسال Webhook يدوي
router.post('/send', async (req, res) => {
  const { url, event, data } = req.body;
  if (!url || !event) return res.status(400).json({ error: 'url, event required' });
  try {
    await sendWebhook({ url, event, data });
    res.json({ ok: true });
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
