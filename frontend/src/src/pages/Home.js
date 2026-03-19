import React, { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, Divider, Stack, Chip, IconButton, Alert } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  AccountTree as AccountTreeIcon,
  Groups as GroupsIcon,
  AccessTime as AccessTimeIcon,
  Science as ScienceIcon,
  QueryStats as QueryStatsIcon,
  SupportAgent as SupportAgentIcon,
  ArrowForward as ArrowForwardIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import moduleMocks from '../data/moduleMocks';
import Sparkline from '../components/Sparkline';
import { useRealTimeKPIs } from '../contexts/SocketContext';

const moduleGroups = [
  {
    title: 'التشغيل والقياس',
    color: 'primary',
    items: [
      { title: 'لوحة التشغيل', path: '/dashboard', icon: <AccountTreeIcon /> },
      { title: 'التقارير والتحليلات', path: '/reports', icon: <QueryStatsIcon /> },
      { title: 'النشاط اللحظي', path: '/activity', icon: <TrendingUpIcon /> },
    ],
  },
  {
    title: 'الأعمال والمالية',
    color: 'secondary',
    items: [
      { title: 'إدارة علاقات العملاء (CRM)', path: '/crm', icon: <GroupsIcon /> },
      { title: 'المالية والمحاسبة', path: '/finance', icon: <TrendingUpIcon /> },
      { title: 'المشتريات والمخزون', path: '/procurement', icon: <SupportAgentIcon /> },
    ],
  },
  {
    title: 'الموارد والفرق',
    color: 'primary',
    items: [
      { title: 'الموارد البشرية', path: '/hr', icon: <GroupsIcon /> },
      { title: 'الحضور والإجازات', path: '/attendance', icon: <AccessTimeIcon /> },
      { title: 'الرواتب', path: '/payroll', icon: <TrendingUpIcon /> },
    ],
  },
  {
    title: 'التعلم والرعاية',
    color: 'secondary',
    items: [
      { title: 'التعلم الإلكتروني', path: '/elearning', icon: <ScienceIcon /> },
      { title: 'الجلسات والمواعيد', path: '/sessions', icon: <AccessTimeIcon /> },
      { title: 'إعادة التأهيل والعلاج', path: '/rehab', icon: <SupportAgentIcon /> },
    ],
  },
  {
    title: 'الأمن والتشغيل',
    color: 'primary',
    items: [
      { title: 'الأمن والحماية', path: '/security', icon: <ShieldIcon /> },
      { title: 'المراقبة والكاميرات', path: '/surveillance', icon: <ShieldIcon /> },
      { title: 'الصيانة والتشغيل', path: '/maintenance', icon: <SupportAgentIcon /> },
    ],
  },
];

const Home = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  // Real-time KPI subscriptions for different modules
  const { kpis: reportsKPIs, lastUpdate: reportsLastUpdate } = useRealTimeKPIs('reports');
  const { kpis: financeKPIs, lastUpdate: financeLastUpdate } = useRealTimeKPIs('finance');
  const { kpis: hrKPIs, lastUpdate: hrLastUpdate } = useRealTimeKPIs('hr');
  const { kpis: securityKPIs, lastUpdate: securityLastUpdate } = useRealTimeKPIs('security');

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // API call would happen here to fetch initial dashboard data
        setError(null);
      } catch (err) {
        console.error('Failed to fetch home data:', err);
        setError('Failed to load dashboard data');
      }
    };

    fetchHomeData();
  }, []);

  const kpis = useMemo(() => {
    // Use real-time KPIs if available, otherwise fall back to mock data
    const getKPIWithRealTime = (mockKPI, realtimeKPIs, moduleIcon) => {
      if (realtimeKPIs && realtimeKPIs.length > 0) {
        // Merge real-time data with mock template
        return {
          ...realtimeKPIs[0],
          icon: moduleIcon,
          path: mockKPI.path,
        };
      }
      return {
        ...mockKPI,
        icon: moduleIcon,
        path: mockKPI.path,
      };
    };

    return [
      getKPIWithRealTime(moduleMocks.reports.kpis[0], reportsKPIs, <QueryStatsIcon />),
      getKPIWithRealTime(moduleMocks.finance.kpis[0], financeKPIs, <TrendingUpIcon />),
      getKPIWithRealTime(moduleMocks.hr.kpis[0], hrKPIs, <AccessTimeIcon />),
      getKPIWithRealTime(moduleMocks.security.kpis[0], securityKPIs, <ShieldIcon />),
    ];
  }, [reportsKPIs, financeKPIs, hrKPIs, securityKPIs]);

  const alerts = useMemo(
    () => [
      { ...moduleMocks.security.items[0], path: '/security' },
      { ...moduleMocks.finance.items[1], path: '/finance' },
      { ...moduleMocks.rehab.items[2], path: '/rehab' },
      { ...moduleMocks.crm.items[0], path: '/crm' },
    ],
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && (
        <Alert severity="error" icon={<ErrorOutlineIcon />}>
          {error} - يتم استخدام البيانات التجريبية
        </Alert>
      )}

      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Chip label="تحكم موحّد" color="primary" variant="outlined" sx={{ mb: 1 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              كل الأنظمة في لوحة واحدة
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              تنقّل سريع بين التشغيل، الأعمال، الموارد، التعلم، والأمن. استخدم الروابط السريعة أدناه للوصول إلى كل نظام أو ابدأ من التقارير
              الموحدة.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => navigate('/reports')} endIcon={<ArrowForwardIcon />}>
                التقارير الذكية
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => navigate('/crm')}>
                افتح CRM
              </Button>
              <Button variant="outlined" onClick={() => navigate('/security')}>
                مركز الأمان
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Card>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              مؤشرات الأداء الرئيسية
            </Typography>
            {(reportsLastUpdate || financeLastUpdate || hrLastUpdate || securityLastUpdate) && (
              <Chip label={`آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`} size="small" variant="outlined" color="primary" />
            )}
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {kpis.map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ p: 2, position: 'relative', overflow: 'hidden' }}>
              <IconButton size="small" sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'primary.main', color: '#fff' }}>
                {kpi.icon}
              </IconButton>
              <CardContent sx={{ pt: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {kpi.value}
                  </Typography>
                  {kpi.chartData && (
                    <Sparkline
                      data={kpi.chartData}
                      color={kpi.tone === 'error' ? '#dc2626' : kpi.tone === 'warning' ? '#ea580c' : '#0f766e'}
                      width={70}
                      height={28}
                    />
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  color={kpi.tone === 'error' ? 'error.main' : kpi.tone === 'warning' ? 'warning.main' : 'success.main'}
                >
                  {kpi.trend}
                </Typography>
                {kpi.path && (
                  <Button
                    size="small"
                    variant="text"
                    sx={{ mt: 1 }}
                    onClick={() => navigate(kpi.path)}
                    endIcon={<ArrowForwardIcon fontSize="small" />}
                  >
                    فتح
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              تنبيهات سريعة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              مزيج من الأمن، المالية، والرعاية لمراجعة عاجلة.
            </Typography>
          </Box>
          <Button variant="text" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/reports')}>
            عرض التفاصيل
          </Button>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={1.5}>
          {alerts.map((alert, idx) => (
            <Grid item xs={12} md={6} key={`${alert.title}-${idx}`}>
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {alert.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.status}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {alert.amount && <Chip label={alert.amount} size="small" color="primary" variant="outlined" />}
                    <IconButton size="small" color="primary" onClick={() => navigate(alert.path)}>
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Card>

      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              الأنظمة المتاحة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              اختر النظام للوصول السريع إلى أهم الصفحات والإجراءات.
            </Typography>
          </Box>
          <Button variant="text" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/reports')}>
            عرض التقارير الموحدة
          </Button>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          {moduleGroups.map(group => (
            <Grid item xs={12} md={6} key={group.title}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={group.title} color={group.color === 'primary' ? 'primary' : 'secondary'} variant="outlined" />
                  </Stack>
                  <Grid container spacing={1.5}>
                    {group.items.map(item => (
                      <Grid item xs={12} key={item.title}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color={group.color === 'primary' ? 'primary' : 'secondary'}
                          startIcon={item.icon}
                          onClick={() => navigate(item.path)}
                          sx={{ justifyContent: 'space-between', borderRadius: 2 }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {item.title}
                          </Typography>
                          <ArrowForwardIcon fontSize="small" />
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Box>
  );
};

export default Home;
