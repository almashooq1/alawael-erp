/**
 * Student Advanced Reports Page — صفحة التقارير المتقدمة للطلاب
 *
 * Slim orchestrator: wires the useStudentReport hook
 * with chart and insight sub-components.
 */




import useStudentReport from './useStudentReport';

const StudentReports = () => {
  const {
    loading,
    reportData,
    setReportData,
    loadError,
    exportFormat,
    setExportFormat,
    exporting,
    exportError,
    hasCachedData,
    lastLoadedAt,
    filters,
    setFilters,
    isDateRangeInvalid,
    isDefaultFilters,
    summaryCards,
    loadReport,
    handleResetFilters,
    handleClearCache,
    handleExport,
    formatDeltaValue,
    userId,
  } = useStudentReport();

  // ─── Early return: loading / error ─────────────
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

  // ─── Safe destructuring ────────────────────────
  const { student, trends, subjects, skills, insights, recommendations, comparison, riskSignals } =
    reportData;
  const safeStudent = student || { name: '—', grade: '—', studentId: '—', section: '—', tags: [] };
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
    ? new Date(lastLoadedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
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
      {/* Header + Toolbar */}
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

      {/* Alerts */}
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

      {/* Charts */}
      <StudentReportCharts
        safeTrends={safeTrends}
        hasGpaTrend={hasGpaTrend}
        hasAttendanceTrend={hasAttendanceTrend}
        safeSubjects={safeSubjects}
        safeSkills={safeSkills}
      />

      {/* Insights, Recommendations & Comparison */}
      <StudentReportInsights
        safeInsights={safeInsights}
        safeRiskSignals={safeRiskSignals}
        safeRecommendations={safeRecommendations}
        safeComparison={safeComparison}
        comparisonCurrentLabel={comparisonCurrentLabel}
        comparisonCurrentSummary={comparisonCurrentSummary}
        comparisonPreviousLabel={comparisonPreviousLabel}
        comparisonPreviousSummary={comparisonPreviousSummary}
        formatDeltaValue={formatDeltaValue}
      />

      {/* Advanced Options */}
      <Box sx={{ mt: 4 }}>
        <StudentReportsAdvancedOptions
          studentId={userId}
          onReportGenerated={data => setReportData(prev => ({ ...prev, ...data }))}
        />
      </Box>
    </Box>
  );
};

export default StudentReports;
