import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import eSignatureService from '../../services/eSignature.service';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  TextField,
  InputAdornment,
  LinearProgress,
  CircularProgress,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Draw as SignIcon,
  Verified as VerifyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  Assignment,
  PendingActions,
  CheckCircleOutline,
  CancelOutlined,
  Schedule,
  Description as TemplateIcon,
  MoreVert,
  Visibility,
  Send as RemindIcon,
  Block as CancelIcon,
  FilterList,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors } from '../../theme/palette';

/* ═══ Status & Type Mappings ═══════════════════════════════════════════════ */
const statusMap = {
  draft: { label: 'مسودة', color: 'default', bg: '#e0e0e0' },
  pending: { label: 'بانتظار التوقيع', color: 'warning', bg: '#fff3e0' },
  in_progress: { label: 'قيد التنفيذ', color: 'info', bg: '#e3f2fd' },
  completed: { label: 'مكتمل', color: 'success', bg: '#e8f5e9' },
  rejected: { label: 'مرفوض', color: 'error', bg: '#ffebee' },
  expired: { label: 'منتهي', color: 'default', bg: '#fafafa' },
  cancelled: { label: 'ملغي', color: 'default', bg: '#f5f5f5' },
};

const typeMap = {
  contract: 'عقد',
  agreement: 'اتفاقية',
  approval: 'موافقة',
  memo: 'مذكرة',
  policy: 'سياسة',
  authorization: 'تفويض',
  financial: 'مالي',
  hr: 'موارد بشرية',
  medical: 'طبي',
  legal: 'قانوني',
  purchase_order: 'أمر شراء',
  nda: 'اتفاقية سرية',
  mou: 'مذكرة تفاهم',
  other: 'أخرى',
};

const priorityMap = {
  low: { label: 'منخفضة', color: '#9e9e9e' },
  medium: { label: 'متوسطة', color: '#2196f3' },
  high: { label: 'عالية', color: '#ff9800' },
  urgent: { label: 'عاجلة', color: '#f44336' },
};

export default function ESignature() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const statusFilter = [
    '',
    'pending',
    'completed',
    'rejected',
    'in_progress',
    'expired',
    'cancelled',
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        eSignatureService.getStats().catch(() => null),
        eSignatureService.getAll({
          status: statusFilter[tab] || undefined,
          search: search || undefined,
          page: page + 1,
          limit: rowsPerPage,
        }),
      ]);
      if (statsRes?.data?.data) setStats(statsRes.data.data);
      if (listRes?.data?.data) {
        setRequests(listRes.data.data);
        setTotal(listRes.data?.pagination?.total || 0);
      }
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page, rowsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemind = async id => {
    try {
      await eSignatureService.remind(id);
      showSnackbar('تم إرسال التذكير بنجاح', 'success');
    } catch {
      showSnackbar('خطأ في إرسال التذكير', 'error');
    }
    setMenuAnchor(null);
  };

  const handleCancel = async id => {
    try {
      await eSignatureService.cancel(id, { reason: 'إلغاء من لوحة التحكم' });
      showSnackbar('تم إلغاء الطلب', 'success');
      loadData();
    } catch {
      showSnackbar('خطأ في إلغاء الطلب', 'error');
    }
    setMenuAnchor(null);
  };

  /* ═══ KPI Cards ══════════════════════════════════════════════════════════ */
  const kpis = stats
    ? [
        {
          label: 'إجمالي الطلبات',
          value: stats.counts.total,
          icon: <Assignment />,
          gradient: gradients.info,
        },
        {
          label: 'بانتظار التوقيع',
          value: stats.counts.pending + stats.counts.inProgress,
          icon: <PendingActions />,
          gradient: gradients.warning,
        },
        {
          label: 'مكتملة',
          value: stats.counts.completed,
          icon: <CheckCircleOutline />,
          gradient: gradients.success,
        },
        {
          label: 'نسبة الإنجاز',
          value: `${stats.completionRate}%`,
          icon: <TrendingUp />,
          gradient: gradients.primary,
        },
        {
          label: 'مرفوضة',
          value: stats.counts.rejected,
          icon: <CancelOutlined />,
          gradient: gradients.error || gradients.danger,
        },
        {
          label: 'متوسط الإنجاز',
          value: `${stats.avgCompletionHours}h`,
          icon: <Schedule />,
          gradient: gradients.info,
        },
      ]
    : [];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.info, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
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
              <SignIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                التوقيع الإلكتروني
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة شاملة لطلبات التوقيع الرقمي والتحقق والقوالب
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<TemplateIcon />}
              onClick={() => navigate('/e-signature/templates')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              القوالب
            </Button>
            <Button
              variant="contained"
              startIcon={<VerifyIcon />}
              onClick={() => navigate('/e-signature/verify')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              التحقق
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/e-signature/create')}
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              طلب جديد
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ─── KPI Cards ───────────────────────────────────────────────────── */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {kpis.map((kpi, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card
                sx={{ background: kpi.gradient, color: 'white', borderRadius: 2, height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ mb: 1, opacity: 0.85 }}>{kpi.icon}</Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {kpi.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ─── Filters & Search ────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="بحث بالعنوان أو رقم الطلب..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
          <Tooltip title="تحديث">
            <IconButton onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Chip icon={<FilterList />} label={`${total} نتيجة`} variant="outlined" />
        </Box>
      </Paper>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="الكل" />
          <Tab label="معلقة" />
          <Tab label="مكتملة" />
          <Tab label="مرفوضة" />
          <Tab label="قيد التنفيذ" />
          <Tab label="منتهية" />
          <Tab label="ملغاة" />
        </Tabs>
      </Paper>

      {/* ─── Loading ─────────────────────────────────────────────────────── */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f7fa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>رقم الطلب</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المستند</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الموقعون</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">لا توجد طلبات توقيع</Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map(r => (
                <TableRow
                  key={r._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/e-signature/sign/${r._id}`)}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', color: 'primary.main' }}
                    >
                      {r.requestId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.documentTitle}
                    </Typography>
                    {r.createdByName && (
                      <Typography variant="caption" color="text.secondary">
                        {r.createdByName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={typeMap[r.documentType] || r.documentType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={priorityMap[r.priority]?.label || r.priority}
                      size="small"
                      sx={{
                        bgcolor: priorityMap[r.priority]?.color,
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(r.signers || []).slice(0, 3).map((s, i) => (
                        <Chip
                          key={i}
                          label={s.name}
                          size="small"
                          color={
                            s.status === 'signed'
                              ? 'success'
                              : s.status === 'rejected'
                                ? 'error'
                                : 'default'
                          }
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {(r.signers || []).length > 3 && (
                        <Chip label={`+${r.signers.length - 3}`} size="small" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusMap[r.status]?.label || r.status}
                      color={statusMap[r.status]?.color || 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/e-signature/sign/${r._id}`)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={e => {
                        setMenuAnchor(e.currentTarget);
                        setMenuRow(r);
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="صفوف في الصفحة:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* ─── Context Menu ────────────────────────────────────────────────── */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            navigate(`/e-signature/sign/${menuRow?._id}`);
            setMenuAnchor(null);
          }}
        >
          <Visibility fontSize="small" sx={{ ml: 1 }} /> عرض التفاصيل
        </MenuItem>
        {menuRow && ['pending', 'in_progress'].includes(menuRow.status) && (
          <MenuItem onClick={() => handleRemind(menuRow._id)}>
            <RemindIcon fontSize="small" sx={{ ml: 1 }} /> إرسال تذكير
          </MenuItem>
        )}
        {menuRow && !['completed', 'cancelled'].includes(menuRow.status) && (
          <MenuItem onClick={() => handleCancel(menuRow._id)} sx={{ color: 'error.main' }}>
            <CancelIcon fontSize="small" sx={{ ml: 1 }} /> إلغاء الطلب
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            navigate(`/e-signature/verify/${menuRow?._id}`);
            setMenuAnchor(null);
          }}
        >
          <VerifyIcon fontSize="small" sx={{ ml: 1 }} /> التحقق من المستند
        </MenuItem>
      </Menu>
    </Box>
  );
}
