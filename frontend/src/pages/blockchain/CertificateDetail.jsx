/**
 * Certificate Detail — صفحة الشهادة
 *
 * Single-cert view + actions panel. Issue/sign/revoke/PDF/public-link/copy-hash.
 * Live integrity check (hits /verify/:hash) shown inline so admins can spot a
 * tampered or wrongly-anchored cert before sharing the QR.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Draw as SignIcon,
  CheckCircle as IssueIcon,
  Cancel as RevokeIcon,
  QrCode2 as QRIcon,
  Verified as VerifyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { certificatesService, verificationService } from '../../services/blockchainService';
import logger from '../../utils/logger';

const STATUS_COLORS = {
  draft: 'default',
  issued: 'info',
  verified: 'success',
  revoked: 'error',
  expired: 'warning',
};

const STATUS_LABELS = {
  draft: 'مسودة',
  issued: 'مصدرة',
  verified: 'موثقة',
  revoked: 'ملغاة',
  expired: 'منتهية',
};

function fmt(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-SA-u-ca-gregory');
  } catch {
    return String(d);
  }
}

function shorten(s, head = 14, tail = 8) {
  if (!s) return '—';
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function CopyableMono({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span>—</span>;
  return (
    <Tooltip title={copied ? 'تم النسخ' : 'انسخ'}>
      <Box
        component="span"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        sx={{
          fontFamily: 'monospace',
          fontSize: 12,
          direction: 'ltr',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'text.primary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        {shorten(value)}
        <CopyIcon sx={{ fontSize: 12, opacity: 0.5 }} />
      </Box>
    </Tooltip>
  );
}

export default function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [signOpen, setSignOpen] = useState(false);
  const [signForm, setSignForm] = useState({ signerName: '', signerTitle: '' });
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await certificatesService.getById(id);
      const c = r?.data || null;
      setCert(c);
      if (c?.hash) {
        try {
          const v = await verificationService.verifyByHash(c.hash);
          setVerdict(v);
        } catch (verr) {
          logger.warn('verify failed', verr);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const doIssue = async () => {
    setBusy(true);
    setError(null);
    try {
      await certificatesService.issue(id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message);
    } finally {
      setBusy(false);
    }
  };

  const doSign = async () => {
    if (!signForm.signerName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await certificatesService.sign(id, signForm);
      setSignOpen(false);
      setSignForm({ signerName: '', signerTitle: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message);
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async () => {
    setBusy(true);
    setError(null);
    try {
      await certificatesService.revoke(id, { reason: revokeReason });
      setRevokeOpen(false);
      setRevokeReason('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (!cert) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'الشهادة غير موجودة'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          عودة
        </Button>
      </Box>
    );
  }

  const _recipient = cert.recipient?.name?.ar || cert.recipient?.name?.en || '—';
  const title = cert.title?.ar || cert.title?.en || '—';
  const isDraft = cert.status === 'draft';
  const isRevoked = cert.status === 'revoked';

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {cert.certificateNumber}
            </Typography>
          </Box>
          <Chip
            label={STATUS_LABELS[cert.status] || cert.status}
            color={STATUS_COLORS[cert.status] || 'default'}
            sx={{ ml: 1 }}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<DownloadIcon />}
            component="a"
            href={certificatesService.pdfUrl(id)}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
          >
            تحميل PDF
          </Button>
          {cert.hash && (
            <Button
              startIcon={<QRIcon />}
              component="a"
              href={`/verify/${cert.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="success"
            >
              رابط التحقق
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Cert info */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
              بيانات الشهادة
            </Typography>
            <Grid container spacing={2}>
              <Field label="المستلم (عربي)" value={cert.recipient?.name?.ar} />
              <Field label="Recipient (English)" value={cert.recipient?.name?.en} />
              <Field label="الرقم الوطني" value={cert.recipient?.nationalId} mono />
              <Field label="البريد الإلكتروني" value={cert.recipient?.email} />
              <Field label="الفئة" value={cert.category} />
              <Field label="القالب" value={cert.template?.name?.ar || cert.template?.name?.en} />
              <Field label="تاريخ الإصدار" value={fmt(cert.issueDate)} />
              <Field label="تاريخ الانتهاء" value={fmt(cert.expiryDate)} />
            </Grid>

            {cert.data && Object.keys(cert.data).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  بيانات إضافية
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0 }}>
                  {Object.entries(cert.data).map(([k, v]) => (
                    <Field key={k} label={k} value={String(v)} small />
                  ))}
                </Grid>
              </>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              مرساة البلوكتشين
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1, fontSize: 13 }}>
              <Row label="Hash" value={<CopyableMono value={cert.hash} />} />
              <Row label="Previous Hash" value={<CopyableMono value={cert.previousHash} />} />
              <Row label="Merkle Root" value={<CopyableMono value={cert.merkleRoot} />} />
              <Row
                label="Tx Hash"
                value={<CopyableMono value={cert.blockchain?.transactionHash} />}
              />
              <Row label="Block #" value={cert.blockchain?.blockNumber ?? '—'} />
              <Row label="Network" value={cert.blockchain?.network || '—'} />
              <Row
                label="Contract"
                value={<CopyableMono value={cert.blockchain?.contractAddress} />}
              />
              <Row label="Gas Used" value={cert.blockchain?.gasUsed ?? '—'} />
            </Stack>
          </Paper>
        </Grid>

        {/* Actions + Verdict */}
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                الإجراءات
              </Typography>
              <Stack spacing={1}>
                <Button
                  startIcon={<IssueIcon />}
                  variant="contained"
                  fullWidth
                  disabled={!isDraft || busy}
                  onClick={doIssue}
                >
                  إصدار وتثبيت على السلسلة
                </Button>
                <Button
                  startIcon={<SignIcon />}
                  variant="outlined"
                  fullWidth
                  disabled={isDraft || isRevoked || busy}
                  onClick={() => setSignOpen(true)}
                >
                  إضافة توقيع
                </Button>
                <Button
                  startIcon={<RevokeIcon />}
                  variant="outlined"
                  color="error"
                  fullWidth
                  disabled={isRevoked || busy}
                  onClick={() => setRevokeOpen(true)}
                >
                  إلغاء الشهادة
                </Button>
              </Stack>
            </Paper>

            {verdict && (
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <VerifyIcon color={verdict.verified ? 'success' : 'error'} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    سلامة البيانات
                  </Typography>
                  <Chip
                    size="small"
                    label={verdict.verified ? 'موثوقة' : 'غير موثوقة'}
                    color={verdict.verified ? 'success' : 'error'}
                    sx={{ ml: 'auto' }}
                  />
                </Stack>
                <CheckRow ok={verdict.hashMatch} label="هاش الشهادة يطابق المحتوى" />
                <CheckRow ok={verdict.merkleMatch} label="إثبات Merkle صحيح" />
                <CheckRow ok={verdict.blockchainMatch} label="المرساة على السلسلة موجودة" />
              </Paper>
            )}

            {Array.isArray(cert.signatures) && cert.signatures.length > 0 && (
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  التواقيع ({cert.signatures.length})
                </Typography>
                <Stack spacing={1}>
                  {cert.signatures.map((s, idx) => (
                    <Box key={idx}>
                      <Typography variant="body2" fontWeight={600}>
                        {s.signerName || 'موقّع'}
                        {s.signerTitle ? ` — ${s.signerTitle}` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fmt(s.signedAt)} · <CopyableMono value={s.signature} />
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {cert.revocation?.revokedAt && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'error.main',
                  bgcolor: 'error.lighter',
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} color="error.dark" gutterBottom>
                  الإلغاء
                </Typography>
                <Typography variant="body2">السبب: {cert.revocation.reason || '—'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  في {fmt(cert.revocation.revokedAt)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Sign dialog */}
      <Dialog open={signOpen} onClose={() => !busy && setSignOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>إضافة توقيع</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="اسم الموقّع *"
              fullWidth
              size="small"
              value={signForm.signerName}
              onChange={e => setSignForm({ ...signForm, signerName: e.target.value })}
            />
            <TextField
              label="المسمى الوظيفي"
              fullWidth
              size="small"
              value={signForm.signerTitle}
              onChange={e => setSignForm({ ...signForm, signerTitle: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignOpen(false)} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={doSign}
            disabled={busy || !signForm.signerName.trim()}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <SignIcon />}
          >
            توقيع
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog
        open={revokeOpen}
        onClose={() => !busy && setRevokeOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>إلغاء الشهادة</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            الإلغاء لا يمكن التراجع عنه. الشهادة ستظهر "ملغاة" في صفحة التحقق العامة.
          </Alert>
          <TextField
            label="سبب الإلغاء"
            fullWidth
            size="small"
            multiline
            rows={2}
            value={revokeReason}
            onChange={e => setRevokeReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeOpen(false)} disabled={busy}>
            تراجع
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={doRevoke}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RevokeIcon />}
          >
            إلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Field({ label, value, mono, small }) {
  return (
    <Grid item xs={12} sm={small ? 4 : 6}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: mono ? 'monospace' : undefined,
          direction: mono ? 'ltr' : undefined,
          mt: 0.25,
        }}
      >
        {value || '—'}
      </Typography>
    </Grid>
  );
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right' }}>{value}</Box>
    </Box>
  );
}

function CheckRow({ ok, label }) {
  if (ok === null || ok === undefined) {
    return (
      <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
        <span style={{ color: '#999' }}>—</span>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.5, alignItems: 'center' }}>
      <Typography sx={{ color: ok ? 'success.main' : 'error.main', fontWeight: 700 }}>
        {ok ? '✓' : '✕'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
