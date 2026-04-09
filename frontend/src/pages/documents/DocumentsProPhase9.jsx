/**
 * DocumentsProPhase9 — لوحة المرحلة التاسعة
 * دورة حياة المستند • التوقيع الرقمي PKI • التصنيف الذكي • تنسيق سير العمل • التحليل الجنائي
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Paper, Typography, Button, Chip, Grid, Card, CardContent,
  CardActions, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stack, Snackbar, Stepper, Step, StepLabel, Divider, Accordion,
  AccordionSummary, AccordionDetails, Badge, Avatar
} from '@mui/material';
import {
  Timeline as LifecycleIcon,
  VerifiedUser as CertIcon,
  Category as ClassifyIcon,
  AccountTree as WorkflowIcon,
  FindInPage as ForensicsIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Gavel as LegalIcon,
  Archive as ArchiveIcon,
  ContentCopy as CloneIcon,
  VpnKey as KeyIcon,
  Shield as ShieldIcon,
  Speed as SpeedIcon,
  BubbleChart as ClusterIcon,
  Psychology as AIIcon,
  Fingerprint as FingerprintIcon,
  Security as SecurityIcon,
  ReportProblem as AlertIcon,
  Assessment as AnalysisIcon,
  Link as ChainIcon,
} from '@mui/icons-material';
import { lifecycleApi, digitalCertApi, classificationApi, workflowOrchApi, forensicsApi, getDashboard } from '../../services/documentProPhase9Service';
import LifecycleTimeline from '../../components/documents/LifecycleTimeline';
import WorkflowOrchestrator from '../../components/documents/WorkflowOrchestrator';
import logger from '../../utils/logger';

const cardSx = { borderRadius: 3, transition: 'box-shadow .2s', '&:hover': { boxShadow: 6 } };
const statCard = (c) => ({ ...cardSx, borderTop: `4px solid ${c}`, textAlign: 'center' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('ar-SA') : '—';

/* ══════════════════════════════════════════════════════════
   TAB 0 — دورة حياة المستند
   ══════════════════════════════════════════════════════════ */
function LifecycleTab() {
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ documentId: '', policyId: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([lifecycleApi.getPolicies(), lifecycleApi.getStats()]);
      setPolicies(p.data?.policies || []);
      setStats(s.data);
    } catch (e) { logger.error('LifecycleTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id) => { try { await lifecycleApi.activatePolicy(id); setSnack('تم التفعيل'); load(); } catch (e) { logger.error('activate', e); } };
  const handleAssign = async () => { try { await lifecycleApi.assign(assignForm); setSnack('تم تعيين دورة الحياة'); setAssignOpen(false); load(); } catch (e) { logger.error('assign', e); } };
  const handleAutoTransition = async () => { try { const r = await lifecycleApi.autoTransition(); setSnack(`تم معالجة ${r.data?.processed || 0} انتقال تلقائي`); } catch (e) { logger.error('auto', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'سياسات', val: stats?.totalPolicies || 0, color: '#1976d2' },
          { label: 'مستندات مُدارة', val: stats?.totalLifecycles || 0, color: '#4caf50' },
          { label: 'حجز قانوني', val: stats?.legalHolds || 0, color: '#f44336' },
          { label: 'تنتهي خلال 30 يوم', val: stats?.expiringIn30Days || 0, color: '#ff9800' },
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
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAssignOpen(true)}>تعيين دورة حياة</Button>
        <Button startIcon={<PlayIcon />} variant="outlined" onClick={handleAutoTransition}>انتقال تلقائي</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      <Typography variant="h6" gutterBottom>السياسات ({policies.length})</Typography>
      <Grid container spacing={2} mb={3}>
        {policies.map(p => (
          <Grid item xs={12} md={6} lg={4} key={p._id}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight="bold">{p.nameAr || p.name}</Typography>
                  <Chip label={p.status === 'active' ? 'نشط' : p.status === 'draft' ? 'مسودة' : 'معلق'} color={p.status === 'active' ? 'success' : 'default'} size="small" />
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`${p.phases?.length || 0} مرحلة`} size="small" variant="outlined" />
                  <Chip label={`${p.defaultRetentionDays} يوم احتفاظ`} size="small" variant="outlined" />
                  <Chip label={p.category || 'عام'} size="small" variant="outlined" />
                </Stack>
              </CardContent>
              <CardActions>
                {p.status === 'draft' && <Tooltip title="تفعيل"><IconButton color="success" onClick={() => handleActivate(p._id)}><CheckIcon /></IconButton></Tooltip>}
                <Tooltip title="عرض المراحل"><IconButton onClick={() => { setSelectedDocId(''); setTimelineOpen(true); }}><ViewIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {stats?.byPhase?.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>توزيع المراحل</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {stats.byPhase.map((p, i) => <Chip key={i} label={`${p._id}: ${p.count}`} color="primary" variant="outlined" />)}
          </Stack>
        </Paper>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تعيين دورة حياة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="معرف المستند" value={assignForm.documentId} onChange={e => setAssignForm(p => ({ ...p, documentId: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>السياسة</InputLabel>
              <Select value={assignForm.policyId} label="السياسة" onChange={e => setAssignForm(p => ({ ...p, policyId: e.target.value }))}>
                {policies.filter(p => p.status === 'active').map(p => <MenuItem key={p._id} value={p._id}>{p.nameAr || p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAssign}>تعيين</Button>
        </DialogActions>
      </Dialog>

      <LifecycleTimeline open={timelineOpen} onClose={() => setTimelineOpen(false)} documentId={selectedDocId} />
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 1 — التوقيع الرقمي
   ══════════════════════════════════════════════════════════ */
function DigitalCertTab() {
  const [certs, setCerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ commonName: '', organization: '', email: '' });
  const [signOpen, setSignOpen] = useState(false);
  const [signForm, setSignForm] = useState({ documentId: '', certificateId: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([digitalCertApi.getCertificates(), digitalCertApi.getStats()]);
      setCerts(c.data?.certificates || []);
      setStats(s.data);
    } catch (e) { logger.error('DigitalCertTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => { try { await digitalCertApi.generate(genForm); setSnack('تم إنشاء الشهادة'); setGenOpen(false); load(); } catch (e) { logger.error('generate', e); } };
  const handleRevoke = async (id) => { try { await digitalCertApi.revoke(id, { reason: 'إلغاء يدوي' }); setSnack('تم إلغاء الشهادة'); load(); } catch (e) { logger.error('revoke', e); } };
  const handleRenew = async (id) => { try { await digitalCertApi.renew(id); setSnack('تم التجديد'); load(); } catch (e) { logger.error('renew', e); } };
  const handleSign = async () => { try { await digitalCertApi.sign(signForm); setSnack('تم التوقيع'); setSignOpen(false); } catch (e) { logger.error('sign', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const statusColor = { active: 'success', revoked: 'error', expired: 'warning', suspended: 'default', pending: 'info' };
  const statusLabel = { active: 'نشط', revoked: 'ملغي', expired: 'منتهي', suspended: 'معلق', pending: 'انتظار' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'الشهادات', val: stats?.totalCertificates || 0, color: '#1976d2' },
          { label: 'نشطة', val: stats?.activeCertificates || 0, color: '#4caf50' },
          { label: 'التوقيعات', val: stats?.totalSignatures || 0, color: '#9c27b0' },
          { label: 'صالحة', val: stats?.validSignatures || 0, color: '#ff9800' },
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
        <Button startIcon={<KeyIcon />} variant="contained" onClick={() => setGenOpen(true)}>إنشاء شهادة</Button>
        <Button startIcon={<FingerprintIcon />} variant="contained" color="secondary" onClick={() => setSignOpen(true)}>توقيع مستند</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>الرقم التسلسلي</TableCell><TableCell>الاسم</TableCell><TableCell>المؤسسة</TableCell>
            <TableCell>الحالة</TableCell><TableCell>صالح حتى</TableCell><TableCell>الاستخدام</TableCell><TableCell>إجراءات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {certs.map(c => (
              <TableRow key={c._id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{c.serialNumber?.substring(0, 16)}...</TableCell>
                <TableCell>{c.subject?.commonName || '—'}</TableCell>
                <TableCell>{c.subject?.organization || '—'}</TableCell>
                <TableCell><Chip label={statusLabel[c.status] || c.status} color={statusColor[c.status]} size="small" /></TableCell>
                <TableCell>{fmtDate(c.validTo)}</TableCell>
                <TableCell>{c.usageCount || 0}</TableCell>
                <TableCell>
                  {c.status === 'active' && <>
                    <Tooltip title="إلغاء"><IconButton size="small" color="error" onClick={() => handleRevoke(c._id)}><CancelIcon /></IconButton></Tooltip>
                    <Tooltip title="تجديد"><IconButton size="small" color="primary" onClick={() => handleRenew(c._id)}><RefreshIcon /></IconButton></Tooltip>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {!certs.length && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={3}>لا توجد شهادات</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Generate Dialog */}
      <Dialog open={genOpen} onClose={() => setGenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء شهادة رقمية</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="الاسم" value={genForm.commonName} onChange={e => setGenForm(p => ({ ...p, commonName: e.target.value }))} />
            <TextField fullWidth label="المؤسسة" value={genForm.organization} onChange={e => setGenForm(p => ({ ...p, organization: e.target.value }))} />
            <TextField fullWidth label="البريد الإلكتروني" value={genForm.email} onChange={e => setGenForm(p => ({ ...p, email: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleGenerate}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Sign Dialog */}
      <Dialog open={signOpen} onClose={() => setSignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>توقيع مستند</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="معرف المستند" value={signForm.documentId} onChange={e => setSignForm(p => ({ ...p, documentId: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>الشهادة</InputLabel>
              <Select value={signForm.certificateId} label="الشهادة" onChange={e => setSignForm(p => ({ ...p, certificateId: e.target.value }))}>
                {certs.filter(c => c.status === 'active').map(c => <MenuItem key={c._id} value={c._id}>{c.subject?.commonName} ({c.serialNumber?.substring(0, 10)})</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSign}>توقيع</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 2 — التصنيف الذكي
   ══════════════════════════════════════════════════════════ */
function ClassificationTab() {
  const [models, setModels] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyForm, setClassifyForm] = useState({ documentId: '', modelId: '', text: '' });
  const [classifyResult, setClassifyResult] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c, s] = await Promise.all([classificationApi.getModels(), classificationApi.getClusters(), classificationApi.getStats()]);
      setModels(m.data?.models || []);
      setClusters(c.data?.clusters || []);
      setStats(s.data);
    } catch (e) { logger.error('ClassificationTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id) => { try { await classificationApi.activateModel(id); setSnack('تم التفعيل'); load(); } catch (e) { logger.error('activate', e); } };
  const handleTrain = async (id) => { try { await classificationApi.trainModel(id, {}); setSnack('تم التدريب'); load(); } catch (e) { logger.error('train', e); } };
  const handleClassify = async () => {
    try {
      const r = await classificationApi.classify(classifyForm);
      setClassifyResult(r.data);
      setSnack('تم التصنيف');
    } catch (e) { logger.error('classify', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'النماذج', val: stats?.totalModels || 0, color: '#1976d2' },
          { label: 'نشطة', val: stats?.activeModels || 0, color: '#4caf50' },
          { label: 'التصنيفات', val: stats?.totalClassifications || 0, color: '#9c27b0' },
          { label: 'دقة متوسطة', val: `${stats?.averageAccuracy || 0}%`, color: '#ff9800' },
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
        <Button startIcon={<AIIcon />} variant="contained" onClick={() => setClassifyOpen(true)}>تصنيف مستند</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* Models */}
      <Typography variant="h6" gutterBottom>نماذج التصنيف ({models.length})</Typography>
      <Grid container spacing={2} mb={3}>
        {models.map(m => (
          <Grid item xs={12} md={6} lg={4} key={m._id}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography fontWeight="bold">{m.nameAr || m.name}</Typography>
                  <Chip label={m.status} color={m.status === 'active' ? 'success' : m.status === 'ready' ? 'info' : 'default'} size="small" />
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`v${m.version}`} size="small" variant="outlined" />
                  <Chip label={`${m.categories?.length || 0} فئة`} size="small" variant="outlined" />
                  {m.trainingData?.accuracy && <Chip label={`دقة: ${Math.round(m.trainingData.accuracy * 100)}%`} size="small" color="primary" />}
                  <Chip label={`${m.usageStats?.classifications || 0} تصنيف`} size="small" variant="outlined" />
                </Stack>
              </CardContent>
              <CardActions>
                {m.status !== 'active' && <Tooltip title="تفعيل"><IconButton color="success" onClick={() => handleActivate(m._id)}><CheckIcon /></IconButton></Tooltip>}
                <Tooltip title="تدريب"><IconButton color="primary" onClick={() => handleTrain(m._id)}><AIIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Clusters */}
      {clusters.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>المجموعات ({clusters.length})</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
            {clusters.map(c => (
              <Chip key={c._id} icon={<ClusterIcon />} label={`${c.nameAr || c.name} (${c.metrics?.documentCount || 0})`} variant="outlined" />
            ))}
          </Stack>
        </>
      )}

      {/* Classify Dialog */}
      <Dialog open={classifyOpen} onClose={() => setClassifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تصنيف مستند</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="معرف المستند" value={classifyForm.documentId} onChange={e => setClassifyForm(p => ({ ...p, documentId: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>النموذج</InputLabel>
              <Select value={classifyForm.modelId} label="النموذج" onChange={e => setClassifyForm(p => ({ ...p, modelId: e.target.value }))}>
                {models.filter(m => ['ready', 'active'].includes(m.status)).map(m => <MenuItem key={m._id} value={m._id}>{m.nameAr || m.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth multiline rows={4} label="النص" value={classifyForm.text} onChange={e => setClassifyForm(p => ({ ...p, text: e.target.value }))} />
          </Stack>
          {classifyResult && (
            <Box mt={2}>
              <Alert severity="success">
                التصنيف: <strong>{classifyResult.primaryCategory}</strong> | الثقة: {Math.round((classifyResult.confidence || 0) * 100)}%
              </Alert>
              {classifyResult.predictions?.map((pred, i) => (
                <Chip key={i} label={`${pred.categoryAr || pred.category}: ${Math.round(pred.confidence * 100)}%`} sx={{ mt: 0.5, mr: 0.5 }} />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassifyOpen(false)}>إغلاق</Button>
          <Button variant="contained" onClick={handleClassify}>تصنيف</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 3 — تنسيق سير العمل
   ══════════════════════════════════════════════════════════ */
function WorkflowOrchTab() {
  const [definitions, setDefinitions] = useState([]);
  const [instances, setInstances] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orchOpen, setOrchOpen] = useState(false);
  const [selectedDef, setSelectedDef] = useState(null);
  const [startOpen, setStartOpen] = useState(false);
  const [startDefId, setStartDefId] = useState('');
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, inst, t, s] = await Promise.all([
        workflowOrchApi.getDefs(), workflowOrchApi.getInstances({ limit: 20 }),
        workflowOrchApi.getMyTasks(), workflowOrchApi.getStats(),
      ]);
      setDefinitions(d.data?.definitions || []);
      setInstances(inst.data?.instances || []);
      setTasks(t.data?.tasks || []);
      setStats(s.data);
    } catch (e) { logger.error('WorkflowOrchTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id) => { try { await workflowOrchApi.activateDef(id); setSnack('تم التفعيل'); load(); } catch (e) { logger.error('activate', e); } };
  const handleClone = async (id) => { try { await workflowOrchApi.cloneDef(id); setSnack('تم النسخ'); load(); } catch (e) { logger.error('clone', e); } };
  const handleStart = async () => { try { await workflowOrchApi.start({ definitionId: startDefId }); setSnack('تم البدء'); setStartOpen(false); load(); } catch (e) { logger.error('start', e); } };
  const handleSuspend = async (id) => { try { await workflowOrchApi.suspend(id, {}); setSnack('تم التعليق'); load(); } catch (e) { logger.error('suspend', e); } };
  const handleResume = async (id) => { try { await workflowOrchApi.resume(id); setSnack('تم الاستئناف'); load(); } catch (e) { logger.error('resume', e); } };
  const handleCancel = async (id) => { try { await workflowOrchApi.cancel(id, {}); setSnack('تم الإلغاء'); load(); } catch (e) { logger.error('cancel', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const instColors = { running: 'info', completed: 'success', failed: 'error', suspended: 'warning', cancelled: 'default', waiting: 'default' };
  const instLabels = { running: 'جاري', completed: 'مكتمل', failed: 'فشل', suspended: 'معلق', cancelled: 'ملغي', waiting: 'انتظار' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'التعريفات', val: stats?.totalDefinitions || 0, color: '#1976d2' },
          { label: 'قيد التشغيل', val: stats?.running || 0, color: '#ff9800' },
          { label: 'مكتملة', val: stats?.completed || 0, color: '#4caf50' },
          { label: 'متوسط المدة', val: `${stats?.avgDurationMinutes || 0} د`, color: '#9c27b0' },
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
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedDef(null); setOrchOpen(true); }}>إنشاء تعريف</Button>
        <Button startIcon={<PlayIcon />} variant="contained" color="secondary" onClick={() => setStartOpen(true)}>تشغيل سير عمل</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* My Tasks */}
      {tasks.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          لديك <strong>{tasks.length}</strong> مهام تنتظر الإنجاز
        </Alert>
      )}

      {/* Definitions */}
      <Typography variant="h6" gutterBottom>التعريفات ({definitions.length})</Typography>
      <Grid container spacing={2} mb={3}>
        {definitions.map(d => (
          <Grid item xs={12} md={6} key={d._id}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography fontWeight="bold">{d.nameAr || d.name}</Typography>
                  <Chip label={d.status === 'active' ? 'نشط' : 'مسودة'} color={d.status === 'active' ? 'success' : 'default'} size="small" />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Chip label={`v${d.version}`} size="small" variant="outlined" />
                  <Chip label={`${d.nodes?.length || 0} عقدة`} size="small" variant="outlined" />
                  <Chip label={`${d.usageStats?.executions || 0} تنفيذ`} size="small" variant="outlined" />
                </Stack>
              </CardContent>
              <CardActions>
                {d.status === 'draft' && <Tooltip title="تفعيل"><IconButton color="success" onClick={() => handleActivate(d._id)}><CheckIcon /></IconButton></Tooltip>}
                <Tooltip title="عرض"><IconButton onClick={() => { setSelectedDef(d); setOrchOpen(true); }}><ViewIcon /></IconButton></Tooltip>
                <Tooltip title="نسخ"><IconButton onClick={() => handleClone(d._id)}><CloneIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Instances */}
      <Typography variant="h6" gutterBottom>آخر التنفيذات ({instances.length})</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>سير العمل</TableCell><TableCell>الحالة</TableCell><TableCell>العقد الحالية</TableCell><TableCell>البدء</TableCell><TableCell>إجراءات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {instances.map(inst => (
              <TableRow key={inst._id} hover>
                <TableCell>{inst.definitionId?.nameAr || inst.definitionId?.name || '—'}</TableCell>
                <TableCell><Chip label={instLabels[inst.status] || inst.status} color={instColors[inst.status]} size="small" /></TableCell>
                <TableCell>{inst.currentNodes?.map(n => n.nodeId).join(', ') || '—'}</TableCell>
                <TableCell>{fmtDateTime(inst.startedAt)}</TableCell>
                <TableCell>
                  {inst.status === 'running' && <>
                    <Tooltip title="تعليق"><IconButton size="small" onClick={() => handleSuspend(inst._id)}><PauseIcon /></IconButton></Tooltip>
                    <Tooltip title="إلغاء"><IconButton size="small" color="error" onClick={() => handleCancel(inst._id)}><StopIcon /></IconButton></Tooltip>
                  </>}
                  {inst.status === 'suspended' && <Tooltip title="استئناف"><IconButton size="small" color="success" onClick={() => handleResume(inst._id)}><PlayIcon /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Start Dialog */}
      <Dialog open={startOpen} onClose={() => setStartOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تشغيل سير عمل</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>التعريف</InputLabel>
            <Select value={startDefId} label="التعريف" onChange={e => setStartDefId(e.target.value)}>
              {definitions.filter(d => d.status === 'active').map(d => <MenuItem key={d._id} value={d._id}>{d.nameAr || d.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleStart}>تشغيل</Button>
        </DialogActions>
      </Dialog>

      <WorkflowOrchestrator open={orchOpen} onClose={() => { setOrchOpen(false); setSelectedDef(null); }} definition={selectedDef} onSave={async (data) => { try { if (selectedDef) await workflowOrchApi.updateDef(selectedDef._id, data); else await workflowOrchApi.createDef(data); setOrchOpen(false); setSnack('تم الحفظ'); load(); } catch (e) { logger.error('save def', e); } }} />
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 4 — التحليل الجنائي
   ══════════════════════════════════════════════════════════ */
function ForensicsTab() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState('');
  const [integrityResult, setIntegrityResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([forensicsApi.getAlerts({ limit: 20 }), forensicsApi.getStats()]);
      setAlerts(a.data?.alerts || []);
      setStats(s.data);
    } catch (e) { logger.error('ForensicsTab', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleIntegrityCheck = async () => {
    if (!docId) return;
    try { const r = await forensicsApi.checkIntegrity({ documentId: docId, content: `doc-${docId}-${Date.now()}` }); setIntegrityResult(r.data); setSnack('تم فحص السلامة'); } catch (e) { logger.error('integrity', e); }
  };
  const handleAnalyze = async () => {
    if (!docId) return;
    try { const r = await forensicsApi.analyze(docId); setAnalysisResult(r.data); setSnack('تم التحليل'); } catch (e) { logger.error('analyze', e); }
  };
  const handleUpdateAlert = async (id, status) => { try { await forensicsApi.updateAlert(id, { status }); setSnack('تم التحديث'); load(); } catch (e) { logger.error('update alert', e); } };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const sevColor = { critical: '#f44336', high: '#ff5722', medium: '#ff9800', low: '#ffc107', info: '#2196f3' };
  const sevLabel = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض', info: 'معلومات' };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'السجلات', val: stats?.totalRecords || 0, color: '#1976d2' },
          { label: 'التنبيهات', val: stats?.totalAlerts || 0, color: '#ff9800' },
          { label: 'حرجة مفتوحة', val: stats?.criticalAlerts || 0, color: '#f44336' },
          { label: 'متوسط الخطورة', val: stats?.averageRiskScore || 0, color: '#9c27b0' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}><CardContent>
              <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>فحص مستند</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField size="small" label="معرف المستند" value={docId} onChange={e => setDocId(e.target.value)} sx={{ minWidth: 260 }} />
          <Button variant="contained" startIcon={<FingerprintIcon />} onClick={handleIntegrityCheck}>فحص السلامة</Button>
          <Button variant="outlined" startIcon={<AnalysisIcon />} onClick={handleAnalyze}>تحليل جنائي</Button>
        </Stack>

        {integrityResult && (
          <Alert severity={integrityResult.integrityStatus === 'verified' ? 'success' : 'error'} sx={{ mt: 2 }}>
            السلامة: <strong>{integrityResult.integrityStatus === 'verified' ? 'سليم' : 'مُتلاعب به'}</strong>
            {integrityResult.hashes?.sha256 && <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>SHA-256: {integrityResult.hashes.sha256.substring(0, 32)}...</Typography>}
          </Alert>
        )}

        {analysisResult && (
          <Box mt={2}>
            <Alert severity={analysisResult.riskScore > 60 ? 'error' : analysisResult.riskScore > 30 ? 'warning' : 'success'}>
              درجة الخطورة: <strong>{analysisResult.riskScore}/100</strong> | النتائج: {analysisResult.findings?.length || 0}
            </Alert>
            {analysisResult.findings?.map((f, i) => (
              <Alert key={i} severity={f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'warning' : 'info'} sx={{ mt: 0.5 }}>
                {f.titleAr || f.title}: {f.description}
              </Alert>
            ))}
          </Box>
        )}
      </Paper>

      {/* Alerts */}
      <Typography variant="h6" gutterBottom>التنبيهات ({alerts.length})</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>النوع</TableCell><TableCell>الخطورة</TableCell><TableCell>الوصف</TableCell>
            <TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell><TableCell>إجراءات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {alerts.map(a => (
              <TableRow key={a._id} hover sx={{ bgcolor: a.severity === 'critical' ? 'error.50' : 'inherit' }}>
                <TableCell>{a.alertType}</TableCell>
                <TableCell><Chip label={sevLabel[a.severity] || a.severity} size="small" sx={{ bgcolor: `${sevColor[a.severity]}20`, color: sevColor[a.severity] }} /></TableCell>
                <TableCell sx={{ maxWidth: 300 }}>{a.descriptionAr || a.description}</TableCell>
                <TableCell><Chip label={a.status === 'new' ? 'جديد' : a.status === 'investigating' ? 'تحقيق' : a.status === 'resolved' ? 'محلول' : a.status} size="small" /></TableCell>
                <TableCell>{fmtDateTime(a.createdAt)}</TableCell>
                <TableCell>
                  {a.status === 'new' && <Tooltip title="بدء تحقيق"><IconButton size="small" onClick={() => handleUpdateAlert(a._id, 'investigating')}><AnalysisIcon /></IconButton></Tooltip>}
                  {a.status === 'investigating' && <>
                    <Tooltip title="تأكيد"><IconButton size="small" color="error" onClick={() => handleUpdateAlert(a._id, 'confirmed')}><CheckIcon /></IconButton></Tooltip>
                    <Tooltip title="إنذار كاذب"><IconButton size="small" onClick={() => handleUpdateAlert(a._id, 'false_positive')}><CancelIcon /></IconButton></Tooltip>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {!alerts.length && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={3}>لا توجد تنبيهات</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════ */
const tabs = [
  { label: 'دورة الحياة', icon: <LifecycleIcon /> },
  { label: 'التوقيع الرقمي', icon: <CertIcon /> },
  { label: 'التصنيف الذكي', icon: <ClassifyIcon /> },
  { label: 'تنسيق سير العمل', icon: <WorkflowIcon /> },
  { label: 'التحليل الجنائي', icon: <ForensicsIcon /> },
];

export default function DocumentsProPhase9() {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => { getDashboard().then(r => setDashboard(r.data)).catch(() => {}); }, []);

  return (
    <Box dir="rtl" sx={{ p: { xs: 1, md: 3 } }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>إدارة المستندات المتقدمة — المرحلة التاسعة</Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>دورة حياة المستند • التوقيع الرقمي بالشهادات • التصنيف الذكي بالذكاء الاصطناعي • تنسيق سير العمل • التحليل الجنائي</Typography>
        {dashboard && (
          <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
            <Chip label={`${dashboard.lifecycle?.totalLifecycles || 0} دورة حياة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.digitalCert?.totalCertificates || 0} شهادة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.classification?.totalClassifications || 0} تصنيف`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.workflowOrch?.running || 0} سير عمل نشط`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.forensics?.criticalAlerts || 0} تنبيه حرج`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
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
        {tab === 0 && <LifecycleTab />}
        {tab === 1 && <DigitalCertTab />}
        {tab === 2 && <ClassificationTab />}
        {tab === 3 && <WorkflowOrchTab />}
        {tab === 4 && <ForensicsTab />}
      </Box>
    </Box>
  );
}
