/**
 * 📄 صفحة المستندات الذكية — Smart Documents Page
 * AlAwael ERP — Full-featured smart document management
 * Tabs: Templates · Generate · Generated Docs · Workflows · Analytics · AI Features
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import smartDocumentsService from 'services/smartDocumentsService';
import DOMPurify from 'dompurify';


import {
  Paper,  alpha,
} from '@mui/material';


import logger from 'utils/logger';
import { gradients } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from 'contexts/AuthContext';

/* ═══ Helpers ═══ */
const fmtDate = d =>
  d
    ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
const fmtDateTime = d =>
  d
    ? new Date(d).toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
const FORMAT_ICONS = {
  pdf: <PdfIcon />,
  docx: <WordIcon />,
  html: <HtmlIcon />,
  xlsx: <ExcelIcon />,
};
const FORMAT_COLORS = { pdf: '#E53935', docx: '#1E88E5', html: '#FF9800', xlsx: '#43A047' };
const STATUS_COLORS = {
  draft: '#9E9E9E',
  pending: '#FF9800',
  approved: '#43A047',
  rejected: '#E53935',
  published: '#1E88E5',
  archived: '#607D8B',
};
const STATUS_LABELS = {
  draft: 'مسودة',
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  published: 'منشور',
  archived: 'مؤرشف',
};
const DIFFICULTY_COLORS = { easy: '#43A047', medium: '#FF9800', hard: '#E53935' };
const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'متقدم' };

/* ═══ Stat Card Sub-component ═══ */
function StatCard({ icon, label, value, sub, gradient, iconBg }) {
  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ background: gradient, p: 0.5 }} />
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: iconBg || alpha('#1E88E5', 0.12),
              color: iconBg ? '#fff' : '#1E88E5',
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ═══ Tab labels ═══ */
const TAB_LABELS = [
  { label: 'القوالب', icon: <DocIcon /> },
  { label: 'إنشاء مستند', icon: <AddIcon /> },
  { label: 'المستندات المُنشأة', icon: <FormIcon /> },
  { label: 'سير العمل', icon: <WorkflowIcon /> },
  { label: 'التحليلات', icon: <AnalyticsIcon /> },
  { label: 'ميزات الذكاء', icon: <AIIcon /> },
];

/* ═══════════════════════════════════════════════════════════════ */
function SmartDocumentsPage() {
  const showSnackbar = useSnackbar();
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';

  /* ─── Core State ─── */
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ─── Data ─── */
  const [templates, setTemplates] = useState([]);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const categories = useMemo(() => smartDocumentsService.getCategories(), []);
  const aiFeatures = useMemo(() => smartDocumentsService.getAIFeatures(), []);
  const outputFormats = useMemo(() => smartDocumentsService.getOutputFormats(), []);

  /* ─── Filters ─── */
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [docPage, setDocPage] = useState(0);
  const [docRowsPerPage, setDocRowsPerPage] = useState(10);

  /* ─── Generation State ─── */
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);

  /* ─── Dialog State ─── */
  const [openGenDialog, setOpenGenDialog] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [viewDocDialog, setViewDocDialog] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* ═══ Load Data ═══ */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, docs, wfs, anl] = await Promise.all([
        smartDocumentsService.getTemplates(),
        smartDocumentsService.getGeneratedDocuments(),
        smartDocumentsService.getWorkflows(),
        smartDocumentsService.getAnalytics(),
      ]);
      setTemplates(Array.isArray(tpls) ? tpls : []);
      setGeneratedDocs(Array.isArray(docs) ? docs : []);
      setWorkflows(Array.isArray(wfs) ? wfs : []);
      setAnalytics(anl || null);
    } catch (err) {
      logger.error('SmartDocuments loadAll', err);
      showSnackbar('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ═══ Computed Stats ═══ */
  const stats = useMemo(
    () => ({
      totalTemplates: templates.length,
      totalGenerated: generatedDocs.length,
      published: generatedDocs.filter(d => d.status === 'published').length,
      pending: generatedDocs.filter(d => d.status === 'pending').length,
      approved: generatedDocs.filter(d => d.status === 'approved').length,
      rejected: generatedDocs.filter(d => d.status === 'rejected').length,
      activeWorkflows: workflows.filter(w => w.stages.some(s => s.status === 'in-progress')).length,
      aiAccuracy: analytics?.aiAccuracy || 96.8,
    }),
    [templates, generatedDocs, workflows, analytics]
  );

  /* ═══ Filtered Templates ═══ */
  const filteredTemplates = useMemo(() => {
    let list = [...templates];
    if (categoryFilter !== 'ALL') list = list.filter(t => t.type === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          t.name.includes(q) ||
          t.nameEn?.toLowerCase().includes(q) ||
          (t.tags || []).some(tag => tag.includes(q))
      );
    }
    return list;
  }, [templates, categoryFilter, searchQuery]);

  /* ═══ Filtered Generated Docs ═══ */
  const filteredDocs = useMemo(() => {
    let list = [...generatedDocs];
    if (categoryFilter !== 'ALL') list = list.filter(d => d.category === categoryFilter);
    if (statusFilter !== 'ALL') list = list.filter(d => d.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        d =>
          d.title?.toLowerCase().includes(q) ||
          d.refNumber?.toLowerCase().includes(q) ||
          d.templateName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [generatedDocs, categoryFilter, statusFilter, searchQuery]);

  /* ═══ Handlers ═══ */
  const extractPlaceholders = html => {
    const regex = /{{(.*?)}}/g;
    const matches = [...(html || '').matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))];
  };

  const handleSelectTemplate = template => {
    const placeholders = extractPlaceholders(template.body);
    const initialData = {};
    placeholders.forEach(key => {
      initialData[key] = '';
    });
    if (Object.prototype.hasOwnProperty.call(initialData, 'DATE'))
      initialData['DATE'] = new Date().toISOString().split('T')[0];
    setFormData(initialData);
    setSelectedTemplate({ ...template, placeholders });
    setGeneratedResult(null);
    setSelectedFormat('pdf');
    setActiveTab(1);
  };

  const handleOpenQuickGenerate = template => {
    const placeholders = extractPlaceholders(template.body);
    const initialData = {};
    placeholders.forEach(key => {
      initialData[key] = '';
    });
    if (Object.prototype.hasOwnProperty.call(initialData, 'DATE'))
      initialData['DATE'] = new Date().toISOString().split('T')[0];
    setFormData(initialData);
    setSelectedTemplate({ ...template, placeholders });
    setGeneratedResult(null);
    setSelectedFormat('pdf');
    setOpenGenDialog(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await smartDocumentsService.generate({
        templateId: selectedTemplate.id,
        personId: userId,
        customData: formData,
        format: selectedFormat,
      });
      const doc = result?.data || result;
      setGeneratedResult(doc);
      showSnackbar('تم إنشاء المستند بنجاح ✅', 'success');
      loadAll();
    } catch (err) {
      logger.error(err);
      showSnackbar('حدث خطأ أثناء إنشاء المستند', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (docId, newStatus) => {
    try {
      await smartDocumentsService.updateDocumentStatus(docId, newStatus);
      showSnackbar(`تم تحديث الحالة إلى: ${STATUS_LABELS[newStatus] || newStatus}`, 'success');
      setGeneratedDocs(prev => prev.map(d => (d._id === docId ? { ...d, status: newStatus } : d)));
    } catch (err) {
      logger.error(err);
      showSnackbar('حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  const handleDeleteDoc = async () => {
    if (!deleteConfirm) return;
    try {
      await smartDocumentsService.deleteGeneratedDocument(deleteConfirm._id);
      setGeneratedDocs(prev => prev.filter(d => d._id !== deleteConfirm._id));
      showSnackbar('تم حذف المستند بنجاح', 'success');
    } catch (err) {
      logger.error(err);
      showSnackbar('حدث خطأ أثناء الحذف', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* ─── Header ─── */}
      <Paper
        sx={{
          background: gradients.info,
          borderRadius: 3,
          p: 3,
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -30, right: -30, opacity: 0.08, fontSize: 180 }}>
          📄
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,.2)', width: 56, height: 56 }}>
              <DocIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                المستندات الذكية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                محرك ذكي لإنشاء وإدارة المستندات الرسمية بتقنيات الذكاء الاصطناعي
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setActiveTab(1)}
              sx={{
                bgcolor: 'rgba(255,255,255,.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,.3)' },
              }}
            >
              إنشاء مستند
            </Button>
            <IconButton sx={{ color: 'white' }} onClick={loadAll}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* ─── Stat Cards ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            icon: <DocIcon />,
            label: 'إجمالي القوالب',
            value: stats.totalTemplates,
            gradient: gradients.info,
            iconBg: '#1E88E5',
          },
          {
            icon: <FormIcon />,
            label: 'مستندات مُنشأة',
            value: stats.totalGenerated,
            gradient: gradients.primary,
            iconBg: '#7B1FA2',
          },
          {
            icon: <ApproveIcon />,
            label: 'منشورة',
            value: stats.published,
            gradient: gradients.success,
            iconBg: '#43A047',
          },
          {
            icon: <ScheduleIcon />,
            label: 'قيد المراجعة',
            value: stats.pending,
            gradient: gradients.warning,
            iconBg: '#FF9800',
          },
          {
            icon: <ApproveIcon />,
            label: 'معتمدة',
            value: stats.approved,
            sub: 'جاهزة للنشر',
            gradient: gradients.ocean,
            iconBg: '#00897B',
          },
          {
            icon: <RejectIcon />,
            label: 'مرفوضة',
            value: stats.rejected,
            gradient: gradients.fire || gradients.warning,
            iconBg: '#E53935',
          },
          {
            icon: <WorkflowIcon />,
            label: 'سير عمل نشط',
            value: stats.activeWorkflows,
            gradient: gradients.accent,
            iconBg: '#E91E63',
          },
          {
            icon: <AIIcon />,
            label: 'دقة الذكاء',
            value: `${stats.aiAccuracy}%`,
            sub: 'معدل التعبئة التلقائية',
            gradient: gradients.infoDeep || gradients.info,
            iconBg: '#1565C0',
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={i}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ─── Tabs ─── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            setSearchQuery('');
            setCategoryFilter('ALL');
            setStatusFilter('ALL');
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha('#1E88E5', 0.03) }}
        >
          {TAB_LABELS.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{ fontWeight: activeTab === i ? 700 : 400, minHeight: 56 }}
            />
          ))}
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={48} />
        </Box>
      ) : (
        <Fade in timeout={400}>
          <Box>
            {/* ══════════ TAB 0: Templates ══════════ */}
            {activeTab === 0 && (
              <Box>
                {/* Filters */}
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="بحث في القوالب..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 260 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>التصنيف</InputLabel>
                    <Select
                      value={categoryFilter}
                      label="التصنيف"
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">الكل ({templates.length})</MenuItem>
                      {categories.map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.icon} {c.label} ({templates.filter(t => t.type === c.id).length})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    عرض {filteredTemplates.length} من {templates.length} قالب
                  </Typography>
                </Paper>

                {/* Category Quick Chips */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                  <Chip
                    label="الكل"
                    variant={categoryFilter === 'ALL' ? 'filled' : 'outlined'}
                    color="primary"
                    onClick={() => setCategoryFilter('ALL')}
                  />
                  {categories.map(c => (
                    <Chip
                      key={c.id}
                      label={`${c.icon} ${c.label}`}
                      variant={categoryFilter === c.id ? 'filled' : 'outlined'}
                      onClick={() => setCategoryFilter(c.id)}
                      sx={{
                        borderColor: c.color,
                        ...(categoryFilter === c.id && { bgcolor: c.color, color: '#fff' }),
                      }}
                    />
                  ))}
                </Box>

                {/* Template Grid */}
                <Grid container spacing={2}>
                  {filteredTemplates.map(template => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
                      <Card
                        sx={{
                          height: '100%',
                          borderRadius: 3,
                          transition: '0.3s',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          {/* Top Row */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 1.5,
                            }}
                          >
                            <Chip
                              label={DIFFICULTY_LABELS[template.difficulty] || template.difficulty}
                              size="small"
                              sx={{
                                bgcolor: alpha(
                                  DIFFICULTY_COLORS[template.difficulty] || '#757575',
                                  0.12
                                ),
                                color: DIFFICULTY_COLORS[template.difficulty] || '#757575',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                            <Chip
                              label={template.language || 'AR'}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>

                          {/* Category Icon + Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Avatar
                              sx={{
                                bgcolor: alpha(
                                  categories.find(c => c.id === template.type)?.color || '#1E88E5',
                                  0.12
                                ),
                                color:
                                  categories.find(c => c.id === template.type)?.color || '#1E88E5',
                                width: 40,
                                height: 40,
                                fontSize: 20,
                              }}
                            >
                              {categories.find(c => c.id === template.type)?.icon || '📄'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 700, lineHeight: 1.3 }}
                              >
                                {template.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {template.nameEn}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Rating + Usage */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Rating
                              value={template.rating || 0}
                              precision={0.1}
                              size="small"
                              readOnly
                            />
                            <Typography variant="caption" color="text.secondary">
                              ({template.rating})
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 'auto' }}
                            >
                              {template.usageCount} استخدام
                            </Typography>
                          </Box>

                          {/* Fields count + Time */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 1.5,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {template.fields?.length || 0} حقول • {template.estimatedTime || '—'}
                            </Typography>
                          </Box>

                          {/* Tags */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                            {(template.tags || []).slice(0, 3).map(tag => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 22 }}
                              />
                            ))}
                          </Box>

                          {/* Actions */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              fullWidth
                              startIcon={<AddIcon />}
                              onClick={() => handleSelectTemplate(template)}
                              sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                              إنشاء مستند
                            </Button>
                            <MuiTooltip title="إنشاء سريع">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenQuickGenerate(template)}
                              >
                                <PlayIcon />
                              </IconButton>
                            </MuiTooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                        <DocIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          لا توجد قوالب مطابقة للبحث
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* ══════════ TAB 1: Generate Document ══════════ */}
            {activeTab === 1 && (
              <Grid container spacing={3}>
                {/* Left: Template Selection or Form */}
                <Grid item xs={12} md={8}>
                  {!selectedTemplate ? (
                    <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
                      <AutoIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                        اختر قالباً لإنشاء مستند
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        اذهب إلى تبويب "القوالب" واختر القالب المناسب، أو اختر من القوالب الأكثر
                        استخداماً
                      </Typography>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        الأكثر استخداماً
                      </Typography>
                      <Grid container spacing={2}>
                        {[...templates]
                          .sort((a, b) => b.usageCount - a.usageCount)
                          .slice(0, 6)
                          .map(t => (
                            <Grid item xs={12} sm={6} md={4} key={t.id}>
                              <Card
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: alpha('#1E88E5', 0.04),
                                  },
                                }}
                                onClick={() => handleSelectTemplate(t)}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {t.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {t.usageCount} استخدام
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                      </Grid>
                    </Paper>
                  ) : generatedResult ? (
                    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ background: gradients.success, p: 2.5, color: 'white' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          ✅ تم إنشاء المستند بنجاح
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          رقم المرجع: {generatedResult.refNumber || 'DOC-NEW'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 3 }}>
                        <Alert severity="success" sx={{ mb: 3 }}>
                          تم إنشاء المستند بنجاح وحفظه كمسودة. يمكنك مراجعته ونشره من تبويب
                          "المستندات المُنشأة".
                        </Alert>
                        <Paper
                          elevation={2}
                          sx={{ p: 4, minHeight: 300, bgcolor: '#fafafa', borderRadius: 2 }}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                generatedResult.content || '<p>تم إنشاء المستند بنجاح</p>'
                              ),
                            }}
                          />
                        </Paper>
                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                          <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => window.print()}
                          >
                            طباعة
                          </Button>
                          <Button variant="outlined" startIcon={<DownloadIcon />}>
                            تحميل {selectedFormat.toUpperCase()}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setSelectedTemplate(null);
                              setGeneratedResult(null);
                            }}
                          >
                            إنشاء مستند آخر
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ) : (
                    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          background: gradients.primary,
                          p: 2.5,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            تعبئة بيانات: {selectedTemplate.name}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.85 }}>
                            {selectedTemplate.placeholders?.length || 0} حقول مطلوبة •{' '}
                            {selectedTemplate.estimatedTime || '—'}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CloseIcon />}
                          onClick={() => setSelectedTemplate(null)}
                          sx={{ bgcolor: 'rgba(255,255,255,.2)' }}
                        >
                          تغيير القالب
                        </Button>
                      </Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={2}>
                          {(selectedTemplate.placeholders || []).map(key => (
                            <Grid item xs={12} sm={6} key={key}>
                              <TextField
                                fullWidth
                                label={key.replace(/_/g, ' ')}
                                value={formData[key] || ''}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, [key]: e.target.value }))
                                }
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                          ))}
                        </Grid>

                        {/* Format Selection */}
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            صيغة الإخراج
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {outputFormats.map(f => (
                              <Chip
                                key={f.id}
                                icon={FORMAT_ICONS[f.id]}
                                label={f.label}
                                variant={selectedFormat === f.id ? 'filled' : 'outlined'}
                                onClick={() => setSelectedFormat(f.id)}
                                sx={
                                  selectedFormat === f.id
                                    ? { bgcolor: FORMAT_COLORS[f.id], color: '#fff' }
                                    : { borderColor: FORMAT_COLORS[f.id] }
                                }
                              />
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setSelectedTemplate(null);
                              setFormData({});
                            }}
                          >
                            إلغاء
                          </Button>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={
                              generating ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <AutoIcon />
                              )
                            }
                            onClick={handleGenerate}
                            disabled={generating}
                            sx={{ minWidth: 180, borderRadius: 2 }}
                          >
                            {generating ? 'جارٍ الإنشاء...' : 'إنشاء المستند'}
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  )}
                </Grid>

                {/* Right: Sidebar Info */}
                <Grid item xs={12} md={4}>
                  {selectedTemplate && !generatedResult && (
                    <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        معلومات القالب
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            الاسم
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedTemplate.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            التصنيف
                          </Typography>
                          <Typography variant="body2">
                            {categories.find(c => c.id === selectedTemplate.type)?.label ||
                              selectedTemplate.type}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            المستوى
                          </Typography>
                          <Chip
                            label={DIFFICULTY_LABELS[selectedTemplate.difficulty]}
                            size="small"
                            sx={{
                              bgcolor: alpha(
                                DIFFICULTY_COLORS[selectedTemplate.difficulty] || '#757575',
                                0.15
                              ),
                              color: DIFFICULTY_COLORS[selectedTemplate.difficulty],
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            الاستخدام
                          </Typography>
                          <Typography variant="body2">{selectedTemplate.usageCount} مرة</Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            التقييم
                          </Typography>
                          <Rating
                            value={selectedTemplate.rating || 0}
                            precision={0.1}
                            size="small"
                            readOnly
                          />
                        </Box>
                      </Box>
                    </Paper>
                  )}
                  <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      ميزات الذكاء الاصطناعي
                    </Typography>
                    {aiFeatures.slice(0, 4).map(f => (
                      <Box
                        key={f.id}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: alpha('#1E88E5', 0.1),
                            width: 32,
                            height: 32,
                            fontSize: 16,
                          }}
                        >
                          {f.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {f.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {f.desc}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* ══════════ TAB 2: Generated Documents ══════════ */}
            {activeTab === 2 && (
              <Box>
                {/* Filters */}
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="بحث بالعنوان أو الرقم المرجعي..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 280 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>التصنيف</InputLabel>
                    <Select
                      value={categoryFilter}
                      label="التصنيف"
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">الكل</MenuItem>
                      {categories.map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>الحالة</InputLabel>
                    <Select
                      value={statusFilter}
                      label="الحالة"
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">الكل</MenuItem>
                      {smartDocumentsService.getDocumentStatuses().map(s => (
                        <MenuItem key={s.id} value={s.id}>
                          <Chip
                            label={s.label}
                            size="small"
                            sx={{ bgcolor: alpha(s.color, 0.15), color: s.color, mr: 1 }}
                          />{' '}
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {filteredDocs.length} مستند
                  </Typography>
                </Paper>

                {/* Table */}
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha('#1E88E5', 0.06) }}>
                        <TableCell sx={{ fontWeight: 700 }}>الرقم المرجعي</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>القالب</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التصنيف</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المنشئ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الصيغة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحجم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">
                          إجراءات
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDocs
                        .slice(docPage * docRowsPerPage, docPage * docRowsPerPage + docRowsPerPage)
                        .map(doc => (
                          <TableRow
                            key={doc._id}
                            hover
                            sx={{ '&:hover': { bgcolor: alpha('#1E88E5', 0.03) } }}
                          >
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                              >
                                {doc.refNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {doc.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{doc.templateName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  categories.find(c => c.id === doc.category)?.label || doc.category
                                }
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: categories.find(c => c.id === doc.category)?.color,
                                  color: categories.find(c => c.id === doc.category)?.color,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{doc.createdBy}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={STATUS_LABELS[doc.status] || doc.status}
                                size="small"
                                sx={{
                                  bgcolor: alpha(STATUS_COLORS[doc.status] || '#757575', 0.15),
                                  color: STATUS_COLORS[doc.status],
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ color: FORMAT_COLORS[doc.format] }}>
                                  {FORMAT_ICONS[doc.format]}
                                </Box>
                                <Typography variant="caption">
                                  {doc.format?.toUpperCase()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {smartDocumentsService.formatFileSize(doc.fileSize)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{fmtDate(doc.createdAt)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                                <MuiTooltip title="عرض">
                                  <IconButton size="small" onClick={() => setViewDocDialog(doc)}>
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </MuiTooltip>
                                {doc.status === 'pending' && (
                                  <>
                                    <MuiTooltip title="اعتماد">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => handleStatusChange(doc._id, 'approved')}
                                      >
                                        <ApproveIcon fontSize="small" />
                                      </IconButton>
                                    </MuiTooltip>
                                    <MuiTooltip title="رفض">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleStatusChange(doc._id, 'rejected')}
                                      >
                                        <RejectIcon fontSize="small" />
                                      </IconButton>
                                    </MuiTooltip>
                                  </>
                                )}
                                {doc.status === 'approved' && (
                                  <MuiTooltip title="نشر">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleStatusChange(doc._id, 'published')}
                                    >
                                      <ArrowIcon fontSize="small" />
                                    </IconButton>
                                  </MuiTooltip>
                                )}
                                {doc.status === 'draft' && (
                                  <MuiTooltip title="حذف">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => setDeleteConfirm(doc)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </MuiTooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      {filteredDocs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                            <Typography color="text.secondary">لا توجد مستندات مطابقة</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredDocs.length}
                    page={docPage}
                    onPageChange={(_, p) => setDocPage(p)}
                    rowsPerPage={docRowsPerPage}
                    onRowsPerPageChange={e => {
                      setDocRowsPerPage(parseInt(e.target.value, 10));
                      setDocPage(0);
                    }}
                    labelRowsPerPage="صفوف لكل صفحة:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                  />
                </TableContainer>
              </Box>
            )}

            {/* ══════════ TAB 3: Workflows ══════════ */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                  سير العمل النشطة ({workflows.length})
                </Typography>
                <Grid container spacing={3}>
                  {workflows.map(wf => {
                    const stages = smartDocumentsService.getWorkflowStages();
                    const currentIdx = stages.findIndex(s => s.id === wf.currentStage);
                    return (
                      <Grid item xs={12} key={wf._id}>
                        <Paper
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 2,
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {wf.documentTitle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                المرجع: {wf.documentRef} • بدأ بواسطة: {wf.initiator} •{' '}
                                {fmtDateTime(wf.startedAt)}
                              </Typography>
                            </Box>
                            <Chip
                              label={stages[currentIdx]?.label || wf.currentStage}
                              sx={{
                                bgcolor: alpha(stages[currentIdx]?.color || '#757575', 0.15),
                                color: stages[currentIdx]?.color,
                                fontWeight: 600,
                              }}
                            />
                          </Box>

                          {/* Stepper */}
                          <Stepper
                            activeStep={wf.stages.findIndex(s => s.status === 'in-progress')}
                            alternativeLabel
                            sx={{ mb: 2 }}
                          >
                            {wf.stages.map((stage, idx) => {
                              const stgDef = stages.find(s => s.id === stage.stage);
                              return (
                                <Step key={idx} completed={stage.status === 'completed'}>
                                  <StepLabel
                                    error={stage.status === 'rejected'}
                                    optional={
                                      <Typography variant="caption" color="text.secondary">
                                        {stage.assignee}
                                      </Typography>
                                    }
                                  >
                                    {stgDef?.label || stage.stage}
                                  </StepLabel>
                                </Step>
                              );
                            })}
                          </Stepper>

                          {/* Stage Details */}
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                            {wf.stages.map((stage, idx) => (
                              <Chip
                                key={idx}
                                size="small"
                                variant="outlined"
                                label={`${stages.find(s => s.id === stage.stage)?.label}: ${stage.status === 'completed' ? '✅' : stage.status === 'in-progress' ? '🔄' : '⏳'} ${stage.assignee}`}
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                  {workflows.length === 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                        <WorkflowIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          لا توجد مسارات عمل نشطة
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* ══════════ TAB 4: Analytics ══════════ */}
            {activeTab === 4 && analytics && (
              <Box>
                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {[
                    {
                      label: 'إجمالي المستندات المُنشأة',
                      value: analytics.totalGenerated,
                      icon: <FormIcon />,
                      color: '#1E88E5',
                    },
                    {
                      label: 'عدد القوالب المتاحة',
                      value: analytics.totalTemplates,
                      icon: <DocIcon />,
                      color: '#9C27B0',
                    },
                    {
                      label: 'متوسط وقت الإنشاء',
                      value: `${analytics.avgGenerationTime} ث`,
                      icon: <SpeedIcon />,
                      color: '#FF9800',
                    },
                    {
                      label: 'دقة التعبئة التلقائية',
                      value: `${analytics.aiAccuracy}%`,
                      icon: <AIIcon />,
                      color: '#43A047',
                    },
                  ].map((c, i) => (
                    <Grid item xs={6} md={3} key={i}>
                      <Paper
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          textAlign: 'center',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Avatar
                          sx={{ bgcolor: alpha(c.color, 0.12), color: c.color, mx: 'auto', mb: 1 }}
                        >
                          {c.icon}
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: c.color }}>
                          {c.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* Charts Row 1 */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        الاستخدام الشهري
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={analytics.monthlyUsage}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="generated"
                            name="مُنشأة"
                            stroke="#1E88E5"
                            fill={alpha('#1E88E5', 0.3)}
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="approved"
                            name="معتمدة"
                            stroke="#43A047"
                            fill={alpha('#43A047', 0.2)}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        توزيع الحالات
                      </Typography>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={analytics.statusBreakdown.filter(s => s.value > 0)}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={50}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {analytics.statusBreakdown
                              .filter(s => s.value > 0)
                              .map((s, i) => (
                                <Cell key={i} fill={s.color} />
                              ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Charts Row 2 */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        أكثر القوالب استخداماً
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.topTemplates} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={140}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="usageCount"
                            name="عدد الاستخدام"
                            fill="#1E88E5"
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        الاستخدام حسب التصنيف
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics.categoryUsage.filter(c => c.value > 0)}
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {analytics.categoryUsage
                              .filter(c => c.value > 0)
                              .map((c, i) => (
                                <Cell key={i} fill={c.color} />
                              ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Recent Activity */}
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    النشاط الأخير
                  </Typography>
                  {(analytics.recentActivity || []).map((a, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1.5,
                        borderBottom:
                          i < analytics.recentActivity.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: alpha('#1E88E5', 0.12),
                          width: 36,
                          height: 36,
                          fontSize: 14,
                        }}
                      >
                        {a.user.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          <strong>{a.user}</strong> — {a.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.document}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {fmtDateTime(a.timestamp)}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}

            {/* ══════════ TAB 5: AI Features ══════════ */}
            {activeTab === 5 && (
              <Box>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <AIIcon sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                    ميزات الذكاء الاصطناعي
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    تقنيات متقدمة لتحسين إنتاجية إنشاء المستندات وإدارتها
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {aiFeatures.map((feature, idx) => {
                    const featureGradients = [
                      gradients.info,
                      gradients.success,
                      gradients.primary,
                      gradients.ocean,
                      gradients.accent,
                      gradients.warning,
                    ];
                    const featureIcons = [
                      <AutoIcon sx={{ fontSize: 40 }} />,
                      <ScanIcon sx={{ fontSize: 40 }} />,
                      <EditIcon sx={{ fontSize: 40 }} />,
                      <TranslateIcon sx={{ fontSize: 40 }} />,
                      <CategoryIcon sx={{ fontSize: 40 }} />,
                      <SpellcheckIcon sx={{ fontSize: 40 }} />,
                    ];
                    const metrics = [
                      { accuracy: '96.8%', speed: '0.3 ثانية', usage: '1,245' },
                      { accuracy: '94.5%', speed: '1.2 ثانية', usage: '567' },
                      { accuracy: '92.3%', speed: '0.8 ثانية', usage: '890' },
                      { accuracy: '97.1%', speed: '1.5 ثانية', usage: '234' },
                      { accuracy: '95.6%', speed: '0.5 ثانية', usage: '1,023' },
                      { accuracy: '93.8%', speed: '0.7 ثانية', usage: '678' },
                    ];
                    const m = metrics[idx] || metrics[0];
                    return (
                      <Grid item xs={12} sm={6} md={4} key={feature.id}>
                        <Card
                          sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            height: '100%',
                            transition: '0.3s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
                          }}
                        >
                          <Box
                            sx={{
                              background: featureGradients[idx] || gradients.info,
                              p: 3,
                              color: 'white',
                              textAlign: 'center',
                            }}
                          >
                            {featureIcons[idx] || <AIIcon sx={{ fontSize: 40 }} />}
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                              {feature.label}
                            </Typography>
                          </Box>
                          <CardContent sx={{ p: 2.5 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 2, minHeight: 40 }}
                            >
                              {feature.desc}
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={1}>
                              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#43A047' }}>
                                  {m.accuracy}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  الدقة
                                </Typography>
                              </Grid>
                              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E88E5' }}>
                                  {m.speed}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  السرعة
                                </Typography>
                              </Grid>
                              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF9800' }}>
                                  {m.usage}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  الاستخدام
                                </Typography>
                              </Grid>
                            </Grid>
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                مستوى الأداء
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={parseFloat(m.accuracy)}
                                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* AI Stats Summary */}
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    mt: 3,
                    background: `linear-gradient(135deg, ${alpha('#1E88E5', 0.05)}, ${alpha('#9C27B0', 0.05)})`,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
                    إحصائيات الذكاء الاصطناعي الشاملة
                  </Typography>
                  <Grid container spacing={3}>
                    {[
                      { label: 'مستندات مُعالجة', value: '4,637', icon: '📄' },
                      { label: 'وقت موفر (ساعات)', value: '1,245', icon: '⏱️' },
                      { label: 'أخطاء مصححة', value: '8,912', icon: '✅' },
                      { label: 'ترجمات مكتملة', value: '567', icon: '🌍' },
                      { label: 'مستندات مُصنفة', value: '3,456', icon: '🏷️' },
                      { label: 'معدل رضا المستخدمين', value: '98.2%', icon: '⭐' },
                    ].map((s, i) => (
                      <Grid item xs={6} md={2} key={i} sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ mb: 0.5 }}>
                          {s.icon}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E88E5' }}>
                          {s.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.label}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {/* ═══ Quick Generate Dialog ═══ */}
      <Dialog open={openGenDialog} onClose={() => setOpenGenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {generatedResult
                ? '✅ تم إنشاء المستند'
                : `إنشاء سريع: ${selectedTemplate?.name || ''}`}
            </Typography>
            {!generatedResult && (
              <Typography variant="caption" color="text.secondary">
                {selectedTemplate?.placeholders?.length || 0} حقول
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setOpenGenDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {generatedResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                تم إنشاء المستند بنجاح! الرقم المرجعي: {generatedResult.refNumber || 'DOC-NEW'}
              </Alert>
              <Paper
                elevation={2}
                sx={{ p: 4, minHeight: 300, bgcolor: '#fafafa', borderRadius: 2 }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      generatedResult.content || '<p>تم إنشاء المستند بنجاح</p>'
                    ),
                  }}
                />
              </Paper>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {(selectedTemplate?.placeholders || []).map(key => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    fullWidth
                    label={key.replace(/_/g, ' ')}
                    value={formData[key] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {outputFormats.map(f => (
                    <Chip
                      key={f.id}
                      icon={FORMAT_ICONS[f.id]}
                      label={f.label}
                      variant={selectedFormat === f.id ? 'filled' : 'outlined'}
                      onClick={() => setSelectedFormat(f.id)}
                      sx={
                        selectedFormat === f.id
                          ? { bgcolor: FORMAT_COLORS[f.id], color: '#fff' }
                          : {}
                      }
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenGenDialog(false)}>إغلاق</Button>
          {!generatedResult && (
            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoIcon />}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'جارٍ الإنشاء...' : 'إنشاء المستند'}
            </Button>
          )}
          {generatedResult && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
                طباعة
              </Button>
              <Button variant="contained" startIcon={<DownloadIcon />}>
                تحميل
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* ═══ View Document Dialog ═══ */}
      <Dialog open={!!viewDocDialog} onClose={() => setViewDocDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            تفاصيل المستند
          </Typography>
          <IconButton onClick={() => setViewDocDialog(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {viewDocDialog && (
          <DialogContent dividers>
            <Grid container spacing={2}>
              {[
                { label: 'الرقم المرجعي', value: viewDocDialog.refNumber },
                { label: 'العنوان', value: viewDocDialog.title },
                { label: 'القالب', value: viewDocDialog.templateName },
                {
                  label: 'التصنيف',
                  value:
                    categories.find(c => c.id === viewDocDialog.category)?.label ||
                    viewDocDialog.category,
                },
                { label: 'المنشئ', value: viewDocDialog.createdBy },
                {
                  label: 'الحالة',
                  value: STATUS_LABELS[viewDocDialog.status] || viewDocDialog.status,
                },
                { label: 'الصيغة', value: viewDocDialog.format?.toUpperCase() },
                {
                  label: 'الحجم',
                  value: smartDocumentsService.formatFileSize(viewDocDialog.fileSize),
                },
                { label: 'الإصدار', value: `v${viewDocDialog.version}` },
                { label: 'التحميلات', value: viewDocDialog.downloads },
                { label: 'تاريخ الإنشاء', value: fmtDateTime(viewDocDialog.createdAt) },
                { label: 'المعتمد', value: viewDocDialog.approvedBy || '—' },
              ].map((item, i) => (
                <Grid item xs={6} key={i}>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.value}
                  </Typography>
                </Grid>
              ))}
              {viewDocDialog.tags && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    الوسوم
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {viewDocDialog.tags.map(t => (
                      <Chip key={t} label={t} size="small" />
                    ))}
                  </Box>
                </Grid>
              )}
              {viewDocDialog.rejectionReason && (
                <Grid item xs={12}>
                  <Alert severity="error">سبب الرفض: {viewDocDialog.rejectionReason}</Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setViewDocDialog(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف المستند "{deleteConfirm?.title}"؟</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDeleteDoc}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SmartDocumentsPage;
