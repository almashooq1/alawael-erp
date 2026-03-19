/**
 * Advanced Admin Panel — لوحة الإدارة المتقدمة
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Assessment as ReportIcon,
  Notifications as NotifIcon,
  Speed as SpeedIcon,
  CloudDone as CloudIcon,
} from '@mui/icons-material';
import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { gradients, statusColors } from '../../theme/palette';

const systemStats = [
  { label: 'المستخدمون النشطون', value: '127', icon: <PeopleIcon />, color: statusColors.primaryBlue },
  { label: 'استخدام المعالج', value: '34%', icon: <SpeedIcon />, color: statusColors.successDark },
  { label: 'التخزين المستخدم', value: '67%', icon: <StorageIcon />, color: statusColors.warningDark },
  { label: 'وقت التشغيل', value: '99.9%', icon: <CloudIcon />, color: statusColors.purpleDark },
];

const recentActions = [
  { user: 'أحمد محمد', action: 'تسجيل دخول', time: 'منذ 5 دقائق', type: 'auth' },
  { user: 'سارة علي', action: 'تحديث إعدادات', time: 'منذ 15 دقيقة', type: 'settings' },
  { user: 'فاطمة حسن', action: 'إضافة مستفيد', time: 'منذ 30 دقيقة', type: 'data' },
  { user: 'خالد عبدالله', action: 'تصدير تقرير', time: 'منذ ساعة', type: 'report' },
];

const AdvancedAdminPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get('/admin/overview');
        setStats(data);
      } catch (err) {
        logger.warn('Could not fetch admin overview:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>لوحة الإدارة</Typography>
            <Typography variant="body2">إعدادات وأدوات الإدارة</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            لوحة الإدارة المتقدمة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة شاملة للنظام والمستخدمين
          </Typography>
        </Box>
        <Chip label="مدير النظام" color="primary" icon={<SecurityIcon />} />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* System Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {systemStats.map((stat, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: stat.color + '20', color: stat.color }}>
                  {stat.icon}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<PeopleIcon />} label="المستخدمون" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="الإعدادات" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="الأمان" iconPosition="start" />
          <Tab icon={<ReportIcon />} label="التقارير" iconPosition="start" />
          <Tab icon={<NotifIcon />} label="الإشعارات" iconPosition="start" />
        </Tabs>

        <CardContent>
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>آخر الأنشطة</Typography>
              <List>
                {recentActions.map((action, i) => (
                  <Box key={i}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          {action.user[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={action.user}
                        secondary={`${action.action} — ${action.time}`}
                      />
                      <Chip label={action.type} size="small" variant="outlined" />
                    </ListItem>
                    {i < recentActions.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Box>
          )}
          {activeTab === 1 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <SettingsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">إعدادات النظام</Typography>
              <Typography color="text.secondary">إدارة الإعدادات العامة للنظام</Typography>
              <Button variant="contained" sx={{ mt: 2 }}>فتح الإعدادات</Button>
            </Box>
          )}
          {activeTab === 2 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">إعدادات الأمان</Typography>
              <Typography color="text.secondary">إدارة سياسات الأمان والصلاحيات</Typography>
              <Button variant="contained" sx={{ mt: 2 }}>إدارة الأمان</Button>
            </Box>
          )}
          {activeTab === 3 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <ReportIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">التقارير الإدارية</Typography>
              <Typography color="text.secondary">عرض وتصدير التقارير</Typography>
              <Button variant="contained" sx={{ mt: 2 }}>عرض التقارير</Button>
            </Box>
          )}
          {activeTab === 4 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <NotifIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">إدارة الإشعارات</Typography>
              <Typography color="text.secondary">إعداد وإدارة إشعارات النظام</Typography>
              <Button variant="contained" sx={{ mt: 2 }}>إدارة الإشعارات</Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedAdminPanel;
