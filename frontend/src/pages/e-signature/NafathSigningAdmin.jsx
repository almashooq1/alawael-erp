/**
 * NafathSigningAdmin.jsx — إدارة طلبات التوقيع بهوية نفاذ (BC-10 Critical P1)
 *
 * Backend: /api/v1/nafath-signing (nafath-signing.routes.js)
 *
 * Endpoints used:
 *   GET    /api/v1/nafath-signing             — list (filters: status, limit, skip)
 *   GET    /api/v1/nafath-signing/:id/status  — poll + transition
 *   POST   /api/v1/nafath-signing/:id/cancel  — cancel pending request
 *   GET    /api/v1/nafath-signing/:id/verify  — re-verify JWS
 *   GET    /api/v1/nafath-signing/:id/evidence — download evidence JSON (admin only)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Fingerprint,
  Cancel,
  Verified,
  Download,
  Refresh,
  Search,
  CheckCircle,
  HourglassTop,
  Block,
  ErrorOutlineOutlined as ErrorOutline,
  Schedule,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import authHeader from '../../utils/authHeader';

/* ─── API ────────────────────────────────────────────────────────────────── */
const BASE = '/api/v1/nafath-signing';
const api = {
  list: params => {
    const q = new URLSearchParams({ limit: 100, ...params }).toString();
    return fetch(`${BASE}?${q}`, { headers: authHeader() }).then(r => r.json());
  },
  status: id => fetch(`${BASE}/${id}/status`, { headers: authHeader() }).then(r => r.json()),
  cancel: id =>
    fetch(`${BASE}/${id}/cancel`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
    }).then(r => r.json()),
  verify: id => fetch(`${BASE}/${id}/verify`, { headers: authHeader() }).then(r => r.json()),
  evidenceUrl: id => `${BASE}/${id}/evidence`,
};

/* ─── Demo fallback ──────────────────────────────────────────────────────── */
const DEMO = [
  {
    _id: 'd1',
    documentType: 'contract',
    documentId: 'doc-001',
    purpose: 'توقيع عقد توظيف',
    status: 'completed',
    mode: 'mock',
    signerNationalId: '1099xxxxx',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    _id: 'd2',
    documentType: 'medical',
    documentId: 'doc-002',
    purpose: 'موافقة على البروتوكول العلاجي',
    status: 'pending',
    mode: 'mock',
    signerNationalId: '2088xxxxx',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: null,
  },
  {
    _id: 'd3',
    documentType: 'approval',
    documentId: 'doc-003',
    purpose: 'اعتماد خطة الرعاية',
    status: 'expired',
    mode: 'mock',
    signerNationalId: '1077xxxxx',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: null,
  },
  {
    _id: 'd4',
    documentType: 'agreement',
    documentId: 'doc-004',
    purpose: 'اتفاقية السرية',
    status: 'cancelled',
    mode: 'mock',
    signerNationalId: '1055xxxxx',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: null,
  },
  {
    _id: 'd5',
    documentType: 'nda',
    documentId: 'doc-005',
    purpose: 'مذكرة تفاهم مع شريك',
    status: 'verified',
    mode: 'mock',
    signerNationalId: '1033xxxxx',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    completedAt: new Date(Date.now() - 250000000).toISOString(),
  },
];

/* ─── Status config ─────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', color: 'warning', icon: <HourglassTop fontSize="small" /> },
  initiated: { label: 'جارٍ المعالجة', color: 'info', icon: <Schedule fontSize="small" /> },
  completed: { label: 'مكتمل', color: 'success', icon: <CheckCircle fontSize="small" /> },
  verified: { label: 'موثّق', color: 'success', icon: <Verified fontSize="small" /> },
  expired: { label: 'منتهي', color: 'default', icon: <ErrorOutline fontSize="small" /> },
  cancelled: { label: 'ملغى', color: 'error', icon: <Block fontSize="small" /> },
  failed: { label: 'فاشل', color: 'error', icon: <Cancel fontSize="small" /> },
};

const DOC_TYPE_LABELS = {
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
  nda: 'اتفاقية سرية',
  mou: 'مذكرة تفاهم',
  other: 'أخرى',
};

const TABS = ['الكل', 'قيد الانتظار', 'مكتمل / موثّق', 'منتهي / ملغى'];
const TAB_FILTERS = [
  null,
  ['pending', 'initiated'],
  ['completed', 'verified'],
  ['expired', 'cancelled', 'failed'],
];

/* ─── KPI Card ─────────────────────────────────────────────────────────── */
function KPICard({ icon, title, value, color }) {
  return (
    <Card
      sx={{
        flex: 1,
        minWidth: 140,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
        border: `1px solid ${color}44`,
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
        <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function NafathSigningAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [detailRow, setDetailRow] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list({ limit: 200 });
      if (res.success && res.data?.rows?.length >= 0) {
        setRows(res.data.rows);
      } else {
        setRows(DEMO);
      }
    } catch {
      setRows(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── KPI counts ── */
  const counts = rows.reduce(
    (acc, r) => {
      acc.total++;
      if (['pending', 'initiated'].includes(r.status)) acc.pending++;
      else if (['completed', 'verified'].includes(r.status)) acc.completed++;
      else if (r.status === 'expired') acc.expired++;
      else if (['cancelled', 'failed'].includes(r.status)) acc.cancelled++;
      return acc;
    },
    { total: 0, pending: 0, completed: 0, expired: 0, cancelled: 0 }
  );

  /* ── Filter ── */
  const filtered = rows.filter(r => {
    const statusOk = !TAB_FILTERS[tab] || TAB_FILTERS[tab].includes(r.status);
    const searchOk =
      !search ||
      r.signerNationalId?.includes(search) ||
      r.documentId?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose?.includes(search);
    return statusOk && searchOk;
  });

  /* ── Actions ── */
  const handleRefreshStatus = async row => {
    try {
      const res = await api.status(row._id);
      if (res.success) {
        setRows(prev =>
          prev.map(r => (r._id === row._id ? { ...r, status: res.status || r.status } : r))
        );
        showSnackbar('تم تحديث الحالة', 'success');
      }
    } catch {
      showSnackbar('تعذّر تحديث الحالة', 'error');
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelLoading(true);
    try {
      const res = await api.cancel(cancelId);
      if (res.success) {
        setRows(prev => prev.map(r => (r._id === cancelId ? { ...r, status: 'cancelled' } : r)));
        showSnackbar('تم إلغاء طلب التوقيع', 'success');
      } else {
        showSnackbar(res.message || 'فشل الإلغاء', 'error');
      }
    } catch {
      showSnackbar('خطأ في الإلغاء', 'error');
    } finally {
      setCancelId(null);
      setCancelLoading(false);
    }
  };

  const handleVerify = async row => {
    try {
      const res = await api.verify(row._id);
      if (res.success) {
        showSnackbar(
          res.valid ? 'التوقيع موثّق وصالح ✓' : 'التوقيع غير صالح',
          res.valid ? 'success' : 'error'
        );
        setRows(prev =>
          prev.map(r =>
            r._id === row._id ? { ...r, status: res.valid ? 'verified' : r.status } : r
          )
        );
      }
    } catch {
      showSnackbar('خطأ في التحقق', 'error');
    }
  };

  const handleDetail = async row => {
    setDetailRow(row);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await api.status(row._id);
      setDetailData(res);
    } catch {
      setDetailData({ error: true });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEvidenceDownload = id => {
    const token = localStorage.getItem('token') || '';
    // Open in new tab — browser will trigger download
    const url = `${api.evidenceUrl(id)}?token=${token}`;
    window.open(url, '_blank');
  };

  const fmt = d =>
    d ? new Date(d).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }} dir="rtl">
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Fingerprint sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            إدارة توقيعات نفاذ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متابعة طلبات التوقيع الإلكتروني عبر هوية نفاذ الوطنية
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="تحديث">
          <IconButton onClick={load} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── KPI Cards ── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <KPICard
          icon={<Fingerprint fontSize="large" />}
          title="إجمالي الطلبات"
          value={counts.total}
          color="#1976d2"
        />
        <KPICard
          icon={<HourglassTop fontSize="large" />}
          title="قيد الانتظار"
          value={counts.pending}
          color="#ff9800"
        />
        <KPICard
          icon={<CheckCircle fontSize="large" />}
          title="مكتملة"
          value={counts.completed}
          color="#4caf50"
        />
        <KPICard
          icon={<ErrorOutline fontSize="large" />}
          title="منتهية"
          value={counts.expired}
          color="#9e9e9e"
        />
        <KPICard
          icon={<Cancel fontSize="large" />}
          title="ملغاة"
          value={counts.cancelled}
          color="#f44336"
        />
      </Box>

      {/* ── Search + Tabs ── */}
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ px: 2, pt: 2 }}>
          <TextField
            size="small"
            placeholder="بحث: رقم هوية، معرّف المستند، الغرض..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
            sx={{ width: 320 }}
          />
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          {TABS.map((t, i) => (
            <Tab key={i} label={t} />
          ))}
        </Tabs>
      </Paper>

      {/* ── Table ── */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ background: 'action.hover' }}>
            <TableRow>
              <TableCell>نوع المستند</TableCell>
              <TableCell>الغرض</TableCell>
              <TableCell>رقم الهوية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>النمط</TableCell>
              <TableCell>تاريخ الطلب</TableCell>
              <TableCell>تاريخ الاكتمال</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">لا توجد طلبات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(row => {
                const sc = STATUS_CONFIG[row.status] || {
                  label: row.status,
                  color: 'default',
                  icon: null,
                };
                return (
                  <TableRow
                    key={row._id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: row.status === 'pending' ? 'warning.50' : 'inherit',
                    }}
                    onClick={() => handleDetail(row)}
                  >
                    <TableCell>{DOC_TYPE_LABELS[row.documentType] || row.documentType}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.purpose || '—'}
                    </TableCell>
                    <TableCell dir="ltr">{row.signerNationalId || '—'}</TableCell>
                    <TableCell>
                      <Chip icon={sc.icon} label={sc.label} color={sc.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.mode === 'live' ? 'مباشر' : 'محاكاة'}
                        color={row.mode === 'live' ? 'primary' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{fmt(row.createdAt)}</TableCell>
                    <TableCell>{fmt(row.completedAt)}</TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <Tooltip title="تحديث الحالة">
                        <IconButton size="small" onClick={() => handleRefreshStatus(row)}>
                          <Refresh fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {['completed', 'verified'].includes(row.status) && (
                        <>
                          <Tooltip title="التحقق من التوقيع">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleVerify(row)}
                            >
                              <Verified fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تحميل حزمة الأدلة">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleEvidenceDownload(row._id)}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {['pending', 'initiated'].includes(row.status) && (
                        <Tooltip title="إلغاء الطلب">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setCancelId(row._id)}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Detail Dialog ── */}
      <Dialog
        open={!!detailRow}
        onClose={() => {
          setDetailRow(null);
          setDetailData(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Fingerprint color="primary" />
          تفاصيل طلب التوقيع
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : detailData?.error ? (
            <Alert severity="error">تعذّر تحميل التفاصيل</Alert>
          ) : (
            detailRow && (
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="نوع المستند"
                    secondary={DOC_TYPE_LABELS[detailRow.documentType] || detailRow.documentType}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="الغرض" secondary={detailRow.purpose || '—'} />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="رقم هوية الموقّع"
                    secondary={<span dir="ltr">{detailRow.signerNationalId || '—'}</span>}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="الحالة"
                    secondary={
                      <Chip
                        label={
                          STATUS_CONFIG[detailData?.status || detailRow.status]?.label ||
                          detailRow.status
                        }
                        color={
                          STATUS_CONFIG[detailData?.status || detailRow.status]?.color || 'default'
                        }
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="تاريخ الطلب" secondary={fmt(detailRow.createdAt)} />
                </ListItem>
                {detailRow.completedAt && (
                  <>
                    <Divider component="li" />
                    <ListItem>
                      <ListItemText
                        primary="تاريخ الاكتمال"
                        secondary={fmt(detailRow.completedAt)}
                      />
                    </ListItem>
                  </>
                )}
                {detailData?.randomNumber && (
                  <>
                    <Divider component="li" />
                    <ListItem>
                      <ListItemText
                        primary="الرمز العشوائي (نفاذ)"
                        secondary={<strong dir="ltr">{detailData.randomNumber}</strong>}
                      />
                    </ListItem>
                  </>
                )}
                {detailData?.valid !== undefined && (
                  <>
                    <Divider component="li" />
                    <ListItem>
                      <ListItemText
                        primary="التحقق من التوقيع"
                        secondary={
                          <Chip
                            label={detailData.valid ? 'صالح ✓' : 'غير صالح ✗'}
                            color={detailData.valid ? 'success' : 'error'}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </>
                )}
              </List>
            )
          )}
        </DialogContent>
        <DialogActions>
          {detailRow && ['completed', 'verified'].includes(detailRow.status) && (
            <Button startIcon={<Download />} onClick={() => handleEvidenceDownload(detailRow._id)}>
              تحميل الأدلة
            </Button>
          )}
          <Button
            onClick={() => {
              setDetailRow(null);
              setDetailData(null);
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Cancel Confirm Dialog ── */}
      <Dialog open={!!cancelId} onClose={() => setCancelId(null)} maxWidth="xs">
        <DialogTitle>تأكيد إلغاء الطلب</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            سيتم إلغاء طلب التوقيع نهائياً. لا يمكن التراجع عن هذه العملية.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelId(null)}>تراجع</Button>
          <Button color="error" variant="contained" onClick={handleCancel} disabled={cancelLoading}>
            {cancelLoading ? <CircularProgress size={18} /> : 'تأكيد الإلغاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
