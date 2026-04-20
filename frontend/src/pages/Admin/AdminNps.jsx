/**
 * AdminNps — /admin/nps page.
 *
 * NPS dashboard for clinical-quality leaders. 4 sections:
 *   • Stat cards: NPS score + sample + bucket counts
 *   • Monthly trend (inline SVG bar series)
 *   • Recent detractors with comments (triage queue)
 *   • Theme word-cloud per bucket (all/detractor/promoter)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../services/api.client';

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

// Inline SVG bar chart for monthly trend.
function NpsTrendChart({ series }) {
  if (!series || series.length === 0) return null;
  const W = 700;
  const H = 200;
  const PAD = 35;
  const innerH = H - 2 * PAD;
  const barWidth = Math.min(50, (W - 2 * PAD) / Math.max(series.length, 1) - 4);
  const yScale = v => PAD + ((100 - v) / 200) * innerH; // -100..+100 → 0..innerH
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#f9fafb', borderRadius: 4 }}>
      {/* Zero line */}
      <line x1={PAD} x2={W - PAD} y1={yScale(0)} y2={yScale(0)} stroke="#9ca3af" strokeWidth="1" />
      {[100, 50, 0, -50, -100].map(v => (
        <text key={v} x={PAD - 5} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="#6b7280">
          {v}
        </text>
      ))}
      {series.map((p, i) => {
        const x = PAD + i * ((W - 2 * PAD) / Math.max(series.length, 1));
        const v = p.nps ?? 0;
        const top = v >= 0 ? yScale(v) : yScale(0);
        const h = Math.abs(yScale(v) - yScale(0));
        const fill = v >= 0 ? '#10b981' : '#ef4444';
        return (
          <g key={i}>
            <rect x={x} y={top} width={barWidth} height={h} fill={fill} opacity="0.85" />
            <text x={x + barWidth / 2} y={H - 5} textAnchor="middle" fontSize="10" fill="#6b7280">
              {p.periodKey}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminNps() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState(null);
  const [themes, setThemes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, th] = await Promise.all([
        api.get('/admin/nps/overview').then(r => r.data),
        api.get('/admin/nps/trend').then(r => r.data),
        api.get('/admin/nps/themes').then(r => r.data),
      ]);
      setOverview(ov);
      setTrend(tr);
      setThemes(th);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = useMemo(() => {
    const s = overview?.summary;
    if (!s) return [];
    return [
      {
        label: 'NPS الحالي',
        value: s.nps != null ? s.nps : '—',
        color: s.nps == null ? 'text.secondary' : s.nps >= 0 ? 'success.main' : 'error.main',
      },
      { label: 'المروِّجون', value: s.promoters || 0, color: 'success.main' },
      { label: 'المحايدون', value: s.passives || 0, color: 'info.main' },
      { label: 'المنتقدون', value: s.detractors || 0, color: 'error.main' },
    ];
  }, [overview]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            رضى العائلات (NPS)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مؤشر صافي المروِّجين عبر آخر 90 يوماً + اتجاه شهري + قائمة منتقدين للمتابعة.
          </Typography>
        </Box>
        <IconButton onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} mb={3}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {overview?.summary?.verdict === 'insufficient' && overview.summary.sample > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          العيّنة ({overview.summary.sample}) أصغر من الحد الأدنى للحكم — استمر في جمع المزيد من
          الردود قبل اعتماد الرقم.
        </Alert>
      )}

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          الاتجاه الشهري
        </Typography>
        {trend?.series?.length > 0 ? (
          <NpsTrendChart series={trend.series} />
        ) : (
          <Typography color="text.secondary">لا توجد بيانات اتجاه بعد.</Typography>
        )}
      </Paper>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', borderLeft: '4px solid', borderColor: 'error.main' }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1} color="error">
              منتقدون حديثون مع تعليقات (٢٠ الأحدث)
            </Typography>
            {overview?.recentDetractorsWithComments?.length > 0 ? (
              <List dense disablePadding>
                {overview.recentDetractorsWithComments.map(d => (
                  <ListItem key={d._id} disableGutters>
                    <ListItemText
                      primary={`النتيجة: ${d.score} · ${formatDate(d.submittedAt)}`}
                      secondary={d.comment}
                      secondaryTypographyProps={{
                        component: 'span',
                        sx: { whiteSpace: 'pre-wrap' },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" variant="body2">
                لا توجد تعليقات منتقدة حديثاً — حالة جيدة.
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              مفردات متكررة في التعليقات
            </Typography>
            {themes?.detractor?.length > 0 && (
              <Box mb={2}>
                <Typography variant="caption" color="error" fontWeight="bold">
                  من المنتقدين:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {themes.detractor.map(t => (
                    <Chip
                      key={t.word}
                      size="small"
                      color="error"
                      variant="outlined"
                      label={`${t.word} (${t.count})`}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {themes?.promoter?.length > 0 && (
              <Box>
                <Typography variant="caption" color="success.main" fontWeight="bold">
                  من المروِّجين:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {themes.promoter.map(t => (
                    <Chip
                      key={t.word}
                      size="small"
                      color="success"
                      variant="outlined"
                      label={`${t.word} (${t.count})`}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {themes && themes.detractor?.length === 0 && themes.promoter?.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                لا توجد مفردات كافية بعد.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
