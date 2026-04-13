/**
 * 👥 إدارة جهات الاتصال — Contacts Management
 * AlAwael ERP — CRM Module
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  useTheme,
} from '@mui/material';


import { contactsService, MOCK_CONTACTS } from 'services/crmService';
import { useSnackbar } from 'contexts/SnackbarContext';

const contactTypes = ['شركة', 'فرد', 'جهة حكومية', 'مؤسسة تعليمية', 'منظمة غير ربحية'];
const statuses = ['نشط', 'غير نشط', 'معلق'];
const sectors = ['التعليم', 'الصحة', 'التقنية', 'البناء', 'المالية', 'التجارة', 'الصناعة'];
const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'أبها', 'تبوك'];

const statusColor = { نشط: 'success', 'غير نشط': 'default', معلق: 'warning' };

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

const EMPTY = {
  name: '',
  contactPerson: '',
  type: '',
  sector: '',
  email: '',
  phone: '',
  city: '',
  status: 'نشط',
  notes: '',
};

export default function ContactsManagement() {
  const _theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contactsService.getAll();
      setContacts(res || MOCK_CONTACTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...contacts];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(s) ||
          c.contactPerson?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.phone?.includes(s)
      );
    }
    if (filterType) list = list.filter(c => c.type === filterType);
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    return list;
  }, [contacts, search, filterType, filterStatus]);

  const openCreate = () => {
    setForm(EMPTY);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = c => {
    setForm({ ...c });
    setSelected(c);
    setFormOpen(true);
  };
  const openDetail = c => {
    setSelected(c);
    setDetailOpen(true);
  };
  const openDelete = c => {
    setSelected(c);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.type) {
      showSnackbar('يرجى إدخال اسم جهة الاتصال والنوع', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selected?._id) {
        await contactsService.update(selected._id, form);
        setContacts(prev => prev.map(c => (c._id === selected._id ? { ...c, ...form } : c)));
        showSnackbar('تم تحديث جهة الاتصال بنجاح', 'success');
      } else {
        const newId = `cnt-${Date.now()}`;
        const newContact = {
          ...form,
          _id: newId,
          totalDeals: 0,
          totalRevenue: 0,
          createdAt: new Date().toISOString(),
        };
        const res = await contactsService.create(form);
        setContacts(prev => [res || newContact, ...prev]);
        showSnackbar('تم إضافة جهة الاتصال بنجاح', 'success');
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
      await contactsService.remove(selected._id);
      setContacts(prev => prev.filter(c => c._id !== selected._id));
      showSnackbar('تم حذف جهة الاتصال', 'info');
      setDeleteOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: contacts.length,
      active: contacts.filter(c => c.status === 'نشط').length,
      companies: contacts.filter(c => c.type === 'شركة').length,
      totalRevenue: contacts.reduce((a, c) => a + (c.totalRevenue || 0), 0),
    }),
    [contacts]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, #5C6BC0 0%, #3949AB 100%)`,
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              👥 إدارة جهات الاتصال
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              إدارة شاملة لجهات الاتصال والعملاء والشركاء
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
              sx={{ bgcolor: 'white', color: '#3949AB', '&:hover': { bgcolor: '#E8EAF6' } }}
            >
              جهة اتصال جديدة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي جهات الاتصال', value: stats.total, color: '#5C6BC0' },
          { label: 'جهات نشطة', value: stats.active, color: '#66BB6A' },
          { label: 'الشركات', value: stats.companies, color: '#42A5F5' },
          {
            label: 'إجمالي الإيرادات',
            value: formatCurrency(stats.totalRevenue),
            color: '#FFA726',
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
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
          placeholder="بحث بالاسم، البريد، الهاتف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 250 }}
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
          label="النوع"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {contactTypes.map(t => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="الحالة"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {statuses.map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <Chip label={`${filtered.length} نتيجة`} variant="outlined" />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>جهة الاتصال</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المدينة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الصفقات</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الإيرادات</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(c => (
              <TableRow key={c._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: '#5C6BC022', color: '#5C6BC0', width: 32, height: 32 }}>
                      <BusinessIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>
                      {c.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{c.contactPerson}</TableCell>
                <TableCell>
                  <Chip size="small" label={c.type} variant="outlined" />
                </TableCell>
                <TableCell>{c.city}</TableCell>
                <TableCell>
                  <Chip size="small" label={c.status} color={statusColor[c.status] || 'default'} />
                </TableCell>
                <TableCell>{c.totalDeals}</TableCell>
                <TableCell>{formatCurrency(c.totalRevenue || 0)}</TableCell>
                <TableCell>
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => openDetail(c)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => openDelete(c)}>
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
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {selected ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال جديدة'}
          <IconButton onClick={() => setFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم الشركة / المؤسسة"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
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
                select
                fullWidth
                label="النوع"
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                required
              >
                {contactTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="القطاع"
                value={form.sector}
                onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
              >
                {sectors.map(s => (
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
                label="المدينة"
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              >
                {cities.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              >
                {statuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
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
          تفاصيل جهة الاتصال
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  bgcolor: '#5C6BC022',
                  color: '#5C6BC0',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 1,
                }}
              >
                <BusinessIcon fontSize="large" />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selected.name}
              </Typography>
              <Chip label={selected.type} variant="outlined" sx={{ mt: 0.5 }} />
            </Box>
            <Grid container spacing={2}>
              {[
                { icon: <PhoneIcon />, label: 'الهاتف', value: selected.phone },
                { icon: <EmailIcon />, label: 'البريد', value: selected.email },
                { icon: <LocationIcon />, label: 'المدينة', value: selected.city },
                { icon: <BusinessIcon />, label: 'القطاع', value: selected.sector },
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
                إحصائيات
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {selected.totalDeals}
                  </Typography>
                  <Typography variant="caption">صفقات</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {formatCurrency(selected.totalRevenue || 0)}
                  </Typography>
                  <Typography variant="caption">إيرادات</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Chip label={selected.status} color={statusColor[selected.status] || 'default'} />
                </Grid>
              </Grid>
            </Box>
            {selected.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  ملاحظات
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.notes}
                </Typography>
              </Box>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف "{selected?.name}"؟</Typography>
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
