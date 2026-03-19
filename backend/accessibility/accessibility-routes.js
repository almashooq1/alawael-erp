/* eslint-disable no-unused-vars */
/**
 * Accessibility Routes for Disability Rehabilitation
 * مسارات الوصولية
 */

const express = require('express');
const router = express.Router();
const { AccessibilityService } = require('./accessibility-service');

const accessService = new AccessibilityService();

/**
 * @route POST /api/accessibility/adjust-interface/:id
 * @desc تعديل الواجهة حسب نوع الإعاقة
 */
router.post('/adjust-interface/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { disabilityType } = req.body;
    const result = await accessService.adjustInterfaceForDisability(id, disabilityType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route GET /api/accessibility/sign-language/:id
 * @desc خدمات لغة الإشارة
 */
router.get('/sign-language/:id', async (req, res) => {
  try {
    const result = await accessService.getSignLanguageService(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route GET /api/accessibility/settings/:id
 * @desc إعدادات الوصولية
 */
router.get('/settings/:id', async (req, res) => {
  try {
    const result = await accessService.getAccessibilitySettings(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route PUT /api/accessibility/settings/:id
 * @desc تحديث إعدادات الوصولية
 */
router.put('/settings/:id', async (req, res) => {
  try {
    const result = await accessService.updateAccessibilitySettings(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
