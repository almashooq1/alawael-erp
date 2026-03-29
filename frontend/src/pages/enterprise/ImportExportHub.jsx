/**
 * ImportExportHub — مركز الاستيراد والتصدير الاحترافي
 * =====================================================
 * Professional Import/Export Management Center
 *
 * Features:
 * - Dashboard with statistics
 * - Export wizard with format selection
 * - Import wizard with preview & validation
 * - Job history & tracking
 * - Template management
 * - Module browser
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, CardActions,
  Button, IconButton, Tabs, Tab, Chip, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, StepContent,
  LinearProgress, CircularProgress, Alert, AlertTitle,
  Tooltip, Divider, Badge, Avatar, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails,
  Fade, Collapse, InputAdornment, Select, FormControl, InputLabel,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  Description as FileIcon,
  Assessment as StatsIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Replay as RetryIcon,
  Cancel as CancelIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandIcon,
  FileCopy as TemplateIcon,
  ViewModule as ModuleIcon,
  GetApp as GetAppIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Code as JsonIcon,
  TextSnippet as CsvIcon,
  Archive as ZipIcon,
  DataObject as XmlIcon,
  Storage as DataIcon,
  TrendingUp as TrendIcon,
  Speed as SpeedIcon,
  Visibility as PreviewIcon,
  Map as MapIcon,
  PlayArrow as RunIcon,
  DoneAll as DoneAllIcon,
  FolderOpen as FolderIcon,
  SwapHoriz as SwapIcon,
  ArrowForward as ArrowIcon,
  ArrowBack as BackIcon,
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon,
  Timer as TimerIcon,
  SelectAll as SelectAllIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  DonutLarge as DonutIcon,
  AutoFixHigh as AutoFixIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import importExportProService from '../../services/importExportPro.service';

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────
const FORMAT_CONFIG = {
  xlsx: { label: 'Excel (XLSX)', icon: <ExcelIcon />, color: '#217346' },
  csv: { label: 'CSV', icon: <CsvIcon />, color: '#FF9800' },
  json: { label: 'JSON', icon: <JsonIcon />, color: '#607D8B' },
  pdf: { label: 'PDF', icon: <PdfIcon />, color: '#F44336' },
  xml: { label: 'XML', icon: <XmlIcon />, color: '#9C27B0' },
  docx: { label: 'Word (DOCX)', icon: <FileIcon />, color: '#2B579A' },
  zip: { label: 'ZIP Bundle', icon: <ZipIcon />, color: '#795548' },
};

const STATUS_CONFIG = {
  completed: { label: 'مكتمل', color: 'success', icon: <SuccessIcon /> },
  processing: { label: 'قيد التنفيذ', color: 'info', icon: <CircularProgress size={16} /> },
  failed: { label: 'فشل', color: 'error', icon: <ErrorIcon /> },
  partial: { label: 'جزئي', color: 'warning', icon: <WarningIcon /> },
  pending: { label: 'في الانتظار', color: 'default', icon: <InfoIcon /> },
  cancelled: { label: 'ملغى', color: 'default', icon: <CancelIcon /> },
  validating: { label: 'التحقق', color: 'info', icon: <CircularProgress size={16} /> },
  queued: { label: 'في الطابور', color: 'default', icon: <InfoIcon /> },
};

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────
export default function ImportExportHub() {
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [stats, setStats] = useState(null);

  // Modules
  const [modules, setModules] = useState([]);

  // Jobs
  const [jobs, setJobs] = useState({ jobs: [], total: 0 });
  const [jobFilters, setJobFilters] = useState({ type: '', status: '', page: 1 });

  // Templates
  const [templates, setTemplates] = useState({ templates: [], total: 0 });

  // Scheduled exports
  const [scheduledExports, setScheduledExports] = useState({ jobs: [], total: 0 });

  // Module fields (for field selection in export)
  const [moduleFields, setModuleFields] = useState([]);

  // Transform rules
  const [transformRules, setTransformRules] = useState([]);

  // Data quality
  const [qualityReport, setQualityReport] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  // SSE Progress tracking
  const [liveProgress, setLiveProgress] = useState(null);

  // Export wizard
  const [exportDialog, setExportDialog] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [exportConfig, setExportConfig] = useState({
    module: '', format: 'xlsx', fields: [], query: {},
    options: { language: 'both', includeHeaders: true },
  });
  const [exportPreview, setExportPreview] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Import wizard
  const [importDialog, setImportDialog] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [importConfig, setImportConfig] = useState({
    module: '', file: null, columnMappings: [],
    options: { mode: 'insert', skipDuplicates: true, validateOnly: false },
  });
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // ─── Data Loading ───
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, modulesRes] = await Promise.all([
        importExportProService.getStatistics().catch(() => ({ data: { data: null } })),
        importExportProService.listModules().catch(() => ({ data: { data: [] } })),
      ]);
      setStats(statsRes?.data?.data || statsRes?.data || null);
      setModules(modulesRes?.data?.data || modulesRes?.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const res = await importExportProService.listJobs(jobFilters);
      setJobs(res?.data?.data || res?.data || { jobs: [], total: 0 });
    } catch (err) {
      console.error('Jobs load error:', err);
    }
  }, [jobFilters]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await importExportProService.listTemplates();
      setTemplates(res?.data?.data || res?.data || { templates: [], total: 0 });
    } catch (err) {
      console.error('Templates load error:', err);
    }
  }, []);

  const loadScheduledExports = useCallback(async () => {
    try {
      const res = await importExportProService.listScheduledExports();
      setScheduledExports(res?.data?.data || res?.data || { jobs: [], total: 0 });
    } catch (err) {
      console.error('Scheduled exports load error:', err);
    }
  }, []);

  const loadModuleFields = useCallback(async (module) => {
    if (!module) { setModuleFields([]); return; }
    try {
      const res = await importExportProService.getModuleFields(module);
      setModuleFields(res?.data?.data?.fields || res?.data?.fields || []);
    } catch (err) {
      console.error('Module fields load error:', err);
      setModuleFields([]);
    }
  }, []);

  const loadTransformRules = useCallback(async () => {
    try {
      const res = await importExportProService.listTransformRules();
      setTransformRules(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error('Transform rules load error:', err);
    }
  }, []);

  const handleGenerateQualityReport = useCallback(async (file, module) => {
    if (!file || !module) return;
    try {
      setQualityLoading(true);
      const res = await importExportProService.generateQualityReport(file, module);
      setQualityReport(res?.data?.data || res?.data || null);
    } catch (err) {
      console.error('Quality report error:', err);
      showSnackbar('خطأ في تقرير الجودة', 'error');
    } finally {
      setQualityLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (activeTab === 2) loadJobs(); }, [activeTab, loadJobs]);
  useEffect(() => { if (activeTab === 3) loadTemplates(); }, [activeTab, loadTemplates]);
  useEffect(() => { if (activeTab === 4) loadScheduledExports(); }, [activeTab, loadScheduledExports]);

  // ─── Export Functions ───
  const handleExportPreview = async () => {
    if (!exportConfig.module) {
      showSnackbar('اختر الوحدة أولاً', 'warning');
      return;
    }
    try {
      setExportLoading(true);
      const res = await importExportProService.previewExport({
        module: exportConfig.module,
        fields: exportConfig.fields,
        query: exportConfig.query,
      });
      setExportPreview(res?.data?.data || res?.data || null);
      setExportStep(1);
    } catch (err) {
      showSnackbar('خطأ في معاينة البيانات: ' + (err.message || ''), 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExecute = async () => {
    try {
      setExportLoading(true);
      const res = await importExportProService.createExport({
        module: exportConfig.module,
        format: exportConfig.format,
        fields: exportConfig.fields,
        options: exportConfig.options,
      });

      // Extract jobId from response headers for SSE progress
      const jobId = res.headers?.['x-job-id'];
      if (jobId) {
        setLiveProgress({ status: 'processing', progress: { percentage: 0, processed: 0, total: 0 } });
        importExportProService.streamProgress(jobId, {
          onProgress: (data) => setLiveProgress(data),
          onDone: (data) => {
            setLiveProgress({ ...data, progress: { percentage: 100 } });
            setTimeout(() => setLiveProgress(null), 5000);
          },
          onError: () => setLiveProgress(null),
        });
      }

      // Trigger download
      const ext = exportConfig.format;
      const fileName = `${exportConfig.module}_export.${ext}`;
      importExportProService.triggerDownload(res.data || res, fileName);

      showSnackbar('تم التصدير بنجاح!', 'success');
      setExportDialog(false);
      setExportStep(0);
      loadJobs();
    } catch (err) {
      showSnackbar('خطأ في التصدير: ' + (err.message || ''), 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkExport = async () => {
    const selectedModules = modules
      .filter(m => exportConfig._bulkSelected?.includes(m.key))
      .map(m => m.key);

    if (selectedModules.length === 0) {
      showSnackbar('اختر وحدة واحدة على الأقل', 'warning');
      return;
    }

    try {
      setExportLoading(true);
      const res = await importExportProService.bulkExport({
        modules: selectedModules,
        format: exportConfig.format,
      });
      importExportProService.triggerDownload(res.data || res, 'bulk_export.zip');
      showSnackbar(`تم تصدير ${selectedModules.length} وحدات بنجاح!`, 'success');
    } catch (err) {
      showSnackbar('خطأ في التصدير الشامل', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // ─── Import Functions ───
  const handleImportFileParse = async () => {
    if (!importConfig.file || !importConfig.module) {
      showSnackbar('اختر الملف والوحدة', 'warning');
      return;
    }
    try {
      setImportLoading(true);
      const res = await importExportProService.parseImportFile(
        importConfig.file,
        importConfig.module,
      );
      const data = res?.data?.data || res?.data || {};
      setImportPreview(data);
      setImportConfig(prev => ({
        ...prev,
        columnMappings: data.suggestedMappings || [],
      }));
      setImportStep(1);
    } catch (err) {
      showSnackbar('خطأ في تحليل الملف: ' + (err.message || ''), 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportExecute = async () => {
    try {
      setImportLoading(true);
      const res = await importExportProService.executeImport(
        importConfig.file,
        importConfig.module,
        importConfig.columnMappings,
        importConfig.options,
      );
      setImportResult(res?.data?.data || res?.data || {});
      setImportStep(3);
      showSnackbar('تم الاستيراد بنجاح! ✅', 'success');
      loadJobs();
    } catch (err) {
      showSnackbar('خطأ في الاستيراد: ' + (err.message || ''), 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = async (module, format = 'xlsx') => {
    try {
      const res = await importExportProService.downloadTemplate(module, format);
      importExportProService.triggerDownload(res.data || res, `${module}_template.${format}`);
      showSnackbar('تم تحميل القالب', 'success');
    } catch (err) {
      showSnackbar('خطأ في تحميل القالب', 'error');
    }
  };

  // ─── Job Actions ───
  const handleCancelJob = async (id) => {
    try {
      await importExportProService.cancelJob(id);
      showSnackbar('تم إلغاء المهمة', 'success');
      loadJobs();
    } catch (err) {
      showSnackbar('خطأ في إلغاء المهمة', 'error');
    }
  };

  const handleRetryJob = async (id) => {
    try {
      await importExportProService.retryJob(id);
      showSnackbar('تم إعادة المحاولة', 'success');
      loadJobs();
    } catch (err) {
      showSnackbar('خطأ في إعادة المحاولة', 'error');
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await importExportProService.deleteJob(id);
      showSnackbar('تم حذف المهمة', 'success');
      loadJobs();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  // ─── Scheduled Export Actions ───
  const handleToggleScheduled = async (id, enabled) => {
    try {
      await importExportProService.toggleScheduledExport(id, enabled);
      showSnackbar(enabled ? 'تم تفعيل الجدولة' : 'تم إيقاف الجدولة', 'success');
      loadScheduledExports();
    } catch (err) {
      showSnackbar('خطأ في تحديث الجدولة', 'error');
    }
  };

  const handleCreateScheduled = async (data) => {
    try {
      await importExportProService.createScheduledExport(data);
      showSnackbar('تم إنشاء التصدير المجدول بنجاح! ✅', 'success');
      loadScheduledExports();
    } catch (err) {
      showSnackbar('خطأ في إنشاء الجدولة: ' + (err.response?.data?.message || err.message || ''), 'error');
    }
  };

  const handleExecuteScheduled = async () => {
    try {
      const res = await importExportProService.executeScheduledExports();
      const executed = res?.data?.data?.executed || 0;
      showSnackbar(`تم تنفيذ ${executed} تصدير مجدول`, 'success');
      loadScheduledExports();
    } catch (err) {
      showSnackbar('خطأ في تنفيذ الجدولة', 'error');
    }
  };

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            مركز الاستيراد والتصدير
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نظام احترافي متكامل لاستيراد وتصدير البيانات بصيغ متعددة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => { setExportDialog(true); setExportStep(0); }}
            sx={{ borderRadius: 2, px: 3 }}>
            تصدير بيانات
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => { setImportDialog(true); setImportStep(0); setImportPreview(null); setImportResult(null); }}
            sx={{ borderRadius: 2, px: 3 }}>
            استيراد بيانات
          </Button>
          <IconButton onClick={loadDashboard} color="primary"><RefreshIcon /></IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي العمليات', value: stats?.overview?.totalJobs || 0, icon: <DataIcon />, color: '#1976D2', sub: 'عملية' },
          { label: 'عمليات التصدير', value: stats?.overview?.totalExports || 0, icon: <DownloadIcon />, color: '#2E7D32', sub: 'تصدير' },
          { label: 'عمليات الاستيراد', value: stats?.overview?.totalImports || 0, icon: <UploadIcon />, color: '#ED6C02', sub: 'استيراد' },
          { label: 'السجلات المعالجة', value: (stats?.overview?.totalRowsProcessed || 0).toLocaleString(), icon: <TrendIcon />, color: '#9C27B0', sub: 'سجل' },
          { label: 'المكتملة', value: stats?.overview?.completed || 0, icon: <SuccessIcon />, color: '#4CAF50', sub: 'بنجاح' },
          { label: 'متوسط الوقت', value: stats?.overview?.avgDuration ? `${(stats.overview.avgDuration / 1000).toFixed(1)}ث` : '—', icon: <SpeedIcon />, color: '#FF5722', sub: '' },
        ].map((stat, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar sx={{ bgcolor: stat.color + '15', color: stat.color, width: 44, height: 44, mx: 'auto', mb: 1 }}>
                  {stat.icon}
                </Avatar>
                <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Live Progress Banner */}
      {liveProgress && (
        <Fade in>
          <Alert
            severity={liveProgress.status === 'failed' ? 'error' : liveProgress.status === 'completed' ? 'success' : 'info'}
            icon={liveProgress.status === 'processing' ? <CircularProgress size={20} /> : undefined}
            onClose={() => setLiveProgress(null)}
            sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
          >
            <AlertTitle>
              {liveProgress.status === 'processing' ? 'جارٍ المعالجة...' : liveProgress.status === 'completed' ? 'اكتملت العملية' : 'فشلت العملية'}
            </AlertTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={liveProgress.progress?.percentage || 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {liveProgress.progress?.percentage || 0}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({liveProgress.progress?.processed || 0}/{liveProgress.progress?.total || 0})
              </Typography>
            </Box>
          </Alert>
        </Fade>
      )}

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, minHeight: 56 } }}>
          <Tab icon={<StatsIcon />} label="لوحة المعلومات" iconPosition="start" />
          <Tab icon={<ModuleIcon />} label="الوحدات" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label={<Badge badgeContent={jobs.total} color="primary" max={99}>سجل العمليات</Badge>} iconPosition="start" />
          <Tab icon={<TemplateIcon />} label="القوالب" iconPosition="start" />
          <Tab icon={<ScheduleIcon />} label="التصدير المجدول" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && <DashboardTab stats={stats} modules={modules} />}
      {activeTab === 1 && (
        <ModulesTab
          modules={modules}
          onExport={(mod) => { setExportConfig(prev => ({ ...prev, module: mod })); setExportDialog(true); setExportStep(0); }}
          onImport={(mod) => { setImportConfig(prev => ({ ...prev, module: mod })); setImportDialog(true); setImportStep(0); }}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}
      {activeTab === 2 && (
        <JobsTab
          jobs={jobs}
          filters={jobFilters}
          onFilterChange={setJobFilters}
          onCancel={handleCancelJob}
          onRetry={handleRetryJob}
          onDelete={handleDeleteJob}
          onRefresh={loadJobs}
        />
      )}
      {activeTab === 3 && (
        <TemplatesTab
          templates={templates}
          modules={modules}
          onRefresh={loadTemplates}
          onDownload={handleDownloadTemplate}
        />
      )}
      {activeTab === 4 && (
        <ScheduledExportsTab
          scheduledExports={scheduledExports}
          modules={modules}
          onToggle={handleToggleScheduled}
          onCreate={handleCreateScheduled}
          onExecuteAll={handleExecuteScheduled}
          onRefresh={loadScheduledExports}
        />
      )}

      {/* Export Dialog */}
      <ExportWizardDialog
        open={exportDialog}
        onClose={() => { setExportDialog(false); setExportStep(0); setExportPreview(null); setModuleFields([]); }}
        step={exportStep}
        setStep={setExportStep}
        config={exportConfig}
        setConfig={setExportConfig}
        modules={modules}
        moduleFields={moduleFields}
        loadModuleFields={loadModuleFields}
        preview={exportPreview}
        loading={exportLoading}
        onPreview={handleExportPreview}
        onExecute={handleExportExecute}
        onBulkExport={handleBulkExport}
      />

      {/* Import Dialog */}
      <ImportWizardDialog
        open={importDialog}
        onClose={() => { setImportDialog(false); setImportStep(0); setImportPreview(null); setImportResult(null); setQualityReport(null); }}
        step={importStep}
        setStep={setImportStep}
        config={importConfig}
        setConfig={setImportConfig}
        modules={modules}
        preview={importPreview}
        result={importResult}
        loading={importLoading}
        onParse={handleImportFileParse}
        onExecute={handleImportExecute}
        onDownloadTemplate={handleDownloadTemplate}
        transformRules={transformRules}
        loadTransformRules={loadTransformRules}
        qualityReport={qualityReport}
        qualityLoading={qualityLoading}
        onGenerateQualityReport={handleGenerateQualityReport}
      />
    </Box>
  );
}

// ─────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────
function DashboardTab({ stats }) {
  if (!stats) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <DataIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">لا توجد بيانات إحصائية بعد</Typography>
        <Typography variant="body2" color="text.secondary">ابدأ بتصدير أو استيراد البيانات لعرض الإحصائيات</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Format Distribution */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            <FileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            توزيع الصيغ
          </Typography>
          {(stats.byFormat || []).map((item, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Chip
                label={FORMAT_CONFIG[item._id]?.label || item._id}
                size="small"
                sx={{ bgcolor: (FORMAT_CONFIG[item._id]?.color || '#666') + '20', color: FORMAT_CONFIG[item._id]?.color, fontWeight: 600, minWidth: 100 }}
              />
              <LinearProgress
                variant="determinate"
                value={stats.overview?.totalJobs ? (item.count / stats.overview.totalJobs) * 100 : 0}
                sx={{ flex: 1, mx: 2, height: 8, borderRadius: 4, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: FORMAT_CONFIG[item._id]?.color } }}
              />
              <Typography variant="body2" fontWeight="bold">{item.count}</Typography>
            </Box>
          ))}
        </Paper>
      </Grid>

      {/* Module Distribution */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            <ModuleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            أكثر الوحدات استخداماً
          </Typography>
          {(stats.topModules || []).slice(0, 6).map((item, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ minWidth: 120 }}>{item._id}</Typography>
              <Box sx={{ flex: 1, mx: 2, display: 'flex', gap: 0.5 }}>
                <Chip label={`↓ ${item.exports}`} size="small" color="success" variant="outlined" />
                <Chip label={`↑ ${item.imports}`} size="small" color="warning" variant="outlined" />
              </Box>
              <Typography variant="body2" fontWeight="bold">{item.total}</Typography>
            </Box>
          ))}
        </Paper>
      </Grid>

      {/* Recent Jobs */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            <DonutIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            معدل النجاح
          </Typography>
          {(() => {
            const total = stats?.overview?.totalJobs || 0;
            const completed = stats?.overview?.completed || 0;
            const failed = stats?.overview?.failed || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                  <CircularProgress variant="determinate" value={rate} size={120} thickness={6}
                    sx={{ color: rate >= 80 ? '#4CAF50' : rate >= 50 ? '#FF9800' : '#F44336' }} />
                  <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color={rate >= 80 ? 'success.main' : rate >= 50 ? 'warning.main' : 'error.main'}>
                      {rate}%
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main" fontWeight="bold">{completed}</Typography>
                    <Typography variant="caption" color="text.secondary">ناجح</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main" fontWeight="bold">{failed}</Typography>
                    <Typography variant="caption" color="text.secondary">فاشل</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="info.main" fontWeight="bold">{total - completed - failed}</Typography>
                    <Typography variant="caption" color="text.secondary">أخرى</Typography>
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </Paper>
      </Grid>

      {/* Performance Bar Chart */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            حالة العمليات
          </Typography>
          {(() => {
            const statusData = [
            { label: 'مكتمل', status: 'completed', color: '#4CAF50', count: stats?.overview?.completed || 0 },
              { label: 'قيد التنفيذ', status: 'processing', color: '#2196F3', count: stats?.overview?.processing || 0 },
              { label: 'فشل', status: 'failed', color: '#F44336', count: stats?.overview?.failed || 0 },
              { label: 'جزئي', status: 'partial', color: '#FF9800', count: stats?.overview?.partial || 0 },
              { label: 'ملغى', status: 'cancelled', color: '#9E9E9E', count: stats?.overview?.cancelled || 0 },
            ];
            const maxCount = Math.max(...statusData.map(s => s.count), 1);
            return (
              <Box sx={{ mt: 2 }}>
                {statusData.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 90, fontWeight: 600 }}>{s.label}</Typography>
                    <Box sx={{ flex: 1, mx: 2, position: 'relative', height: 28, borderRadius: 2, bgcolor: '#f5f5f5', overflow: 'hidden' }}>
                      <Box sx={{
                        height: '100%', borderRadius: 2, bgcolor: s.color, transition: 'width 1s ease',
                        width: `${(s.count / maxCount) * 100}%`, minWidth: s.count > 0 ? 20 : 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1,
                      }}>
                        {s.count > 0 && <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>{s.count}</Typography>}
                      </Box>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 30, textAlign: 'right' }}>{s.count}</Typography>
                  </Box>
                ))}
              </Box>
            );
          })()}
        </Paper>
      </Grid>

      {/* Recent Jobs Table */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            آخر العمليات
          </Typography>
          {(stats.recentJobs || []).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              لا توجد عمليات حتى الآن
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f5f5f5' } }}>
                    <TableCell>رقم المهمة</TableCell>
                    <TableCell>الاسم</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الصيغة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التقدم</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(stats.recentJobs || []).map((job, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography variant="caption" fontFamily="monospace">{job.jobId}</Typography></TableCell>
                      <TableCell>{job.jobName}</TableCell>
                      <TableCell>
                        <Chip label={job.type === 'export' ? 'تصدير' : 'استيراد'} size="small"
                          color={job.type === 'export' ? 'success' : 'warning'} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={FORMAT_CONFIG[job.format]?.label || job.format} size="small"
                          sx={{ bgcolor: (FORMAT_CONFIG[job.format]?.color || '#666') + '15' }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={STATUS_CONFIG[job.status]?.label || job.status} size="small"
                          color={STATUS_CONFIG[job.status]?.color || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={job.progress?.percentage || 0} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                          <Typography variant="caption">{job.progress?.percentage || 0}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="caption">{new Date(job.createdAt).toLocaleDateString('ar-SA')}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}

// ─────────────────────────────────────────────────
// Modules Tab
// ─────────────────────────────────────────────────
function ModulesTab({ modules, onExport, onImport, onDownloadTemplate }) {
  const [search, setSearch] = useState('');

  const filtered = modules.filter(m =>
    m.label?.includes(search) || m.labelEn?.toLowerCase().includes(search.toLowerCase()) || m.key.includes(search)
  );

  return (
    <Box>
      <TextField
        placeholder="بحث في الوحدات..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2, width: 350 }}
      />

      <Grid container spacing={2}>
        {filtered.map((mod, i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', transition: 'all 0.2s', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                    <FolderIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">{mod.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{mod.labelEn}</Typography>
                  </Box>
                </Box>
                {mod.hasTemplate && (
                  <Chip label="قالب جاهز" size="small" color="success" variant="outlined" sx={{ mb: 1 }} />
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Tooltip title="تصدير">
                  <Button size="small" variant="contained" color="success" onClick={() => onExport(mod.key)} startIcon={<DownloadIcon />}>
                    تصدير
                  </Button>
                </Tooltip>
                <Tooltip title="استيراد">
                  <Button size="small" variant="outlined" color="warning" onClick={() => onImport(mod.key)} startIcon={<UploadIcon />}>
                    استيراد
                  </Button>
                </Tooltip>
                {mod.hasTemplate && (
                  <Tooltip title="تحميل القالب">
                    <IconButton size="small" color="primary" onClick={() => onDownloadTemplate(mod.key)}>
                      <TemplateIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─────────────────────────────────────────────────
// Jobs Tab
// ─────────────────────────────────────────────────
function JobsTab({ jobs, filters, onFilterChange, onCancel, onRetry, onDelete, onRefresh }) {
  return (
    <Paper sx={{ borderRadius: 2 }}>
      {/* Filters */}
      <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={filters.type} label="النوع" onChange={(e) => onFilterChange({ ...filters, type: e.target.value, page: 1 })}>
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="export">تصدير</MenuItem>
            <MenuItem value="import">استيراد</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={filters.status} label="الحالة" onChange={(e) => onFilterChange({ ...filters, status: e.target.value, page: 1 })}>
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="completed">مكتمل</MenuItem>
            <MenuItem value="processing">قيد التنفيذ</MenuItem>
            <MenuItem value="failed">فشل</MenuItem>
            <MenuItem value="partial">جزئي</MenuItem>
            <MenuItem value="cancelled">ملغى</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<RefreshIcon />} onClick={onRefresh} size="small">تحديث</Button>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#fafafa' } }}>
              <TableCell>رقم المهمة</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الصيغة</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التقدم</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(jobs.jobs || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">لا توجد عمليات مسجلة</Typography>
                </TableCell>
              </TableRow>
            ) : (
              (jobs.jobs || []).map((job, i) => (
                <TableRow key={i} hover>
                  <TableCell><Typography variant="caption" fontFamily="monospace" sx={{ bgcolor: '#f5f5f5', px: 1, py: 0.5, borderRadius: 1 }}>{job.jobId}</Typography></TableCell>
                  <TableCell>{job.jobName || job.jobNameAr}</TableCell>
                  <TableCell>
                    <Chip label={job.type === 'export' ? '↓ تصدير' : '↑ استيراد'} size="small"
                      color={job.type === 'export' ? 'success' : 'warning'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={FORMAT_CONFIG[job.format]?.label || job.format} size="small"
                      icon={FORMAT_CONFIG[job.format]?.icon} sx={{ bgcolor: (FORMAT_CONFIG[job.format]?.color || '#666') + '10' }} />
                  </TableCell>
                  <TableCell>{job.dataSource?.module || '—'}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_CONFIG[job.status]?.label || job.status} size="small"
                      color={STATUS_CONFIG[job.status]?.color || 'default'} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={job.progress?.percentage || 0}
                        color={job.status === 'failed' ? 'error' : job.status === 'completed' ? 'success' : 'primary'}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" fontWeight="bold">{job.progress?.percentage || 0}%</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {job.progress?.successful || 0} نجح / {job.progress?.failed || 0} فشل
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(job.createdAt).toLocaleString('ar-SA')}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {['processing', 'pending'].includes(job.status) && (
                        <Tooltip title="إلغاء"><IconButton size="small" color="error" onClick={() => onCancel(job._id)}><CancelIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                      {job.status === 'failed' && (
                        <Tooltip title="إعادة المحاولة"><IconButton size="small" color="primary" onClick={() => onRetry(job._id)}><RetryIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(job._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination info */}
      {jobs.total > 0 && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            إجمالي: {jobs.total} عملية — صفحة {jobs.page} من {jobs.pages}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" disabled={filters.page <= 1}
              onClick={() => onFilterChange({ ...filters, page: filters.page - 1 })}>
              <BackIcon fontSize="small" /> السابق
            </Button>
            <Button size="small" disabled={filters.page >= (jobs.pages || 1)}
              onClick={() => onFilterChange({ ...filters, page: filters.page + 1 })}>
              التالي <ArrowIcon fontSize="small" />
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// ─────────────────────────────────────────────────
// Templates Tab
// ─────────────────────────────────────────────────
function TemplatesTab({ templates, modules, onRefresh, onDownload }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          <TemplateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          قوالب الاستيراد
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={onRefresh} size="small">تحديث</Button>
      </Box>

      <Grid container spacing={2}>
        {/* System templates from modules */}
        {modules.filter(m => m.hasTemplate).map((mod, i) => (
          <Grid item xs={12} sm={6} md={4} key={`sys-${i}`}>
            <Card sx={{ borderRadius: 2, border: '2px solid', borderColor: 'primary.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="قالب نظام" size="small" color="primary" />
                  <Typography variant="subtitle2" fontWeight="bold">{mod.label}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{mod.labelEn} — قالب استيراد جاهز مع تعليمات</Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" variant="contained" startIcon={<GetAppIcon />}
                  onClick={() => onDownload(mod.key, 'xlsx')}>
                  تحميل Excel
                </Button>
                <Button size="small" variant="outlined" startIcon={<GetAppIcon />}
                  onClick={() => onDownload(mod.key, 'csv')}>
                  تحميل CSV
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {/* Custom templates */}
        {(templates.templates || []).map((tmpl, i) => (
          <Grid item xs={12} sm={6} md={4} key={`cust-${i}`}>
            <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold">{tmpl.nameAr || tmpl.name}</Typography>
                <Typography variant="body2" color="text.secondary">{tmpl.description}</Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                  <Chip label={tmpl.module} size="small" variant="outlined" />
                  <Chip label={tmpl.type === 'both' ? 'استيراد وتصدير' : tmpl.type === 'export' ? 'تصدير' : 'استيراد'} size="small" />
                  {tmpl.isPublic && <Chip label="عام" size="small" color="info" />}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  استخدم {tmpl.usageCount || 0} مرة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {modules.filter(m => m.hasTemplate).length === 0 && (templates.templates || []).length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <TemplateIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">لا توجد قوالب</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ─────────────────────────────────────────────────
// Scheduled Exports Tab
// ─────────────────────────────────────────────────
function ScheduledExportsTab({ scheduledExports, modules, onToggle, onCreate, onExecuteAll, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    module: '', format: 'xlsx', frequency: 'daily',
    options: { language: 'both', includeHeaders: true },
  });

  const FREQ_OPTIONS = [
    { value: 'hourly', label: 'كل ساعة', icon: <TimerIcon fontSize="small" /> },
    { value: 'daily', label: 'يومي', icon: <ScheduleIcon fontSize="small" /> },
    { value: 'weekly', label: 'أسبوعي', icon: <ScheduleIcon fontSize="small" /> },
    { value: 'monthly', label: 'شهري', icon: <ScheduleIcon fontSize="small" /> },
    { value: 'quarterly', label: 'ربع سنوي', icon: <ScheduleIcon fontSize="small" /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          التصدير المجدول
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<RunIcon />} onClick={onExecuteAll} size="small">
            تنفيذ المستحق الآن
          </Button>
          <Button variant="outlined" startIcon={<ScheduleIcon />} onClick={() => setShowCreate(true)} size="small">
            إنشاء جدولة جديدة
          </Button>
          <IconButton onClick={onRefresh} size="small"><RefreshIcon /></IconButton>
        </Box>
      </Box>

      {/* Create Schedule Form */}
      <Collapse in={showCreate}>
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '2px solid', borderColor: 'primary.light', bgcolor: 'primary.lighter' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            <ScheduleIcon sx={{ mr: 0.5, verticalAlign: 'middle' }} />
            إنشاء تصدير مجدول جديد
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الوحدة</InputLabel>
                <Select value={newSchedule.module} label="الوحدة"
                  onChange={(e) => setNewSchedule({ ...newSchedule, module: e.target.value })}>
                  {modules.map(m => (
                    <MenuItem key={m.key} value={m.key}>{m.label} — {m.labelEn}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الصيغة</InputLabel>
                <Select value={newSchedule.format} label="الصيغة"
                  onChange={(e) => setNewSchedule({ ...newSchedule, format: e.target.value })}>
                  {Object.entries(FORMAT_CONFIG).filter(([k]) => k !== 'zip').map(([key, fmt]) => (
                    <MenuItem key={key} value={key}>{fmt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>التكرار</InputLabel>
                <Select value={newSchedule.frequency} label="التكرار"
                  onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}>
                  {FREQ_OPTIONS.map(f => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={() => { onCreate(newSchedule); setShowCreate(false); }}
              disabled={!newSchedule.module} startIcon={<ScheduleIcon />}>
              إنشاء الجدولة
            </Button>
            <Button onClick={() => setShowCreate(false)}>إلغاء</Button>
          </Box>
        </Paper>
      </Collapse>

      {/* Scheduled Jobs List */}
      <Grid container spacing={2}>
        {(scheduledExports.jobs || []).length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <ScheduleIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">لا توجد جدولات تصدير</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                أنشئ جدولة تصدير تلقائية لأي وحدة بيانات
              </Typography>
              <Button variant="contained" startIcon={<ScheduleIcon />} onClick={() => setShowCreate(true)}>
                إنشاء أول جدولة
              </Button>
            </Paper>
          </Grid>
        ) : (
          (scheduledExports.jobs || []).map((job, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{
                borderRadius: 2, border: '2px solid',
                borderColor: job.schedule?.enabled ? 'success.light' : 'divider',
                opacity: job.schedule?.enabled ? 1 : 0.7,
                transition: 'all 0.2s',
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{job.jobNameAr || job.jobName}</Typography>
                    <Switch
                      checked={job.schedule?.enabled}
                      onChange={(e) => onToggle(job._id, e.target.checked)}
                      color="success"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={job.dataSource?.module} size="small" variant="outlined" />
                    <Chip label={FORMAT_CONFIG[job.format]?.label || job.format} size="small"
                      sx={{ bgcolor: (FORMAT_CONFIG[job.format]?.color || '#666') + '15' }} />
                    <Chip label={FREQ_OPTIONS.find(f => f.value === job.schedule?.frequency)?.label || job.schedule?.frequency}
                      size="small" color="info" variant="outlined" icon={<TimerIcon />} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    التنفيذات: {job.schedule?.runCount || 0}
                    {job.schedule?.maxRuns ? ` / ${job.schedule.maxRuns}` : ''}
                  </Typography>
                  {job.schedule?.lastRunAt && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      آخر تنفيذ: {new Date(job.schedule.lastRunAt).toLocaleString('ar-SA')}
                    </Typography>
                  )}
                  {job.schedule?.nextRunAt && (
                    <Typography variant="caption" color="info.main" display="block" fontWeight="bold">
                      التنفيذ القادم: {new Date(job.schedule.nextRunAt).toLocaleString('ar-SA')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}

// ─────────────────────────────────────────────────
// Export Wizard Dialog
// ─────────────────────────────────────────────────
function ExportWizardDialog({ open, onClose, step, setStep, config, setConfig, modules, moduleFields, loadModuleFields, preview, loading, onPreview, onExecute, onBulkExport }) {
  const [bulkMode, setBulkMode] = useState(false);
  const [showFieldSelect, setShowFieldSelect] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: 500 } }}>
      <DialogTitle sx={{ bgcolor: 'success.main', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <DownloadIcon />
        معالج التصدير الاحترافي
        <Box sx={{ flex: 1 }} />
        <FormControlLabel
          control={<Switch checked={bulkMode} onChange={(e) => setBulkMode(e.target.checked)} color="default" />}
          label={<Typography color="#fff" variant="body2">تصدير شامل</Typography>}
        />
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Stepper activeStep={step} orientation="vertical">
          {/* Step 1: Select Module & Format */}
          <Step>
            <StepLabel>اختيار الوحدة والصيغة</StepLabel>
            <StepContent>
              {!bulkMode ? (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>اختر الوحدة</InputLabel>
                      <Select value={config.module} label="اختر الوحدة"
                        onChange={(e) => {
                          const mod = e.target.value;
                          setConfig({ ...config, module: mod, fields: [] });
                          if (showFieldSelect) loadModuleFields(mod);
                        }}>
                        {modules.map(m => (
                          <MenuItem key={m.key} value={m.key}>
                            {m.label} — {m.labelEn}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>صيغة التصدير:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {Object.entries(FORMAT_CONFIG).filter(([k]) => k !== 'zip').map(([key, fmt]) => (
                        <Chip
                          key={key}
                          label={fmt.label}
                          icon={fmt.icon}
                          onClick={() => setConfig({ ...config, format: key })}
                          sx={{
                            bgcolor: config.format === key ? fmt.color + '20' : 'transparent',
                            border: `2px solid ${config.format === key ? fmt.color : '#ddd'}`,
                            fontWeight: config.format === key ? 700 : 400,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: fmt.color + '10' },
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>خيارات:</Typography>
                    <FormControl size="small" sx={{ minWidth: 150, mr: 2 }}>
                      <InputLabel>اللغة</InputLabel>
                      <Select value={config.options?.language || 'both'} label="اللغة"
                        onChange={(e) => setConfig({ ...config, options: { ...config.options, language: e.target.value } })}>
                        <MenuItem value="both">عربي + English</MenuItem>
                        <MenuItem value="ar">عربي فقط</MenuItem>
                        <MenuItem value="en">English Only</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Field Selection */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FormControlLabel
                        control={<Switch checked={showFieldSelect} onChange={(e) => {
                          setShowFieldSelect(e.target.checked);
                          if (e.target.checked && config.module && moduleFields.length === 0) {
                            loadModuleFields(config.module);
                          }
                          if (!e.target.checked) {
                            setConfig({ ...config, fields: [] });
                          }
                        }} />}
                        label={<Typography variant="subtitle2"><SelectAllIcon sx={{ mr: 0.5, fontSize: 16, verticalAlign: 'middle' }} />تحديد الحقول (اختياري)</Typography>}
                      />
                    </Box>
                    <Collapse in={showFieldSelect}>
                      {moduleFields.length > 0 ? (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxHeight: 220, overflow: 'auto' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {config.fields?.length || 0} / {moduleFields.length} حقل محدد
                            </Typography>
                            <Button size="small" onClick={() => {
                              const allKeys = moduleFields.map(f => f.key || f.field || f.name);
                              setConfig({ ...config, fields: config.fields?.length === allKeys.length ? [] : allKeys });
                            }}>
                              {config.fields?.length === moduleFields.length ? 'إلغاء الكل' : 'تحديد الكل'}
                            </Button>
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {moduleFields.map((field, idx) => {
                              const fKey = field.key || field.field || field.name;
                              const selected = (config.fields || []).includes(fKey);
                              return (
                                <Chip
                                  key={idx}
                                  label={field.label || field.labelAr || fKey}
                                  size="small"
                                  icon={selected ? <CheckBoxIcon fontSize="small" /> : <CheckBoxBlankIcon fontSize="small" />}
                                  onClick={() => {
                                    const fields = selected
                                      ? (config.fields || []).filter(f => f !== fKey)
                                      : [...(config.fields || []), fKey];
                                    setConfig({ ...config, fields });
                                  }}
                                  sx={{
                                    bgcolor: selected ? 'primary.light' : 'transparent',
                                    color: selected ? 'primary.contrastText' : 'text.primary',
                                    border: `1px solid ${selected ? 'transparent' : '#ddd'}`,
                                    cursor: 'pointer', fontWeight: selected ? 600 : 400,
                                    '&:hover': { bgcolor: selected ? 'primary.main' : '#f0f0f0' },
                                  }}
                                />
                              );
                            })}
                          </Box>
                        </Paper>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {config.module ? 'جاري تحميل الحقول...' : 'اختر الوحدة أولاً لعرض الحقول'}
                        </Typography>
                      )}
                    </Collapse>
                  </Grid>
                </Grid>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    اختر الوحدات للتصدير الشامل (ملف ZIP):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {modules.map(m => (
                      <Chip
                        key={m.key}
                        label={m.label}
                        onClick={() => {
                          const sel = config._bulkSelected || [];
                          const newSel = sel.includes(m.key) ? sel.filter(k => k !== m.key) : [...sel, m.key];
                          setConfig({ ...config, _bulkSelected: newSel });
                        }}
                        color={config._bulkSelected?.includes(m.key) ? 'primary' : 'default'}
                        variant={config._bulkSelected?.includes(m.key) ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => bulkMode ? onBulkExport() : onPreview()} disabled={loading}
                  endIcon={bulkMode ? <DownloadIcon /> : <ArrowIcon />}>
                  {bulkMode ? 'تصدير شامل' : 'معاينة البيانات'}
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 2: Preview */}
          <Step>
            <StepLabel>معاينة البيانات</StepLabel>
            <StepContent>
              {preview && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>معلومات التصدير</AlertTitle>
                    إجمالي السجلات: <strong>{preview.totalRecords}</strong> —
                    الحقول: <strong>{preview.fields?.length || 0}</strong> —
                    الصيغة: <strong>{FORMAT_CONFIG[config.format]?.label}</strong>
                  </Alert>

                  {preview.preview && preview.preview.length > 0 && (
                    <TableContainer sx={{ maxHeight: 300, mb: 2 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {Object.keys(preview.preview[0]).filter(k => !k.startsWith('_')).slice(0, 8).map(key => (
                              <TableCell key={key} sx={{ fontWeight: 700, bgcolor: '#e3f2fd' }}>{key}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {preview.preview.slice(0, 10).map((row, i) => (
                            <TableRow key={i} hover>
                              {Object.entries(row).filter(([k]) => !k.startsWith('_')).slice(0, 8).map(([key, val], j) => (
                                <TableCell key={j}>
                                  <Typography variant="caption" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => setStep(0)} startIcon={<BackIcon />}>رجوع</Button>
                    <Button variant="contained" color="success" onClick={onExecute} disabled={loading}
                      startIcon={<DownloadIcon />}>
                      تصدير الآن ({FORMAT_CONFIG[config.format]?.label})
                    </Button>
                  </Box>
                </Box>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────
// Import Wizard Dialog
// ─────────────────────────────────────────────────
function ImportWizardDialog({ open, onClose, step, setStep, config, setConfig, modules, preview, result, loading, onParse, onExecute, onDownloadTemplate, transformRules, loadTransformRules, qualityReport, qualityLoading, onGenerateQualityReport }) {
  const [showQuality, setShowQuality] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load transform rules when step 2 opens
  useEffect(() => {
    if (step === 1 && transformRules.length === 0) {
      loadTransformRules();
    }
  }, [step, transformRules.length, loadTransformRules]);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && /\.(xlsx|xls|csv|json)$/i.test(file.name)) {
      setConfig({ ...config, file });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: 500 } }}>
      <DialogTitle sx={{ bgcolor: 'warning.main', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <UploadIcon />
        معالج الاستيراد الاحترافي
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Stepper activeStep={step} orientation="vertical">
          {/* Step 1: Upload & Module */}
          <Step>
            <StepLabel>رفع الملف واختيار الوحدة</StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>اختر الوحدة</InputLabel>
                    <Select value={config.module} label="اختر الوحدة"
                      onChange={(e) => setConfig({ ...config, module: e.target.value })}>
                      {modules.map(m => (
                        <MenuItem key={m.key} value={m.key}>
                          {m.label} — {m.labelEn}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    sx={{
                      p: 4, border: '2px dashed',
                      borderColor: isDragOver ? 'primary.main' : config.file ? 'success.main' : 'divider',
                      borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                      bgcolor: isDragOver ? 'primary.lighter' : config.file ? 'success.lighter' : 'grey.50',
                      transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter' },
                    }}
                    component="label"
                  >
                    <input type="file" hidden accept=".xlsx,.xls,.csv,.json"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setConfig({ ...config, file: e.target.files[0] });
                        }
                      }}
                    />
                    {isDragOver ? (
                      <Box>
                        <UploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1, animation: 'pulse 1s infinite' }} />
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          أفلت الملف هنا
                        </Typography>
                      </Box>
                    ) : config.file ? (
                      <Box>
                        <SuccessIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                          {config.file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(config.file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <UploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="subtitle1" color="text.secondary">
                          اسحب الملف هنا أو انقر للاختيار
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          الصيغ المدعومة: Excel (.xlsx, .xls), CSV, JSON
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {config.module && (
                  <Grid item xs={12}>
                    <Button size="small" variant="text" startIcon={<GetAppIcon />}
                      onClick={() => onDownloadTemplate(config.module)}>
                      تحميل قالب الاستيراد لهذه الوحدة
                    </Button>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={onParse} disabled={!config.file || !config.module || loading}
                  endIcon={<ArrowIcon />}>
                  تحليل الملف
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 2: Preview & Mapping */}
          <Step>
            <StepLabel>معاينة وربط الأعمدة</StepLabel>
            <StepContent>
              {preview && (
                <Box>
                  <Alert severity={preview.validation?.isValid ? 'success' : 'warning'} sx={{ mb: 2 }}>
                    <AlertTitle>{preview.validation?.isValid ? 'البيانات سليمة' : 'توجد تحذيرات'}</AlertTitle>
                    إجمالي الصفوف: <strong>{preview.totalRows}</strong> —
                    الأعمدة: <strong>{preview.detectedColumns?.length}</strong> —
                    {preview.validation && (
                      <>
                        صالحة: <strong>{preview.validation.validRows}</strong> —
                        أخطاء: <strong>{preview.validation.errors?.length || 0}</strong>
                      </>
                    )}
                  </Alert>

                  {/* Column Mappings */}
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    <MapIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                    ربط الأعمدة:
                  </Typography>
                  <TableContainer sx={{ maxHeight: 250, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#fff3e0', fontWeight: 700 } }}>
                          <TableCell>عمود الملف</TableCell>
                          <TableCell>الحقل في النظام</TableCell>
                          <TableCell>النوع</TableCell>
                          <TableCell>التحويل</TableCell>
                          <TableCell>الثقة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(config.columnMappings || []).map((mapping, i) => (
                          <TableRow key={i}>
                            <TableCell>{mapping.sourceColumn}</TableCell>
                            <TableCell>
                              <TextField size="small" variant="standard" value={mapping.targetField}
                                onChange={(e) => {
                                  const updated = [...config.columnMappings];
                                  updated[i] = { ...updated[i], targetField: e.target.value };
                                  setConfig({ ...config, columnMappings: updated });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip label={mapping.dataType} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
                                <Select
                                  value={mapping.transform || ''}
                                  displayEmpty
                                  onChange={(e) => {
                                    const updated = [...config.columnMappings];
                                    updated[i] = { ...updated[i], transform: e.target.value };
                                    setConfig({ ...config, columnMappings: updated });
                                  }}
                                >
                                  <MenuItem value=""><em>بدون</em></MenuItem>
                                  {(transformRules || []).map((rule, ri) => (
                                    <MenuItem key={ri} value={rule.key || rule.name}>
                                      <Tooltip title={rule.descriptionAr || rule.description || ''} placement="left">
                                        <span>{rule.labelAr || rule.label || rule.key || rule.name}</span>
                                      </Tooltip>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={mapping.confidence === 'high' ? 'عالية' : mapping.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}
                                size="small"
                                color={mapping.confidence === 'high' ? 'success' : mapping.confidence === 'medium' ? 'warning' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Preview Data */}
                  {preview.preview && preview.preview.length > 0 && (
                    <Accordion sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandIcon />}>
                        <Typography variant="subtitle2">
                          <PreviewIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                          معاينة البيانات (أول {Math.min(preview.preview.length, 10)} صفوف)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer sx={{ maxHeight: 200 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {preview.detectedColumns?.slice(0, 8).map(col => (
                                  <TableCell key={col} sx={{ fontWeight: 700, fontSize: 11 }}>{col}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {preview.preview.slice(0, 10).map((row, i) => (
                                <TableRow key={i}>
                                  {preview.detectedColumns?.slice(0, 8).map((col, j) => (
                                    <TableCell key={j}>
                                      <Typography variant="caption" noWrap sx={{ maxWidth: 100, display: 'block' }}>
                                        {String(row[col] ?? '')}
                                      </Typography>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Validation Errors */}
                  {preview.validation?.errors?.length > 0 && (
                    <Accordion sx={{ mb: 2, border: 1, borderColor: 'error.light', borderRadius: '8px !important' }} defaultExpanded={preview.validation.errors.length <= 5}>
                      <AccordionSummary expandIcon={<ExpandIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ErrorIcon color="error" sx={{ fontSize: 18 }} />
                          <Typography variant="subtitle2" color="error">
                            أخطاء التحقق ({preview.validation.errors.length})
                          </Typography>
                          {preview.validation.errors.length > 20 && (
                            <Chip label={`+${preview.validation.errors.length - 20} أخرى`} size="small" color="error" variant="outlined" />
                          )}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ maxHeight: 250, overflow: 'auto' }}>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ '& th': { bgcolor: '#ffebee', fontWeight: 700, fontSize: 11 } }}>
                                <TableCell sx={{ width: 60 }}>الصف</TableCell>
                                <TableCell sx={{ width: 100 }}>العمود</TableCell>
                                <TableCell>الخطأ</TableCell>
                                <TableCell sx={{ width: 70 }}>الخطورة</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {preview.validation.errors.slice(0, 30).map((err, i) => (
                                <TableRow key={i} sx={{ bgcolor: i % 2 ? '#fff5f5' : 'transparent' }}>
                                  <TableCell>
                                    <Chip label={`#${err.row}`} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" fontWeight="bold">{err.column || err.field || '—'}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">{err.error || err.message}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={err.severity === 'warning' ? 'تحذير' : 'خطأ'}
                                      size="small"
                                      color={err.severity === 'warning' ? 'warning' : 'error'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Warnings */}
                  {preview.validation?.warnings?.length > 0 && (
                    <Accordion sx={{ mb: 2, border: 1, borderColor: 'warning.light', borderRadius: '8px !important' }}>
                      <AccordionSummary expandIcon={<ExpandIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WarningIcon color="warning" sx={{ fontSize: 18 }} />
                          <Typography variant="subtitle2" color="warning.dark">
                            تحذيرات ({preview.validation.warnings.length})
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {preview.validation.warnings.slice(0, 15).map((warn, i) => (
                          <Alert severity="warning" key={i} sx={{ mb: 0.5, py: 0 }}>
                            {warn.message || warn.error || String(warn)}
                          </Alert>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Import Options */}
                  <Divider sx={{ my: 2 }} />

                  {/* Data Quality Report */}
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={qualityLoading ? <CircularProgress size={14} /> : <AutoFixIcon />}
                      onClick={() => {
                        setShowQuality(true);
                        onGenerateQualityReport(config.file, config.module);
                      }}
                      disabled={qualityLoading}
                      sx={{ mb: 1 }}
                    >
                      تحليل جودة البيانات
                    </Button>
                    <Collapse in={showQuality && !!qualityReport}>
                      {qualityReport && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                              <CircularProgress
                                variant="determinate"
                                value={qualityReport.qualityScore || qualityReport.score || 0}
                                size={70} thickness={5}
                                sx={{
                                  color: (qualityReport.qualityScore || qualityReport.score || 0) >= 80 ? '#4CAF50'
                                    : (qualityReport.qualityScore || qualityReport.score || 0) >= 50 ? '#FF9800' : '#F44336'
                                }}
                              />
                              <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="body1" fontWeight="bold">
                                  {Math.round(qualityReport.qualityScore || qualityReport.score || 0)}
                                </Typography>
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">تقرير جودة البيانات</Typography>
                              <Typography variant="caption" color="text.secondary">
                                الاكتمال: {qualityReport.completeness ? `${Math.round(qualityReport.completeness.overallCompleteness || 0)}%` : '—'} |
                                التفرد: {qualityReport.uniqueness ? `${Object.keys(qualityReport.uniqueness).length} حقول` : '—'}
                              </Typography>
                            </Box>
                          </Box>
                          {qualityReport.completeness?.fieldCompleteness && (
                            <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                              {Object.entries(qualityReport.completeness.fieldCompleteness).slice(0, 8).map(([field, pct], idx) => (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ minWidth: 100 }}>{field}</Typography>
                                  <LinearProgress variant="determinate" value={pct}
                                    sx={{ flex: 1, mx: 1, height: 6, borderRadius: 3, bgcolor: '#eee',
                                      '& .MuiLinearProgress-bar': { bgcolor: pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#F44336' }
                                    }} />
                                  <Typography variant="caption" fontWeight="bold" sx={{ minWidth: 35 }}>{Math.round(pct)}%</Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Paper>
                      )}
                    </Collapse>
                  </Box>

                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                    <SettingsIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                    خيارات الاستيراد:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>وضع الاستيراد</InputLabel>
                      <Select value={config.options?.mode || 'insert'} label="وضع الاستيراد"
                        onChange={(e) => setConfig({ ...config, options: { ...config.options, mode: e.target.value } })}>
                        <MenuItem value="insert">إدراج جديد</MenuItem>
                        <MenuItem value="update">تحديث موجود</MenuItem>
                        <MenuItem value="upsert">إدراج أو تحديث</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={<Switch checked={config.options?.skipDuplicates !== false}
                        onChange={(e) => setConfig({ ...config, options: { ...config.options, skipDuplicates: e.target.checked } })} />}
                      label="تجاهل المكرر"
                    />
                  </Box>

                  {/* Upsert key field selector */}
                  {(config.options?.mode === 'upsert' || config.options?.mode === 'update') && (
                    <Box sx={{ mb: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>حقل التطابق (للتحديث)</InputLabel>
                        <Select
                          value={config.options?.matchField || ''}
                          label="حقل التطابق (للتحديث)"
                          onChange={(e) => setConfig({ ...config, options: { ...config.options, matchField: e.target.value } })}
                        >
                          <MenuItem value=""><em>تلقائي</em></MenuItem>
                          {(config.columnMappings || []).filter(m => m.targetField).map((m, i) => (
                            <MenuItem key={i} value={m.targetField}>{m.sourceColumn} → {m.targetField}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        اختر الحقل المستخدم لمطابقة السجلات الموجودة عند التحديث
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => setStep(0)} startIcon={<BackIcon />}>رجوع</Button>
                    <Button variant="contained" color="warning" onClick={onExecute} disabled={loading}
                      startIcon={<RunIcon />}>
                      تنفيذ الاستيراد
                    </Button>
                  </Box>
                </Box>
              )}
            </StepContent>
          </Step>

          {/* Step 3: Executing */}
          <Step>
            <StepLabel>التنفيذ</StepLabel>
            <StepContent>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>جاري الاستيراد...</Typography>
              </Box>
            </StepContent>
          </Step>

          {/* Step 4: Results */}
          <Step>
            <StepLabel>النتائج</StepLabel>
            <StepContent>
              {result && (
                <Box>
                  <Alert severity={result.results?.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    <AlertTitle>
                      {result.results?.failed > 0 ? 'اكتمل الاستيراد مع بعض الأخطاء' : 'اكتمل الاستيراد بنجاح! ✅'}
                    </AlertTitle>
                  </Alert>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      { label: 'تم الإدراج', value: result.results?.inserted || 0, color: 'success.main', icon: <SuccessIcon /> },
                      { label: 'تم التحديث', value: result.results?.updated || 0, color: 'info.main', icon: <RefreshIcon /> },
                      { label: 'تم التخطي', value: result.results?.skipped || 0, color: 'warning.main', icon: <WarningIcon /> },
                      { label: 'فشل', value: result.results?.failed || 0, color: 'error.main', icon: <ErrorIcon /> },
                    ].map((stat, i) => (
                      <Grid item xs={3} key={i}>
                        <Paper sx={{ p: 2, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                          <Avatar sx={{ bgcolor: stat.color + '15', color: stat.color, mx: 'auto', mb: 1 }}>{stat.icon}</Avatar>
                          <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                          <Typography variant="caption">{stat.label}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  {result.results?.errors?.length > 0 && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandIcon />}>
                        <Typography color="error">تفاصيل الأخطاء ({result.results.errors.length})</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {result.results.errors.slice(0, 20).map((err, i) => (
                          <Alert severity="error" key={i} sx={{ mb: 0.5, py: 0 }}>
                            صف {err.row}: {err.error}
                          </Alert>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={onClose} startIcon={<DoneAllIcon />}>
                      إغلاق
                    </Button>
                  </Box>
                </Box>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
