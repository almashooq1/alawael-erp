import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Chip, Divider, Button } from '@mui/material';
import { fetchAuditLog } from '../../services/auditService';
import { getSmartNotifications } from '../../services/notificationsSmartService';

const SecurityCenter = () => {
  const [audit, setAudit] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAuditLog(),
      getSmartNotifications()
    ]).then(([auditData, notifData]) => {
      setAudit(auditData);
      setNotifications(notifData);
      setLoading(false);
    });
  }, []);

  if (loading) return <Typography>جاري التحميل...</Typography>;

  return (
    <Box>
      <Typography variant="h4" mb={2}>مركز الأمان والتحكم</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={1}>آخر التنبيهات الأمنية</Typography>
            {notifications.length === 0 && <Typography color="text.secondary">لا توجد تنبيهات</Typography>}
            {notifications.slice(0, 5).map((n, i) => (
              <Box key={n.id || i} mb={1}>
                <Chip label={n.title} color="error" sx={{ mr: 1 }} />
                <Typography variant="body2" display="inline">{n.message}</Typography>
                <Typography variant="caption" color="text.secondary" ml={2}>{n.date}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={1}>سجل تدقيق التغييرات</Typography>
            {audit.length === 0 && <Typography color="text.secondary">لا يوجد سجل تدقيق</Typography>}
            {audit.slice(0, 5).map((log, i) => (
              <Box key={i} mb={1}>
                <Chip label={log.action} color={log.action === 'تغيير صلاحيات' ? 'warning' : 'info'} sx={{ mr: 1 }} />
                <Typography variant="body2" display="inline">{log.details}</Typography>
                <Typography variant="caption" color="text.secondary" ml={2}>{log.date} - {log.user}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
      <Divider sx={{ my: 3 }} />
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={1}>تحليل أمني سريع</Typography>
        <Typography variant="body2" color="text.secondary">
          {notifications.length > 0 && notifications.some(n => n.message.includes('حذف') || n.message.includes('إزالة'))
            ? 'تنبيه: تم رصد تغييرات حساسة في الصلاحيات مؤخرًا. يُنصح بالمراجعة الفورية.'
            : 'لا توجد تغييرات حساسة مسجلة مؤخرًا.'}
        </Typography>
        <Button variant="outlined" color="primary" sx={{ mt: 2 }}>إعدادات التنبيهات</Button>
      </Paper>
    </Box>
  );
};

export default SecurityCenter;
