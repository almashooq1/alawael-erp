/**
 * 📋 نظام النماذج الجاهزة — Form Templates System
 * AlAwael ERP — Ready-made form templates for beneficiaries, HR, admin & finance
 * @created 2026-03-13
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  InputAdornment,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fade,
  Switch,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Description as FormIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Assignment as SubmissionIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  People as PeopleIcon,
  Business as AdminIcon,
  AttachMoney as FinanceIcon,
  Accessibility as BeneficiaryIcon,
  Article as ArticleIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import formTemplatesService from '../../services/formTemplatesService';

/* ═══ Category icon map ═══ */
const CATEGORY_ICONS = {
  all: <FormIcon />,
  beneficiary: <BeneficiaryIcon />,
  hr: <PeopleIcon />,
  administration: <AdminIcon />,
  finance: <FinanceIcon />,
  general: <ArticleIcon />,
};

const CATEGORY_COLORS = {
  all: '#455A64',
  beneficiary: '#1565C0',
  hr: '#D32F2F',
  administration: '#6D4C41',
  finance: '#2E7D32',
  general: '#757575',
};

/* ═══ Stats Card ═══ */
const StatCard = ({ label, value, icon, color }) => (
  <Card
    elevation={0}
    sx={{
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      border: `1px solid ${color}30`,
      borderRadius: 3,
      height: '100%',
    }}
  >
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}20`,
          color,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight={700} color={color}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

/* ═══ Template Card ═══ */
const TemplateCard = ({ template, onFill, onView }) => {
  const categoryColor = CATEGORY_COLORS[template.category] || '#757575';
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        transition: 'all 0.25s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          borderColor: categoryColor,
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px ${categoryColor}20`,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              fontSize: '1.8rem',
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${template.color || categoryColor}15`,
              flexShrink: 0,
            }}
          >
            {template.icon || '📋'}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {template.name}
            </Typography>
            <Chip
              label={formTemplatesService.getCategoryLabel(template.category)}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: `${categoryColor}15`,
                color: categoryColor,
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.6 }}>
          {template.description}
        </Typography>
        {template.fields?.length > 0 && (
          <Typography variant="caption" color="text.disabled">
            {template.fields.filter(f => f.type !== 'header' && f.type !== 'divider').length} حقل
            {template.requiresApproval && ' • يتطلب موافقة'}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => onFill(template)}
          sx={{
            flexGrow: 1,
            bgcolor: categoryColor,
            '&:hover': { bgcolor: categoryColor, filter: 'brightness(0.9)' },
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          تعبئة النموذج
        </Button>
        <Tooltip title="معاينة">
          <IconButton size="small" onClick={() => onView(template)}>
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

/* ═══ Dynamic Form Field Renderer ═══ */
const FormFieldRenderer = ({ field, value, onChange, error }) => {
  const commonProps = {
    fullWidth: true,
    size: 'small',
    required: field.required,
    error: !!error,
    helperText: error,
    sx: { mb: 0 },
  };

  switch (field.type) {
    case 'header':
      return (
        <Typography variant="h6" fontWeight={700} color="primary" sx={{ mt: 2, mb: 1 }}>
          {field.label}
        </Typography>
      );
    case 'divider':
      return <Divider sx={{ my: 2 }} />;
    case 'textarea':
      return (
        <TextField
          {...commonProps}
          label={field.label}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
          multiline
          rows={4}
        />
      );
    case 'select':
      return (
        <FormControl {...commonProps}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value || ''}
            onChange={e => onChange(field.name, e.target.value)}
            label={field.label}
          >
            {(field.options || []).map(opt => (
              <MenuItem key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    case 'radio':
      return (
        <FormControl component="fieldset" error={!!error}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <RadioGroup value={value || ''} onChange={e => onChange(field.name, e.target.value)} row>
            {(field.options || []).map(opt => (
              <FormControlLabel
                key={opt.value || opt}
                value={opt.value || opt}
                control={<Radio size="small" />}
                label={opt.label || opt}
              />
            ))}
          </RadioGroup>
          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
        </FormControl>
      );
    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value}
              onChange={e => onChange(field.name, e.target.checked)}
              size="small"
            />
          }
          label={field.label}
        />
      );
    case 'date':
      return (
        <TextField
          {...commonProps}
          label={field.label}
          type="date"
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      );
    case 'number':
      return (
        <TextField
          {...commonProps}
          label={field.label}
          type="number"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
          inputProps={{
            min: field.validation?.min,
            max: field.validation?.max,
          }}
        />
      );
    case 'email':
      return (
        <TextField
          {...commonProps}
          label={field.label}
          type="email"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
        />
      );
    case 'tel':
      return (
        <TextField
          {...commonProps}
          label={field.label}
          type="tel"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
        />
      );
    case 'file':
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {field.label} {field.required && '*'}
          </Typography>
          <Button variant="outlined" component="label" size="small" sx={{ borderRadius: 2 }}>
            اختر ملف
            <input
              type="file"
              hidden
              onChange={e => onChange(field.name, e.target.files[0]?.name || '')}
            />
          </Button>
          {value && (
            <Typography variant="caption" sx={{ ml: 1 }}>
              {value}
            </Typography>
          )}
        </Box>
      );
    default:
      // text
      return (
        <TextField
          {...commonProps}
          label={field.label}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
        />
      );
  }
};

/* ═══ Main Component ═══ */
export default function FormTemplates() {
  const showSnackbar = useSnackbar();

  // ─── State ───
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [activeTab, setActiveTab] = useState(0); // 0=templates, 1=submissions, 2=pending
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [fillDialog, setFillDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [approvalComment, setApprovalComment] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'general',
    icon: '📋',
    color: '#1976d2',
    requiresApproval: true,
    fields: [],
  });

  // ─── Load Data ───
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      const data = await formTemplatesService.getTemplates(params);
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('خطأ في تحميل النماذج', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, showSnackbar]);

  const loadCategories = useCallback(async () => {
    const data = await formTemplatesService.getCategories();
    if (data) setCategories(data);
  }, []);

  const loadStats = useCallback(async () => {
    const data = await formTemplatesService.getStats();
    if (data) setStats(data.stats || data);
  }, []);

  const loadSubmissions = useCallback(async () => {
    const data = await formTemplatesService.getMySubmissions();
    if (data) setSubmissions(data.submissions || []);
  }, []);

  const loadPendingSubmissions = useCallback(async () => {
    const data = await formTemplatesService.getPendingSubmissions();
    if (data) setPendingSubmissions(data.submissions || []);
  }, []);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (activeTab === 1) loadSubmissions();
    if (activeTab === 2) loadPendingSubmissions();
  }, [activeTab, loadSubmissions, loadPendingSubmissions]);

  // ─── Filtered Templates ───
  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.templateId?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  // ─── Handlers ───
  const handleFill = useCallback(template => {
    setSelectedTemplate(template);
    setFormData({});
    setFormErrors({});
    setFormNotes('');
    setFillDialog(true);
  }, []);

  const handleView = useCallback(template => {
    setSelectedTemplate(template);
    setViewDialog(true);
  }, []);

  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setFormErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const validateForm = useCallback(() => {
    if (!selectedTemplate?.fields) return true;
    const errors = {};
    selectedTemplate.fields
      .filter(f => f.type !== 'header' && f.type !== 'divider')
      .forEach(field => {
        if (field.required && !formData[field.name]) {
          errors[field.name] = 'هذا الحقل مطلوب';
        }
        if (field.validation) {
          const val = formData[field.name];
          if (val && field.validation.minLength && val.length < field.validation.minLength) {
            errors[field.name] = `الحد الأدنى ${field.validation.minLength} حرف`;
          }
          if (val && field.validation.maxLength && val.length > field.validation.maxLength) {
            errors[field.name] = `الحد الأقصى ${field.validation.maxLength} حرف`;
          }
        }
      });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedTemplate, formData]);

  const handleSubmitForm = useCallback(async () => {
    if (!validateForm()) {
      showSnackbar('يرجى تعبئة جميع الحقول المطلوبة', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { data: formData, notes: formNotes };
      const result = await formTemplatesService.submitForm(
        selectedTemplate.templateId || selectedTemplate._id,
        payload
      );
      if (result?.success !== false) {
        showSnackbar(
          `تم إرسال النموذج بنجاح${result?.submission?.submissionNumber ? ` — رقم: ${result.submission.submissionNumber}` : ''}`,
          'success'
        );
        setFillDialog(false);
        loadSubmissions();
        loadStats();
      } else {
        showSnackbar('فشل إرسال النموذج', 'error');
      }
    } catch {
      showSnackbar('خطأ في إرسال النموذج', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm,
    formData,
    formNotes,
    selectedTemplate,
    showSnackbar,
    loadSubmissions,
    loadStats,
  ]);

  const handleApprove = useCallback(
    async submissionId => {
      try {
        const result = await formTemplatesService.approveSubmission(submissionId, approvalComment);
        if (result?.success !== false) {
          showSnackbar('تمت الموافقة على الطلب بنجاح', 'success');
          setApprovalComment('');
          loadPendingSubmissions();
          loadStats();
        }
      } catch {
        showSnackbar('خطأ في اعتماد الطلب', 'error');
      }
    },
    [approvalComment, showSnackbar, loadPendingSubmissions, loadStats]
  );

  const handleReject = useCallback(
    async submissionId => {
      if (!approvalComment.trim()) {
        showSnackbar('يرجى كتابة سبب الرفض', 'warning');
        return;
      }
      try {
        const result = await formTemplatesService.rejectSubmission(submissionId, approvalComment);
        if (result?.success !== false) {
          showSnackbar('تم رفض الطلب', 'info');
          setApprovalComment('');
          loadPendingSubmissions();
          loadStats();
        }
      } catch {
        showSnackbar('خطأ في رفض الطلب', 'error');
      }
    },
    [approvalComment, showSnackbar, loadPendingSubmissions, loadStats]
  );

  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplate.name.trim()) {
      showSnackbar('يرجى إدخال اسم النموذج', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const templateData = {
        ...newTemplate,
        templateId: `custom-${Date.now()}`,
        isBuiltIn: false,
      };
      const result = await formTemplatesService.createTemplate(templateData);
      if (result?.success !== false) {
        showSnackbar('تم إنشاء النموذج بنجاح', 'success');
        setCreateDialog(false);
        setNewTemplate({
          name: '',
          description: '',
          category: 'general',
          icon: '📋',
          color: '#1976d2',
          requiresApproval: true,
          fields: [],
        });
        loadTemplates();
      }
    } catch {
      showSnackbar('خطأ في إنشاء النموذج', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [newTemplate, showSnackbar, loadTemplates]);

  // ─── Render: Header ───
  const renderHeader = () => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
        color: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              النماذج الجاهزة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              نماذج إلكترونية جاهزة للمستفيدين وشؤون الموظفين والإدارة
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton
            sx={{ color: '#fff' }}
            onClick={() => {
              loadTemplates();
              loadStats();
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats row */}
      {stats && (
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="إجمالي النماذج"
              value={stats.totalTemplates || templates.length || 0}
              icon={<FormIcon />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="الطلبات المرسلة"
              value={stats.totalSubmissions || 0}
              icon={<SendIcon />}
              color="#FF9800"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="طلبات معتمدة"
              value={stats.approvedSubmissions || 0}
              icon={<ApprovedIcon />}
              color="#4CAF50"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="بانتظار المراجعة"
              value={stats.pendingSubmissions || 0}
              icon={<PendingIcon />}
              color="#F44336"
            />
          </Grid>
        </Grid>
      )}
    </Paper>
  );

  // ─── Render: Category Filters ───
  const renderCategoryFilters = () => (
    <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
      {categories.map(cat => (
        <Chip
          key={cat.id}
          label={`${cat.label} (${cat.count || 0})`}
          icon={CATEGORY_ICONS[cat.id]}
          variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
          color={selectedCategory === cat.id ? 'primary' : 'default'}
          onClick={() => setSelectedCategory(cat.id)}
          sx={{
            fontWeight: selectedCategory === cat.id ? 700 : 400,
            borderRadius: 2,
            px: 1,
            ...(selectedCategory === cat.id && {
              bgcolor: CATEGORY_COLORS[cat.id] || '#1565C0',
              color: '#fff',
              '& .MuiChip-icon': { color: '#fff' },
            }),
          }}
        />
      ))}
    </Box>
  );

  // ─── Render: Templates Grid ───
  const renderTemplatesGrid = () => (
    <Fade in={!loading}>
      <Box>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="ابحث عن نموذج..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3, maxWidth: 400 }}
        />

        {renderCategoryFilters()}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              جاري تحميل النماذج...
            </Typography>
          </Box>
        ) : filteredTemplates.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <FormIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              لا توجد نماذج
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {searchQuery ? 'جرب البحث بكلمات أخرى' : 'لم يتم العثور على نماذج في هذا التصنيف'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {filteredTemplates.map(template => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={template.templateId || template._id}>
                <TemplateCard template={template} onFill={handleFill} onView={handleView} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Fade>
  );

  // ─── Render: My Submissions ───
  const renderSubmissions = () => (
    <Fade in>
      <Box>
        {submissions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <SubmissionIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              لا توجد طلبات مرسلة
            </Typography>
            <Typography variant="body2" color="text.disabled">
              يمكنك تعبئة وإرسال النماذج من تبويب &quot;النماذج المتاحة&quot;
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النموذج</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map(sub => (
                  <TableRow key={sub._id || sub.submissionNumber} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        {sub.submissionNumber || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{sub.templateName || '—'}</TableCell>
                    <TableCell>
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('ar-SA') : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formTemplatesService.getStatusLabel(sub.status)}
                        size="small"
                        sx={{
                          bgcolor: `${formTemplatesService.getStatusColor(sub.status)}18`,
                          color: formTemplatesService.getStatusColor(sub.status),
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="طباعة">
                        <IconButton size="small">
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Fade>
  );

  // ─── Render: Fill Dialog ───
  const renderFillDialog = () => (
    <Dialog
      open={fillDialog}
      onClose={() => !submitting && setFillDialog(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${selectedTemplate?.color || '#1565C0'}20, ${selectedTemplate?.color || '#1565C0'}08)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ fontSize: '1.5rem' }}>{selectedTemplate?.icon || '📋'}</Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {selectedTemplate?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedTemplate?.description}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={() => !submitting && setFillDialog(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        {selectedTemplate?.requiresApproval && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            هذا النموذج يتطلب موافقة. سيتم إرساله للمراجعة بعد التقديم.
            {selectedTemplate.approvalSteps?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" fontWeight={600}>
                  مراحل الموافقة:
                </Typography>
                <Stepper alternativeLabel activeStep={-1} sx={{ mt: 1 }}>
                  {selectedTemplate.approvalSteps.map((step, i) => (
                    <Step key={i}>
                      <StepLabel>{step.label || step.role || `مرحلة ${i + 1}`}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>
            )}
          </Alert>
        )}

        <Grid container spacing={2.5}>
          {(selectedTemplate?.fields || []).map((field, idx) => {
            if (field.type === 'header' || field.type === 'divider') {
              return (
                <Grid item xs={12} key={idx}>
                  <FormFieldRenderer field={field} />
                </Grid>
              );
            }
            const gridSize = field.gridSize || 12;
            return (
              <Grid item xs={12} sm={gridSize > 6 ? 12 : 6} key={field.name || idx}>
                <FormFieldRenderer
                  field={field}
                  value={formData[field.name]}
                  onChange={handleFieldChange}
                  error={formErrors[field.name]}
                />
              </Grid>
            );
          })}

          {/* Notes */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <TextField
              fullWidth
              size="small"
              label="ملاحظات إضافية"
              placeholder="أضف أي ملاحظات تود إرفاقها مع الطلب..."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        {selectedTemplate?.fields?.length === 0 && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            هذا النموذج لا يحتوي على حقول بعد. يتم إضافة الحقول من قبل الإدارة.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={() => setFillDialog(false)} disabled={submitting} sx={{ borderRadius: 2 }}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitForm}
          disabled={submitting || !selectedTemplate?.fields?.length}
          startIcon={submitting ? <CircularProgress size={18} /> : <SendIcon />}
          sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
        >
          {submitting ? 'جاري الإرسال...' : 'إرسال النموذج'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ─── Render: View Dialog ───
  const renderViewDialog = () => (
    <Dialog
      open={viewDialog}
      onClose={() => setViewDialog(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${selectedTemplate?.color || '#1565C0'}20, ${selectedTemplate?.color || '#1565C0'}08)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ fontSize: '1.5rem' }}>{selectedTemplate?.icon || '📋'}</Box>
          <Typography variant="h6" fontWeight={700}>
            {selectedTemplate?.name}
          </Typography>
        </Box>
        <IconButton onClick={() => setViewDialog(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8 }}>
          {selectedTemplate?.description}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Chip
            label={formTemplatesService.getCategoryLabel(selectedTemplate?.category)}
            size="small"
            sx={{
              bgcolor: `${CATEGORY_COLORS[selectedTemplate?.category] || '#757575'}15`,
              color: CATEGORY_COLORS[selectedTemplate?.category] || '#757575',
              fontWeight: 600,
              mr: 1,
            }}
          />
          {selectedTemplate?.requiresApproval && (
            <Chip label="يتطلب موافقة" size="small" color="warning" variant="outlined" />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
          حقول النموذج (
          {selectedTemplate?.fields?.filter(f => f.type !== 'header' && f.type !== 'divider')
            .length || 0}
          )
        </Typography>

        {(selectedTemplate?.fields || [])
          .filter(f => f.type !== 'header' && f.type !== 'divider')
          .map((field, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
                px: 2,
                borderRadius: 2,
                bgcolor: idx % 2 === 0 ? 'grey.50' : 'transparent',
              }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
                {field.label}
              </Typography>
              <Chip
                label={field.type}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem' }}
              />
              {field.required && (
                <Chip
                  label="مطلوب"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem' }}
                />
              )}
            </Box>
          ))}

        {(!selectedTemplate?.fields || selectedTemplate.fields.length === 0) && (
          <Typography color="text.secondary" variant="body2">
            لم يتم تحديد حقول لهذا النموذج بعد.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setViewDialog(false)} sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => {
            setViewDialog(false);
            handleFill(selectedTemplate);
          }}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          تعبئة النموذج
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ─── Render: Pending Approvals ───
  const renderPendingApprovals = () => (
    <Fade in>
      <Box>
        {pendingSubmissions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <ApprovedIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              لا توجد طلبات بانتظار الموافقة
            </Typography>
            <Typography variant="body2" color="text.disabled">
              ستظهر هنا الطلبات المُحالة إليك للمراجعة والاعتماد
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pendingSubmissions.map(sub => (
              <Card
                key={sub._id || sub.submissionNumber}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  borderRight: '4px solid #FF9800',
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {sub.templateName || 'نموذج'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        مقدم من: {sub.submittedBy?.name || '—'} |{' '}
                        {sub.submittedBy?.department || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                        {sub.submissionNumber}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.disabled">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('ar-SA') : ''}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Show submitted data summary */}
                  {sub.data && (
                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, mb: 1.5 }}>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{ mb: 0.5, display: 'block' }}
                      >
                        بيانات الطلب:
                      </Typography>
                      <Grid container spacing={1}>
                        {Object.entries(sub.data)
                          .slice(0, 6)
                          .map(([key, val]) => (
                            <Grid item xs={6} sm={4} key={key}>
                              <Typography variant="caption" color="text.secondary">
                                {key}:
                              </Typography>
                              <Typography variant="body2" fontWeight={500}>
                                {String(val)}
                              </Typography>
                            </Grid>
                          ))}
                      </Grid>
                      {Object.keys(sub.data).length > 6 && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                          ... و{Object.keys(sub.data).length - 6} حقل آخر
                        </Typography>
                      )}
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="ملاحظات الموافقة/الرفض (مطلوب للرفض)..."
                    value={approvalComment}
                    onChange={e => setApprovalComment(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<ApprovedIcon />}
                    onClick={() => handleApprove(sub._id)}
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                  >
                    اعتماد
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<RejectedIcon />}
                    onClick={() => handleReject(sub._id)}
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                  >
                    رفض
                  </Button>
                  <Tooltip title="عرض التفاصيل">
                    <IconButton size="small">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Fade>
  );

  // ─── Render: Create Template Dialog ───
  const renderCreateDialog = () => (
    <Dialog
      open={createDialog}
      onClose={() => !submitting && setCreateDialog(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AddIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            إنشاء نموذج جديد
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Alert severity="info" sx={{ borderRadius: 2, mt: 1 }}>
          يمكنك إنشاء نموذج مخصص جديد. سيتم إضافة الحقول لاحقاً من صفحة إدارة النماذج.
        </Alert>
        <TextField
          fullWidth
          label="اسم النموذج *"
          placeholder="مثال: طلب تصريح خروج"
          value={newTemplate.name}
          onChange={e => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
          size="small"
        />
        <TextField
          fullWidth
          label="وصف النموذج"
          placeholder="وصف مختصر لاستخدام هذا النموذج"
          value={newTemplate.description}
          onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
          size="small"
          multiline
          rows={2}
        />
        <FormControl fullWidth size="small">
          <InputLabel>التصنيف</InputLabel>
          <Select
            value={newTemplate.category}
            onChange={e => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
            label="التصنيف"
          >
            <MenuItem value="beneficiary">شؤون المستفيدين</MenuItem>
            <MenuItem value="hr">شؤون الموظفين</MenuItem>
            <MenuItem value="administration">الشؤون الإدارية</MenuItem>
            <MenuItem value="finance">الشؤون المالية</MenuItem>
            <MenuItem value="general">عامة</MenuItem>
          </Select>
        </FormControl>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الأيقونة (إيموجي)"
              value={newTemplate.icon}
              onChange={e => setNewTemplate(prev => ({ ...prev, icon: e.target.value }))}
              size="small"
              inputProps={{ maxLength: 4 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="اللون"
              type="color"
              value={newTemplate.color}
              onChange={e => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
              size="small"
            />
          </Grid>
        </Grid>
        <FormControlLabel
          control={
            <Switch
              checked={newTemplate.requiresApproval}
              onChange={e =>
                setNewTemplate(prev => ({ ...prev, requiresApproval: e.target.checked }))
              }
            />
          }
          label="يتطلب موافقة"
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          onClick={() => setCreateDialog(false)}
          disabled={submitting}
          sx={{ borderRadius: 2 }}
        >
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateTemplate}
          disabled={submitting || !newTemplate.name.trim()}
          startIcon={submitting ? <CircularProgress size={18} /> : <AddIcon />}
          sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
        >
          {submitting ? 'جاري الإنشاء...' : 'إنشاء النموذج'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ─── Main Render ───
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {renderHeader()}

      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 600, minHeight: 56 },
          }}
        >
          <Tab
            icon={<FormIcon />}
            iconPosition="start"
            label={`النماذج المتاحة (${filteredTemplates.length})`}
          />
          <Tab
            icon={
              <Badge badgeContent={submissions.length} color="primary" max={99}>
                <SubmissionIcon />
              </Badge>
            }
            iconPosition="start"
            label="طلباتي"
          />
          <Tab
            icon={
              <Badge badgeContent={pendingSubmissions.length} color="warning" max={99}>
                <PendingIcon />
              </Badge>
            }
            iconPosition="start"
            label="بانتظار الموافقة"
          />
        </Tabs>

        {/* Create template button (floats in top-right of content) */}
        <Box sx={{ p: 3, position: 'relative' }}>
          {activeTab === 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                borderRadius: 2,
                fontWeight: 600,
                zIndex: 1,
              }}
            >
              نموذج جديد
            </Button>
          )}
          {activeTab === 0 && renderTemplatesGrid()}
          {activeTab === 1 && renderSubmissions()}
          {activeTab === 2 && renderPendingApprovals()}
        </Box>
      </Paper>

      {/* Dialogs */}
      {renderFillDialog()}
      {renderViewDialog()}
      {renderCreateDialog()}
    </Box>
  );
}
