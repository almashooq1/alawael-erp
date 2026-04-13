/**
 * DocumentsProPhase7 — لوحة المرحلة السابعة
 * العلامات المائية • الاستيراد/التصدير • الامتثال • الرسم البياني المعرفي • الأتمتة
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Paper, Typography, Button, Chip, Grid, Card, CardContent,
  CardActions, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Stack, Badge, Snackbar, List, ListItem, ListItemIcon,
  ListItemText, Accordion, AccordionSummary, AccordionDetails, Slider,
  ToggleButton, ToggleButtonGroup, Autocomplete
} from '@mui/material';
import {
  BrandingWatermark as WatermarkIcon,
  ImportExport as ImportExportIcon,
  VerifiedUser as ComplianceIcon,
  AccountTree as GraphIcon,
  SmartToy as AutomationIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  ContentCopy as CopyIcon,
  Schedule as ScheduleIcon,
  Webhook as WebhookIcon,
  RuleFolder as RuleIcon,
  Timeline as TimelineIcon,
  Hub as HubIcon,
  ScannerOutlined as ScanIcon,
  AutoFixHigh as AutoFixIcon,
  Palette as PaletteIcon,
  TextFields as TextFieldsIcon,
  Image as ImageIcon,
  QrCode as QrCodeIcon,
  VisibilityOff as InvisibleIcon,
  FileDownload as ExportFileIcon,
  FileUpload as ImportFileIcon,
  DataObject as JsonIcon,
  TableChart as CsvIcon,
  Code as XmlIcon,
} from '@mui/icons-material';
import { watermarkApi, importExportApi, complianceApi, graphApi, automationApi, getDashboard } from '../../services/documentProPhase7Service';
import WatermarkDesigner from '../../components/documents/WatermarkDesigner';
import AutomationBuilder from '../../components/documents/AutomationBuilder';
import logger from '../../utils/logger';

/* ─── Style ──────────────────────────────────────────────── */
const cardSx = {
  borderRadius: 3, transition: 'box-shadow .2s',
  '&:hover': { boxShadow: 6 }
};
const statCard = (color) => ({
  ...cardSx,
  borderTop: `4px solid ${color}`,
  textAlign: 'center'
});

/* ─── Helper ─────────────────────────────────────────────── */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('ar-SA') : '—';

const severityColor = {
  critical: 'error', high: 'error', medium: 'warning', low: 'info',
};
const triggerLabels = {
  upload: 'رفع مستند', status_change: 'تغيير الحالة', date: 'تاريخ',
  approval: 'موافقة', keyword: 'كلمة مفتاحية', schedule: 'جدولة',
  manual: 'يدوي', webhook: 'ويب هوك',
};
const triggerIcons = {
  upload: <UploadIcon fontSize="small" />,
  status_change: <RefreshIcon fontSize="small" />,
  schedule: <ScheduleIcon fontSize="small" />,
  webhook: <WebhookIcon fontSize="small" />,
  manual: <PlayIcon fontSize="small" />,
};

/* ══════════════════════════════════════════════════════════════
   TAB 0 — العلامات المائية
   ══════════════════════════════════════════════════════════════ */
function WatermarkTab() {
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        watermarkApi.getProfiles(),
        watermarkApi.getStats(),
      ]);
      setProfiles(p.data?.profiles || []);
      setStats(s.data);
    } catch (e) { logger.error('WatermarkTab load', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveProfile = async (data) => {
    try {
      if (selectedProfile) {
        await watermarkApi.updateProfile(selectedProfile._id, data);
        setSnack('تم تحديث ملف العلامة المائية');
      } else {
        await watermarkApi.createProfile(data);
        setSnack('تم إنشاء ملف العلامة المائية');
      }
      setDesignerOpen(false);
      setSelectedProfile(null);
      load();
    } catch (e) { logger.error('Save profile', e); }
  };

  const handleDelete = async (id) => {
    try {
      await watermarkApi.deleteProfile(id);
      setSnack('تم حذف الملف');
      load();
    } catch (e) { logger.error('Delete profile', e); }
  };

  const handleVerify = async () => {
    if (!verifyCode) return;
    try {
      const r = await watermarkApi.verify(verifyCode);
      setVerifyResult(r.data);
    } catch {
      setVerifyResult({ valid: false });
    }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي التطبيقات', val: stats?.totalApplications || 0, color: '#1976d2' },
          { label: 'الملفات الشخصية', val: stats?.totalProfiles || 0, color: '#9c27b0' },
          { label: 'نشطة', val: stats?.activeProfiles || 0, color: '#4caf50' },
          { label: 'ملغاة', val: stats?.revokedCount || 0, color: '#f44336' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedProfile(null); setDesignerOpen(true); }}>
          إنشاء ملف علامة مائية
        </Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* Verify */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>التحقق من علامة مائية</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField size="small" label="رمز التتبع" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} sx={{ minWidth: 260 }} />
          <Button variant="outlined" startIcon={<SecurityIcon />} onClick={handleVerify}>تحقق</Button>
        </Stack>
        {verifyResult && (
          <Alert severity={verifyResult.valid ? 'success' : 'error'} sx={{ mt: 1 }}>
            {verifyResult.valid ? 'علامة مائية صالحة ✓' : 'علامة مائية غير صالحة ✗'}
          </Alert>
        )}
      </Paper>

      {/* Profiles */}
      <Typography variant="h6" gutterBottom>الملفات الشخصية ({profiles.length})</Typography>
      <Grid container spacing={2}>
        {profiles.map((p) => (
          <Grid item xs={12} md={6} lg={4} key={p._id}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight="bold">{p.name}</Typography>
                  <Chip
                    label={p.type === 'text' ? 'نص' : p.type === 'image' ? 'صورة' : p.type === 'qr' ? 'QR' : 'مخفي'}
                    size="small"
                    icon={p.type === 'text' ? <TextFieldsIcon /> : p.type === 'image' ? <ImageIcon /> : p.type === 'qr' ? <QrCodeIcon /> : <InvisibleIcon />}
                    color={p.type === 'text' ? 'primary' : p.type === 'image' ? 'secondary' : p.type === 'qr' ? 'info' : 'default'}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  الشفافية: {Math.round((p.settings?.opacity || 0.3) * 100)}% | الزاوية: {p.settings?.rotation || 0}°
                </Typography>
                <Chip label={p.isActive ? 'نشط' : 'معطل'} color={p.isActive ? 'success' : 'default'} size="small" />
              </CardContent>
              <CardActions>
                <Tooltip title="تعديل"><IconButton onClick={() => { setSelectedProfile(p); setDesignerOpen(true); }}><EditIcon /></IconButton></Tooltip>
                <Tooltip title="حذف"><IconButton color="error" onClick={() => handleDelete(p._id)}><DeleteIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Designer Dialog */}
      <WatermarkDesigner
        open={designerOpen}
        onClose={() => { setDesignerOpen(false); setSelectedProfile(null); }}
        onSave={handleSaveProfile}
        profile={selectedProfile}
      />

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 1 — الاستيراد والتصدير
   ══════════════════════════════════════════════════════════════ */
function ImportExportTab() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportForm, setExportForm] = useState({ format: 'json', documentIds: '' });
  const [importForm, setImportForm] = useState({ format: 'json', data: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, s] = await Promise.all([
        importExportApi.getJobs(),
        importExportApi.getStats(),
      ]);
      setJobs(j.data?.jobs || []);
      setStats(s.data);
    } catch (e) { logger.error('ImportExportTab load', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      const ids = exportForm.documentIds.split(',').map(s => s.trim()).filter(Boolean);
      await importExportApi.exportDocs({ format: exportForm.format, documentIds: ids });
      setSnack('تم بدء عملية التصدير');
      setExportOpen(false);
      load();
    } catch (e) { logger.error('Export', e); }
  };

  const handleImport = async () => {
    try {
      let parsedData;
      try { parsedData = JSON.parse(importForm.data); } catch { parsedData = importForm.data; }
      await importExportApi.importDocs({ format: importForm.format, data: parsedData });
      setSnack('تم بدء عملية الاستيراد');
      setImportOpen(false);
      load();
    } catch (e) { logger.error('Import', e); }
  };

  const handleCancel = async (id) => {
    try {
      await importExportApi.cancelJob(id);
      setSnack('تم إلغاء المهمة');
      load();
    } catch (e) { logger.error('Cancel job', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const statusColor = { pending: 'default', processing: 'info', completed: 'success', failed: 'error', cancelled: 'warning' };
  const statusLabel = { pending: 'قيد الانتظار', processing: 'جاري المعالجة', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي' };

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي المهام', val: stats?.totalJobs || 0, color: '#1976d2', icon: <ImportExportIcon /> },
          { label: 'تصدير', val: stats?.exportJobs || 0, color: '#4caf50', icon: <ExportFileIcon /> },
          { label: 'استيراد', val: stats?.importJobs || 0, color: '#ff9800', icon: <ImportFileIcon /> },
          { label: 'مكتملة', val: stats?.completedJobs || 0, color: '#9c27b0', icon: <CheckIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Stack direction="row" spacing={2} mb={3}>
        <Button startIcon={<ExportFileIcon />} variant="contained" color="success" onClick={() => setExportOpen(true)}>تصدير مستندات</Button>
        <Button startIcon={<ImportFileIcon />} variant="contained" color="warning" onClick={() => setImportOpen(true)}>استيراد مستندات</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* Jobs table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>النوع</TableCell>
              <TableCell>الصيغة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التقدم</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j._id} hover>
                <TableCell>
                  <Chip label={j.type === 'export' ? 'تصدير' : 'استيراد'} color={j.type === 'export' ? 'success' : 'warning'} size="small" />
                </TableCell>
                <TableCell>{j.format?.toUpperCase()}</TableCell>
                <TableCell><Chip label={statusLabel[j.status] || j.status} color={statusColor[j.status] || 'default'} size="small" /></TableCell>
                <TableCell sx={{ minWidth: 120 }}>
                  <LinearProgress variant="determinate" value={j.progress || 0} sx={{ borderRadius: 1 }} />
                  <Typography variant="caption">{j.progress || 0}%</Typography>
                </TableCell>
                <TableCell>{fmtDateTime(j.createdAt)}</TableCell>
                <TableCell>
                  {j.status === 'processing' && (
                    <Tooltip title="إلغاء"><IconButton size="small" color="error" onClick={() => handleCancel(j._id)}><StopIcon /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!jobs.length && (
              <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={3}>لا توجد مهام</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تصدير مستندات</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>الصيغة</InputLabel>
            <Select value={exportForm.format} label="الصيغة" onChange={(e) => setExportForm(p => ({ ...p, format: e.target.value }))}>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="xml">XML</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={3} label="معرفات المستندات (مفصولة بفاصلة)" value={exportForm.documentIds} onChange={(e) => setExportForm(p => ({ ...p, documentIds: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleExport}>تصدير</Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>استيراد مستندات</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>الصيغة</InputLabel>
            <Select value={importForm.format} label="الصيغة" onChange={(e) => setImportForm(p => ({ ...p, format: e.target.value }))}>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="xml">XML</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={6} label="البيانات" value={importForm.data} onChange={(e) => setImportForm(p => ({ ...p, data: e.target.value }))} placeholder='[{"title": "مستند 1", ...}]' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleImport}>استيراد</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 2 — مراقبة الامتثال
   ══════════════════════════════════════════════════════════════ */
function ComplianceTab() {
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name: '', description: '', category: 'data_integrity', severity: 'medium', conditions: '{}', autoRemediate: false });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a, h] = await Promise.all([
        complianceApi.getRules(),
        complianceApi.getAlerts({ limit: 20 }),
        complianceApi.getHealth(),
      ]);
      setRules(r.data?.rules || []);
      setAlerts(a.data?.alerts || []);
      setHealth(h.data);
    } catch (e) { logger.error('ComplianceTab load', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRunScan = async () => {
    try {
      await complianceApi.runScan({});
      setSnack('تم بدء الفحص');
      setTimeout(load, 2000);
    } catch (e) { logger.error('RunScan', e); }
  };

  const handleToggleRule = async (id) => {
    try {
      await complianceApi.toggleRule(id);
      load();
    } catch (e) { logger.error('ToggleRule', e); }
  };

  const handleResolve = async (id) => {
    try {
      await complianceApi.resolveAlert(id, { resolution: 'تم الحل' });
      setSnack('تم حل التنبيه');
      load();
    } catch (e) { logger.error('Resolve', e); }
  };

  const handleCreateRule = async () => {
    try {
      let conds;
      try { conds = JSON.parse(ruleForm.conditions); } catch { conds = {}; }
      await complianceApi.createRule({ ...ruleForm, conditions: conds });
      setSnack('تم إنشاء القاعدة');
      setRuleOpen(false);
      load();
    } catch (e) { logger.error('CreateRule', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const score = health?.overallScore ?? 0;
  const scoreColor = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#f44336';

  return (
    <Box>
      {/* Health Overview */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: `linear-gradient(135deg, ${scoreColor}11, ${scoreColor}22)` }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4} textAlign="center">
            <Box position="relative" display="inline-flex">
              <CircularProgress variant="determinate" value={score} size={120} thickness={6} sx={{ color: scoreColor }} />
              <Box position="absolute" top={0} left={0} bottom={0} right={0} display="flex" alignItems="center" justifyContent="center">
                <Typography variant="h3" fontWeight="bold" color={scoreColor}>{score}%</Typography>
              </Box>
            </Box>
            <Typography variant="h6" mt={1}>نقاط الامتثال</Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {[
                { label: 'إجمالي المستندات', val: health?.totalDocuments || 0, color: '#1976d2' },
                { label: 'متوافقة', val: health?.compliantDocuments || 0, color: '#4caf50' },
                { label: 'تنبيهات مفتوحة', val: health?.openAlerts || 0, color: '#f44336' },
                { label: 'قواعد نشطة', val: health?.activeRules || 0, color: '#9c27b0' },
              ].map((s, i) => (
                <Grid item xs={6} key={i}>
                  <Card sx={statCard(s.color)}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="h5" fontWeight="bold">{s.val}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Actions */}
      <Stack direction="row" spacing={2} mb={3}>
        <Button startIcon={<ScanIcon />} variant="contained" color="error" onClick={handleRunScan}>تشغيل فحص الامتثال</Button>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setRuleOpen(true)}>إضافة قاعدة</Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* Alerts */}
      <Typography variant="h6" gutterBottom>التنبيهات الأخيرة ({alerts.length})</Typography>
      <Stack spacing={1} mb={3}>
        {alerts.slice(0, 10).map((a) => (
          <Alert
            key={a._id}
            severity={severityColor[a.severity] || 'info'}
            action={
              a.status === 'open' && (
                <Button size="small" color="inherit" onClick={() => handleResolve(a._id)}>حل</Button>
              )
            }
          >
            <Typography variant="subtitle2">{a.ruleName || 'قاعدة'}</Typography>
            <Typography variant="body2">{a.message}</Typography>
            <Typography variant="caption" color="text.secondary">{fmtDateTime(a.createdAt)}</Typography>
          </Alert>
        ))}
        {!alerts.length && <Typography color="text.secondary" textAlign="center" py={2}>لا توجد تنبيهات</Typography>}
      </Stack>

      {/* Rules */}
      <Typography variant="h6" gutterBottom>قواعد الامتثال ({rules.length})</Typography>
      <Grid container spacing={2}>
        {rules.map((r) => (
          <Grid item xs={12} md={6} key={r._id}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight="bold">{r.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip label={r.severity} color={severityColor[r.severity] || 'default'} size="small" />
                    <Chip label={r.category} size="small" variant="outlined" />
                  </Stack>
                </Stack>
                <Typography variant="body2" color="text.secondary">{r.description}</Typography>
              </CardContent>
              <CardActions>
                <FormControlLabel
                  control={<Switch checked={r.isActive} onChange={() => handleToggleRule(r._id)} size="small" />}
                  label={r.isActive ? 'نشطة' : 'معطلة'}
                />
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* New Rule Dialog */}
      <Dialog open={ruleOpen} onClose={() => setRuleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة قاعدة امتثال</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="الاسم" value={ruleForm.name} onChange={(e) => setRuleForm(p => ({ ...p, name: e.target.value }))} />
            <TextField fullWidth label="الوصف" multiline rows={2} value={ruleForm.description} onChange={(e) => setRuleForm(p => ({ ...p, description: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select value={ruleForm.category} label="الفئة" onChange={(e) => setRuleForm(p => ({ ...p, category: e.target.value }))}>
                <MenuItem value="data_integrity">سلامة البيانات</MenuItem>
                <MenuItem value="access_control">التحكم بالوصول</MenuItem>
                <MenuItem value="retention">الاحتفاظ</MenuItem>
                <MenuItem value="naming">التسمية</MenuItem>
                <MenuItem value="metadata">البيانات الوصفية</MenuItem>
                <MenuItem value="security">الأمان</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الخطورة</InputLabel>
              <Select value={ruleForm.severity} label="الخطورة" onChange={(e) => setRuleForm(p => ({ ...p, severity: e.target.value }))}>
                <MenuItem value="critical">حرج</MenuItem>
                <MenuItem value="high">عالي</MenuItem>
                <MenuItem value="medium">متوسط</MenuItem>
                <MenuItem value="low">منخفض</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={ruleForm.autoRemediate} onChange={(e) => setRuleForm(p => ({ ...p, autoRemediate: e.target.checked }))} />}
              label="إصلاح تلقائي"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateRule}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 3 — الرسم البياني المعرفي
   ══════════════════════════════════════════════════════════════ */
function KnowledgeGraphTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await graphApi.getStats();
      setStats(s.data);
    } catch (e) { logger.error('KnowledgeGraphTab load', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDocGraph = async () => {
    if (!docId) return;
    try {
      const [g, i, r] = await Promise.all([
        graphApi.getDocumentGraph(docId),
        graphApi.analyzeImpact(docId),
        graphApi.getRecommendations(docId),
      ]);
      setGraphData(g.data);
      setImpactData(i.data);
      setRecommendations(r.data);
    } catch (e) { logger.error('LoadDocGraph', e); }
  };

  const handleAutoDiscover = async () => {
    if (!docId) return;
    try {
      await graphApi.autoDiscover(docId);
      setSnack('تم اكتشاف العلاقات تلقائياً');
      loadDocGraph();
    } catch (e) { logger.error('AutoDiscover', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'العقد', val: stats?.totalNodes || 0, color: '#1976d2', icon: <HubIcon /> },
          { label: 'الروابط', val: stats?.totalEdges || 0, color: '#9c27b0', icon: <TimelineIcon /> },
          { label: 'المجموعات', val: stats?.clusters || 0, color: '#4caf50', icon: <GraphIcon /> },
          { label: 'الكثافة', val: `${((stats?.density || 0) * 100).toFixed(1)}%`, color: '#ff9800', icon: <AssessmentIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Document Graph Lookup */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>استكشاف الرسم البياني</Typography>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <TextField size="small" label="معرف المستند" value={docId} onChange={(e) => setDocId(e.target.value)} sx={{ minWidth: 280 }} />
          <Button variant="contained" startIcon={<GraphIcon />} onClick={loadDocGraph}>عرض الرسم</Button>
          <Button variant="outlined" startIcon={<AutoFixIcon />} onClick={handleAutoDiscover}>اكتشاف تلقائي</Button>
        </Stack>

        {graphData && (
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>العقد المرتبطة ({graphData.nodes?.length || 0})</Typography>
            <Grid container spacing={1} mb={2}>
              {(graphData.nodes || []).slice(0, 12).map((n, i) => (
                <Grid item xs={6} md={4} lg={3} key={i}>
                  <Card variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>{n.label || n.documentId}</Typography>
                    <Typography variant="caption" color="text.secondary">{n.type || 'مستند'}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle1" fontWeight="bold" mb={1}>الروابط ({graphData.edges?.length || 0})</Typography>
            <Stack spacing={0.5} mb={2}>
              {(graphData.edges || []).slice(0, 8).map((e, i) => (
                <Chip key={i} label={`${e.sourceLabel || e.source} → ${e.targetLabel || e.target} (${e.type})`} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}

        {impactData && (
          <Box mt={2}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>تحليل التأثير</Typography>
            <Alert severity={impactData.impactLevel === 'high' ? 'error' : impactData.impactLevel === 'medium' ? 'warning' : 'info'}>
              مستوى التأثير: {impactData.impactLevel || 'منخفض'} | المستندات المتأثرة: {impactData.affectedDocuments || 0}
            </Alert>
          </Box>
        )}

        {recommendations && (
          <Box mt={2}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>التوصيات</Typography>
            <List dense>
              {(recommendations.recommendations || []).slice(0, 5).map((r, i) => (
                <ListItem key={i}>
                  <ListItemIcon><AutoFixIcon color="primary" /></ListItemIcon>
                  <ListItemText primary={r.title || r.documentTitle} secondary={r.reason || `درجة: ${r.score}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Edge Types */}
      {stats?.edgeTypes && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>أنواع الروابط</Typography>
          <Grid container spacing={1}>
            {Object.entries(stats.edgeTypes).map(([type, count]) => (
              <Grid item xs={6} md={3} key={type}>
                <Chip label={`${type}: ${count}`} variant="outlined" sx={{ width: '100%' }} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 4 — الأتمتة
   ══════════════════════════════════════════════════════════════ */
function AutomationTab() {
  const [rules, setRules] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e, s] = await Promise.all([
        automationApi.getRules(),
        automationApi.getExecutions({ limit: 20 }),
        automationApi.getStats(),
      ]);
      setRules(r.data?.rules || []);
      setExecutions(e.data?.executions || []);
      setStats(s.data);
    } catch (e) { logger.error('AutomationTab load', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveRule = async (data) => {
    try {
      if (selectedRule) {
        await automationApi.updateRule(selectedRule._id, data);
        setSnack('تم تحديث قاعدة الأتمتة');
      } else {
        await automationApi.createRule(data);
        setSnack('تم إنشاء قاعدة الأتمتة');
      }
      setBuilderOpen(false);
      setSelectedRule(null);
      load();
    } catch (e) { logger.error('SaveRule', e); }
  };

  const handleToggle = async (id) => {
    try {
      await automationApi.toggleRule(id);
      load();
    } catch (e) { logger.error('ToggleRule', e); }
  };

  const handleDelete = async (id) => {
    try {
      await automationApi.deleteRule(id);
      setSnack('تم حذف القاعدة');
      load();
    } catch (e) { logger.error('DeleteRule', e); }
  };

  const handleExecute = async (id) => {
    try {
      await automationApi.executeRule(id, {});
      setSnack('تم تنفيذ القاعدة');
      setTimeout(load, 1500);
    } catch (e) { logger.error('ExecuteRule', e); }
  };

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي القواعد', val: stats?.totalRules || 0, color: '#1976d2' },
          { label: 'نشطة', val: stats?.activeRules || 0, color: '#4caf50' },
          { label: 'إجمالي التنفيذات', val: stats?.totalExecutions || 0, color: '#9c27b0' },
          { label: 'ناجحة', val: stats?.successfulExecutions || 0, color: '#ff9800' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={statCard(s.color)}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">{s.val}</Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Stack direction="row" spacing={2} mb={3}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedRule(null); setBuilderOpen(true); }}>
          إنشاء قاعدة أتمتة
        </Button>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>تحديث</Button>
      </Stack>

      {/* Rules */}
      <Typography variant="h6" gutterBottom>قواعد الأتمتة ({rules.length})</Typography>
      <Grid container spacing={2} mb={3}>
        {rules.map((r) => (
          <Grid item xs={12} md={6} key={r._id}>
            <Card sx={{ ...cardSx, borderRight: `4px solid ${r.isActive ? '#4caf50' : '#bdbdbd'}` }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight="bold">{r.name}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Chip
                      label={triggerLabels[r.trigger?.event] || r.trigger?.event}
                      size="small"
                      icon={triggerIcons[r.trigger?.event]}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip label={`${r.actions?.length || 0} إجراء`} size="small" color="secondary" variant="outlined" />
                  </Stack>
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={1}>{r.description}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`نفذت ${r.executionCount || 0} مرة`} size="small" variant="outlined" />
                  {r.lastExecution && <Chip label={`آخر: ${fmtDateTime(r.lastExecution)}`} size="small" variant="outlined" />}
                </Stack>
              </CardContent>
              <CardActions>
                <FormControlLabel
                  control={<Switch checked={r.isActive} onChange={() => handleToggle(r._id)} size="small" />}
                  label={r.isActive ? 'نشطة' : 'معطلة'}
                />
                <Box flex={1} />
                <Tooltip title="تنفيذ يدوي"><IconButton color="primary" onClick={() => handleExecute(r._id)}><PlayIcon /></IconButton></Tooltip>
                <Tooltip title="تعديل"><IconButton onClick={() => { setSelectedRule(r); setBuilderOpen(true); }}><EditIcon /></IconButton></Tooltip>
                <Tooltip title="حذف"><IconButton color="error" onClick={() => handleDelete(r._id)}><DeleteIcon /></IconButton></Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {!rules.length && (
          <Grid item xs={12}><Typography color="text.secondary" textAlign="center" py={3}>لا توجد قواعد أتمتة</Typography></Grid>
        )}
      </Grid>

      {/* Execution History */}
      <Typography variant="h6" gutterBottom>سجل التنفيذ</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>القاعدة</TableCell>
              <TableCell>المشغل</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المدة</TableCell>
              <TableCell>التاريخ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {executions.map((e) => (
              <TableRow key={e._id} hover>
                <TableCell>{e.ruleName || '—'}</TableCell>
                <TableCell>{triggerLabels[e.trigger] || e.trigger}</TableCell>
                <TableCell>
                  <Chip
                    label={e.status === 'success' ? 'نجاح' : e.status === 'failed' ? 'فشل' : e.status === 'running' ? 'جاري' : e.status}
                    color={e.status === 'success' ? 'success' : e.status === 'failed' ? 'error' : 'info'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{e.duration ? `${e.duration}ms` : '—'}</TableCell>
                <TableCell>{fmtDateTime(e.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!executions.length && (
              <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={3}>لا يوجد سجل</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Builder Dialog */}
      <AutomationBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setSelectedRule(null); }}
        onSave={handleSaveRule}
        rule={selectedRule}
      />

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN — المرحلة السابعة
   ══════════════════════════════════════════════════════════════ */
const tabs = [
  { label: 'العلامات المائية', icon: <WatermarkIcon /> },
  { label: 'الاستيراد والتصدير', icon: <ImportExportIcon /> },
  { label: 'مراقبة الامتثال', icon: <ComplianceIcon /> },
  { label: 'الرسم البياني المعرفي', icon: <GraphIcon /> },
  { label: 'الأتمتة', icon: <AutomationIcon /> },
];

export default function DocumentsProPhase7() {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    getDashboard().then(r => setDashboard(r.data)).catch(() => {});
  }, []);

  return (
    <Box dir="rtl" sx={{ p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          إدارة المستندات المتقدمة — المرحلة السابعة
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          العلامات المائية • الاستيراد والتصدير • مراقبة الامتثال • الرسم البياني المعرفي • أتمتة العمليات
        </Typography>
        {dashboard && (
          <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
            <Chip label={`${dashboard.watermark?.profiles || 0} ملف علامة مائية`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.importExport?.totalJobs || 0} مهمة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.compliance?.score || 0}% امتثال`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.graph?.nodes || 0} عقدة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
            <Chip label={`${dashboard.automation?.rules || 0} قاعدة أتمتة`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
          </Stack>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { minHeight: 64, fontWeight: 'bold' } }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Content */}
      <Box>
        {tab === 0 && <WatermarkTab />}
        {tab === 1 && <ImportExportTab />}
        {tab === 2 && <ComplianceTab />}
        {tab === 3 && <KnowledgeGraphTab />}
        {tab === 4 && <AutomationTab />}
      </Box>
    </Box>
  );
}
