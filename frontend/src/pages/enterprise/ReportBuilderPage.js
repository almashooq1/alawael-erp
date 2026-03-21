/**
 * ReportBuilderPage — مولد التقارير المتقدم
 *
 * Report template builder + execution + scheduling dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import {
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import enterpriseProService from '../../services/enterprisePro.service';
import {
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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReportIcon from '@mui/icons-material/Report';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import { ChartIcon } from 'utils/iconAliases';

const REPORT_TYPES = [
  { value: 'table', label: 'جدول', icon: <TableChartIcon /> },
  { value: 'chart', label: 'مخطط', icon: <ChartIcon /> },
  { value: 'summary', label: 'ملخص', icon: <ReportIcon /> },
  { value: 'pivot', label: 'جدول محوري', icon: <PieIcon /> },
];

const CHART_TYPES = ['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'radar'];

const initialForm = {
  name: '',
  nameAr: '',
  description: '',
  module: '',
  reportType: 'table',
  dataSource: '',
  fields: [],
  filters: [],
  groupBy: [],
  chartConfig: { type: 'bar', xAxis: '', yAxis: '', series: [], colors: [] },
  schedule: { enabled: false, frequency: 'weekly', format: 'pdf', recipients: [] },
  isPublic: false,
  tags: [],
};

export default function ReportBuilderPage() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [stats, setStats] = useState(null);
  const [reportModules, setReportModules] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...initialForm });
  const [fieldInput, setFieldInput] = useState({
    fieldKey: '',
    label: '',
    labelAr: '',
    dataType: 'text',
    aggregation: 'none',
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, mRes, sRes] = await Promise.all([
        enterpriseProService.getReportTemplates(),
        enterpriseProService.getReportModules(),
        enterpriseProService.getReportStats(),
      ]);
      setTemplates(tRes.data || []);
      setReportModules(mRes.data || []);
      setStats(sRes.data);
    } catch {
      showSnackbar('خطأ في تحميل القوالب', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseProService.getReportExecutions();
      setExecutions(res.data.executions || []);
    } catch {
      showSnackbar('خطأ في تحميل التنفيذات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);
  useEffect(() => {
    if (tab === 1) fetchExecutions();
  }, [tab, fetchExecutions]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...initialForm });
    setDialogOpen(true);
  };
  const openEdit = t => {
    setEditId(t._id);
    setForm({
      name: t.name || '',
      nameAr: t.nameAr || '',
      description: t.description || '',
      module: t.module || '',
      reportType: t.reportType || 'table',
      dataSource: t.dataSource || '',
      fields: t.fields || [],
      filters: t.filters || [],
      groupBy: t.groupBy || [],
      chartConfig: t.chartConfig || { type: 'bar', xAxis: '', yAxis: '', series: [], colors: [] },
      schedule: t.schedule || {
        enabled: false,
        frequency: 'weekly',
        format: 'pdf',
        recipients: [],
      },
      isPublic: t.isPublic || false,
      tags: t.tags || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.name || !form.module) {
        showSnackbar('الاسم والقسم مطلوبان', 'warning');
        return;
      }
      if (editId) {
        await enterpriseProService.updateReportTemplate(editId, form);
        showSnackbar('تم تحديث القالب', 'success');
      } else {
        await enterpriseProService.createReportTemplate(form);
        showSnackbar('تم إنشاء القالب', 'success');
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch {
      showSnackbar('خطأ في الحفظ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await enterpriseProService.deleteReportTemplate(id);
      showSnackbar('تم حذف القالب', 'success');
      fetchTemplates();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const handleClone = async id => {
    try {
      await enterpriseProService.cloneReportTemplate(id);
      showSnackbar('تم نسخ القالب', 'success');
      fetchTemplates();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleExecute = async id => {
    try {
      await enterpriseProService.executeReport(id, {});
      showSnackbar('تم تنفيذ التقرير بنجاح', 'success');
      if (tab === 1) fetchExecutions();
    } catch {
      showSnackbar('خطأ في التنفيذ', 'error');
    }
  };

  const addField = () => {
    if (!fieldInput.fieldKey) return;
    setForm(f => ({ ...f, fields: [...f.fields, { ...fieldInput, isVisible: true }] }));
    setFieldInput({ fieldKey: '', label: '', labelAr: '', dataType: 'text', aggregation: 'none' });
  };

  const removeField = idx => {
    setForm(f => ({ ...f, fields: f.fields.filter((_, i) => i !== idx) }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReportIcon sx={{ fontSize: 36, color: '#7B1FA2' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              مولد التقارير المتقدم
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Advanced Report Builder
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="secondary"
            onClick={openCreate}
          >
            قالب جديد
          </Button>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchTemplates}>
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'قوالب التقارير', value: stats.templateCount, color: '#7B1FA2' },
            { label: 'مرات التنفيذ', value: stats.executionCount, color: '#1565C0' },
            { label: 'الأقسام المغطاة', value: stats.byModule?.length || 0, color: '#00897B' },
          ].map((s, i) => (
            <Grid item xs={4} key={i}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(s.color, 0.1)}, ${alpha(s.color, 0.03)})`,
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="القوالب" icon={<ReportIcon />} iconPosition="start" />
        <Tab label="سجل التنفيذ" icon={<ScheduleIcon />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Tab 0: Templates ── */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {templates.map(t => (
            <Grid item xs={12} md={6} lg={4} key={t._id}>
              <Card
                sx={{ height: '100%', '&:hover': { boxShadow: 6 }, transition: 'box-shadow 0.3s' }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {t.nameAr || t.name}
                      </Typography>
                      {t.nameAr && (
                        <Typography variant="caption" color="text.secondary">
                          {t.name}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={
                        REPORT_TYPES.find(r => r.value === t.reportType)?.label || t.reportType
                      }
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t.description || '—'}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Chip label={t.module} size="small" sx={{ mr: 0.5 }} />
                      <Chip
                        label={`${t.fields?.length || 0} حقل`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    {t.schedule?.enabled && (
                      <Chip
                        icon={<ScheduleIcon />}
                        label={t.schedule.frequency}
                        size="small"
                        color="info"
                      />
                    )}
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      startIcon={<RunIcon />}
                      color="success"
                      variant="outlined"
                      onClick={() => handleExecute(t._id)}
                    >
                      تنفيذ
                    </Button>
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleClone(t._id)}>
                      <CloneIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(t._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {templates.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد قوالب — أنشئ أول قالب تقرير</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Tab 1: Execution History ── */}
      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#7B1FA2', 0.05) }}>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>القالب</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>النتائج</TableCell>
                  <TableCell>المدة</TableCell>
                  <TableCell>المنفذ</TableCell>
                  <TableCell>تحميل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {executions.map(ex => (
                  <TableRow key={ex._id} hover>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {new Date(ex.createdAt).toLocaleString('ar-SA')}
                    </TableCell>
                    <TableCell>{ex.template?.nameAr || ex.template?.name || '—'}</TableCell>
                    <TableCell>
                      <Chip label={ex.template?.module} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ex.status}
                        size="small"
                        color={
                          ex.status === 'completed'
                            ? 'success'
                            : ex.status === 'failed'
                              ? 'error'
                              : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>{ex.resultCount || 0}</TableCell>
                    <TableCell>
                      {ex.executionTime ? `${(ex.executionTime / 1000).toFixed(1)}s` : '—'}
                    </TableCell>
                    <TableCell>{ex.executedBy?.name || '—'}</TableCell>
                    <TableCell>
                      {ex.status === 'completed' && (
                        <IconButton size="small" color="primary">
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {executions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      لا توجد تنفيذات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'تعديل قالب التقرير' : 'إنشاء قالب تقرير جديد'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (English)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={form.nameAr}
                onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={form.module}
                  onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">اختر القسم</MenuItem>
                  {reportModules.map(m => (
                    <MenuItem key={m.key} value={m.key}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={form.reportType}
                  onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}
                >
                  {REPORT_TYPES.map(r => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="مصدر البيانات"
                value={form.dataSource}
                onChange={e => setForm(f => ({ ...f, dataSource: e.target.value }))}
                placeholder="e.g. employees, invoices"
              />
            </Grid>

            {/* Chart Config */}
            {form.reportType === 'chart' && (
              <>
                <Grid item xs={12}>
                  <Divider>
                    <Chip label="إعدادات المخطط" size="small" />
                  </Divider>
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <Select
                      value={form.chartConfig.type}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          chartConfig: { ...f.chartConfig, type: e.target.value },
                        }))
                      }
                    >
                      {CHART_TYPES.map(c => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="المحور X"
                    value={form.chartConfig.xAxis}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        chartConfig: { ...f.chartConfig, xAxis: e.target.value },
                      }))
                    }
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="المحور Y"
                    value={form.chartConfig.yAxis}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        chartConfig: { ...f.chartConfig, yAxis: e.target.value },
                      }))
                    }
                  />
                </Grid>
              </>
            )}

            {/* Fields */}
            <Grid item xs={12}>
              <Divider>
                <Chip label="الحقول" size="small" />
              </Divider>
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="مفتاح الحقل"
                value={fieldInput.fieldKey}
                onChange={e => setFieldInput(f => ({ ...f, fieldKey: e.target.value }))}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="التسمية"
                value={fieldInput.label}
                onChange={e => setFieldInput(f => ({ ...f, label: e.target.value }))}
              />
            </Grid>
            <Grid item xs={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={fieldInput.dataType}
                  onChange={e => setFieldInput(f => ({ ...f, dataType: e.target.value }))}
                >
                  {['text', 'number', 'date', 'currency', 'percentage', 'boolean'].map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={fieldInput.aggregation}
                  onChange={e => setFieldInput(f => ({ ...f, aggregation: e.target.value }))}
                >
                  {['none', 'sum', 'avg', 'min', 'max', 'count'].map(a => (
                    <MenuItem key={a} value={a}>
                      {a}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={addField}
                disabled={!fieldInput.fieldKey}
              >
                إضافة
              </Button>
            </Grid>
            {form.fields.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {form.fields.map((f, i) => (
                    <Chip
                      key={i}
                      label={`${f.label || f.fieldKey} (${f.dataType})`}
                      onDelete={() => removeField(i)}
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Schedule */}
            <Grid item xs={12}>
              <Divider>
                <Chip label="الجدولة" size="small" />
              </Divider>
            </Grid>
            <Grid item xs={4}>
              <FormControlLabel
                label="تفعيل الجدولة"
                control={
                  <Switch
                    checked={form.schedule.enabled}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        schedule: { ...f.schedule, enabled: e.target.checked },
                      }))
                    }
                  />
                }
              />
            </Grid>
            {form.schedule.enabled && (
              <>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <Select
                      value={form.schedule.frequency}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          schedule: { ...f.schedule, frequency: e.target.value },
                        }))
                      }
                    >
                      {[
                        { v: 'daily', l: 'يومي' },
                        { v: 'weekly', l: 'أسبوعي' },
                        { v: 'monthly', l: 'شهري' },
                        { v: 'quarterly', l: 'ربع سنوي' },
                      ].map(o => (
                        <MenuItem key={o.v} value={o.v}>
                          {o.l}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <Select
                      value={form.schedule.format}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          schedule: { ...f.schedule, format: e.target.value },
                        }))
                      }
                    >
                      {['pdf', 'excel', 'csv'].map(fmt => (
                        <MenuItem key={fmt} value={fmt}>
                          {fmt.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                label="تقرير عام (متاح للجميع)"
                control={
                  <Switch
                    checked={form.isPublic}
                    onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
                  />
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!form.name}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
