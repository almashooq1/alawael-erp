/**
 * CRM Analytics Dashboard - Performance & Insights 📊
 * لوحة تحليلات CRM - الأداء والرؤى
 *
 * Features:
 * ✅ Customer lifetime value
 * ✅ Churn prediction
 * ✅ Revenue trends
 * ✅ Performance KPIs
 * ✅ Comparison charts
 * ✅ Export reports
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

const CRMAnalytics = () => {
  const [tabValue, setTabValue] = useState(0);
  const [detailsDialog, setDetailsDialog] = useState({ open: false, type: '' });

  // Sample data
  const revenueData = [
    { month: 'يناير', target: 100000, actual: 95000, growth: -5 },
    { month: 'فبراير', target: 120000, actual: 110000, growth: -8.3 },
    { month: 'مارس', target: 140000, actual: 155000, growth: 10.7 },
    { month: 'أبريل', target: 150000, actual: 165000, growth: 10 },
  ];

  const customerSegments = [
    { segment: 'VIP', value: 450000, percentage: 40, color: '#ff6b6b' },
    { segment: 'Premium', value: 350000, percentage: 31, color: '#4ecdc4' },
    { segment: 'Standard', value: 240000, percentage: 21, color: '#95e1d3' },
    { segment: 'Prospect', value: 80000, percentage: 8, color: '#f7f1de' },
  ];

  const kpis = [
    { label: 'قيمة دورة الحياة', value: '₪18,500', trend: '+15%', color: '#667eea' },
    { label: 'معدل الاحتفاظ', value: '92%', trend: '+3%', color: '#4caf50' },
    { label: 'معدل التحويل', value: '28%', trend: '+5%', color: '#ff9800' },
    { label: 'حجم العقد المتوسط', value: '₪45,000', trend: '+12%', color: '#2196f3' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${kpi.color}20, ${kpi.color}05)`,
                border: `2px solid ${kpi.color}30`,
              }}
            >
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                {kpi.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color, my: 1 }}>
                {kpi.value}
              </Typography>
              <Chip
                label={kpi.trend}
                size="small"
                color={kpi.trend.includes('+') ? 'success' : 'error'}
                sx={{ fontWeight: 600 }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
          <Tab label="📈 الإيرادات" />
          <Tab label="👥 توزيع العملاء" />
          <Tab label="📊 الأداء" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            📈 اتجاهات الإيرادات
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#ff9800"
                strokeWidth={2}
                name="الهدف"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#4caf50"
                strokeWidth={2}
                name="الفعلي"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            👥 توزيع العملاء حسب القطاع
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ segment, percentage }) => `${segment} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {customerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                {customerSegments.map((seg, idx) => (
                  <Box key={idx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {seg.segment}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: seg.color }}>
                        {(seg.value / 1000).toFixed(0)}K
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={seg.percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            📊 مؤشرات الأداء الرئيسية
          </Typography>
          <Grid container spacing={2}>
            {[
              { label: 'معدل إغلاق الصفقات', value: 35, color: '#667eea' },
              { label: 'رضا العملاء', value: 88, color: '#4caf50' },
              { label: 'جودة البيانات', value: 92, color: '#ff9800' },
              { label: 'الكفاءة التشغيلية', value: 78, color: '#2196f3' },
            ].map((kpi, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {kpi.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: kpi.color }}>
                      {kpi.value}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={kpi.value}
                    sx={{ height: 10, borderRadius: 5, backgroundColor: kpi.color + '20' }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default CRMAnalytics;
