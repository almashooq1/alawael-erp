import { useState, useEffect, useCallback } from 'react';




import {
  analyticsApi,
  favoritesApi,
  collectionsApi,
  recentApi,
  retentionApi,
  dashboardApi,
} from '../../services/documentProPhase3Service';
import logger from '../../utils/logger';

/* ═══════════════════════════════════════════════════════
 *  TabPanel helper
 * ═══════════════════════════════════════════════════════ */
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

/* ═══════════════════════════════════════════════════════
 *  Stat Card
 * ═══════════════════════════════════════════════════════ */
function StatCard({ icon, title, value, color = 'primary.main', trend, sub }) {
  return (
    <Card sx={{ height: '100%', borderTop: `3px solid`, borderColor: color }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="start">
          <Box>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight={700}>{value ?? '—'}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 44, height: 44 }}>{icon}</Avatar>
        </Stack>
        {trend !== undefined && (
          <Stack direction="row" alignItems="center" mt={1} spacing={0.5}>
            {trend >= 0 ? (
              <ArrowUpward sx={{ fontSize: 14, color: 'success.main' }} />
            ) : (
              <ArrowDownward sx={{ fontSize: 14, color: 'error.main' }} />
            )}
            <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
              {Math.abs(trend)}%
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
 *  Main Component
 * ═══════════════════════════════════════════════════════ */
export default function DocumentsProPhase3() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [collections, setCollections] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [retentionStats, setRetentionStats] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [productivityData, setProductivityData] = useState(null);

  // Dialogs
  const [, setPolicyDialog] = useState(false);
  const [collectionDialog, setCollectionDialog] = useState(false);

  // ── Load dashboard data ────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getV3Dashboard();
      setDashboard(res.data?.dashboard ?? res.data);
    } catch (err) {
      logger.error('Dashboard load error', err);
      setError('فشل تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load analytics ────────────────────
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, storRes, prodRes] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getStorage(),
        analyticsApi.getProductivity(),
      ]);
      setAnalytics(dashRes.data?.analytics ?? dashRes.data);
      setStorageData(storRes.data?.analytics ?? storRes.data);
      setProductivityData(prodRes.data?.analytics ?? prodRes.data);
    } catch (err) {
      logger.error('Analytics error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load favorites tab ────────────────────
  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const [favRes, colRes, recRes] = await Promise.all([
        favoritesApi.getAll(),
        collectionsApi.getAll(),
        recentApi.get({ limit: 10 }),
      ]);
      setFavorites(favRes.data?.favorites ?? []);
      setCollections(colRes.data?.collections ?? []);
      setRecentDocs(recRes.data?.documents ?? []);
    } catch (err) {
      logger.error('Favorites error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load retention ────────────────────
  const loadRetention = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, statsRes] = await Promise.all([
        retentionApi.getPolicies(),
        retentionApi.getStats(),
      ]);
      setPolicies(polRes.data?.policies ?? []);
      setRetentionStats(statsRes.data?.stats ?? null);
    } catch (err) {
      logger.error('Retention error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // tab change triggers
  useEffect(() => {
    if (tab === 1) loadFavorites();
    if (tab === 2) loadRetention();
    if (tab === 3) loadAnalytics();
  }, [tab, loadFavorites, loadRetention, loadAnalytics]);

  /* ═══════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════ */
  return (
    <Box dir="rtl" sx={{ p: 3, fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            📑 إدارة المستندات المتقدمة — المرحلة الثالثة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            التعليقات • المشاركة • الاحتفاظ • المفضلة • التحليلات
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            if (tab === 0) loadDashboard();
            else if (tab === 1) loadFavorites();
            else if (tab === 2) loadRetention();
            else if (tab === 3) loadAnalytics();
          }}
        >
          تحديث
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<DashboardIcon />} label="نظرة عامة" />
          <Tab icon={<Badge badgeContent={favorites.length} color="secondary"><StarIcon /></Badge>} label="المفضلة" />
          <Tab icon={<PolicyIcon />} label="سياسات الاحتفاظ" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={tab} index={0}>
        {dashboard && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <StatCard icon={<DocIcon />} title="إجمالي المستندات" value={dashboard.analytics?.totalDocuments ?? 0} color="primary.main" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard icon={<FavoriteIcon />} title="المفضلة" value={dashboard.favorites?.totalFavorites ?? 0} color="error.main" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard icon={<PolicyIcon />} title="سياسات نشطة" value={dashboard.retention?.activePolicies ?? 0} color="warning.main" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard icon={<StorageIcon />} title="حجم التخزين" value={dashboard.analytics?.totalSize ? `${(dashboard.analytics.totalSize / 1024 / 1024).toFixed(1)} MB` : '—'} color="info.main" />
            </Grid>

            {/* Recent documents from dashboard */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>📄 المستندات الأخيرة</Typography>
                  {(dashboard.recentDocuments || []).length === 0 ? (
                    <Typography color="text.secondary">لا توجد مستندات حديثة</Typography>
                  ) : (
                    <List>
                      {dashboard.recentDocuments.map((doc, i) => (
                        <React.Fragment key={doc._id || i}>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.light' }}><DocIcon /></Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={doc.title || doc.name || 'مستند'}
                              secondary={doc.lastAccessedAt ? new Date(doc.lastAccessedAt).toLocaleString('ar-SA') : ''}
                            />
                          </ListItem>
                          {i < dashboard.recentDocuments.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        {!dashboard && !loading && (
          <Alert severity="info">اضغط تحديث لتحميل البيانات</Alert>
        )}
      </TabPanel>

      {/* ── Tab 1: Favorites & Collections ── */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          {/* Collections */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">📁 المجموعات</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setCollectionDialog(true)}>
                    إنشاء
                  </Button>
                </Stack>
                {collections.length === 0 ? (
                  <Typography color="text.secondary">لا توجد مجموعات بعد</Typography>
                ) : (
                  <List dense>
                    {collections.map((col) => (
                      <ListItem key={col._id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: col.color || '#1976d2' }}>
                            <CollectionsIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={col.name}
                          secondary={`${col.documents?.length || 0} مستند`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Favorites list */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>⭐ المفضلة</Typography>
                {favorites.length === 0 ? (
                  <Typography color="text.secondary">لا توجد مستندات مفضلة</Typography>
                ) : (
                  <List>
                    {favorites.map((fav, i) => (
                      <React.Fragment key={fav._id || i}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.light' }}>
                              <StarIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={fav.document?.title || fav.documentId || 'مستند'}
                            secondary={fav.note || new Date(fav.createdAt).toLocaleString('ar-SA')}
                          />
                        </ListItem>
                        {i < favorites.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent documents */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>🕐 المستندات الأخيرة</Typography>
                {recentDocs.length === 0 ? (
                  <Typography color="text.secondary">لا توجد مستندات حديثة</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {recentDocs.map((doc, i) => (
                      <Grid item xs={12} sm={6} md={4} key={doc._id || i}>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <HistoryIcon color="action" />
                              <Typography variant="subtitle2" noWrap>
                                {doc.document?.title || doc.documentId || 'مستند'}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {doc.lastAccessedAt ? new Date(doc.lastAccessedAt).toLocaleString('ar-SA') : ''}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Create Collection Dialog */}
        <CollectionDialog
          open={collectionDialog}
          onClose={() => setCollectionDialog(false)}
          onCreated={() => { setCollectionDialog(false); loadFavorites(); }}
        />
      </TabPanel>

      {/* ── Tab 2: Retention Policies ── */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          {/* Stats */}
          {retentionStats && (
            <>
              <Grid item xs={12} sm={4}>
                <StatCard icon={<PolicyIcon />} title="إجمالي السياسات" value={retentionStats.totalPolicies ?? 0} color="primary.main" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard icon={<GavelIcon />} title="تحت التعليق القانوني" value={retentionStats.legalHoldCount ?? 0} color="error.main" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard icon={<ScheduleIcon />} title="تنتهي قريباً" value={retentionStats.expiringCount ?? 0} color="warning.main" />
              </Grid>
            </>
          )}

          {/* Policies Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">📋 سياسات الاحتفاظ</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={() => setPolicyDialog(true)}>
                      سياسة جديدة
                    </Button>
                    <Button size="small" variant="outlined" onClick={async () => {
                      try {
                        await retentionApi.initialize();
                        loadRetention();
                      } catch (e) { logger.error(e); }
                    }}>
                      تهيئة افتراضية
                    </Button>
                  </Stack>
                </Stack>

                {policies.length === 0 ? (
                  <Alert severity="info">لا توجد سياسات. اضغط "تهيئة افتراضية" لإضافة سياسات جاهزة.</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right">الاسم</TableCell>
                          <TableCell align="right">التصنيف</TableCell>
                          <TableCell align="right">مدة الاحتفاظ</TableCell>
                          <TableCell align="right">الإجراء</TableCell>
                          <TableCell align="right">الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {policies.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell align="right">{p.name}</TableCell>
                            <TableCell align="right">
                              <Chip label={p.category || 'عام'} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              {p.retentionDays ? `${p.retentionDays} يوم` : '—'}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={
                                  { archive: 'أرشفة', delete: 'حذف', review: 'مراجعة', extend: 'تمديد', notify: 'إشعار' }[p.action] || p.action
                                }
                                color={p.action === 'delete' ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={p.isActive ? 'نشطة' : 'معطلة'}
                                color={p.isActive ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 3: Analytics ── */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          {analytics && (
            <>
              <Grid item xs={12} sm={3}>
                <StatCard icon={<DocIcon />} title="إجمالي المستندات" value={analytics.overview?.totalDocuments ?? 0} color="primary.main" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <StatCard icon={<ViewIcon />} title="المشاهدات (30 يوم)" value={analytics.activity?.views ?? 0} color="info.main" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <StatCard icon={<DownloadIcon />} title="التحميلات (30 يوم)" value={analytics.activity?.downloads ?? 0} color="success.main" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <StatCard icon={<ShareIcon />} title="المشاركات (30 يوم)" value={analytics.activity?.shares ?? 0} color="secondary.main" />
              </Grid>
            </>
          )}

          {/* Storage Analytics */}
          {storageData && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>💾 تحليل التخزين</Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">الحجم الكلي</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {storageData.totalSize ? `${(storageData.totalSize / 1024 / 1024).toFixed(2)} MB` : '—'}
                        </Typography>
                      </Stack>
                    </Box>
                    {(storageData.byType || []).map((item, i) => (
                      <Box key={i}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption">{item.type || item._id}</Typography>
                          <Typography variant="caption">{item.count} ملف</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={storageData.totalSize ? (item.totalSize / storageData.totalSize) * 100 : 0}
                          sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Productivity Analytics */}
          {productivityData && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>📈 الإنتاجية</Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">المستندات المنشأة</Typography>
                      <Typography variant="h5" fontWeight={600}>{productivityData.documentsCreated ?? 0}</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">المستندات المعدّلة</Typography>
                      <Typography variant="h5" fontWeight={600}>{productivityData.documentsEdited ?? 0}</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">معدل الإنتاجية اليومي</Typography>
                      <Typography variant="h5" fontWeight={600}>{productivityData.dailyAverage?.toFixed(1) ?? '—'}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Full report export */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">📊 التقرير الشامل</Typography>
                  <Button
                    variant="contained"
                    startIcon={<ChartIcon />}
                    onClick={async () => {
                      try {
                        const res = await analyticsApi.getFullReport({ days: 30 });
                        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        logger.error('Report export error', e);
                      }
                    }}
                  >
                    تصدير التقرير
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════
 *  Collection Dialog
 * ═══════════════════════════════════════════════════════ */
function CollectionDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await collectionsApi.create({ name, description });
      setName('');
      setDescription('');
      onCreated();
    } catch (e) {
      logger.error('Create collection error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>📁 إنشاء مجموعة جديدة</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="اسم المجموعة"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          fullWidth
          label="الوصف"
          multiline
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleCreate} disabled={saving || !name.trim()}>
          {saving ? <CircularProgress size={20} /> : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
