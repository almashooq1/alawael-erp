/**
 * AL-AWAEL ERP — Automated Backup Dashboard
 * Phase 23 — لوحة تحكم النسخ الاحتياطي التلقائي
 *
 * 6 Tabs: نظرة عامة | النسخ الاحتياطية | الجداول | التخزين | الاستعادة | الإعدادات
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import automatedBackupService from '../../services/automatedBackupService';

/* ━━━ helpers ━━━ */
const fmtDate = d => (d ? new Date(d).toLocaleString('ar-SA') : '—');
const fmtSize = bytes => {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${u[i]}`;
};
const statusColor = s =>
  ({
    completed: 'success',
    active: 'success',
    connected: 'success',
    healthy: 'success',
    failed: 'error',
    critical: 'error',
    warning: 'warning',
    paused: 'default',
    pending: 'info',
  })[s] || 'default';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function AutomatedBackup() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const notify = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <BackupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        نظام النسخ الاحتياطي التلقائي
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة النسخ الاحتياطي التلقائي لقاعدة البيانات والملفات — Phase 23
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<BackupIcon />} label="نظرة عامة" />
          <Tab icon={<CloudUpload />} label="النسخ الاحتياطية" />
          <Tab icon={<Schedule />} label="الجداول" />
          <Tab icon={<Storage />} label="التخزين" />
          <Tab icon={<SettingsBackupRestore />} label="الاستعادة" />
          <Tab icon={<Settings />} label="الإعدادات" />
        </Tabs>
      </Paper>

      {tab === 0 && <OverviewTab notify={notify} loading={loading} setLoading={setLoading} />}
      {tab === 1 && <BackupsTab notify={notify} loading={loading} setLoading={setLoading} />}
      {tab === 2 && <SchedulesTab notify={notify} loading={loading} setLoading={setLoading} />}
      {tab === 3 && <StorageTab notify={notify} loading={loading} setLoading={setLoading} />}
      {tab === 4 && <RestoreTab notify={notify} loading={loading} setLoading={setLoading} />}
      {tab === 5 && <ConfigTab notify={notify} loading={loading} setLoading={setLoading} />}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 0 — OVERVIEW / نظرة عامة
   ═══════════════════════════════════════════════════════════════════════ */
function OverviewTab({ notify, setLoading }) {
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, a] = await Promise.all([
        automatedBackupService.getHealth().catch(() => ({ data: null })),
        automatedBackupService.getAnalytics().catch(() => ({ data: null })),
      ]);
      setHealth(h?.data || h);
      setAnalytics(a?.data || a);
    } catch {
      notify('فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, setLoading]);

  useEffect(() => { load(); }, [load]);

  if (!health) return <CircularProgress sx={{ m: 4 }} />;

  const cards = [
    { label: 'حالة النظام', value: health.status === 'healthy' ? 'سليم' : health.status, icon: <CheckCircle />, color: statusColor(health.status) },
    { label: 'نقاط الصحة', value: `${health.healthScore}%`, icon: <Speed />, color: health.healthScore >= 80 ? 'success' : 'warning' },
    { label: 'إجمالي النسخ', value: health.totalBackups, icon: <BackupIcon />, color: 'info' },
    { label: 'الحجم الكلي', value: health.totalSizeFormatted || fmtSize(health.totalSize), icon: <Storage />, color: 'info' },
    { label: 'نسخ آخر 24 ساعة', value: health.recentBackups24h, icon: <CloudDone />, color: 'success' },
    { label: 'فشل آخر 24 ساعة', value: health.failedBackups24h, icon: <ErrorIcon />, color: health.failedBackups24h > 0 ? 'error' : 'success' },
    { label: 'جداول نشطة', value: `${health.activeSchedules}/${health.totalSchedules}`, icon: <Schedule />, color: 'info' },
    { label: 'أهداف تخزين متصلة', value: `${health.connectedTargets}/${health.totalTargets}`, icon: <NetworkCheck />, color: 'success' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">نظرة عامة على النسخ الاحتياطي</Typography>
        <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small">تحديث</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: `${c.color}.main`, mb: 1 }}>{c.icon}</Box>
                <Typography variant="h5" fontWeight="bold">{c.value}</Typography>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {health.nextScheduledBackup && (
        <Alert severity="info" sx={{ mb: 2 }}>
          النسخة القادمة: <strong>{health.nextScheduledBackup.name}</strong> — {fmtDate(health.nextScheduledBackup.nextRun)}
        </Alert>
      )}

      {analytics && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            إحصائيات آخر {analytics.period}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}><Typography variant="body2">معدل النجاح: <strong>{analytics.successRate}%</strong></Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="body2">متوسط الحجم: <strong>{fmtSize(analytics.avgBackupSize)}</strong></Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="body2">عمليات الاستعادة: <strong>{analytics.restoreCount}</strong></Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="body2">إجمالي النسخ: <strong>{analytics.totalBackups}</strong></Typography></Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1 — BACKUPS / النسخ الاحتياطية
   ═══════════════════════════════════════════════════════════════════════ */
function BackupsTab({ notify, setLoading }) {
  const [backups, setBackups] = useState([]);
  const [total, setTotal] = useState(0);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState({ type: 'full', description: '', targets: ['local'] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await automatedBackupService.listBackups();
      setBackups(res.backups || []);
      setTotal(res.total || 0);
    } catch {
      notify('فشل تحميل النسخ', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, setLoading]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await automatedBackupService.createBackup(form);
      notify('تم إنشاء نسخة احتياطية');
      setDlgOpen(false);
      load();
    } catch {
      notify('فشل إنشاء نسخة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await automatedBackupService.deleteBackup(id);
      notify('تم حذف النسخة');
      load();
    } catch {
      notify('فشل الحذف', 'error');
    }
  };

  const handleVerify = async id => {
    try {
      await automatedBackupService.verifyBackup(id);
      notify('تم التحقق بنجاح');
      load();
    } catch {
      notify('فشل التحقق', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">النسخ الاحتياطية ({total})</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => setDlgOpen(true)}>إنشاء نسخة</Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الحجم</TableCell>
              <TableCell>المجموعات</TableCell>
              <TableCell>الملفات</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>التحقق</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">لا توجد نسخ احتياطية</TableCell></TableRow>
            )}
            {backups.map(b => (
              <TableRow key={b.id}>
                <TableCell>{b.type}</TableCell>
                <TableCell><Chip label={b.status} color={statusColor(b.status)} size="small" /></TableCell>
                <TableCell>{fmtSize(b.size)}</TableCell>
                <TableCell>{b.collections}</TableCell>
                <TableCell>{b.filesCount}</TableCell>
                <TableCell>{fmtDate(b.createdAt)}</TableCell>
                <TableCell>{b.verified ? <CheckCircle color="success" fontSize="small" /> : <Warning color="warning" fontSize="small" />}</TableCell>
                <TableCell>
                  <Tooltip title="تحقق"><IconButton size="small" onClick={() => handleVerify(b.id)}><VerifiedUser fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(b.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء نسخة احتياطية جديدة</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>النوع</InputLabel>
            <Select value={form.type} label="النوع" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <MenuItem value="full">كامل</MenuItem>
              <MenuItem value="mongodb">MongoDB فقط</MenuItem>
              <MenuItem value="files">ملفات فقط</MenuItem>
              <MenuItem value="incremental">تزايدي</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="الوصف" sx={{ mt: 2 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>إنشاء</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 2 — SCHEDULES / الجداول
   ═══════════════════════════════════════════════════════════════════════ */
function SchedulesTab({ notify, setLoading }) {
  const [schedules, setSchedules] = useState([]);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'mongodb', cron: '0 2 * * *', retention: 7 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await automatedBackupService.listSchedules();
      setSchedules(res.schedules || []);
    } catch {
      notify('فشل تحميل الجداول', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, setLoading]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await automatedBackupService.upsertSchedule(form);
      notify('تم حفظ الجدول');
      setDlgOpen(false);
      load();
    } catch {
      notify('فشل الحفظ', 'error');
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await automatedBackupService.toggleSchedule(id, !enabled);
      notify(enabled ? 'تم إيقاف الجدول' : 'تم تفعيل الجدول');
      load();
    } catch {
      notify('فشل التبديل', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await automatedBackupService.deleteSchedule(id);
      notify('تم حذف الجدول');
      load();
    } catch {
      notify('فشل الحذف', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">جداول النسخ التلقائي</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => setDlgOpen(true)}>إضافة جدول</Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>Cron</TableCell>
              <TableCell>الاحتفاظ (أيام)</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>آخر تشغيل</TableCell>
              <TableCell>التشغيل القادم</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.type}</TableCell>
                <TableCell><code>{s.cron}</code></TableCell>
                <TableCell>{s.retention}</TableCell>
                <TableCell><Chip label={s.status} color={statusColor(s.status)} size="small" /></TableCell>
                <TableCell>{fmtDate(s.lastRun)}</TableCell>
                <TableCell>{fmtDate(s.nextRun)}</TableCell>
                <TableCell>
                  <Tooltip title={s.enabled ? 'إيقاف' : 'تفعيل'}>
                    <IconButton size="small" onClick={() => handleToggle(s.id, s.enabled)}>
                      {s.enabled ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة جدول نسخ احتياطي</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="اسم الجدول" sx={{ mt: 2 }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>النوع</InputLabel>
            <Select value={form.type} label="النوع" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <MenuItem value="mongodb">MongoDB</MenuItem>
              <MenuItem value="full">كامل</MenuItem>
              <MenuItem value="files">ملفات</MenuItem>
              <MenuItem value="archive">أرشيف</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Cron Expression" sx={{ mt: 2 }} value={form.cron} onChange={e => setForm(f => ({ ...f, cron: e.target.value }))} placeholder="0 2 * * *" />
          <TextField fullWidth label="الاحتفاظ (أيام)" type="number" sx={{ mt: 2 }} value={form.retention} onChange={e => setForm(f => ({ ...f, retention: Number(e.target.value) }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 3 — STORAGE / التخزين
   ═══════════════════════════════════════════════════════════════════════ */
function StorageTab({ notify, setLoading }) {
  const [targets, setTargets] = useState([]);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 's3', bucket: '', region: 'me-south-1' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await automatedBackupService.listStorageTargets();
      setTargets(res.targets || []);
    } catch {
      notify('فشل تحميل الأهداف', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, setLoading]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await automatedBackupService.upsertStorageTarget(form);
      notify('تم حفظ هدف التخزين');
      setDlgOpen(false);
      load();
    } catch {
      notify('فشل الحفظ', 'error');
    }
  };

  const handleTest = async id => {
    try {
      const res = await automatedBackupService.testStorageTarget(id);
      notify(`اتصال ناجح — ${res.data?.latency || 0}ms`);
      load();
    } catch {
      notify('فشل اختبار الاتصال', 'error');
    }
  };

  const handleRemove = async id => {
    try {
      await automatedBackupService.removeStorageTarget(id);
      notify('تم حذف الهدف');
      load();
    } catch (err) {
      notify(err?.response?.data?.error || 'فشل الحذف', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">أهداف التخزين</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => setDlgOpen(true)}>إضافة هدف</Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {targets.map(t => (
          <Grid item xs={12} md={6} key={t.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">{t.name}</Typography>
                  <Chip label={t.status} color={statusColor(t.status)} size="small" />
                </Box>
                <Typography variant="body2">النوع: <strong>{t.type.toUpperCase()}</strong></Typography>
                {t.bucket && <Typography variant="body2">Bucket: {t.bucket}</Typography>}
                {t.region && <Typography variant="body2">المنطقة: {t.region}</Typography>}
                {t.path && <Typography variant="body2">المسار: {t.path}</Typography>}
                <Typography variant="body2" color="text.secondary">آخر فحص: {fmtDate(t.lastCheck)}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button size="small" startIcon={<NetworkCheck />} onClick={() => handleTest(t.id)}>اختبار</Button>
                  {t.type !== 'local' && (
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleRemove(t.id)}>حذف</Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة هدف تخزين</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="الاسم" sx={{ mt: 2 }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>النوع</InputLabel>
            <Select value={form.type} label="النوع" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <MenuItem value="s3">AWS S3</MenuItem>
              <MenuItem value="gcs">Google Cloud Storage</MenuItem>
              <MenuItem value="azure">Azure Blob</MenuItem>
              <MenuItem value="sftp">SFTP</MenuItem>
            </Select>
          </FormControl>
          {form.type === 's3' && (
            <>
              <TextField fullWidth label="Bucket Name" sx={{ mt: 2 }} value={form.bucket} onChange={e => setForm(f => ({ ...f, bucket: e.target.value }))} />
              <TextField fullWidth label="Region" sx={{ mt: 2 }} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 4 — RESTORE / الاستعادة
   ═══════════════════════════════════════════════════════════════════════ */
function RestoreTab({ notify, setLoading }) {
  const [history, setHistory] = useState([]);
  const [backups, setBackups] = useState([]);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [dryRun, setDryRun] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, b] = await Promise.all([
        automatedBackupService.listRestoreHistory(),
        automatedBackupService.listBackups({ limit: 20 }),
      ]);
      setHistory(h.restores || []);
      setBackups(b.backups || []);
    } catch {
      notify('فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, setLoading]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async () => {
    if (!selectedBackup) { notify('اختر نسخة احتياطية', 'warning'); return; }
    try {
      await automatedBackupService.restoreBackup(selectedBackup, { dryRun });
      notify(dryRun ? 'تم التشغيل التجريبي بنجاح' : 'تمت الاستعادة بنجاح');
      setDlgOpen(false);
      load();
    } catch {
      notify('فشلت الاستعادة', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">الاستعادة من نسخة احتياطية</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button startIcon={<SettingsBackupRestore />} variant="contained" onClick={() => setDlgOpen(true)}>استعادة</Button>
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>سجل الاستعادة</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>نوع النسخة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المجموعات</TableCell>
              <TableCell>الملفات</TableCell>
              <TableCell>المدة</TableCell>
              <TableCell>التاريخ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">لا يوجد سجل استعادة</TableCell></TableRow>
            )}
            {history.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.backupType}</TableCell>
                <TableCell><Chip label={r.status} color={statusColor(r.status)} size="small" /></TableCell>
                <TableCell>{r.collectionsRestored}</TableCell>
                <TableCell>{r.filesRestored}</TableCell>
                <TableCell>{r.duration ? `${Math.floor(r.duration / 1000)}s` : '—'}</TableCell>
                <TableCell>{fmtDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>استعادة من نسخة احتياطية</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>اختر نسخة</InputLabel>
            <Select value={selectedBackup} label="اختر نسخة" onChange={e => setSelectedBackup(e.target.value)}>
              {backups.map(b => (
                <MenuItem key={b.id} value={b.id}>
                  {b.type} — {fmtSize(b.size)} — {fmtDate(b.createdAt)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            sx={{ mt: 2 }}
            control={<Switch checked={dryRun} onChange={e => setDryRun(e.target.checked)} />}
            label="تشغيل تجريبي (Dry Run)"
          />
          {!dryRun && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              تحذير: ستتم الاستعادة الفعلية لقاعدة البيانات والملفات!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)}>إلغاء</Button>
          <Button variant="contained" color={dryRun ? 'primary' : 'warning'} onClick={handleRestore}>
            {dryRun ? 'تشغيل تجريبي' : 'استعادة فعلية'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 5 — CONFIG / الإعدادات
   ═══════════════════════════════════════════════════════════════════════ */
function ConfigTab({ notify, setLoading }) {
  const [config, setConfig] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await automatedBackupService.getConfig();
      setConfig(res.data || res);
    } catch {
      notify('فشل تحميل الإعدادات', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, setLoading]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await automatedBackupService.updateConfig(config);
      notify('تم حفظ الإعدادات');
    } catch {
      notify('فشل الحفظ', 'error');
    }
  };

  const handleCleanup = async () => {
    try {
      const res = await automatedBackupService.runCleanup();
      notify(`تم التنظيف — ${res.data?.removed || 0} نسخة محذوفة`);
    } catch {
      notify('فشل التنظيف', 'error');
    }
  };

  if (!config) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>إعدادات النسخ الاحتياطي</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>عامة</Typography>
            <TextField fullWidth label="أيام الاحتفاظ" type="number" sx={{ mb: 2 }}
              value={config.retentionDays} onChange={e => setConfig(c => ({ ...c, retentionDays: Number(e.target.value) }))} />
            <TextField fullWidth label="الحد الأقصى للنسخ" type="number" sx={{ mb: 2 }}
              value={config.maxBackups} onChange={e => setConfig(c => ({ ...c, maxBackups: Number(e.target.value) }))} />
            <TextField fullWidth label="مسار النسخ" sx={{ mb: 2 }}
              value={config.backupDir} onChange={e => setConfig(c => ({ ...c, backupDir: e.target.value }))} />
            <FormControlLabel control={<Switch checked={config.compressionEnabled}
              onChange={e => setConfig(c => ({ ...c, compressionEnabled: e.target.checked }))} />} label="تمكين الضغط" />
            <FormControlLabel control={<Switch checked={config.encryptionEnabled}
              onChange={e => setConfig(c => ({ ...c, encryptionEnabled: e.target.checked }))} />} label="تمكين التشفير" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>الجداول الافتراضية</Typography>
            <TextField fullWidth label="جدول يومي (Cron)" sx={{ mb: 2 }}
              value={config.dailySchedule} onChange={e => setConfig(c => ({ ...c, dailySchedule: e.target.value }))} />
            <TextField fullWidth label="جدول أسبوعي (Cron)" sx={{ mb: 2 }}
              value={config.weeklySchedule} onChange={e => setConfig(c => ({ ...c, weeklySchedule: e.target.value }))} />
            <TextField fullWidth label="جدول شهري (Cron)" sx={{ mb: 2 }}
              value={config.monthlySchedule} onChange={e => setConfig(c => ({ ...c, monthlySchedule: e.target.value }))} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>S3 / التخزين السحابي</Typography>
            <FormControlLabel control={<Switch checked={config.s3Enabled}
              onChange={e => setConfig(c => ({ ...c, s3Enabled: e.target.checked }))} />} label="تمكين S3" />
            <TextField fullWidth label="S3 Bucket" sx={{ mb: 2, mt: 1 }}
              value={config.s3Bucket} onChange={e => setConfig(c => ({ ...c, s3Bucket: e.target.value }))} />
            <TextField fullWidth label="S3 Region" sx={{ mb: 2 }}
              value={config.s3Region} onChange={e => setConfig(c => ({ ...c, s3Region: e.target.value }))} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>الإشعارات والصيانة</Typography>
            <FormControlLabel control={<Switch checked={config.notifyOnFailure}
              onChange={e => setConfig(c => ({ ...c, notifyOnFailure: e.target.checked }))} />} label="إشعار عند الفشل" />
            <FormControlLabel control={<Switch checked={config.notifyOnSuccess}
              onChange={e => setConfig(c => ({ ...c, notifyOnSuccess: e.target.checked }))} />} label="إشعار عند النجاح" />
            <Box sx={{ mt: 2 }}>
              <Button startIcon={<CleaningServices />} variant="outlined" color="warning" onClick={handleCleanup} fullWidth>
                تنظيف النسخ القديمة
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button variant="contained" size="large" onClick={handleSave}>حفظ الإعدادات</Button>
      </Box>
    </Box>
  );
}
