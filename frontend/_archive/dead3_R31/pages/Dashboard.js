import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Divider, Stack, Chip, IconButton } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  Business as BusinessIcon,
  Groups as GroupsIcon,
  School as SchoolIcon,
  LocalHospital as LocalHospitalIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, withMockFallback } from '../services/api';
import { useRealtimeDashboard } from '../contexts/SocketContext';
import moduleMocks from '../data/moduleMocks';
import Sparkline from '../components/Sparkline';

const Dashboard = () => {
  const navigate = useNavigate();
  const [summaryCards, setSummaryCards] = useState([]);
  const [topKPIs, setTopKPIs] = useState([]);

  // Real-time dashboard updates from WebSocket
  const { summaryCards: realtimeSummaryCards, topKPIs: realtimeTopKPIs, lastUpdate: dashboardLastUpdate } = useRealtimeDashboard();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch summary cards and top KPIs from API
        const [summarySystems, topKpisData] = await Promise.all([
          withMockFallback(() => dashboardAPI.getSummarySystems(), []),
          withMockFallback(() => dashboardAPI.getTopKPIs(4), []),
        ]);

        // Fallback to mock data if API doesn't return structured data
        if (!summarySystems || summarySystems.length === 0) {
          setSummaryCards(getMockSummaryCards());
        } else {
          setSummaryCards(summarySystems);
        }

        if (!topKpisData || topKpisData.length === 0) {
          setTopKPIs(getMockTopKPIs());
        } else {
          setTopKPIs(topKpisData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // Fallback to mock data
        setSummaryCards(getMockSummaryCards());
        setTopKPIs(getMockTopKPIs());
      }
    };

    fetchDashboardData();
  }, []);

  // Update with real-time data when available
  useEffect(() => {
    if (realtimeSummaryCards && realtimeSummaryCards.length > 0) {
      setSummaryCards(realtimeSummaryCards);
    }
    if (realtimeTopKPIs && realtimeTopKPIs.length > 0) {
      setTopKPIs(realtimeTopKPIs);
    }
  }, [realtimeSummaryCards, realtimeTopKPIs]);

  const getMockSummaryCards = () => [
    {
      title: 'الأعمال والمالية',
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      color: 'primary',
      stats: [
        { label: 'صفقات مفتوحة', value: moduleMocks.crm.kpis[0].value },
        { label: 'فواتير مستحقة', value: moduleMocks.finance.kpis[0].value },
      ],
      path: '/finance',
    },
    {
      title: 'الموارد البشرية',
      icon: <GroupsIcon sx={{ fontSize: 40 }} />,
      color: 'secondary',
      stats: [
        { label: 'معدل الحضور', value: moduleMocks.hr.kpis[0].value },
        { label: 'طلبات إجازة', value: moduleMocks.hr.kpis[1].value },
      ],
      path: '/hr',
    },
    {
      title: 'التعلم والتطوير',
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      color: 'primary',
      stats: [
        { label: 'دورات نشطة', value: moduleMocks.elearning.kpis[0].value },
        { label: 'إكمال الأسبوع', value: moduleMocks.elearning.kpis[1].value },
      ],
      path: '/elearning',
    },
    {
      title: 'الرعاية والتأهيل',
      icon: <LocalHospitalIcon sx={{ fontSize: 40 }} />,
      color: 'secondary',
      stats: [
        { label: 'جلسات اليوم', value: moduleMocks.rehab.kpis[0].value },
        { label: 'خطط نشطة', value: moduleMocks.rehab.kpis[1].value },
      ],
      path: '/rehab',
    },
    {
      title: 'الأمن والحماية',
      icon: <ShieldIcon sx={{ fontSize: 40 }} />,
      color: 'primary',
      stats: [
        { label: 'تنبيهات أمنية', value: moduleMocks.security.kpis[0].value },
        { label: 'حالة الكاميرات', value: moduleMocks.security.kpis[1].value },
      ],
      path: '/security',
    },
    {
      title: 'التقارير والتحليلات',
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: 'secondary',
      stats: [
        { label: 'تقارير محدثة', value: moduleMocks.reports.kpis[0].value },
        { label: 'اكتمال البيانات', value: moduleMocks.reports.kpis[2].value },
      ],
      path: '/reports',
    },
  ];

  const getMockTopKPIs = () => [
    { ...moduleMocks.finance.kpis[0], icon: <BusinessIcon />, path: '/finance' },
    { ...moduleMocks.hr.kpis[0], icon: <GroupsIcon />, path: '/hr' },
    { ...moduleMocks.security.kpis[0], icon: <ShieldIcon />, path: '/security' },
    { ...moduleMocks.reports.kpis[2], icon: <TrendingUpIcon />, path: '/reports' },
  ];

  return (
    <Box>
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Chip label="لوحة التشغيل الموحدة" color="primary" variant="outlined" sx={{ mb: 1 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              نظرة شاملة على الأنظمة
            </Typography>
            <Typography variant="body1" color="text.secondary">
              عرض سريع لأهم المؤشرات عبر كافة الأنظمة. انقر على أي بطاقة للمزيد من التفاصيل.
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => navigate('/reports')} endIcon={<ArrowForwardIcon />}>
            التقارير الكاملة
          </Button>
        </Stack>
      </Card>

      {dashboardLastUpdate && (
        <Chip
          label={`آخر تحديث: ${new Date(dashboardLastUpdate).toLocaleTimeString('ar-SA')}`}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ mb: 2 }}
        />
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {topKPIs.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ p: 2, cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => navigate(kpi.path)}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <IconButton size="small" sx={{ bgcolor: 'primary.main', color: '#fff', mr: 1 }}>
                  {kpi.icon}
                </IconButton>
                <Typography variant="overline" color="text.secondary">
                  {kpi.label}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {kpi.value}
                </Typography>
                {kpi.chartData && (
                  <Sparkline
                    data={kpi.chartData}
                    color={kpi.tone === 'error' ? '#dc2626' : kpi.tone === 'warning' ? '#ea580c' : '#0f766e'}
                    width={60}
                    height={24}
                  />
                )}
              </Stack>
              <Typography
                variant="body2"
                color={kpi.tone === 'error' ? 'error.main' : kpi.tone === 'warning' ? 'warning.main' : 'success.main'}
              >
                {kpi.trend}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {summaryCards.map((card, idx) => (
          <Grid item xs={12} md={6} lg={4} key={idx}>
            <Card
              sx={{ height: '100%', borderRadius: 2, cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
              onClick={() => navigate(card.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Chip label={card.title} color={card.color} variant="outlined" />
                  <IconButton size="small" color={card.color}>
                    {card.icon}
                  </IconButton>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  {card.stats.map((stat, statIdx) => (
                    <Box key={statIdx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Button
                  fullWidth
                  variant="text"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ mt: 2 }}
                  onClick={e => {
                    e.stopPropagation();
                    navigate(card.path);
                  }}
                >
                  عرض التفاصيل
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
