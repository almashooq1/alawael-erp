import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tab,
  Tabs,
  Button,
  Chip,
  Paper,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Refresh,
  Settings,
  FileDownload,
  Share,
  MoreVert,
  Edit,
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../utils/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

/**
 * KPI Card Component
 */
const KPICard = ({ kpi, onUpdate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track':
        return '#4caf50';
      case 'at_risk':
        return '#ff9800';
      case 'critical':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp sx={{ color: '#4caf50' }} />;
    if (trend === 'down') return <TrendingDown sx={{ color: '#f44336' }} />;
    return null;
  };

  return (
    <Card
      sx={{
        height: '100%',
        borderLeft: `5px solid ${getStatusColor(kpi.status)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {kpi.name}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {kpi.current}
              <span style={{ fontSize: '0.6em', marginLeft: '8px' }}>{kpi.unit}</span>
            </Typography>
          </Box>
          {getTrendIcon(kpi.trend)}
        </Box>

        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              اهدف: {kpi.target}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {kpi.variancePercent > 0 ? '+' : ''}{kpi.variancePercent}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min((kpi.current / kpi.target) * 100, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getStatusColor(kpi.status),
              },
            }}
          />
        </Box>

        {/* Status badge */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={kpi.status.replace('_', ' ').toUpperCase()}
            size="small"
            sx={{
              backgroundColor: getStatusColor(kpi.status),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
          {kpi.alertsCount > 0 && (
            <Chip
              icon={<Warning />}
              label={`${kpi.alertsCount} تنبيهات`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Main Executive Dashboard Component
 */
const ExecutiveDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [executiveRes, aiRes, realtimeRes] = await Promise.all([
        api.get('/api/executive-dashboard'),
        api.get('/api/executive-dashboard/ai-briefing'),
        api.get('/api/executive-dashboard/realtime'),
      ]);

      setDashboardData(executiveRes.data.data);
      setAiSummary(aiRes.data.data);
      setRealtimeData(realtimeRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, refreshInterval, autoRefresh]);

  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="500px">
        <CircularProgress />
      </Box>
    );
  }

  const kpis = dashboardData?.executive?.kpis || [];
  const topPerformers = dashboardData?.executive?.topPerformers || [];
  const needsAttention = dashboardData?.executive?.needsAttention || [];

  // Chart data
  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'الإيرادات (SAR)',
        data: [850000, 900000, 880000, 920000, 950000, 980000],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'المصروفات (SAR)',
        data: [600000, 620000, 610000, 630000, 620000, 650000],
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const departmentChartData = {
    labels: ['المبيعات', 'الهندسة', 'الدعم', 'الإدارة', 'الموارد البشرية'],
    datasets: [
      {
        label: 'الأداء (%)',
        data: [92, 88, 85, 90, 86],
        backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'],
      },
    ],
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            لوحة التحكم التنفيذية
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="تحديث البيانات">
              <IconButton
                onClick={fetchDashboardData}
                disabled={loading}
                sx={{ color: 'primary.main' }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="تصدير التقرير">
              <IconButton sx={{ color: 'primary.main' }}>
                <FileDownload />
              </IconButton>
            </Tooltip>
            <Tooltip title="مشاركة">
              <IconButton sx={{ color: 'primary.main' }}>
                <Share />
              </IconButton>
            </Tooltip>
            <Tooltip title="الإعدادات">
              <IconButton sx={{ color: 'primary.main' }}>
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Status summary */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                مؤشرات KPI
              </Typography>
              <Typography variant="h6">
                {dashboardData?.executive?.totalKPIs || 0}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                على المسار
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: '#4caf50' }} />
                <Typography variant="h6" sx={{ color: '#4caf50' }}>
                  {dashboardData?.executive?.kpisOnTrack || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                محفوف بالمخاطر
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ color: '#ff9800' }} />
                <Typography variant="h6" sx={{ color: '#ff9800' }}>
                  {dashboardData?.executive?.kpisAtRisk || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                حالات حرجة
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingDown sx={{ color: '#f44336' }} />
                <Typography variant="h6" sx={{ color: '#f44336' }}>
                  {dashboardData?.executive?.kpisCritical || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* AI Insights Alert */}
      {aiSummary && aiSummary.keyInsights && aiSummary.keyInsights.length > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          onClose={() => {}}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            رؤى ذكية مدعومة بالذكاء الاصطناعي:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {aiSummary.keyInsights.slice(0, 3).map((insight, idx) => (
              <li key={idx}>{insight.finding}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="نظرة عامة" />
        <Tab label="المؤشرات الرئيسية" />
        <Tab label="رؤى الذكاء الاصطناعي" />
        <Tab label="البيانات الحية" />
        <Tab label="التقصير" />
      </Tabs>

      {/* Tab 0: Overview */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Revenue Trend */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  الإيرادات والمصروفات
                </Typography>
                <Line
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Top KPIs */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  أفضل المؤشرات
                </Typography>
                {topPerformers.slice(0, 3).map((kpi) => (
                  <Box key={kpi.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption">{kpi.name}</Typography>
                      <Chip
                        label={`+${kpi.changePercent.toFixed(1)}%`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {kpi.current} من {kpi.target}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Department Performance */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  أداء الأقسام
                </Typography>
                <Bar
                  data={departmentChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: true, max: 100 } },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* KPI Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  توزيع حالة المؤشرات
                </Typography>
                <Doughnut
                  data={{
                    labels: ['على المسار', 'محفوف بالمخاطر', 'حالات حرجة'],
                    datasets: [
                      {
                        data: [
                          dashboardData?.executive?.kpisOnTrack || 0,
                          dashboardData?.executive?.kpisAtRisk || 0,
                          dashboardData?.executive?.kpisCritical || 0,
                        ],
                        backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: KPIs */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {kpis.map((kpi) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={kpi.id}>
              <KPICard
                kpi={kpi}
                onUpdate={(newValue) => {
                  // Handle KPI update
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: AI Insights */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {aiSummary && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    الملخص التنفيذي المحتل الذكاء الاصطناعي
                  </Typography>

                  {/* Recommendations */}
                  {aiSummary.topRecommendations && aiSummary.topRecommendations.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        التوصيات الرئيسية:
                      </Typography>
                      {aiSummary.topRecommendations.map((rec, idx) => (
                        <Alert key={idx} severity="info" sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <strong>{rec.priority.toUpperCase()}:</strong> {rec.message}
                          </Typography>
                          {rec.details && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              {Array.isArray(rec.details) ? rec.details.join(', ') : rec.details}
                            </Typography>
                          )}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* Risk Assessment */}
                  {aiSummary.riskAssessment && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        تقييم المخاطر:
                      </Typography>
                      <Typography variant="body2">
                        إجمالي المخاطر: {aiSummary.riskAssessment.totalRisks}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#f44336' }}>
                        مخاطر عالية: {aiSummary.riskAssessment.highRisks}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ff9800' }}>
                        مخاطر متوسطة: {aiSummary.riskAssessment.mediumRisks}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Real-time Data */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {realtimeData &&
            Object.entries(realtimeData.sources || {}).map(([sourceId, source]) => (
              <Grid item xs={12} sm={6} md={4} key={sourceId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {source.name}
                      </Typography>
                      <Chip
                        label={source.status}
                        size="small"
                        color={source.status === 'active' ? 'success' : 'error'}
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      آخر تحديث: {source.lastUpdate ? new Date(source.lastUpdate).toLocaleString('ar-SA') : 'لم يتم التحديث'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {/* Tab 4: Needs Attention */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          {needsAttention.map((kpi) => (
            <Grid item xs={12} key={kpi.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {kpi.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                        الحالية: {kpi.current} {kpi.unit} | الهدف: {kpi.target}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
                        الفجوة: {kpi.variancePercent}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={kpi.status}
                        color="error"
                        size="small"
                      />
                      <Button variant="text" size="small">
                        <Edit />
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ExecutiveDashboard;
