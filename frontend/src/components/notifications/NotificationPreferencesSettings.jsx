import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, FormControlLabel, Switch, Button, Snackbar, Alert, Divider } from '@mui/material';
import usersService from '../../services/usersService';

const NOTIFICATION_EVENTS = [
  { key: 'templateApproved', label: 'موافقة القالب' },
  { key: 'templateRejected', label: 'رفض القالب' },
  { key: 'reminder', label: 'تذكير' },
  { key: 'securityAlert', label: 'تنبيه أمني' },
  { key: 'systemUpdate', label: 'تحديث النظام' },
  // أضف أحداث أخرى حسب الحاجة
];
const CHANNELS = ['inApp', 'email', 'sms', 'whatsapp'];
const CHANNEL_LABELS = { inApp: 'داخل النظام', email: 'بريد إلكتروني', sms: 'رسائل SMS', whatsapp: 'واتساب' };

export default function NotificationPreferencesSettings() {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    usersService.getMe().then(user => {
      setPreferences(user.notificationPreferences || {});
    });
  }, []);

  const handleToggle = (eventKey, channel) => (e) => {
    setPreferences(prev => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        [channel]: e.target.checked,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await usersService.updateMe({ notificationPreferences: preferences });
      setSnackbar({ open: true, msg: 'تم حفظ إعدادات الأحداث بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ open: true, msg: 'حدث خطأ أثناء الحفظ', severity: 'error' });
    }
    setLoading(false);
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>إعدادات التنبيه حسب الحدث والقناة</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" flexDirection="column" gap={2}>
          {NOTIFICATION_EVENTS.map(ev => (
            <Box key={ev.key} sx={{ mb: 1 }}>
              <Typography fontWeight={600} sx={{ mb: 1 }}>{ev.label}</Typography>
              <Box display="flex" gap={2}>
                {CHANNELS.map(ch => (
                  <FormControlLabel
                    key={ch}
                    control={<Switch checked={!!(preferences[ev.key]?.[ch])} onChange={handleToggle(ev.key, ch)} />}
                    label={CHANNEL_LABELS[ch]}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleSave} disabled={loading}>حفظ الإعدادات</Button>
        <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.msg}</Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
