/**
 * Student Advanced Reports Page
 * صفحة التقارير المتقدمة للطلاب
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  TextField,
  MenuItem,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Insights as InsightsIcon,
  AutoGraph as AutoGraphIcon,
  Psychology as PsychologyIcon,
  WarningAmber as WarningAmberIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
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
  ResponsiveContainer,
} from 'recharts';
import studentPortalService from '../services/studentPortalService';
import StudentReportsAdvancedOptions from '../components/StudentReportsAdvancedOptions';

const DEFAULT_FILTERS = {
  dateFrom: '2025-09-01',
  dateTo: '2026-01-31',
  reportType: 'comprehensive',
  focusArea: 'all',
};

const StudentReports = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [hasCachedData, setHasCachedData] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const requestIdRef = useRef(0);
  const storageKeyReport = 'studentReports:lastReport';
  const storageKeyFilters = 'studentReports:filters';
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const isDateRangeInvalid =
    Boolean(filters.dateFrom) && Boolean(filters.dateTo) && filters.dateFrom > filters.dateTo;
  const isDefaultFilters = Object.entries(DEFAULT_FILTERS).every(
    ([key, value]) => filters[key] === value
  );

  const loadReport = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      if (isDateRangeInvalid) {
        setLoadError('نطاق التاريخ غير صالح. تأكد أن تاريخ البداية يسبق تاريخ النهاية.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError('');
      setExportError('');
      const studentId = 'STU001';
      const data = await studentPortalService.getStudentAdvancedReport(studentId, filters);
      if (requestId !== requestIdRef.current) return;
      setReportData(data);
      setLastLoadedAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error loading student report:', error);
      const errorMessage =
        error instanceof Error && 'An internal error occurred'
          ? `تعذر تحميل التقرير. ${'حدث خطأ، يرجى المحاولة لاحقاً'}`
          : 'تعذر تحميل التقرير. الرجاء المحاولة لاحقًا.';
      setLoadError(errorMessage);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, isDateRangeInvalid]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReport();
    }, 350);

    return () => clearTimeout(timer);
  }, [loadReport]);

  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(storageKeyFilters);
      const savedReport = localStorage.getItem(storageKeyReport);

      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(prev => ({ ...prev, ...parsedFilters }));
        setHasCachedData(true);
      }

      if (savedReport) {
        const parsedReport = JSON.parse(savedReport);
        setReportData(parsedReport);
        setLoading(false);
        setHasCachedData(true);
        if (parsedReport?.generatedAt) {
          setLastLoadedAt(parsedReport.generatedAt);
        }
      }
    } catch (error) {
      console.warn('Failed to restore cached report data:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyFilters, JSON.stringify(filters));
      setHasCachedData(true);
    } catch (error) {
      console.warn('Failed to persist report filters:', error);
    }
  }, [filters]);

  useEffect(() => {
    if (!reportData) return;
    try {
      localStorage.setItem(storageKeyReport, JSON.stringify(reportData));
      setHasCachedData(true);
      if (reportData?.generatedAt) {
        setLastLoadedAt(reportData.generatedAt);
      }
    } catch (error) {
      console.warn('Failed to persist report data:', error);
    }
  }, [reportData]);

  useEffect(() => {
    if (!isDateRangeInvalid) {
      setLoadError('');
    }
  }, [filters, isDateRangeInvalid]);

  useEffect(() => {
    setExportError('');
  }, [exportFormat]);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setLoadError('');
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem(storageKeyFilters);
      localStorage.removeItem(storageKeyReport);
    } catch (error) {
      console.warn('Failed to clear cached report data:', error);
    }
    setReportData(null);
    setLoadError('');
    setExportError('');
    setFilters(DEFAULT_FILTERS);
    setHasCachedData(false);
  };

  const numberFormatter = useMemo(() => new Intl.NumberFormat('ar-EG'), []);
  const formatNumber = value =>
    typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : '—';
  const formatPercent = value =>
    typeof value === 'number' && Number.isFinite(value) ? `${numberFormatter.format(value)}%` : '—';
  const formatScore = value =>
    typeof value === 'number' && Number.isFinite(value)
      ? `${numberFormatter.format(value)}/100`
      : '—';
  const formatDeltaValue = value =>
    typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : value;

  const summaryCards = useMemo(() => {
    if (!reportData) return [];
    const summary = reportData?.summary || {};
    return [
      {
        title: 'المعدل التراكمي المتوقع',
        value: formatNumber(summary.predictedGpa),
        icon: <TrendingUpIcon />,
        color: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
      },
      {
        title: 'نسبة الحضور',
        value: formatPercent(summary.attendanceRate),
        icon: <AssessmentIcon />,
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      {
        title: 'مؤشر السلوك',
        value: formatScore(summary.behaviorScore),
        icon: <PsychologyIcon />,
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      },
      {
        title: 'مستوى المخاطر',
        value: summary.riskLevelLabel ?? '—',
        icon: summary.riskLevel === 'low' ? <CheckCircleIcon /> : <WarningAmberIcon />,
        color: 'linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)',
      },
    ];
  }, [reportData, formatNumber, formatPercent, formatScore]);

  const handleExport = async () => {
    if (!reportData || exporting) return;
    setExporting(true);
    setExportError('');

    try {
      const payload = {
        report_data: {
          ...reportData,
          report_type: reportData.reportType || 'Advanced Student Report',
          student_name: reportData.student?.name || 'Unknown',
          generated_at: reportData.generatedAt || new Date().toISOString(),
        },
      };

      const response = await fetch(`/api/exports/${exportFormat}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const extensionMap = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
        json: 'json',
      };
      const extension = extensionMap[exportFormat] || exportFormat;
      const dateLabel = new Date().toISOString().split('T')[0];
      const fileName = `student-advanced-report-${dateLabel}.${extension}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      const errorMessage =
        error instanceof Error && 'An internal error occurred'
          ? `تعذر تصدير التقرير. ${'حدث خطأ، يرجى المحاولة لاحقاً'}`
          : 'تعذر تصدير التقرير. تأكد من تشغيل الخادم وخدمة التصدير.';
      setExportError(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !reportData) {
    if (loadError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2,
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 520 }}>
            {loadError}
          </Alert>
          <Button variant="contained" onClick={loadReport} disabled={loading || isDateRangeInvalid}>
            إعادة المحاولة
          </Button>
        </Box>
      );
    }

    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const { student, trends, subjects, skills, insights, recommendations, comparison, riskSignals } =
    reportData;
  const safeStudent = student || {
    name: '—',
    grade: '—',
    studentId: '—',
    section: '—',
    tags: [],
  };
  const safeTrends = trends || { gpaTrend: [], attendanceTrend: [] };
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeInsights = Array.isArray(insights) ? insights : [];
  const safeRecommendations = Array.isArray(recommendations)
    ? recommendations.map(item => ({
        ...item,
        actions: Array.isArray(item.actions) ? item.actions : [],
      }))
    : [];
  const safeComparison = comparison || { current: {}, previous: {}, delta: [] };
  const safeRiskSignals = Array.isArray(riskSignals) ? riskSignals : [];
  const safeStudentTags = Array.isArray(safeStudent.tags) ? safeStudent.tags : [];
  const comparisonCurrentLabel = safeComparison.current?.label || '—';
  const comparisonCurrentSummary = safeComparison.current?.summary || '—';
  const comparisonPreviousLabel = safeComparison.previous?.label || '—';
  const comparisonPreviousSummary = safeComparison.previous?.summary || '—';
  const generatedAtLabel = reportData.generatedAt
    ? new Date(reportData.generatedAt).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
  const lastLoadedLabel = lastLoadedAt
    ? new Date(lastLoadedAt).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
  const hasGpaTrend = Array.isArray(safeTrends.gpaTrend) && safeTrends.gpaTrend.length > 0;
  const hasAttendanceTrend =
    Array.isArray(safeTrends.attendanceTrend) && safeTrends.attendanceTrend.length > 0;
  const isRefreshing = loading;
  const isReportEmpty =
    !hasGpaTrend &&
    !hasAttendanceTrend &&
    safeSubjects.length === 0 &&
    safeSkills.length === 0 &&
    safeInsights.length === 0 &&
    safeRecommendations.length === 0 &&
    safeRiskSignals.length === 0 &&
    (safeComparison.delta || []).length === 0 &&
    Object.keys(reportData?.summary || {}).length === 0;
  const isCachedReport = Boolean(reportData?.generatedAt) && loadError.length > 0;
  const canExport = !exporting && !loading;
  const canRefresh = !loading && !isDateRangeInvalid;
  const canResetFilters = !loading && !isDefaultFilters;
  const canClearCache = !loading && hasCachedData;

  return (
    <Box sx={{ p: 3 }} aria-busy={loading ? 'true' : 'false'}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            📊 التقارير المتقدمة للطلاب
          </Typography>
          <Typography variant="body2" color="textSecondary">
            تقرير ذكي شامل يعرض الأداء، المخاطر، الاتجاهات، والتوصيات بشكل احترافي ومتكامل.
          </Typography>
          {isCachedReport && (
            <Chip
              label="بيانات محفوظة مؤقتًا"
              size="small"
              sx={{ mt: 1 }}
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select
            size="small"
            label="صيغة التصدير"
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="json">JSON</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={!canExport}
          >
            {exporting ? 'جارٍ التصدير...' : 'تصدير التقرير'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoGraphIcon />}
            onClick={loadReport}
            disabled={!canRefresh}
          >
            تحديث التقرير
          </Button>
          <Button variant="text" onClick={handleResetFilters} disabled={!canResetFilters}>
            إعادة ضبط الفلاتر
          </Button>
          <Button variant="text" onClick={handleClearCache} disabled={!canClearCache}>
            مسح البيانات المحفوظة
          </Button>
        </Stack>
      </Box>

      {isRefreshing && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert" aria-live="assertive">
          {exportError}
        </Alert>
      )}

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }} role="status" aria-live="polite">
          {loadError}
        </Alert>
      )}

      {!isRefreshing && isReportEmpty && (
        <Alert severity="info" sx={{ mb: 2 }} role="status" aria-live="polite">
          لا توجد بيانات كافية للفترة المحددة. جرّب تغيير الفلاتر أو توسيع النطاق الزمني.
        </Alert>
      )}

      {/* Student Summary */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {safeStudent.name} • {safeStudent.grade}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {safeStudent.studentId} • الفصل {safeStudent.section} • آخر تحديث: {generatedAtLabel}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              آخر تحميل فعلي: {lastLoadedLabel}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack
              direction="row"
              spacing={1}
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            >
              {safeStudentTags.map(tag => (
                <Chip key={tag} label={tag} color="primary" variant="outlined" />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="من"
                InputLabelProps={{ shrink: true }}
                value={filters.dateFrom}
                onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                error={isDateRangeInvalid}
                helperText={isDateRangeInvalid ? 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' : ' '}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="إلى"
                InputLabelProps={{ shrink: true }}
                value={filters.dateTo}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                error={isDateRangeInvalid}
                helperText={
                  isDateRangeInvalid ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.' : ' '
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="نوع التقرير"
                value={filters.reportType}
                onChange={e => setFilters({ ...filters, reportType: e.target.value })}
              >
                <MenuItem value="comprehensive">شامل</MenuItem>
                <MenuItem value="academic">أكاديمي</MenuItem>
                <MenuItem value="behavior">سلوكي</MenuItem>
                <MenuItem value="attendance">الحضور</MenuItem>
                <MenuItem value="skills">المهارات</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="مجال التركيز"
                value={filters.focusArea}
                onChange={e => setFilters({ ...filters, focusArea: e.target.value })}
              >
                <MenuItem value="all">جميع المجالات</MenuItem>
                <MenuItem value="math">الرياضيات</MenuItem>
                <MenuItem value="arabic">اللغة العربية</MenuItem>
                <MenuItem value="science">العلوم</MenuItem>
                <MenuItem value="english">اللغة الإنجليزية</MenuItem>
                <MenuItem value="skills">مهارات التعلم</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map(card => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card
              sx={{
                borderRadius: 3,
                color: 'white',
                background: card.color,
                boxShadow: 6,
                transition: 'transform 0.3s',
                '&:hover': { transform: 'translateY(-5px)' },
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Box sx={{ fontSize: 32 }}>{card.icon}</Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {card.value}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Trends */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                📈 اتجاه الأداء الأكاديمي
              </Typography>
              {hasGpaTrend ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={safeTrends.gpaTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[3.5, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#4facfe" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد بيانات اتجاهات أكاديمية متاحة.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                ✅ اتجاه الحضور والانضباط
              </Typography>
              {hasAttendanceTrend ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={safeTrends.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#43cea2" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد بيانات اتجاهات للحضور والانضباط.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Subjects & Skills */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                📚 أداء المواد الأكاديمية
              </Typography>
              {safeSubjects.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={safeSubjects}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#667eea" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                    {safeSubjects.map(subject => (
                      <Chip
                        key={subject.subject}
                        label={`${subject.subject} • ${subject.trendLabel}`}
                        color={
                          subject.trend === 'up'
                            ? 'success'
                            : subject.trend === 'down'
                              ? 'warning'
                              : 'default'
                        }
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد بيانات مواد متاحة للفترة المحددة.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                🧠 تحليل المهارات
              </Typography>
              {safeSkills.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={safeSkills}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="المستوى"
                        dataKey="value"
                        stroke="#f5576c"
                        fill="#f5576c"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  <Typography variant="caption" color="textSecondary">
                    يعرض الرسم مهارات التعلم والاتساق والتركيز بشكل بصري.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد بيانات مهارات متاحة حتى الآن.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights & Risk */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                💡 الرؤى الذكية
              </Typography>
              {safeInsights.length > 0 ? (
                <Stack spacing={2}>
                  {safeInsights.map(item => (
                    <Alert
                      key={item.title}
                      severity={item.type}
                      icon={<InsightsIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {item.details}
                      </Typography>
                    </Alert>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد رؤى متاحة للفترة الحالية.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                🚦 مؤشرات المخاطر
              </Typography>
              {safeRiskSignals.length > 0 ? (
                <Stack spacing={2}>
                  {safeRiskSignals.map(signal => (
                    <Box key={signal.label}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {signal.label}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {signal.levelLabel}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={signal.score}
                        sx={{ height: 8, borderRadius: 3 }}
                        color={
                          signal.level === 'low'
                            ? 'success'
                            : signal.level === 'medium'
                              ? 'warning'
                              : 'error'
                        }
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد مؤشرات مخاطر مسجلة حاليًا.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recommendations */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            ✅ التوصيات وخطة التحسين
          </Typography>
          {safeRecommendations.length > 0 ? (
            <Grid container spacing={2}>
              {safeRecommendations.map(item => (
                <Grid item xs={12} md={6} key={item.title}>
                  <Paper sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        الأولوية: {item.priority}
                      </Typography>
                      <Divider />
                      <Stack spacing={0.5}>
                        {item.actions.length > 0 ? (
                          item.actions.map(action => (
                            <Typography key={action} variant="body2">
                              • {action}
                            </Typography>
                          ))
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            لا توجد إجراءات محددة بعد.
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="textSecondary">
              لا توجد توصيات متاحة حاليًا.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Comparison Summary */}
      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            🧭 مقارنة الفترات
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                الفترة الحالية: {comparisonCurrentLabel}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {comparisonCurrentSummary}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                الفترة السابقة: {comparisonPreviousLabel}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {comparisonPreviousSummary}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                {(safeComparison.delta || []).length > 0 ? (
                  (safeComparison.delta || []).map(item => (
                    <Chip
                      key={item.label}
                      label={`${item.label}: ${formatDeltaValue(item.value) ?? '—'}`}
                      color={item.type === 'positive' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    لا توجد فروقات متاحة للمقارنة.
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Box sx={{ mt: 4 }}>
        <StudentReportsAdvancedOptions
          studentId="STU001"
          onReportGenerated={data => {
            setReportData(prev => ({ ...prev, ...data }));
          }}
        />
      </Box>
    </Box>
  );
};

export default StudentReports;
