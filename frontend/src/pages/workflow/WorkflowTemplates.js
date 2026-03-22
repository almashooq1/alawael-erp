/**
 * WorkflowTemplates — قوالب سير العمل
 *
 * Gallery of pre-built templates with category filter,
 * preview dialog, and deploy-to-builder functionality.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  alpha,
  Card,
  CardContent,
  CardActions,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Rocket as DeployIcon,
  Visibility as PreviewIcon,
  Description as TemplateIcon,
  AccessTime as TimeIcon,
  ForkRight as StepsIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  request: { label: 'الطلبات', color: '#3B82F6', icon: '📝' },
  approval: { label: 'الموافقات', color: '#10B981', icon: '✅' },
  incident: { label: 'الحوادث', color: '#EF4444', icon: '⚠️' },
  change: { label: 'التغييرات', color: '#F59E0B', icon: '🔄' },
  project: { label: 'المشاريع', color: '#8B5CF6', icon: '📁' },
  custom: { label: 'مخصص', color: '#6B7280', icon: '🛠️' },
  general: { label: 'عام', color: '#6B7280', icon: '📋' },
};

const STEP_TYPE_LABELS = {
  start: 'بداية',
  end: 'نهاية',
  task: 'مهمة',
  approval: 'موافقة',
  notification: 'إشعار',
  condition: 'شرط',
  parallel: 'متوازي',
};

export default function WorkflowTemplates() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deploying, setDeploying] = useState(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getTemplates();
      setTemplates(res.data.data || []);
    } catch {
      showSnackbar('خطأ في تحميل القوالب', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDeploy = async templateId => {
    try {
      setDeploying(templateId);
      const res = await workflowService.deployTemplate(templateId);
      showSnackbar('تم نشر القالب كتعريف سير عمل جديد', 'success');
      const defId = res.data?.data?._id;
      if (defId) {
        navigate(`/workflow/builder/${defId}`);
      } else {
        navigate('/workflow/builder');
      }
    } catch {
      showSnackbar('خطأ في نشر القالب', 'error');
    } finally {
      setDeploying(null);
    }
  };

  // Filter templates
  const filtered = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.nameAr?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.descriptionAr?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TemplateIcon color="primary" /> قوالب سير العمل
            </Typography>
            <Typography variant="body2" color="text.secondary">
              قوالب جاهزة لإنشاء تعريفات سير العمل بسرعة
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchTemplates}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<WorkflowIcon />}
            onClick={() => navigate('/workflow/builder')}
          >
            إنشاء سير عمل من الصفر
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث في القوالب..."
            sx={{ minWidth: 250 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="الكل"
              variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
              color={categoryFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setCategoryFilter('all')}
            />
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <Chip
                key={key}
                label={`${cfg.icon} ${cfg.label}`}
                variant={categoryFilter === key ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(key)}
                sx={
                  categoryFilter === key
                    ? { bgcolor: alpha(cfg.color, 0.15), color: cfg.color, fontWeight: 600 }
                    : {}
                }
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Templates Grid */}
      <Grid container spacing={2}>
        {filtered.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ py: 8, textAlign: 'center' }}>
              <TemplateIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد قوالب مطابقة</Typography>
            </Paper>
          </Grid>
        ) : (
          filtered.map(tpl => {
            const cat = CATEGORY_CONFIG[tpl.category] || CATEGORY_CONFIG.general;
            const totalSteps = tpl.steps?.length || 0;
            const estHours = tpl.steps?.reduce((acc, s) => acc + (s.sla?.duration || 0), 0) || 0;

            return (
              <Grid item xs={12} sm={6} md={4} key={tpl.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: cat.color,
                      boxShadow: `0 4px 20px ${alpha(cat.color, 0.15)}`,
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    {/* Category badge */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Chip
                        size="small"
                        label={`${cat.icon} ${cat.label}`}
                        sx={{ bgcolor: alpha(cat.color, 0.1), color: cat.color, fontWeight: 600 }}
                      />
                    </Box>

                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>
                      {tpl.nameAr || tpl.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {tpl.descriptionAr || tpl.description}
                    </Typography>

                    {/* Stats */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip
                        icon={<StepsIcon />}
                        label={`${totalSteps} خطوة`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<TimeIcon />}
                        label={estHours > 0 ? `${estHours} ساعة` : '—'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Button
                      size="small"
                      startIcon={<PreviewIcon />}
                      onClick={() => setPreviewTemplate(tpl)}
                    >
                      معاينة
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<DeployIcon />}
                      disabled={deploying === tpl.id}
                      onClick={() => handleDeploy(tpl.id)}
                    >
                      {deploying === tpl.id ? 'جاري النشر...' : 'نشر'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* ─── Preview Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        maxWidth="md"
        fullWidth
      >
        {previewTemplate &&
          (() => {
            const tpl = previewTemplate;
            const cat = CATEGORY_CONFIG[tpl.category] || CATEGORY_CONFIG.general;
            return (
              <>
                <DialogTitle>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                      {tpl.nameAr || tpl.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={cat.label}
                      sx={{ bgcolor: alpha(cat.color, 0.1), color: cat.color }}
                    />
                  </Box>
                </DialogTitle>
                <DialogContent dividers>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {tpl.descriptionAr || tpl.description}
                  </Typography>

                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    مسار سير العمل ({tpl.steps?.length || 0} خطوة)
                  </Typography>

                  <Stepper orientation="vertical" activeStep={-1}>
                    {(tpl.steps || []).map((step, idx) => (
                      <Step key={step.id || idx} completed>
                        <StepLabel
                          optional={
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={STEP_TYPE_LABELS[step.type] || step.type}
                                variant="outlined"
                              />
                              {step.assignment?.type && (
                                <Chip
                                  size="small"
                                  label={
                                    step.assignment.type === 'role'
                                      ? `دور: ${step.assignment.value}`
                                      : step.assignment.type
                                  }
                                  variant="outlined"
                                />
                              )}
                              {step.sla?.duration > 0 && (
                                <Chip
                                  size="small"
                                  icon={<TimeIcon />}
                                  label={`${step.sla.duration} ساعة`}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                        >
                          <Typography fontWeight={600}>{step.nameAr || step.name}</Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setPreviewTemplate(null)}>إغلاق</Button>
                  <Button
                    variant="contained"
                    startIcon={<DeployIcon />}
                    onClick={() => {
                      setPreviewTemplate(null);
                      handleDeploy(tpl.id);
                    }}
                  >
                    نشر القالب
                  </Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>
    </Box>
  );
}
