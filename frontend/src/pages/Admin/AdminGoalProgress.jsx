/**
 * AdminGoalProgress — /admin/goal-progress page.
 *
 * Stat cards + stalled-goals watchlist + per-goal trajectory drill-down.
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../../services/api.client';

const VERDICT_LABEL = {
  achieved: 'مُحقَّق',
  improving: 'تحسُّن',
  steady: 'مستقر',
  declining: 'تراجع',
  stalled: 'متوقف',
  insufficient: 'بيانات غير كافية',
};
const VERDICT_COLOR = {
  achieved: 'success',
  improving: 'success',
  steady: 'info',
  declining: 'error',
  stalled: 'warning',
  insufficient: 'default',
};

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

function TrajectoryChart({ series }) {
  if (!series?.length) return null;
  const W = 600,
    H = 200,
    PAD = 30;
  const xStep = series.length > 1 ? (W - 2 * PAD) / (series.length - 1) : 0;
  const yScale = v => H - PAD - (v / 100) * (H - 2 * PAD);
  const points = series.map((p, i) => `${PAD + i * xStep},${yScale(p.progressPercent)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#f9fafb', borderRadius: 4 }}>
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
      <polyline
        points={points}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {series.map((p, i) => (
        <circle key={i} cx={PAD + i * xStep} cy={yScale(p.progressPercent)} r="4" fill="#8b5cf6" />
      ))}
    </svg>
  );
}

export default function AdminGoalProgress() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [goalId, setGoalId] = useState('');
  const [drill, setDrill] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/goal-progress/overview');
      setOverview(data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDrill = async () => {
    if (!goalId.trim()) return;
    try {
      const { data } = await api.get(`/admin/goal-progress/goal/${goalId.trim()}`);
      setDrill(data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'لم يتم العثور على الهدف');
    }
  };

  const statCards = useMemo(() => {
    if (!overview) return [];
    const vc = overview.verdictCounts || {};
    return [
      {
        label: 'إجمالي المستفيدين',
        value: overview.totalBeneficiaries || 0,
        color: 'primary.main',
      },
      { label: 'مُحقَّق', value: vc.achieved || 0, color: 'success.main' },
      { label: 'تحسُّن', value: vc.improving || 0, color: 'success.main' },
      { label: 'متوقف', value: vc.stalled || 0, color: 'warning.main' },
    ];
  }, [overview]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تقدُّم أهداف الخطط العلاجية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مسار التقدُّم عبر الزمن + قائمة الأهداف المتوقفة (بلا تحديث 30 يوم).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            component="a"
            href="/api/admin/goal-progress/export.csv"
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

      {overview?.stalled?.length > 0 && (
        <Paper sx={{ mb: 3, p: 2, borderLeft: '4px solid', borderColor: 'warning.main' }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            أهداف متوقفة — {overview.stalled.length}
          </Typography>
          <List dense disablePadding>
            {overview.stalled.map(s => (
              <ListItem
                key={s.goalId}
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    onClick={() => {
                      setGoalId(s.goalId);
                      loadDrill();
                    }}
                  >
                    عرض
                  </Button>
                }
              >
                <ListItemText
                  primary={`آخر تحديث: ${formatDate(s.lastRecordedAt)} · التقدُّم: ${s.lastProgress}%`}
                  secondary={`منذ ${s.daysSinceLast} يوم · الحالة قبل التوقف: ${VERDICT_LABEL[s.verdict] || s.verdict}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          عرض مسار هدف محدد
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <TextField
            size="small"
            label="معرّف الهدف (ObjectId)"
            value={goalId}
            onChange={e => setGoalId(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={loadDrill}>
            عرض
          </Button>
        </Stack>

        {drill?.trajectory?.length > 0 && (
          <Stack spacing={2}>
            <Chip
              color={VERDICT_COLOR[drill.verdict]}
              label={`الحالة: ${VERDICT_LABEL[drill.verdict] || drill.verdict}`}
            />
            <TrajectoryChart series={drill.trajectory} />
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell align="right">النسبة</TableCell>
                    <TableCell align="right">التغيُّر</TableCell>
                    <TableCell>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drill.trajectory.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(p.recordedAt)}</TableCell>
                      <TableCell align="right">{p.progressPercent}%</TableCell>
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
                      <TableCell>{p.note || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
        {drill && drill.trajectory?.length === 0 && (
          <Alert severity="info">لا توجد تحديثات لهذا الهدف بعد.</Alert>
        )}
      </Paper>
    </Container>
  );
}
