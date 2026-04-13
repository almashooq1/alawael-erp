import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import { TrendingUp, People, Dns, Warning, CheckCircle, Speed } from '@mui/icons-material';
import analyticsService from 'services/analyticsService';
import logger from 'utils/logger';
import { gradients, surfaceColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const MetricCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography color="textSecondary" variant="subtitle1">
          {title}
        </Typography>
        <Box sx={{ p: 1, borderRadius: 1, bgcolor: `${color}.light`, color: `${color}.main` }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" component="div" sx={{ mb: 1 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const InsightRow = ({ insight }) => {
  const getSeverityColor = sev => {
    switch (sev) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        borderBottom: `1px solid ${surfaceColors.borderSubtle}`,
      }}
    >
      <Warning color={getSeverityColor(insight.severity)} />
      <Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
          <Chip
            label={insight.category}
            size="small"
            color={getSeverityColor(insight.severity)}
            variant="outlined"
          />
          <Typography variant="subtitle2" component="span" color="textSecondary">
            • الأهمية: {insight.severity}
          </Typography>
        </Box>
        <Typography variant="body2">{insight.message}</Typography>
      </Box>
    </Box>
  );
};

const ExecutiveDashboard = () => {
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [hrData, setHrData] = useState(null);
  const [systemData, setSystemData] = useState(null);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hr, sys, ins] = await Promise.all([
          analyticsService.getHRMetrics(),
          analyticsService.getSystemHealth(),
          analyticsService.getAIInsights(),
        ]);

        setHrData(hr.data);
        setSystemData(sys.data);
        setInsights(ins.data);
      } catch (error) {
        logger.error('Failed to fetch analytics:', error);
        showSnackbar('حدث خطأ أثناء تحميل بيانات لوحة القيادة التنفيذية', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Speed sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة القيادة التنفيذية
            </Typography>
            <Typography variant="body2">نظرة شاملة على أداء المؤسسة</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
          Executive AI Dashboard
        </Typography>
        <Typography color="textSecondary">
          نظرة عامة لحالة المؤسسة ومؤشرات الموارد البشرية وتوصيات الذكاء الاصطناعي.
        </Typography>
      </Box>

      {/* Top Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="إجمالي القوى العاملة"
            value={hrData?.activeEmployees || 0}
            subtitle={`${hrData?.retentionRate || '0%'} معدل الاحتفاظ`}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="وقت التشغيل"
            value={systemData?.uptime || '0%'}
            subtitle={`آخر فحص: ${new Date().toLocaleTimeString('ar')}`}
            icon={<Speed />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="التكاملات"
            value={`${systemData?.integrationHealth?.active || 0} / ${systemData?.integrationHealth?.total || 0}`}
            subtitle={`${systemData?.integrationHealth?.issues || 0} مشاكل مكتشفة`}
            icon={<Dns />}
            color={systemData?.integrationHealth?.issues > 0 ? 'error' : 'info'}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="توصيات الذكاء الاصطناعي"
            value={insights.length}
            subtitle="توصيات مولّدة"
            icon={<TrendingUp />}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Col: AI Insights */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                bgcolor: surfaceColors.paperSoft,
                borderBottom: `1px solid ${surfaceColors.borderSubtle}`,
              }}
            >
              <Typography variant="h6">🧠 رؤى استراتيجية من الذكاء الاصطناعي</Typography>
            </Box>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {insights.length > 0 ? (
                insights.map((insight, idx) => <InsightRow key={idx} insight={insight} />)
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CheckCircle color="success" sx={{ fontSize: 40, mb: 2 }} />
                  <Typography>لا توجد رؤى حرجة تتطلب اهتماماً.</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Col: Department Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              توزيع الأقسام
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {hrData && hrData.departmentDistribution ? (
              Object.entries(hrData.departmentDistribution).map(([dept, count]) => (
                <Box key={dept} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{dept}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {count}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(count / hrData.activeEmployees) * 100}
                    sx={{ height: 8, borderRadius: 5 }}
                  />
                </Box>
              ))
            ) : (
              <Typography color="textSecondary">لا توجد بيانات</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ExecutiveDashboard;
