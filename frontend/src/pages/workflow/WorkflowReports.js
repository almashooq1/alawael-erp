/**
 * WorkflowReports – التقارير المحفوظة
 * Create, manage, and generate workflow reports.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const REPORT_TYPES = [
  {
    value: 'performance',
    label: 'تقرير الأداء',
    icon: <Speed fontSize="small" />,
    color: '#6366f1',
  },
  {
    value: 'sla_compliance',
    label: 'التزام SLA',
    icon: <TrendingUp fontSize="small" />,
    color: '#16a34a',
  },
  {
    value: 'task_distribution',
    label: 'توزيع المهام',
    icon: <PieChart fontSize="small" />,
    color: '#2563eb',
  },
  {
    value: 'bottleneck_analysis',
    label: 'تحليل الاختناقات',
    icon: <BarChart fontSize="small" />,
    color: '#dc2626',
  },
  {
    value: 'user_productivity',
    label: 'إنتاجية المستخدمين',
    icon: <People fontSize="small" />,
    color: '#f59e0b',
  },
  {
    value: 'category_breakdown',
    label: 'تحليل الفئات',
    icon: <Category fontSize="small" />,
    color: '#0891b2',
  },
  {
    value: 'trend_analysis',
    label: 'تحليل الاتجاهات',
    icon: <TrendingUp fontSize="small" />,
    color: '#7c3aed',
  },
];

export default function WorkflowReports() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [resultDialog, setResultDialog] = useState(null);
  const [_tabValue, _setTabValue] = useState(0);

  const [form, setForm] = useState({
    name: '',
    type: 'performance',
    description: '',
    dateRange: '30d',
    schedule: '',
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getReports();
      setReports(res.data?.data || res.data || []);
    } catch {
      showSnackbar('تعذر تحميل التقارير', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSave = async () => {
    try {
      if (editId) {
        await workflowService.updateReport(editId, form);
        showSnackbar('تم تحديث التقرير', 'success');
      } else {
        await workflowService.createReport(form);
        showSnackbar('تم إنشاء التقرير بنجاح', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'خطأ في حفظ التقرير', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await workflowService.deleteReport(id);
      showSnackbar('تم حذف التقرير', 'success');
      fetchReports();
    } catch {
      showSnackbar('خطأ في حذف التقرير', 'error');
    }
  };

  const handleGenerate = async id => {
    try {
      setGenerating(id);
      const res = await workflowService.generateReport(id);
      setResultDialog(res.data?.data || res.data);
      showSnackbar('تم إنشاء التقرير بنجاح', 'success');
    } catch {
      showSnackbar('خطأ في إنشاء التقرير', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const resetForm = () => {
    setForm({ name: '', type: 'performance', description: '', dateRange: '30d', schedule: '' });
    setEditId(null);
  };

  const openEdit = r => {
    setForm({
      name: r.name,
      type: r.type,
      description: r.description || '',
      dateRange: r.dateRange || '30d',
      schedule: r.schedule || '',
    });
    setEditId(r._id);
    setDialogOpen(true);
  };

  const typeInfo = type => REPORT_TYPES.find(t => t.value === type) || REPORT_TYPES[0];

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <Assessment sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              التقارير والتحليلات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إنشاء وإدارة تقارير سير العمل
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            تقرير جديد
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchReports}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* REPORT TYPE CARDS */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        أنواع التقارير المتاحة
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {REPORT_TYPES.map(rt => (
          <Grid item xs={6} sm={4} md={12 / 7} key={rt.value}>
            <Card
              sx={{
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: rt.color, boxShadow: 2 },
                transition: 'all 0.2s',
              }}
              onClick={() => {
                resetForm();
                setForm(f => ({ ...f, type: rt.value }));
                setDialogOpen(true);
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar
                  sx={{
                    bgcolor: alpha(rt.color, 0.15),
                    color: rt.color,
                    mx: 'auto',
                    mb: 0.5,
                    width: 36,
                    height: 36,
                  }}
                >
                  {rt.icon}
                </Avatar>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11 }}>
                  {rt.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SAVED REPORTS TABLE */}
      <Paper>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            التقارير المحفوظة ({reports.length})
          </Typography>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} height={55} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : reports.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">لا توجد تقارير محفوظة</Typography>
            <Typography variant="caption" color="text.secondary">
              أنشئ تقريرك الأول من الأزرار أعلاه
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>النطاق الزمني</TableCell>
                  <TableCell>الجدولة</TableCell>
                  <TableCell>آخر تشغيل</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map(r => {
                  const ti = typeInfo(r.type);
                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {r.name}
                        </Typography>
                        {r.description && (
                          <Typography variant="caption" color="text.secondary">
                            {r.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={ti.icon}
                          label={ti.label}
                          sx={{ bgcolor: alpha(ti.color, 0.1), color: ti.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={r.dateRange || '30d'} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {r.schedule ? (
                          <Chip
                            size="small"
                            icon={<Schedule sx={{ fontSize: 14 }} />}
                            label={r.schedule}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {r.lastRun ? new Date(r.lastRun).toLocaleDateString('ar') : '—'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="تشغيل التقرير">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleGenerate(r._id)}
                              disabled={generating === r._id}
                            >
                              {generating === r._id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <PlayArrow fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => openEdit(r)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(r._id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل التقرير' : 'تقرير جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="اسم التقرير"
              fullWidth
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>نوع التقرير</InputLabel>
              <Select
                value={form.type}
                label="نوع التقرير"
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {REPORT_TYPES.map(rt => (
                  <MenuItem key={rt.value} value={rt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {rt.icon} {rt.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>النطاق الزمني</InputLabel>
              <Select
                value={form.dateRange}
                label="النطاق الزمني"
                onChange={e => setForm(f => ({ ...f, dateRange: e.target.value }))}
              >
                <MenuItem value="7d">آخر 7 أيام</MenuItem>
                <MenuItem value="30d">آخر 30 يوم</MenuItem>
                <MenuItem value="90d">آخر 90 يوم</MenuItem>
                <MenuItem value="180d">آخر 6 أشهر</MenuItem>
                <MenuItem value="365d">آخر سنة</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الجدولة (اختياري)</InputLabel>
              <Select
                value={form.schedule}
                label="الجدولة (اختياري)"
                onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
              >
                <MenuItem value="">بدون جدولة</MenuItem>
                <MenuItem value="daily">يومي</MenuItem>
                <MenuItem value="weekly">أسبوعي</MenuItem>
                <MenuItem value="monthly">شهري</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* RESULT DIALOG */}
      <Dialog open={!!resultDialog} onClose={() => setResultDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>نتيجة التقرير</DialogTitle>
        <DialogContent dividers>
          {resultDialog && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {resultDialog.reportName}
              </Typography>
              {resultDialog.summary && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {Object.entries(resultDialog.summary).map(([key, val]) => (
                    <Grid item xs={6} sm={4} key={key}>
                      <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">
                          {key}
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {typeof val === 'number' ? val.toLocaleString('ar') : String(val)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
              {resultDialog.details && (
                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  <pre style={{ direction: 'ltr', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(resultDialog.details, null, 2)}
                  </pre>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialog(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
