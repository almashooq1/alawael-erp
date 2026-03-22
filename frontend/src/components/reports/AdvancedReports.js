import { useState, useEffect } from 'react';
import { triggerBlobDownload } from 'utils/downloadHelper';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Compare, Timeline, Download, Insights } from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getToken } from 'utils/tokenStorage';
import logger from 'utils/logger';
import { statusColors, neutralColors, chartColors } from '../../theme/palette';

const AdvancedReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('performance');
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [disabilityType, setDisabilityType] = useState('');
  const [reportData, setReportData] = useState(null);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/rehabilitation-programs', {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      setPrograms(data);
    } catch (error) {
      logger.error('Error fetching programs:', error);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let data = null;

      switch (reportType) {
        case 'performance':
          if (selectedPrograms.length > 0) {
            data = await fetchPerformanceMetrics(selectedPrograms[0]);
          }
          break;

        case 'comparative':
          if (selectedPrograms.length >= 2) {
            data = await fetchComparativeAnalysis(selectedPrograms);
          }
          break;

        case 'predictive':
          if (disabilityType) {
            data = await fetchPredictiveInsights(disabilityType);
          }
          break;

        default:
          break;
      }

      setReportData(data);
    } catch (error) {
      logger.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceMetrics = async programId => {
    const response = await fetch(`/api/analytics/program/${programId}/performance`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return await response.json();
  };

  const fetchComparativeAnalysis = async programIds => {
    const response = await fetch('/api/analytics/compare', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ programIds }),
    });
    return await response.json();
  };

  const fetchPredictiveInsights = async disabilityType => {
    const response = await fetch(`/api/analytics/predictive/${disabilityType}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return await response.json();
  };

  const handleExportReport = () => {
    if (!reportData) return;

    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    triggerBlobDownload(blob, `report-${reportType}-${new Date().toISOString()}.json`);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        📊 التقارير المتقدمة
      </Typography>

      {/* Report Configuration */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>نوع التقرير</InputLabel>
                <Select
                  value={reportType}
                  label="نوع التقرير"
                  onChange={e => setReportType(e.target.value)}
                >
                  <MenuItem value="performance">
                    <Box display="flex" alignItems="center">
                      <Timeline sx={{ mr: 1 }} />
                      أداء البرنامج
                    </Box>
                  </MenuItem>
                  <MenuItem value="comparative">
                    <Box display="flex" alignItems="center">
                      <Compare sx={{ mr: 1 }} />
                      تحليل مقارن
                    </Box>
                  </MenuItem>
                  <MenuItem value="predictive">
                    <Box display="flex" alignItems="center">
                      <Insights sx={{ mr: 1 }} />
                      رؤى تنبؤية
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {reportType === 'performance' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>اختر البرنامج</InputLabel>
                  <Select
                    value={selectedPrograms[0] || ''}
                    label="اختر البرنامج"
                    onChange={e => setSelectedPrograms([e.target.value])}
                  >
                    {programs.map(program => (
                      <MenuItem key={program._id} value={program._id}>
                        {program.program_info.name_ar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {reportType === 'comparative' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>اختر البرامج (2 على الأقل)</InputLabel>
                  <Select
                    multiple
                    value={selectedPrograms}
                    label="اختر البرامج"
                    onChange={e => setSelectedPrograms(e.target.value)}
                    renderValue={selected => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map(value => {
                          const program = programs.find(p => p._id === value);
                          return (
                            <Chip
                              key={value}
                              label={program?.program_info.name_ar || value}
                              size="small"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {programs.map(program => (
                      <MenuItem key={program._id} value={program._id}>
                        {program.program_info.name_ar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {reportType === 'predictive' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>نوع الإعاقة</InputLabel>
                  <Select
                    value={disabilityType}
                    label="نوع الإعاقة"
                    onChange={e => setDisabilityType(e.target.value)}
                  >
                    <MenuItem value="mobility">حركية</MenuItem>
                    <MenuItem value="visual">بصرية</MenuItem>
                    <MenuItem value="hearing">سمعية</MenuItem>
                    <MenuItem value="cognitive">ذهنية</MenuItem>
                    <MenuItem value="speech">نطقية</MenuItem>
                    <MenuItem value="multiple">متعددة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleGenerateReport}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'إنشاء التقرير'}
              </Button>
            </Grid>

            {reportData && (
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleExportReport}
                  sx={{ height: '56px' }}
                >
                  تصدير
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && reportType === 'performance' && (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  معدل الإنجاز
                </Typography>
                <Typography variant="h4" color="primary">
                  {reportData.overview.completionRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  معدل الحضور
                </Typography>
                <Typography variant="h4" color="success.main">
                  {reportData.overview.attendanceRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  عدد الجلسات
                </Typography>
                <Typography variant="h4">{reportData.overview.totalSessions}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={3}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  المدة (أيام)
                </Typography>
                <Typography variant="h4">{reportData.overview.durationDays}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Goal Achievement Chart */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  تحقيق الأهداف حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.goals.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="achieved" fill={statusColors.success} name="محققة" />
                    <Bar dataKey="inProgress" fill={statusColors.warning} name="قيد التنفيذ" />
                    <Bar dataKey="notStarted" fill={neutralColors.inactive} name="لم تبدأ" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Session Progress Chart */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  تقدم الجلسات عبر الزمن
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.sessions.progressOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke={chartColors.purple}
                      name="الجلسات"
                    />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke={chartColors.green}
                      name="الحضور"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {reportData && reportType === 'comparative' && (
        <Grid container spacing={3}>
          {/* Comparison Table */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  جدول المقارنة
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>البرنامج</TableCell>
                        <TableCell align="right">معدل الإنجاز</TableCell>
                        <TableCell align="right">معدل الحضور</TableCell>
                        <TableCell align="right">عدد الجلسات</TableCell>
                        <TableCell align="right">استخدام الميزانية</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.programs.map(program => (
                        <TableRow key={program.programId}>
                          <TableCell>{program.name}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${program.completionRate.toFixed(1)}%`}
                              color={program.completionRate > 80 ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{program.attendanceRate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{program.totalSessions}</TableCell>
                          <TableCell align="right">
                            {program.budgetUtilization.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Radar Comparison Chart */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  مقارنة رادارية
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={reportData.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis />
                    <Radar
                      name="البرنامج 1"
                      dataKey="program1"
                      stroke={chartColors.purple}
                      fill={chartColors.purple}
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="البرنامج 2"
                      dataKey="program2"
                      stroke={chartColors.green}
                      fill={chartColors.green}
                      fillOpacity={0.6}
                    />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {reportData && reportType === 'predictive' && (
        <Grid container spacing={3}>
          {/* Predictions */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الرؤى التنبؤية
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  بناءً على تحليل {reportData.historicalDataPoints} نقطة بيانات تاريخية
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          معدل النجاح المتوقع
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {reportData.predictions.successRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          درجة الثقة: {reportData.predictions.confidence}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          المدة المتوقعة
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {reportData.predictions.expectedDuration} يوم
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          الميزانية المقترحة
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {reportData.predictions.suggestedBudget.toLocaleString()} ريال
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box mt={3}>
                  <Typography variant="subtitle1" gutterBottom>
                    التوصيات:
                  </Typography>
                  {reportData.recommendations.map((rec, index) => (
                    <Alert key={index} severity="success" sx={{ mb: 1 }}>
                      {rec}
                    </Alert>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!reportData && !loading && (
        <Alert severity="info">
          يرجى تحديد معايير التقرير والنقر على "إنشاء التقرير" لعرض البيانات
        </Alert>
      )}
    </Container>
  );
};

export default AdvancedReports;
