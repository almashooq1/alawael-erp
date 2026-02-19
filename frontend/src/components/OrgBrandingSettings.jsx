import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Input, FormControl, InputLabel, CircularProgress } from '@mui/material';
import orgBrandingService from '../services/orgBrandingService';

/**
 * واجهة إعدادات الشعار والألوان المؤسسية
 */

const ORG_ID = window.ORG_ID || localStorage.getItem('orgId') || 'default-org';

const OrgBrandingSettings = () => {
  const [orgName, setOrgName] = useState('');
  const [orgColor, setOrgColor] = useState('#667eea');
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // جلب بيانات الهوية المؤسسية من السيرفر عند التحميل
  useEffect(() => {
    let ignore = false;
    async function fetchBranding() {
      setLoading(true);
      setError('');
      try {
        const branding = await orgBrandingService.fetch(ORG_ID);
        if (!ignore && branding) {
          setOrgName(branding.name || '');
          setOrgColor(branding.color || '#667eea');
          setLogoPreview(branding.logo || '');
          // مزامنة مع localStorage
          localStorage.setItem('orgName', branding.name || '');
          localStorage.setItem('orgColor', branding.color || '#667eea');
          if (branding.logo) localStorage.setItem('orgLogo', branding.logo);
        }
      } catch (err) {
        // fallback: استخدم localStorage
        setOrgName(localStorage.getItem('orgName') || '');
        setOrgColor(localStorage.getItem('orgColor') || '#667eea');
        setLogoPreview(localStorage.getItem('orgLogo') || '');
        setError('تعذر جلب بيانات الهوية المؤسسية من الخادم. تم استخدام البيانات المحلية.');
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
    return () => { ignore = true; };
  }, []);

  const handleLogoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // حفظ الهوية المؤسسية في السيرفر + localStorage
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await orgBrandingService.update(ORG_ID, { name: orgName, color: orgColor, logo: logoPreview });
      localStorage.setItem('orgName', orgName);
      localStorage.setItem('orgColor', orgColor);
      if (logoPreview) localStorage.setItem('orgLogo', logoPreview);
      alert('تم حفظ إعدادات المؤسسة بنجاح!');
    } catch (err) {
      setError('تعذر حفظ الإعدادات على الخادم. تم الحفظ محلياً فقط.');
      localStorage.setItem('orgName', orgName);
      localStorage.setItem('orgColor', orgColor);
      if (logoPreview) localStorage.setItem('orgLogo', logoPreview);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 3, border: '1px solid #eee', borderRadius: 2, background: '#fafbfc' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>إعدادات المؤسسة (الشعار والألوان)</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TextField
            label="اسم المؤسسة"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel htmlFor="org-color">لون المؤسسة</InputLabel>
            <Input
              id="org-color"
              type="color"
              value={orgColor}
              onChange={e => setOrgColor(e.target.value)}
              sx={{ width: 60, height: 40, p: 0, border: 'none', background: 'none' }}
            />
          </FormControl>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">شعار المؤسسة (PNG/JPG)</Typography>
            <input type="file" accept="image/*" onChange={handleLogoChange} />
            {logoPreview && (
              <Box sx={{ mt: 1 }}>
                <img src={logoPreview} alt="شعار المؤسسة" style={{ maxWidth: 120, maxHeight: 60, border: '1px solid #ddd', borderRadius: 4 }} />
              </Box>
            )}
          </Box>
          <Button variant="contained" color="primary" onClick={handleSave} fullWidth disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
          {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        </>
      )}
    </Box>
  );
};

export default OrgBrandingSettings;
