/**
 * AiAnalyticsDashboard — لوحة تحكم الذكاء الاصطناعي والتحليلات التنبؤية
 * البرومبت 20: AI & Predictive Analytics Module
 */
import { useState, useEffect, useCallback } from 'react';




import apiClient from 'services/api.client';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const severityColor = { urgent: 'error', critical: 'warning', warning: 'info', info: 'default' };
const severityLabel = { urgent: 'عاجل', critical: 'حرج', warning: 'تحذير', info: 'معلومات' };
const alertTypeLabel = {
  no_progress: 'عدم تقدم',
  high_absence: 'غياب مرتفع',
  insurance_expiring: 'تأمين منتهٍ',
  dropout_risk: 'خطر انسحاب',
  caseload_limit: 'سقف حالات',
  financial_risk: 'خطر مالي',
  vacant_slot: 'مقاعد شاغرة',
  performance_drop: 'تراجع أداء',
  pattern_detected: 'نمط مكتشف',
};
const alertIcon = type =>
  ({
    no_progress: '📉',
    high_absence: '📅',
    insurance_expiring: '🏥',
    dropout_risk: '🚪',
    caseload_limit: '👤',
    financial_risk: '💳',
    vacant_slot: '💺',
    performance_drop: '⬇️',
    pattern_detected: '🔍',
  })[type] || '⚠️';

const fmt = v =>
  v
    ? new Date(v).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
const fmtCur = v => (v ? `${Number(v).toLocaleString('ar-SA')} ر.س` : '0 ر.س');
const fmtPct = v => (v !== null && v !== undefined ? `${Math.round(v * 100)}%` : 'N/A');
const progressColor = v => (v >= 0.7 ? 'success' : v >= 0.4 ? 'warning' : 'error');

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AiAnalyticsDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningChecks, setRunningChecks] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState({ data: [], total: 0 });
  const [predictions, setPredictions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [reports, setReports] = useState([]);
  const [models, setModels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('');
  const [alertType, setAlertType] = useState('');
  const [generateModal, setGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    beneficiary_id: '',
    month: new Date().toISOString().slice(0, 7),
    language: 'ar',
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  // ─── Loaders ────────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      const params = branchFilter ? `?branch_id=${branchFilter}` : '';
      const r = await apiClient.get(`/ai-analytics/dashboard${params}`);
      setDashboard(r.data);
    } catch (e) {
      console.warn('AI dashboard load failed', e.message);
    }
  }, [branchFilter]);

  const loadAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ per_page: 20, is_read: 'false' });
      if (branchFilter) params.set('branch_id', branchFilter);
      if (alertSeverity) params.set('severity', alertSeverity);
      if (alertType) params.set('alert_type', alertType);
      const r = await apiClient.get(`/ai-analytics/alerts?${params}`);
      setAlerts({ data: r.data?.data || r.data?.docs || [], total: r.data?.total || 0 });
    } catch {
      /* noop */
    }
  }, [branchFilter, alertSeverity, alertType]);

  const loadPredictions = useCallback(async () => {
    try {
      const params = branchFilter ? `?branch_id=${branchFilter}&per_page=50` : '?per_page=50';
      const r = await apiClient.get(`/ai-analytics/predictions${params}`);
      setPredictions(r.data?.data || r.data?.docs || []);
    } catch {
      /* noop */
    }
  }, [branchFilter]);

  const loadSuggestions = useCallback(async () => {
    try {
      const r = await apiClient.get('/ai-analytics/suggestions?per_page=20');
      setSuggestions(r.data?.data || r.data?.docs || []);
    } catch {
      /* noop */
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const r = await apiClient.get('/ai-analytics/reports?per_page=20');
      setReports(r.data?.data || r.data?.docs || []);
    } catch {
      /* noop */
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const r = await apiClient.get('/ai-analytics/models');
      setModels(r.data || []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [br, ben] = await Promise.allSettled([
          apiClient.get('/branches?limit=50'),
          apiClient.get('/beneficiaries?limit=200&status=active'),
        ]);
        if (br.status === 'fulfilled') setBranches(br.value.data?.data || br.value.data || []);
        if (ben.status === 'fulfilled')
          setBeneficiaries(ben.value.data?.data || ben.value.data || []);
        await loadDashboard();
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);
  useEffect(() => {
    if (tab === 1) loadPredictions();
  }, [tab, loadPredictions]);
  useEffect(() => {
    if (tab === 2) loadSuggestions();
  }, [tab, loadSuggestions]);
  useEffect(() => {
    if (tab === 3) loadReports();
  }, [tab, loadReports]);
  useEffect(() => {
    if (tab === 4) loadModels();
  }, [tab, loadModels]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const runChecks = async () => {
    setRunningChecks(true);
    try {
      const r = await apiClient.post(
        '/ai-analytics/run-checks',
        branchFilter ? { branch_id: branchFilter } : {}
      );
      const total = Object.values(r.data?.alerts || {}).reduce((s, c) => s + c, 0);
      showSnack(`اكتملت الفحوصات — ${total} تنبيه جديد`);
      await Promise.all([loadDashboard(), loadAlerts()]);
    } catch {
      showSnack('فشلت الفحوصات', 'error');
    } finally {
      setRunningChecks(false);
    }
  };

  const markRead = async id => {
    await apiClient.put(`/ai-analytics/alerts/${id}/read`).catch(() => {});
    loadAlerts();
    loadDashboard();
  };

  const markAllRead = async () => {
    await apiClient
      .post('/ai-analytics/alerts/read-all', branchFilter ? { branch_id: branchFilter } : {})
      .catch(() => {});
    loadAlerts();
    loadDashboard();
    showSnack('تم تحديد جميع التنبيهات كمقروءة');
  };

  const reviewSuggestion = async (id, action) => {
    try {
      await apiClient.post(`/ai-analytics/suggestions/${id}/review`, { action });
      loadSuggestions();
      loadDashboard();
      showSnack(action === 'accept' ? 'تم قبول الاقتراح' : 'تم رفض الاقتراح');
    } catch {
      /* noop */
    }
  };

  const generateReport = async () => {
    if (!generateForm.beneficiary_id || !generateForm.month) return;
    setGeneratingReport(true);
    try {
      await apiClient.post('/ai-analytics/reports/generate', generateForm);
      setGenerateModal(false);
      loadReports();
      showSnack('تم توليد التقرير بنجاح');
    } catch {
      /* noop */
      showSnack('فشل توليد التقرير', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  const approveReport = async id => {
    await apiClient.put(`/ai-analytics/reports/${id}/approve`).catch(() => {});
    loadReports();
    showSnack('تم اعتماد التقرير');
  };

  const toggleModel = async (id, isActive) => {
    await apiClient.put(`/ai-analytics/models/${id}`, { is_active: isActive }).catch(() => {});
    loadModels();
  };

  // ─── KPI Cards ─────────────────────────────────────────────────────────
  const kpiCards = [
    {
      icon: <NotificationsActive color="error" />,
      value: dashboard?.alerts?.total_unread || 0,
      label: 'تنبيهات غير مقروءة',
      sub: `${dashboard?.alerts?.urgent || 0} عاجل · ${dashboard?.alerts?.critical || 0} حرج`,
      color: (dashboard?.alerts?.urgent || 0) > 0 ? '#fee2e2' : '#f1f5f9',
    },
    {
      icon: <TrendingUp color="primary" />,
      value: dashboard?.predictions?.total_active || 0,
      label: 'تنبؤات نشطة',
      sub: `دقة النموذج: ${fmtPct(dashboard?.predictions?.accuracy_last_month)}`,
      color: '#eff6ff',
    },
    {
      icon: <Warning color="warning" />,
      value: dashboard?.predictions?.at_risk_count || 0,
      label: 'مستفيدون في خطر',
      sub: 'تقدم متوقع < 40%',
      color: '#fffbeb',
    },
    {
      icon: <AttachMoney color="success" />,
      value: fmtCur(dashboard?.financial?.predicted_revenue),
      label: 'إيرادات متوقعة',
      sub: `${dashboard?.financial?.next_month_scheduled_sessions || 0} جلسة مجدولة`,
      color: '#f0fdf4',
    },
  ];

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🤖 لوحة الذكاء الاصطناعي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            التحليلات التنبؤية والتنبيهات الاستباقية
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الفرع</InputLabel>
            <Select
              value={branchFilter}
              label="الفرع"
              onChange={e => {
                setBranchFilter(e.target.value);
                loadDashboard();
              }}
            >
              <MenuItem value="">جميع الفروع</MenuItem>
              {branches.map(b => (
                <MenuItem key={b._id} value={b._id}>
                  {b.name_ar || b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={
              runningChecks ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />
            }
            onClick={runChecks}
            disabled={runningChecks}
            size="small"
          >
            {runningChecks ? 'جارٍ الفحص...' : 'تشغيل الفحوصات'}
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {kpiCards.map((card, i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
            <Card
              sx={{
                bgcolor: card.color,
                cursor: 'pointer',
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              }}
              onClick={() => setTab(i)}
              elevation={0}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} mt={0.5}>
                      {card.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.sub}
                    </Typography>
                  </Box>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Tabs */}
      <Paper
        elevation={1}
        sx={{
          borderRadius: '20px',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
            '& .Mui-selected': { fontWeight: 700 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab
            label={
              <Badge badgeContent={dashboard?.alerts?.total_unread} color="error" max={99}>
                🔔 التنبيهات
              </Badge>
            }
          />
          <Tab label="📈 التنبؤات" />
          <Tab
            label={
              <Badge badgeContent={dashboard?.suggestions?.pending} color="primary" max={99}>
                💡 الاقتراحات
              </Badge>
            }
          />
          <Tab label="📄 التقارير" />
          <Tab label="📊 مؤشرات الأداء" />
          <Tab label="⚙️ نماذج AI" />
        </Tabs>

        <Box p={3}>
          {/* ── Tab 0: Alerts ── */}
          {tab === 0 && (
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                gap={1}
                flexWrap="wrap"
              >
                <Box display="flex" gap={1}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>الأولوية</InputLabel>
                    <Select
                      value={alertSeverity}
                      label="الأولوية"
                      onChange={e => setAlertSeverity(e.target.value)}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      <MenuItem value="urgent">عاجل 🔴</MenuItem>
                      <MenuItem value="critical">حرج 🟠</MenuItem>
                      <MenuItem value="warning">تحذير 🟡</MenuItem>
                      <MenuItem value="info">معلومات 🔵</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>النوع</InputLabel>
                    <Select
                      value={alertType}
                      label="النوع"
                      onChange={e => setAlertType(e.target.value)}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {Object.entries(alertTypeLabel).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button size="small" onClick={markAllRead} variant="outlined">
                    تحديد الكل كمقروء
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {alerts.total} تنبيه
                </Typography>
              </Box>

              {alerts.data.length === 0 ? (
                <Box textAlign="center" py={6} color="text.secondary">
                  <CheckCircle sx={{ fontSize: 48, mb: 1 }} color="success" />
                  <Typography>لا توجد تنبيهات حالياً ✅</Typography>
                </Box>
              ) : (
                alerts.data.map(a => (
                  <Alert
                    key={a._id}
                    severity={severityColor[a.severity] || 'info'}
                    sx={{ mb: 1, opacity: a.is_read ? 0.6 : 1 }}
                    icon={<span>{alertIcon(a.alert_type)}</span>}
                    action={
                      !a.is_read && (
                        <Tooltip title="تحديد كمقروء">
                          <IconButton size="small" onClick={() => markRead(a._id)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  >
                    <Box>
                      <Box display="flex" gap={1} alignItems="center" mb={0.5} flexWrap="wrap">
                        <Chip
                          label={severityLabel[a.severity]}
                          size="small"
                          color={severityColor[a.severity] || 'default'}
                        />
                        <Chip
                          label={alertTypeLabel[a.alert_type] || a.alert_type}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {fmt(a.created_at)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={500}>
                        {a.message_ar}
                      </Typography>
                      {a.suggested_actions?.length > 0 && (
                        <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                          {a.suggested_actions.map(act => (
                            <Chip
                              key={act.action}
                              label={act.label_ar}
                              size="small"
                              variant="outlined"
                              clickable
                              onClick={() =>
                                apiClient
                                  .post(`/ai-analytics/alerts/${a._id}/action`, {
                                    action: act.action,
                                  })
                                  .catch(() => {})
                              }
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Alert>
                ))
              )}
            </Box>
          )}

          {/* ── Tab 1: Predictions ── */}
          {tab === 1 && (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    المستفيد
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    نوع التنبؤ
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    القيمة المتوقعة
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    الثقة
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    تاريخ الهدف
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    الحالة
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      لا توجد تنبؤات
                    </TableCell>
                  </TableRow>
                ) : (
                  predictions.map(p => (
                    <TableRow key={p._id} hover>
                      <TableCell>{p.beneficiary_id?.name_ar || '—'}</TableCell>
                      <TableCell>
                        <Chip label={p.prediction_type} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={1} justifyContent="center">
                          <LinearProgress
                            variant="determinate"
                            value={p.predicted_value * 100}
                            color={progressColor(p.predicted_value)}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">
                            {Math.round(p.predicted_value * 100)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{fmtPct(p.confidence)}</TableCell>
                      <TableCell align="center">{fmt(p.target_date)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={p.status === 'active' ? 'نشط' : 'منتهٍ'}
                          size="small"
                          color={p.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* ── Tab 2: Suggestions ── */}
          {tab === 2 && (
            <Box>
              {suggestions.length === 0 ? (
                <Box textAlign="center" py={6} color="text.secondary">
                  <Typography variant="h4">💡</Typography>
                  <Typography>لا توجد اقتراحات حالياً</Typography>
                </Box>
              ) : (
                suggestions.map(s => (
                  <Card
                    key={s._id}
                    sx={{
                      mb: 2,
                      borderRadius: '16px',
                      border:
                        s.status === 'pending' ? '1px solid #93c5fd' : '1px solid rgba(0,0,0,0.04)',
                      bgcolor: s.status === 'pending' ? '#eff6ff' : 'white',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                    }}
                    elevation={0}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                            <Typography variant="subtitle2" fontWeight={700}>
                              {s.beneficiary_id?.name_ar || 'عام'}
                            </Typography>
                            <Chip
                              label={
                                s.priority === 'high'
                                  ? 'عالي'
                                  : s.priority === 'medium'
                                    ? 'متوسط'
                                    : 'منخفض'
                              }
                              size="small"
                              color={
                                s.priority === 'high'
                                  ? 'error'
                                  : s.priority === 'medium'
                                    ? 'warning'
                                    : 'default'
                              }
                            />
                            <Typography variant="caption" color="text.secondary">
                              {fmtPct(s.confidence_score)} ثقة
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            {s.suggestion_type === 'goals'
                              ? 'اقتراح أهداف علاجية'
                              : s.suggestion_type}{' '}
                            — بناءً على {s.content?.based_on_similar_cases || 0} حالة مشابهة
                          </Typography>
                          {s.content?.suggested_goals?.slice(0, 3).map((g, i) => (
                            <Typography
                              key={i}
                              variant="caption"
                              display="block"
                              color="text.primary"
                            >
                              ✓ {g.title_ar}{' '}
                              <span style={{ color: '#6b7280' }}>
                                ({g.success_rate_in_similar_cases}% نجاح)
                              </span>
                            </Typography>
                          ))}
                        </Box>
                        {s.status === 'pending' ? (
                          <Box display="flex" flexDirection="column" gap={1} ml={2}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<ThumbUp />}
                              onClick={() => reviewSuggestion(s._id, 'accept')}
                            >
                              قبول
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<ThumbDown />}
                              onClick={() => reviewSuggestion(s._id, 'reject')}
                            >
                              رفض
                            </Button>
                          </Box>
                        ) : (
                          <Chip
                            label={s.status === 'accepted' ? '✓ مقبول' : '✗ مرفوض'}
                            color={s.status === 'accepted' ? 'success' : 'error'}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          )}

          {/* ── Tab 3: Reports ── */}
          {tab === 3 && (
            <Box>
              <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setGenerateModal(true)}
                >
                  ✨ توليد تقرير جديد
                </Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: '12px',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      المستفيد
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: '12px',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      نوع التقرير
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: '12px',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      الفترة
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: '12px',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      الحالة
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: '12px',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      إجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        لا توجد تقارير
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map(r => (
                      <TableRow key={r._id} hover>
                        <TableCell>{r.beneficiary_id?.name_ar || '—'}</TableCell>
                        <TableCell>
                          {{
                            monthly_parent: 'شهري للأسرة',
                            quarterly_parent: 'ربع سنوي',
                            progress_summary: 'ملخص تقدم',
                            regulatory: 'تنظيمي',
                          }[r.report_type] || r.report_type}
                        </TableCell>
                        <TableCell align="center">
                          {fmt(r.period_start)} — {fmt(r.period_end)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={
                              {
                                draft: 'مسودة',
                                generated: 'مولّد',
                                reviewed: 'مراجَع',
                                approved: 'معتمد',
                                sent: 'مُرسل',
                              }[r.status] || r.status
                            }
                            size="small"
                            color={
                              {
                                draft: 'default',
                                generated: 'info',
                                reviewed: 'warning',
                                approved: 'success',
                                sent: 'secondary',
                              }[r.status] || 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5} justifyContent="center">
                            {r.pdf_path && (
                              <Tooltip title="تحميل PDF">
                                <IconButton
                                  size="small"
                                  onClick={() => window.open(`/api/files/${r.pdf_path}`, '_blank')}
                                >
                                  <Download fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {r.status === 'generated' && (
                              <Button size="small" onClick={() => approveReport(r._id)}>
                                اعتماد
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* ── Tab 4: KPI Trends ── */}
          {tab === 4 && (
            <Grid container spacing={3}>
              {(dashboard?.kpi_trends || []).length === 0 ? (
                <Grid item xs={12}>
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    لا توجد بيانات
                  </Typography>
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" mb={2} fontWeight={600}>
                      نسبة الحضور الشهرية
                    </Typography>
                    {(dashboard?.kpi_trends || []).map(m => (
                      <Box key={m.month} display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography variant="caption" sx={{ width: 70, flexShrink: 0 }}>
                          {m.label}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={m.attendance_rate}
                          sx={{ flex: 1, height: 10, borderRadius: 5 }}
                          color="primary"
                        />
                        <Typography variant="caption" sx={{ width: 35 }}>
                          {m.attendance_rate}%
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" mb={2} fontWeight={600}>
                      متوسط الأداء الشهري
                    </Typography>
                    {(dashboard?.kpi_trends || []).map(m => (
                      <Box key={m.month} display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography variant="caption" sx={{ width: 70, flexShrink: 0 }}>
                          {m.label}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={m.avg_performance}
                          sx={{ flex: 1, height: 10, borderRadius: 5 }}
                          color={m.avg_performance >= 70 ? 'success' : 'warning'}
                        />
                        <Typography variant="caption" sx={{ width: 35 }}>
                          {m.avg_performance}%
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                </>
              )}
            </Grid>
          )}

          {/* ── Tab 5: AI Models ── */}
          {tab === 5 && (
            <Box>
              {models.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  لا توجد نماذج مكوّنة
                </Typography>
              ) : (
                models.map(m => (
                  <Card
                    key={m._id}
                    sx={{
                      mb: 2,
                      borderRadius: '16px',
                      border: '1px solid rgba(0,0,0,0.04)',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                    }}
                    variant="outlined"
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {m.model_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {m.description_ar || m.model_type} — v{m.version}
                          </Typography>
                        </Box>
                        <Chip
                          label={m.is_active ? 'نشط' : 'معطّل'}
                          color={m.is_active ? 'success' : 'default'}
                          size="small"
                          onClick={() => toggleModel(m._id, !m.is_active)}
                          clickable
                        />
                      </Box>
                      {m.accuracy_score && (
                        <Grid container spacing={1} mt={1}>
                          {[
                            { label: 'الدقة', value: fmtPct(m.accuracy_score) },
                            { label: 'آخر تقييم', value: fmt(m.last_evaluated_at) },
                            { label: 'بيانات التدريب', value: m.training_data_count || 0 },
                            {
                              label: 'التحديث التلقائي',
                              value: m.auto_retrain ? `✓ ${m.retrain_frequency || ''}` : '✗',
                            },
                          ].map(({ label, value }) => (
                            <Grid item xs={6} sm={3} key={label}>
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '10px', p: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {label}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {value}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Generate Report Modal */}
      <Dialog
        open={generateModal}
        onClose={() => setGenerateModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle>✨ توليد تقرير بالذكاء الاصطناعي</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>المستفيد</InputLabel>
              <Select
                value={generateForm.beneficiary_id}
                label="المستفيد"
                onChange={e => setGenerateForm(f => ({ ...f, beneficiary_id: e.target.value }))}
              >
                <MenuItem value="">اختر المستفيد...</MenuItem>
                {beneficiaries.map(b => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.name_ar}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="month"
              label="الشهر"
              value={generateForm.month}
              onChange={e => setGenerateForm(f => ({ ...f, month: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Box>
              <Typography variant="body2" mb={1}>
                اللغة:
              </Typography>
              <RadioGroup
                row
                value={generateForm.language}
                onChange={e => setGenerateForm(f => ({ ...f, language: e.target.value }))}
              >
                <FormControlLabel value="ar" control={<Radio />} label="عربي" />
                <FormControlLabel value="en" control={<Radio />} label="English" />
                <FormControlLabel value="both" control={<Radio />} label="كلاهما" />
              </RadioGroup>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={generateReport}
            disabled={!generateForm.beneficiary_id || !generateForm.month || generatingReport}
          >
            {generatingReport ? <CircularProgress size={18} color="inherit" /> : '✨ توليد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
