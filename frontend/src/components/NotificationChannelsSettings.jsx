// واجهة إعدادات قنوات التنبيه للمستخدم
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, FormControlLabel, Switch, Button, Snackbar, Alert } from '@mui/material';
import usersService from '../services/usersService';

export default function NotificationChannelsSettings() {
  const [channels, setChannels] = useState({ inApp: true, email: true, sms: true, whatsapp: true });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    // تحميل إعدادات المستخدم الحالية
    usersService.getMe().then(user => {
      setChannels(user.notificationChannels || { inApp: true, email: true, sms: true, whatsapp: true });
    });
  }, []);

  const handleToggle = (key) => (e) => {
    setChannels(prev => ({ ...prev, [key]: e.target.checked }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await usersService.updateMe({ notificationChannels: channels });
      setSnackbar({ open: true, msg: 'تم حفظ إعدادات التنبيه بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ open: true, msg: 'حدث خطأ أثناء الحفظ', severity: 'error' });
    }
    setLoading(false);
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>إعدادات قنوات التنبيه</Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <FormControlLabel control={<Switch checked={channels.inApp} onChange={handleToggle('inApp')} />} label="تنبيهات داخل النظام" />
          <FormControlLabel control={<Switch checked={channels.email} onChange={handleToggle('email')} />} label="بريد إلكتروني" />
          <FormControlLabel control={<Switch checked={channels.sms} onChange={handleToggle('sms')} />} label="رسائل SMS" />
          <FormControlLabel control={<Switch checked={channels.whatsapp} onChange={handleToggle('whatsapp')} />} label="رسائل WhatsApp" />
        </Box>
        <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleSave} disabled={loading}>حفظ الإعدادات</Button>
        <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.msg}</Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
