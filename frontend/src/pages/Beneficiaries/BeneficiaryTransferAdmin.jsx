/**
 * BeneficiaryTransferAdmin.jsx — إدارة التحويلات بين الفروع (BC-02)
 *
 * Cross-branch beneficiary transfer saga: initiate, approve/reject, complete.
 * Enforces two-step handshake: sending branch initiates → receiving branch approves → complete.
 *
 * API:
 *   GET    /api/beneficiary-transfers           — list (status, fromBranch, toBranch, page)
 *   POST   /api/beneficiaries/:id/transfer      — initiate { toBranchId, transferDate, reason }
 *   POST   /api/beneficiary-transfers/:id/approve
 *   POST   /api/beneficiary-transfers/:id/reject  { reason }
 *   POST   /api/beneficiary-transfers/:id/complete
 */
'use strict';

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  CompareArrows,
  Done,
  Refresh,
  SwapHoriz,
  ThumbDown,
  ThumbUp,
} from '@mui/icons-material';
import { getToken } from '../../utils/tokenStorage';

const API = process.env.REACT_APP_API_URL || '/api';

const STATUS = {
  pending: { label: 'قيد الانتظار', color: 'warning' },
  approved: { label: 'معتمد', color: 'info' },
  completed: { label: 'مكتمل', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
};

const TABS = ['all', 'pending', 'approved', 'completed', 'rejected'];
const TAB_LABELS = {
  all: 'الكل',
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

/* ─── demo fallback ─── */
const DEMO = [
  {
    id: 't1',
    beneficiaryName: 'أحمد سالم العتيبي',
    fileNumber: '2024-001',
    fromBranch: 'الرياض',
    toBranch: 'جدة',
    status: 'pending',
    transferDate: '2025-06-10',
    reason: 'طلب الأسرة للانتقال',
    createdAt: '2025-05-20',
    requestedBy: 'نورة المديري',
  },
  {
    id: 't2',
    beneficiaryName: 'نورة محمد الحربي',
    fileNumber: '2024-002',
    fromBranch: 'جدة',
    toBranch: 'الدمام',
    status: 'approved',
    transferDate: '2025-06-01',
    reason: 'تغيير الإقامة',
    createdAt: '2025-05-15',
    requestedBy: 'هند العمري',
  },
  {
    id: 't3',
    beneficiaryName: 'خالد الدوسري',
    fileNumber: '2024-003',
    fromBranch: 'الدمام',
    toBranch: 'الرياض',
    status: 'completed',
    transferDate: '2025-05-01',
    reason: 'قرار طبي',
    createdAt: '2025-04-25',
    requestedBy: 'سالم الزهراني',
  },
  {
    id: 't4',
    beneficiaryName: 'ريم السعيد',
    fileNumber: '2024-004',
    fromBranch: 'الرياض',
    toBranch: 'أبها',
    status: 'rejected',
    transferDate: '2025-05-15',
    reason: 'بعد المسافة',
    createdAt: '2025-05-01',
    requestedBy: 'خالد العتيبي',
  },
];

const authH = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

/* ══════════════════════════════════════════════════════════════════════════ */
export default function BeneficiaryTransferAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIdx, setTabIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [actionDlg, setActionDlg] = useState(null); // { type: 'approve'|'reject'|'complete', id, name }
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/beneficiary-transfers?limit=200`, { headers: authH() });
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setRows(json.data || json.transfers || []);
    } catch {
      setRows(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── stats per status ── */
  const counts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  /* ── filter ── */
  const activeTab = TABS[tabIdx];
  const visible = rows.filter(r => {
    if (search && !r.beneficiaryName?.includes(search) && !r.fileNumber?.includes(search))
      return false;
    if (activeTab !== 'all' && r.status !== activeTab) return false;
    return true;
  });

  /* ── action handler ── */
  const handleAction = async () => {
    if (!actionDlg) return;
    setSaving(true);
    try {
      const url = `${API}/beneficiary-transfers/${actionDlg.id}/${actionDlg.type}`;
      const body = actionDlg.type === 'reject' ? JSON.stringify({ reason }) : undefined;
      const res = await fetch(url, { method: 'POST', headers: authH(), body });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || 'فشل تنفيذ العملية');
      }
      const labels = { approve: 'تم الاعتماد', reject: 'تم الرفض', complete: 'تم الإكمال' };
      setSnack({ severity: 'success', msg: labels[actionDlg.type] });
      setActionDlg(null);
      setReason('');
      await load();
    } catch (err) {
      setSnack({ severity: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════ render ══════════════════ */
  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            <CompareArrows sx={{ verticalAlign: 'middle', mr: 1 }} />
            إدارة تحويلات المستفيدين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة طلبات نقل المستفيدين بين الفروع — موافقة، رفض، إكمال
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={load} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── KPI cards ── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'قيد الانتظار', val: counts.pending || 0, color: '#f57c00', bg: '#fff3e0' },
          { label: 'معتمدة', val: counts.approved || 0, color: '#0288d1', bg: '#e1f5fe' },
          { label: 'مكتملة', val: counts.completed || 0, color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'مرفوضة', val: counts.rejected || 0, color: '#c62828', bg: '#ffebee' },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2, textAlign: 'center', background: c.bg, borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: c.color }}>
                {c.val}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {c.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {snack && (
        <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ mb: 2 }}>
          {snack.msg}
        </Alert>
      )}

      {/* ── Tabs + search ── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
        flexWrap="wrap"
        gap={1}
      >
        <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ minHeight: 36 }}>
          {TABS.map(t => (
            <Tab
              key={t}
              label={`${TAB_LABELS[t]}${counts[t] ? ` (${counts[t]})` : ''}`}
              sx={{ minHeight: 36, py: 0.5, fontSize: 13 }}
            />
          ))}
        </Tabs>
        <TextField
          placeholder="بحث بالاسم أو رقم الملف"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ width: 220 }}
        />
      </Stack>

      {/* ── Table ── */}
      {loading ? (
        <Box textAlign="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>رقم الملف</TableCell>
                <TableCell>المستفيد</TableCell>
                <TableCell>من الفرع</TableCell>
                <TableCell>
                  <SwapHoriz fontSize="small" />
                </TableCell>
                <TableCell>إلى الفرع</TableCell>
                <TableCell>تاريخ التحويل</TableCell>
                <TableCell>السبب</TableCell>
                <TableCell>طُلب بواسطة</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    لا توجد طلبات
                  </TableCell>
                </TableRow>
              )}
              {visible.map(t => {
                const sm = STATUS[t.status] || STATUS.pending;
                return (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.fileNumber}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {t.beneficiaryName}
                      </Typography>
                    </TableCell>
                    <TableCell>{t.fromBranch}</TableCell>
                    <TableCell>
                      <SwapHoriz sx={{ color: 'text.disabled' }} fontSize="small" />
                    </TableCell>
                    <TableCell>{t.toBranch}</TableCell>
                    <TableCell>{t.transferDate?.slice(0, 10)}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Tooltip title={t.reason}>
                        <span>{t.reason}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{t.requestedBy}</TableCell>
                    <TableCell align="center">
                      <Chip label={sm.label} color={sm.color} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {t.status === 'pending' && (
                          <>
                            <Tooltip title="اعتماد">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setReason('');
                                  setActionDlg({
                                    type: 'approve',
                                    id: t.id,
                                    name: t.beneficiaryName,
                                  });
                                }}
                              >
                                <ThumbUp fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setReason('');
                                  setActionDlg({
                                    type: 'reject',
                                    id: t.id,
                                    name: t.beneficiaryName,
                                  });
                                }}
                              >
                                <ThumbDown fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {t.status === 'approved' && (
                          <Tooltip title="إكمال التحويل">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setReason('');
                                setActionDlg({
                                  type: 'complete',
                                  id: t.id,
                                  name: t.beneficiaryName,
                                });
                              }}
                            >
                              <Done fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(t.status === 'completed' || t.status === 'rejected') && (
                          <CheckCircle
                            sx={{
                              color: t.status === 'completed' ? 'success.main' : 'text.disabled',
                              fontSize: 18,
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Action Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!actionDlg}
        onClose={() => !saving && setActionDlg(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {actionDlg?.type === 'approve' && `اعتماد تحويل — ${actionDlg?.name}`}
          {actionDlg?.type === 'reject' && `رفض تحويل — ${actionDlg?.name}`}
          {actionDlg?.type === 'complete' && `إكمال تحويل — ${actionDlg?.name}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {actionDlg?.type === 'reject' && (
            <TextField
              label="سبب الرفض"
              value={reason}
              onChange={e => setReason(e.target.value)}
              fullWidth
              multiline
              rows={2}
              sx={{ mt: 1 }}
            />
          )}
          {actionDlg?.type === 'complete' && (
            <Alert severity="info">سيتم نقل سجل المستفيد إلى الفرع الجديد بشكل نهائي.</Alert>
          )}
          {actionDlg?.type === 'approve' && (
            <Alert severity="success">سيتم إعلام الفرع المستقبِل لإكمال استقبال المستفيد.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDlg(null)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionDlg?.type === 'reject' ? 'error' : 'primary'}
            disabled={saving}
          >
            {saving ? <CircularProgress size={16} /> : 'تأكيد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
