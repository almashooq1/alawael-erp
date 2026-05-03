/**
 * CreateClaimDialog.jsx — UI front-end for the session→NPHIES claim bridge.
 *
 * Backend contract:
 *   POST /api/admin/therapy-sessions/:id/create-claim
 *   body: { unitPrice, diagnosis: [{ code, description }], cptOverride?, dryRun? }
 *   response: { ok, claim, errors, warnings, dryRun }
 *
 * UX rules:
 *   • The user MUST enter a unit price — this is the price negotiated with
 *     the insurer for the CPT, and we don't want to ship "0" to NPHIES.
 *   • Diagnosis is optional but strongly suggested — backend will warn.
 *   • "Dry run" lets the billing user preview the draft before persisting.
 *   • Backend errors block; backend warnings are surfaced as info chips.
 *
 * Accessibility:
 *   • All inputs have associated labels (MUI TextField default).
 *   • Errors are exposed via aria-live for screen readers.
 *   • Dialog has aria-labelledby tied to title id.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  Chip,
  Box,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Close as CloseIcon,
  ReceiptLong as ReceiptIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';

const TITLE_ID = 'create-claim-dialog-title';

function emptyDiagnosis() {
  return { code: '', description: '' };
}

export default function CreateClaimDialog({ open, sessionId, sessionMeta, onClose, onCreated }) {
  const [unitPrice, setUnitPrice] = useState('');
  const [diagnosis, setDiagnosis] = useState([emptyDiagnosis()]);
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [createdClaim, setCreatedClaim] = useState(null);

  const reset = () => {
    setUnitPrice('');
    setDiagnosis([emptyDiagnosis()]);
    setDryRun(false);
    setErrors([]);
    setWarnings([]);
    setCreatedClaim(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return; // don't close mid-request
    reset();
    onClose && onClose();
  };

  const updateDiagnosis = (idx, field, value) => {
    setDiagnosis(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addDiagnosisRow = () => setDiagnosis(prev => [...prev, emptyDiagnosis()]);
  const removeDiagnosisRow = idx => setDiagnosis(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setErrors([]);
    setWarnings([]);
    setCreatedClaim(null);

    const cleanDiagnosis = diagnosis
      .map(d => ({ code: d.code.trim(), description: d.description.trim() }))
      .filter(d => d.code);

    setLoading(true);
    try {
      const { data } = await apiClient.post(`/admin/therapy-sessions/${sessionId}/create-claim`, {
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
        diagnosis: cleanDiagnosis.length ? cleanDiagnosis : undefined,
        dryRun,
      });

      if (!data.ok) {
        setErrors(data.errors || ['unknown_error']);
        setWarnings(data.warnings || []);
        return;
      }

      setCreatedClaim(data.claim);
      setWarnings(data.warnings || []);
      if (!dryRun && onCreated) onCreated(data.claim);
    } catch (err) {
      const payload = err?.response?.data;
      if (payload?.errors) {
        setErrors(payload.errors);
        setWarnings(payload.warnings || []);
      } else {
        setErrors([err?.message || 'network_error']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID} sx={{ fontWeight: 700 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ReceiptIcon color="primary" />
            <span>إنشاء مطالبة تأمينية للجلسة</span>
          </Stack>
          <IconButton aria-label="إغلاق" onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {sessionMeta && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              تفاصيل الجلسة
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {sessionMeta}
            </Typography>
          </Box>
        )}

        <Stack spacing={2}>
          <TextField
            label="السعر للوحدة (ريال)"
            type="number"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0, step: 0.01 }}
            disabled={loading}
            helperText="السعر المتفق عليه مع شركة التأمين لرمز CPT"
          />

          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">التشخيصات (ICD-10)</Typography>
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={addDiagnosisRow}
                disabled={loading}
              >
                إضافة تشخيص
              </Button>
            </Stack>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {diagnosis.map((d, idx) => (
                <Stack direction="row" spacing={1} key={idx}>
                  <TextField
                    label="الرمز"
                    value={d.code}
                    onChange={e => updateDiagnosis(idx, 'code', e.target.value)}
                    sx={{ width: 130 }}
                    disabled={loading}
                  />
                  <TextField
                    label="الوصف"
                    value={d.description}
                    onChange={e => updateDiagnosis(idx, 'description', e.target.value)}
                    fullWidth
                    disabled={loading}
                  />
                  {diagnosis.length > 1 && (
                    <IconButton
                      aria-label="حذف التشخيص"
                      onClick={() => removeDiagnosisRow(idx)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                disabled={loading}
              />
            }
            label="معاينة فقط (بدون حفظ)"
          />

          <Box aria-live="polite">
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  لا يمكن إنشاء المطالبة
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {errors.map((e, i) => (
                    <Chip key={i} label={e} size="small" color="error" />
                  ))}
                </Stack>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  تنبيهات (لا تمنع الإنشاء)
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {warnings.map((w, i) => (
                    <Chip key={i} label={w} size="small" color="warning" />
                  ))}
                </Stack>
              </Alert>
            )}

            {createdClaim && (
              <Alert severity="success">
                <Typography variant="subtitle2">
                  {dryRun ? 'تمت معاينة المطالبة' : 'تم إنشاء المطالبة'}
                </Typography>
                <Typography variant="body2">
                  رقم المطالبة: <strong>{createdClaim.claimNumber}</strong>
                  {' · '}
                  الإجمالي: <strong>{createdClaim.totalAmount} ر.س</strong>
                </Typography>
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          إغلاق
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !sessionId}
          startIcon={loading ? <CircularProgress size={16} /> : <ReceiptIcon />}
        >
          {dryRun ? 'معاينة' : 'إنشاء المطالبة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
