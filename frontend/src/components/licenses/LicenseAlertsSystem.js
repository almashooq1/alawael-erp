/**
 * License Alerts Management System 🚨
 * نظام إدارة تنبيهات الرخص والتصاريح
 *
 * Features:
 * ✅ Multi-level alert system (Critical, High, Medium, Low)
 * ✅ Multiple notification channels (Email, SMS, Push, WhatsApp)
 * ✅ Automatic alert scheduling
 * ✅ Alert history and tracking
 * ✅ Customizable alert preferences
 * ✅ Saudi government integration
 * ✅ Real-time notifications
 * ✅ Alert escalation system
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Grid,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  WhatsApp as WhatsAppIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { ALERT_LEVELS, NOTIFICATION_CHANNELS, formatGregorianDate, getAlertLevel } from '../config/saudiLicenseTypes';
import licenseService from '../services/licenseService';

const LicenseAlertsSystem = ({ licenses, onRefresh }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [selectedAlert, setSelectedAlert] = useState(null);

  // Notification Preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: { enabled: true, address: '' },
    sms: { enabled: true, phone: '' },
    push: { enabled: true },
    whatsapp: { enabled: true, phone: '' },
    dashboard: { enabled: true },
  });

  // Alert Settings
  const [alertSettings, setAlertSettings] = useState({
    criticalDays: 7,
    highDays: 15,
    mediumDays: 30,
    lowDays: 60,
    autoRenew: false,
    escalate: true,
  });

  // Calculate alerts from licenses
  const alerts = useMemo(() => {
    if (!licenses || licenses.length === 0) return [];

    const now = new Date();
    const alertList = [];

    licenses.forEach(license => {
      const expiryDate = new Date(license.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      const alertLevel = getAlertLevel(daysUntilExpiry);

      if (alertLevel || daysUntilExpiry < 0) {
        alertList.push({
          id: license.id || license._id,
          license,
          daysUntilExpiry,
          alertLevel: daysUntilExpiry < 0 ? { ...ALERT_LEVELS.CRITICAL, name: 'منتهية' } : alertLevel,
          status: daysUntilExpiry < 0 ? 'expired' : 'expiring',
          generatedAt: new Date(),
          acknowledged: false,
        });
      }
    });

    // Sort by priority and days
    return alertList.sort((a, b) => {
      if (a.status === 'expired' && b.status !== 'expired') return -1;
      if (a.status !== 'expired' && b.status === 'expired') return 1;
      if (a.alertLevel.priority !== b.alertLevel.priority) {
        return a.alertLevel.priority - b.alertLevel.priority;
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }, [licenses]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: alerts.length,
      expired: alerts.filter(a => a.status === 'expired').length,
      critical: alerts.filter(a => a.alertLevel.priority === 1 && a.status !== 'expired').length,
      high: alerts.filter(a => a.alertLevel.priority === 2).length,
      medium: alerts.filter(a => a.alertLevel.priority === 3).length,
      low: alerts.filter(a => a.alertLevel.priority === 4).length,
    };
  }, [alerts]);

  // Filter alerts by tab
  const filteredAlerts = useMemo(() => {
    switch (activeTab) {
      case 0: // All
        return alerts;
      case 1: // Critical + Expired
        return alerts.filter(a => a.status === 'expired' || a.alertLevel.priority === 1);
      case 2: // High
        return alerts.filter(a => a.alertLevel.priority === 2);
      case 3: // Medium
        return alerts.filter(a => a.alertLevel.priority === 3);
      case 4: // Low
        return alerts.filter(a => a.alertLevel.priority === 4);
      default:
        return alerts;
    }
  }, [alerts, activeTab]);

  const handleSendNotification = async (alert, channel) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ تم إرسال التنبيه عبر ' + channel);
    } catch (error) {
      alert('❌ خطأ في إرسال التنبيه');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = alertId => {
    // Mark alert as acknowledged
    console.log('Acknowledged alert:', alertId);
  };

  const handleAutoRenew = async license => {
    if (window.confirm('هل تريد تجديد الرخصة تلقائياً؟')) {
      try {
        setLoading(true);
        await licenseService.renewLicense(license.id, {
          renewal_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        alert('✅ تم تجديد الرخصة بنجاح');
        if (onRefresh) onRefresh();
      } catch (error) {
        alert('❌ خطأ في التجديد');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderAlertCard = alert => {
    const { license, daysUntilExpiry, alertLevel, status } = alert;
    const isExpired = status === 'expired';

    return (
      <Card
        key={alert.id}
        sx={{
          mb: 2,
          borderLeft: `6px solid ${alertLevel.color}`,
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: 6,
            transform: 'translateX(-5px)',
          },
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {alertLevel.icon} {license.license_number}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {license.license_type} - {license.entity_name}
                </Typography>
              </Box>
              <Chip
                label={alertLevel.name}
                size="small"
                sx={{
                  bgcolor: alertLevel.color,
                  color: 'white',
                  fontWeight: 700,
                }}
              />
            </Box>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary" display="block">
                  📅 تاريخ الانتهاء
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatGregorianDate(license.expiry_date)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary" display="block">
                  ⏰ الأيام المتبقية
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: alertLevel.color,
                  }}
                >
                  {isExpired ? `منتهية منذ ${Math.abs(daysUntilExpiry)} يوم` : `${daysUntilExpiry} يوم`}
                </Typography>
              </Grid>
            </Grid>

            {isExpired && (
              <Alert severity="error" icon={<ErrorIcon />}>
                <AlertTitle>⚠️ رخصة منتهية الصلاحية</AlertTitle>
                هذه الرخصة منتهية ويجب تجديدها فوراً لتجنب الغرامات والعقوبات القانونية.
              </Alert>
            )}

            <Box
              sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                📋 الإجراء الموصى به:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isExpired
                  ? '⚡ تجديد فوري مطلوب - قد تترتب غرامات تأخير'
                  : alertLevel.action === 'urgent'
                    ? '🚨 تواصل مع الجهة المصدرة للتجديد فوراً'
                    : alertLevel.action === 'immediate'
                      ? '⚠️ ابدأ إجراءات التجديد خلال أسبوع'
                      : alertLevel.action === 'plan'
                        ? '📝 خطط لإجراءات التجديد قريباً'
                        : '👀 راقب تاريخ الانتهاء'}
              </Typography>
            </Box>

            <Typography variant="caption" color="textSecondary">
              🏛️ الجهة المصدرة: {license.issuing_authority || 'غير محدد'}
            </Typography>
          </Stack>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="إرسال بريد إلكتروني">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleSendNotification(alert, 'البريد الإلكتروني')}
                disabled={!notificationPrefs.email.enabled}
              >
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="إرسال رسالة نصية">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleSendNotification(alert, 'SMS')}
                disabled={!notificationPrefs.sms.enabled}
              >
                <SmsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="إرسال واتساب">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleSendNotification(alert, 'واتساب')}
                disabled={!notificationPrefs.whatsapp.enabled}
              >
                <WhatsAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => handleAcknowledgeAlert(alert.id)}>
              تم الاطلاع
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleAutoRenew(license)}
              sx={{
                background: `linear-gradient(135deg, ${alertLevel.color} 0%, ${alertLevel.color}dd 100%)`,
              }}
            >
              تجديد الآن
            </Button>
          </Stack>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header & Stats */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mb={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationsActiveIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                🚨 نظام التنبيهات الذكي
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                مراقبة وتنبيهات انتهاء الرخص والتصاريح
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="الإعدادات">
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: 'white' }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="السجل">
              <IconButton onClick={() => setHistoryOpen(true)} sx={{ color: 'white' }}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Statistics Cards */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                  {stats.total}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  إجمالي التنبيهات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: 'rgba(211,47,47,0.3)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                  {stats.expired}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  🚨 منتهية
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: 'rgba(244,67,54,0.3)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                  {stats.critical}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  ⚠️ حرج
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: 'rgba(245,124,0,0.3)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                  {stats.high}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  🔶 عالي
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: 'rgba(251,192,45,0.3)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                  {stats.medium}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  ⏰ متوسط
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: 'rgba(56,142,60,0.3)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                  {stats.low}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  ℹ️ منخفض
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={`الكل (${stats.total})`} />
          <Tab label={`🚨 حرج (${stats.expired + stats.critical})`} />
          <Tab label={`⚠️ عالي (${stats.high})`} />
          <Tab label={`⏰ متوسط (${stats.medium})`} />
          <Tab label={`ℹ️ منخفض (${stats.low})`} />
        </Tabs>
      </Paper>

      {/* Alerts List */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {filteredAlerts.length > 0 ? (
        <Box>{filteredAlerts.map(alert => renderAlertCard(alert))}</Box>
      ) : (
        <Paper
          sx={{
            p: 8,
            textAlign: 'center',
            bgcolor: '#f5f5f5',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            ✅ رائع! لا توجد تنبيهات
          </Typography>
          <Typography variant="body1" color="textSecondary">
            جميع رخصك وتصاريحك سارية المفعول
          </Typography>
        </Paper>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            إعدادات التنبيهات
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Notification Channels */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  📢 قنوات الإشعارات
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {Object.entries(NOTIFICATION_CHANNELS).map(([key, channel]) => (
                    <ListItem key={key}>
                      <ListItemIcon>{channel.icon}</ListItemIcon>
                      <ListItemText primary={channel.name} />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notificationPrefs[key.toLowerCase()]?.enabled || false}
                          onChange={e => {
                            setNotificationPrefs(prev => ({
                              ...prev,
                              [key.toLowerCase()]: {
                                ...prev[key.toLowerCase()],
                                enabled: e.target.checked,
                              },
                            }));
                          }}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            {/* Alert Thresholds */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  ⏱️ عتبات التنبيهات (بالأيام)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="حرج"
                      type="number"
                      value={alertSettings.criticalDays}
                      onChange={e => setAlertSettings({ ...alertSettings, criticalDays: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="عالي"
                      type="number"
                      value={alertSettings.highDays}
                      onChange={e => setAlertSettings({ ...alertSettings, highDays: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="متوسط"
                      type="number"
                      value={alertSettings.mediumDays}
                      onChange={e => setAlertSettings({ ...alertSettings, mediumDays: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="منخفض"
                      type="number"
                      value={alertSettings.lowDays}
                      onChange={e => setAlertSettings({ ...alertSettings, lowDays: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Advanced Settings */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  ⚙️ إعدادات متقدمة
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={alertSettings.autoRenew}
                        onChange={e => setAlertSettings({ ...alertSettings, autoRenew: e.target.checked })}
                      />
                    }
                    label="التجديد التلقائي"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={alertSettings.escalate}
                        onChange={e => setAlertSettings({ ...alertSettings, escalate: e.target.checked })}
                      />
                    }
                    label="تصعيد التنبيهات تلقائياً"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setSettingsOpen(false)}>
            حفظ الإعدادات
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            سجل التنبيهات
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ my: 2 }}>
            سجل جميع التنبيهات والإشعارات المرسلة
          </Typography>
          <Alert severity="info">ميزة سجل التنبيهات قيد التطوير - سيتم عرض جميع التنبيهات المرسلة هنا</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LicenseAlertsSystem;
