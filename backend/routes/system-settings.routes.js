/**
 * ⚙️ System Settings Routes — إعدادات النظام
 * /api/v1/system-settings/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data) => res.json({ success: true, data });

router.get('/', (req, res) =>
  ok(res, {
    general: { systemName: 'AlAwael ERP', language: 'ar', timezone: 'Asia/Riyadh' },
    appearance: { theme: 'light', primaryColor: '#1565C0' },
    notifications: { email: true, sms: false, push: true },
    security: { sessionTimeout: 30, mfaEnabled: false },
    maintenance: { maintenanceMode: false },
  })
);

router.put('/', (req, res) => ok(res, { updated: true, settings: req.body }));
router.post('/reset/:section', (req, res) => ok(res, { reset: true, section: req.params.section }));
router.post('/maintenance/toggle', (req, res) =>
  ok(res, { maintenanceMode: false, toggled: true })
);

module.exports = router;
