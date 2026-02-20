import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, LinearProgress } from '@mui/material';
import { fetchAuditLog } from '../../services/auditService';
import { getSmartNotifications } from '../../services/notificationsSmartService';

const SecurityDashboard = () => {
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

  if (loading) return <LinearProgress />;

  // Simple analytics
  const criticalChanges = audit.filter(a => a.action.includes('تغيير صلاحيات') || a.action.includes('حذف'));
  const totalChanges = audit.length;
  const criticalPercent = totalChanges ? Math.round((criticalChanges.length / totalChanges) * 100) : 0;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" mb={2}>لوحة تحكم الأمان</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="body1">إجمالي تغييرات RBAC:</Typography>
          <Typography variant="h5" color="primary">{totalChanges}</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="body1">تغييرات حرجة (حذف/تغيير صلاحيات):</Typography>
          <Typography variant="h5" color="error">{criticalChanges.length}</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="body1">نسبة التغييرات الحرجة:</Typography>
          <Typography variant="h5" color={criticalPercent > 30 ? 'error' : 'success.main'}>{criticalPercent}%</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SecurityDashboard;
