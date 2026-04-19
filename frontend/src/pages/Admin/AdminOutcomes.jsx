/**
 * AdminOutcomes — /admin/outcomes page.
 *
 * Clinical outcome trajectory dashboard. Three views:
 *   • Overview: trend distribution + at-risk watchlist
 *   • Per-tool rollup table
 *   • Per-beneficiary trajectory drill-down (search by ID, see line chart)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../../services/api.client';

const TREND_LABEL = {
  improving: 'تحسُّن',
  steady: 'مستقر',
  declining: 'تراجع',
  insufficient: 'بيانات غير كافية',
};
const TREND_COLOR = {
  improving: 'success',
  steady: 'info',
  declining: 'error',
  insufficient: 'default',
};
const TREND_ICON = {
  improving: <TrendingUpIcon />,
  steady: <TrendingFlatIcon />,
  declining: <TrendingDownIcon />,
  insufficient: <HelpOutlineIcon />,
};
const INTERP_LABEL = {
  within_normal: 'طبيعي',
  borderline: 'حدّي',
  mild: 'بسيط',
  moderate: 'متوسط',
  severe: 'شديد',
  profound: 'حاد',
  not_applicable: 'لا ينطبق',
};

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

// Inline SVG line chart — avoids pulling Recharts as a dep just for this.
function TrajectoryChart({ series }) {
  if (!series || series.length === 0) return null;
  const W = 600;
  const H = 200;
  const PAD = 30;
  const minScore = 0;
  const maxScore = 100;
  const xStep = series.length > 1 ? (W - 2 * PAD) / (series.length - 1) : 0;
  const yScale = s => H - PAD - ((s - minScore) / (maxScore - minScore)) * (H - 2 * PAD);
  const points = series.map((p, i) => `${PAD + i * xStep},${yScale(p.score)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#f9fafb', borderRadius: 4 }}>
      {/* Y-axis ticks */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line
            x1={PAD}
            x2={W - PAD}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="#e5e7eb"
            strokeDasharray="2,4"
          />
          <text x={PAD - 5} y={yScale(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
            {v}
          </text>
        </g>
      ))}
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Points */}
      {series.map((p, i) => (
        <circle key={i} cx={PAD + i * xStep} cy={yScale(p.score)} r="4" fill="#0ea5e9" />
      ))}
    </svg>
  );
}

export default function AdminOutcomes() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [benefId, setBenefId] = useState('');
  const [drill, setDrill] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const { data } = await api.get('/admin/outcomes/overview');
      setOverview(data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل النظرة العامة');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const loadDrill = async () => {
    if (!benefId.trim()) return;
    setDrillLoading(true);
    try {
      const { data } = await api.get(`/admin/outcomes/beneficiary/${benefId.trim()}`);
      setDrill(data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'لم يتم العثور على المستفيد');
      setDrill(null);
    } finally {
      setDrillLoading(false);
    }
  };

  const statCards = useMemo(() => {
    if (!overview) return [];
    const counts = overview.trendCounts || {};
    return [
      {
        label: 'إجمالي المستفيدين (سنة)',
        value: overview.totalBeneficiaries || 0,
        color: 'primary.main',
      },
      { label: 'تحسُّن', value: counts.improving || 0, color: 'success.main' },
      { label: 'مستقر', value: counts.steady || 0, color: 'info.main' },
      { label: 'تراجع', value: counts.declining || 0, color: 'error.main' },
    ];
  }, [overview]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            النتائج السريرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مسار التقييمات السريرية عبر الزمن — توزيع الاتجاه السنوي + قائمة المستفيدين المعرَّضين
            للتراجع.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={loadOverview}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            component="a"
            href="/api/admin/outcomes/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير CSV
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {overviewLoading && <LinearProgress sx={{ mb: 2 }} />}

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

      {overview?.declining?.length > 0 && (
        <Paper sx={{ mb: 3, p: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1} color="error">
            مستفيدون في تراجع — {overview.declining.length}
          </Typography>
          <List dense disablePadding>
            {overview.declining.map(d => (
              <ListItem
                key={d.beneficiaryId}
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    onClick={() => {
                      setBenefId(d.beneficiaryId);
                      loadDrill();
                    }}
                  >
                    عرض المسار
                  </Button>
                }
              >
                <ListItemText
                  primary={`${d.name} ${d.beneficiaryNumber ? `(${d.beneficiaryNumber})` : ''}`}
                  secondary={`الفرق: ${d.delta} · النتيجة الحالية: ${d.latestScore} · التقييمات: ${d.assessments}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          عرض مسار مستفيد محدد
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <TextField
            size="small"
            label="معرّف المستفيد (ObjectId)"
            value={benefId}
            onChange={e => setBenefId(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={loadDrill} disabled={drillLoading}>
            عرض
          </Button>
        </Stack>

        {drillLoading && <LinearProgress />}

        {drill?.trajectory?.length > 0 && (
          <Stack spacing={2} mt={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                color={TREND_COLOR[drill.trend] || 'default'}
                icon={TREND_ICON[drill.trend] || undefined}
                label={`الاتجاه: ${TREND_LABEL[drill.trend] || drill.trend}`}
              />
              {drill.comparison && (
                <Chip
                  variant="outlined"
                  label={`التغيُّر: ${drill.comparison.delta > 0 ? '+' : ''}${drill.comparison.delta} (${drill.comparison.percentChange ?? '—'}%) خلال ${drill.comparison.daysBetween} يوم`}
                />
              )}
            </Stack>

            <Box>
              <TrajectoryChart series={drill.trajectory} />
            </Box>

            {drill.milestones?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  مراحل بارزة
                </Typography>
                <List dense disablePadding>
                  {drill.milestones.map(m => (
                    <ListItem key={m.interpretation} disableGutters>
                      <ListItemText
                        primary={`أوّل ${INTERP_LABEL[m.interpretation] || m.interpretation}: ${formatDate(m.firstAchievedAt)}`}
                        secondary={`النتيجة: ${m.score}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الأداة</TableCell>
                    <TableCell align="right">النتيجة</TableCell>
                    <TableCell align="right">التغيُّر</TableCell>
                    <TableCell>التفسير</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drill.trajectory.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell>{p.tool}</TableCell>
                      <TableCell align="right">{p.score}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            p.delta > 0
                              ? 'success.main'
                              : p.delta < 0
                                ? 'error.main'
                                : 'text.secondary',
                        }}
                      >
                        {p.delta > 0 ? '+' : ''}
                        {p.delta}
                      </TableCell>
                      <TableCell>
                        {INTERP_LABEL[p.interpretation] || p.interpretation || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        {drill && drill.trajectory?.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            لا توجد تقييمات سريرية لهذا المستفيد بعد.
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
