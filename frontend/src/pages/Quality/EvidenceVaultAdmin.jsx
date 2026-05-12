/**
 * EvidenceVaultAdmin.jsx — UI for the QMS Evidence Vault.
 *
 * Backend: /api/evidence (see backend/routes/evidence.routes.js).
 *
 * What this page is for:
 *   • List + filter evidence items (type, status, source module)
 *   • Summary header (counts by status, expiring-soon badge)
 *   • Inspect a single item's full envelope (hash, retention, source)
 *   • Verify an item (re-hash check) — proves it hasn't been tampered with
 *   • Legal-hold toggle — freeze an item against retention sweeper
 *
 * Out of scope for v1:
 *   • Ingest / supersede / sign — those need file upload + signing UX
 *     beyond a simple admin page; tracked as follow-up
 *
 * Why CBAHI cares:
 *   "Show me the evidence for control X" + "show me the chain of custody"
 *   are standard audit questions. Without this UI the operator can answer
 *   the first via PDF exports but not the second (chain-of-custody lives
 *   in the verify endpoint's response).
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  CircularProgress,
  Divider,
  Alert,
  Grid,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  VerifiedUser as VerifyIcon,
  Lock as LegalHoldIcon,
  LockOpen as ReleaseIcon,
  Close as CloseIcon,
  Inventory as VaultIcon,
  Warning as ExpiryIcon,
  Upload as UploadIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const DETAIL_TITLE_ID = 'evidence-detail-title';

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function statusColor(s) {
  switch (s) {
    case 'active':
      return 'success';
    case 'expired':
      return 'error';
    case 'revoked':
      return 'default';
    case 'superseded':
      return 'warning';
    case 'on_hold':
      return 'info';
    default:
      return 'default';
  }
}

export default function EvidenceVaultAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Upload state ────────────────────────────────────────────────
  const fileRef = useRef(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: '',
    sourceModule: '',
    expiresAt: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const EMPTY_UF = { title: '', type: '', sourceModule: '', expiresAt: '' };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('title', uploadForm.title || uploadFile.name);
      if (uploadForm.type) fd.append('type', uploadForm.type);
      if (uploadForm.sourceModule) fd.append('sourceModule', uploadForm.sourceModule);
      if (uploadForm.expiresAt)
        fd.append('expiresAt', new Date(uploadForm.expiresAt).toISOString());
      await apiClient.post('/evidence/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showSnackbar('تم رفع الدليل بنجاح', 'success');
      setUploadOpen(false);
      setUploadFile(null);
      setUploadForm(EMPTY_UF);
      load();
    } catch (err) {
      setUploadError(err?.response?.data?.error || err?.message || 'تعذّر الرفع');
    } finally {
      setUploading(false);
    }
  };

  // ── Expiry buckets (for timeline) ────────────────────────────────
  const expiryBuckets = useMemo(() => {
    const now = Date.now();
    const b = { d30: [], d60: [], d90: [], d90plus: [], noExpiry: [] };
    rows.forEach(r => {
      if (r.status === 'expired' || !r.expiresAt) {
        if (!r.expiresAt) b.noExpiry.push(r);
        return;
      }
      const diff = (new Date(r.expiresAt) - now) / 86400000;
      if (diff <= 0) return; // already expired
      if (diff <= 30) b.d30.push(r);
      else if (diff <= 60) b.d60.push(r);
      else if (diff <= 90) b.d90.push(r);
      else b.d90plus.push(r);
    });
    return b;
  }, [rows]);

  // ── Reference ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiClient.get('/evidence/reference');
        if (alive) setReference(data?.data || data);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Stats + expiring (header summary) ────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, e] = await Promise.all([
          apiClient.get('/evidence/stats').catch(() => null),
          apiClient.get('/evidence/expiring', { params: { days: 30 } }).catch(() => null),
        ]);
        if (alive) {
          setStats(s?.data?.data || s?.data || null);
          setExpiring(e?.data?.data || []);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.sourceModule = filterSource;
      const { data } = await apiClient.get('/evidence', { params });
      setRows(data?.data || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل الأدلة', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterSource, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async row => {
    setDetail(null);
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const { data } = await apiClient.get(`/evidence/${row._id}`);
      setDetail(data?.data || data);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل التفاصيل', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVerify = async row => {
    try {
      const { data } = await apiClient.post(`/evidence/${row._id}/verify`);
      const ok = data?.data?.verified ?? data?.verified;
      showSnackbar(
        ok ? 'التحقق ناجح — لم يُعدَّل الدليل' : 'فشل التحقق — قد يكون الدليل تالفاً',
        ok ? 'success' : 'error'
      );
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر التحقق', 'error');
    }
  };

  const handleLegalHold = async (row, hold) => {
    try {
      if (hold) {
        await apiClient.post(`/evidence/${row._id}/legal-hold`);
        showSnackbar('تم تفعيل التجميد القانوني', 'success');
      } else {
        await apiClient.delete(`/evidence/${row._id}/legal-hold`);
        showSnackbar('تم إلغاء التجميد القانوني', 'success');
      }
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تغيير حالة التجميد', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <VaultIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            خزنة الأدلة (Evidence Vault)
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {expiring.length > 0 && (
            <Chip
              icon={<ExpiryIcon />}
              label={`${expiring.length} دليل ينتهي خلال 30 يوم`}
              color="warning"
              size="small"
            />
          )}
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => {
              setUploadForm(EMPTY_UF);
              setUploadFile(null);
              setUploadError(null);
              setUploadOpen(true);
            }}
          >
            رفع دليل جديد
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        مستودع الأدلة الرقمية مع بصمة hash + سياسات احتفاظ + chain-of-custody. مطلب CBAHI أساسي
        للإثبات أن السجلات لم تُعدَّل.
      </Typography>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {Object.entries(stats.byStatus || {}).map(([status, count]) => (
            <Grid item xs={6} md={3} key={status}>
              <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={700}>
                  {count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {status}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Expiry Timeline ─────────────────────────────────────────── */}
      {rows.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            خط زمني للانتهاء
          </Typography>
          <Stack spacing={1}>
            {[
              { label: '0 – 30 يوم', items: expiryBuckets.d30, color: '#ef4444' },
              { label: '31 – 60 يوم', items: expiryBuckets.d60, color: '#f97316' },
              { label: '61 – 90 يوم', items: expiryBuckets.d90, color: '#f59e0b' },
              { label: '90+ يوم', items: expiryBuckets.d90plus, color: '#22c55e' },
            ].map(b => {
              const total = rows.filter(r => r.expiresAt && r.status !== 'expired').length || 1;
              const pct = Math.round((b.items.length / total) * 100);
              return (
                <Stack key={b.label} direction="row" alignItems="center" spacing={1.5}>
                  <Typography
                    variant="caption"
                    sx={{ width: 110, flexShrink: 0 }}
                    color="text.secondary"
                  >
                    {b.label}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        '& .MuiLinearProgress-bar': { bgcolor: b.color },
                      }}
                    />
                  </Box>
                  <Chip
                    size="small"
                    label={b.items.length}
                    sx={{ bgcolor: b.color, color: '#fff', minWidth: 36, fontWeight: 700 }}
                  />
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="النوع"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {(reference?.types || []).map(t => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="الحالة"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {(reference?.statuses || []).map(s => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="المصدر"
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {(reference?.sourceModules || []).map(sm => (
              <MenuItem key={sm} value={sm}>
                {sm}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Chip label={`${rows.length} دليل`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول الأدلة">
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>المصدر</TableCell>
              <TableCell>تاريخ الإيداع</TableCell>
              <TableCell>تاريخ الانتهاء</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>تجميد</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} aria-label="جاري التحميل" />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    لا توجد أدلة تطابق الفلتر
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row._id} hover>
                <TableCell>{row.title || row.fileName || '—'}</TableCell>
                <TableCell>{row.type || '—'}</TableCell>
                <TableCell>{row.sourceModule || '—'}</TableCell>
                <TableCell>{fmtDate(row.depositedAt || row.createdAt)}</TableCell>
                <TableCell>{fmtDate(row.expiresAt)}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.status} color={statusColor(row.status)} />
                </TableCell>
                <TableCell>
                  {row.legalHold ? (
                    <Chip
                      size="small"
                      label="مفعّل"
                      color="info"
                      icon={<LegalHoldIcon fontSize="small" />}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="left">
                  <Tooltip title="عرض التفاصيل">
                    <IconButton
                      size="small"
                      aria-label={`عرض ${row.title || row._id}`}
                      onClick={() => openDetail(row)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تحقق من البصمة">
                    <IconButton
                      size="small"
                      aria-label={`تحقق ${row.title || row._id}`}
                      onClick={() => handleVerify(row)}
                    >
                      <VerifyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {row.legalHold ? (
                    <Tooltip title="إلغاء التجميد القانوني">
                      <IconButton
                        size="small"
                        aria-label={`إلغاء تجميد ${row.title || row._id}`}
                        onClick={() => handleLegalHold(row, false)}
                      >
                        <ReleaseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="تفعيل التجميد القانوني">
                      <IconButton
                        size="small"
                        aria-label={`تجميد ${row.title || row._id}`}
                        onClick={() => handleLegalHold(row, true)}
                      >
                        <LegalHoldIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Detail dialog ──────────────────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby={DETAIL_TITLE_ID}
      >
        <DialogTitle id={DETAIL_TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>تفاصيل الدليل</span>
            <IconButton aria-label="إغلاق" onClick={() => setDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <CircularProgress aria-label="جاري التحميل" />
            </Box>
          )}
          {!detailLoading && detail && (
            <Stack spacing={2}>
              <Typography variant="h6">{detail.title || detail.fileName}</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Chip label={detail.status} color={statusColor(detail.status)} />
                {detail.type && <Chip label={detail.type} variant="outlined" />}
                {detail.sourceModule && <Chip label={detail.sourceModule} variant="outlined" />}
                {detail.legalHold && (
                  <Chip
                    label="تجميد قانوني"
                    color="info"
                    icon={<LegalHoldIcon fontSize="small" />}
                  />
                )}
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  بصمة الـ hash
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {detail.hash || '—'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الإيداع
                  </Typography>
                  <Typography variant="body2">
                    {fmtDate(detail.depositedAt || detail.createdAt)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الانتهاء
                  </Typography>
                  <Typography variant="body2">{fmtDate(detail.expiresAt)}</Typography>
                </Box>
                {detail.retentionPolicy && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      سياسة الاحتفاظ
                    </Typography>
                    <Typography variant="body2">{detail.retentionPolicy}</Typography>
                  </Box>
                )}
              </Stack>
              {detail.standard && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    المعيار / Standard
                  </Typography>
                  <Typography variant="body2">{detail.standard}</Typography>
                </Box>
              )}
              {detail.tags && detail.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    الوسوم
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {detail.tags.map((t, i) => (
                      <Chip key={i} size="small" label={t} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
              {detail.signatures && detail.signatures.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    التوقيعات الرقمية ({detail.signatures.length})
                  </Typography>
                </Box>
              )}
              <Alert severity="info">
                للحصول على chain of custody كامل، استخدم زر "تحقق من البصمة" في الجدول.
              </Alert>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Upload dialog ──────────────────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onClose={() => !uploading && setUploadOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>رفع دليل جديد</span>
            <IconButton onClick={() => setUploadOpen(false)} disabled={uploading}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* File picker */}
            <input
              ref={fileRef}
              type="file"
              style={{ display: 'none' }}
              onChange={e => setUploadFile(e.target.files[0] || null)}
            />
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                borderStyle: 'dashed',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => fileRef.current?.click()}
            >
              {uploadFile ? (
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <FileIcon color="primary" />
                  <Typography variant="body2">{uploadFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0.5} alignItems="center">
                  <UploadIcon sx={{ fontSize: 36, color: 'action.disabled' }} />
                  <Typography variant="body2" color="text.secondary">
                    انقر لاختيار الملف
                  </Typography>
                </Stack>
              )}
            </Paper>

            <TextField
              label="العنوان (اختياري)"
              value={uploadForm.title}
              onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
              disabled={uploading}
              fullWidth
              placeholder={uploadFile?.name || ''}
            />
            <TextField
              select
              label="النوع"
              value={uploadForm.type}
              onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
              disabled={uploading}
              fullWidth
            >
              <MenuItem value="">— غير محدد —</MenuItem>
              {(reference?.types || []).map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الوحدة المصدر"
              value={uploadForm.sourceModule}
              onChange={e => setUploadForm(f => ({ ...f, sourceModule: e.target.value }))}
              disabled={uploading}
              fullWidth
              placeholder="e.g. capa, management-review, pdpl"
            />
            <TextField
              label="تاريخ الانتهاء (اختياري)"
              type="date"
              value={uploadForm.expiresAt}
              onChange={e => setUploadForm(f => ({ ...f, expiresAt: e.target.value }))}
              disabled={uploading}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            {uploadError && (
              <Alert severity="error">
                <Typography variant="body2">{uploadError}</Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
          >
            رفع
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
