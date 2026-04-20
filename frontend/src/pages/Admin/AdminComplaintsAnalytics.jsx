/**
 * AdminComplaintsAnalytics — /admin/complaints-analytics page.
 * Management view of the complaints pipeline: volume + SLA + backlog.
 */

import { useCallback, useEffect, useState } from 'react';
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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../../services/api.client';

const PRIORITY_COLORS = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const STATUS_COLORS = {
  new: 'default',
  under_review: 'info',
  in_progress: 'primary',
  escalated: 'error',
  resolved: 'success',
  closed: 'success',
  rejected: 'default',
};

function resolutionColor(rate) {
  if (rate == null) return 'text.secondary';
  if (rate >= 85) return 'success.main';
  if (rate < 60) return 'error.main';
  return 'warning.main';
}

function TrendChart({ months }) {
  if (!months || months.length === 0) {
    return (
      <Typography color="text.secondary" py={4} textAlign="center">
        لا توجد بيانات للفترة المحددة
      </Typography>
    );
  }
  const max = Math.max(...months.map(m => m.total), 1);
  const width = 600;
  const height = 180;
  const barW = Math.min(35, (width - 40) / months.length / 2 - 2);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 30}`} preserveAspectRatio="xMidYMid meet">
      {months.map((m, i) => {
        const x = 30 + i * ((width - 40) / months.length);
        const totalH = (m.total / max) * height;
        const resolvedH = (m.resolved / max) * height;
        return (
          <g key={m.month}>
            <rect x={x} y={height - totalH} width={barW} height={totalH} fill="#ef5350">
              <title>{`${m.month}: ${m.total} مجموع`}</title>
            </rect>
            <rect
              x={x + barW + 2}
              y={height - resolvedH}
              width={barW}
              height={resolvedH}
              fill="#66bb6a"
            >
              <title>{`${m.month}: ${m.resolved} محلول`}</title>
            </rect>
            <text x={x + barW} y={height + 15} fontSize="10" textAnchor="middle" fill="#666">
              {m.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminComplaintsAnalytics() {
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [bySubmitter, setBySubmitter] = useState([]);
  const [trend, setTrend] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [slaBreaches, setSlaBreaches] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, bc, bs, tr, bl, sb] = await Promise.all([
        api.get('/admin/complaints-analytics/overview'),
        api.get('/admin/complaints-analytics/by-category'),
        api.get('/admin/complaints-analytics/by-submitter'),
        api.get('/admin/complaints-analytics/trend?months=12'),
        api.get('/admin/complaints-analytics/backlog?limit=25'),
        api.get('/admin/complaints-analytics/sla-breaches'),
      ]);
      setOverview(ov.data || null);
      setByCategory(bc.data?.items || []);
      setBySubmitter(bs.data?.items || []);
      setTrend(tr.data?.months || []);
      setBacklog(bl.data?.items || []);
      setSlaBreaches(sb.data?.items || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = overview?.summary || {};
  const spike = overview?.spike || {};
  const thresholds = overview?.thresholds || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تحليلات الشكاوى والتظلمات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            حجم الشكاوى، معدل الحل، خرق اتفاقيات الخدمة (SLA)، والقائمة المعلّقة — لإدارة الجودة
            وتحسين الخدمة.
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
            href="/api/admin/complaints-analytics/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير القائمة المعلّقة
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {spike.active && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: ارتفاع الشكاوى هذا الشهر {spike.jumpPct}% — من {spike.prior} شهراً ماضياً إلى{' '}
          {spike.current} الآن، تجاوز العتبة {spike.threshold}%
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {summary.total || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                حرج: {summary.byPriority?.critical || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                مفتوح
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {summary.open || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                متأخر &gt; {thresholds.backlogDays || 14} يوم: {overview?.backlogCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                خرق SLA
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={(overview?.slaBreachCount || 0) > 0 ? 'error.main' : 'success.main'}
              >
                {overview?.slaBreachCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                حرج {thresholds.sla?.critical}س · عالي {thresholds.sla?.high}س
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                معدل الحل
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={resolutionColor(summary.resolutionRate)}
              >
                {summary.resolutionRate != null ? `${summary.resolutionRate}%` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                متوسط الحل:{' '}
                {summary.avgResolutionHours != null
                  ? `${Math.round(summary.avgResolutionHours)} ساعة`
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          الاتجاه الشهري — أحمر = مستلمة، أخضر = محلولة
        </Typography>
        <TrendChart months={trend} />
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label={`القائمة المعلّقة (${backlog.length})`} />
          <Tab label={`خرق SLA (${slaBreaches.length})`} />
          <Tab label={`حسب الفئة (${byCategory.length})`} />
          <Tab label={`حسب المُقدِّم (${bySubmitter.length})`} />
        </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم الشكوى</TableCell>
                  <TableCell>الموضوع</TableCell>
                  <TableCell align="center">الأولوية</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="right">أيام الفتح</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backlog.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="success.main" py={2}>
                        لا توجد شكاوى متأخرة — ممتاز
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {backlog.map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.complaintId || r._id?.toString().slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 300 }}>
                        {r.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.category}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={r.priority}
                        color={PRIORITY_COLORS[r.priority] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={r.status}
                        color={STATUS_COLORS[r.status] || 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {r.daysOpen}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم الشكوى</TableCell>
                  <TableCell>الموضوع</TableCell>
                  <TableCell align="center">الأولوية</TableCell>
                  <TableCell align="right">SLA</TableCell>
                  <TableCell align="right">الوقت الفعلي</TableCell>
                  <TableCell align="right">تجاوز بـ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slaBreaches.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="success.main" py={2}>
                        لا خروقات SLA — ممتاز
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {slaBreaches.slice(0, 25).map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.complaintId || r._id?.toString().slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {r.subject}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={r.priority}
                        color={PRIORITY_COLORS[r.priority] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{r.slaHours}س</TableCell>
                    <TableCell align="right">
                      {r.ageHours != null
                        ? `${Math.round(r.ageHours)}س`
                        : `${Math.round(r.resolvedInHours)}س`}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                      +{Math.round(r.breachedBy)}س
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 2 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الفئة</TableCell>
                  <TableCell align="right">إجمالي</TableCell>
                  <TableCell align="right">مفتوح</TableCell>
                  <TableCell align="right">حرج</TableCell>
                  <TableCell align="right">معدل الحل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byCategory.map(r => (
                  <TableRow key={r.category} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {r.category}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      {r.open}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                      {r.critical}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: resolutionColor(r.resolutionRate), fontWeight: 600 }}
                    >
                      {r.resolutionRate != null ? `${r.resolutionRate}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 3 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المُقدِّم</TableCell>
                  <TableCell align="right">إجمالي</TableCell>
                  <TableCell align="right">مفتوح</TableCell>
                  <TableCell align="right">محلول</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bySubmitter.map(r => (
                  <TableRow key={r.submitterType} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {r.submitterType}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      {r.open}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {r.resolved}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
