/**
 * AdminIncidentsAnalytics — /admin/incidents-analytics page.
 * Safety / CBAHI / patient-safety view of incident pipeline.
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../../services/api.client';

const SEV_COLORS = { CRITICAL: 'error', HIGH: 'warning', MEDIUM: 'info', LOW: 'default' };
const STATUS_COLORS = {
  REPORTED: 'default',
  ACKNOWLEDGED: 'info',
  INVESTIGATING: 'primary',
  IDENTIFIED: 'primary',
  IN_RESOLUTION: 'warning',
  RESOLVED: 'success',
  CLOSED: 'success',
  REOPENED: 'error',
};

function hoursText(h) {
  if (h == null) return '—';
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function TrendChart({ months }) {
  if (!months || months.length === 0) {
    return (
      <Typography color="text.secondary" py={4} textAlign="center">
        لا توجد بيانات
      </Typography>
    );
  }
  const max = Math.max(...months.map(m => m.reported), 1);
  const width = 600;
  const height = 180;
  const barW = Math.min(35, (width - 40) / months.length / 2 - 2);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 30}`} preserveAspectRatio="xMidYMid meet">
      {months.map((m, i) => {
        const x = 30 + i * ((width - 40) / months.length);
        const totalH = (m.reported / max) * height;
        const resolvedH = (m.resolved / max) * height;
        return (
          <g key={m.month}>
            <rect x={x} y={height - totalH} width={barW} height={totalH} fill="#ef5350">
              <title>{`${m.month}: ${m.reported} مُبلّغ`}</title>
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

export default function AdminIncidentsAnalytics() {
  const [overview, setOverview] = useState(null);
  const [bySev, setBySev] = useState([]);
  const [byCat, setByCat] = useState([]);
  const [roots, setRoots] = useState([]);
  const [trend, setTrend] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, sv, cat, rc, tr, bl] = await Promise.all([
        api.get('/admin/incidents-analytics/overview'),
        api.get('/admin/incidents-analytics/by-severity'),
        api.get('/admin/incidents-analytics/by-category'),
        api.get('/admin/incidents-analytics/root-causes?limit=10'),
        api.get('/admin/incidents-analytics/trend?months=12'),
        api.get('/admin/incidents-analytics/backlog?limit=25'),
      ]);
      setOverview(ov.data || null);
      setBySev(sv.data?.items || []);
      setByCat(cat.data?.items || []);
      setRoots(rc.data?.items || []);
      setTrend(tr.data?.months || []);
      setBacklog(bl.data?.items || []);
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
  const surge = overview?.surge || {};
  const slaBreachCount = overview?.slaBreachCount || 0;
  const thresholds = overview?.thresholds || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تحليلات الحوادث والسلامة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراقبة سلامة المستفيدين + اعتماد CBAHI: الحوادث، MTTR، الأسباب الجذرية، وخرق SLA — لفريق
            الجودة وضابط السلامة.
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
            href="/api/admin/incidents-analytics/export.csv"
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

      {summary.bySeverity?.CRITICAL > 0 && summary.open > 0 && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          {summary.bySeverity.CRITICAL} حادثة حرجة — تحتاج استجابة خلال {thresholds.sla?.CRITICAL}{' '}
          ساعة من الإبلاغ
        </Alert>
      )}

      {surge.active && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: ارتفاع الحوادث هذا الشهر {surge.jumpPct}% — من {surge.prior} إلى {surge.current}،
          تجاوز العتبة {surge.threshold}%
        </Alert>
      )}

      {summary.regulatoryCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summary.regulatoryCount} حادثة تمسّ الجهة التنظيمية — تتطلّب إبلاغاً رسمياً
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                حرجة
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {summary.bySeverity?.CRITICAL || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                SLA {thresholds.sla?.CRITICAL || 4}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                مفتوح
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {summary.open || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                خرج SLA: {slaBreachCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                متوسط وقت الحل
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {hoursText(summary.avgTtrHours)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                من {summary.resolved || 0} حادثة محلولة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                الإجمالي
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {summary.total || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                معدل الحل {summary.resolutionRate != null ? `${summary.resolutionRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          الاتجاه الشهري — أحمر = مُبلّغ، أخضر = محلول
        </Typography>
        <TrendChart months={trend} />
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label={`SLA بالأولوية (${bySev.length})`} />
          <Tab label={`القائمة المعلّقة (${backlog.length})`} />
          <Tab label={`الأسباب الجذرية (${roots.length})`} />
          <Tab label={`حسب الفئة (${byCat.length})`} />
        </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الأولوية</TableCell>
                  <TableCell align="right">الإجمالي</TableCell>
                  <TableCell align="right">محلول</TableCell>
                  <TableCell align="right">MTTR</TableCell>
                  <TableCell align="right">SLA</TableCell>
                  <TableCell align="center">ضمن SLA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bySev.map(r => (
                  <TableRow key={r.severity} hover>
                    <TableCell>
                      <Chip label={r.severity} color={SEV_COLORS[r.severity]} size="small" />
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {r.resolved}
                    </TableCell>
                    <TableCell align="right">{hoursText(r.avgTtrHours)}</TableCell>
                    <TableCell align="right">{r.slaHours}h</TableCell>
                    <TableCell align="center">
                      {r.slaMet == null ? (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      ) : r.slaMet ? (
                        <Chip label="✓" color="success" size="small" />
                      ) : (
                        <Chip label="✗" color="error" size="small" />
                      )}
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
                  <TableCell>رقم الحادثة</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell align="center">الأولوية</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="right">عمر</TableCell>
                  <TableCell align="right">تجاوز SLA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backlog.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="success.main" py={2}>
                        لا حوادث معلّقة — ممتاز
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {backlog.map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.incidentNumber || r._id?.toString().slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                        {r.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.category}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={r.severity} color={SEV_COLORS[r.severity]} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={r.status}
                        color={STATUS_COLORS[r.status] || 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{hoursText(r.ageHours)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        color: r.overSla ? 'error.main' : 'text.secondary',
                      }}
                    >
                      {r.overSla ? `+${hoursText(r.breachedBy)}` : 'ضمن SLA'}
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
                  <TableCell>السبب الجذري</TableCell>
                  <TableCell align="right">التكرار</TableCell>
                  <TableCell align="right">حلول دائمة</TableCell>
                  <TableCell align="right">نسبة الحل الدائم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roots.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" py={2}>
                        لا توجد أسباب مُحدّدة بعد
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {roots.map(r => (
                  <TableRow key={r.rootCause} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {r.rootCause}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.count}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {r.permanentFixes}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        color:
                          r.permanentFixRate == null
                            ? 'text.secondary'
                            : r.permanentFixRate >= 70
                              ? 'success.main'
                              : r.permanentFixRate < 30
                                ? 'error.main'
                                : 'warning.main',
                      }}
                    >
                      {r.permanentFixRate != null ? `${r.permanentFixRate}%` : '—'}
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
                  <TableCell>الفئة</TableCell>
                  <TableCell align="right">الإجمالي</TableCell>
                  <TableCell align="right">مفتوح</TableCell>
                  <TableCell align="right">حرج</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byCat.map(r => (
                  <TableRow key={r.category} hover>
                    <TableCell>
                      <Typography variant="caption" fontWeight={500}>
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
