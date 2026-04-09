/**
 * Documents Pro Extended Dashboard — لوحة المستندات الاحترافية الموسعة
 * ═══════════════════════════════════════════════════════════════════════
 * المرحلة 2: التوقيع الرقمي، القوالب، الإصدارات، التدقيق، العمليات المجمعة
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Badge,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Draw as SignIcon,
  History as VersionIcon,
  Description as TemplateIcon,
  Security as AuditIcon,
  ContentCopy as BulkIcon,
  Dashboard as DashboardIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Article as ArticleIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import documentProExtService, {
  signatureApi,
  versionApi,
  templateApi,
  auditApi,
  bulkApi,
  extDashboard,
} from '../../services/documentProExtService';

// ── ألوان وتصنيفات ──────────────────────────────
const TAB_CONFIG = [
  { label: 'نظرة عامة', icon: <DashboardIcon />, key: 'overview' },
  { label: 'التوقيعات', icon: <SignIcon />, key: 'signatures' },
  { label: 'القوالب', icon: <TemplateIcon />, key: 'templates' },
  { label: 'التدقيق', icon: <AuditIcon />, key: 'audit' },
  { label: 'العمليات المجمعة', icon: <BulkIcon />, key: 'bulk' },
];

const STAT_CARDS = [
  { key: 'pendingSignatures', label: 'توقيعات معلقة', icon: <SignIcon />, color: '#FF9800', bg: '#FFF3E0' },
  { key: 'totalTemplates', label: 'القوالب المتاحة', icon: <TemplateIcon />, color: '#2196F3', bg: '#E3F2FD' },
  { key: 'auditLogs', label: 'سجلات التدقيق', icon: <AuditIcon />, color: '#9C27B0', bg: '#F3E5F5' },
  { key: 'suspiciousCount', label: 'أنشطة مشبوهة', icon: <WarningIcon />, color: '#F44336', bg: '#FFEBEE' },
];

export default function DocumentsProExtended() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [pendingSignatures, setPendingSignatures] = useState([]);
  const [bulkJobs, setBulkJobs] = useState([]);
  const [error, setError] = useState(null);

  // ── حوارات ──
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVars, setTemplateVars] = useState({});

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboard, tmplResult] = await Promise.all([
        extDashboard.get().catch(() => ({ dashboard: {} })),
        templateApi.getAll().catch(() => ({ templates: [] })),
      ]);

      setDashboardData(dashboard.dashboard || {});
      setTemplates(tmplResult.templates || []);
    } catch (err) {
      setError('فشل في تحميل لوحة المعلومات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabData = useCallback(async (tabKey) => {
    try {
      switch (tabKey) {
        case 'signatures':
          const sigResult = await signatureApi.getPending().catch(() => ({ signatures: [] }));
          setPendingSignatures(sigResult.signatures || []);
          break;
        case 'audit':
          const auditResult = await auditApi.getStats().catch(() => ({ stats: {} }));
          setAuditStats(auditResult.stats || {});
          break;
        case 'bulk':
          const bulkResult = await bulkApi.getJobs().catch(() => ({ jobs: [] }));
          setBulkJobs(bulkResult.jobs || []);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`خطأ في تحميل ${tabKey}:`, err);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    const tabKey = TAB_CONFIG[activeTab]?.key;
    if (tabKey && tabKey !== 'overview') {
      loadTabData(tabKey);
    }
  }, [activeTab, loadTabData]);

  // ── إنشاء مستند من قالب ──
  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const result = await templateApi.generate(selectedTemplate.id, {
        variables: templateVars,
        createDocument: true,
      });
      if (result.success) {
        setTemplateDialogOpen(false);
        setSelectedTemplate(null);
        setTemplateVars({});
      }
    } catch (err) {
      console.error('خطأ في إنشاء المستند:', err);
    }
  };

  // ── تهيئة القوالب الافتراضية ──
  const handleInitTemplates = async () => {
    try {
      await templateApi.initialize();
      const result = await templateApi.getAll();
      setTemplates(result.templates || []);
    } catch (err) {
      console.error('خطأ:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const stats = {
    pendingSignatures: dashboardData?.signatures?.pendingCount || 0,
    totalTemplates: dashboardData?.templates?.total || templates.length || 0,
    auditLogs: dashboardData?.audit?.totalLogs || 0,
    suspiciousCount: dashboardData?.audit?.suspiciousLogs || 0,
  };

  return (
    <Box sx={{ direction: 'rtl', p: 3 }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e' }}>
            🚀 إدارة المستندات المتقدمة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            التوقيع الرقمي • القوالب • الإصدارات • التدقيق • العمليات المجمعة
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDashboard}
        >
          تحديث
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STAT_CARDS.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.key}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: card.bg,
                borderRadius: 2,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: card.color, width: 48, height: 48 }}>
                  {card.icon}
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: card.color }}>
                    {stats[card.key] || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* التبويبات */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
        >
          {TAB_CONFIG.map((tab, i) => (
            <Tab key={tab.key} icon={tab.icon} label={tab.label} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ── نظرة عامة ── */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* القوالب السريعة */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      📄 القوالب الجاهزة
                    </Typography>
                    <Button size="small" startIcon={<PlayIcon />} onClick={handleInitTemplates}>
                      تهيئة القوالب
                    </Button>
                  </Box>
                  {templates.length > 0 ? (
                    <List dense>
                      {templates.slice(0, 5).map((tmpl) => (
                        <ListItem
                          key={tmpl.id}
                          sx={{ bgcolor: '#FAFAFA', borderRadius: 1, mb: 0.5, cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedTemplate(tmpl);
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: tmpl.category?.color || '#2196F3', width: 36, height: 36 }}>
                              <ArticleIcon sx={{ fontSize: 20 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={tmpl.name}
                            secondary={`${tmpl.category?.label || tmpl.category} • ${tmpl.variablesCount || 0} متغير`}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={`${tmpl.usageCount || 0} استخدام`}
                              size="small"
                              variant="outlined"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">
                      لا توجد قوالب — اضغط "تهيئة القوالب" لإنشاء القوالب الافتراضية
                    </Alert>
                  )}
                </Paper>
              </Grid>

              {/* التدقيق */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    🔒 سجل التدقيق
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">إجمالي السجلات</Typography>
                      <Chip label={dashboardData?.audit?.totalLogs || 0} color="primary" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">سجلات اليوم</Typography>
                      <Chip label={dashboardData?.audit?.todayLogs || 0} color="info" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">أنشطة مشبوهة</Typography>
                      <Chip
                        label={dashboardData?.audit?.suspiciousLogs || 0}
                        color={dashboardData?.audit?.suspiciousLogs > 0 ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">سلامة السلسلة</Typography>
                      <Chip
                        icon={<ShieldIcon />}
                        label="محمي"
                        color="success"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* العمليات المجمعة */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    📦 العمليات المجمعة
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">إجمالي المهام</Typography>
                      <Chip label={dashboardData?.bulk?.total || 0} size="small" />
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* التوقيعات */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    ✍️ التوقيعات
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">توقيعات معلقة</Typography>
                      <Chip
                        label={stats.pendingSignatures}
                        color={stats.pendingSignatures > 0 ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ── التوقيعات ── */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                التوقيعات المعلقة
              </Typography>
              {pendingSignatures.length > 0 ? (
                <List>
                  {pendingSignatures.map((sig, i) => (
                    <ListItem key={sig.id || i} sx={{ bgcolor: '#FFF3E0', borderRadius: 1, mb: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#FF9800' }}>
                          <SignIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={sig.documentTitle || 'مستند'}
                        secondary={`مطلوب بواسطة: ${sig.requestedBy || '-'}`}
                      />
                      <ListItemSecondaryAction>
                        <Button size="small" variant="contained" startIcon={<SignIcon />}>
                          وقّع
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="success">لا توجد توقيعات معلقة 🎉</Alert>
              )}
            </Box>
          )}

          {/* ── القوالب ── */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  القوالب المتاحة ({templates.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<PlayIcon />} onClick={handleInitTemplates}>
                    تهيئة الافتراضيات
                  </Button>
                  <Button size="small" variant="contained" startIcon={<AddIcon />}>
                    قالب جديد
                  </Button>
                </Stack>
              </Box>
              <Grid container spacing={2}>
                {templates.map((tmpl) => (
                  <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                      }}
                      onClick={() => {
                        setSelectedTemplate(tmpl);
                        setTemplateDialogOpen(true);
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Avatar sx={{ bgcolor: tmpl.category?.color || '#2196F3', width: 32, height: 32 }}>
                            <ArticleIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {tmpl.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {tmpl.description || 'بدون وصف'}
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          <Chip label={tmpl.category?.label || 'عام'} size="small" color="primary" variant="outlined" />
                          <Chip label={`${tmpl.variablesCount || 0} متغير`} size="small" variant="outlined" />
                          {tmpl.isSystem && <Chip label="نظام" size="small" color="secondary" />}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ── التدقيق ── */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                إحصائيات التدقيق
              </Typography>
              {auditStats ? (
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="primary" sx={{ fontWeight: 800 }}>
                        {auditStats.totalLogs || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">إجمالي السجلات</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="info.main" sx={{ fontWeight: 800 }}>
                        {auditStats.todayLogs || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">سجلات اليوم</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="warning.main" sx={{ fontWeight: 800 }}>
                        {auditStats.weekLogs || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">هذا الأسبوع</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="error.main" sx={{ fontWeight: 800 }}>
                        {auditStats.suspiciousLogs || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">مشبوهة</Typography>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <CircularProgress />
              )}
            </Box>
          )}

          {/* ── العمليات المجمعة ── */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                المهام المجمعة الأخيرة
              </Typography>
              {bulkJobs.length > 0 ? (
                <List>
                  {bulkJobs.map((job, i) => (
                    <ListItem key={job.jobId || i} sx={{ bgcolor: '#FAFAFA', borderRadius: 1, mb: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{
                          bgcolor: job.status === 'completed' ? '#4CAF50'
                            : job.status === 'failed' ? '#F44336'
                            : '#FF9800',
                        }}>
                          <BulkIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={job.jobTypeLabel || job.jobType}
                        secondary={`${job.successCount || 0}/${job.totalDocuments || 0} نجاح • ${new Date(job.createdAt).toLocaleDateString('ar-SA')}`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={
                            job.status === 'completed' ? 'مكتمل' :
                            job.status === 'failed' ? 'فشل' :
                            job.status === 'processing' ? 'جاري' : job.status
                          }
                          size="small"
                          color={
                            job.status === 'completed' ? 'success' :
                            job.status === 'failed' ? 'error' : 'warning'
                          }
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">لا توجد مهام مجمعة حتى الآن</Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── حوار إنشاء مستند من قالب ── */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { direction: 'rtl' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          إنشاء مستند من قالب: {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate?.description && (
            <Alert severity="info" sx={{ mb: 2 }}>{selectedTemplate.description}</Alert>
          )}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            تعبئة المتغيرات ({selectedTemplate?.requiredVariables || 0} مطلوبة من {selectedTemplate?.variablesCount || 0})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            اضغط "إنشاء" لتعبئة القالب بالقيم المدخلة وإنشاء مستند جديد
          </Typography>
          <Grid container spacing={2}>
            {(selectedTemplate?.variables || []).map((v) => (
              <Grid item xs={12} sm={6} key={v.key}>
                <TextField
                  fullWidth
                  label={`${v.label || v.key}${v.required ? ' *' : ''}`}
                  value={templateVars[v.key] || ''}
                  onChange={(e) => setTemplateVars({ ...templateVars, [v.key]: e.target.value })}
                  placeholder={v.placeholder || ''}
                  type={v.type === 'number' || v.type === 'currency' ? 'number' : 'text'}
                  multiline={v.type === 'textarea'}
                  rows={v.type === 'textarea' ? 3 : undefined}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)} color="inherit">إلغاء</Button>
          <Button variant="contained" onClick={handleGenerateFromTemplate} startIcon={<ArticleIcon />}>
            إنشاء المستند
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
