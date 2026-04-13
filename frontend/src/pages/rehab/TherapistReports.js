import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';
import {
  LineChart as MuiLineChart,
  Line,
  BarChart as MuiBarChart,
  Bar,
  PieChart as MuiPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { therapistService } from 'services/therapistService';
import exportService from 'services/exportService';
import logger from 'utils/logger';
import { gradients, brandColors, chartColors, statusColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from 'contexts/SnackbarContext';

const TherapistReports = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await therapistService.getTherapistReports(userId);
        setReportData(data);
        setLoading(false);
      } catch (error) {
        logger.error('Error loading reports:', error);
        setLoading(false);
      }
    };
    loadReports();
  }, [userId]);

  const progressData = reportData?.progressData?.map(d => ({
    name: d.month,
    value: d.improvement,
  })) || [
    { name: 'يناير', value: 45 },
    { name: 'فبراير', value: 52 },
    { name: 'مارس', value: 61 },
    { name: 'أبريل', value: 68 },
    { name: 'مايو', value: 75 },
  ];

  const patientStatusData = reportData?.patientStatusData || [
    { name: 'تحسن ملحوظ', value: 45 },
    { name: 'تحسن متوسط', value: 35 },
    { name: 'بحاجة متابعة', value: 15 },
    { name: 'حالات حرجة', value: 5 },
  ];

  const sessionDistributionData = reportData?.sessionDistributionData || [
    { name: 'جلسات فردية', value: 65 },
    { name: 'جلسات جماعية', value: 25 },
    { name: 'متابعات', value: 10 },
  ];

  const summaryTotal = reportData?.summary?.totalSessions || 127;
  const summaryCompleted = reportData?.summary?.completedSessions || 119;
  const summaryCancelled = reportData?.summary?.cancelledSessions || 8;
  const summaryRating = reportData?.summary?.averageRating || 4.6;
  const summaryAttendance = reportData?.summary?.attendanceRate || 89;

  const handleExportPDF = () => {
    try {
      exportService.toExcel(
        [
          { المؤشر: 'إجمالي الجلسات', القيمة: summaryTotal },
          { المؤشر: 'الجلسات المكتملة', القيمة: summaryCompleted },
          { المؤشر: 'الجلسات الملغاة', القيمة: summaryCancelled },
          { المؤشر: 'متوسط التقييم', القيمة: `${summaryRating}/5` },
          { المؤشر: 'معدل الحضور', القيمة: `${summaryAttendance}%` },
        ],
        `therapist_report_${new Date().toISOString().slice(0, 10)}`,
        { sheetName: 'Report' }
      );
      showSnackbar('تم تصدير التقرير بنجاح', 'success');
    } catch (err) {
      logger.error('Export failed:', err);
      showSnackbar('حدث خطأ في تصدير التقرير', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const COLORS = [
    brandColors.primaryStart,
    brandColors.primaryEnd,
    brandColors.accentPink,
    brandColors.accentCoral,
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل التقارير...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          📊 التقارير والإحصائيات
        </Typography>

        {/* التحكم والفلترة */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(e, newRange) => {
              if (newRange) setTimeRange(newRange);
            }}
            size="small"
          >
            <ToggleButton value="week">أسبوع</ToggleButton>
            <ToggleButton value="month">شهر</ToggleButton>
            <ToggleButton value="quarter">ربع سنة</ToggleButton>
            <ToggleButton value="year">سنة</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flex: 1 }} />

          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportPDF}>
            تحميل PDF
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            طباعة
          </Button>
        </Box>
      </Box>

      {/* الإحصائيات الرئيسية */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, background: gradients.primary, color: 'white' }}>
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>إجمالي الجلسات</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {reportData?.summary?.totalSessions || 127}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                +15% مقارنة بالشهر السابق
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, background: gradients.info, color: 'white' }}>
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>متوسط رضا المريض</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {reportData?.summary?.averageRating || 4.6}/5
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                من 96 تقييم
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, background: gradients.success, color: 'white' }}>
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>معدل التحسن</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {reportData?.summary?.patientImprovement || 72}%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المرضى في تحسن مستمر
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, background: gradients.accent, color: 'white' }}>
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>معدل الحضور</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {summaryAttendance}%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                التزام عالي من المرضى
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الرسوم البيانية */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* تطور الحالات */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📈 تطور نسبة التحسن الشهري
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <MuiLineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={brandColors.primaryStart}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </MuiLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع حالات المرضى */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                🔍 توزيع حالات المرضى
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <MuiBarChart data={patientStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={brandColors.primaryStart} />
                </MuiBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع أنواع الجلسات */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📊 توزيع أنواع الجلسات
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <MuiPieChart>
                  <Pie
                    data={sessionDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill={chartColors.purple}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </MuiPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* جدول الملخص */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📋 ملخص الأداء الشهري
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>المؤشر</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">
                        القيمة
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>إجمالي الجلسات</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {summaryTotal}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>الجلسات المكتملة</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 'bold', color: statusColors.success }}
                        >
                          {summaryCompleted}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>الجلسات الملغاة</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 'bold', color: statusColors.error }}
                        >
                          {summaryCancelled}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>متوسط التقييم</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 'bold', color: statusColors.warning }}
                        >
                          {summaryRating}/5 ⭐
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TherapistReports;
