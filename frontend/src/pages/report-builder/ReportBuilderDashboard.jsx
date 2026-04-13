import { useState, useEffect, useCallback } from 'react';



import reportBuilderService from '../../services/reportBuilderService';

/* ═══════════════════════════════════════════════════════════
   KPI Card
   ═══════════════════════════════════════════════════════════ */
function KPICard({ title, value, icon, color = '#1976d2', subtitle }) {
  return (
    <Card sx={{ height: '100%', borderTop: `3px solid ${color}` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight="bold">{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor: `${color}22`, color, width: 48, height: 48 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   Status / Category helpers
   ═══════════════════════════════════════════════════════════ */
const STATUS_COLOR = { draft: 'default', published: 'success', archived: 'warning' };
const STATUS_AR = { draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' };
const CHART_TYPES = [
  { value: 'bar', label: 'أعمدة', icon: <BarChartIcon fontSize="small" /> },
  { value: 'line', label: 'خطي', icon: <LineChartIcon fontSize="small" /> },
  { value: 'pie', label: 'دائري', icon: <ChartIcon fontSize="small" /> },
  { value: 'doughnut', label: 'حلقي', icon: <DonutIcon fontSize="small" /> },
  { value: 'area', label: 'مساحة', icon: <LineChartIcon fontSize="small" /> },
  { value: 'scatter', label: 'تشتت', icon: <ScatterIcon fontSize="small" /> },
  { value: 'table', label: 'جدول', icon: <TableIcon fontSize="small" /> },
];

/* ═══════════════════════════════════════════════════════════
   Report Designer Dialog (Drag-and-Drop)
   ═══════════════════════════════════════════════════════════ */
function ReportDesigner({ open, onClose, report, onSave }) {
  const [fields, setFields] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState(report?.columns || []);
  const [filters, setFilters] = useState(report?.filters || []);
  const [sorting, setSorting] = useState(report?.sorting || []);
  const [groupBy, setGroupBy] = useState(report?.groupBy || []);
  const [chartConfig, setChartConfig] = useState(report?.chartConfig || null);
  const [addFilterDialog, setAddFilterDialog] = useState(false);
  const [newFilter, setNewFilter] = useState({ fieldId: '', operator: 'eq', value: '' });
  const [designTab, setDesignTab] = useState(0);

  // Load fields when report data source changes
  useEffect(() => {
    if (!report?.dataSourceId) return;
    reportBuilderService.getFieldsForSource(report.dataSourceId)
      .then(res => setFields(res.data?.data || []))
      .catch(() => {});
  }, [report?.dataSourceId]);

  // Sync when report props change
  useEffect(() => {
    setSelectedColumns(report?.columns || []);
    setFilters(report?.filters || []);
    setSorting(report?.sorting || []);
    setGroupBy(report?.groupBy || []);
    setChartConfig(report?.chartConfig || null);
  }, [report]);

  const availableFields = fields.filter(f => !selectedColumns.some(c => c.fieldId === f.id));

  const handleAddColumn = (field) => {
    setSelectedColumns(prev => [...prev, {
      fieldId: field.id,
      label: field.labelAr || field.label,
      visible: true,
      order: prev.length,
    }]);
  };

  const handleRemoveColumn = (fieldId) => {
    setSelectedColumns(prev => prev.filter(c => c.fieldId !== fieldId));
  };

  const handleMoveColumn = (idx, dir) => {
    setSelectedColumns(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((c, i) => ({ ...c, order: i }));
    });
  };

  const handleAddFilter = () => {
    if (!newFilter.fieldId || !newFilter.operator) return;
    setFilters(prev => [...prev, { ...newFilter, id: `f_${Date.now()}` }]);
    setNewFilter({ fieldId: '', operator: 'eq', value: '' });
    setAddFilterDialog(false);
  };

  const handleSaveDesign = async () => {
    if (onSave) {
      await onSave({
        columns: selectedColumns,
        filters,
        sorting,
        groupBy,
        chartConfig,
      });
    }
    onClose();
  };

  if (!report) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReportIcon color="primary" />
        مصمم التقارير — {report.nameAr || report.name}
      </DialogTitle>
      <DialogContent dividers>
        <Tabs value={designTab} onChange={(_, v) => setDesignTab(v)} sx={{ mb: 2 }}>
          <Tab icon={<ColumnIcon />} label="الأعمدة" />
          <Tab icon={<FilterIcon />} label="التصفية" />
          <Tab icon={<SortIcon />} label="الترتيب" />
          <Tab icon={<CalcIcon />} label="التجميع" />
          <Tab icon={<ChartIcon />} label="الرسم البياني" />
        </Tabs>

        {/* ── Columns Tab (Drag & Drop) ── */}
        {designTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={5}>
              <Typography variant="subtitle2" gutterBottom>الحقول المتاحة</Typography>
              <Paper variant="outlined" sx={{ p: 1, maxHeight: 350, overflow: 'auto' }}>
                {availableFields.length === 0 && (
                  <Typography color="text.secondary" variant="body2" textAlign="center" py={2}>
                    تم إضافة جميع الحقول
                  </Typography>
                )}
                {availableFields.map(f => (
                  <Box
                    key={f.id}
                    sx={{
                      p: 1, mb: 0.5, borderRadius: 1, cursor: 'pointer',
                      bgcolor: 'grey.50', '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' },
                      border: '1px solid', borderColor: 'grey.200', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onClick={() => handleAddColumn(f)}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('fieldId', f.id)}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <DragIcon fontSize="small" color="disabled" />
                      <Box>
                        <Typography variant="body2">{f.labelAr || f.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {f.type}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" color="primary"><AddIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid item xs={2} display="flex" alignItems="center" justifyContent="center">
              <Typography color="text.secondary">⟶ اسحب وأفلت ⟵</Typography>
            </Grid>
            <Grid item xs={5}>
              <Typography variant="subtitle2" gutterBottom>الأعمدة المختارة</Typography>
              <Paper
                variant="outlined"
                sx={{ p: 1, maxHeight: 350, overflow: 'auto', minHeight: 100 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fId = e.dataTransfer.getData('fieldId');
                  const field = fields.find(f => f.id === fId);
                  if (field && !selectedColumns.some(c => c.fieldId === fId)) handleAddColumn(field);
                }}
              >
                {selectedColumns.length === 0 && (
                  <Typography color="text.secondary" variant="body2" textAlign="center" py={2}>
                    اسحب الحقول هنا
                  </Typography>
                )}
                {selectedColumns.map((col, idx) => (
                  <Box
                    key={col.fieldId}
                    sx={{
                      p: 1, mb: 0.5, borderRadius: 1,
                      bgcolor: 'primary.50', border: '1px solid',
                      borderColor: 'primary.200', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <DragIcon fontSize="small" color="primary" />
                      <Typography variant="body2">{col.label || col.fieldId}</Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" disabled={idx === 0} onClick={() => handleMoveColumn(idx, -1)}>▲</IconButton>
                      <IconButton size="small" disabled={idx === selectedColumns.length - 1} onClick={() => handleMoveColumn(idx, 1)}>▼</IconButton>
                      <IconButton size="small" color="error" onClick={() => handleRemoveColumn(col.fieldId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ── Filters Tab ── */}
        {designTab === 1 && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2">شروط التصفية</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAddFilterDialog(true)}>
                إضافة شرط
              </Button>
            </Box>
            {filters.length === 0 && (
              <Alert severity="info">لا توجد شروط تصفية — سيتم عرض جميع البيانات</Alert>
            )}
            {filters.map((f, idx) => (
              <Paper key={f.id || idx} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={f.fieldId} size="small" color="primary" variant="outlined" />
                <Chip label={f.operator} size="small" />
                <Typography variant="body2">{f.value}</Typography>
                <IconButton size="small" color="error" onClick={() => setFilters(prev => prev.filter((_, i) => i !== idx))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
            <Dialog open={addFilterDialog} onClose={() => setAddFilterDialog(false)} maxWidth="xs" fullWidth>
              <DialogTitle>إضافة شرط تصفية</DialogTitle>
              <DialogContent>
                <FormControl fullWidth size="small" sx={{ mt: 1, mb: 1 }}>
                  <InputLabel>الحقل</InputLabel>
                  <Select value={newFilter.fieldId} label="الحقل" onChange={e => setNewFilter(p => ({ ...p, fieldId: e.target.value }))}>
                    {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.labelAr || f.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>العملية</InputLabel>
                  <Select value={newFilter.operator} label="العملية" onChange={e => setNewFilter(p => ({ ...p, operator: e.target.value }))}>
                    {['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'startsWith', 'endsWith', 'in', 'between'].map(op => (
                      <MenuItem key={op} value={op}>{op}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField fullWidth size="small" label="القيمة" value={newFilter.value} onChange={e => setNewFilter(p => ({ ...p, value: e.target.value }))} />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAddFilterDialog(false)}>إلغاء</Button>
                <Button variant="contained" onClick={handleAddFilter}>إضافة</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {/* ── Sorting Tab ── */}
        {designTab === 2 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>ترتيب النتائج</Typography>
            {sorting.map((s, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={s.fieldId} size="small" color="primary" variant="outlined" />
                <Chip label={s.direction === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'} size="small" color={s.direction === 'asc' ? 'info' : 'warning'} />
                <IconButton size="small" color="error" onClick={() => setSorting(prev => prev.filter((_, i) => i !== idx))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
            <Box display="flex" gap={1} mt={1}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>حقل</InputLabel>
                <Select label="حقل" defaultValue="" onChange={e => {
                  if (e.target.value) setSorting(prev => [...prev, { fieldId: e.target.value, direction: 'asc' }]);
                }}>
                  {fields.filter(f => !sorting.some(s => s.fieldId === f.id)).map(f => (
                    <MenuItem key={f.id} value={f.id}>{f.labelAr || f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}

        {/* ── Grouping Tab ── */}
        {designTab === 3 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>التجميع والإحصاءات</Typography>
            {groupBy.map((g, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={g.fieldId} size="small" color="primary" variant="outlined" />
                <Chip label={g.aggregation || 'count'} size="small" color="secondary" />
                <IconButton size="small" color="error" onClick={() => setGroupBy(prev => prev.filter((_, i) => i !== idx))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
            <Box display="flex" gap={1} mt={1}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>حقل التجميع</InputLabel>
                <Select label="حقل التجميع" defaultValue="" onChange={e => {
                  if (e.target.value) setGroupBy(prev => [...prev, { fieldId: e.target.value, aggregation: 'count' }]);
                }}>
                  {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.labelAr || f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}

        {/* ── Chart Tab ── */}
        {designTab === 4 && (
          <Box>
            <FormControlLabel
              control={<Switch checked={!!chartConfig} onChange={e => setChartConfig(e.target.checked ? { type: 'bar', title: '' } : null)} />}
              label="تفعيل الرسم البياني"
            />
            {chartConfig && (
              <Grid container spacing={2} mt={1}>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>نوع الرسم</InputLabel>
                    <Select value={chartConfig.type || 'bar'} label="نوع الرسم" onChange={e => setChartConfig(p => ({ ...p, type: e.target.value }))}>
                      {CHART_TYPES.map(t => (
                        <MenuItem key={t.value} value={t.value}>
                          <Box display="flex" alignItems="center" gap={1}>{t.icon} {t.label}</Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>المحور الأفقي</InputLabel>
                    <Select value={chartConfig.xAxis || ''} label="المحور الأفقي" onChange={e => setChartConfig(p => ({ ...p, xAxis: e.target.value }))}>
                      {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.labelAr}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>المحور العمودي</InputLabel>
                    <Select value={chartConfig.yAxis || ''} label="المحور العمودي" onChange={e => setChartConfig(p => ({ ...p, yAxis: e.target.value }))}>
                      {fields.filter(f => f.type === 'number' || f.type === 'currency').map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.labelAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="عنوان الرسم" value={chartConfig.title || ''} onChange={e => setChartConfig(p => ({ ...p, title: e.target.value }))} />
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" startIcon={<PublishIcon />} onClick={handleSaveDesign}>
          حفظ التصميم
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════ */
export default function ReportBuilderDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [tab, setTab] = useState(0);

  // Create / Edit state
  const [createOpen, setCreateOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [form, setForm] = useState({ name: '', nameAr: '', dataSourceId: '', category: '', description: '' });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, rptRes, tmplRes, dsRes] = await Promise.all([
        reportBuilderService.getDashboardOverview(),
        reportBuilderService.getAllReports({ status: statusFilter || undefined, search: searchQuery || undefined }),
        reportBuilderService.getTemplates(),
        reportBuilderService.getDataSources(),
      ]);
      setDashboard(dashRes.data?.data);
      setReports(rptRes.data?.data || []);
      setTemplates(tmplRes.data?.data || []);
      setDataSources(dsRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Create Report ──
  const handleCreate = async () => {
    try {
      await reportBuilderService.createReport(form);
      setCreateOpen(false);
      setForm({ name: '', nameAr: '', dataSourceId: '', category: '', description: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في إنشاء التقرير');
    }
  };

  // ── Create from Template ──
  const handleCreateFromTemplate = async (templateId) => {
    try {
      const res = await reportBuilderService.createReportFromTemplate(templateId);
      setSelectedReport(res.data?.data);
      setDesignerOpen(true);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في إنشاء التقرير من القالب');
    }
  };

  // ── Open Designer ──
  const handleOpenDesigner = async (report) => {
    try {
      const res = await reportBuilderService.getReportById(report.id);
      setSelectedReport(res.data?.data);
      setDesignerOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في فتح المصمم');
    }
  };

  // ── Save Design ──
  const handleSaveDesign = async (design) => {
    if (!selectedReport) return;
    try {
      // Save columns via reorder (which replaces all)
      if (design.columns) {
        await reportBuilderService.updateReport(selectedReport.id, { columns: design.columns });
      }
      if (design.filters) {
        await reportBuilderService.updateReport(selectedReport.id, { filters: design.filters });
      }
      if (design.sorting?.length) {
        await reportBuilderService.setSorting(selectedReport.id, design.sorting);
      }
      if (design.groupBy?.length) {
        await reportBuilderService.setGroupBy(selectedReport.id, design.groupBy);
      }
      if (design.chartConfig !== undefined) {
        await reportBuilderService.setChartConfig(selectedReport.id, design.chartConfig);
      }
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في حفظ التصميم');
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقرير؟')) return;
    try {
      await reportBuilderService.deleteReport(id);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في الحذف');
    }
  };

  // ── Duplicate ──
  const handleDuplicate = async (id) => {
    try {
      await reportBuilderService.duplicateReport(id);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في النسخ');
    }
  };

  // ── Toggle Favorite ──
  const handleToggleFavorite = async (id) => {
    try {
      await reportBuilderService.toggleFavorite(id);
      loadData();
    } catch (err) { /* ignore */ }
  };

  // ── Export ──
  const handleExport = async (id, format) => {
    try {
      const res = await reportBuilderService.exportReport(id, format);
      if (res.data?.data?.downloadUrl) {
        window.open(res.data.data.downloadUrl, '_blank');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في التصدير');
    }
  };

  const kpi = dashboard?.kpi || {};
  const favorites = dashboard?.favorites || [];

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <ReportIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="bold">باني التقارير المخصصة</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>تحديث</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            تقرير جديد
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <KPICard title="إجمالي التقارير" value={kpi.totalReports || 0} icon={<ReportIcon />} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <KPICard title="تقارير منشورة" value={kpi.publishedReports || 0} icon={<PublishIcon />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <KPICard title="مسودات" value={kpi.draftReports || 0} icon={<EditIcon />} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <KPICard title="القوالب" value={kpi.totalTemplates || 0} icon={<TemplateIcon />} color="#9c27b0" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <KPICard title="عمليات التنفيذ" value={kpi.totalExecutions || 0} icon={<RunIcon />} color="#0288d1" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <KPICard title="الجداول الزمنية" value={kpi.totalSchedules || 0} icon={<ScheduleIcon />} color="#d32f2f" />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<ReportIcon />} label="التقارير" />
        <Tab icon={<TemplateIcon />} label="القوالب" />
        <Tab icon={<StarIcon />} label="المفضلة" />
      </Tabs>

      {/* ── Reports List Tab ── */}
      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" gap={2} mb={2}>
            <TextField size="small" label="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ minWidth: 200 }} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الحالة</InputLabel>
              <Select value={statusFilter} label="الحالة" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="draft">مسودة</MenuItem>
                <MenuItem value="published">منشور</MenuItem>
                <MenuItem value="archived">مؤرشف</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>اسم التقرير</TableCell>
                  <TableCell>مصدر البيانات</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الأعمدة</TableCell>
                  <TableCell>آخر تنفيذ</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleToggleFavorite(r.id)}>
                        {favorites.some(f => f.id === r.id) ? <StarIcon color="warning" /> : <StarBorderIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">{r.nameAr || r.name}</Typography>
                      {r.description && <Typography variant="caption" color="text.secondary">{r.description}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip label={dataSources.find(ds => ds.id === r.dataSourceId)?.nameAr || r.dataSourceId} size="small" variant="outlined" icon={<DataSourceIcon />} />
                    </TableCell>
                    <TableCell>
                      <Chip label={STATUS_AR[r.status] || r.status} size="small" color={STATUS_COLOR[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>{r.columns?.length || 0}</TableCell>
                    <TableCell>
                      {r.lastExecutedAt ? new Date(r.lastExecutedAt).toLocaleDateString('ar-SA') : '—'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="تصميم"><IconButton size="small" color="primary" onClick={() => handleOpenDesigner(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="تشغيل"><IconButton size="small" color="success" onClick={() => window.location.href = `/report-builder/view/${r.id}`}><RunIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="تصدير Excel"><IconButton size="small" onClick={() => handleExport(r.id, 'excel')}><ExportIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="نسخ"><IconButton size="small" onClick={() => handleDuplicate(r.id)}><DuplicateIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={7} align="center">لا توجد تقارير</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Templates Tab ── */}
      {tab === 1 && (
        <Grid container spacing={2}>
          {templates.map(t => (
            <Grid item xs={12} sm={6} md={3} key={t.id}>
              <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 } }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <TemplateIcon color="secondary" />
                    <Chip label={t.category} size="small" />
                  </Box>
                  <Typography variant="h6" fontWeight="bold" mt={1}>{t.nameAr || t.name}</Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {t.descriptionAr || t.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.columns?.length || 0} أعمدة • {t.filters?.length || 0} تصفيات
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Button
                    fullWidth variant="outlined" startIcon={<AddIcon />}
                    onClick={() => handleCreateFromTemplate(t.id)}
                  >
                    إنشاء تقرير من القالب
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Favorites Tab ── */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <List>
            {favorites.length === 0 && (
              <ListItem><ListItemText primary="لا توجد تقارير مفضلة" /></ListItem>
            )}
            {favorites.map(f => (
              <ListItem key={f.id} divider secondaryAction={
                <Box>
                  <IconButton size="small" color="primary" onClick={() => handleOpenDesigner(f)}><EditIcon /></IconButton>
                  <IconButton size="small" color="success" onClick={() => window.location.href = `/report-builder/view/${f.id}`}><RunIcon /></IconButton>
                </Box>
              }>
                <ListItemIcon><StarIcon color="warning" /></ListItemIcon>
                <ListItemText primary={f.nameAr || f.name} secondary={STATUS_AR[f.status] || f.status} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* ── Create Report Dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" /> إنشاء تقرير جديد
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="اسم التقرير (English)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} sx={{ mt: 1, mb: 1 }} />
          <TextField fullWidth size="small" label="اسم التقرير (عربي)" value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} sx={{ mb: 1 }} />
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>مصدر البيانات</InputLabel>
            <Select value={form.dataSourceId} label="مصدر البيانات" onChange={e => setForm(p => ({ ...p, dataSourceId: e.target.value }))}>
              {dataSources.map(ds => <MenuItem key={ds.id} value={ds.id}>{ds.nameAr || ds.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="الفئة" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} sx={{ mb: 1 }} />
          <TextField fullWidth size="small" label="الوصف" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.dataSourceId}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Report Designer */}
      <ReportDesigner
        open={designerOpen}
        onClose={() => setDesignerOpen(false)}
        report={selectedReport}
        dataSources={dataSources}
        onSave={handleSaveDesign}
      />
    </Box>
  );
}
