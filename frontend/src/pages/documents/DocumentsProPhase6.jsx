/**
 * Documents Pro Phase 6 — لوحة تحكم المرحلة السادسة
 * OCR • الأرشفة والامتثال • محرك التقارير • بوابة البريد • المساعد الذكي
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Paper, Typography, Grid, Card, CardContent,
  Button, TextField, IconButton, Chip, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Switch, Tooltip, Badge, Avatar, LinearProgress, Snackbar,
  Table, TableHead, TableRow, TableCell, TableBody,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  DocumentScanner as OCRIcon,
  Archive as ArchiveIcon,
  Assessment as ReportIcon,
  Email as EmailIcon,
  SmartToy as AIIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  PlayArrow as RunIcon,
  Send as SendIcon,
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Gavel as LegalIcon,
  VerifiedUser as ComplianceIcon,
  Schedule as ScheduleIcon,
  ForwardToInbox as ForwardIcon,
  Psychology as BrainIcon,
  AutoFixHigh as AutoIcon,
  ContentCopy as DuplicateIcon,
  Summarize as SummarizeIcon,
  Category as ClassifyIcon,
  DataObject as ExtractIcon,
  Dashboard as DashIcon,
} from '@mui/icons-material';

import { ocrApi, archiveApi, reportApi, emailApi, aiApi, getDashboard }
  from '../../services/documentProPhase6Service';

/* ─── Tab Panel ──────────────────────────────────────────────── */
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

/* ═══════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════ */
export default function DocumentsProPhase6() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [dashboard, setDashboard] = useState(null);

  const showSnack = (message, severity = 'success') =>
    setSnack({ open: true, message, severity });

  useEffect(() => {
    getDashboard()
      .then((r) => setDashboard(r.data?.dashboard))
      .catch(() => {});
  }, []);

  return (
    <Box dir="rtl" sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        <DashIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        إدارة المستندات — المرحلة السادسة
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        OCR • الأرشفة والامتثال • محرك التقارير • بوابة البريد • المساعد الذكي
      </Typography>

      {/* Summary cards */}
      {dashboard && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'نتائج OCR', value: dashboard.ocr?.totalResults || 0, icon: <OCRIcon />, color: '#3b82f6' },
            { label: 'السجلات المؤرشفة', value: dashboard.archive?.totalRecords || 0, icon: <ArchiveIcon />, color: '#8b5cf6' },
            { label: 'التقارير المنفذة', value: dashboard.reports?.totalExecutions || 0, icon: <ReportIcon />, color: '#10b981' },
            { label: 'الرسائل', value: dashboard.email?.totalMessages || 0, icon: <EmailIcon />, color: '#f59e0b' },
            { label: 'تفاعلات AI', value: dashboard.ai?.totalInteractions || 0, icon: <AIIcon />, color: '#ef4444' },
          ].map((c, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card sx={{ border: `2px solid ${c.color}20`, borderRadius: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: `${c.color}15`, color: c.color, mx: 'auto', mb: 1, width: 48, height: 48 }}>
                    {c.icon}
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>{c.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<OCRIcon />} label="استخراج النصوص" iconPosition="start" />
          <Tab icon={<ArchiveIcon />} label="الأرشفة والامتثال" iconPosition="start" />
          <Tab icon={<ReportIcon />} label="محرك التقارير" iconPosition="start" />
          <Tab icon={<EmailIcon />} label="بوابة البريد" iconPosition="start" />
          <Tab icon={<AIIcon />} label="المساعد الذكي" iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          <TabPanel value={tab} index={0}>
            <OCRTab showSnack={showSnack} />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <ArchiveTab showSnack={showSnack} />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <ReportTab showSnack={showSnack} />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <EmailTab showSnack={showSnack} />
          </TabPanel>
          <TabPanel value={tab} index={4}>
            <AITab showSnack={showSnack} />
          </TabPanel>
        </Box>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OCR Tab — استخراج النصوص
   ═══════════════════════════════════════════════════════════════ */
function OCRTab({ showSnack }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ocrApi.getJobs({});
      setJobs(r.data?.jobs || []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const r = await ocrApi.search({ query: searchQuery });
      setSearchResults(r.data?.results || []);
    } catch {
      showSnack('فشل البحث', 'error');
    }
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<OCRIcon />}>
            استخراج النصوص من الصور والمستندات الممسوحة ضوئياً — دعم العربية والإنجليزية
          </Alert>
        </Grid>

        {/* Search OCR content */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom><SearchIcon sx={{ mr: 1 }} />بحث في نصوص OCR</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth size="small" placeholder="ابحث في النصوص المستخرجة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>بحث</Button>
            </Box>
            {searchResults.length > 0 && (
              <List dense sx={{ mt: 1 }}>
                {searchResults.map((r, i) => (
                  <ListItem key={i}>
                    <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                    <ListItemText primary={r.documentTitle || r.documentId} secondary={r.matchedText?.substring(0, 100)} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* OCR Jobs */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">مهام OCR</Typography>
              <IconButton onClick={loadJobs}><RefreshIcon /></IconButton>
            </Box>
            {loading ? <CircularProgress /> : (
              jobs.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>لا توجد مهام OCR حالياً</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المستند</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>اللغة</TableCell>
                      <TableCell>الثقة</TableCell>
                      <TableCell>التاريخ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.map((j, i) => (
                      <TableRow key={i}>
                        <TableCell>{j.documentId?.title || j.documentId}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={j.status === 'completed' ? 'مكتمل' : j.status === 'failed' ? 'فشل' : 'قيد المعالجة'}
                            color={j.status === 'completed' ? 'success' : j.status === 'failed' ? 'error' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>{j.language || '-'}</TableCell>
                        <TableCell>{j.confidence ? `${(j.confidence * 100).toFixed(0)}%` : '-'}</TableCell>
                        <TableCell>{j.createdAt ? new Date(j.createdAt).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Archive Tab — الأرشفة والامتثال
   ═══════════════════════════════════════════════════════════════ */
function ArchiveTab({ showSnack }) {
  const [policies, setPolicies] = useState([]);
  const [legalHolds, setLegalHolds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, hRes, sRes] = await Promise.all([
        archiveApi.getPolicies(),
        archiveApi.getLegalHolds({}),
        archiveApi.getStats(),
      ]);
      setPolicies(pRes.data?.policies || []);
      setLegalHolds(hRes.data?.holds || []);
      setStats(sRes.data?.stats || null);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<ComplianceIcon />}>
            أرشفة رقمية طويلة المدى مع ضمان الامتثال (GDPR, ISO 15489, SOX, NCA)
          </Alert>
        </Grid>

        {/* Stats */}
        {stats && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                { label: 'المؤرشفة', value: stats.totalRecords || 0, color: '#8b5cf6' },
                { label: 'التحقق ناجح', value: stats.integrityVerified || 0, color: '#10b981' },
                { label: 'تجميد قانوني', value: stats.activeLegalHolds || 0, color: '#ef4444' },
              ].map((s, i) => (
                <Grid item xs={4} key={i}>
                  <Card sx={{ textAlign: 'center', border: `2px solid ${s.color}20` }}>
                    <CardContent>
                      <Typography variant="h4" fontWeight={700} color={s.color}>{s.value}</Typography>
                      <Typography variant="caption">{s.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}

        {/* Policies */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom><ArchiveIcon sx={{ mr: 1 }} />سياسات الأرشفة</Typography>
            {loading ? <CircularProgress /> : (
              policies.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>لا توجد سياسات — سيتم إنشاء السياسات الافتراضية تلقائياً</Typography>
              ) : (
                <List dense>
                  {policies.map((p, i) => (
                    <ListItem key={i} divider>
                      <ListItemText
                        primary={p.nameAr || p.name}
                        secondary={`فترة الاحتفاظ: ${p.retentionPeriod?.value || '?'} ${p.retentionPeriod?.unit === 'years' ? 'سنة' : 'شهر'}`}
                      />
                      <Chip size="small" label={p.isActive ? 'نشط' : 'معطل'} color={p.isActive ? 'success' : 'default'} />
                    </ListItem>
                  ))}
                </List>
              )
            )}
          </Paper>
        </Grid>

        {/* Legal Holds */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom><LegalIcon sx={{ mr: 1 }} />التجميد القانوني</Typography>
            {legalHolds.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لا يوجد تجميد قانوني نشط</Typography>
            ) : (
              <List dense>
                {legalHolds.map((h, i) => (
                  <ListItem key={i} divider>
                    <ListItemText
                      primary={h.title}
                      secondary={`السبب: ${h.reason || '-'} | المستندات: ${h.documentIds?.length || 0}`}
                    />
                    <Chip
                      size="small"
                      label={h.status === 'active' ? 'نشط' : 'محرر'}
                      color={h.status === 'active' ? 'error' : 'default'}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Report Tab — محرك التقارير
   ═══════════════════════════════════════════════════════════════ */
function ReportTab({ showSnack }) {
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningTemplate, setRunningTemplate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, hRes] = await Promise.all([
        reportApi.getTemplates({}),
        reportApi.getHistory({}),
      ]);
      setTemplates(tRes.data?.templates || []);
      setHistory(hRes.data?.executions || []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRun = async (templateId) => {
    setRunningTemplate(templateId);
    try {
      await reportApi.runFromTemplate(templateId, {});
      showSnack('تم تنفيذ التقرير بنجاح');
      load();
    } catch {
      showSnack('فشل تنفيذ التقرير', 'error');
    }
    setRunningTemplate(null);
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<ReportIcon />}>
            محرك تقارير متقدم — 10 قوالب جاهزة • جدولة تلقائية • تصدير متعدد الصيغ
          </Alert>
        </Grid>

        {/* Templates */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>قوالب التقارير</Typography>
            {loading ? <CircularProgress /> : (
              <Grid container spacing={1}>
                {templates.map((t, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography fontWeight={600}>{t.nameAr || t.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.category} {t.isSystem ? '(نظام)' : ''}
                          </Typography>
                        </Box>
                        <Button
                          size="small" variant="contained" color="primary"
                          startIcon={runningTemplate === t._id ? <CircularProgress size={16} /> : <RunIcon />}
                          onClick={() => handleRun(t._id)}
                          disabled={!!runningTemplate}
                        >
                          تنفيذ
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* History */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>سجل التقارير</Typography>
            {history.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لم يتم تنفيذ أي تقرير بعد</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التقرير</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>النتائج</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{h.templateName || h.templateId}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={h.status === 'completed' ? 'مكتمل' : h.status === 'failed' ? 'فشل' : 'قيد التنفيذ'}
                          color={h.status === 'completed' ? 'success' : h.status === 'failed' ? 'error' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{h.resultCount || 0}</TableCell>
                      <TableCell>{h.createdAt ? new Date(h.createdAt).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      <TableCell>
                        <Tooltip title="تصدير">
                          <IconButton size="small"><DownloadIcon /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Email Tab — بوابة البريد
   ═══════════════════════════════════════════════════════════════ */
function EmailTab({ showSnack }) {
  const [messages, setMessages] = useState([]);
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendDialog, setSendDialog] = useState(false);
  const [sendForm, setSendForm] = useState({ to: '', subject: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes, tRes] = await Promise.all([
        emailApi.getMessages({}),
        emailApi.getRules({}),
        emailApi.getTemplates({}),
      ]);
      setMessages(mRes.data?.messages || []);
      setRules(rRes.data?.rules || []);
      setTemplates(tRes.data?.templates || []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    try {
      await emailApi.send({
        to: sendForm.to.split(',').map((e) => e.trim()),
        subject: sendForm.subject,
        body: sendForm.body,
      });
      showSnack('تم إرسال البريد بنجاح');
      setSendDialog(false);
      setSendForm({ to: '', subject: '', body: '' });
      load();
    } catch {
      showSnack('فشل الإرسال', 'error');
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      await emailApi.toggleRule(ruleId);
      showSnack('تم تحديث القاعدة');
      load();
    } catch { showSnack('فشل التحديث', 'error'); }
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<EmailIcon />}>
            إرسال واستقبال المستندات عبر البريد الإلكتروني — تتبع الفتح — قواعد إعادة التوجيه
          </Alert>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => setSendDialog(true)}>
            إرسال بريد جديد
          </Button>
        </Grid>

        {/* Messages */}
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الرسائل</Typography>
            {loading ? <CircularProgress /> : (
              messages.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>لا توجد رسائل</Typography>
              ) : (
                <List dense>
                  {messages.slice(0, 15).map((m, i) => (
                    <ListItem key={i} divider>
                      <ListItemIcon>
                        {m.direction === 'outbound' ? <SendIcon color="primary" /> : <ForwardIcon color="secondary" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={m.subject || '(بدون موضوع)'}
                        secondary={`إلى: ${m.to?.map((t) => t.email).join(', ') || '-'} | ${m.status}`}
                      />
                      <Chip
                        size="small"
                        label={m.status === 'sent' ? 'مرسل' : m.status === 'delivered' ? 'تم التسليم' : m.status === 'failed' ? 'فشل' : m.status}
                        color={m.status === 'sent' || m.status === 'delivered' ? 'success' : m.status === 'failed' ? 'error' : 'default'}
                      />
                    </ListItem>
                  ))}
                </List>
              )
            )}
          </Paper>
        </Grid>

        {/* Rules */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom><ForwardIcon sx={{ mr: 1 }} />قواعد التوجيه</Typography>
            {rules.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>لا توجد قواعد توجيه</Typography>
            ) : (
              <List dense>
                {rules.map((r, i) => (
                  <ListItem key={i} divider>
                    <ListItemText
                      primary={r.nameAr || r.name || `قاعدة ${i + 1}`}
                      secondary={r.trigger?.event}
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={r.isActive}
                        onChange={() => handleToggleRule(r._id)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Send Dialog */}
      <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إرسال بريد إلكتروني</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="dense" label="إلى (مفصولة بفاصلة)"
            value={sendForm.to}
            onChange={(e) => setSendForm((f) => ({ ...f, to: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="الموضوع"
            value={sendForm.subject}
            onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="المحتوى" multiline rows={4}
            value={sendForm.body}
            onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialog(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={handleSend}>إرسال</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI Tab — المساعد الذكي
   ═══════════════════════════════════════════════════════════════ */
function AITab({ showSnack }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [classifyText, setClassifyText] = useState('');
  const [classifyResult, setClassifyResult] = useState(null);
  const [summarizeText, setSummarizeText] = useState('');
  const [summarizeResult, setSummarizeResult] = useState(null);
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [activeAction, setActiveAction] = useState('chat');

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput;
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setLoading(true);
    try {
      const r = await aiApi.chat({ question });
      setChatMessages((prev) => [...prev, { role: 'ai', text: r.data?.answer || 'لم أجد إجابة' }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'حدث خطأ في المعالجة' }]);
    }
    setLoading(false);
  };

  const handleClassify = async () => {
    if (!classifyText.trim()) return;
    setLoading(true);
    try {
      const r = await aiApi.classify({ text: classifyText });
      setClassifyResult(r.data);
      showSnack('تم التصنيف بنجاح');
    } catch { showSnack('فشل التصنيف', 'error'); }
    setLoading(false);
  };

  const handleSummarize = async () => {
    if (!summarizeText.trim()) return;
    setLoading(true);
    try {
      const r = await aiApi.summarize({ text: summarizeText });
      setSummarizeResult(r.data);
      showSnack('تم التلخيص بنجاح');
    } catch { showSnack('فشل التلخيص', 'error'); }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!analyzeText.trim()) return;
    setLoading(true);
    try {
      const r = await aiApi.analyzeContent({ text: analyzeText });
      setAnalyzeResult(r.data?.analysis);
      showSnack('تم التحليل بنجاح');
    } catch { showSnack('فشل التحليل', 'error'); }
    setLoading(false);
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<BrainIcon />}>
            مساعد ذكي — محادثة • تصنيف تلقائي • تلخيص • استخراج بيانات • كشف التكرار • تحليل المحتوى
          </Alert>
        </Grid>

        {/* Action selector */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { key: 'chat', label: 'محادثة', icon: <ChatIcon /> },
              { key: 'classify', label: 'تصنيف', icon: <ClassifyIcon /> },
              { key: 'summarize', label: 'تلخيص', icon: <SummarizeIcon /> },
              { key: 'analyze', label: 'تحليل', icon: <ExtractIcon /> },
            ].map((a) => (
              <Chip
                key={a.key}
                icon={a.icon}
                label={a.label}
                onClick={() => setActiveAction(a.key)}
                color={activeAction === a.key ? 'primary' : 'default'}
                variant={activeAction === a.key ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Grid>

        {/* Chat */}
        {activeAction === 'chat' && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom><ChatIcon sx={{ mr: 1 }} />المحادثة الذكية</Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                {chatMessages.length === 0 && (
                  <Typography color="text.secondary" textAlign="center" py={3}>
                    اسألني أي سؤال عن المستندات — مثال: "كم مستند في النظام؟"
                  </Typography>
                )}
                {chatMessages.map((m, i) => (
                  <Box key={i} sx={{
                    display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 1
                  }}>
                    <Paper sx={{
                      p: 1.5, maxWidth: '75%',
                      bgcolor: m.role === 'user' ? 'primary.main' : 'grey.200',
                      color: m.role === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2,
                    }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
                    </Paper>
                  </Box>
                ))}
                {loading && <LinearProgress sx={{ mt: 1 }} />}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth size="small" placeholder="اكتب سؤالك هنا..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                />
                <Button variant="contained" onClick={handleChat} disabled={loading}>
                  <SendIcon />
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Classify */}
        {activeAction === 'classify' && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom><ClassifyIcon sx={{ mr: 1 }} />التصنيف التلقائي</Typography>
              <TextField
                fullWidth multiline rows={3} placeholder="الصق نص المستند هنا للتصنيف التلقائي..."
                value={classifyText}
                onChange={(e) => setClassifyText(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleClassify} disabled={loading} startIcon={<AutoIcon />}>
                تصنيف تلقائي
              </Button>
              {classifyResult?.classification && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.light' }}>
                  <Typography fontWeight={600}>
                    التصنيف: {classifyResult.classification.nameAr} ({(classifyResult.confidence * 100).toFixed(0)}%)
                  </Typography>
                  {classifyResult.alternatives?.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      بدائل: {classifyResult.alternatives.map((a) => `${a.nameAr} (${(a.confidence * 100).toFixed(0)}%)`).join(' • ')}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Summarize */}
        {activeAction === 'summarize' && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom><SummarizeIcon sx={{ mr: 1 }} />التلخيص التلقائي</Typography>
              <TextField
                fullWidth multiline rows={4} placeholder="الصق النص هنا للتلخيص..."
                value={summarizeText}
                onChange={(e) => setSummarizeText(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleSummarize} disabled={loading} startIcon={<SummarizeIcon />}>
                تلخيص
              </Button>
              {summarizeResult?.summary && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
                  <Typography fontWeight={600}>الملخص:</Typography>
                  <Typography variant="body2">{summarizeResult.summary}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    النص الأصلي: {summarizeResult.originalLength} حرف → الملخص: {summarizeResult.summaryLength} حرف
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Analyze */}
        {activeAction === 'analyze' && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom><ExtractIcon sx={{ mr: 1 }} />تحليل المحتوى</Typography>
              <TextField
                fullWidth multiline rows={3} placeholder="الصق النص هنا للتحليل..."
                value={analyzeText}
                onChange={(e) => setAnalyzeText(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleAnalyze} disabled={loading} startIcon={<ExtractIcon />}>
                تحليل
              </Button>
              {analyzeResult && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={1}>
                    {[
                      { label: 'اللغة', value: analyzeResult.language === 'arabic' ? 'عربي' : 'إنجليزي' },
                      { label: 'الكلمات', value: analyzeResult.wordCount },
                      { label: 'الجمل', value: analyzeResult.sentenceCount },
                      { label: 'سهولة القراءة', value: analyzeResult.readability },
                      { label: 'كلمات فريدة', value: analyzeResult.uniqueWords },
                    ].map((s, i) => (
                      <Grid item xs={6} sm={4} md={2.4} key={i}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                          <Typography variant="h6" fontWeight={700}>{s.value}</Typography>
                          <Typography variant="caption">{s.label}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  {analyzeResult.topWords?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">أكثر الكلمات تكراراً:</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                        {analyzeResult.topWords.slice(0, 10).map((w, i) => (
                          <Chip key={i} size="small" label={`${w.word} (${w.count})`} variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
