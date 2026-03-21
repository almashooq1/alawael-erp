/**
 * External Entities Management — إدارة الجهات الخارجية
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import adminCommunicationsService from '../../services/adminCommunications.service';

const ENTITY_TYPES = {
  government: { label: 'حكومية', color: '#1976d2', icon: <GovIcon /> },
  private: { label: 'خاصة', color: '#f57c00', icon: <PrivateIcon /> },
  non_profit: { label: 'غير ربحية', color: '#388e3c', icon: <NonProfitIcon /> },
  international: { label: 'دولية', color: '#7b1fa2', icon: <InternationalIcon /> },
};

const typeOptions = Object.entries(ENTITY_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

const EMPTY_FORM = {
  name: '',
  nameAr: '',
  type: 'government',
  governmentInfo: { ministryName: '', departmentName: '', region: '', city: '' },
  contactInfo: { phone: '', fax: '', email: '', website: '', poBox: '', postalCode: '' },
  address: { street: '', city: '', region: '', country: 'Saudi Arabia' },
  notes: '',
  isActive: true,
};

export default function ExternalEntitiesManagement() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [dialogTab, setDialogTab] = useState(0);

  // ─── Fetch ───────────────────────────────────────────
  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminCommunicationsService.getExternalEntities({
        q: searchInput || undefined,
        type: typeFilter || undefined,
      });
      setEntities(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load entities:', err);
      setError('فشل في تحميل الجهات الخارجية');
    } finally {
      setLoading(false);
    }
  }, [searchInput, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchEntities(), 300);
    return () => clearTimeout(timer);
  }, [fetchEntities]);

  // ─── Helper: set nested field ────────────────────────
  const setField = (path, value) => {
    setForm((prev) => {
      const updated = { ...prev };
      const parts = path.split('.');
      if (parts.length === 2) {
        updated[parts[0]] = { ...updated[parts[0]], [parts[1]]: value };
      } else {
        updated[path] = value;
      }
      return updated;
    });
  };

  // ─── Handlers ────────────────────────────────────────
  const handleCreate = () => {
    setEditMode(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM, governmentInfo: { ...EMPTY_FORM.governmentInfo }, contactInfo: { ...EMPTY_FORM.contactInfo }, address: { ...EMPTY_FORM.address } });
    setDialogTab(0);
    setDialogOpen(true);
  };

  const handleEdit = async (entity) => {
    setEditMode(true);
    setEditId(entity._id);
    setForm({
      name: entity.name || '',
      nameAr: entity.nameAr || '',
      type: entity.type || 'government',
      governmentInfo: entity.governmentInfo || { ...EMPTY_FORM.governmentInfo },
      contactInfo: entity.contactInfo || { ...EMPTY_FORM.contactInfo },
      address: entity.address || { ...EMPTY_FORM.address },
      notes: entity.notes || '',
      isActive: entity.isActive !== false,
    });
    setDialogTab(0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.nameAr.trim()) {
      setError('يرجى إدخال اسم الجهة بالعربية والإنجليزية');
      return;
    }

    try {
      if (editMode && editId) {
        await adminCommunicationsService.updateExternalEntity(editId, form);
        setSnackbar({ open: true, message: 'تم تحديث الجهة بنجاح', severity: 'success' });
      } else {
        await adminCommunicationsService.createExternalEntity(form);
        setSnackbar({ open: true, message: 'تم إضافة الجهة بنجاح', severity: 'success' });
      }
      setDialogOpen(false);
      fetchEntities();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في حفظ الجهة',
        severity: 'error',
      });
    }
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الجهات الخارجية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة الجهات الحكومية والخاصة والدولية
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchEntities}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            جهة جديدة
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث بالاسم..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الجهة</InputLabel>
              <Select
                value={typeFilter}
                label="نوع الجهة"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">الكل</MenuItem>
                {typeOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>الجهة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>البريد الإلكتروني</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الهاتف</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المدينة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">
                إجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">لا توجد جهات خارجية</Typography>
                </TableCell>
              </TableRow>
            ) : (
              entities.map((entity) => {
                const typeInfo = ENTITY_TYPES[entity.type] || {};
                return (
                  <TableRow key={entity._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: `${typeInfo.color || '#1976d2'}15`,
                            color: typeInfo.color || '#1976d2',
                          }}
                        >
                          {typeInfo.icon || <BusinessIcon fontSize="small" />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {entity.nameAr || entity.name}
                          </Typography>
                          {entity.nameAr && entity.name && (
                            <Typography variant="caption" color="text.secondary">
                              {entity.name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={typeInfo.label || entity.type}
                        size="small"
                        sx={{
                          bgcolor: `${typeInfo.color || '#9e9e9e'}15`,
                          color: typeInfo.color || '#9e9e9e',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entity.contactInfo?.email || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entity.contactInfo?.phone || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entity.address?.city || entity.governmentInfo?.city || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entity.isActive !== false ? 'نشط' : 'غير نشط'}
                        size="small"
                        color={entity.isActive !== false ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleEdit(entity)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ═══ Create/Edit Dialog ══════════════════════════ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'تعديل جهة خارجية' : 'إضافة جهة خارجية جديدة'}</DialogTitle>
        <DialogContent>
          <Tabs
            value={dialogTab}
            onChange={(_, v) => setDialogTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="المعلومات الأساسية" />
            <Tab label="معلومات الاتصال" />
            <Tab label="العنوان" />
            {form.type === 'government' && <Tab label="معلومات حكومية" />}
          </Tabs>

          {/* Tab 0: Basic Info */}
          {dialogTab === 0 && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الجهة (English) *"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الجهة (عربي) *"
                  value={form.nameAr}
                  onChange={(e) => setField('nameAr', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>نوع الجهة *</InputLabel>
                  <Select
                    value={form.type}
                    label="نوع الجهة *"
                    onChange={(e) => setField('type', e.target.value)}
                  >
                    {typeOptions.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isActive}
                      onChange={(e) => setField('isActive', e.target.checked)}
                    />
                  }
                  label="جهة نشطة"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="ملاحظات"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Contact Info */}
          {dialogTab === 1 && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الهاتف"
                  value={form.contactInfo.phone}
                  onChange={(e) => setField('contactInfo.phone', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الفاكس"
                  value={form.contactInfo.fax}
                  onChange={(e) => setField('contactInfo.fax', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={form.contactInfo.email}
                  onChange={(e) => setField('contactInfo.email', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الموقع الإلكتروني"
                  value={form.contactInfo.website}
                  onChange={(e) => setField('contactInfo.website', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WebIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="صندوق البريد"
                  value={form.contactInfo.poBox}
                  onChange={(e) => setField('contactInfo.poBox', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الرمز البريدي"
                  value={form.contactInfo.postalCode}
                  onChange={(e) => setField('contactInfo.postalCode', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 2: Address */}
          {dialogTab === 2 && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الشارع"
                  value={form.address.street}
                  onChange={(e) => setField('address.street', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="المدينة"
                  value={form.address.city}
                  onChange={(e) => setField('address.city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="المنطقة"
                  value={form.address.region}
                  onChange={(e) => setField('address.region', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="الدولة"
                  value={form.address.country}
                  onChange={(e) => setField('address.country', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 3: Government Info */}
          {dialogTab === 3 && form.type === 'government' && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الوزارة"
                  value={form.governmentInfo.ministryName}
                  onChange={(e) => setField('governmentInfo.ministryName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الإدارة"
                  value={form.governmentInfo.departmentName}
                  onChange={(e) => setField('governmentInfo.departmentName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المنطقة"
                  value={form.governmentInfo.region}
                  onChange={(e) => setField('governmentInfo.region', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المدينة"
                  value={form.governmentInfo.city}
                  onChange={(e) => setField('governmentInfo.city', e.target.value)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {editMode ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
