import React, { useEffect, useState } from 'react';
import { Switch, FormControlLabel, Button, Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';

const NotificationPreferencesPanel = () => {
  const [prefs, setPrefs] = useState({ inApp: true, email: true, sms: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    axios.get('/api/notifications/preferences')
      .then(res => {
        setPrefs(res.data.preferences || { inApp: true, email: true, sms: true });
        setLoading(false);
      })
      .catch(() => {
        setError('تعذر جلب التفضيلات');
        setLoading(false);
      });
  }, []);

  const handleChange = (channel) => (e) => {
    setPrefs({ ...prefs, [channel]: e.target.checked });
  };

  const handleSave = () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    axios.put('/api/notifications/preferences', { notificationChannels: prefs })
      .then(() => {
        setSuccess(true);
        setSaving(false);
      })
      .catch(() => {
        setError('تعذر حفظ التفضيلات');
        setSaving(false);
      });
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={2} maxWidth={400}>
      <Typography variant="h6" gutterBottom>تفضيلات الإشعارات</Typography>
      <FormControlLabel
        control={<Switch checked={prefs.inApp} onChange={handleChange('inApp')} />}
        label="إشعارات داخل النظام"
      />
      <FormControlLabel
        control={<Switch checked={prefs.email} onChange={handleChange('email')} />}
        label="بريد إلكتروني"
      />
      <FormControlLabel
        control={<Switch checked={prefs.sms} onChange={handleChange('sms')} />}
        label="رسائل SMS"
      />
      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          حفظ التغييرات
        </Button>
        {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
        {success && <Typography color="success.main" ml={2}>تم الحفظ بنجاح</Typography>}
        {error && <Typography color="error" ml={2}>{error}</Typography>}
      </Box>
    </Box>
  );
};

export default NotificationPreferencesPanel;
