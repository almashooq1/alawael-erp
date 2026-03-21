



import { gradients } from '../../theme/palette';

/**
 * Page header: gradient banner, title row with action buttons,
 * 4 statistics cards, and the tab bar (3 tabs now).
 */
const PageHeader = ({
  statistics,
  tabValue,
  onTabChange,
  onOpenHistory,
  onOpenBatch,
  onOpenProgress,
  onOpenRecommended,
}) => (
  <>
    {/* Gradient Banner */}
    <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AssessmentIcon sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>مقاييس تقييم الإعاقة</Typography>
          <Typography variant="body2">إدارة مقاييس وأدوات التقييم المعتمدة — 22 مقياساً</Typography>
        </Box>
      </Box>
    </Box>

    {/* Title Row */}
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          <AccessibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          مقاييس التقييم لذوي الإعاقة
        </Typography>
        <Typography variant="body1" color="text.secondary">
          إدارة وتطبيق مقاييس التقييم المعتمدة لقياس مستوى القدرات والمهارات
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="contained" color="secondary" size="small" startIcon={<RecommendIcon />} onClick={onOpenRecommended}>
          مقاييس مقترحة
        </Button>
        <Button variant="contained" color="info" size="small" startIcon={<BatchIcon />} onClick={onOpenBatch}>
          تقييم جماعي
        </Button>
        <Button variant="contained" color="success" size="small" startIcon={<TimelineIcon />} onClick={onOpenProgress}>
          متابعة التقدم
        </Button>
        <Button variant="outlined" size="small" startIcon={<HistoryIcon />} onClick={onOpenHistory}>
          سجل التقييمات
        </Button>
      </Stack>
    </Box>

    {/* Statistics Cards */}
    {statistics && (
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.assessmentBlue }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <AssessmentIcon sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.scaleAssessments}
              </Typography>
              <Typography variant="body2">تقييمات المقاييس</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.assessmentGreen }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <PersonIcon sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.totalBeneficiaries}
              </Typography>
              <Typography variant="body2">المستفيدون</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.assessmentOrange }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <TrendingUpIcon sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.averageScore}%
              </Typography>
              <Typography variant="body2">متوسط الدرجات</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.assessmentPurple }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <BarChartIcon sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.completionRate}%
              </Typography>
              <Typography variant="body2">معدل الإنجاز</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )}

    {/* Tab Bar */}
    <Paper sx={{ mb: 3 }}>
      <Tabs value={tabValue} onChange={(_, v) => onTabChange(v)} variant="fullWidth">
        <Tab icon={<AssessmentIcon />} label="المقاييس المعتمدة (22)" />
        <Tab icon={<HistoryIcon />} label="آخر التقييمات" />
        <Tab icon={<AnalyticsIcon />} label="التحليلات والمقارنة" />
      </Tabs>
    </Paper>
  </>
);

export default PageHeader;
