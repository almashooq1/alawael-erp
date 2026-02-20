/**
 * Reports Viewer Component
 * Displays various branch reports with filtering
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Tabs,
  Tab,
  Typography,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  FileDownload,
  Print,
  Share,
  Refresh,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const ReportsViewer = ({ branchId, reports, loading = false, error = null, onRefresh }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            فشل في تحميل التقارير: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!reports || Object.keys(reports).length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">لا توجد تقارير متاحة</Typography>
        </CardContent>
      </Card>
    );
  }

  const reportTabs = [
    { label: 'تشغيلي', key: 'operational', color: '#2196f3' },
    { label: 'مالي', key: 'financial', color: '#4caf50' },
    { label: 'جودة', key: 'quality', color: '#ff9800' },
  ];

  const currentReport = reports[reportTabs[activeTab]?.key] || {};

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && children}
    </div>
  );

  const OperationalReportView = () => (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderLeft: '4px solid #2196f3' }}>
            <Typography variant="caption" color="textSecondary">
              ساعات التشغيل
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {currentReport.operatingHours || 0}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(currentReport.operatingHours || 0) / 8.64}
              sx={{ mt: 1 }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
            <Typography variant="caption" color="textSecondary">
              معدل الاستخدام
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {currentReport.utilizationRate || 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={currentReport.utilizationRate || 0}
              sx={{ mt: 1 }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
            <Typography variant="caption" color="textSecondary">
              الكفاءة التشغيلية
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {currentReport.operationalEfficiency || 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={currentReport.operationalEfficiency || 0}
              sx={{ mt: 1 }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
            <Typography variant="caption" color="textSecondary">
              المشاكل المسجلة
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {currentReport.issuesLogged || 0}
            </Typography>
            <Chip
              label={currentReport.issueSeverity || 'منخفضة'}
              size="small"
              sx={{ mt: 1 }}
              color={currentReport.issueSeverity === 'عالية' ? 'error' : 'default'}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Operational Chart */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          الأداء التشغيلي - آخر 7 أيام
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={generateOperationalChartData()}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="كفاءة" stroke="#2196f3" />
            <Line type="monotone" dataKey="استخدام" stroke="#ff9800" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );

  const FinancialReportView = () => (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
            <Typography variant="caption" color="textSecondary">
              الإيرادات
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {(currentReport.revenue || 0).toLocaleString()} ريال
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#ffebee', borderLeft: '4px solid #f44336' }}>
            <Typography variant="caption" color="textSecondary">
              المصروفات
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {(currentReport.expenses || 0).toLocaleString()} ريال
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderLeft: '4px solid #2196f3' }}>
            <Typography variant="caption" color="textSecondary">
              الربح الإجمالي
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {((currentReport.revenue || 0) - (currentReport.expenses || 0)).toLocaleString()} ريال
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
            <Typography variant="caption" color="textSecondary">
              هامش الربح
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {(currentReport.profitMargin || 0).toFixed(1)}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Financial Chart */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          التوزيع المالي
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'الإيرادات', value: currentReport.revenue || 0 },
                { name: 'المصروفات', value: currentReport.expenses || 0 },
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#4caf50" />
              <Cell fill="#f44336" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );

  const QualityReportView = () => (
    <Box sx={{ p: 2 }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>معيار الجودة</TableCell>
              <TableCell align="right">القيمة</TableCell>
              <TableCell align="center">الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>معدل الخطأ</TableCell>
              <TableCell align="right">{currentReport.defectRate || 0}%</TableCell>
              <TableCell align="center">
                <Chip
                  label={(currentReport.defectRate || 0) < 5 ? 'جيد' : 'حذر'}
                  size="small"
                  color={(currentReport.defectRate || 0) < 5 ? 'success' : 'warning'}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>معدل الامتثال</TableCell>
              <TableCell align="right">{currentReport.complianceRate || 0}%</TableCell>
              <TableCell align="center">
                <Chip
                  label={(currentReport.complianceRate || 0) > 95 ? 'ممتاز' : 'جيد'}
                  size="small"
                  color={(currentReport.complianceRate || 0) > 95 ? 'success' : 'info'}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>رضا العملاء</TableCell>
              <TableCell align="right">{currentReport.customerSatisfaction || 0}%</TableCell>
              <TableCell align="center">
                <Chip
                  label={(currentReport.customerSatisfaction || 0) > 80 ? 'مرتفع' : 'متوسط'}
                  size="small"
                  color={(currentReport.customerSatisfaction || 0) > 80 ? 'success' : 'warning'}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Card>
      <CardHeader
        title="التقارير"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<FileDownload />} size="small">
              تحميل
            </Button>
            <Button startIcon={<Print />} size="small">
              طباعة
            </Button>
          </Box>
        }
      />
      <CardContent>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {reportTabs.map((tab, i) => (
            <Tab key={i} label={tab.label} />
          ))}
        </Tabs>

        {reportTabs.map((tab, i) => (
          <TabPanel key={i} value={activeTab} index={i}>
            {i === 0 && <OperationalReportView />}
            {i === 1 && <FinancialReportView />}
            {i === 2 && <QualityReportView />}
          </TabPanel>
        ))}
      </CardContent>
    </Card>
  );
};

// Helper functions
const generateOperationalChartData = () => [
  { name: 'الأحد', كفاءة: 85, استخدام: 75 },
  { name: 'الاثنين', كفاءة: 88, استخدام: 78 },
  { name: 'الثلاثاء', كفاءة: 92, استخدام: 82 },
  { name: 'الأربعاء', كفاءة: 89, استخدام: 79 },
  { name: 'الخميس', كفاءة: 91, استخدام: 81 },
  { name: 'الجمعة', كفاءة: 86, استخدام: 76 },
  { name: 'السبت', كفاءة: 94, استخدام: 84 },
];

export default ReportsViewer;
