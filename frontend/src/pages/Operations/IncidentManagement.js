import { useState, useEffect, useCallback } from 'react';




import { incidentService } from 'services/operationsService';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const severityConfig = {
  low: { label: 'منخفض', color: 'info' },
  medium: { label: 'متوسط', color: 'warning' },
  high: { label: 'عالي', color: 'error' },
  critical: { label: 'حرج', color: 'error' },
};

const statusConfig = {
  open: { label: 'مفتوح', color: 'error' },
  assigned: { label: 'معيّن', color: 'info' },
  investigating: { label: 'قيد التحقيق', color: 'warning' },
  resolved: { label: 'تم الحل', color: 'success' },
  closed: { label: 'مغلق', color: 'default' },
  escalated: { label: 'مصعّد', color: 'error' },
};

const incidentTypes = ['أمن', 'سلامة', 'حريق', 'بيئي', 'طبي', 'عطل فني', 'إداري', 'شكوى', 'أخرى'];

const IncidentManagement = () => {
  const showSnackbar = useSnackbar();
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [viewInc, setViewInc] = useState(null);
  const [form, setForm] = useState({
    title: '',
    type: '',
    severity: 'medium',
    department: '',
    location: '',
    description: '',
    reportedBy: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [inc, s] = await Promise.all([
        incidentService.getAll({ search, status: statusFilter }),
        incidentService.getStatistics(),
      ]);
      setIncidents(Array.isArray(inc?.data) ? inc.data : incidentService.getMockIncidents());
      setStats(s || incidentService.getMockStats());
    } catch {
      setIncidents(incidentService.getMockIncidents());
      setStats(incidentService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      await incidentService.create(form);
      showSnackbar('تم تسجيل الحادثة بنجاح', 'success');
      setDialog(false);
      setForm({
        title: '',
        type: '',
        severity: 'medium',
        department: '',
        location: '',
        description: '',
        reportedBy: '',
      });
      loadData();
    } catch {
      showSnackbar('فشل في تسجيل الحادثة', 'error');
    }
  };

  const handleResolve = async id => {
    try {
      await incidentService.resolve(id, { resolution: 'تم الحل' });
      showSnackbar('تم حل الحادثة', 'success');
      loadData();
    } catch {
      showSnackbar('فشل في حل الحادثة', 'error');
    }
  };

  const handleEscalate = async id => {
    try {
      await incidentService.escalate(id, { reason: 'تصعيد إلى الإدارة العليا' });
      showSnackbar('تم التصعيد بنجاح', 'success');
      loadData();
    } catch {
      showSnackbar('فشل في التصعيد', 'error');
    }
  };

  const filtered = incidents.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search && !i.title?.includes(search) && !i.incidentNumber?.includes(search)) return false;
    return true;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <IncIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة الحوادث
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تسجيل ومتابعة الحوادث والأحداث
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
              تسجيل حادثة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي الحوادث', value: stats.total, color: brandColors.primary },
            { label: 'مفتوحة', value: stats.open, color: statusColors.error },
            { label: 'قيد التحقيق', value: stats.investigating, color: statusColors.warning },
            { label: 'تم الحل', value: stats.resolved, color: statusColors.success },
            { label: 'حرجة', value: stats.critical, color: statusColors.error },
            { label: 'معدل الحل', value: `${stats.resolutionRate}%`, color: brandColors.primary },
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
            placeholder="بحث..."
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
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
            عرض {filtered.length} من {incidents.length} حادثة
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
                <TableCell sx={{ fontWeight: 700 }}>رقم الحادثة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الموقع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الخطورة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المسؤول</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(inc => (
                <TableRow
                  key={inc._id}
                  hover
                  sx={inc.severity === 'critical' ? { bgcolor: `${statusColors.error}08` } : {}}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {inc.incidentNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {inc.severity === 'critical' && <CritIcon fontSize="small" color="error" />}
                      <Typography variant="body2" fontWeight={600}>
                        {inc.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={inc.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{inc.department}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{inc.location}</Typography>
                  </TableCell>
                  <TableCell>{inc.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={severityConfig[inc.severity]?.label || inc.severity}
                      color={severityConfig[inc.severity]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{inc.assignedTo || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig[inc.status]?.label || inc.status}
                      color={statusConfig[inc.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="عرض">
                      <IconButton size="small" onClick={() => setViewInc(inc)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {inc.status !== 'resolved' && inc.status !== 'closed' && (
                      <>
                        <Tooltip title="حل">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleResolve(inc._id)}
                          >
                            <ResolveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تصعيد">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleEscalate(inc._id)}
                          >
                            <EscalateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد حوادث
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={!!viewInc}
        onClose={() => setViewInc(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          تفاصيل الحادثة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {viewInc && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  رقم الحادثة
                </Typography>
                <Typography fontWeight={700}>{viewInc.incidentNumber}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الخطورة
                </Typography>
                <Chip
                  label={severityConfig[viewInc.severity]?.label}
                  color={severityConfig[viewInc.severity]?.color}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  العنوان
                </Typography>
                <Typography fontWeight={700}>{viewInc.title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  الوصف
                </Typography>
                <Typography>{viewInc.description}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  النوع
                </Typography>
                <Chip label={viewInc.type} size="small" variant="outlined" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  القسم
                </Typography>
                <Typography fontWeight={600}>{viewInc.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الموقع
                </Typography>
                <Typography>{viewInc.location}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  التاريخ
                </Typography>
                <Typography>{viewInc.date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  أبلغ بواسطة
                </Typography>
                <Typography>{viewInc.reportedBy}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المسؤول
                </Typography>
                <Typography>{viewInc.assignedTo || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Chip
                  label={statusConfig[viewInc.status]?.label}
                  color={statusConfig[viewInc.status]?.color}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewInc(null)} variant="contained" sx={{ borderRadius: 2 }}>
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
          تسجيل حادثة جديدة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان الحادثة *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
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
                  {incidentTypes.map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الخطورة</InputLabel>
                <Select
                  value={form.severity}
                  label="الخطورة"
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                >
                  {Object.entries(severityConfig).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                label="الموقع"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="أبلغ بواسطة"
                value={form.reportedBy}
                onChange={e => setForm(f => ({ ...f, reportedBy: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="وصف الحادثة *"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
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
            disabled={!form.title || !form.description}
            sx={{ borderRadius: 2 }}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IncidentManagement;
