/**
 * DocumentsProPhase8 — لوحة المرحلة الثامنة
 * ترجمة المستندات • النماذج الديناميكية • سلاسل الموافقات • التشفير/DLP • النسخ الاحتياطي
 */
import { useState, useEffect, useCallback } from 'react';
import { Paper
} from '@mui/material';


import { translationApi, formsApi, approvalApi, securityApi, backupApi, getDashboard } from '../../services/documentProPhase8Service';
import logger from '../../utils/logger';

const cardSx = { borderRadius: 3, transition: 'box-shadow .2s', '&:hover': { boxShadow: 6 } };
const statCard = (c) => ({ ...cardSx, borderTop: `4px solid ${c}`, textAlign: 'center' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('ar-SA') : '—';
const fmtSize = (b) => {
  if (!b) return '0';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

/* ══════════════════════════════════════════════════════════════
   TAB 0 — ترجمة المستندات
   ══════════════════════════════════════════════════════════════ */
function TranslationTab() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [languages, setLanguages] = useState({});
  const [loading, setLoading] = useState(true);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [detectOpen, setDetectOpen] = useState(false);
  const [form, setForm] = useState({ documentId: '', targetLanguage: 'en' });
  const [detectText, setDetectText] = useState('');
  const [detectResult, setDetectResult] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, s, l] = await Promise.all([
        translationApi.getJobs(),
        translationApi.getStats(),
        translationApi.getLanguages(),
      ]);
      setJobs(j.data?.jobs || []);
      setStats(s.data);
      setLanguages(l.data?.languages || {});
    } catch (e) { logger.error('TranslationTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleTranslate = async () => {
    try {
      await translationApi.translate(form);
      setSnack('تم بدء الترجمة');
      setTranslateOpen(false);
      load();
    } catch (e) { logger.error('translate', e); }
  };

  const handleDetect = async () => {
    try {
      const r = await translationApi.detectLanguage(detectText);
      setDetectResult(r.data?.detection);
    } catch (e) { logger.error('detect', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const statusColor = { pending: 'default', translating: 'info', review: 'warning', completed: 'success', failed: 'error', cancelled: 'default' };
  const statusLabel = { pending: 'انتظار', translating: 'ترجمة', review: 'مراجعة', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي المهام', val: stats?.totalJobs || 0, color: '#1976d2' },
          { label: 'مكتملة', val: stats?.completedJobs || 0, color: '#4caf50' },
          { label: 'ذاكرة الترجمة', val: stats?.tmEntries || 0, color: '#9c27b0' },
          { label: 'جودة متوسطة', val: `${stats?.averageQuality || 0}%`, color: '#ff9800' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}><CardContent>
              <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Button startIcon={<TranslateIcon />} variant="contained" onClick={() => setTranslateOpen(true)}>ترجمة مستند</Button>
        <Button startIcon={<LanguageIcon />} variant="outlined" onClick={() => setDetectOpen(true)}>كشف اللغة</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>المستند</TableCell><TableCell>من</TableCell><TableCell>إلى</TableCell>
            <TableCell>الحالة</TableCell><TableCell>التقدم</TableCell><TableCell>الجودة</TableCell><TableCell>التاريخ</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {jobs.map(j => (
              <TableRow key={j._id} hover>
                <TableCell>{String(j.documentId).substring(0, 8)}...</TableCell>
                <TableCell><Chip label={languages[j.sourceLanguage]?.name || j.sourceLanguage} size="small" /></TableCell>
                <TableCell><Chip label={languages[j.targetLanguage]?.name || j.targetLanguage} size="small" color="primary" /></TableCell>
                <TableCell><Chip label={statusLabel[j.status] || j.status} color={statusColor[j.status]} size="small" /></TableCell>
                <TableCell sx={{ minWidth: 100 }}>
                  <LinearProgress variant="determinate" value={j.progress || 0} sx={{ borderRadius: 1 }} />
                  <Typography variant="caption">{j.progress || 0}%</Typography>
                </TableCell>
                <TableCell>{j.qualityScore ? `${j.qualityScore}%` : '—'}</TableCell>
                <TableCell>{fmtDateTime(j.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!jobs.length && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={3}>لا توجد مهام</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Translate Dialog */}
      <Dialog open={translateOpen} onClose={() => setTranslateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ترجمة مستند</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="معرف المستند" value={form.documentId} onChange={e => setForm(p => ({ ...p, documentId: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>اللغة الهدف</InputLabel>
              <Select value={form.targetLanguage} label="اللغة الهدف" onChange={e => setForm(p => ({ ...p, targetLanguage: e.target.value }))}>
                {Object.entries(languages).map(([code, info]) => (
                  <MenuItem key={code} value={code}>{info.nativeName} ({info.name})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTranslateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleTranslate}>ترجمة</Button>
        </DialogActions>
      </Dialog>

      {/* Detect Dialog */}
      <Dialog open={detectOpen} onClose={() => setDetectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>كشف اللغة</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={4} label="النص" value={detectText} onChange={e => setDetectText(e.target.value)} sx={{ mt: 1 }} />
          {detectResult && (
            <Alert severity="info" sx={{ mt: 2 }}>
              اللغة: <strong>{detectResult.languageName}</strong> ({detectResult.nativeName}) | الثقة: {Math.round(detectResult.confidence * 100)}% | الاتجاه: {detectResult.direction}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetectOpen(false)}>إغلاق</Button>
          <Button variant="contained" onClick={handleDetect}>كشف</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 1 — النماذج الديناميكية
   ══════════════════════════════════════════════════════════════ */
function FormsTab() {
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([formsApi.getTemplates(), formsApi.getStats()]);
      setTemplates(t.data?.templates || []);
      setStats(s.data);
    } catch (e) { logger.error('FormsTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (selectedTemplate) { await formsApi.updateTemplate(selectedTemplate._id, data); setSnack('تم تحديث القالب'); }
      else { await formsApi.createTemplate(data); setSnack('تم إنشاء القالب'); }
      setDesignerOpen(false); setSelectedTemplate(null); load();
    } catch (e) { logger.error('save template', e); }
  };

  const handlePublish = async (id) => { try { await formsApi.publishTemplate(id); setSnack('تم النشر'); load(); } catch (e) { logger.error('publish', e); } };
  const handleClone = async (id) => { try { await formsApi.cloneTemplate(id); setSnack('تم النسخ'); load(); } catch (e) { logger.error('clone', e); } };
  const handleDelete = async (id) => { try { await formsApi.deleteTemplate(id); setSnack('تم الحذف'); load(); } catch (e) { logger.error('delete', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const statusColor = { draft: 'default', published: 'success', archived: 'warning' };
  const statusLabel = { draft: 'مسودة', published: 'منشور', archived: 'أرشيف' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي القوالب', val: stats?.templates || 0, color: '#1976d2' },
          { label: 'منشور', val: stats?.published || 0, color: '#4caf50' },
          { label: 'العروض', val: stats?.totalSubmissions || 0, color: '#9c27b0' },
          { label: 'حقول مخصصة', val: stats?.customFields || 0, color: '#ff9800' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}><CardContent>
              <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" spacing={2} mb={3}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedTemplate(null); setDesignerOpen(true); }}>إنشاء قالب</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      <Grid container spacing={2}>
        {templates.map(t => (
          <Grid item xs={12} md={6} lg={4} key={t._id}>
            <Card sx={{ ...cardSx, borderRight: `4px solid ${t.color || '#1976d2'}` }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight="bold">{t.nameAr || t.name}</Typography>
                  <Chip label={statusLabel[t.status] || t.status} color={statusColor[t.status]} size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={1}>{t.description || '—'}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`${t.fields?.length || 0} حقل`} size="small" variant="outlined" />
                  <Chip label={`${t.usageCount || 0} استخدام`} size="small" variant="outlined" />
                  <Chip label={t.category || 'عام'} size="small" variant="outlined" />
                </Stack>
              </CardContent>
              <CardActions>
                <Tooltip title="تعديل"><IconButton onClick={() => { setSelectedTemplate(t); setDesignerOpen(true); }}><EditIcon /></IconButton></Tooltip>
                {t.status === 'draft' && <Tooltip title="نشر"><IconButton color="success" onClick={() => handlePublish(t._id)}><PublishIcon /></IconButton></Tooltip>}
                <Tooltip title="نسخ"><IconButton onClick={() => handleClone(t._id)}><CloneIcon /></IconButton></Tooltip>
                <Tooltip title="حذف"><IconButton color="error" onClick={() => handleDelete(t._id)}><DeleteIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <FormDesigner open={designerOpen} onClose={() => { setDesignerOpen(false); setSelectedTemplate(null); }} onSave={handleSave} template={selectedTemplate} />
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 2 — سلاسل الموافقات
   ══════════════════════════════════════════════════════════════ */
function ApprovalTab() {
  const [chains, setChains] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vizOpen, setVizOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({ chainId: '', documentId: '', note: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r, s] = await Promise.all([approvalApi.getChains(), approvalApi.getRequests(), approvalApi.getStats()]);
      setChains(c.data?.chains || []);
      setRequests(r.data?.requests || []);
      setStats(s.data);
    } catch (e) { logger.error('ApprovalTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id) => { try { await approvalApi.activateChain(id); setSnack('تم التفعيل'); load(); } catch (e) { logger.error('activate', e); } };
  const handleSubmit = async () => {
    try {
      await approvalApi.submitRequest(submitForm.chainId, { documentId: submitForm.documentId, note: submitForm.note });
      setSnack('تم تقديم الطلب'); setSubmitOpen(false); load();
    } catch (e) { logger.error('submit', e); }
  };
  const handleProcess = async (id, action) => {
    try { await approvalApi.processStep(id, action, ''); setSnack('تم المعالجة'); load(); } catch (e) { logger.error('process', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const reqStatusColor = { pending: 'default', in_progress: 'info', approved: 'success', rejected: 'error', cancelled: 'default', returned: 'warning', escalated: 'error' };
  const reqStatusLabel = { pending: 'انتظار', in_progress: 'جاري', approved: 'موافق', rejected: 'مرفوض', cancelled: 'ملغي', returned: 'مُعاد', escalated: 'متصاعد' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'سلاسل الموافقات', val: stats?.totalChains || 0, color: '#1976d2' },
          { label: 'نشطة', val: stats?.activeChains || 0, color: '#4caf50' },
          { label: 'الطلبات', val: stats?.totalRequests || 0, color: '#9c27b0' },
          { label: 'متوسط المدة', val: `${stats?.avgDurationMinutes || 0} د`, color: '#ff9800' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}><CardContent>
              <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" spacing={2} mb={3}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedChain(null); setVizOpen(true); }}>إنشاء سلسلة</Button>
        <Button startIcon={<SubmitIcon />} variant="contained" color="secondary" onClick={() => setSubmitOpen(true)}>تقديم طلب</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* Chains */}
      <Typography variant="h6" gutterBottom>سلاسل الموافقات ({chains.length})</Typography>
      <Grid container spacing={2} mb={3}>
        {chains.map(c => (
          <Grid item xs={12} md={6} key={c._id}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight="bold">{c.nameAr || c.name}</Typography>
                  <Chip label={c.status === 'active' ? 'نشط' : c.status === 'draft' ? 'مسودة' : 'أرشيف'} color={c.status === 'active' ? 'success' : 'default'} size="small" />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Chip label={`${c.steps?.length || 0} خطوة`} size="small" variant="outlined" />
                  <Chip label={c.priority} size="small" variant="outlined" />
                  <Chip label={c.category || 'عام'} size="small" variant="outlined" />
                </Stack>
              </CardContent>
              <CardActions>
                {c.status === 'draft' && <Tooltip title="تفعيل"><IconButton color="success" onClick={() => handleActivate(c._id)}><CheckIcon /></IconButton></Tooltip>}
                <Tooltip title="عرض"><IconButton onClick={() => { setSelectedChain(c); setVizOpen(true); }}><ViewIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Requests */}
      <Typography variant="h6" gutterBottom>الطلبات ({requests.length})</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>السلسلة</TableCell><TableCell>الحالة</TableCell><TableCell>الخطوة</TableCell>
            <TableCell>SLA</TableCell><TableCell>التاريخ</TableCell><TableCell>إجراءات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {requests.map(r => (
              <TableRow key={r._id} hover>
                <TableCell>{r.chainId?.nameAr || r.chainId?.name || '—'}</TableCell>
                <TableCell><Chip label={reqStatusLabel[r.status] || r.status} color={reqStatusColor[r.status]} size="small" /></TableCell>
                <TableCell>{r.currentStep} / {r.stepResults?.length || 0}</TableCell>
                <TableCell><Chip label={r.slaStatus === 'on_track' ? 'ضمن الموعد' : r.slaStatus === 'warning' ? 'تحذير' : 'متجاوز'} color={r.slaStatus === 'on_track' ? 'success' : r.slaStatus === 'warning' ? 'warning' : 'error'} size="small" /></TableCell>
                <TableCell>{fmtDateTime(r.createdAt)}</TableCell>
                <TableCell>
                  {r.status === 'in_progress' && <>
                    <Tooltip title="موافقة"><IconButton size="small" color="success" onClick={() => handleProcess(r._id, 'approve')}><ApproveIcon /></IconButton></Tooltip>
                    <Tooltip title="رفض"><IconButton size="small" color="error" onClick={() => handleProcess(r._id, 'reject')}><RejectIcon /></IconButton></Tooltip>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {!requests.length && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={3}>لا توجد طلبات</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submit Dialog */}
      <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تقديم طلب موافقة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>سلسلة الموافقات</InputLabel>
              <Select value={submitForm.chainId} label="سلسلة الموافقات" onChange={e => setSubmitForm(p => ({ ...p, chainId: e.target.value }))}>
                {chains.filter(c => c.status === 'active').map(c => <MenuItem key={c._id} value={c._id}>{c.nameAr || c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="معرف المستند" value={submitForm.documentId} onChange={e => setSubmitForm(p => ({ ...p, documentId: e.target.value }))} />
            <TextField fullWidth multiline rows={2} label="ملاحظة" value={submitForm.note} onChange={e => setSubmitForm(p => ({ ...p, note: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>تقديم</Button>
        </DialogActions>
      </Dialog>

      <ApprovalChainVisualizer open={vizOpen} onClose={() => { setVizOpen(false); setSelectedChain(null); }} chain={selectedChain} onSave={async (data) => { try { if (selectedChain) await approvalApi.updateChain(selectedChain._id, data); else await approvalApi.createChain(data); setVizOpen(false); setSnack('تم الحفظ'); load(); } catch (e) { logger.error('save chain', e); } }} />
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 3 — التشفير وحماية البيانات
   ══════════════════════════════════════════════════════════════ */
function SecurityTab() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState('');
  const [scanText, setScanText] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, p] = await Promise.all([securityApi.getStats(), securityApi.getAccessLogs({ limit: 15 }), securityApi.getDLPPolicies()]);
      setStats(s.data);
      setLogs(l.data?.logs || []);
      setPolicies(p.data?.policies || []);
    } catch (e) { logger.error('SecurityTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleEncrypt = async () => { if (!docId) return; try { await securityApi.encrypt(docId, {}); setSnack('تم التشفير'); } catch (e) { logger.error('encrypt', e); } };
  const handleAutoClassify = async () => { if (!docId) return; try { const r = await securityApi.autoClassify(docId); setSnack(`تصنيف تلقائي: ${r.data?.classification?.level}`); } catch (e) { logger.error('classify', e); } };
  const handleScan = async () => { if (!scanText) return; try { const r = await securityApi.scanDLP(scanText); setScanResult(r.data); } catch (e) { logger.error('scan', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'مستندات مشفرة', val: stats?.encryptedDocuments || 0, color: '#f44336' },
          { label: 'مستندات مصنفة', val: stats?.classifiedDocuments || 0, color: '#9c27b0' },
          { label: 'سياسات DLP', val: stats?.activeDLPPolicies || 0, color: '#1976d2' },
          { label: 'انتهاكات DLP', val: stats?.dlpViolations || 0, color: '#ff9800' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}><CardContent>
              <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {/* Document Actions */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>إجراءات على المستند</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField size="small" label="معرف المستند" value={docId} onChange={e => setDocId(e.target.value)} sx={{ minWidth: 260 }} />
          <Button variant="contained" color="error" startIcon={<EncryptIcon />} onClick={handleEncrypt}>تشفير</Button>
          <Button variant="outlined" startIcon={<ClassifyIcon />} onClick={handleAutoClassify}>تصنيف تلقائي</Button>
        </Stack>
      </Paper>

      {/* DLP Scan */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>فحص DLP</Typography>
        <TextField fullWidth multiline rows={3} label="النص للفحص" value={scanText} onChange={e => setScanText(e.target.value)} sx={{ mb: 1 }} />
        <Button variant="contained" startIcon={<DLPIcon />} onClick={handleScan}>فحص</Button>
        {scanResult && (
          <Box mt={2}>
            <Alert severity={scanResult.shouldBlock ? 'error' : scanResult.hasViolations ? 'warning' : 'success'}>
              درجة الخطورة: {scanResult.riskScore} | الانتهاكات: {scanResult.violations?.length || 0}
              {scanResult.shouldBlock && ' | ⛔ يجب الحظر'}
            </Alert>
            {scanResult.violations?.map((v, i) => (
              <Alert key={i} severity={v.severity === 'critical' ? 'error' : 'warning'} sx={{ mt: 0.5 }}>{v.message}</Alert>
            ))}
          </Box>
        )}
      </Paper>

      {/* Access Logs */}
      <Typography variant="h6" gutterBottom>سجل الوصول الأخير</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>المستخدم</TableCell><TableCell>الإجراء</TableCell><TableCell>الحالة</TableCell><TableCell>DLP</TableCell><TableCell>التاريخ</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {logs.map(l => (
              <TableRow key={l._id} hover>
                <TableCell>{l.userId?.name || '—'}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell><Chip label={l.status === 'allowed' ? 'مسموح' : 'محظور'} color={l.status === 'allowed' ? 'success' : 'error'} size="small" /></TableCell>
                <TableCell>{l.dlpViolation ? <WarningIcon color="error" fontSize="small" /> : '—'}</TableCell>
                <TableCell>{fmtDateTime(l.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 4 — النسخ الاحتياطي
   ══════════════════════════════════════════════════════════════ */
function BackupTab() {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'full' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([backupApi.getBackups(), backupApi.getStats()]);
      setBackups(b.data?.backups || []);
      setStats(s.data);
    } catch (e) { logger.error('BackupTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => { try { await backupApi.createBackup(form); setSnack('تم إنشاء النسخة'); setCreateOpen(false); setTimeout(load, 2000); } catch (e) { logger.error('create backup', e); } };
  const handleVerify = async (id) => { try { const r = await backupApi.verifyBackup(id); setSnack(`التحقق: ${r.data?.verified || 0} سليم، ${r.data?.corrupted || 0} تالف`); } catch (e) { logger.error('verify', e); } };
  const handleDelete = async (id) => { try { await backupApi.deleteBackup(id); setSnack('تم الحذف'); load(); } catch (e) { logger.error('delete', e); } };
  const handleCleanup = async () => { try { const r = await backupApi.cleanup(); setSnack(`تنظيف: ${r.data?.deletedSnapshots || 0} لقطة، ${r.data?.deletedBackups || 0} نسخة`); } catch (e) { logger.error('cleanup', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const statusColor = { pending: 'default', running: 'info', completed: 'success', failed: 'error', cancelled: 'warning' };
  const statusLabel = { pending: 'انتظار', running: 'جاري', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي النسخ', val: stats?.totalBackups || 0, color: '#1976d2' },
          { label: 'مكتملة', val: stats?.completedBackups || 0, color: '#4caf50' },
          { label: 'اللقطات', val: stats?.totalSnapshots || 0, color: '#9c27b0' },
          { label: 'الحجم الكلي', val: fmtSize(stats?.totalBackupSize || 0), color: '#ff9800' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}><CardContent>
              <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" spacing={2} mb={3}>
        <Button startIcon={<UploadBackupIcon />} variant="contained" onClick={() => setCreateOpen(true)}>إنشاء نسخة احتياطية</Button>
        <Button startIcon={<DeleteIcon />} variant="outlined" color="error" onClick={handleCleanup}>تنظيف منتهية</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {stats?.compressionRatio > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          نسبة الضغط: {stats.compressionRatio}% | إجمالي المستندات المنسوخة: {stats.totalDocsBacked} | السياسات النشطة: {stats.activePolicies}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>الاسم</TableCell><TableCell>النوع</TableCell><TableCell>الحالة</TableCell>
            <TableCell>المستندات</TableCell><TableCell>الحجم</TableCell><TableCell>المدة</TableCell><TableCell>التاريخ</TableCell><TableCell>إجراءات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {backups.map(b => (
              <TableRow key={b._id} hover>
                <TableCell>{b.name}</TableCell>
                <TableCell><Chip label={b.type} size="small" /></TableCell>
                <TableCell><Chip label={statusLabel[b.status] || b.status} color={statusColor[b.status]} size="small" /></TableCell>
                <TableCell>{b.stats?.processedDocs || 0}</TableCell>
                <TableCell>{fmtSize(b.stats?.totalSize)}</TableCell>
                <TableCell>{b.duration ? `${b.duration}ث` : '—'}</TableCell>
                <TableCell>{fmtDateTime(b.completedAt || b.createdAt)}</TableCell>
                <TableCell>
                  {b.status === 'completed' && <>
                    <Tooltip title="تحقق"><IconButton size="small" color="primary" onClick={() => handleVerify(b._id)}><VerifyIcon /></IconButton></Tooltip>
                    <Tooltip title="استرداد"><IconButton size="small" color="success"><RestoreIcon /></IconButton></Tooltip>
                  </>}
                  <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(b._id)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!backups.length && <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={3}>لا توجد نسخ</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء نسخة احتياطية</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="الاسم" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select value={form.type} label="النوع" onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <MenuItem value="full">كامل</MenuItem>
                <MenuItem value="incremental">تزايدي</MenuItem>
                <MenuItem value="differential">تفاضلي</MenuItem>
                <MenuItem value="snapshot">لقطة</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>إنشاء</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════ */
const tabs = [
  { label: 'ترجمة المستندات', icon: <TranslateIcon /> },
  { label: 'النماذج الديناميكية', icon: <FormsIcon /> },
  { label: 'سلاسل الموافقات', icon: <ApprovalIcon /> },
  { label: 'التشفير والأمان', icon: <SecurityIcon /> },
  { label: 'النسخ الاحتياطي', icon: <BackupIcon /> },
];

export default function DocumentsProPhase8() {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => { getDashboard().then(r => setDashboard(r.data)).catch(() => {}); }, []);

  return (
    <Box dir="rtl" sx={{ p: { xs: 1, md: 3 } }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', color: '#fff' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>إدارة المستندات المتقدمة — المرحلة الثامنة</Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>ترجمة المستندات • النماذج الديناميكية • سلاسل الموافقات • التشفير وحماية البيانات • النسخ الاحتياطي والاسترداد</Typography>
        {dashboard && (
          <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
            <Chip label={`${dashboard.translation?.totalJobs || 0} ترجمة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.forms?.templates || 0} قالب`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.approval?.totalChains || 0} سلسلة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.security?.encryptedDocuments || 0} مشفر`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.backup?.totalBackups || 0} نسخة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
          </Stack>
        )}
      </Paper>

      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { minHeight: 64, fontWeight: 'bold' } }}>
          {tabs.map((t, i) => <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />)}
        </Tabs>
      </Paper>

      <Box>
        {tab === 0 && <TranslationTab />}
        {tab === 1 && <FormsTab />}
        {tab === 2 && <ApprovalTab />}
        {tab === 3 && <SecurityTab />}
        {tab === 4 && <BackupTab />}
      </Box>
    </Box>
  );
}
