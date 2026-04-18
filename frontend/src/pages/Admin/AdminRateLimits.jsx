/**
 * AdminRateLimits — /admin/rate-limits page.
 *
 * Live view of the per-provider token-bucket state for all 10 Saudi
 * government adapters. Lets ops spot a provider approaching its
 * quota or a noisy actor burning through the per-actor cap.
 *
 * Data: GET  /api/admin/gov-integrations/rate-limits  (poll every 10s)
 *       POST /api/admin/gov-integrations/rate-limits/:provider/reset
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestoreIcon from '@mui/icons-material/Restore';
import SpeedIcon from '@mui/icons-material/Speed';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import api from '../../services/api.client';

const POLL_MS = 10_000;

// Friendly Arabic labels per provider (matches AdminGovIntegrations)
const LABELS = {
  gosi: 'GOSI — التأمينات',
  scfhs: 'SCFHS — التخصصات الصحية',
  absher: 'Absher — الأحوال المدنية',
  qiwa: 'قوى — وزارة الموارد',
  nafath: 'نفاذ',
  fatoora: 'فاتورة (ZATCA)',
  muqeem: 'مقيم',
  nphies: 'NPHIES — التأمين الصحي',
  wasel: 'واصل — العناوين',
  balady: 'بلدي — التراخيص',
};

function utilColor(pct) {
  if (pct >= 90) return 'error';
  if (pct >= 70) return 'warning';
  return 'success';
}

function ProviderCard({ snap, onReset }) {
  const pct = snap.utilization ?? 0;
  const color = utilColor(pct);
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {LABELS[snap.provider] || snap.provider}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              سعة {snap.capacity} · تعبئة {snap.refillPerMinute}/د · حد الفاعل {snap.actorCap}
            </Typography>
          </Box>
          <Tooltip title="إعادة تعبئة الحد">
            <IconButton size="small" onClick={() => onReset(snap.provider)}>
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              الاستخدام
            </Typography>
            <Typography variant="caption" fontWeight={600} color={`${color}.main`}>
              {pct}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, pct)}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            icon={<SpeedIcon />}
            label={`${snap.available}/${snap.capacity} متاح`}
            color={color}
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<PeopleIcon />}
            label={`${snap.activeActors} فاعل`}
            variant="outlined"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AdminRateLimits() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async () => {
    try {
      const resp = await api.get('/admin/gov-integrations/rate-limits');
      setData(resp.data);
      setError('');
      setLastUpdate(new Date());
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'فشل تحميل حدود الاستخدام');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const onReset = useCallback(
    async provider => {
      try {
        await api.post(`/admin/gov-integrations/rate-limits/${provider}/reset`);
        load();
      } catch (e) {
        setError(e?.response?.data?.message || e.message || 'فشل إعادة التعيين');
      }
    },
    [load]
  );

  const snapshots = useMemo(() => data?.providers || [], [data]);
  const overall = data?.overall;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            حدود الاستخدام — المزودون الحكوميون
          </Typography>
          <Typography variant="body2" color="text.secondary">
            عرض مباشر لأدلوات الحصص لكل مزوّد حكومي. يتحدّث تلقائيًا كل 10 ثوانٍ.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
            </Typography>
          )}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            تحديث
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {overall && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={1} alignItems="center">
              <TrendingUpIcon color={utilColor(overall.utilization)} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  متوسط الاستخدام
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {overall.utilization}%
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={`إجمالي السعة: ${overall.totalCapacity}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`المتاح الآن: ${overall.totalAvailable}`}
              color={utilColor(overall.utilization)}
              variant="outlined"
            />
            <Chip label={`${snapshots.length} مزوّد`} variant="outlined" />
          </Stack>
        </Paper>
      )}

      <Grid container spacing={2}>
        {snapshots.map(snap => (
          <Grid key={snap.provider} item xs={12} sm={6} md={4} lg={3}>
            <ProviderCard snap={snap} onReset={onReset} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
