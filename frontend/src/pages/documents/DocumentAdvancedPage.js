/**
 * Document Advanced Page — صفحة المستندات المتقدمة
 *
 * A full-featured page with 10 tabs covering all advanced document services:
 * Overview, Favorites, Audit, Watermarks, Approvals, Expiry,
 * Trash, Annotations, Comparison, Export/Import, QR Codes
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Paper,} from '@mui/material';




import documentAdvancedService from '../../services/documentAdvancedService';

// ── Tab Panel ────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index, ...props }) {
  return (
    <Box role="tabpanel" hidden={value !== index} {...props}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  Main Page Component
// ══════════════════════════════════════════════════════════════════════════════
export default function DocumentAdvancedPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [overview, setOverview] = useState(null);

  const showMsg = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await documentAdvancedService.getOverview();
      if (res.success) setOverview(res.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const tabLabels = [
    { label: 'نظرة عامة', icon: <DashboardIcon /> },
    { label: 'المفضلة', icon: <StarIcon /> },
    { label: 'سجل التدقيق', icon: <HistoryIcon /> },
    { label: 'العلامات المائية', icon: <WatermarkIcon /> },
    { label: 'الموافقات', icon: <ApprovalIcon /> },
    { label: 'الصلاحية', icon: <TimerIcon /> },
    { label: 'سلة المحذوفات', icon: <DeleteIcon /> },
    { label: 'التعليقات', icon: <CommentIcon /> },
    { label: 'المقارنة', icon: <CompareIcon /> },
    { label: 'التصدير/الاستيراد', icon: <ExportIcon /> },
    { label: 'رموز QR', icon: <QrCodeIcon /> },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Page Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              إدارة المستندات المتقدمة
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
              المفضلة • التدقيق • العلامات المائية • الموافقات • الصلاحية • سلة المحذوفات •
              التعليقات • المقارنة • التصدير • QR
            </Typography>
          </Box>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={loadOverview} sx={{ color: '#fff' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_e, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { minHeight: 64, fontWeight: 'bold' },
          }}
        >
          {tabLabels.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabIndex} index={0}>
        <OverviewTab overview={overview} loading={loading} />
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <FavoritesTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={2}>
        <AuditTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={3}>
        <WatermarksTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={4}>
        <ApprovalsTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={5}>
        <ExpiryTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={6}>
        <TrashTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={7}>
        <AnnotationsTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={8}>
        <ComparisonTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={9}>
        <ExportImportTab showMsg={showMsg} />
      </TabPanel>
      <TabPanel value={tabIndex} index={10}>
        <QRCodesTab showMsg={showMsg} />
      </TabPanel>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  0. OVERVIEW TAB — نظرة عامة
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ overview, loading }) {
  if (loading) return <CircularProgress />;
  if (!overview) return <Alert severity="info">لا توجد بيانات بعد</Alert>;

  const cards = [
    {
      title: 'المفضلة',
      icon: <StarIcon />,
      color: '#FF9800',
      count: overview.favorites?.totalFavorites || 0,
      sub: `${overview.favorites?.totalCollections || 0} مجموعة`,
    },
    {
      title: 'أحداث التدقيق',
      icon: <HistoryIcon />,
      color: '#2196F3',
      count: overview.audit?.totalEvents || 0,
      sub: 'إجمالي الأحداث',
    },
    {
      title: 'الموافقات',
      icon: <ApprovalIcon />,
      color: '#4CAF50',
      count: overview.approvals?.totalWorkflows || 0,
      sub: `${overview.approvals?.byStatus?.pending || 0} معلقة`,
    },
    {
      title: 'منتهية الصلاحية',
      icon: <TimerIcon />,
      color: '#F44336',
      count: overview.expiry?.expired || 0,
      sub: `${overview.expiry?.expiringSoon || 0} ستنتهي قريباً`,
    },
    {
      title: 'سلة المحذوفات',
      icon: <DeleteIcon />,
      color: '#9C27B0',
      count: overview.trash?.totalItems || 0,
      sub: overview.trash?.totalSize || '0 KB',
    },
    {
      title: 'رموز QR',
      icon: <QrCodeIcon />,
      color: '#00BCD4',
      count: overview.qr?.totalQRCodes || 0,
      sub: `${overview.qr?.totalScans || 0} عملية مسح`,
    },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card, i) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
          <Card sx={{ borderTop: `4px solid ${card.color}`, height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
              <Typography variant="h4" fontWeight="bold">
                {card.count}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.sub}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  1. FAVORITES TAB — المفضلة
// ══════════════════════════════════════════════════════════════════════════════
function FavoritesTab({ showMsg }) {
  const [favorites, setFavorites] = useState([]);
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    color: '#2196F3',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [favRes, colRes, statsRes] = await Promise.all([
        documentAdvancedService.favorites.list(),
        documentAdvancedService.favorites.getCollections(),
        documentAdvancedService.favorites.stats(),
      ]);
      if (favRes.success) setFavorites(favRes.data || []);
      if (colRes.success) setCollections(colRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateCollection = async () => {
    try {
      const res = await documentAdvancedService.favorites.createCollection(newCollection);
      if (res.success) {
        showMsg('تم إنشاء المجموعة بنجاح');
        setDialogOpen(false);
        setNewCollection({ name: '', description: '', color: '#2196F3' });
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleRemoveFavorite = async documentId => {
    try {
      const res = await documentAdvancedService.favorites.toggle(documentId);
      if (res.success) {
        showMsg('تم إزالة المفضلة');
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  {stats.totalFavorites || 0}
                </Typography>
                <Typography variant="body2">إجمالي المفضلة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  {stats.totalCollections || 0}
                </Typography>
                <Typography variant="body2">المجموعات</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  {stats.byPriority?.high || 0}
                </Typography>
                <Typography variant="body2">أولوية عالية</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  {stats.byPriority?.urgent || 0}
                </Typography>
                <Typography variant="body2">عاجل</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Collections */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">المجموعات</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
          مجموعة جديدة
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {collections.map(col => (
          <Grid item xs={12} sm={6} md={4} key={col.id}>
            <Card sx={{ borderRight: `4px solid ${col.color || '#2196F3'}` }}>
              <CardContent>
                <Typography variant="h6">{col.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {col.description}
                </Typography>
                <Chip label={`${col.documentIds?.length || 0} مستند`} size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
        {collections.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">لا توجد مجموعات بعد. أنشئ مجموعتك الأولى!</Alert>
          </Grid>
        )}
      </Grid>

      {/* Favorites List */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        المستندات المفضلة
      </Typography>
      <List>
        {favorites.map(fav => (
          <ListItem key={fav.id} divider>
            <ListItemIcon>
              <StarIcon sx={{ color: '#FF9800' }} />
            </ListItemIcon>
            <ListItemText
              primary={fav.documentId}
              secondary={
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={fav.priority || 'normal'} size="small" />
                  {fav.tags?.map((t, i) => (
                    <Chip key={i} label={t} size="small" variant="outlined" />
                  ))}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title="إزالة من المفضلة">
                <IconButton onClick={() => handleRemoveFavorite(fav.documentId)}>
                  <StarBorderIcon />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {favorites.length === 0 && <Alert severity="info">لا توجد مستندات مفضلة بعد</Alert>}
      </List>

      {/* Create Collection Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            label="اسم المجموعة"
            fullWidth
            margin="normal"
            value={newCollection.name}
            onChange={e => setNewCollection(c => ({ ...c, name: e.target.value }))}
          />
          <TextField
            label="الوصف"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value={newCollection.description}
            onChange={e => setNewCollection(c => ({ ...c, description: e.target.value }))}
          />
          <TextField
            label="اللون"
            type="color"
            fullWidth
            margin="normal"
            value={newCollection.color}
            onChange={e => setNewCollection(c => ({ ...c, color: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateCollection}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. AUDIT TAB — سجل التدقيق
// ══════════════════════════════════════════════════════════════════════════════
function AuditTab({ showMsg }) {
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ days: '30' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [actRes, statsRes] = await Promise.all([
        documentAdvancedService.audit.getUserActivity({ days: filter.days }),
        documentAdvancedService.audit.stats({ days: filter.days }),
      ]);
      if (actRes.success) setActivity(actRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const severityColor = sev => {
    switch (sev) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الفترة</InputLabel>
          <Select
            value={filter.days}
            label="الفترة"
            onChange={e => setFilter(f => ({ ...f, days: e.target.value }))}
          >
            <MenuItem value="7">آخر 7 أيام</MenuItem>
            <MenuItem value="30">آخر 30 يوم</MenuItem>
            <MenuItem value="90">آخر 90 يوم</MenuItem>
            <MenuItem value="365">آخر سنة</MenuItem>
          </Select>
        </FormControl>
        <Button startIcon={<RefreshIcon />} onClick={load}>
          تحديث
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={async () => {
            try {
              const res = await documentAdvancedService.audit.exportTrail({
                days: filter.days,
                format: 'csv',
              });
              if (res.success) showMsg('تم تصدير سجل التدقيق');
            } catch (err) {
              showMsg(err.message, 'error');
            }
          }}
        >
          تصدير
        </Button>
        <Button
          startIcon={<VerifiedIcon />}
          variant="outlined"
          color="success"
          onClick={async () => {
            try {
              const res = await documentAdvancedService.audit.verifyChain();
              showMsg(
                res.data?.valid ? 'سلسلة التدقيق سليمة' : 'تم اكتشاف تلاعب!',
                res.data?.valid ? 'success' : 'error'
              );
            } catch (err) {
              showMsg(err.message, 'error');
            }
          }}
        >
          التحقق من السلامة
        </Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  {stats.totalEvents || 0}
                </Typography>
                <Typography variant="body2">إجمالي الأحداث</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  {stats.uniqueUsers || 0}
                </Typography>
                <Typography variant="body2">مستخدمين</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="error">
                  {stats.bySeverity?.critical || 0}
                </Typography>
                <Typography variant="body2">أحداث حرجة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {stats.bySeverity?.high || 0}
                </Typography>
                <Typography variant="body2">أولوية عالية</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Activity List */}
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>النوع</TableCell>
                <TableCell>المستند</TableCell>
                <TableCell>المستخدم</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>التفاصيل</TableCell>
                <TableCell>التاريخ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activity.map(evt => (
                <TableRow key={evt.id}>
                  <TableCell>
                    <Chip label={evt.eventType} size="small" />
                  </TableCell>
                  <TableCell>{evt.documentId || '—'}</TableCell>
                  <TableCell>{evt.userName || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={evt.severity || 'low'}
                      size="small"
                      color={severityColor(evt.severity)}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {evt.details || '—'}
                  </TableCell>
                  <TableCell dir="ltr">
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleString('ar-SA') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {activity.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">لا توجد أحداث في هذه الفترة</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. WATERMARKS TAB — العلامات المائية
// ══════════════════════════════════════════════════════════════════════════════
function WatermarksTab({ showMsg }) {
  const [presets, setPresets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyForm, setApplyForm] = useState({
    documentId: '',
    preset: 'CONFIDENTIAL',
    opacity: 0.15,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [presetsRes, templatesRes] = await Promise.all([
        documentAdvancedService.watermarks.getPresets(),
        documentAdvancedService.watermarks.getTemplates(),
      ]);
      if (presetsRes.success) setPresets(presetsRes.data || []);
      if (templatesRes.success) setTemplates(templatesRes.data || []);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = async () => {
    try {
      const res = await documentAdvancedService.watermarks.apply(applyForm.documentId, {
        preset: applyForm.preset,
        opacity: applyForm.opacity,
      });
      if (res.success) {
        showMsg('تم تطبيق العلامة المائية بنجاح');
        setApplyDialog(false);
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">العلامات المائية</Typography>
        <Button
          startIcon={<WatermarkIcon />}
          variant="contained"
          onClick={() => setApplyDialog(true)}
        >
          تطبيق علامة مائية
        </Button>
      </Box>

      {/* Presets Grid */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        القوالب الجاهزة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          presets.map((preset, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <Card
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  '&:hover': { borderColor: preset.color || '#2196F3' },
                }}
                onClick={() => {
                  setApplyForm(f => ({ ...f, preset: preset.name || preset.id }));
                  setApplyDialog(true);
                }}
              >
                <WatermarkIcon sx={{ fontSize: 40, color: preset.color || '#999', mb: 1 }} />
                <Typography variant="subtitle2" fontWeight="bold">
                  {preset.textAr || preset.text || preset.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {preset.text}
                </Typography>
              </Card>
            </Grid>
          ))
        )}
        {!loading && presets.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">لا توجد قوالب علامات مائية</Alert>
          </Grid>
        )}
      </Grid>

      {/* Custom Templates */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        القوالب المخصصة
      </Typography>
      <Grid container spacing={2}>
        {templates.map((t, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Typography fontWeight="bold">{t.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  النص: {t.text} | الشفافية: {(t.opacity || 0.15) * 100}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {templates.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">لا توجد قوالب مخصصة بعد</Alert>
          </Grid>
        )}
      </Grid>

      {/* Apply Dialog */}
      <Dialog open={applyDialog} onClose={() => setApplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تطبيق علامة مائية</DialogTitle>
        <DialogContent>
          <TextField
            label="معرّف المستند"
            fullWidth
            margin="normal"
            value={applyForm.documentId}
            onChange={e => setApplyForm(f => ({ ...f, documentId: e.target.value }))}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>القالب</InputLabel>
            <Select
              value={applyForm.preset}
              label="القالب"
              onChange={e => setApplyForm(f => ({ ...f, preset: e.target.value }))}
            >
              <MenuItem value="CONFIDENTIAL">سري — CONFIDENTIAL</MenuItem>
              <MenuItem value="DRAFT">مسودة — DRAFT</MenuItem>
              <MenuItem value="INTERNAL">داخلي — INTERNAL</MenuItem>
              <MenuItem value="COPY">نسخة — COPY</MenuItem>
              <MenuItem value="ARCHIVED">مؤرشف — ARCHIVED</MenuItem>
              <MenuItem value="APPROVED">معتمد — APPROVED</MenuItem>
              <MenuItem value="SAMPLE">عينة — SAMPLE</MenuItem>
              <MenuItem value="VOID">ملغي — VOID</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="الشفافية (0-1)"
            type="number"
            fullWidth
            margin="normal"
            inputProps={{ min: 0, max: 1, step: 0.05 }}
            value={applyForm.opacity}
            onChange={e => setApplyForm(f => ({ ...f, opacity: parseFloat(e.target.value) }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleApply}>
            تطبيق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  4. APPROVALS TAB — الموافقات
// ══════════════════════════════════════════════════════════════════════════════
function ApprovalsTab({ showMsg }) {
  const [pending, setPending] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ documentId: '', template: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingRes, templatesRes, statsRes] = await Promise.all([
        documentAdvancedService.approvals.getPending(),
        documentAdvancedService.approvals.getTemplates(),
        documentAdvancedService.approvals.stats(),
      ]);
      if (pendingRes.success) setPending(pendingRes.data || []);
      if (templatesRes.success) setTemplates(templatesRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecision = async (workflowId, decision) => {
    try {
      const res = await documentAdvancedService.approvals.decide(workflowId, { decision });
      if (res.success) {
        showMsg(decision === 'approved' ? 'تمت الموافقة' : 'تم الرفض');
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleCreate = async () => {
    try {
      const res = await documentAdvancedService.approvals.create(
        createForm.documentId,
        createForm.template
      );
      if (res.success) {
        showMsg('تم إنشاء سير العمل بنجاح');
        setCreateDialog(false);
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  return (
    <Box>
      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'معلقة', val: stats.byStatus?.pending || 0, color: '#FF9800' },
            { label: 'معتمدة', val: stats.byStatus?.approved || 0, color: '#4CAF50' },
            { label: 'مرفوضة', val: stats.byStatus?.rejected || 0, color: '#F44336' },
            { label: 'إجمالي', val: stats.totalWorkflows || 0, color: '#2196F3' },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                    {s.val}
                  </Typography>
                  <Typography>{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">الموافقات المعلقة ({pending.length})</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateDialog(true)}>
          سير عمل جديد
        </Button>
      </Box>

      {/* Pending List */}
      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {pending.map(wf => (
            <Paper key={wf.id} sx={{ mb: 2, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography fontWeight="bold">المستند: {wf.documentId}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    النوع: {wf.type} | المرحلة: {wf.currentStepIndex + 1}/{wf.steps?.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الإنشاء: {new Date(wf.createdAt).toLocaleString('ar-SA')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => handleDecision(wf.id, 'approved')}
                  >
                    موافقة
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<CancelIcon />}
                    onClick={() => handleDecision(wf.id, 'rejected')}
                  >
                    رفض
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {pending.length === 0 && <Alert severity="info">لا توجد موافقات معلقة</Alert>}
        </List>
      )}

      {/* Templates */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
        قوالب سير العمل
      </Typography>
      <Grid container spacing={2}>
        {templates.map((t, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Typography fontWeight="bold">{t.nameAr || t.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.description}
                </Typography>
                <Chip label={t.type} size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء سير عمل موافقة</DialogTitle>
        <DialogContent>
          <TextField
            label="معرّف المستند"
            fullWidth
            margin="normal"
            value={createForm.documentId}
            onChange={e => setCreateForm(f => ({ ...f, documentId: e.target.value }))}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>القالب</InputLabel>
            <Select
              value={createForm.template}
              label="القالب"
              onChange={e => setCreateForm(f => ({ ...f, template: e.target.value }))}
            >
              {templates.map((t, i) => (
                <MenuItem key={i} value={t.name || t.id}>
                  {t.nameAr || t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  5. EXPIRY TAB — الصلاحية والاحتفاظ
// ══════════════════════════════════════════════════════════════════════════════
function ExpiryTab({ showMsg }) {
  const [upcoming, setUpcoming] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [upRes, polRes, alertRes, statsRes] = await Promise.all([
        documentAdvancedService.expiry.getUpcoming(days),
        documentAdvancedService.expiry.getPolicies(),
        documentAdvancedService.expiry.getAlerts(),
        documentAdvancedService.expiry.stats(),
      ]);
      if (upRes.success) setUpcoming(upRes.data || []);
      if (polRes.success) setPolicies(polRes.data || []);
      if (alertRes.success) setAlerts(alertRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg, days]);

  useEffect(() => {
    load();
  }, [load]);

  const alertIcon = level => {
    switch (level) {
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'urgent':
        return <WarningIcon sx={{ color: '#FF9800' }} />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  return (
    <Box>
      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderTop: '4px solid #F44336' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="error">
                  {stats.expired || 0}
                </Typography>
                <Typography>منتهية الصلاحية</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderTop: '4px solid #FF9800' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.expiringSoon || 0}
                </Typography>
                <Typography>ستنتهي قريباً</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderTop: '4px solid #4CAF50' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.active || 0}
                </Typography>
                <Typography>نشطة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderTop: '4px solid #2196F3' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalTracked || 0}
                </Typography>
                <Typography>إجمالي المتابعة</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            التنبيهات
          </Typography>
          {alerts.slice(0, 5).map((alert, i) => (
            <Alert
              key={i}
              severity={
                alert.level === 'expired' ? 'error' : alert.level === 'urgent' ? 'warning' : 'info'
              }
              icon={alertIcon(alert.level)}
              sx={{ mb: 1 }}
            >
              {alert.message || `المستند ${alert.documentId} — ${alert.level}`}
            </Alert>
          ))}
        </Box>
      )}

      {/* Upcoming Expiry */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">المستندات المنتهية خلال</Typography>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select value={days} onChange={e => setDays(e.target.value)}>
            <MenuItem value={7}>7 أيام</MenuItem>
            <MenuItem value={30}>30 يوم</MenuItem>
            <MenuItem value={60}>60 يوم</MenuItem>
            <MenuItem value={90}>90 يوم</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {upcoming.map(doc => (
            <ListItem key={doc.documentId} divider>
              <ListItemIcon>
                <ScheduleIcon color={doc.alertLevel === 'expired' ? 'error' : 'warning'} />
              </ListItemIcon>
              <ListItemText
                primary={doc.documentId}
                secondary={`تنتهي في: ${new Date(doc.expiresAt).toLocaleDateString('ar-SA')} | ${doc.daysRemaining} يوم متبقي`}
              />
              <ListItemSecondaryAction>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const res = await documentAdvancedService.expiry.renew(doc.documentId);
                      if (res.success) {
                        showMsg('تم التجديد بنجاح');
                        load();
                      }
                    } catch (err) {
                      showMsg(err.message, 'error');
                    }
                  }}
                >
                  تجديد
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {upcoming.length === 0 && (
            <Alert severity="success">لا توجد مستندات ستنتهي صلاحيتها قريباً</Alert>
          )}
        </List>
      )}

      {/* Retention Policies */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
        سياسات الاحتفاظ
      </Typography>
      <Grid container spacing={2}>
        {policies.map((p, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Typography fontWeight="bold">{p.nameAr || p.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.description}
                </Typography>
                <Chip
                  label={`${p.retentionDays || p.retentionYears * 365} يوم`}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  6. TRASH TAB — سلة المحذوفات
// ══════════════════════════════════════════════════════════════════════════════
function TrashTab({ showMsg }) {
  const [trashItems, setTrashItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        documentAdvancedService.trash.list(),
        documentAdvancedService.trash.stats(),
      ]);
      if (listRes.success) setTrashItems(listRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async docId => {
    try {
      const res = await documentAdvancedService.trash.restore(docId);
      if (res.success) {
        showMsg('تم الاستعادة بنجاح');
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handlePermanentDelete = async docId => {
    if (!window.confirm('هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء!')) return;
    try {
      const res = await documentAdvancedService.trash.permanentDelete(docId, `DELETE-${docId}`);
      if (res.success) {
        showMsg('تم الحذف نهائياً');
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleBulkRestore = async () => {
    if (selected.length === 0) return;
    try {
      const res = await documentAdvancedService.trash.bulkRestore(selected);
      if (res.success) {
        showMsg(`تم استعادة ${selected.length} مستند`);
        setSelected([]);
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('سيتم حذف جميع العناصر نهائياً! هل تريد المتابعة؟')) return;
    try {
      const res = await documentAdvancedService.trash.empty();
      if (res.success) {
        showMsg('تم إفراغ سلة المحذوفات');
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  return (
    <Box>
      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalItems || 0}
                </Typography>
                <Typography>عناصر في السلة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalSize || '0 KB'}
                </Typography>
                <Typography>الحجم المستخدم</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.oldestDays || 0}
                </Typography>
                <Typography>أقدم عنصر (يوم)</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          startIcon={<RestoreIcon />}
          variant="contained"
          disabled={selected.length === 0}
          onClick={handleBulkRestore}
        >
          استعادة المحدد ({selected.length})
        </Button>
        <Button
          startIcon={<PermanentDeleteIcon />}
          variant="outlined"
          color="error"
          onClick={handleEmptyTrash}
          disabled={trashItems.length === 0}
        >
          إفراغ السلة
        </Button>
        <Button startIcon={<RefreshIcon />} onClick={load}>
          تحديث
        </Button>
      </Box>

      {/* Trash List */}
      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {trashItems.map(item => (
            <Paper key={item.documentId} sx={{ mb: 1, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.documentId)}
                    onChange={() =>
                      setSelected(s =>
                        s.includes(item.documentId)
                          ? s.filter(id => id !== item.documentId)
                          : [...s, item.documentId]
                      )
                    }
                  />
                  <Box>
                    <Typography fontWeight="bold">{item.documentId}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      حُذف بواسطة: {item.deletedByName || '—'} |{' '}
                      {new Date(item.deletedAt).toLocaleString('ar-SA')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      السبب: {item.reason || 'غير محدد'} | الحذف التلقائي:{' '}
                      {item.autoPurgeAt
                        ? new Date(item.autoPurgeAt).toLocaleDateString('ar-SA')
                        : '—'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="استعادة">
                    <IconButton color="primary" onClick={() => handleRestore(item.documentId)}>
                      <RestoreIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف نهائي">
                    <IconButton
                      color="error"
                      onClick={() => handlePermanentDelete(item.documentId)}
                    >
                      <PermanentDeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))}
          {trashItems.length === 0 && <Alert severity="success">سلة المحذوفات فارغة</Alert>}
        </List>
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  7. ANNOTATIONS TAB — التعليقات التوضيحية
// ══════════════════════════════════════════════════════════════════════════════
function AnnotationsTab({ showMsg }) {
  const [documentId, setDocumentId] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    type: 'note',
    text: '',
    color: '#FFEB3B',
    page: 1,
  });

  const loadStamps = useCallback(async () => {
    try {
      const res = await documentAdvancedService.annotations.getStamps();
      if (res.success) setStamps(res.data || []);
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStamps();
  }, [loadStamps]);

  const loadAnnotations = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const res = await documentAdvancedService.annotations.getAll(documentId);
      if (res.success) setAnnotations(res.data || []);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const res = await documentAdvancedService.annotations.add(documentId, newAnnotation);
      if (res.success) {
        showMsg('تمت إضافة التعليق التوضيحي');
        setAddDialog(false);
        loadAnnotations();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDelete = async id => {
    try {
      const res = await documentAdvancedService.annotations.remove(id);
      if (res.success) {
        showMsg('تم حذف التعليق');
        loadAnnotations();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleResolve = async id => {
    try {
      const res = await documentAdvancedService.annotations.resolve(id);
      if (res.success) {
        showMsg('تم حل التعليق');
        loadAnnotations();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const typeLabels = {
    highlight: 'تمييز',
    underline: 'تسطير',
    strikethrough: 'شطب',
    note: 'ملاحظة',
    bookmark: 'إشارة مرجعية',
    drawing: 'رسم',
    stamp: 'ختم',
    textbox: 'مربع نص',
  };

  return (
    <Box>
      {/* Search */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="معرّف المستند"
          size="small"
          value={documentId}
          onChange={e => setDocumentId(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button variant="contained" onClick={loadAnnotations} disabled={!documentId}>
          عرض التعليقات
        </Button>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => setAddDialog(true)}
          disabled={!documentId}
        >
          إضافة
        </Button>
      </Box>

      {/* Stamps */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
        الأختام المتاحة
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {stamps.map((s, i) => (
          <Chip
            key={i}
            icon={<BookmarkIcon />}
            label={s.labelAr || s.label || s.type}
            sx={{ backgroundColor: s.color, color: '#fff' }}
          />
        ))}
      </Box>

      {/* Annotations List */}
      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {annotations.map(ann => (
            <Paper
              key={ann.id}
              sx={{ mb: 2, p: 2, borderRight: `4px solid ${ann.color || '#2196F3'}` }}
            >
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip label={typeLabels[ann.type] || ann.type} size="small" />
                    <Chip label={`صفحة ${ann.page || 1}`} size="small" variant="outlined" />
                    {ann.resolved && <Chip label="تم الحل" size="small" color="success" />}
                  </Box>
                  <Typography>{ann.text || ann.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ann.userName} —{' '}
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleString('ar-SA') : ''}
                  </Typography>

                  {/* Comments */}
                  {ann.comments?.length > 0 && (
                    <Box sx={{ mt: 1, pr: 2, borderRight: '2px solid #eee' }}>
                      {ann.comments.map((c, ci) => (
                        <Box key={ci} sx={{ mb: 0.5 }}>
                          <Typography variant="body2">
                            <strong>{c.userName}:</strong> {c.text}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!ann.resolved && (
                    <Tooltip title="حل">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleResolve(ann.id)}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => handleDelete(ann.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))}
          {annotations.length === 0 && documentId && !loading && (
            <Alert severity="info">لا توجد تعليقات توضيحية لهذا المستند</Alert>
          )}
        </List>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة تعليق توضيحي</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>النوع</InputLabel>
            <Select
              value={newAnnotation.type}
              label="النوع"
              onChange={e => setNewAnnotation(a => ({ ...a, type: e.target.value }))}
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="النص"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={newAnnotation.text}
            onChange={e => setNewAnnotation(a => ({ ...a, text: e.target.value }))}
          />
          <TextField
            label="اللون"
            type="color"
            fullWidth
            margin="normal"
            value={newAnnotation.color}
            onChange={e => setNewAnnotation(a => ({ ...a, color: e.target.value }))}
          />
          <TextField
            label="رقم الصفحة"
            type="number"
            fullWidth
            margin="normal"
            value={newAnnotation.page}
            onChange={e => setNewAnnotation(a => ({ ...a, page: parseInt(e.target.value) }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAdd}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  8. COMPARISON TAB — المقارنة
// ══════════════════════════════════════════════════════════════════════════════
function ComparisonTab({ showMsg }) {
  const [form, setForm] = useState({ docA: '', docB: '', type: 'documents' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await documentAdvancedService.comparison.getHistory();
      if (res.success) setHistory(res.data || []);
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleCompare = async () => {
    if (!form.docA || !form.docB) {
      showMsg('يرجى إدخال معرّفي المستندين', 'warning');
      return;
    }
    try {
      setLoading(true);
      let res;
      if (form.type === 'documents') {
        res = await documentAdvancedService.comparison.compare(form.docA, form.docB);
      } else {
        res = await documentAdvancedService.comparison.compareMetadata(form.docA, form.docB);
      }
      if (res.success) {
        setResult(res.data);
        showMsg('تمت المقارنة بنجاح');
      }
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Compare Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          مقارنة المستندات
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={5}>
            <TextField
              label="المستند الأول (A)"
              fullWidth
              value={form.docA}
              onChange={e => setForm(f => ({ ...f, docA: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              label="المستند الثاني (B)"
              fullWidth
              value={form.docB}
              onChange={e => setForm(f => ({ ...f, docB: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={form.type}
                label="النوع"
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <MenuItem value="documents">محتوى</MenuItem>
                <MenuItem value="metadata">بيانات وصفية</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Button
          variant="contained"
          startIcon={<CompareIcon />}
          sx={{ mt: 2 }}
          onClick={handleCompare}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'مقارنة'}
        </Button>
      </Paper>

      {/* Results */}
      {result && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            النتائج
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {result.similarity || 0}%
                  </Typography>
                  <Typography>نسبة التشابه</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {result.totalChanges || 0}
                  </Typography>
                  <Typography>إجمالي التغييرات</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {result.identical ? 'نعم' : 'لا'}
                  </Typography>
                  <Typography>متطابق؟</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Diff details */}
          {result.changes && (
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 13,
                p: 2,
                bgcolor: '#f5f5f5',
                borderRadius: 1,
              }}
            >
              {result.changes.map((ch, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 0.5,
                    bgcolor:
                      ch.type === 'added'
                        ? '#e8f5e9'
                        : ch.type === 'removed'
                          ? '#ffebee'
                          : 'transparent',
                    borderRight:
                      ch.type === 'added'
                        ? '3px solid #4CAF50'
                        : ch.type === 'removed'
                          ? '3px solid #F44336'
                          : 'none',
                  }}
                >
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {ch.type === 'added' ? '+ ' : ch.type === 'removed' ? '- ' : '  '}
                    {ch.value || ch.line || ch.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* History */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        سجل المقارنات
      </Typography>
      <List>
        {history.map((h, i) => (
          <ListItem key={i} divider>
            <ListItemIcon>
              <CompareIcon />
            </ListItemIcon>
            <ListItemText
              primary={`${h.documentIdA} ↔ ${h.documentIdB}`}
              secondary={`التشابه: ${h.similarity}% | ${new Date(h.comparedAt).toLocaleString('ar-SA')}`}
            />
          </ListItem>
        ))}
        {history.length === 0 && <Alert severity="info">لا توجد مقارنات سابقة</Alert>}
      </List>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  9. EXPORT/IMPORT TAB — التصدير والاستيراد
// ══════════════════════════════════════════════════════════════════════════════
function ExportImportTab({ showMsg }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({ documentIds: '', format: 'json' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await documentAdvancedService.exportImport.getJobs();
      if (res.success) setJobs(res.data || []);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    try {
      const ids = exportForm.documentIds
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        showMsg('أدخل معرفات المستندات', 'warning');
        return;
      }

      let res;
      if (exportForm.format === 'csv') {
        res = await documentAdvancedService.exportImport.exportCSV(ids);
      } else {
        res = await documentAdvancedService.exportImport.exportDocs(ids, {
          format: exportForm.format,
        });
      }
      if (res.success) {
        showMsg('تم بدء عملية التصدير');
        setExportDialog(false);
        load();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const statusColor = status => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  const statusLabel = status => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'failed':
        return 'فشل';
      case 'processing':
        return 'جارٍ';
      case 'pending':
        return 'في الانتظار';
      default:
        return status;
    }
  };

  return (
    <Box>
      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ExportIcon />}
          variant="contained"
          onClick={() => setExportDialog(true)}
        >
          تصدير مستندات
        </Button>
        <Button
          startIcon={<ImportIcon />}
          variant="outlined"
          onClick={() => showMsg('استخدم واجهة الاستيراد لرفع ملف JSON أو CSV', 'info')}
        >
          استيراد مستندات
        </Button>
        <Button startIcon={<RefreshIcon />} onClick={load}>
          تحديث
        </Button>
      </Box>

      {/* Jobs Table */}
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المعرّف</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الصيغة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>التقدم</TableCell>
                <TableCell>العدد</TableCell>
                <TableCell>التاريخ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map(job => (
                <TableRow key={job.id}>
                  <TableCell>{job.id?.substr(0, 20)}...</TableCell>
                  <TableCell>
                    <Chip
                      label={job.type === 'export' ? 'تصدير' : 'استيراد'}
                      size="small"
                      icon={job.type === 'export' ? <ExportIcon /> : <ImportIcon />}
                    />
                  </TableCell>
                  <TableCell>{(job.format || 'json').toUpperCase()}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabel(job.status)}
                      size="small"
                      color={statusColor(job.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={job.progress || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">{job.progress || 0}%</Typography>
                  </TableCell>
                  <TableCell>{job.documentIds?.length || 0}</TableCell>
                  <TableCell dir="ltr">
                    {job.createdAt ? new Date(job.createdAt).toLocaleString('ar-SA') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">لا توجد عمليات تصدير/استيراد</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تصدير مستندات</DialogTitle>
        <DialogContent>
          <TextField
            label="معرّفات المستندات (مفصولة بفاصلة)"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            placeholder="doc1, doc2, doc3"
            value={exportForm.documentIds}
            onChange={e => setExportForm(f => ({ ...f, documentIds: e.target.value }))}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>الصيغة</InputLabel>
            <Select
              value={exportForm.format}
              label="الصيغة"
              onChange={e => setExportForm(f => ({ ...f, format: e.target.value }))}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleExport}>
            تصدير
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  10. QR CODES TAB — رموز QR
// ══════════════════════════════════════════════════════════════════════════════
function QRCodesTab({ showMsg }) {
  const [qrCodes, setQRCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [genForm, setGenForm] = useState({
    documentId: '',
    type: 'verification',
    expiresInDays: 0,
  });
  const [documentId, setDocumentId] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await documentAdvancedService.qr.stats();
      if (res.success) setStats(res.data);
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const loadQRCodes = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const res = await documentAdvancedService.qr.getDocumentQRCodes(documentId);
      if (res.success) setQRCodes(res.data || []);
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const res = await documentAdvancedService.qr.generate(genForm.documentId, {
        type: genForm.type,
        expiresInDays: genForm.expiresInDays,
      });
      if (res.success) {
        showMsg('تم إنشاء رمز QR بنجاح');
        setGenerateDialog(false);
        loadStats();
        if (documentId === genForm.documentId) loadQRCodes();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleDisable = async qrId => {
    try {
      const res = await documentAdvancedService.qr.disable(qrId);
      if (res.success) {
        showMsg('تم تعطيل رمز QR');
        loadQRCodes();
      }
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const typeLabels = {
    verification: 'تحقق',
    access: 'وصول',
    download: 'تحميل',
    info: 'معلومات',
  };

  return (
    <Box>
      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <QrCodeIcon sx={{ fontSize: 32, color: '#00BCD4' }} />
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalQRCodes || 0}
                </Typography>
                <Typography>إجمالي الرموز</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalScans || 0}
                </Typography>
                <Typography>إجمالي المسح</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.byStatus?.active || 0}
                </Typography>
                <Typography>نشطة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                  {stats.averageScansPerQR || 0}
                </Typography>
                <Typography>متوسط المسح/رمز</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setGenerateDialog(true)}>
          إنشاء رمز QR
        </Button>
      </Box>

      {/* Search QR codes for a document */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="معرّف المستند"
          size="small"
          value={documentId}
          onChange={e => setDocumentId(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button variant="outlined" onClick={loadQRCodes} disabled={!documentId}>
          عرض الرموز
        </Button>
      </Box>

      {/* QR Codes List */}
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2}>
          {qrCodes.map(qr => (
            <Grid item xs={12} sm={6} md={4} key={qr.id}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  {/* QR Preview */}
                  {qr.dataUrl && (
                    <Box sx={{ mb: 2 }}>
                      <img src={qr.dataUrl} alt="QR Code" style={{ width: 150, height: 150 }} />
                    </Box>
                  )}
                  <Chip label={typeLabels[qr.type] || qr.type} size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {qr.url}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <Chip label={`${qr.scanCount || 0} مسح`} size="small" variant="outlined" />
                    <Chip
                      label={qr.status === 'active' ? 'نشط' : qr.status}
                      size="small"
                      color={qr.status === 'active' ? 'success' : 'default'}
                    />
                  </Box>
                  {qr.expiresAt && (
                    <Typography variant="caption" color="text.secondary">
                      ينتهي: {new Date(qr.expiresAt).toLocaleDateString('ar-SA')}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDisable(qr.id)}
                      disabled={qr.status !== 'active'}
                    >
                      تعطيل
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {qrCodes.length === 0 && documentId && !loading && (
            <Grid item xs={12}>
              <Alert severity="info">لا توجد رموز QR لهذا المستند</Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Generate Dialog */}
      <Dialog
        open={generateDialog}
        onClose={() => setGenerateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إنشاء رمز QR جديد</DialogTitle>
        <DialogContent>
          <TextField
            label="معرّف المستند"
            fullWidth
            margin="normal"
            value={genForm.documentId}
            onChange={e => setGenForm(f => ({ ...f, documentId: e.target.value }))}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>نوع الرمز</InputLabel>
            <Select
              value={genForm.type}
              label="نوع الرمز"
              onChange={e => setGenForm(f => ({ ...f, type: e.target.value }))}
            >
              <MenuItem value="verification">تحقق من المستند</MenuItem>
              <MenuItem value="access">رابط وصول سريع</MenuItem>
              <MenuItem value="download">تحميل مباشر</MenuItem>
              <MenuItem value="info">عرض المعلومات</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="ينتهي بعد (أيام) — 0 بلا انتهاء"
            type="number"
            fullWidth
            margin="normal"
            value={genForm.expiresInDays}
            onChange={e =>
              setGenForm(f => ({ ...f, expiresInDays: parseInt(e.target.value) || 0 }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleGenerate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
