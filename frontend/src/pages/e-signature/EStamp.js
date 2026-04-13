import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import eStampService from '../../services/eStamp.service';




import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const typeLabels = {
  official: 'رسمي',
  department: 'إداري',
  personal: 'شخصي',
  temporary: 'مؤقت',
  project: 'مشروع',
  confidential: 'سري',
  received: 'وارد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  draft: 'مسودة',
  copy: 'نسخة',
  urgent: 'عاجل',
};

const statusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'warning' },
  active: { label: 'مفعّل', color: 'success' },
  suspended: { label: 'معلّق', color: 'info' },
  revoked: { label: 'ملغي', color: 'error' },
  expired: { label: 'منتهي', color: 'default' },
};

const categoryLabels = {
  administrative: 'إداري',
  financial: 'مالي',
  medical: 'طبي',
  legal: 'قانوني',
  hr: 'موارد بشرية',
  academic: 'أكاديمي',
  technical: 'تقني',
  general: 'عام',
};

const tabStatuses = [
  { value: '', label: 'الكل' },
  { value: 'active', label: 'مفعّل' },
  { value: 'pending_approval', label: 'بانتظار الاعتماد' },
  { value: 'draft', label: 'مسودة' },
  { value: 'suspended', label: 'معلّق' },
  { value: 'revoked', label: 'ملغي' },
  { value: 'expired', label: 'منتهي' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EStamp() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStamp, setSelectedStamp] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  /* ─── Debounced search ─────────────────────────────────────────────────── */
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  /* ─── Load ──────────────────────────────────────────────────────────────── */
  const loadStats = useCallback(async () => {
    try {
      const res = await eStampService.getStats();
      if (res?.data?.data) setStats(res.data.data);
    } catch {
      /* silent */
    }
  }, []);

  const loadStamps = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await eStampService.getAll(params);
      if (res?.data?.data) {
        setStamps(res.data.data);
        setPagination(res.data.pagination || {});
      }
    } catch {
      showSnackbar('خطأ في تحميل الأختام', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    loadStamps();
  }, [loadStamps]);

  const handleRefresh = () => {
    loadStats();
    loadStamps();
  };

  /* ─── Context menu ──────────────────────────────────────────────────────── */
  const openMenu = (e, stamp) => {
    setAnchorEl(e.currentTarget);
    setSelectedStamp(stamp);
  };
  const closeMenu = () => {
    setAnchorEl(null);
    setSelectedStamp(null);
  };

  const handleAction = async action => {
    closeMenu();
    if (!selectedStamp) return;
    try {
      switch (action) {
        case 'view':
          navigate(`/e-stamp/${selectedStamp._id}`);
          break;
        case 'apply':
          navigate(`/e-stamp/apply/${selectedStamp._id}`);
          break;
        case 'approve':
          await eStampService.approve(selectedStamp._id);
          showSnackbar('تم اعتماد الختم', 'success');
          loadStamps();
          break;
        case 'deactivate':
          await eStampService.deactivate(selectedStamp._id, { reason: 'تعليق' });
          showSnackbar('تم تعليق الختم', 'success');
          loadStamps();
          break;
        case 'activate':
          await eStampService.activate(selectedStamp._id);
          showSnackbar('تم تفعيل الختم', 'success');
          loadStamps();
          break;
        default:
          break;
      }
    } catch {
      showSnackbar('خطأ في تنفيذ العملية', 'error');
    }
  };

  /* ─── Bulk selection helpers ────────────────────────────────────────────── */
  const toggleSelect = id => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === stamps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(stamps.map(s => s._id));
    }
  };
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`هل تريد حذف ${selectedIds.length} ختم؟`)) return;
    let ok = 0;
    for (const sid of selectedIds) {
      try {
        await eStampService.remove(sid);
        ok++;
      } catch {
        /* skip */
      }
    }
    showSnackbar(`تم حذف ${ok} من ${selectedIds.length} ختم`, 'success');
    setSelectedIds([]);
    loadStamps();
    loadStats();
  };
  const handleBulkApprove = async () => {
    if (!selectedIds.length) return;
    let ok = 0;
    for (const sid of selectedIds) {
      try {
        await eStampService.approve(sid);
        ok++;
      } catch {
        /* skip */
      }
    }
    showSnackbar(`تم اعتماد ${ok} من ${selectedIds.length} ختم`, 'success');
    setSelectedIds([]);
    loadStamps();
    loadStats();
  };

  /* ─── KPI Cards ─────────────────────────────────────────────────────────── */
  const kpis = stats
    ? [
        {
          label: 'إجمالي الأختام',
          value: stats.total,
          icon: <Verified />,
          gradient: gradients.primary,
        },
        {
          label: 'مفعّلة',
          value: stats.active,
          icon: <CheckCircle />,
          gradient: gradients.success || 'linear-gradient(135deg, #43a047, #66bb6a)',
        },
        {
          label: 'بانتظار الاعتماد',
          value: stats.pendingApproval,
          icon: <PendingActions />,
          gradient: gradients.warning || 'linear-gradient(135deg, #ef6c00, #ffa726)',
        },
        {
          label: 'إجمالي الاستخدامات',
          value: stats.totalUsage,
          icon: <BarChart />,
          gradient: gradients.info || 'linear-gradient(135deg, #1565c0, #42a5f5)',
        },
        {
          label: 'ملغية',
          value: stats.revoked,
          icon: <Block />,
          gradient: gradients.error || 'linear-gradient(135deg, #c62828, #ef5350)',
        },
        {
          label: 'منتهية',
          value: stats.expired,
          icon: <Cancel />,
          gradient: 'linear-gradient(135deg, #546e7a, #90a4ae)',
        },
      ]
    : [];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Verified sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                الختم الإلكتروني
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة وتطبيق الأختام الرسمية والإدارية
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/e-stamp/create')}
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              ختم جديد
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/e-stamp/verify')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              التحقق
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ─── KPI Cards ───────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ background: kpi.gradient, color: 'white', borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                {kpi.icon}
                <Typography variant="h4" fontWeight="bold">
                  {kpi.value ?? '—'}
                </Typography>
                <Typography variant="caption">{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Search Bar ──────────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم أو الرقم أو القسم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="تحديث">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* ─── Bulk Action Bar ─────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold" sx={{ ml: 1 }}>
            تم تحديد {selectedIds.length} ختم
          </Typography>
          <Button size="small" variant="contained" color="success" onClick={handleBulkApprove}>
            <CheckCircle sx={{ ml: 0.5, fontSize: 18 }} /> اعتماد المحدد
          </Button>
          <Button size="small" variant="contained" color="error" onClick={handleBulkDelete}>
            <DeleteIcon sx={{ ml: 0.5, fontSize: 18 }} /> حذف المحدد
          </Button>
          <Button size="small" variant="outlined" onClick={() => setSelectedIds([])}>
            إلغاء التحديد
          </Button>
        </Paper>
      )}

      {/* ─── Status Tabs ─────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={(_, v) => {
            setStatusFilter(v);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabStatuses.map(t => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Paper>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : stamps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Verified sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">لا توجد أختام</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedIds.length > 0 && selectedIds.length < stamps.length}
                        checked={stamps.length > 0 && selectedIds.length === stamps.length}
                        onChange={toggleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الختم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الختم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التصنيف</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القسم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاستخدامات</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>آخر استخدام</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stamps.map(stamp => {
                    const sc = statusConfig[stamp.status] || statusConfig.draft;
                    return (
                      <TableRow
                        key={stamp._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/e-stamp/${stamp._id}`)}
                        selected={selectedIds.includes(stamp._id)}
                      >
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(stamp._id)}
                            onChange={() => toggleSelect(stamp._id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                          >
                            {stamp.stampId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {stamp.stampImage ? (
                            <Avatar
                              src={stamp.stampImage}
                              variant="rounded"
                              sx={{ width: 40, height: 40, border: '1px solid #eee' }}
                            />
                          ) : (
                            <Avatar
                              variant="rounded"
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: stamp.colorScheme?.primary || '#1a237e',
                              }}
                            >
                              <Verified sx={{ fontSize: 20, color: 'white' }} />
                            </Avatar>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="600">{stamp.name_ar}</Typography>
                          {stamp.name_en && (
                            <Typography variant="caption" color="text.secondary">
                              {stamp.name_en}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeLabels[stamp.stampType] || stamp.stampType}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{categoryLabels[stamp.category] || stamp.category}</TableCell>
                        <TableCell>{stamp.department || '—'}</TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={stamp.usageCount || 0} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {stamp.lastUsedAt
                            ? new Date(stamp.lastUsedAt).toLocaleDateString('ar-SA')
                            : '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <IconButton size="small" onClick={e => openMenu(e, stamp)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={pagination.total || 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              labelRowsPerPage="عدد الصفوف:"
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* ─── Context Menu ────────────────────────────────────────────────── */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={() => handleAction('view')}>
          <Visibility sx={{ ml: 1 }} /> عرض التفاصيل
        </MenuItem>
        {selectedStamp && ['draft', 'active', 'suspended'].includes(selectedStamp.status) && (
          <MenuItem
            onClick={() => {
              closeMenu();
              navigate(`/e-stamp/edit/${selectedStamp._id}`);
            }}
          >
            <Edit sx={{ ml: 1 }} /> تعديل
          </MenuItem>
        )}
        {selectedStamp?.status === 'active' && (
          <MenuItem onClick={() => handleAction('apply')}>
            <Verified sx={{ ml: 1 }} /> تطبيق الختم
          </MenuItem>
        )}
        {selectedStamp?.status === 'pending_approval' && (
          <MenuItem onClick={() => handleAction('approve')}>
            <CheckCircle sx={{ ml: 1, color: 'success.main' }} /> اعتماد
          </MenuItem>
        )}
        {selectedStamp?.status === 'active' && (
          <MenuItem onClick={() => handleAction('deactivate')}>
            <Block sx={{ ml: 1, color: 'warning.main' }} /> تعليق
          </MenuItem>
        )}
        {selectedStamp?.status === 'suspended' && (
          <MenuItem onClick={() => handleAction('activate')}>
            <CheckCircle sx={{ ml: 1, color: 'success.main' }} /> تفعيل
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
