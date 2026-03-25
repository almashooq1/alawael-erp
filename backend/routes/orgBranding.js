const express = require('express');
const router = express.Router();
const OrgBranding = require('../models/OrgBranding');
const { requireAdmin } = require('../middleware/auth');

// ثيمات معدة مسبقاً
const PRESET_THEMES = [
  {
    id: 'default',
    name: 'الافتراضي',
    color: '#667eea',
    secondaryColor: '#764ba2',
    accentColor: '#f093fb',
  },
  {
    id: 'ocean',
    name: 'المحيط',
    color: '#0077b6',
    secondaryColor: '#00b4d8',
    accentColor: '#90e0ef',
  },
  {
    id: 'forest',
    name: 'الغابة',
    color: '#2d6a4f',
    secondaryColor: '#40916c',
    accentColor: '#95d5b2',
  },
  {
    id: 'sunset',
    name: 'الغروب',
    color: '#e63946',
    secondaryColor: '#f77f00',
    accentColor: '#fcbf49',
  },
  {
    id: 'royal',
    name: 'ملكي',
    color: '#7b2cbf',
    secondaryColor: '#9d4edd',
    accentColor: '#c77dff',
  },
  {
    id: 'midnight',
    name: 'منتصف الليل',
    color: '#1a1a2e',
    secondaryColor: '#16213e',
    accentColor: '#0f3460',
  },
];

// الحصول على الثيمات المُعدّة مسبقاً (MUST be before /:orgId)
router.get('/themes/presets', async (req, res) => {
  res.json({ success: true, data: PRESET_THEMES });
});

// Get branding for org
router.get('/:orgId', async (req, res) => {
  try {
    const branding = await OrgBranding.findOne({ orgId: req.params.orgId });
    res.json(branding || {});
  } catch (err) {
    res.status(500).json({ error: 'Error fetching branding' });
  }
});

// Update branding (admin only) — تحديث شامل
router.post('/:orgId', requireAdmin, async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'nameEn',
      'shortName',
      'tagline',
      'taglineEn',
      'description',
      'logo',
      'favicon',
      'color',
      'secondaryColor',
      'accentColor',
      'headerBgColor',
      'sidebarBgColor',
      'footerBgColor',
      'fontFamily',
      'headingFontFamily',
      'fontSize',
      'borderRadius',
      'sidebarStyle',
      'sidebarWidth',
      'enableAnimations',
      'enableGlassEffect',
      'enableShadows',
      'compactMode',
      'darkMode',
      'autoDarkMode',
      'loginBgType',
      'loginBgColor',
      'loginBgGradient',
      'loginBgImage',
      'loginCardStyle',
      'loginShowLogo',
      'loginShowTagline',
      'footerText',
      'enableWatermark',
      'watermarkText',
      'enableCustomCSS',
      'customCSS',
      'enableRTL',
      'showBreadcrumbs',
      'showSearchBar',
      'showNotifications',
      'enableMultiLanguage',
      'defaultLanguage',
      'appliedTheme',
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    updateData.updatedBy = req.user?.id || req.user?._id;
    updateData.updatedAt = new Date();

    const updated = await OrgBranding.findOneAndUpdate({ orgId: req.params.orgId }, updateData, {
      upsert: true,
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating branding' });
  }
});

// رفع شعار
router.post('/:orgId/logo', requireAdmin, async (req, res) => {
  try {
    const { logo } = req.body; // base64 encoded
    const updated = await OrgBranding.findOneAndUpdate(
      { orgId: req.params.orgId },
      { logo, updatedBy: req.user?.id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: { logo: updated.logo } });
  } catch (err) {
    res.status(500).json({ error: 'Error uploading logo' });
  }
});

// حذف الشعار
router.delete('/:orgId/logo', requireAdmin, async (req, res) => {
  try {
    await OrgBranding.findOneAndUpdate(
      { orgId: req.params.orgId },
      { logo: '', updatedBy: req.user?.id, updatedAt: new Date() }
    );
    res.json({ success: true, message: 'Logo removed' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting logo' });
  }
});

// رفع أيقونة
router.post('/:orgId/favicon', requireAdmin, async (req, res) => {
  try {
    const { favicon } = req.body;
    const updated = await OrgBranding.findOneAndUpdate(
      { orgId: req.params.orgId },
      { favicon, updatedBy: req.user?.id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: { favicon: updated.favicon } });
  } catch (err) {
    res.status(500).json({ error: 'Error uploading favicon' });
  }
});

// تطبيق ثيم معدّ مسبقاً
router.post('/:orgId/apply-theme', requireAdmin, async (req, res) => {
  try {
    const { themeId } = req.body;
    const theme = PRESET_THEMES.find(t => t.id === themeId);
    if (!theme) {
      return res.status(400).json({ error: 'Theme not found' });
    }

    const updated = await OrgBranding.findOneAndUpdate(
      { orgId: req.params.orgId },
      {
        color: theme.color,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        appliedTheme: themeId,
        updatedBy: req.user?.id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error applying theme' });
  }
});

// تصدير إعدادات الهوية
router.get('/:orgId/export', requireAdmin, async (req, res) => {
  try {
    const branding = await OrgBranding.findOne({ orgId: req.params.orgId }).lean();
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }
    // حذف الحقول الداخلية
    delete branding._id;
    delete branding.__v;
    delete branding.orgId;
    delete branding.updatedBy;
    res.json({ success: true, data: branding });
  } catch (err) {
    res.status(500).json({ error: 'Error exporting branding' });
  }
});

// استيراد إعدادات الهوية
router.post('/:orgId/import', requireAdmin, async (req, res) => {
  try {
    const importData = req.body;
    // حذف الحقول المحمية
    delete importData._id;
    delete importData.__v;
    delete importData.orgId;
    importData.updatedBy = req.user?.id;
    importData.updatedAt = new Date();

    const updated = await OrgBranding.findOneAndUpdate({ orgId: req.params.orgId }, importData, {
      upsert: true,
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error importing branding' });
  }
});

module.exports = router;
