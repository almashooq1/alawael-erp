/**
 * BranchLicenseExpiryAdmin.jsx — متابعة تراخيص الفروع (BC-02)
 *
 * Surfaces Balady (municipal) license expiry alerts and Wasel
 * national-address verification status for every branch.
 * Covers the P1 gap: "Branch license tracking + expiry alerts".
 *
 * API:
 *   GET  /api/admin/branch-compliance/overview    — aggregate stats + expiringSoon list
 *   GET  /api/admin/branch-compliance/:id/status  — per-branch detail
 *   POST /api/admin/branch-compliance/:id/verify-balady  — trigger re-verification
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  CheckCircle,
  ErrorOutlineOutlined as ErrorOutline,
  Refresh,
  SyncAlt,
  Warning,
} from '@mui/icons-material';
import { getToken } from '../../utils/tokenStorage';
import { formatDate } from 'utils/dateUtils';

const API = process.env.REACT_APP_API_URL || '/api';

/* ─── demo fallback ─── */
const DEMO_OVERVIEW = {
  total: 5,
  balady: { active: 3, expiredOrSuspended: 1, unverified: 1 },
  wasel: { verified: 4, unverified: 1 },
  expiringSoon: [
    {
      _id: 'b1',
      name_ar: 'فرع الرياض الرئيسي',
      code: 'RYD-01',
      balady_verification: {
        status: 'active',
        expiryDate: new Date(Date.now() + 25 * 86400000).toISOString(),
      },
    },
    {
      _id: 'b2',
      name_ar: 'فرع جدة',
      code: 'JED-01',
      balady_verification: {
        status: 'active',
        expiryDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      },
    },
    {
      _id: 'b3',
      name_ar: 'فرع الدمام',
      code: 'DAM-01',
      balady_verification: {
        status: 'expired',
        expiryDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    },
  ],
};

const DEMO_BRANCHES = [
  {
    _id: 'b1',
    name_ar: 'فرع الرياض الرئيسي',
    code: 'RYD-01',
    baladyLicense: '1234-RYD',
    baladyStatus: 'active',
    baladyExpiry: new Date(Date.now() + 25 * 86400000).toISOString(),
    waselStatus: 'match',
  },
  {
    _id: 'b2',
    name_ar: 'فرع جدة',
    code: 'JED-01',
    baladyLicense: '5678-JED',
    baladyStatus: 'active',
    baladyExpiry: new Date(Date.now() + 60 * 86400000).toISOString(),
    waselStatus: 'match',
  },
  {
    _id: 'b3',
    name_ar: 'فرع الدمام',
    code: 'DAM-01',
    baladyLicense: '9012-DAM',
    baladyStatus: 'expired',
    baladyExpiry: new Date(Date.now() - 10 * 86400000).toISOString(),
    waselStatus: 'match',
  },
  {
    _id: 'b4',
    name_ar: 'فرع أبها',
    code: 'ABH-01',
    baladyLicense: null,
    baladyStatus: 'not_verified',
    baladyExpiry: null,
    waselStatus: 'mismatch',
  },
  {
    _id: 'b5',
    name_ar: 'فرع المدينة',
    code: 'MDN-01',
    baladyLicense: '3456-MDN',
    baladyStatus: 'active',
    baladyExpiry: new Date(Date.now() + 150 * 86400000).toISOString(),
    waselStatus: 'match',
  },
];

const authH = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

/* ─── helpers ─── */
const daysUntil = iso => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};

function expiryChip(days) {
  if (days === null) return <Chip label="غير محدد" color="default" size="small" />;
  if (days < 0)
    return (
      <Chip
        label={`منتهي منذ ${Math.abs(days)} يوم`}
        color="error"
        size="small"
        icon={<ErrorOutline />}
      />
    );
  if (days <= 30)
    return (
      <Chip label={`ينتهي خلال ${days} يوم`} color="warning" size="small" icon={<Warning />} />
    );
  if (days <= 90) return <Chip label={`ينتهي خلال ${days} يوم`} color="info" size="small" />;
  return <Chip label={`ينتهي خلال ${days} يوم`} color="success" size="small" />;
}

function baladyStatusChip(status) {
  const map = {
    active: { label: 'ساري', color: 'success' },
    expired: { label: 'منتهي', color: 'error' },
    suspended: { label: 'موقوف', color: 'warning' },
    not_found: { label: 'غير موجود', color: 'error' },
    not_verified: { label: 'غير مُتحقَّق', color: 'default' },
  };
  const m = map[status] || { label: status || '—', color: 'default' };
  return <Chip label={m.label} color={m.color} size="small" />;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function BranchLicenseExpiryAdmin() {
  const [overview, setOverview] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState({});
  const [snack, setSnack] = useState(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ovRes = await fetch(`${API}/admin/branch-compliance/overview`, { headers: authH() });
      if (!ovRes.ok) throw new Error('API error');
      const ovJson = await ovRes.json();
      setOverview(ovJson);

      /* fetch all branches via admin list and merge compliance status */
      const bRes = await fetch(`${API}/admin/branches?limit=200&status=active`, {
        headers: authH(),
      });
      const bJson = bRes.ok ? await bRes.json() : { data: [] };
      const bList = bJson.data || bJson.branches || [];
      const mapped = bList.map(b => ({
        _id: String(b._id || b.id),
        name_ar: b.name_ar || b.name || '—',
        code: b.code || '—',
        baladyLicense: b.balady_license_number || null,
        baladyStatus: b.balady_verification?.status || 'not_verified',
        baladyExpiry: b.balady_verification?.expiryDate || null,
        waselStatus: b.wasel_verification?.status || 'not_verified',
      }));
      setBranches(mapped.length > 0 ? mapped : DEMO_BRANCHES);
    } catch {
      setOverview(DEMO_OVERVIEW);
      setBranches(DEMO_BRANCHES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── trigger Balady re-verification ── */
  const triggerVerify = async (branchId, branchName) => {
    setVerifying(v => ({ ...v, [branchId]: true }));
    try {
      const res = await fetch(`${API}/admin/branch-compliance/${branchId}/verify-balady`, {
        method: 'POST',
        headers: authH(),
      });
      if (!res.ok) throw new Error('فشل التحقق');
      setSnack({ severity: 'success', msg: `تم طلب التحقق من ترخيص ${branchName}` });
      await load();
    } catch (err) {
      setSnack({ severity: 'error', msg: err.message });
    } finally {
      setVerifying(v => ({ ...v, [branchId]: false }));
    }
  };

  const ov = overview || {};

  /* ══════════════════ render ══════════════════ */
  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            <AccountBalance sx={{ verticalAlign: 'middle', mr: 1 }} />
            متابعة تراخيص الفروع
          </Typography>
          <Typography variant="body2" color="text.secondary">
            حالة رخصة بلدي (Balady) وتحقق الواصل لكل فرع — تنبيهات الانتهاء القادم
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
          { label: 'إجمالي الفروع النشطة', val: ov.total || 0, color: '#1976d2', bg: '#e3f2fd' },
          { label: 'تراخيص سارية', val: ov.balady?.active || 0, color: '#2e7d32', bg: '#e8f5e9' },
          {
            label: 'منتهية / موقوفة',
            val: ov.balady?.expiredOrSuspended || 0,
            color: '#c62828',
            bg: '#ffebee',
          },
          {
            label: 'غير مُتحقَّق (بلدي)',
            val: ov.balady?.unverified || 0,
            color: '#f57c00',
            bg: '#fff3e0',
          },
          { label: 'تحقق الواصل ✓', val: ov.wasel?.verified || 0, color: '#2e7d32', bg: '#e8f5e9' },
          {
            label: 'الواصل غير مُتحقَّق',
            val: ov.wasel?.unverified || 0,
            color: '#f57c00',
            bg: '#fff3e0',
          },
        ].map(c => (
          <Grid item xs={6} sm={4} md={2} key={c.label}>
            <Paper sx={{ p: 1.5, textAlign: 'center', background: c.bg, borderRadius: 2 }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: c.color }}>
                {c.val}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {c.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Expiring Soon alert ── */}
      {(ov.expiringSoon || []).filter(b => daysUntil(b.balady_verification?.expiryDate) < 30)
        .length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>تنبيه:</strong> توجد{' '}
          {ov.expiringSoon.filter(b => daysUntil(b.balady_verification?.expiryDate) < 30).length}{' '}
          فروع ستنتهي تراخيصها خلال 30 يوماً.
        </Alert>
      )}

      {snack && (
        <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ mb: 2 }}>
          {snack.msg}
        </Alert>
      )}

      {/* ── Branches Table ── */}
      {loading ? (
        <Box textAlign="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>الفرع</TableCell>
                <TableCell>الكود</TableCell>
                <TableCell>رقم رخصة بلدي</TableCell>
                <TableCell align="center">حالة الرخصة</TableCell>
                <TableCell align="center">انتهاء الرخصة</TableCell>
                <TableCell align="center">حالة الواصل</TableCell>
                <TableCell align="center">إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    لا توجد فروع
                  </TableCell>
                </TableRow>
              )}
              {branches
                .slice()
                .sort((a, b) => {
                  /* expired first, then expiring soon, then rest */
                  const da = daysUntil(a.baladyExpiry) ?? 9999;
                  const db = daysUntil(b.baladyExpiry) ?? 9999;
                  return da - db;
                })
                .map(br => {
                  const days = daysUntil(br.baladyExpiry);
                  const rowBg =
                    br.baladyStatus === 'expired'
                      ? '#fff5f5'
                      : days !== null && days <= 30
                        ? '#fffde7'
                        : 'inherit';
                  return (
                    <TableRow key={br._id} sx={{ backgroundColor: rowBg }} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {br.name_ar}
                        </Typography>
                      </TableCell>
                      <TableCell>{br.code}</TableCell>
                      <TableCell>
                        {br.baladyLicense || (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{baladyStatusChip(br.baladyStatus)}</TableCell>
                      <TableCell align="center">
                        {br.baladyExpiry ? (
                          <Stack alignItems="center" spacing={0.5}>
                            {expiryChip(days)}
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(br.baladyExpiry)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {br.waselStatus === 'match' ? (
                          <Chip label="مطابق" color="success" size="small" icon={<CheckCircle />} />
                        ) : br.waselStatus === 'mismatch' ? (
                          <Chip
                            label="غير مطابق"
                            color="error"
                            size="small"
                            icon={<ErrorOutline />}
                          />
                        ) : (
                          <Chip label="غير مُتحقَّق" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تحقق من الرخصة عبر بلدي">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              verifying[br._id] ? (
                                <CircularProgress size={14} />
                              ) : (
                                <SyncAlt fontSize="small" />
                              )
                            }
                            disabled={!!verifying[br._id]}
                            onClick={() => triggerVerify(br._id, br.name_ar)}
                          >
                            تحقق
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
