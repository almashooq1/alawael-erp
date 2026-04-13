import { useState, useEffect, useCallback } from 'react';



import { qrApi, calendarApi, comparisonApi, integrationsApi, dashboardApi, overviewApi } from '../../services/documentProPhase5Service';
import logger from '../../utils/logger';

function TabPanel({ children, value, index }) {
  return value === index ? <Box py={2}>{children}</Box> : null;
}

export default function DocumentsProPhase5() {
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [, setLoading] = useState(false);
  const [error] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await overviewApi.get();
      setOverview(res.data?.overview ?? null);
    } catch (err) {
      logger.error('Overview error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  return (
    <Box dir="rtl" p={3} sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            إدارة المستندات — المرحلة الخامسة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            أكواد QR والباركود • التقويم والمواعيد • المقارنة • التكاملات • لوحة التحكم
          </Typography>
        </Box>
        <IconButton onClick={loadOverview}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Quick Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#eef2ff', borderRight: '4px solid #6366f1' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">أكواد QR</Typography>
                  <Typography variant="h5" fontWeight={700} color="#6366f1">
                    {overview?.qrCodes?.total ?? '—'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#6366f1' }}><QrCodeIcon /></Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#fef3c7', borderRight: '4px solid #f59e0b' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">أحداث التقويم</Typography>
                  <Typography variant="h5" fontWeight={700} color="#f59e0b">
                    {overview?.calendar?.total ?? '—'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f59e0b' }}><CalendarIcon /></Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#dbeafe', borderRight: '4px solid #3b82f6' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">المقارنات</Typography>
                  <Typography variant="h5" fontWeight={700} color="#3b82f6">
                    {overview?.comparisons?.total ?? '—'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#3b82f6' }}><CompareIcon /></Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#fce7f3', borderRight: '4px solid #ec4899' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">التكاملات</Typography>
                  <Typography variant="h5" fontWeight={700} color="#ec4899">
                    {overview?.integrations?.total ?? '—'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ec4899' }}><IntegrationsIcon /></Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#d1fae5', borderRight: '4px solid #22c55e' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">الويدجت</Typography>
                  <Typography variant="h5" fontWeight={700} color="#22c55e">
                    {overview?.dashboard?.totalWidgets ?? '—'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#22c55e' }}><DashboardIcon /></Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<QrCodeIcon />} label="أكواد QR" iconPosition="start" />
          <Tab icon={<CalendarIcon />} label="التقويم" iconPosition="start" />
          <Tab icon={<CompareIcon />} label="المقارنة" iconPosition="start" />
          <Tab icon={<IntegrationsIcon />} label="التكاملات" iconPosition="start" />
          <Tab icon={<DashboardIcon />} label="لوحة التحكم" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab: QR Codes */}
      <TabPanel value={tab} index={0}>
        <QRCodesTab />
      </TabPanel>

      {/* Tab: Calendar */}
      <TabPanel value={tab} index={1}>
        <CalendarTab />
      </TabPanel>

      {/* Tab: Comparison */}
      <TabPanel value={tab} index={2}>
        <ComparisonTab />
      </TabPanel>

      {/* Tab: Integrations */}
      <TabPanel value={tab} index={3}>
        <IntegrationsTab />
      </TabPanel>

      {/* Tab: Dashboard */}
      <TabPanel value={tab} index={4}>
        <DashboardWidgetsTab />
      </TabPanel>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QR Codes Tab
   ═══════════════════════════════════════════════════════════════ */
function QRCodesTab() {
  const [stats, setStats] = useState(null);
  const [types, setTypes] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [printJobs, setPrintJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sr, tr, pr, jr] = await Promise.all([
          qrApi.getStats(), qrApi.getTypes(), qrApi.getPurposes(), qrApi.getPrintJobs(),
        ]);
        setStats(sr.data?.stats);
        setTypes(tr.data?.types ?? []);
        setPurposes(pr.data?.purposes ?? []);
        setPrintJobs(jr.data?.jobs ?? []);
      } catch (err) { logger.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />;

  return (
    <Grid container spacing={2}>
      {/* Types */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>📱 أنواع الأكواد المدعومة</Typography>
            <Stack spacing={1}>
              {types.map((t) => (
                <Stack key={t.key} direction="row" alignItems="center" spacing={1}>
                  <Typography>{t.icon}</Typography>
                  <Typography fontWeight={600}>{t.labelAr}</Typography>
                  <Chip label={stats?.byType?.[t.key] || 0} size="small" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Purposes */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>🎯 أغراض الاستخدام</Typography>
            <Stack spacing={1}>
              {purposes.map((p) => (
                <Stack key={p.key} direction="row" alignItems="center" spacing={1}>
                  <Typography>{p.icon}</Typography>
                  <Typography fontWeight={600}>{p.labelAr}</Typography>
                  <Chip label={stats?.byPurpose?.[p.key] || 0} size="small" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Print Jobs */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom><PrintIcon sx={{ mr: 1 }} />مهام الطباعة الأخيرة</Typography>
            {printJobs.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لا توجد مهام طباعة</Typography>
            ) : (
              <List dense>
                {printJobs.slice(0, 5).map((job) => (
                  <ListItem key={job._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: job.status === 'completed' ? '#d1fae5' : '#fef3c7' }}>
                        {job.status === 'completed' ? <CheckIcon color="success" /> : <TimeIcon color="warning" />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={job.name}
                      secondary={`${job.documentIds?.length} مستند • ${job.template} • ${job.status}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Calendar Tab
   ═══════════════════════════════════════════════════════════════ */
function CalendarTab() {
  const [deadlines, setDeadlines] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [types, setTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [dr, or, tr, sr] = await Promise.all([
          calendarApi.getDeadlines({ days: 14 }),
          calendarApi.getOverdue(),
          calendarApi.getTypes(),
          calendarApi.getStats(),
        ]);
        setDeadlines(dr.data?.deadlines ?? []);
        setOverdue(or.data?.overdue ?? []);
        setTypes(tr.data?.types ?? []);
        setStats(sr.data?.stats);
      } catch (err) { logger.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />;

  return (
    <Grid container spacing={2}>
      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <Grid item xs={12}>
          <Alert severity="error" icon={<WarningIcon />}>
            يوجد {overdue.length} حدث متأخر يحتاج إلى معالجة فورية!
          </Alert>
        </Grid>
      )}

      {/* Stats */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>📊 إحصائيات التقويم</Typography>
            <Stack spacing={1}>
              {Object.entries(stats?.byStatus || {}).map(([key, val]) => (
                <Stack key={key} direction="row" justifyContent="space-between">
                  <Typography>{key}</Typography>
                  <Chip label={val} size="small" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Event Types */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>📋 أنواع الأحداث</Typography>
            <Stack spacing={1}>
              {types.map((t) => (
                <Stack key={t.key} direction="row" alignItems="center" spacing={1}>
                  <Typography>{t.icon}</Typography>
                  <Typography>{t.labelAr}</Typography>
                  <Chip label={stats?.byType?.[t.key] || 0} size="small" sx={{ bgcolor: t.color + '20', color: t.color }} />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Upcoming Deadlines */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>⏰ المواعيد القادمة (14 يوم)</Typography>
            {deadlines.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لا توجد مواعيد قادمة</Typography>
            ) : (
              <List dense>
                {deadlines.slice(0, 8).map((d) => (
                  <ListItem key={d._id}>
                    <ListItemText
                      primary={d.titleAr || d.title}
                      secondary={new Date(d.startDate).toLocaleDateString('ar-SA')}
                    />
                    <Chip label={d.priority} size="small" color={d.priority === 'critical' ? 'error' : 'default'} />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Overdue Items */}
      {overdue.length > 0 && (
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ borderColor: '#ef4444' }}>
            <CardContent>
              <Typography variant="h6" color="error" gutterBottom>🔴 المتأخرة ({overdue.length})</Typography>
              <List dense>
                {overdue.map((o) => (
                  <ListItem key={o._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#fef2f2' }}><WarningIcon color="error" /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={o.titleAr || o.title}
                      secondary={`كان مستحقاً في ${new Date(o.startDate).toLocaleDateString('ar-SA')}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Comparison Tab
   ═══════════════════════════════════════════════════════════════ */
function ComparisonTab() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [hr, sr] = await Promise.all([
          comparisonApi.getHistory({ limit: 10 }),
          comparisonApi.getStats(),
        ]);
        setHistory(hr.data?.comparisons ?? []);
        setStats(sr.data?.stats);
      } catch (err) { logger.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />;

  return (
    <Grid container spacing={2}>
      {/* Stats */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>📊 إحصائيات المقارنة</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">إجمالي المقارنات</Typography>
                <Typography variant="h4" fontWeight={700}>{stats?.total ?? 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">متوسط التشابه</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4" fontWeight={700} color="primary">{stats?.averageSimilarity ?? 0}%</Typography>
                  <TrendIcon color="primary" />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* By Type */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>حسب النوع</Typography>
            {Object.entries(stats?.byType || {}).map(([type, data]) => (
              <Stack key={type} direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
                <Typography>{type}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`${data.count} مقارنة`} size="small" />
                  <Chip label={`${data.avgSimilarity}%`} size="small" color="primary" variant="outlined" />
                </Stack>
              </Stack>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent History */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>آخر المقارنات</Typography>
            {history.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لا توجد مقارنات</Typography>
            ) : (
              <List dense>
                {history.map((c) => (
                  <ListItem key={c._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#dbeafe' }}><CompareIcon color="primary" /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${c.sourceDocument?.title || '?'} ↔ ${c.targetDocument?.title || '?'}`}
                      secondary={`${c.result?.similarity?.toFixed(1) ?? '?'}% تشابه • ${c.result?.totalChanges ?? '?'} تغيير`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Integrations Tab
   ═══════════════════════════════════════════════════════════════ */
function IntegrationsTab() {
  const [integrations, setIntegrations] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ir, pr, sr] = await Promise.all([
          integrationsApi.getAll(), integrationsApi.getProviders(), integrationsApi.getStats(),
        ]);
        setIntegrations(ir.data?.integrations ?? []);
        setProviders(pr.data?.providers ?? []);
        setStats(sr.data?.stats);
      } catch (err) { logger.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = async (id) => {
    try {
      await integrationsApi.toggle(id);
      const res = await integrationsApi.getAll();
      setIntegrations(res.data?.integrations ?? []);
    } catch (err) { logger.error(err); }
  };

  const handleTest = async (id) => {
    try {
      await integrationsApi.test(id);
      const res = await integrationsApi.getAll();
      setIntegrations(res.data?.integrations ?? []);
    } catch (err) { logger.error(err); }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />;

  return (
    <Grid container spacing={2}>
      {/* Providers */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>🔌 مزودي التكامل</Typography>
            <Stack spacing={1}>
              {providers.map((p) => (
                <Stack key={p.key} direction="row" alignItems="center" spacing={1}>
                  <Typography fontSize={20}>{p.icon}</Typography>
                  <Typography fontWeight={600}>{p.nameAr}</Typography>
                  <Chip label={stats?.byType?.[p.key] || 0} size="small" variant="outlined" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Integrations */}
      <Grid item xs={12} md={8}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>التكاملات المُعدة ({integrations.length})</Typography>
            {integrations.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لا توجد تكاملات — أضف تكاملاً جديداً</Typography>
            ) : (
              <List>
                {integrations.map((intg) => (
                  <React.Fragment key={intg._id}>
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => handleTest(intg._id)}>اختبار</Button>
                          <Button size="small"
                            variant={intg.status === 'active' ? 'contained' : 'outlined'}
                            color={intg.status === 'active' ? 'success' : 'default'}
                            onClick={() => handleToggle(intg._id)}>
                            {intg.status === 'active' ? 'نشط' : 'معطل'}
                          </Button>
                        </Stack>
                      }
                    >
                      <ListItemAvatar>
                        <Badge
                          color={intg.status === 'active' ? 'success' : intg.status === 'error' ? 'error' : 'default'}
                          variant="dot" overlap="circular"
                        >
                          <Avatar sx={{ bgcolor: '#f1f5f9' }}>
                            <IntegrationsIcon />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={intg.nameAr || intg.name}
                        secondary={`${intg.type} • ${intg.provider} • ${intg.stats?.totalRuns || 0} تشغيل`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard Widgets Tab
   ═══════════════════════════════════════════════════════════════ */
function DashboardWidgetsTab() {
  const [widgets, setWidgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [wr, cr, lr, sr] = await Promise.all([
          dashboardApi.getWidgets(), dashboardApi.getCategories(),
          dashboardApi.getLayouts(), dashboardApi.getStats(),
        ]);
        setWidgets(wr.data?.widgets ?? []);
        setCategories(cr.data?.categories ?? []);
        setLayouts(lr.data?.layouts ?? []);
        setStats(sr.data?.stats);
      } catch (err) { logger.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto' }} />;

  return (
    <Grid container spacing={2}>
      {/* Stats */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>📊 إحصائيات اللوحة</Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography>إجمالي الويدجت</Typography>
                <Chip label={stats?.totalWidgets ?? 0} color="primary" size="small" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography>التخطيطات</Typography>
                <Chip label={stats?.totalLayouts ?? 0} size="small" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography>متوسط الويدجات/تخطيط</Typography>
                <Chip label={stats?.avgWidgetsPerLayout ?? 0} size="small" variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>التصنيفات</Typography>
            <Stack spacing={1}>
              {categories.map((c) => (
                <Stack key={c.key} direction="row" alignItems="center" spacing={1}>
                  <Typography>{c.icon}</Typography>
                  <Typography>{c.labelAr}</Typography>
                  <Chip label={widgets.filter((w) => w.category === c.key).length} size="small" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Available Widgets */}
      <Grid item xs={12} md={8}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>🧩 الويدجات المتاحة ({widgets.length})</Typography>
            <Grid container spacing={1}>
              {widgets.map((w) => (
                <Grid item xs={12} sm={6} md={4} key={w.key}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography fontSize={24}>{w.icon}</Typography>
                    <Typography variant="body2" fontWeight={700}>{w.nameAr || w.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{w.descriptionAr}</Typography>
                    <Stack direction="row" justifyContent="center" spacing={0.5} mt={0.5}>
                      <Chip label={`${w.defaultSize?.cols ?? 3}×${w.defaultSize?.rows ?? 2}`} size="small" variant="outlined" />
                      <Chip label={w.type} size="small" color="primary" variant="outlined" />
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* User Layouts */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>📐 تخطيطاتك ({layouts.length})</Typography>
            {layouts.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>
                لم يتم إنشاء تخطيطات بعد — سيتم إنشاء التخطيط الافتراضي تلقائياً
              </Typography>
            ) : (
              <Grid container spacing={1}>
                {layouts.map((l) => (
                  <Grid item xs={12} sm={6} md={4} key={l._id}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700}>{l.nameAr || l.name}</Typography>
                        {l.isDefault && <Chip label="افتراضي" size="small" color="primary" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {l.widgets?.length ?? 0} عنصر • {l.theme || 'light'} • {l.columns || 12} عمود
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
