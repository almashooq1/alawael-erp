/**
 * PdplConsentsAdmin.jsx — UI for PDPL Article 6 consent management.
 *
 * Backend: /api/pdpl/consents (see backend/routes/pdpl.routes.js).
 *
 * What this page is for:
 *   • Look up a user's consents by userId
 *   • Record a new consent (purpose + data types + optional expiry)
 *   • Withdraw an existing consent (logs the withdrawal in audit trail)
 *
 * Backend constraints:
 *   The PDPL routes don't expose a list-all endpoint — by design,
 *   consents are per-user-private. The operator workflow is "I have a
 *   user in front of me, let me see and update their consents", not
 *   "show me all 50K consents in a table".
 *
 * Why PDPL Article 6 cares:
 *   PDPL requires explicit, documented, withdrawable consent for any
 *   processing not covered by another lawful basis (vital interest,
 *   contract, legal obligation). An auditor can ask "show me consent
 *   for user X" and the operator must produce a record + the IP/UA at
 *   capture time + the withdraw history. The backend records all of
 *   that; this page surfaces it.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  CircularProgress,
  Button,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as WithdrawIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Gavel as PdplIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const TITLE_ID = 'pdpl-consent-create-title';

// PDPL standard purposes (Saudi Personal Data Protection Law).
// Operators pick from this allow-list to keep audit reports
// consistent across branches.
const STANDARD_PURPOSES = [
  'treatment_data_processing',
  'billing_data_processing',
  'marketing_communications',
  'research_participation',
  'third_party_sharing',
  'photography',
  'audio_video_recording',
  'data_export_to_insurer',
];

const STANDARD_DATA_TYPES = [
  'personal_info',
  'health_data',
  'financial_data',
  'biometric_data',
  'location_data',
  'behavioral_data',
  'communication_records',
  'imaging_records',
];

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function consentStatus(c) {
  if (c.withdrawnAt) return { label: 'مسحوبة', color: 'default' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
    return { label: 'منتهية', color: 'warning' };
  }
  return { label: 'نشطة', color: 'success' };
}

export default function PdplConsentsAdmin() {
  const { showSnackbar } = useSnackbar();
  const [userId, setUserId] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [dataTypes, setDataTypes] = useState([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const search = useCallback(
    async (uid = pendingUserId) => {
      const target = (uid || '').trim();
      if (!target) return;
      setLoading(true);
      setSearched(true);
      try {
        const { data } = await apiClient.get(`/pdpl/consents/${target}`);
        setUserId(target);
        setConsents(data?.data || []);
      } catch (err) {
        showSnackbar(err?.response?.data?.message || 'تعذّر جلب الموافقات', 'error');
        setConsents([]);
      } finally {
        setLoading(false);
      }
    },
    [pendingUserId, showSnackbar]
  );

  const handleCreate = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const payload = {
        userId,
        purpose,
        dataTypes,
      };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
      await apiClient.post('/pdpl/consents', payload);
      showSnackbar('تم تسجيل الموافقة', 'success');
      setCreateOpen(false);
      setPurpose('');
      setDataTypes([]);
      setExpiresAt('');
      search(userId);
    } catch (err) {
      setServerError(err?.response?.data?.message || err?.message || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async row => {
    if (!window.confirm(`تأكيد سحب الموافقة على ${row.purpose}؟`)) return;
    try {
      await apiClient.delete('/pdpl/consents', {
        data: { userId, purpose: row.purpose },
      });
      showSnackbar('تم سحب الموافقة', 'success');
      search(userId);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر السحب', 'error');
    }
  };

  const formInvalid = !purpose || dataTypes.length === 0;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PdplIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            إدارة الموافقات (PDPL مادة 6)
          </Typography>
        </Stack>
        {userId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setPurpose('');
              setDataTypes([]);
              setExpiresAt('');
              setServerError(null);
              setCreateOpen(true);
            }}
          >
            إضافة موافقة
          </Button>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        نظام حماية البيانات الشخصية (PDPL) السعودي يُلزم بتوثيق موافقة صريحة لكل غرض معالجة. ابحث عن
        المستخدم لرؤية سجل موافقاته وإضافة جديدة أو سحب قائمة. كل تغيير يُسجَّل في الـ audit trail
        مع IP والوقت.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="معرّف المستخدم (Mongo Id)"
            value={pendingUserId}
            onChange={e => setPendingUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            sx={{ flex: 1 }}
            placeholder="64b8a2f9c12e3a5d8e0f1234"
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => search()}
            disabled={loading || !pendingUserId.trim()}
          >
            بحث
          </Button>
        </Stack>
      </Paper>

      {searched && userId && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">موافقات المستخدم:</Typography>
            <Chip label={userId} size="small" sx={{ fontFamily: 'monospace' }} />
            <Chip label={`${consents.length} موافقة`} size="small" />
          </Stack>
        </Box>
      )}

      {searched && (
        <TableContainer component={Paper}>
          <Table size="small" aria-label="جدول الموافقات">
            <TableHead>
              <TableRow>
                <TableCell>الغرض</TableCell>
                <TableCell>أنواع البيانات</TableCell>
                <TableCell>تاريخ الموافقة</TableCell>
                <TableCell>تاريخ الانتهاء</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} aria-label="جاري التحميل" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && consents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      لا توجد موافقات مسجَّلة لهذا المستخدم
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {consents.map(row => {
                const status = consentStatus(row);
                const isActive = !row.withdrawnAt;
                return (
                  <TableRow key={row._id || `${row.purpose}-${row.createdAt}`} hover>
                    <TableCell>{row.purpose}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {(row.dataTypes || []).map((dt, i) => (
                          <Chip key={i} size="small" label={dt} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{fmtDate(row.consentedAt || row.createdAt)}</TableCell>
                    <TableCell>{fmtDate(row.expiresAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={status.label} color={status.color} />
                    </TableCell>
                    <TableCell align="left">
                      {isActive && (
                        <Tooltip title="سحب الموافقة (لا يمحو السجل)">
                          <IconButton
                            size="small"
                            aria-label={`سحب موافقة ${row.purpose}`}
                            onClick={() => handleWithdraw(row)}
                          >
                            <WithdrawIcon fontSize="small" color="error" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create dialog ──────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby={TITLE_ID}
      >
        <DialogTitle id={TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>تسجيل موافقة جديدة</span>
            <IconButton aria-label="إغلاق" onClick={() => setCreateOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                المستخدم
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {userId}
              </Typography>
            </Box>
            <Divider />
            <TextField
              select
              label="الغرض"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              required
              fullWidth
              disabled={saving}
              helperText="اختر من القائمة المعتمدة لضمان توحيد التقارير"
            >
              {STANDARD_PURPOSES.map(p => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              multiple
              options={STANDARD_DATA_TYPES}
              value={dataTypes}
              onChange={(_, v) => setDataTypes(v)}
              disabled={saving}
              renderInput={params => (
                <TextField
                  {...params}
                  label="أنواع البيانات"
                  required
                  helperText="حدّد كل أنواع البيانات المغطاة بهذه الموافقة"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
            />
            <TextField
              label="تاريخ الانتهاء (اختياري)"
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={saving}
              helperText="اتركه فارغاً للموافقة المفتوحة المدة"
            />
            <Box aria-live="polite">
              {serverError && (
                <Alert severity="error">
                  <Typography variant="body2">{serverError}</Typography>
                </Alert>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleCreate}
            disabled={saving || formInvalid}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
