import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import administrationService from '../../services/administration.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Search,
  Refresh,
  Gavel,
  MoreVert,
  Visibility,
  Edit,
  Send,
  CheckCircle,
  Cancel,
  PendingActions,
  Archive,
  Block,
  ArrowBack,
  Description,
  Campaign,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const docTypeLabels = {
  decision: 'قرار إداري',
  memo: 'مذكرة',
  circular: 'تعميم',
  directive: 'توجيه',
  announcement: 'إعلان',
  policy: 'سياسة',
  procedure: 'إجراء',
  minutes: 'محضر اجتماع',
};
const docTypeIcons = {
  decision: '⚖️',
  memo: '📝',
  circular: '📢',
  directive: '📋',
  announcement: '📣',
  policy: '📜',
  procedure: '📑',
  minutes: '🗒️',
};

const statusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  under_review: { label: 'قيد المراجعة', color: 'info' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'warning' },
  approved: { label: 'معتمد', color: 'success' },
  published: { label: 'منشور', color: 'success' },
  archived: { label: 'مؤرشف', color: 'default' },
  revoked: { label: 'ملغي', color: 'error' },
};

const categoryLabels = {
  administrative: 'إداري',
  financial: 'مالي',
  medical: 'طبي',
  legal: 'قانوني',
  hr: 'موارد بشرية',
  academic: 'أكاديمي',
  technical: 'تقني',
  operational: 'تشغيلي',
  general: 'عام',
};

const priorityLabels = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
  critical: 'حرجة',
};
const priorityColors = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
  critical: 'error',
};

const tabStatuses = [
  { value: '', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'pending_approval', label: 'بانتظار الاعتماد' },
  { value: 'published', label: 'منشور' },
  { value: 'archived', label: 'مؤرشف' },
  { value: 'revoked', label: 'ملغي' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDecisions() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selected, setSelected] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState(false);
  const [dialogReason, setDialogReason] = useState('');

  /* ─── Load ──────────────────────────────────────────────────────────────── */
  const loadDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.documentType = typeFilter;
      if (search) params.search = search;
      const res = await administrationService.getDecisions(params);
      if (res?.data?.data) {
        setDecisions(res.data.data);
        setPagination(res.data.pagination || {});
      }
    } catch {
      showSnackbar('خطأ في تحميل القرارات', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, typeFilter, search]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  /* ─── Context menu ──────────────────────────────────────────────────────── */
  const openMenu = (e, d) => {
    setAnchorEl(e.currentTarget);
    setSelected(d);
  };
  const closeMenu = () => {
    setAnchorEl(null);
    setSelected(null);
  };

  const handleAction = async action => {
    closeMenu();
    if (!selected) return;
    try {
      switch (action) {
        case 'view':
          navigate(`/administration/decisions/${selected._id}`);
          break;
        case 'submit':
          await administrationService.submitDecision(selected._id);
          showSnackbar('تم إرسال القرار للمراجعة', 'success');
          loadDecisions();
          break;
        case 'approve':
          await administrationService.approveDecision(selected._id);
          showSnackbar('تم اعتماد القرار', 'success');
          loadDecisions();
          break;
        case 'reject':
          setRejectDialog(true);
          return;
        case 'publish':
          await administrationService.publishDecision(selected._id);
          showSnackbar('تم نشر القرار', 'success');
          loadDecisions();
          break;
        case 'archive':
          await administrationService.archiveDecision(selected._id);
          showSnackbar('تم أرشفة القرار', 'success');
          loadDecisions();
          break;
        case 'revoke':
          setRevokeDialog(true);
          return;
        default:
          break;
      }
    } catch {
      showSnackbar('خطأ في تنفيذ العملية', 'error');
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      await administrationService.rejectDecision(selected._id, { reason: dialogReason });
      showSnackbar('تم رفض القرار', 'success');
      setRejectDialog(false);
      setDialogReason('');
      setSelected(null);
      loadDecisions();
    } catch {
      showSnackbar('خطأ في رفض القرار', 'error');
    }
  };

  const handleRevoke = async () => {
    if (!selected) return;
    try {
      await administrationService.revokeDecision(selected._id, { reason: dialogReason });
      showSnackbar('تم إلغاء القرار', 'success');
      setRevokeDialog(false);
      setDialogReason('');
      setSelected(null);
      loadDecisions();
    } catch {
      showSnackbar('خطأ في إلغاء القرار', 'error');
    }
  };

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
            <IconButton onClick={() => navigate('/administration')} sx={{ color: 'white' }}>
              <ArrowBack />
            </IconButton>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Gavel sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                القرارات والمذكرات
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة القرارات الإدارية والتعاميم والمذكرات
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/administration/decisions/create')}
            sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            إنشاء جديد
          </Button>
        </Box>
      </Box>

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالعنوان أو الرقم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>نوع المستند</InputLabel>
            <Select
              value={typeFilter}
              label="نوع المستند"
              onChange={e => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(docTypeLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="تحديث">
            <IconButton onClick={loadDecisions}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

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
        ) : decisions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Gavel sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">لا توجد قرارات أو مذكرات</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التصنيف</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {decisions.map(d => {
                    const sc = statusConfig[d.status] || statusConfig.draft;
                    const pc = priorityColors[d.priority] || 'default';
                    return (
                      <TableRow
                        key={d._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/administration/decisions/${d._id}`)}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                          >
                            {d.decisionNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${docTypeIcons[d.documentType] || '📄'} ${docTypeLabels[d.documentType] || d.documentType}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="600" noWrap sx={{ maxWidth: 260 }}>
                            {d.title}
                          </Typography>
                          {d.department && (
                            <Typography variant="caption" color="text.secondary">
                              {d.department}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{categoryLabels[d.category] || d.category}</TableCell>
                        <TableCell>
                          <Chip
                            label={priorityLabels[d.priority] || d.priority}
                            size="small"
                            color={pc}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" />
                        </TableCell>
                        <TableCell>
                          {d.createdAt ? new Date(d.createdAt).toLocaleDateString('ar-SA') : '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <IconButton size="small" onClick={e => openMenu(e, d)}>
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
        {selected?.status === 'draft' && (
          <MenuItem onClick={() => handleAction('submit')}>
            <Send sx={{ ml: 1, color: 'info.main' }} /> إرسال للمراجعة
          </MenuItem>
        )}
        {(selected?.status === 'under_review' || selected?.status === 'pending_approval') && (
          <MenuItem onClick={() => handleAction('approve')}>
            <CheckCircle sx={{ ml: 1, color: 'success.main' }} /> اعتماد
          </MenuItem>
        )}
        {(selected?.status === 'under_review' || selected?.status === 'pending_approval') && (
          <MenuItem onClick={() => handleAction('reject')}>
            <Cancel sx={{ ml: 1, color: 'error.main' }} /> رفض
          </MenuItem>
        )}
        {selected?.status === 'approved' && (
          <MenuItem onClick={() => handleAction('publish')}>
            <Campaign sx={{ ml: 1, color: 'success.main' }} /> نشر
          </MenuItem>
        )}
        {selected?.status === 'published' && (
          <MenuItem onClick={() => handleAction('archive')}>
            <Archive sx={{ ml: 1 }} /> أرشفة
          </MenuItem>
        )}
        {selected?.status === 'published' && (
          <MenuItem onClick={() => handleAction('revoke')}>
            <Block sx={{ ml: 1, color: 'error.main' }} /> إلغاء
          </MenuItem>
        )}
      </Menu>

      {/* ─── Reject Dialog ───────────────────────────────────────────────── */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>رفض القرار</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            يرجى كتابة سبب الرفض:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={dialogReason}
            onChange={e => setDialogReason(e.target.value)}
            placeholder="سبب الرفض..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!dialogReason.trim()}
          >
            رفض
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Revoke Dialog ───────────────────────────────────────────────── */}
      <Dialog open={revokeDialog} onClose={() => setRevokeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إلغاء القرار</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            يرجى كتابة سبب الإلغاء:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={dialogReason}
            onChange={e => setDialogReason(e.target.value)}
            placeholder="سبب الإلغاء..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevoke}
            disabled={!dialogReason.trim()}
          >
            إلغاء القرار
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
