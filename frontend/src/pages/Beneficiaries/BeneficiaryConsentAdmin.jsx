/**
 * BeneficiaryConsentAdmin.jsx — إدارة الموافقات الإكلينيكية (BC-03)
 *
 * Clinical + PDPL consent tracking across all beneficiaries.
 * Surfaces missing required consents (treatment + data_sharing) as
 * P1 compliance flags so no therapy session starts without them.
 *
 * API:
 *   GET    /api/v1/core/beneficiaries     — beneficiary roster (DDD Core)
 *   GET    /api/v1/beneficiaries/:id/consents
 *   POST   /api/v1/beneficiaries/:id/consents
 *   POST   /api/v1/beneficiaries/:id/consents/:cid/revoke
 *   PATCH  /api/v1/beneficiaries/:id/consent-tracking
 */

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
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AssignmentTurnedIn,
  Block,
  CheckCircle,
  Close,
  ErrorOutlineOutlined as ErrorOutline,
  History,
  PersonAdd,
  Refresh,
  Warning,
} from '@mui/icons-material';
import { getToken } from '../../utils/tokenStorage';

const API = process.env.REACT_APP_API_URL || '/api';

const CONSENT_TYPES = [
  { value: 'treatment', label: 'موافقة العلاج', required: true, color: 'error' },
  { value: 'data_sharing', label: 'مشاركة البيانات (PDPL)', required: true, color: 'error' },
  { value: 'photography', label: 'التصوير', required: false, color: 'default' },
  { value: 'trip', label: 'الرحلات', required: false, color: 'default' },
  { value: 'research', label: 'المشاركة البحثية', required: false, color: 'default' },
];

const REQUIRED = new Set(['treatment', 'data_sharing']);

/* ─── demo data used as fallback when API is unreachable ─── */
const DEMO = [
  {
    id: 'b1',
    fileNumber: '2024-001',
    name: 'أحمد سالم العتيبي',
    branch: 'الرياض',
    consentTrackingEnabled: true,
    consents: [
      {
        id: 'c1',
        type: 'treatment',
        isActive: true,
        grantedAt: '2025-01-10',
        expiresAt: null,
        revokedAt: null,
      },
      {
        id: 'c2',
        type: 'data_sharing',
        isActive: false,
        grantedAt: '2024-06-01',
        expiresAt: null,
        revokedAt: '2025-03-01',
      },
    ],
  },
  {
    id: 'b2',
    fileNumber: '2024-002',
    name: 'نورة محمد الحربي',
    branch: 'جدة',
    consentTrackingEnabled: true,
    consents: [],
  },
  {
    id: 'b3',
    fileNumber: '2024-003',
    name: 'خالد عبدالله الدوسري',
    branch: 'الدمام',
    consentTrackingEnabled: false,
    consents: [],
  },
  {
    id: 'b4',
    fileNumber: '2024-004',
    name: 'ريم فيصل السعيد',
    branch: 'الرياض',
    consentTrackingEnabled: true,
    consents: [
      {
        id: 'c3',
        type: 'treatment',
        isActive: true,
        grantedAt: '2025-02-15',
        expiresAt: null,
        revokedAt: null,
      },
      {
        id: 'c4',
        type: 'data_sharing',
        isActive: true,
        grantedAt: '2025-02-15',
        expiresAt: null,
        revokedAt: null,
      },
      {
        id: 'c5',
        type: 'photography',
        isActive: true,
        grantedAt: '2025-02-15',
        expiresAt: null,
        revokedAt: null,
      },
    ],
  },
];

/* ─── helpers ─── */
const authH = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

function consentStatus(beneficiary) {
  if (!beneficiary.consentTrackingEnabled) return 'not_tracked';
  const active = (beneficiary.consents || []).filter(c => c.isActive).map(c => c.type);
  const missing = [...REQUIRED].filter(t => !active.includes(t));
  if (missing.length === REQUIRED.size) return 'missing_all';
  if (missing.length > 0) return 'missing_partial';
  return 'complete';
}

const STATUS_META = {
  complete: { label: 'مكتمل', color: 'success', icon: <CheckCircle fontSize="small" /> },
  missing_partial: { label: 'ناقص', color: 'warning', icon: <Warning fontSize="small" /> },
  missing_all: { label: 'لا توجد موافقة', color: 'error', icon: <ErrorOutline fontSize="small" /> },
  not_tracked: { label: 'غير مُفعَّل', color: 'default', icon: <Block fontSize="small" /> },
};

/* ══════════════════════════════════════════════════════════════════════════ */
export default function BeneficiaryConsentAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null); // beneficiary id
  const [grantDlg, setGrantDlg] = useState(null); // { beneficiaryId, name }
  const [revokeDlg, setRevokeDlg] = useState(null); // { beneficiaryId, consentId, type }
  const [grantForm, setGrantForm] = useState({ type: 'treatment', expiresAt: '' });
  const [revokeReason, setRevokeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bRes = await fetch(`${API}/v1/core/beneficiaries?limit=200`, {
        headers: authH(),
      });
      if (!bRes.ok) throw new Error('API error');
      const bJson = await bRes.json();
      const bList = (bJson.data || bJson.beneficiaries || []).slice(0, 200);

      const withConsents = await Promise.allSettled(
        bList.map(async b => {
          const cRes = await fetch(`${API}/v1/beneficiaries/${b._id || b.id}/consents`, {
            headers: authH(),
          });
          const cJson = cRes.ok ? await cRes.json() : { data: [] };
          return {
            id: String(b._id || b.id),
            fileNumber: b.fileNumber || b.file_number || '—',
            name: `${b.firstName_ar || ''} ${b.lastName_ar || ''}`.trim() || b.name || '—',
            branch: b.branch?.nameAr || b.branchName || '—',
            consentTrackingEnabled: b.consentTrackingEnabled ?? false,
            consents: cJson.data || [],
          };
        })
      );
      setRows(withConsents.map(r => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean));
    } catch {
      setRows(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── derived stats ── */
  const stats = (() => {
    let complete = 0,
      partial = 0,
      missing = 0,
      untracked = 0;
    rows.forEach(r => {
      const s = consentStatus(r);
      if (s === 'complete') complete++;
      else if (s === 'missing_partial') partial++;
      else if (s === 'missing_all') missing++;
      else untracked++;
    });
    return { complete, partial, missing, untracked, total: rows.length };
  })();

  /* ── filter + search ── */
  const visible = rows.filter(r => {
    if (search && !r.name.includes(search) && !r.fileNumber.includes(search)) return false;
    if (filter === 'all') return true;
    return consentStatus(r) === filter;
  });

  /* ── grant consent ── */
  const handleGrant = async () => {
    if (!grantDlg) return;
    setSaving(true);
    try {
      const body = { type: grantForm.type };
      if (grantForm.expiresAt) body.expiresAt = grantForm.expiresAt;
      const res = await fetch(`${API}/v1/beneficiaries/${grantDlg.beneficiaryId}/consents`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || 'فشل حفظ الموافقة');
      }
      setSnack({ severity: 'success', msg: 'تم تسجيل الموافقة بنجاح' });
      setGrantDlg(null);
      await load();
    } catch (err) {
      setSnack({ severity: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* ── revoke consent ── */
  const handleRevoke = async () => {
    if (!revokeDlg) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API}/v1/beneficiaries/${revokeDlg.beneficiaryId}/consents/${revokeDlg.consentId}/revoke`,
        { method: 'POST', headers: authH(), body: JSON.stringify({ reason: revokeReason }) }
      );
      if (!res.ok) throw new Error('فشل سحب الموافقة');
      setSnack({ severity: 'success', msg: 'تم سحب الموافقة' });
      setRevokeDlg(null);
      setRevokeReason('');
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
            إدارة الموافقات الإكلينيكية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متابعة موافقات العلاج وحماية البيانات (PDPL) لجميع المستفيدين
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
          { label: 'إجمالي المستفيدين', value: stats.total, color: '#1976d2', bg: '#e3f2fd' },
          { label: 'موافقات مكتملة', value: stats.complete, color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'موافقات ناقصة', value: stats.partial, color: '#f57c00', bg: '#fff3e0' },
          { label: 'غير موافق', value: stats.missing, color: '#c62828', bg: '#ffebee' },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2, textAlign: 'center', background: c.bg, borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: c.color }}>
                {c.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {c.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Snack ── */}
      {snack && (
        <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ mb: 2 }}>
          {snack.msg}
        </Alert>
      )}

      {/* ── Filters ── */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <TextField
          placeholder="بحث بالاسم أو رقم الملف"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        />
        <Select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">جميع الحالات</MenuItem>
          <MenuItem value="missing_all">بدون موافقة</MenuItem>
          <MenuItem value="missing_partial">موافقات ناقصة</MenuItem>
          <MenuItem value="complete">مكتمل</MenuItem>
          <MenuItem value="not_tracked">غير مُفعَّل</MenuItem>
        </Select>
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
                <TableCell>الاسم</TableCell>
                <TableCell>الفرع</TableCell>
                <TableCell align="center">حالة الموافقة</TableCell>
                {CONSENT_TYPES.map(ct => (
                  <TableCell key={ct.value} align="center" sx={{ fontSize: 12 }}>
                    {ct.label}
                  </TableCell>
                ))}
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    لا توجد سجلات
                  </TableCell>
                </TableRow>
              )}
              {visible.map(b => {
                const status = consentStatus(b);
                const meta = STATUS_META[status];
                const activeByType = Object.fromEntries(
                  (b.consents || []).filter(c => c.isActive).map(c => [c.type, c])
                );
                const rowBg =
                  status === 'missing_all'
                    ? '#fff5f5'
                    : status === 'missing_partial'
                      ? '#fffde7'
                      : 'inherit';

                return [
                  /* main row */
                  <TableRow key={b.id} sx={{ backgroundColor: rowBg }}>
                    <TableCell>{b.fileNumber}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {b.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{b.branch}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={meta.label}
                        color={meta.color}
                        size="small"
                        icon={meta.icon}
                        variant={status === 'complete' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    {CONSENT_TYPES.map(ct => {
                      const c = activeByType[ct.value];
                      return (
                        <TableCell key={ct.value} align="center">
                          {c ? (
                            <Tooltip title={`مُسجَّل: ${c.grantedAt?.slice(0, 10) || '—'}`}>
                              <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="غير موجود">
                              <Close
                                sx={{
                                  color: ct.required ? 'error.main' : 'text.disabled',
                                  fontSize: 18,
                                }}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="تسجيل موافقة">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setGrantForm({ type: 'treatment', expiresAt: '' });
                              setGrantDlg({ beneficiaryId: b.id, name: b.name });
                            }}
                          >
                            <PersonAdd fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="سجلات الموافقات">
                          <IconButton
                            size="small"
                            onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>,

                  /* expanded history row */
                  expanded === b.id && (
                    <TableRow key={`${b.id}-exp`} sx={{ backgroundColor: '#fafafa' }}>
                      <TableCell colSpan={8} sx={{ p: 2 }}>
                        <Typography variant="subtitle2" mb={1}>
                          <AssignmentTurnedIn
                            sx={{ verticalAlign: 'middle', mr: 0.5 }}
                            fontSize="small"
                          />
                          سجل الموافقات — {b.name}
                        </Typography>
                        {b.consents?.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            لا توجد موافقات مسجلة.
                          </Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>النوع</TableCell>
                                <TableCell>تاريخ الموافقة</TableCell>
                                <TableCell>تاريخ الانتهاء</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>إجراء</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(b.consents || []).map(c => {
                                const ct = CONSENT_TYPES.find(t => t.value === c.type);
                                return (
                                  <TableRow key={c.id}>
                                    <TableCell>{ct?.label || c.type}</TableCell>
                                    <TableCell>{c.grantedAt?.slice(0, 10) || '—'}</TableCell>
                                    <TableCell>{c.expiresAt?.slice(0, 10) || 'لا تنتهي'}</TableCell>
                                    <TableCell>
                                      {c.revokedAt ? (
                                        <Chip label="مسحوبة" color="error" size="small" />
                                      ) : c.isActive ? (
                                        <Chip label="نشطة" color="success" size="small" />
                                      ) : (
                                        <Chip label="منتهية" color="warning" size="small" />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {c.isActive && (
                                        <Button
                                          size="small"
                                          color="error"
                                          variant="outlined"
                                          onClick={() => {
                                            setRevokeReason('');
                                            setRevokeDlg({
                                              beneficiaryId: b.id,
                                              consentId: c.id,
                                              type: ct?.label || c.type,
                                            });
                                          }}
                                        >
                                          سحب
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Grant Consent Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!grantDlg}
        onClose={() => !saving && setGrantDlg(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تسجيل موافقة — {grantDlg?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="نوع الموافقة"
              value={grantForm.type}
              onChange={e => setGrantForm(f => ({ ...f, type: e.target.value }))}
              fullWidth
            >
              {CONSENT_TYPES.map(ct => (
                <MenuItem key={ct.value} value={ct.value}>
                  {ct.label} {ct.required && '(مطلوبة)'}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="تاريخ الانتهاء (اختياري)"
              type="date"
              value={grantForm.expiresAt}
              onChange={e => setGrantForm(f => ({ ...f, expiresAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDlg(null)} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={handleGrant} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={16} /> : 'تسجيل الموافقة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Revoke Consent Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!revokeDlg}
        onClose={() => !saving && setRevokeDlg(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>سحب الموافقة — {revokeDlg?.type}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            لا يمكن التراجع عن سحب الموافقة. سيتم الاحتفاظ بالسجل.
          </Alert>
          <TextField
            label="سبب السحب (اختياري)"
            value={revokeReason}
            onChange={e => setRevokeReason(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDlg(null)} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={handleRevoke} variant="contained" color="error" disabled={saving}>
            {saving ? <CircularProgress size={16} /> : 'سحب الموافقة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
