/**
 * 🏢 نظام الأصول الموحد - Fixed Assets System
 * AlAwael ERP - Unified Assets Routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  assetNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['equipment', 'vehicle', 'furniture', 'building', 'computer', 'other'] },
  purchaseCost: { type: Number, required: true },
  salvageValue: { type: Number, default: 0 },
  usefulLife: { type: Number, required: true },
  accumulatedDepreciation: { type: Number, default: 0 },
  netBookValue: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'disposed', 'maintenance'], default: 'active' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdAt: { type: Date, default: Date.now }
});

const Asset = mongoose.model('Asset', AssetSchema);

router.get('/assets', async (req, res) => {
  try {
    const assets = await Asset.find({ organization: req.user.organization });
    res.json({ success: true, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/assets', async (req, res) => {
  try {
    const asset = new Asset({ ...req.body, organization: req.user.organization });
    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const assets = await Asset.find({ organization: req.user.organization });
    res.json({ success: true, data: { total: assets.length, totalValue: assets.reduce((s, a) => s + a.purchaseCost, 0) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
