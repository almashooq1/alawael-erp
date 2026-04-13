/**
 * AuditComplianceHub — مركز التدقيق والامتثال
 *
 * Full-page audit trail viewer + compliance checklists + alerts dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import {
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import enterpriseProService from '../../services/enterprisePro.service';

const SEVERITY_COLORS = { low: '#4CAF50', medium: '#FF9800', high: '#F44336', critical: '#9C27B0' };
const ACTION_COLORS = {
  create: '#4CAF50',
  update: '#2196F3',
  delete: '#F44336',
  view: '#9E9E9E',
  approve: '#00BCD4',
  reject: '#FF5722',
  archive: '#795548',
  export: '#FF9800',
};

export default function AuditComplianceHub() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Audit Trail state
  const [trail, setTrail] = useState([]);
  const [trailTotal, setTrailTotal] = useState(0);
  const [trailPage, setTrailPage] = useState(1);
  const [trailFilters, setTrailFilters] = useState({ module: '', action: '', severity: '' });
  const [stats, setStats] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modules, setModules] = useState([]);

  // Compliance state
  const [checklists, setChecklists] = useState([]);
  const [compDashboard, setCompDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [clForm, setClForm] = useState({
    name: '',
    nameAr: '',
    category: 'labor_law',
    description: '',
    items: [],
  });
  const [clDialogOpen, setClDialogOpen] = useState(false);

  const fetchAuditTrail = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: trailPage, limit: 30 };
      if (trailFilters.module) params.module = trailFilters.module;
      if (trailFilters.action) params.action = trailFilters.action;
      if (trailFilters.severity) params.severity = trailFilters.severity;
      const res = await enterpriseProService.getAuditTrail(params);
      setTrail(res.data.entries || []);
      setTrailTotal(res.data.total || 0);
    } catch {
      showSnackbar('خطأ في تحميل سجل التدقيق', 'error');
    } finally {
      setLoading(false);
    }
  }, [trailPage, trailFilters, showSnackbar]);

  const fetchStats = useCallback(async () => {
    try {
      const [sRes, mRes] = await Promise.all([
        enterpriseProService.getAuditStats(),
        enterpriseProService.getAuditModules(),
      ]);
      setStats(sRes.data);
      setModules(mRes.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true);
      const [clRes, dashRes, alertRes] = await Promise.all([
        enterpriseProService.getComplianceChecklists(),
        enterpriseProService.getComplianceDashboard(),
        enterpriseProService.getComplianceAlerts(),
      ]);
      setChecklists(clRes.data || []);
      setCompDashboard(dashRes.data);
      setAlerts(alertRes.data || []);
    } catch {
      showSnackbar('خطأ في تحميل بيانات الامتثال', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchAuditTrail();
    fetchStats();
  }, [fetchAuditTrail, fetchStats]);

  useEffect(() => {
    if (tab === 1) fetchCompliance();
  }, [tab, fetchCompliance]);

  const handleCreateChecklist = async () => {
    try {
      await enterpriseProService.createComplianceChecklist(clForm);
      showSnackbar('تم إنشاء قائمة الامتثال', 'success');
      setClDialogOpen(false);
      setClForm({ name: '', nameAr: '', category: 'labor_law', description: '', items: [] });
      fetchCompliance();
    } catch {
      showSnackbar('خطأ في إنشاء القائمة', 'error');
    }
  };

  const handleDeleteChecklist = async id => {
    try {
      await enterpriseProService.deleteComplianceChecklist(id);
      showSnackbar('تم حذف القائمة', 'success');
      fetchCompliance();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const handleResolveAlert = async id => {
    try {
      await enterpriseProService.resolveComplianceAlert(id);
      showSnackbar('تم حل التنبيه', 'success');
      fetchCompliance();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const CATEGORIES = [
    { value: 'labor_law', label: 'نظام العمل' },
    { value: 'civil_defense', label: 'الدفاع المدني' },
    { value: 'mhrsd', label: 'وزارة الموارد البشرية' },
    { value: 'gosi', label: 'التأمينات الاجتماعية' },
    { value: 'zakat', label: 'الزكاة والضريبة' },
    { value: 'data_protection', label: 'حماية البيانات' },
    { value: 'quality', label: 'الجودة' },
    { value: 'health_safety', label: 'الصحة والسلامة' },
    { value: 'environmental', label: 'البيئة' },
    { value: 'custom', label: 'مخصص' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ fontSize: 36, color: '#1565C0' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              مركز التدقيق والامتثال
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Audit Trail & Compliance Hub
            </Typography>
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={() => {
            fetchAuditTrail();
            fetchStats();
            if (tab === 1) fetchCompliance();
          }}
        >
          تحديث
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${alpha('#1565C0', 0.1)}, ${alpha('#1565C0', 0.05)})`,
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <HistoryIcon sx={{ fontSize: 32, color: '#1565C0', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>
                  {stats.recentCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  عملية (آخر 24 ساعة)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {stats.byModule?.slice(0, 3).map((m, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(['#4CAF50', '#FF9800', '#2196F3'][i], 0.1)}, ${alpha(['#4CAF50', '#FF9800', '#2196F3'][i], 0.05)})`,
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <StatsIcon
                    sx={{ fontSize: 32, color: ['#4CAF50', '#FF9800', '#2196F3'][i], mb: 1 }}
                  />
                  <Typography variant="h4" fontWeight={700}>
                    {m.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m._id}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<HistoryIcon />} label="سجل التدقيق" iconPosition="start" />
        <Tab icon={<CheckIcon />} label="الامتثال والقوائم" iconPosition="start" />
        <Tab icon={<WarningIcon />} label="التنبيهات" iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Tab 0: Audit Trail ── */}
      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={trailFilters.module}
                onChange={e => setTrailFilters(f => ({ ...f, module: e.target.value }))}
                displayEmpty
              >
                <MenuItem value="">كل الأقسام</MenuItem>
                {modules.map(m => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={trailFilters.action}
                onChange={e => setTrailFilters(f => ({ ...f, action: e.target.value }))}
                displayEmpty
              >
                <MenuItem value="">كل الإجراءات</MenuItem>
                {[
                  'create',
                  'update',
                  'delete',
                  'view',
                  'approve',
                  'reject',
                  'export',
                  'archive',
                ].map(a => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={trailFilters.severity}
                onChange={e => setTrailFilters(f => ({ ...f, severity: e.target.value }))}
                displayEmpty
              >
                <MenuItem value="">كل المستويات</MenuItem>
                {['low', 'medium', 'high', 'critical'].map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={fetchAuditTrail}
              size="small"
            >
              بحث
            </Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#1565C0', 0.05) }}>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الإجراء</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>الأهمية</TableCell>
                  <TableCell>تفاصيل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trail.map(entry => (
                  <TableRow key={entry._id} hover>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {new Date(entry.createdAt).toLocaleString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Chip label={entry.module} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.action}
                        size="small"
                        sx={{
                          bgcolor: alpha(ACTION_COLORS[entry.action] || '#999', 0.15),
                          color: ACTION_COLORS[entry.action] || '#999',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>{entry.entityType}</TableCell>
                    <TableCell>{entry.performedBy?.name || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.severity}
                        size="small"
                        sx={{
                          bgcolor: alpha(SEVERITY_COLORS[entry.severity] || '#999', 0.15),
                          color: SEVERITY_COLORS[entry.severity],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setDetailOpen(true);
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {trail.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      لا توجد سجلات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {trailTotal > 30 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button disabled={trailPage <= 1} onClick={() => setTrailPage(p => p - 1)}>
                السابق
              </Button>
              <Typography sx={{ lineHeight: '36px' }}>
                صفحة {trailPage} من {Math.ceil(trailTotal / 30)}
              </Typography>
              <Button
                disabled={trailPage >= Math.ceil(trailTotal / 30)}
                onClick={() => setTrailPage(p => p + 1)}
              >
                التالي
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* ── Tab 1: Compliance Checklists ── */}
      {tab === 1 && (
        <Box>
          {compDashboard && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'إجمالي القوائم', value: compDashboard.totalChecklists, color: '#1565C0' },
                {
                  label: 'العناصر المتوافقة',
                  value: compDashboard.compliantItems,
                  color: '#4CAF50',
                },
                { label: 'غير متوافق', value: compDashboard.nonCompliant, color: '#F44336' },
                { label: 'متأخرة', value: compDashboard.overdue, color: '#FF9800' },
                { label: 'متوسط النتيجة', value: `${compDashboard.avgScore}%`, color: '#9C27B0' },
              ].map((s, i) => (
                <Grid item xs={6} md={2.4} key={i}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="h5" fontWeight={700} color={s.color}>
                        {s.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">قوائم الامتثال</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setClDialogOpen(true)}
            >
              إضافة قائمة
            </Button>
          </Box>

          <Grid container spacing={2}>
            {checklists.map(cl => (
              <Grid item xs={12} md={6} key={cl._id}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {cl.nameAr || cl.name}
                        </Typography>
                        <Chip
                          label={
                            CATEGORIES.find(c => c.value === cl.category)?.label || cl.category
                          }
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress
                          variant="determinate"
                          value={cl.overallScore || 0}
                          sx={{
                            color:
                              cl.overallScore >= 80
                                ? '#4CAF50'
                                : cl.overallScore >= 50
                                  ? '#FF9800'
                                  : '#F44336',
                          }}
                          size={56}
                          thickness={5}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {cl.overallScore || 0}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {cl.items?.length || 0} عنصر
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteChecklist(cl._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Tab 2: Alerts ── */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            تنبيهات الامتثال
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#F44336', 0.05) }}>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الأهمية</TableCell>
                  <TableCell>الرسالة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map(a => (
                  <TableRow key={a._id} hover>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {new Date(a.createdAt).toLocaleString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Chip label={a.alertType?.replace(/_/g, ' ')} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.severity}
                        size="small"
                        icon={a.severity === 'critical' ? <ErrorIcon /> : <WarningIcon />}
                        color={
                          a.severity === 'critical'
                            ? 'error'
                            : a.severity === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    </TableCell>
                    <TableCell>{a.messageAr || a.message}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.isResolved ? 'تم الحل' : 'مفتوح'}
                        size="small"
                        color={a.isResolved ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {!a.isResolved && (
                        <Button
                          size="small"
                          startIcon={<ResolveIcon />}
                          onClick={() => handleResolveAlert(a._id)}
                        >
                          حل
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {alerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      لا توجد تنبيهات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل سجل التدقيق</DialogTitle>
        <DialogContent dividers>
          {selectedEntry && (
            <Grid container spacing={2}>
              {[
                { label: 'القسم', value: selectedEntry.module },
                { label: 'الإجراء', value: selectedEntry.action },
                { label: 'النوع', value: selectedEntry.entityType },
                { label: 'الأهمية', value: selectedEntry.severity },
                { label: 'المستخدم', value: selectedEntry.performedBy?.name || '—' },
                {
                  label: 'التاريخ',
                  value: new Date(selectedEntry.createdAt).toLocaleString('ar-SA'),
                },
                { label: 'IP', value: selectedEntry.metadata?.ipAddress || '—' },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Typography variant="caption" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography fontWeight={500}>{f.value}</Typography>
                </Grid>
              ))}
              {selectedEntry.changes?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                    التغييرات
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>الحقل</TableCell>
                          <TableCell>القيمة القديمة</TableCell>
                          <TableCell>القيمة الجديدة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedEntry.changes.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell>{c.field}</TableCell>
                            <TableCell>{String(c.from)}</TableCell>
                            <TableCell>{String(c.to)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Create Checklist Dialog */}
      <Dialog open={clDialogOpen} onClose={() => setClDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء قائمة امتثال جديدة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="الاسم (English)"
            value={clForm.name}
            onChange={e => setClForm(f => ({ ...f, name: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="الاسم (عربي)"
            value={clForm.nameAr}
            onChange={e => setClForm(f => ({ ...f, nameAr: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Select
              value={clForm.category}
              onChange={e => setClForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="الوصف"
            value={clForm.description}
            onChange={e => setClForm(f => ({ ...f, description: e.target.value }))}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateChecklist} disabled={!clForm.name}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
