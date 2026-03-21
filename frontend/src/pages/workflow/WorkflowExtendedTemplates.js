/**
 * WorkflowExtendedTemplates – قوالب سير العمل المتقدمة
 * Extended workflow templates: salary advance, maintenance, transfer, training, etc.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AttachMoney from '@mui/icons-material/AttachMoney';
import School from '@mui/icons-material/School';
import Description from '@mui/icons-material/Description';
import Assessment from '@mui/icons-material/Assessment';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Refresh from '@mui/icons-material/Refresh';
import ListAlt from '@mui/icons-material/ListAlt';
import Visibility from '@mui/icons-material/Visibility';
import CheckCircle from '@mui/icons-material/CheckCircle';

const TEMPLATE_ICONS = {
  'salary-advance': <AttachMoney />,
  'maintenance-request': <Build />,
  'employee-transfer': <SwapHoriz />,
  'training-request': <School />,
  'disciplinary-action': <Gavel />,
  'contract-request': <Description />,
  'resignation-request': <ExitToApp />,
  'business-travel': <FlightTakeoff />,
  'performance-review': <Assessment />,
  'grievance-complaint': <ReportProblem />,
};

const TEMPLATE_COLORS = {
  'salary-advance': '#16a34a',
  'maintenance-request': '#f59e0b',
  'employee-transfer': '#6366f1',
  'training-request': '#2563eb',
  'disciplinary-action': '#dc2626',
  'contract-request': '#0891b2',
  'resignation-request': '#78716c',
  'business-travel': '#8b5cf6',
  'performance-review': '#ea580c',
  'grievance-complaint': '#be123c',
};

const CATEGORY_AR = {
  hr: 'الموارد البشرية',
  finance: 'المالية',
  operations: 'العمليات',
  legal: 'الشؤون القانونية',
  admin: 'الإدارة',
};

export default function WorkflowExtendedTemplates() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [deployDialog, setDeployDialog] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getExtendedTemplates();
      setTemplates(res.data?.data || res.data || []);
    } catch {
      showSnackbar('تعذر تحميل القوالب المتقدمة', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDeploy = async () => {
    if (!selected || !deployName) return;
    try {
      setDeploying(true);
      await workflowService.deployExtendedTemplate(selected.id, { name: deployName });
      showSnackbar('تم نشر القالب بنجاح — يمكنك الآن بدء سير العمل', 'success');
      setDeployDialog(false);
      setDeployName('');
      nav('/workflow/templates');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'خطأ في نشر القالب', 'error');
    } finally {
      setDeploying(false);
    }
  };

  const cats = ['all', ...new Set(templates.map(t => t.category))];
  const filtered =
    filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat);

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <FileCopy sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              قوالب سير العمل المتقدمة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              10 قوالب جاهزة للنشر — طلبات الراتب، الصيانة، النقل، والمزيد
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchTemplates}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* CATEGORY FILTERS */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <Chip
            key={c}
            label={c === 'all' ? 'الكل' : CATEGORY_AR[c] || c}
            variant={filterCat === c ? 'filled' : 'outlined'}
            color={filterCat === c ? 'primary' : 'default'}
            onClick={() => setFilterCat(c)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>

      {/* TEMPLATES GRID */}
      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <FileCopy sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">لا توجد قوالب في هذه الفئة</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(tmpl => {
            const color = TEMPLATE_COLORS[tmpl.id] || '#6366f1';
            const icon = TEMPLATE_ICONS[tmpl.id] || <Category />;
            return (
              <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { borderColor: color, boxShadow: 3 },
                    transition: 'all 0.2s',
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: alpha(color, 0.15), color, width: 44, height: 44 }}>
                        {icon}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {tmpl.nameAr || tmpl.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={CATEGORY_AR[tmpl.category] || tmpl.category}
                          sx={{ fontSize: 10, bgcolor: alpha(color, 0.08), color }}
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.5, minHeight: 40 }}
                    >
                      {tmpl.descriptionAr || tmpl.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={<ListAlt sx={{ fontSize: 14 }} />}
                        label={`${tmpl.steps?.length || 0} خطوات`}
                        variant="outlined"
                        sx={{ fontSize: 10 }}
                      />
                      {tmpl.sla && (
                        <Chip
                          size="small"
                          label={`SLA: ${tmpl.sla.deadline || '—'}`}
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                  <Divider />
                  <Box sx={{ p: 1.5, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelected(tmpl);
                        setDetailOpen(true);
                      }}
                    >
                      عرض التفاصيل
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<RocketLaunch />}
                      sx={{ bgcolor: color, '&:hover': { bgcolor: alpha(color, 0.85) } }}
                      onClick={() => {
                        setSelected(tmpl);
                        setDeployName(tmpl.nameAr || tmpl.name);
                        setDeployDialog(true);
                      }}
                    >
                      نشر
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(TEMPLATE_COLORS[selected.id] || '#6366f1', 0.15),
                  color: TEMPLATE_COLORS[selected.id] || '#6366f1',
                }}
              >
                {TEMPLATE_ICONS[selected.id] || <Category />}
              </Avatar>
              {selected.nameAr || selected.name}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selected.descriptionAr || selected.description}
              </Typography>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                خطوات سير العمل
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>الخطوة</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>المعيّن</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selected.steps || []).map((step, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{step.nameAr || step.name}</TableCell>
                        <TableCell>
                          <Chip size="small" label={step.type} sx={{ fontSize: 10 }} />
                        </TableCell>
                        <TableCell>{step.assigneeRole || step.assignee || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selected.formFields && selected.formFields.length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    حقول النموذج
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selected.formFields.map((f, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={f.labelAr || f.label || f.name}
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                        icon={
                          f.required ? (
                            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : undefined
                        }
                      />
                    ))}
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>إغلاق</Button>
              <Button
                variant="contained"
                startIcon={<RocketLaunch />}
                onClick={() => {
                  setDetailOpen(false);
                  setDeployName(selected.nameAr || selected.name);
                  setDeployDialog(true);
                }}
              >
                نشر هذا القالب
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DEPLOY DIALOG */}
      <Dialog open={deployDialog} onClose={() => setDeployDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>نشر القالب</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              سيتم إنشاء تعريف سير عمل جديد من هذا القالب. يمكنك تخصيصه بعد النشر.
            </Alert>
            <TextField
              label="اسم سير العمل"
              fullWidth
              required
              value={deployName}
              onChange={e => setDeployName(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleDeploy} disabled={!deployName || deploying}>
            {deploying ? 'جارٍ النشر...' : 'نشر'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
