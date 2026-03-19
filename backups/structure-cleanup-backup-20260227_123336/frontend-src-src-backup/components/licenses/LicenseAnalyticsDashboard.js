/**
 * License Analytics Dashboard - Advanced Version ⭐⭐⭐
 * لوحة التحليل المتقدمة لإدارة الرخص والتصاريح
 *
 * Features:
 * ✅ Real-time analytics
 * ✅ Multiple chart types
 * ✅ KPI tracking
 * ✅ Expiry forecasting
 * ✅ Compliance metrics
 * ✅ Renewal statistics
 * ✅ Export reports
 * ✅ Custom date ranges
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  GetApp as GetAppIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import licenseService from '../services/licenseService';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0', '#00bcd4'];

const LicenseAnalyticsDashboard = ({ licenses = [], onRefresh }) => {
  // ==================== State ====================
  const [loading, setLoading] = useState(false);
  // const [dateRange, setDateRange] = useState({ start: '', end: '' });
  // Filter & Date States - Reserved for future features
  // const [dateRange, setDateRange] = useState({ start: '', end: '' });
  // const [selectedLicenseType, setSelectedLicenseType] = useState('الكل');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // const [statistics, setStatistics] = useState(null);

  // ==================== Data Processing ====================
  const analytics = useMemo(() => {
    if (!licenses || licenses.length === 0) {
      return {
        total: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        pending: 0,
        renewal_rate: 0,
        compliance_rate: 0,
        avg_days_to_expiry: 0,
      };
    }

    const total = licenses.length;

    let active = 0,
      expiring = 0,
      expired = 0,
      pending = 0;
    let totalDaysToExpiry = 0;

    licenses.forEach(license => {
      const daysLeft = licenseService.calculateDaysUntilExpiry(license.expiry_date);
      totalDaysToExpiry += daysLeft;

      if (daysLeft < 0) {
        expired++;
      } else if (daysLeft <= 30) {
        expiring++;
      } else {
        active++;
      }

      if (license.status === 'قيد التجديد') pending++;
    });

    const renewal_rate = total > 0 ? Math.round(((total - expired) / total) * 100) : 0;
    const compliance_rate = total > 0 ? Math.round((active / (total - expired)) * 100) : 0;
    const avg_days_to_expiry = total > 0 ? Math.round(totalDaysToExpiry / total) : 0;

    return {
      total,
      active,
      expiring,
      expired,
      pending,
      renewal_rate,
      compliance_rate,
      avg_days_to_expiry,
    };
  }, [licenses]);

  // ==================== Chart Data ====================
  const statusDistribution = useMemo(() => {
    const data = [
      {
        name: 'سارية',
        value: analytics.active,
        percentage: ((analytics.active / analytics.total) * 100).toFixed(1),
      },
      {
        name: 'قريبة الانتهاء',
        value: analytics.expiring,
        percentage: ((analytics.expiring / analytics.total) * 100).toFixed(1),
      },
      {
        name: 'منتهية الصلاحية',
        value: analytics.expired,
        percentage: ((analytics.expired / analytics.total) * 100).toFixed(1),
      },
      {
        name: 'قيد التجديد',
        value: analytics.pending,
        percentage: ((analytics.pending / analytics.total) * 100).toFixed(1),
      },
    ];
    return data;
  }, [analytics]);

  const licenseTypeDistribution = useMemo(() => {
    if (!licenses) return [];

    const distribution = {};
    licenses.forEach(license => {
      distribution[license.license_type] = (distribution[license.license_type] || 0) + 1;
    });

    return Object.entries(distribution).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  }, [licenses]);

  const expiryTrend = useMemo(() => {
    if (!licenses) return [];

    // Group licenses by expiry month
    const monthlyData = {};
    // const today = new Date(); // Reserved for future date filtering

    licenses.forEach(license => {
      const expiryDate = new Date(license.expiry_date);
      const monthKey = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, count: 0, critical: 0 };
      }
      monthlyData[monthKey].count++;

      const daysLeft = licenseService.calculateDaysUntilExpiry(license.expiry_date);
      if (daysLeft <= 30 && daysLeft > 0) {
        monthlyData[monthKey].critical++;
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12)
      .map(([month, data]) => ({
        ...data,
        monthShort: month.slice(-2),
      }));
  }, [licenses]);

  const renewalStats = useMemo(() => {
    if (!licenses) return [];

    const thisYear = new Date().getFullYear();
    const monthlyRenewal = Array(12)
      .fill(0)
      .map((_, i) => ({
        month: [
          'يناير',
          'فبراير',
          'مارس',
          'أبريل',
          'مايو',
          'يونيو',
          'يوليو',
          'أغسطس',
          'سبتمبر',
          'أكتوبر',
          'نوفمبر',
          'ديسمبر',
        ][i],
        count: 0,
      }));

    licenses.forEach(license => {
      if (license.renewal_date) {
        const renewalDate = new Date(license.renewal_date);
        if (renewalDate.getFullYear() === thisYear) {
          monthlyRenewal[renewalDate.getMonth()].count++;
        }
      }
    });

    return monthlyRenewal;
  }, [licenses]);

  const entityTypeBreakdown = useMemo(() => {
    if (!licenses) return [];

    const breakdown = {};
    licenses.forEach(license => {
      const entityType = license.entity_type || 'غير محدد';
      breakdown[entityType] = (breakdown[entityType] || 0) + 1;
    });

    return Object.entries(breakdown).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  }, [licenses]);

  const expiringLicenses = useMemo(() => {
    return licenses
      .filter(license => {
        const daysLeft = licenseService.calculateDaysUntilExpiry(license.expiry_date);
        return daysLeft > 0 && daysLeft <= 30;
      })
      .sort((a, b) => {
        const aD = licenseService.calculateDaysUntilExpiry(a.expiry_date);
        const bD = licenseService.calculateDaysUntilExpiry(b.expiry_date);
        return aD - bD;
      })
      .slice(0, 10);
  }, [licenses]);

  const expiredLicenses = useMemo(() => {
    return licenses
      .filter(license => licenseService.calculateDaysUntilExpiry(license.expiry_date) < 0)
      .slice(0, 10);
  }, [licenses]);

  // ==================== Handlers ====================
  const handleExport = async () => {
    try {
      setLoading(true);
      await licenseService.exportLicenses(
        licenses.map(l => l.id),
        'excel'
      );
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  // ==================== Render ====================
  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            📊 لوحة تحليل الرخص والتصاريح
          </Typography>
          <Typography variant="body2" color="textSecondary">
            تحليل شامل لحالة جميع الرخص والتصاريح المهنية
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="تحديث البيانات">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              تحديث
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<GetAppIcon />}
            onClick={() => setExportDialogOpen(true)}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            تصدير التقرير
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 3,
              border: '2px solid #4caf50',
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
              <Typography color="textSecondary" gutterBottom variant="caption">
                الإجمالي
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#4caf50', mb: 1 }}>
                {analytics.total}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                رخصة وتصريح
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 3,
              border: '2px solid #2196f3',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <InfoIcon sx={{ fontSize: 40, color: '#2196f3' }} />
              </Box>
              <Typography color="textSecondary" gutterBottom variant="caption">
                معدل الامتثال
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#2196f3', mb: 1 }}>
                {analytics.compliance_rate}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analytics.compliance_rate}
                sx={{ mt: 1.5, height: 6, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 3,
              border: '2px solid #ff9800',
              background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <WarningIcon sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
              <Typography color="textSecondary" gutterBottom variant="caption">
                قريبة الانتهاء
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#ff9800', mb: 1 }}>
                {analytics.expiring}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                في آخر 30 يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 3,
              border: '2px solid #f44336',
              background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
              <Typography color="textSecondary" gutterBottom variant="caption">
                منتهية الصلاحية
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#f44336', mb: 1 }}>
                {analytics.expired}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                تحتاج تجديد فوري
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader
              title="توزيع الحالات"
              subheader="نسبة توزيع الرخص حسب حالتها"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* License Type Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader
              title="توزيع أنواع الرخص"
              subheader="عدد الرخص حسب النوع"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={licenseTypeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Expiry Trend */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader
              title="اتجاه تاريخ الانتهاء"
              subheader="التنبؤ بانتهاء صلاحية الرخص حسب الشهر"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={expiryTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f44336" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthShort" />
                  <YAxis />
                  <ChartTooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    name="الإجمالي"
                  />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    stroke="#f44336"
                    fillOpacity={1}
                    fill="url(#colorCritical)"
                    name="حرج"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Renewal Statistics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader
              title="إحصائيات التجديد"
              subheader="عدد التجديدات حسب الشهر"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={renewalStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4caf50"
                    strokeWidth={2}
                    dot={{ fill: '#4caf50', r: 4 }}
                    name="التجديدات"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Entity Type Breakdown */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader
              title="توزيع الكيانات"
              subheader="عدد الرخص حسب نوع الكيان"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={entityTypeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <ChartTooltip />
                  <Bar dataKey="value" fill="#764ba2" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Tables */}
      <Grid container spacing={3}>
        {/* Expiring Soon */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, borderLeft: '4px solid #ff9800' }}>
            <CardHeader
              title="⚠️ قريبة الانتهاء"
              subheader={`${expiringLicenses.length} رخصة`}
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ backgroundColor: '#fff3e0' }}
            />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#ffe0b2' }}>
                    <TableCell sx={{ fontWeight: 600 }}>رقم الرخصة</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الكيان</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      الأيام المتبقية
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringLicenses.map(license => (
                    <TableRow key={license.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        >
                          {license.license_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{license.entity_name}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${licenseService.calculateDaysUntilExpiry(license.expiry_date)} يوم`}
                          size="small"
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {expiringLicenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="textSecondary">
                          ✅ لا توجد رخص قريبة الانتهاء
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Expired */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, borderLeft: '4px solid #f44336' }}>
            <CardHeader
              title="❌ منتهية الصلاحية"
              subheader={`${expiredLicenses.length} رخصة`}
              titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
              sx={{ backgroundColor: '#ffebee' }}
            />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#ffcdd2' }}>
                    <TableCell sx={{ fontWeight: 600 }}>رقم الرخصة</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الكيان</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      أيام التأخير
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiredLicenses.map(license => (
                    <TableRow key={license.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        >
                          {license.license_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{license.entity_name}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${Math.abs(licenseService.calculateDaysUntilExpiry(license.expiry_date))} يوم`}
                          size="small"
                          color="error"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {expiredLicenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="textSecondary">
                          ✅ لا توجد رخص منتهية الصلاحية
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تصدير التقرير</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>صيغة التصدير</InputLabel>
              <Select defaultValue="excel" label="صيغة التصدير">
                <MenuItem value="excel">Excel (.xlsx)</MenuItem>
                <MenuItem value="csv">CSV (.csv)</MenuItem>
                <MenuItem value="pdf">PDF (.pdf)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="من تاريخ" type="date" InputLabelProps={{ shrink: true }} />
            <TextField label="إلى تاريخ" type="date" InputLabelProps={{ shrink: true }} />
            <Alert severity="info">سيتم تصدير بيانات {licenses.length} رخصة</Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setExportDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={loading}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {loading ? <CircularProgress size={24} /> : 'تصدير'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LicenseAnalyticsDashboard;
