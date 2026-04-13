/**
 * Beneficiary AI Analysis — تحليل المستفيد بالذكاء الاصطناعي
 * Phase 17
 */
import { useState, useEffect, useCallback } from 'react';



import { useParams, useNavigate } from 'react-router-dom';
import aiDiagnosticService from '../../services/aiDiagnosticService';

/* ── helpers ── */
const priorityColor = (p) => ({ high: 'error', medium: 'warning', low: 'success' }[p] || 'default');
const riskColor = (l) => ({ critical: 'error', high: 'error', medium: 'warning', low: 'success' }[l] || 'default');
const trendIcon = (d) => {
  if (d === 'improving' || d === 'increasing') return <TrendingUpIcon color="success" />;
  if (d === 'declining' || d === 'decreasing') return <TrendingDownIcon color="error" />;
  return <FlatIcon color="action" />;
};

export default function BeneficiaryAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [beneficiary, setBeneficiary] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [risk, setRisk] = useState(null);
  const [goals, setGoals] = useState([]);
  const [_assessments, setAssessments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [_behaviors, setBehaviors] = useState([]);
  const [report, setReport] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [benRes, analysisRes, recRes, patRes, riskRes, goalRes, asmtRes, sessRes, behRes] = await Promise.all([
        aiDiagnosticService.getBeneficiary(id),
        aiDiagnosticService.analyzeProgress(id),
        aiDiagnosticService.getRecommendations(id),
        aiDiagnosticService.detectPatterns(id),
        aiDiagnosticService.assessRisk(id),
        aiDiagnosticService.listGoals(id),
        aiDiagnosticService.listAssessments(id),
        aiDiagnosticService.listSessions(id),
        aiDiagnosticService.listBehaviorLogs(id),
      ]);
      setBeneficiary(benRes.data?.data || benRes.data);
      setAnalysis(analysisRes.data?.data || analysisRes.data);
      setRecommendations(recRes.data?.data || recRes.data);
      setPatterns(patRes.data?.data || patRes.data);
      setRisk(riskRes.data?.data || riskRes.data);
      setGoals(goalRes.data?.data || goalRes.data || []);
      setAssessments(asmtRes.data?.data || asmtRes.data || []);
      setSessions(sessRes.data?.data || sessRes.data || []);
      setBehaviors(behRes.data?.data || behRes.data || []);
    } catch (e) {
      setSnackbar({ open: true, message: 'حدث خطأ في تحميل بيانات المستفيد', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const generateReport = useCallback(async () => {
    try {
      const res = await aiDiagnosticService.generateReport(id);
      setReport(res.data?.data || res.data);
      setSnackbar({ open: true, message: 'تم إنشاء التقرير بنجاح', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'حدث خطأ في إنشاء التقرير', severity: 'error' });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!beneficiary) {
    return <Alert severity="error" sx={{ m: 3 }}>لم يتم العثور على المستفيد</Alert>;
  }

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/ai-diagnostic')}>
          <BackIcon />
        </IconButton>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          <PsychologyIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">{beneficiary.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {beneficiary.nationalId} • {beneficiary.disabilityType} • {beneficiary.disabilitySeverity}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ReportIcon />}
            onClick={generateReport}
          >
            تقرير AI شامل
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={load} color="primary"><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Quick Stats ── */}
      {analysis && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {analysis.overallScore}%
                </Typography>
                <Typography variant="caption">نتيجة التحليل الكلية</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Chip label={risk?.riskLevel === 'low' ? 'منخفض' : risk?.riskLevel === 'medium' ? 'متوسط' : risk?.riskLevel === 'high' ? 'مرتفع' : 'حرج'} color={riskColor(risk?.riskLevel)} />
                <Typography variant="caption" display="block" mt={1}>مستوى المخاطر</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {analysis.goalStats?.avgProgress || 0}%
                </Typography>
                <Typography variant="caption">متوسط تقدم الأهداف</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={2}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                  {trendIcon(analysis.trajectory?.direction)}
                  <Typography variant="h6" fontWeight="bold">
                    {analysis.trajectory?.direction === 'improving' ? 'تحسن' : analysis.trajectory?.direction === 'declining' ? 'تراجع' : 'مستقر'}
                  </Typography>
                </Box>
                <Typography variant="caption">مسار التقدم</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<AssessmentIcon />} label="التحليل" />
          <Tab icon={<RecommendIcon />} label="التوصيات" />
          <Tab icon={<TimelineIcon />} label="الأهداف" />
          <Tab icon={<PatternIcon />} label="الأنماط" />
          <Tab icon={<ShieldIcon />} label="المخاطر" />
          <Tab icon={<ReportIcon />} label="التقرير" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Analysis ── */}
      {tab === 0 && analysis && (
        <Grid container spacing={2}>
          {/* Trajectory */}
          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  مسار التقدم
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {trendIcon(analysis.trajectory?.direction)}
                  <Typography>
                    {analysis.trajectory?.direction === 'improving'
                      ? `تحسن بمعدل ${analysis.trajectory.ratePerMonth} نقطة/شهر`
                      : analysis.trajectory?.direction === 'declining'
                        ? 'تراجع — يحتاج تدخل'
                        : 'بيانات غير كافية'}
                  </Typography>
                </Box>
                {analysis.trajectory?.startScore !== undefined && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      من {analysis.trajectory.startScore} إلى {analysis.trajectory.endScore}
                      ({analysis.trajectory.daysObserved} يوم)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, analysis.trajectory.endScore)}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Engagement */}
          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  مستوى المشاركة
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {trendIcon(analysis.engagementTrend?.direction)}
                  <Typography>
                    متوسط المشاركة: {analysis.engagementTrend?.avgEngagement}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analysis.engagementTrend?.avgEngagement || 0}
                  color={analysis.engagementTrend?.avgEngagement >= 70 ? 'success' : analysis.engagementTrend?.avgEngagement >= 50 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {analysis.engagementTrend?.completedSessions || 0} جلسة مكتملة من {analysis.engagementTrend?.totalSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Strengths & Weaknesses */}
          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.main">
                  <StarIcon fontSize="small" sx={{ mr: 0.5 }} /> نقاط القوة
                </Typography>
                {analysis.strengths?.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analysis.strengths.map((s, i) => (
                      <Chip key={i} label={s} color="success" size="small" variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">لا توجد نقاط قوة محددة بعد</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="error.main">
                  <FlagIcon fontSize="small" sx={{ mr: 0.5 }} /> مجالات التحسين
                </Typography>
                {analysis.areasForImprovement?.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analysis.areasForImprovement.map((a, i) => (
                      <Chip key={i} label={a} color="error" size="small" variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">أداء جيد في جميع المجالات</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Behavior Analysis */}
          <Grid item xs={12}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  تحليل السلوك
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">إجمالي السجلات</Typography>
                    <Typography variant="h6">{analysis.behaviorAnalysis?.totalLogs || 0}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">إيجابية</Typography>
                    <Typography variant="h6" color="success.main">{analysis.behaviorAnalysis?.positive || 0}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">تحدية</Typography>
                    <Typography variant="h6" color="error.main">{analysis.behaviorAnalysis?.challenging || 0}</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">نسبة الإيجابية: {analysis.behaviorAnalysis?.positiveRatio || 0}%</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.behaviorAnalysis?.positiveRatio || 0}
                    color={analysis.behaviorAnalysis?.positiveRatio >= 60 ? 'success' : 'error'}
                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sessions table */}
          <Grid item xs={12}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  الجلسات العلاجية ({sessions.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['التاريخ', 'نوع العلاج', 'المدة', 'المشاركة', 'التقييم', 'تحليل AI'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions.slice(0, 10).map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>{s.date}</TableCell>
                          <TableCell><Chip label={s.therapyType} size="small" /></TableCell>
                          <TableCell>{s.duration} د</TableCell>
                          <TableCell>{s.outcomes?.engagement ?? '-'}%</TableCell>
                          <TableCell>{s.outcomes?.progressRating ?? '-'}/5</TableCell>
                          <TableCell>
                            {s.aiAnalysis ? (
                              <Chip
                                label={s.aiAnalysis.engagementLevel === 'high' ? 'عالي' : s.aiAnalysis.engagementLevel === 'medium' ? 'متوسط' : 'منخفض'}
                                color={s.aiAnalysis.engagementLevel === 'high' ? 'success' : s.aiAnalysis.engagementLevel === 'medium' ? 'warning' : 'error'}
                                size="small"
                              />
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Tab 1: Recommendations ── */}
      {tab === 1 && recommendations && (
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            التوصيات العلاجية الذكية ({recommendations.recommendations?.length || 0})
          </Typography>
          {recommendations.recommendations?.map((rec, i) => (
            <Accordion key={i} defaultExpanded={rec.priority === 'high'}>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Chip label={rec.priority === 'high' ? 'عاجل' : rec.priority === 'medium' ? 'متوسط' : 'منخفض'} size="small" color={priorityColor(rec.priority)} />
                  <Typography fontWeight="bold">{rec.title}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">ثقة: {Math.round((rec.confidence || 0) * 100)}%</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography gutterBottom>{rec.description}</Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>السبب:</strong> {rec.rationale}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* ── Tab 2: Goals ── */}
      {tab === 2 && (
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            الأهداف العلاجية ({goals.length})
          </Typography>
          <Grid container spacing={2}>
            {goals.map((g) => (
              <Grid item xs={12} md={6} key={g.id}>
                <Card elevation={1}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography fontWeight="bold">{g.title}</Typography>
                      <Chip
                        label={g.status === 'achieved' ? 'مُحقق' : 'قيد التنفيذ'}
                        color={g.status === 'achieved' ? 'success' : 'primary'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{g.description}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={g.progress}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={g.progress >= 70 ? 'success' : g.progress >= 40 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2" fontWeight="bold">{g.progress}%</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      الهدف: {g.targetDate}
                    </Typography>
                    {g.milestones?.length > 0 && (
                      <List dense sx={{ mt: 1 }}>
                        {g.milestones.map((m, mi) => (
                          <ListItem key={mi} disablePadding sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              {m.achieved ? <CheckIcon color="success" fontSize="small" /> : <UncheckedIcon fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={m.label}
                              secondary={m.date || 'لم يتحقق بعد'}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Tab 3: Patterns ── */}
      {tab === 3 && patterns && (
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            الأنماط المكتشفة ({patterns.totalPatternsFound || 0})
          </Typography>
          {patterns.patterns?.map((p, i) => (
            <Card key={i} elevation={1} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PatternIcon color="primary" />
                  <Typography fontWeight="bold">
                    {p.type === 'engagement_trend' ? 'اتجاه المشاركة' :
                     p.type === 'behavior_ratio' ? 'نسبة السلوك' :
                     p.type === 'assessment_trend' ? 'اتجاه التقييم' :
                     p.type === 'session_frequency' ? 'تكرار الجلسات' : p.type}
                  </Typography>
                  <Chip
                    label={p.significance === 'significant' ? 'مهم' : 'طفيف'}
                    size="small"
                    color={p.significance === 'significant' ? 'warning' : 'default'}
                  />
                </Box>
                <Typography>{p.description}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Tab 4: Risk ── */}
      {tab === 4 && risk && (
        <Box>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight="bold" color={riskColor(risk.riskLevel) + '.main'}>
                {risk.riskScore}
              </Typography>
              <Chip
                label={risk.riskLevel === 'low' ? 'منخفض' : risk.riskLevel === 'medium' ? 'متوسط' : risk.riskLevel === 'high' ? 'مرتفع' : 'حرج'}
                color={riskColor(risk.riskLevel)}
                sx={{ mt: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                نقاط المخاطر من 100
              </Typography>
            </CardContent>
          </Card>

          {risk.riskFactors?.length > 0 && (
            <Card elevation={1} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="error.main">
                  <WarningIcon fontSize="small" sx={{ mr: 0.5 }} /> عوامل المخاطر
                </Typography>
                <List dense>
                  {risk.riskFactors.map((rf, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <Chip label={rf.severity === 'critical' ? 'حرج' : rf.severity === 'high' ? 'عالي' : 'متوسط'} size="small" color={riskColor(rf.severity)} />
                      </ListItemIcon>
                      <ListItemText primary={rf.description} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {risk.mitigationSuggestions?.length > 0 && (
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.main">
                  <OptimizeIcon fontSize="small" sx={{ mr: 0.5 }} /> اقتراحات التخفيف
                </Typography>
                <List dense>
                  {risk.mitigationSuggestions.map((m, i) => (
                    <ListItem key={i}>
                      <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary={m} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ── Tab 5: Report ── */}
      {tab === 5 && (
        <Box>
          {!report ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ReportIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>لم يتم إنشاء تقرير بعد</Typography>
              <Button variant="contained" startIcon={<ReportIcon />} onClick={generateReport}>
                إنشاء تقرير AI شامل
              </Button>
            </Box>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                تم إنشاء التقرير بتاريخ: {new Date(report.generatedAt).toLocaleString('ar-SA')}
              </Alert>

              {/* Summary */}
              <Card elevation={1} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>الملخص</Typography>
                  <Grid container spacing={2}>
                    {[
                      { l: 'النتيجة الكلية', v: `${report.summary?.overallScore}%` },
                      { l: 'مستوى المخاطر', v: report.summary?.riskLevel },
                      { l: 'الأهداف', v: `${report.summary?.achievedGoals}/${report.summary?.totalGoals}` },
                      { l: 'متوسط التقدم', v: `${report.summary?.avgProgress}%` },
                    ].map((item, i) => (
                      <Grid item xs={6} sm={3} key={i}>
                        <Typography variant="caption" color="text.secondary">{item.l}</Typography>
                        <Typography variant="h6" fontWeight="bold">{item.v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Conclusion */}
              <Card elevation={1} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>الاستنتاج</Typography>
                  <Typography>{report.conclusion}</Typography>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>الخطوات التالية</Typography>
                  <List dense>
                    {report.nextSteps?.map((step, i) => (
                      <ListItem key={i}>
                        <ListItemIcon><CheckIcon color="primary" fontSize="small" /></ListItemIcon>
                        <ListItemText primary={step} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
