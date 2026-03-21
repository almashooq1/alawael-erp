/**
 * 🎯 إدارة العملاء المحتملين — Leads Management
 * AlAwael ERP — CRM Module
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  useTheme,
} from '@mui/material';


import { leadsService, MOCK_LEADS } from 'services/crmService';
import { useSnackbar } from 'contexts/SnackbarContext';

const leadStages = ['جديد', 'اتصال أولي', 'عرض مقدم', 'تفاوض', 'مغلق - ربح', 'مغلق - خسارة'];
const leadSources = ['موقع إلكتروني', 'إحالة', 'معرض', 'إعلان', 'شبكات اجتماعية', 'اتصال مباشر'];
const priorities = ['عالية', 'متوسطة', 'منخفضة'];

const stageColors = {
  جديد: '#42A5F5',
  'اتصال أولي': '#AB47BC',
  'عرض مقدم': '#FFA726',
  تفاوض: '#26A69A',
  'مغلق - ربح': '#66BB6A',
  'مغلق - خسارة': '#EF5350',
};
const priorityColor = { عالية: 'error', متوسطة: 'warning', منخفضة: 'info' };

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

const EMPTY = {
  title: '',
  company: '',
  contactPerson: '',
  email: '',
  phone: '',
  source: '',
  stage: 'جديد',
  priority: 'متوسطة',
  estimatedValue: 0,
  probability: 50,
  assignedTo: '',
  expectedCloseDate: '',
  notes: '',
};

export default function LeadsManagement() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadsService.getAll();
      setLeads(res || MOCK_LEADS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...leads];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        l =>
          l.title.toLowerCase().includes(s) ||
          l.company?.toLowerCase().includes(s) ||
          l.contactPerson?.toLowerCase().includes(s)
      );
    }
    if (filterStage) list = list.filter(l => l.stage === filterStage);
    if (filterPriority) list = list.filter(l => l.priority === filterPriority);
    // Tab filter
    if (tab === 1) list = list.filter(l => !l.stage.startsWith('مغلق'));
    if (tab === 2) list = list.filter(l => l.stage === 'مغلق - ربح');
    if (tab === 3) list = list.filter(l => l.stage === 'مغلق - خسارة');
    return list;
  }, [leads, search, filterStage, filterPriority, tab]);

  const openCreate = () => {
    setForm(EMPTY);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = l => {
    setForm({ ...l });
    setSelected(l);
    setFormOpen(true);
  };
  const openDetail = l => {
    setSelected(l);
    setDetailOpen(true);
  };
  const openDelete = l => {
    setSelected(l);
    setDeleteOpen(true);
  };
  const openStageUpdate = l => {
    setSelected(l);
    setStageOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.company) {
      showSnackbar('يرجى إدخال عنوان الفرصة واسم الشركة', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selected?._id) {
        await leadsService.update(selected._id, form);
        setLeads(prev => prev.map(l => (l._id === selected._id ? { ...l, ...form } : l)));
        showSnackbar('تم تحديث الفرصة بنجاح', 'success');
      } else {
        const newId = `lead-${Date.now()}`;
        const newLead = { ...form, _id: newId, createdAt: new Date().toISOString() };
        const res = await leadsService.create(form);
        setLeads(prev => [res || newLead, ...prev]);
        showSnackbar('تم إضافة فرصة جديدة', 'success');
      }
      setFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await leadsService.remove(selected._id);
      setLeads(prev => prev.filter(l => l._id !== selected._id));
      showSnackbar('تم حذف الفرصة', 'info');
      setDeleteOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async stage => {
    if (!selected) return;
    setLoading(true);
    try {
      await leadsService.updateStage(selected._id, stage);
      setLeads(prev => prev.map(l => (l._id === selected._id ? { ...l, stage } : l)));
      showSnackbar(`تم تحديث المرحلة إلى: ${stage}`, 'success');
      setStageOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async l => {
    setLoading(true);
    try {
      await leadsService.convertToContact(l._id);
      setLeads(prev => prev.map(x => (x._id === l._id ? { ...x, stage: 'مغلق - ربح' } : x)));
      showSnackbar('تم تحويل الفرصة إلى جهة اتصال', 'success');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: leads.length,
      open: leads.filter(l => !l.stage.startsWith('مغلق')).length,
      won: leads.filter(l => l.stage === 'مغلق - ربح').length,
      lost: leads.filter(l => l.stage === 'مغلق - خسارة').length,
      totalValue: leads.reduce((a, l) => a + (l.estimatedValue || 0), 0),
      avgProbability: Math.round(
        leads.reduce((a, l) => a + (l.probability || 0), 0) / (leads.length || 1)
      ),
    }),
    [leads]
  );

  const pipeline = useMemo(
    () =>
      leadStages.map(stage => ({
        stage,
        count: leads.filter(l => l.stage === stage).length,
        value: leads
          .filter(l => l.stage === stage)
          .reduce((a, l) => a + (l.estimatedValue || 0), 0),
      })),
    [leads]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #7E57C2 0%, #5E35B1 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🎯 إدارة العملاء المحتملين
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              تتبع الفرص ومسار المبيعات وتحويل العملاء
            </Typography>
          </Box>
          <Box>
            <Tooltip title="تحديث">
              <IconButton onClick={load} sx={{ color: 'white', mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ bgcolor: 'white', color: '#5E35B1', '&:hover': { bgcolor: '#EDE7F6' } }}
            >
              فرصة جديدة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الفرص', value: stats.total, color: '#7E57C2' },
          { label: 'فرص مفتوحة', value: stats.open, color: '#42A5F5' },
          { label: 'صفقات ناجحة', value: stats.won, color: '#66BB6A' },
          { label: 'القيمة المقدرة', value: formatCurrency(stats.totalValue), color: '#FFA726' },
          { label: 'متوسط الاحتمالية', value: `${stats.avgProbability}%`, color: '#26A69A' },
        ].map((s, i) => (
          <Grid item xs={6} md={2.4} key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>
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

      {/* Pipeline Overview */}
      <Paper sx={{ px: 2, py: 1.5, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          مسار المبيعات
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
          {pipeline.map((p, i) => (
            <Card
              key={i}
              variant="outlined"
              sx={{
                minWidth: 140,
                borderTop: `3px solid ${stageColors[p.stage]}`,
                textAlign: 'center',
                flex: '0 0 auto',
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {p.stage}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {p.count}
                </Typography>
                <Typography variant="caption">{formatCurrency(p.value)}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Tabs & Filters */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={`الكل (${leads.length})`} />
          <Tab label={`مفتوحة (${stats.open})`} />
          <Tab label={`ناجحة (${stats.won})`} />
          <Tab label={`خاسرة (${stats.lost})`} />
        </Tabs>
      </Paper>

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
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="المرحلة"
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {leadStages.map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="الأولوية"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {priorities.map(p => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>الفرصة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الشركة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المصدر</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المرحلة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القيمة المقدرة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الاحتمالية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(l => (
              <TableRow key={l._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {l.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {l.contactPerson}
                  </Typography>
                </TableCell>
                <TableCell>{l.company}</TableCell>
                <TableCell>
                  <Chip size="small" label={l.source} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={<DotIcon sx={{ fontSize: 10 }} />}
                    label={l.stage}
                    sx={{
                      bgcolor: stageColors[l.stage] + '22',
                      color: stageColors[l.stage],
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={l.priority}
                    color={priorityColor[l.priority]}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{formatCurrency(l.estimatedValue)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={l.probability}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': { borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" fontWeight={600}>
                      {l.probability}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => openDetail(l)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(l)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تغيير المرحلة">
                    <IconButton size="small" color="primary" onClick={() => openStageUpdate(l)}>
                      <ArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!l.stage.startsWith('مغلق') && (
                    <Tooltip title="تحويل لعميل">
                      <IconButton size="small" color="success" onClick={() => handleConvert(l)}>
                        <ConvertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => openDelete(l)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          labelRowsPerPage="صفوف لكل صفحة:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {selected ? 'تعديل الفرصة' : 'إضافة فرصة جديدة'}
          <IconButton onClick={() => setFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="عنوان الفرصة"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم الشركة"
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الشخص المسؤول"
                value={form.contactPerson}
                onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الهاتف"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="المصدر"
                value={form.source}
                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
              >
                {leadSources.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="المرحلة"
                value={form.stage}
                onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
              >
                {leadStages.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="الأولوية"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              >
                {priorities.map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القيمة المقدرة (ر.س)"
                type="number"
                value={form.estimatedValue}
                onChange={e => setForm(p => ({ ...p, estimatedValue: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المكلف"
                value={form.assignedTo}
                onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>
                احتمالية الإغلاق: {form.probability}%
              </Typography>
              <Slider
                value={form.probability}
                onChange={(_, v) => setForm(p => ({ ...p, probability: v }))}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="تاريخ الإغلاق المتوقع"
                type="date"
                value={form.expectedCloseDate?.split('T')[0] || ''}
                onChange={e => setForm(p => ({ ...p, expectedCloseDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={3}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {selected ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          تفاصيل الفرصة
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                {selected.title}
              </Typography>
              <Chip
                icon={<DotIcon sx={{ fontSize: 10 }} />}
                label={selected.stage}
                sx={{
                  mt: 1,
                  bgcolor: stageColors[selected.stage] + '22',
                  color: stageColors[selected.stage],
                }}
              />
            </Box>
            <Grid container spacing={2}>
              {[
                { icon: <PersonIcon />, label: 'الشركة', value: selected.company },
                { icon: <PersonIcon />, label: 'المسؤول', value: selected.contactPerson },
                { icon: <PhoneIcon />, label: 'الهاتف', value: selected.phone },
                { icon: <EmailIcon />, label: 'البريد', value: selected.email },
                {
                  icon: <MoneyIcon />,
                  label: 'القيمة',
                  value: formatCurrency(selected.estimatedValue),
                },
                { icon: <TrendIcon />, label: 'الاحتمالية', value: `${selected.probability}%` },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    {f.icon}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {f.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {f.value || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                معلومات إضافية
              </Typography>
              <Typography variant="body2">
                <strong>المصدر:</strong> {selected.source}
              </Typography>
              <Typography variant="body2">
                <strong>الأولوية:</strong> {selected.priority}
              </Typography>
              <Typography variant="body2">
                <strong>المكلف:</strong> {selected.assignedTo}
              </Typography>
              {selected.notes && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>ملاحظات:</strong> {selected.notes}
                </Typography>
              )}
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Stage Update Dialog */}
      <Dialog open={stageOpen} onClose={() => setStageOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تغيير مرحلة الفرصة</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            الفرصة: {selected?.title}
          </Typography>
          {leadStages.map(s => (
            <Button
              key={s}
              fullWidth
              variant={selected?.stage === s ? 'contained' : 'outlined'}
              sx={{ mb: 1, justifyContent: 'flex-start', textAlign: 'right' }}
              startIcon={<DotIcon sx={{ color: stageColors[s], fontSize: 12 }} />}
              onClick={() => handleStageUpdate(s)}
            >
              {s}
            </Button>
          ))}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف "{selected?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
