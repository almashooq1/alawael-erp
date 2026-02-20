import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, TextField, MenuItem, CircularProgress, Divider, Chip } from '@mui/material';
import scheduledNotificationsService from '../../services/scheduledNotificationsService';

const channelOptions = [
  { value: 'in-app', label: 'داخل النظام' },
  { value: 'email', label: 'البريد الإلكتروني' },
  { value: 'sms', label: 'رسالة نصية' },
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'push', label: 'إشعار جوال' },
];

export default function ScheduleNotificationPanel({ userId }) {
  const [form, setForm] = useState({ title: '', message: '', channels: ['in-app'], scheduleTime: '', });
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchScheduled = async () => {
    setLoading(true);
    try {
      const res = await scheduledNotificationsService.getMyScheduled();
      setScheduled(res.data);
    } catch {
      setError('فشل في جلب الإشعارات المجدولة');
    }
    setLoading(false);
  };

  useEffect(() => { fetchScheduled(); }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleChannelsChange = e => {
    setForm(f => ({ ...f, channels: Array.isArray(e.target.value) ? e.target.value : [e.target.value] }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      await scheduledNotificationsService.schedule({ ...form, userId });
      setSuccess('تم جدولة الإشعار بنجاح');
      setForm({ title: '', message: '', channels: ['in-app'], scheduleTime: '' });
      fetchScheduled();
    } catch {
      setError('فشل في جدولة الإشعار');
    }
    setLoading(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, minWidth: 340, maxWidth: 500 }}>
      <Typography variant="h6" fontWeight={600} mb={2}>جدولة إشعار/تذكير</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="العنوان" name="title" value={form.title} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
        <TextField label="الرسالة" name="message" value={form.message} onChange={handleChange} fullWidth required multiline rows={2} sx={{ mb: 2 }} />
        <TextField
          select
          label="القنوات"
          name="channels"
          value={form.channels}
          onChange={handleChannelsChange}
          fullWidth
          SelectProps={{ multiple: true }}
          sx={{ mb: 2 }}
        >
          {channelOptions.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="وقت الإرسال"
          name="scheduleTime"
          type="datetime-local"
          value={form.scheduleTime}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mb: 2 }}>
          {loading ? 'جاري الجدولة...' : 'جدولة الإشعار'}
        </Button>
        {success && <Typography color="success.main" mb={1}>{success}</Typography>}
        {error && <Typography color="error.main" mb={1}>{error}</Typography>}
      </form>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" mb={1}>الإشعارات المجدولة القادمة:</Typography>
      {loading ? <CircularProgress size={24} /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {scheduled.length === 0 ? <Typography variant="caption">لا يوجد إشعارات مجدولة</Typography> :
            scheduled.map(s => (
              <Chip key={s._id} label={`${s.title} - ${new Date(s.scheduleTime).toLocaleString('ar-EG')}`} color={s.sent ? 'success' : 'info'} />
            ))}
        </Box>
      )}
    </Paper>
  );
}
