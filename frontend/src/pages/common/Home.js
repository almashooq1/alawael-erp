import { useState, useEffect, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';
import moduleMocks from 'data/moduleMocks';
import { useRealTimeKPIs } from 'contexts/SocketContext';
import { dashboardAPI } from 'services/api';
import { gradients, statusColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ScienceIcon from '@mui/icons-material/Science';
import ShieldIcon from '@mui/icons-material/Shield';
import HomeIcon from '@mui/icons-material/Home';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

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
      { title: 'الصيانة والتشغيل', path: '/operations', icon: <SupportAgentIcon /> },
    ],
  },
  {
    title: 'الميزات المؤسسية الاحترافية',
    color: 'secondary',
    items: [
      { title: 'التدقيق والامتثال', path: '/audit-compliance', icon: <ShieldIcon /> },
      { title: 'مولد التقارير', path: '/report-builder', icon: <QueryStatsIcon /> },
      { title: 'التقويم الموحد', path: '/calendar-hub', icon: <AccessTimeIcon /> },
      { title: 'CRM المتقدم', path: '/crm-pro', icon: <GroupsIcon /> },
      { title: 'المستودعات الذكية', path: '/warehouse-intelligence', icon: <AccountTreeIcon /> },
      { title: 'إدارة المشاريع', path: '/project-management', icon: <ScienceIcon /> },
      { title: 'الاستيراد والتصدير', path: '/import-export', icon: <ScienceIcon /> },
    ],
  },
  {
    title: 'الميزات المؤسسية المتقدمة',
    color: 'primary',
    items: [
      { title: 'التوظيف واستقطاب المواهب', path: '/talent-acquisition', icon: <GroupsIcon /> },
      { title: 'إدارة المرافق والعقارات', path: '/facility-management', icon: <AccountTreeIcon /> },
      { title: 'إدارة علاقات الموردين', path: '/vendor-management', icon: <SupportAgentIcon /> },
      { title: 'خدمات تقنية المعلومات', path: '/itsm', icon: <ScienceIcon /> },
      { title: 'السلامة والصحة المهنية', path: '/ehs-safety', icon: <ShieldIcon /> },
      { title: 'التخطيط الاستراتيجي', path: '/strategic-planning', icon: <QueryStatsIcon /> },
    ],
  },
  {
    title: 'الحلول المؤسسية الفائقة',
    color: 'secondary',
    items: [
      { title: 'الشؤون القانونية', path: '/legal-management', icon: <ShieldIcon /> },
      { title: 'الحوكمة المؤسسية', path: '/corporate-governance', icon: <AccountTreeIcon /> },
      { title: 'استمرارية الأعمال', path: '/business-continuity', icon: <ScienceIcon /> },
      { title: 'تجربة العملاء', path: '/customer-experience', icon: <SupportAgentIcon /> },
      { title: 'الاستدامة والطاقة', path: '/sustainability', icon: <QueryStatsIcon /> },
      { title: 'التحول الرقمي', path: '/digital-transformation', icon: <GroupsIcon /> },
    ],
  },
];

const Home = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [error, setError] = useState(null);

  // Real-time KPI subscriptions for different modules
  const { kpis: reportsKPIs, lastUpdate: reportsLastUpdate } = useRealTimeKPIs('reports');
  const { kpis: financeKPIs, lastUpdate: financeLastUpdate } = useRealTimeKPIs('finance');
  const { kpis: hrKPIs, lastUpdate: hrLastUpdate } = useRealTimeKPIs('hr');
  const { kpis: securityKPIs, lastUpdate: securityLastUpdate } = useRealTimeKPIs('security');

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        await dashboardAPI.getSummary();
        setError(null);
      } catch (_err) {
        // Fall back to mock data silently - real-time KPIs via socket will still work
        showSnackbar('حدث خطأ أثناء تحميل بيانات الصفحة الرئيسية', 'error');
        setError(null);
      }
    };

    fetchHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    []
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HomeIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الصفحة الرئيسية
            </Typography>
            <Typography variant="body2">
              مرحباً بك في نظام مراكز الأوائل للرعاية النهارية
            </Typography>
          </Box>
        </Box>
      </Box>

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
              تنقّل سريع بين التشغيل، الأعمال، الموارد، التعلم، والأمن. استخدم الروابط السريعة أدناه
              للوصول إلى كل نظام أو ابدأ من التقارير الموحدة.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/reports')}
                endIcon={<ArrowForwardIcon />}
              >
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
              <Chip
                label={`آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {kpis.map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ p: 2, position: 'relative', overflow: 'hidden' }}>
              <IconButton
                aria-label="إجراء"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  bgcolor: 'primary.main',
                  color: '#fff',
                }}
              >
                {kpi.icon}
              </IconButton>
              <CardContent sx={{ pt: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 1 }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {kpi.value}
                  </Typography>
                  {kpi.chartData && (
                    <Sparkline
                      data={kpi.chartData}
                      color={
                        kpi.tone === 'error'
                          ? statusColors.redMid
                          : kpi.tone === 'warning'
                            ? statusColors.orangeMid
                            : statusColors.tealMid
                      }
                      width={70}
                      height={28}
                    />
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  color={
                    kpi.tone === 'error'
                      ? 'error.main'
                      : kpi.tone === 'warning'
                        ? 'warning.main'
                        : 'success.main'
                  }
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
          <Button
            variant="text"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/reports')}
          >
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
                    {alert.amount && (
                      <Chip label={alert.amount} size="small" color="primary" variant="outlined" />
                    )}
                    <IconButton
                      aria-label="التالي"
                      size="small"
                      color="primary"
                      onClick={() => navigate(alert.path)}
                    >
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
          <Button
            variant="text"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/reports')}
          >
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
                    <Chip
                      label={group.title}
                      color={group.color === 'primary' ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
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
