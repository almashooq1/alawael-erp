/**
 * Batch CSV Issuance — إصدار شهادات بالجملة
 *
 * Three-step flow:
 *   1. Pick a template + paste/upload CSV → preview rows
 *   2. Create drafts via the existing create endpoint (loop, rate-limited client-side)
 *   3. Atomic anchor via /certificates/batch-issue → one tx hash for all rows
 *
 * CSV columns:
 *   recipient_name_ar, recipient_name_en, national_id, email, title_ar, title_en
 *   plus any template-defined `data.*` columns (e.g. data.score, data.course)
 *
 * Why client-side loop on create: keeps the change additive — no new bulk-create
 * route. Each row gets its own Idempotency-Key (timestamp + row index) so retries
 * don't duplicate. Final batch-issue is single-call so the merkle root is real.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PlayArrow as RunIcon,
  Refresh as ResetIcon,
  CheckCircle as DoneIcon,
  Error as ErrIcon,
  Description as CsvIcon,
} from '@mui/icons-material';
import { templatesService, certificatesService } from '../../services/blockchainService';
import { parseCsv, rowsToObjects, rowToCertPayload } from './csvParser';
import logger from '../../utils/logger';

const STEPS = ['اختيار القالب وتحميل البيانات', 'معاينة وإنشاء المسودات', 'تثبيت على السلسلة'];

const REQUIRED_COLS = ['recipient_name_ar', 'title_ar'];

export default function BatchIssue() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [parseError, setParseError] = useState(null);
  const [parsed, setParsed] = useState({ headers: [], objects: [] });
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createdIds, setCreatedIds] = useState([]);
  const [rowResults, setRowResults] = useState([]); // [{idx, ok, id?, error?}]
  const [anchoring, setAnchoring] = useState(false);
  const [anchorResult, setAnchorResult] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    templatesService
      .getAll()
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setTemplates(list.filter(t => t.isActive !== false));
      })
      .catch(err => logger.error('BatchIssue templates load', err));
  }, []);

  const headerCheck = useMemo(() => {
    if (parsed.headers.length === 0) return null;
    const missing = REQUIRED_COLS.filter(c => !parsed.headers.includes(c));
    return missing;
  }, [parsed.headers]);

  const onFile = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(String(ev.target?.result || ''));
    reader.readAsText(f, 'utf-8');
  };

  const parseAndPreview = () => {
    setParseError(null);
    try {
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        setParseError('الملف يحتاج صف رؤوس + صف بيانات على الأقل');
        return;
      }
      const out = rowsToObjects(rows);
      setParsed(out);
      setStep(1);
    } catch (err) {
      setParseError(err?.message || 'فشل تحليل CSV');
    }
  };

  const reset = () => {
    setStep(0);
    setCsvText('');
    setParsed({ headers: [], objects: [] });
    setCreatedIds([]);
    setRowResults([]);
    setAnchorResult(null);
    setGlobalError(null);
    setCreateProgress(0);
  };

  const createDrafts = useCallback(async () => {
    setCreating(true);
    setGlobalError(null);
    setRowResults([]);
    const results = [];
    const ids = [];
    const stamp = Date.now();
    for (let i = 0; i < parsed.objects.length; i += 1) {
      const row = parsed.objects[i];
      const payload = rowToCertPayload(row, templateId);
      try {
        const r = await certificatesService.create(payload, `batch-${stamp}-${i}`);
        const id = r?.data?._id;
        if (!id) throw new Error('no _id in response');
        ids.push(id);
        results.push({ idx: i, ok: true, id });
      } catch (err) {
        results.push({
          idx: i,
          ok: false,
          error: err?.response?.data?.error || err?.message || 'fail',
        });
      }
      setCreateProgress(Math.round(((i + 1) / parsed.objects.length) * 100));
      setRowResults([...results]);
    }
    setCreatedIds(ids);
    setCreating(false);
    if (ids.length > 0) setStep(2);
    else setGlobalError('لم يتم إنشاء أي شهادة — تحقق من الأخطاء بالجدول');
  }, [parsed.objects, templateId]);

  const anchorBatch = async () => {
    if (createdIds.length === 0) return;
    setAnchoring(true);
    setGlobalError(null);
    try {
      const r = await certificatesService.batchIssue(createdIds);
      setAnchorResult(r?.data || null);
    } catch (err) {
      setGlobalError(err?.response?.data?.error || err?.message || 'فشل التثبيت');
    } finally {
      setAnchoring(false);
    }
  };

  const okCount = rowResults.filter(r => r.ok).length;
  const failCount = rowResults.length - okCount;

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <CsvIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            إصدار شهادات بالجملة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ارفع CSV → معاينة → إنشاء مسودات → تثبيت على السلسلة في معاملة واحدة
          </Typography>
        </Box>
      </Stack>

      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {STEPS.map(s => (
          <Step key={s}>
            <StepLabel>{s}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="قالب الشهادة (اختياري)"
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
              >
                <MenuItem value="">— بدون قالب —</MenuItem>
                {templates.map(t => (
                  <MenuItem key={t._id} value={t._id}>
                    {t.name?.ar || t.name?.en || t.templateNumber}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ height: 40 }}
              >
                اختر ملف CSV
                <input type="file" hidden accept=".csv,text/csv" onChange={onFile} />
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={8}
                label="أو الصق محتوى CSV هنا"
                placeholder={`recipient_name_ar,recipient_name_en,title_ar,title_en,national_id,data.score\nعلي,Ali,إنجاز,Achievement,1234567890,92`}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12, direction: 'ltr' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 1 }}>
                الأعمدة المطلوبة: <code>recipient_name_ar</code>, <code>title_ar</code>. الأعمدة
                الاختيارية: <code>recipient_name_en</code>, <code>title_en</code>,{' '}
                <code>national_id</code>, <code>email</code>, وأي عمود يبدأ بـ <code>data.</code>{' '}
                يُحفظ في حقل البيانات الديناميكي.
              </Alert>
              {parseError && <Alert severity="error">{parseError}</Alert>}
            </Grid>
          </Grid>
          <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}>
            <Button
              startIcon={<RunIcon />}
              variant="contained"
              onClick={parseAndPreview}
              disabled={!csvText.trim()}
            >
              معاينة
            </Button>
          </Stack>
        </Paper>
      )}

      {step === 1 && (
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
            <Chip label={`${parsed.objects.length} صف`} color="primary" />
            <Chip label={`${parsed.headers.length} عمود`} variant="outlined" />
            {headerCheck && headerCheck.length > 0 && (
              <Chip color="error" label={`أعمدة مفقودة: ${headerCheck.join(', ')}`} />
            )}
            {okCount > 0 && <Chip color="success" icon={<DoneIcon />} label={`نجح: ${okCount}`} />}
            {failCount > 0 && <Chip color="error" icon={<ErrIcon />} label={`فشل: ${failCount}`} />}
          </Stack>

          {creating && (
            <LinearProgress variant="determinate" value={createProgress} sx={{ mb: 2 }} />
          )}

          <Box
            sx={{
              overflowX: 'auto',
              maxHeight: 360,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>الحالة</TableCell>
                  {parsed.headers.map(h => (
                    <TableCell key={h} sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {parsed.objects.slice(0, 50).map((row, idx) => {
                  const r = rowResults.find(x => x.idx === idx);
                  return (
                    <TableRow
                      key={idx}
                      sx={{
                        bgcolor: r?.ok ? 'success.lighter' : r?.error ? 'error.lighter' : undefined,
                      }}
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        {r?.ok && (
                          <Chip size="small" color="success" label="تم" icon={<DoneIcon />} />
                        )}
                        {r?.error && (
                          <Chip size="small" color="error" label={r.error.slice(0, 30)} />
                        )}
                        {!r && '—'}
                      </TableCell>
                      {parsed.headers.map(h => (
                        <TableCell key={h} sx={{ fontSize: 12 }}>
                          {row[h] || '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          {parsed.objects.length > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              يتم عرض أول 50 صف فقط — السحب الكامل سيُعالج كل الصفوف.
            </Typography>
          )}

          {globalError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {globalError}
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" mt={2}>
            <Button startIcon={<ResetIcon />} onClick={reset}>
              إعادة البدء
            </Button>
            <Button
              variant="contained"
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <RunIcon />}
              onClick={createDrafts}
              disabled={creating || (headerCheck?.length || 0) > 0 || parsed.objects.length === 0}
            >
              إنشاء {parsed.objects.length} مسودة
            </Button>
          </Stack>
        </Paper>
      )}

      {step === 2 && (
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Stack spacing={2}>
            <Alert severity="success">
              تم إنشاء <strong>{createdIds.length}</strong> مسودة. اضغط "تثبيت" لتثبيتها على السلسلة
              في معاملة واحدة.
            </Alert>
            {anchorResult ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'success.lighter' }}>
                <Typography variant="subtitle2" fontWeight={700} color="success.dark" gutterBottom>
                  تم التثبيت بنجاح
                </Typography>
                <Stack
                  spacing={0.5}
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    direction: 'ltr',
                    textAlign: 'left',
                  }}
                >
                  <Box>Issued: {anchorResult.issued}</Box>
                  <Box>Network: {anchorResult.anchor?.network}</Box>
                  <Box>Block #: {anchorResult.anchor?.blockNumber}</Box>
                  <Box>Tx: {anchorResult.anchor?.transactionHash}</Box>
                  <Box>Merkle Root: {anchorResult.merkleRoot}</Box>
                </Stack>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  المسودات الجاهزة للتثبيت:
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
                  {createdIds.slice(0, 30).map(id => (
                    <Chip
                      key={id}
                      label={String(id).slice(-8)}
                      size="small"
                      sx={{ fontFamily: 'monospace', fontSize: 10 }}
                    />
                  ))}
                  {createdIds.length > 30 && (
                    <Chip label={`+${createdIds.length - 30}`} size="small" variant="outlined" />
                  )}
                </Stack>
              </Paper>
            )}
            {globalError && <Alert severity="error">{globalError}</Alert>}
            <Stack direction="row" justifyContent="space-between">
              <Button startIcon={<ResetIcon />} onClick={reset}>
                دفعة جديدة
              </Button>
              {!anchorResult && (
                <Button
                  variant="contained"
                  startIcon={
                    anchoring ? <CircularProgress size={16} color="inherit" /> : <RunIcon />
                  }
                  onClick={anchorBatch}
                  disabled={anchoring}
                >
                  تثبيت على السلسلة
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
