import { useState, useEffect, useCallback } from 'react';




import { licenseService } from 'services/operationsService';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const statusConfig = {
  active: { label: 'ساري', color: 'success', icon: <ActiveIcon fontSize="small" /> },
  expired: { label: 'منتهي', color: 'error', icon: <ExpiredIcon fontSize="small" /> },
  pending_renewal: {
    label: 'بانتظار التجديد',
    color: 'warning',
    icon: <PendingIcon fontSize="small" />,
  },
  suspended: { label: 'معلق', color: 'default' },
};

const licenseTypes = [
  'رخصة تجارية',
  'رخصة بلدية',
  'رخصة صحية',
  'رخصة دفاع مدني',
  'شهادة سلامة',
  'تصريح عمل',
  'رخصة بناء',
  'ترخيص نقل',
  'شهادة ISO',
  'رخصة بيئية',
  'تصريح إعلاني',
  'أخرى',
];

const LicenseManagement = () => {
  const showSnackbar = useSnackbar();
  const [licenses, setLicenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [viewLic, setViewLic] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: '',
    number: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
    cost: '',
    department: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([
        licenseService.getAll({ search, status: statusFilter }),
        licenseService.getStats(),
      ]);
      setLicenses(Array.isArray(l?.data) ? l.data : licenseService.getMockLicenses());
      setStats(s || licenseService.getMockStats());
    } catch {
      setLicenses(licenseService.getMockLicenses());
      setStats(licenseService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      await licenseService.create(form);
      showSnackbar('تم إضافة الرخصة بنجاح', 'success');
      setDialog(false);
      setForm({
        name: '',
        type: '',
        number: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        cost: '',
        department: '',
        notes: '',
      });
      loadData();
    } catch {
      showSnackbar('فشل في إضافة الرخصة', 'error');
    }
  };

  const handleRenew = async id => {
    try {
      await licenseService.renew(id);
      showSnackbar('تم إرسال طلب التجديد', 'success');
      loadData();
    } catch {
      showSnackbar('فشل في التجديد', 'error');
    }
  };

  const expiringSoon = licenses.filter(l => {
    if (l.status === 'expired') return false;
    const exp = new Date(l.expiryDate);
    const now = new Date();
    const diff = (exp - now) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  });

  const filtered = licenses.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (search && !l.name?.includes(search) && !l.number?.includes(search)) return false;
    return true;
  });

  const daysUntilExpiry = date => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <LicIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة الرخص والتصاريح
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تتبع الرخص والتجديدات وتواريخ الانتهاء
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              إضافة رخصة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Expiring Alert */}
      {expiringSoon.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<WarnIcon />}>
          <Typography fontWeight={600}>
            تنبيه: {expiringSoon.length} رخصة/تصريح تنتهي خلال 30 يوماً
          </Typography>
          <Typography variant="body2">{expiringSoon.map(l => l.name).join(' — ')}</Typography>
        </Alert>
      )}

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي الرخص', value: stats.total, color: brandColors.primary },
            { label: 'سارية', value: stats.active, color: statusColors.success },
            { label: 'منتهية', value: stats.expired, color: statusColors.error },
            { label: 'بانتظار التجديد', value: stats.pendingRenewal, color: statusColors.warning },
            {
              label: 'التكلفة السنوية',
              value: `${stats.annualCost?.toLocaleString()} ر.س`,
              color: brandColors.primary,
            },
            { label: 'تنتهي خلال 30 يوم', value: stats.expiringSoon, color: statusColors.warning },
          ].map((s, i) => (
            <Grid item xs={2} key={i}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  border: `1px solid ${surfaceColors.border}`,
                  textAlign: 'center',
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Search & Filter */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم أو الرقم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary, ml: 'auto' }}>
            عرض {filtered.length} من {licenses.length} رخصة
          </Typography>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>الرقم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الرخصة/التصريح</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الجهة المصدرة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الإصدار</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الانتهاء</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المتبقي</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  التكلفة
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(lic => {
                const days = daysUntilExpiry(lic.expiryDate);
                const isExpiringSoon = days !== null && days >= 0 && days <= 30;
                return (
                  <TableRow
                    key={lic._id}
                    hover
                    sx={
                      lic.status === 'expired'
                        ? { bgcolor: `${statusColors.error}08` }
                        : isExpiringSoon
                          ? { bgcolor: `${statusColors.warning}08` }
                          : {}
                    }
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {lic.number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isExpiringSoon && <WarnIcon fontSize="small" color="warning" />}
                        <Typography variant="body2" fontWeight={600}>
                          {lic.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={lic.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{lic.issuer}</TableCell>
                    <TableCell>{lic.issueDate}</TableCell>
                    <TableCell>{lic.expiryDate}</TableCell>
                    <TableCell>
                      {days !== null && (
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            color:
                              days < 0
                                ? statusColors.error
                                : days <= 30
                                  ? statusColors.warning
                                  : statusColors.success,
                          }}
                        >
                          {days < 0 ? `منتهي (${Math.abs(days)} يوم)` : `${days} يوم`}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={600}>{lic.cost?.toLocaleString()} ر.س</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig[lic.status]?.label || lic.status}
                        color={statusConfig[lic.status]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => setViewLic(lic)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {(lic.status === 'expired' || isExpiringSoon) && (
                        <Tooltip title="تجديد">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleRenew(lic._id)}
                          >
                            <RenewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>لا توجد رخص</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={!!viewLic}
        onClose={() => setViewLic(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          تفاصيل الرخصة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {viewLic && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الرقم
                </Typography>
                <Typography fontWeight={700}>{viewLic.number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  النوع
                </Typography>
                <Chip label={viewLic.type} size="small" variant="outlined" />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  الاسم
                </Typography>
                <Typography fontWeight={700}>{viewLic.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الجهة المصدرة
                </Typography>
                <Typography fontWeight={600}>{viewLic.issuer}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  القسم
                </Typography>
                <Typography fontWeight={600}>{viewLic.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الإصدار
                </Typography>
                <Typography>{viewLic.issueDate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الانتهاء
                </Typography>
                <Typography
                  sx={{
                    color: daysUntilExpiry(viewLic.expiryDate) < 0 ? statusColors.error : 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {viewLic.expiryDate}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  التكلفة
                </Typography>
                <Typography fontWeight={700} sx={{ color: brandColors.primary }}>
                  {viewLic.cost?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Chip
                  label={statusConfig[viewLic.status]?.label}
                  color={statusConfig[viewLic.status]?.color}
                />
              </Grid>
              {viewLic.notes && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    ملاحظات
                  </Typography>
                  <Typography>{viewLic.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewLic(null)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          إضافة رخصة جديدة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم الرخصة/التصريح *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type}
                  label="النوع"
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {licenseTypes.map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="رقم الرخصة"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الجهة المصدرة"
                value={form.issuer}
                onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الإصدار"
                type="date"
                value={form.issueDate}
                onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الانتهاء"
                type="date"
                value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="التكلفة"
                type="number"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name}
            sx={{ borderRadius: 2 }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LicenseManagement;
