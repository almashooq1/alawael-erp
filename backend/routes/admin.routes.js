const express = require('express');
const router = express.Router();
const BackupService = require('../services/backup.service');
const ApiKey = require('../models/ApiKey');
const { checkPermission } = require('../middleware/checkPermission');
const AuditService = require('../services/audit.service');

// ================= BACKUP ROUTES =================

/**
 * @desc List Backups
 * @access Admin
 */
router.get('/backups', async (req, res) => {
  try {
    const backups = await BackupService.listBackups();
    res.json({ success: true, count: backups.length, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc Trigger Manual Backup
 * @access Admin
 */
router.post('/backups/create', async (req, res) => {
  try {
    const backup = await BackupService.createBackup(req.user ? req.user.id : 'ADMIN_API');
    res.json({ success: true, message: 'Backup created', data: backup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= API KEY ROUTES =================

/**
 * @desc Get All API Keys
 * @access Admin
 */
router.get('/apikeys', async (req, res) => {
  try {
    const keys = await ApiKey.find({}).populate('owner', 'name email');
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc Generate New API Key
 * @access Admin
 */
router.post('/apikeys', async (req, res) => {
  try {
    const { name, permissions, daysValid } = req.body;

    const keyString = ApiKey.generateKey();
    const expiresAt = daysValid ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000) : null;

    const apiKey = await ApiKey.create({
      key: keyString,
      name,
      owner: req.user.id,
      permissions,
      expiresAt,
    });

    // Audit
    await AuditService.log(req, 'GENERATE_API_KEY', 'INTEGRATION', { type: 'ApiKey', id: apiKey.id }, null, 'SUCCESS');

    res.status(201).json({
      success: true,
      data: { ...apiKey.toObject(), key: keyString }, // Return full key only once
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc Revoke API Key
 * @access Admin
 */
router.delete('/apikeys/:id', async (req, res) => {
  try {
    await ApiKey.findByIdAndDelete(req.params.id);
    await AuditService.log(req, 'REVOKE_API_KEY', 'INTEGRATION', { type: 'ApiKey', id: req.params.id }, null, 'SUCCESS');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
