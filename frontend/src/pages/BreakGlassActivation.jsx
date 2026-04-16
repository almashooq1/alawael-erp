/**
 * Break-Glass Activation — form for emergency elevated access.
 * L2+ users also see pending co-signs below.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert as MuiAlert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
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
  Typography,
} from '@mui/material';
import { activate, coSign, listMine, listPending } from '../services/break-glass.service';

const scopeLabels = {
  clinical_read: 'قراءة إكلينيكية (طارئة)',
  financial_read: 'قراءة مالية (طارئة)',
  platform_read: 'قراءة المنصة (استكشاف)',
};

export default function BreakGlassActivation() {
  const [form, setForm] = useState({ scope: 'clinical_read', purpose: '', branchId: '' });
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(null);
  const [error, setError] = useState(null);
  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      listMine().catch(() => ({ sessions: [] })),
      listPending().catch(() => ({ sessions: [] })),
    ])
      .then(([a, b]) => {
        setMine(a.sessions || []);
        setPending(b.sessions || []);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const submit = async () => {
    setError(null);
    setActivating(true);
    try {
      const doc = await activate({
        scope: form.scope,
        purpose: form.purpose,
        branchId: form.branchId || undefined,
      });
      setActivated(doc);
      setForm({ scope: 'clinical_read', purpose: '', branchId: '' });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'فشل التفعيل');
    } finally {
      setActivating(false);
    }
  };

  const handleCoSign = async id => {
    try {
      await coSign(id, 'approved');
      load();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'فشل التوقيع الثانوي');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      <Typography variant="h4" mb={1}>
        الوصول الطارئ (Break-Glass)
      </Typography>
      <Typography color="text.secondary" mb={3}>
        لا تستخدم هذا النموذج إلا لحالات طارئة موثّقة. كل خطوة مسجَّلة ومُراجَعة.
      </Typography>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {String(error)}
        </MuiAlert>
      )}
      {activated && (
        <MuiAlert severity="success" sx={{ mb: 2 }}>
          تم التفعيل. الرقم {activated._id} · تنتهي في{' '}
          {new Date(activated.expiresAt).toLocaleString('ar-SA')}
        </MuiAlert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          تفعيل وصول طارئ
        </Typography>
        <Stack spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel id="bg-scope">النطاق</InputLabel>
            <Select
              labelId="bg-scope"
              value={form.scope}
              label="النطاق"
              onChange={e => setForm(v => ({ ...v, scope: e.target.value }))}
            >
              {Object.entries(scopeLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="السبب (10 حرف على الأقل)"
            value={form.purpose}
            onChange={e => setForm(v => ({ ...v, purpose: e.target.value }))}
            multiline
            rows={3}
            helperText="وصف الحالة بوضوح — سيُراجع خلال 24 ساعة"
          />
          <TextField
            label="معرّف الفرع (اختياري)"
            value={form.branchId}
            onChange={e => setForm(v => ({ ...v, branchId: e.target.value }))}
            size="small"
          />
          <Button
            variant="contained"
            color="error"
            onClick={submit}
            disabled={activating || form.purpose.length < 10}
          >
            {activating ? <CircularProgress size={18} /> : 'تفعيل الوصول الطارئ'}
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" mb={2}>
        الجلسات التي تتطلب توقيعاً ثانوياً
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : pending.length === 0 ? (
        <Typography color="text.secondary">لا يوجد جلسات بانتظار التوقيع ✅</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>المستخدم</TableCell>
                <TableCell>النطاق</TableCell>
                <TableCell>السبب</TableCell>
                <TableCell>تنتهي</TableCell>
                <TableCell>مهلة التوقيع</TableCell>
                <TableCell align="center">الإجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.map(s => (
                <TableRow key={s._id}>
                  <TableCell>{String(s.userId)}</TableCell>
                  <TableCell>{scopeLabels[s.scope] || s.scope}</TableCell>
                  <TableCell>{s.purpose}</TableCell>
                  <TableCell>{new Date(s.expiresAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell>{new Date(s.coSignRequiredBy).toLocaleString('ar-SA')}</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" onClick={() => handleCoSign(s._id)}>
                      توقيع ثانوي
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6" mb={2}>
        جلساتي الأخيرة
      </Typography>
      {mine.length === 0 ? (
        <Typography color="text.secondary">لا توجد جلسات سابقة</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>النطاق</TableCell>
                <TableCell>السبب</TableCell>
                <TableCell>بدء</TableCell>
                <TableCell>انتهاء</TableCell>
                <TableCell>التوقيع الثانوي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mine.map(s => (
                <TableRow key={s._id}>
                  <TableCell>{scopeLabels[s.scope] || s.scope}</TableCell>
                  <TableCell>{s.purpose}</TableCell>
                  <TableCell>{new Date(s.activatedAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell>{new Date(s.expiresAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell>
                    {s.coSignedAt ? '✅' : s.flaggedForReview ? '⚠️ متجاوز' : '⏳'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
