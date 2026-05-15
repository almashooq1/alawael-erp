/**
 * ReportCenterPage — مركز التقارير السريرية الموحدة
 *
 * 7 تبويبات تغطي جميع مخرجات التقارير:
 *  Tab 0 — الملخص التنفيذي   (GET /report-center/executive)
 *  Tab 1 — المؤشرات السريرية (GET /report-center/clinical-kpis)
 *  Tab 2 — المستفيدون        (GET /report-center/beneficiaries)
 *  Tab 3 — الجلسات           (GET /report-center/sessions)
 *  Tab 4 — النتائج           (GET /report-center/outcomes)
 *  Tab 5 — الجودة            (GET /report-center/quality)
 *  Tab 6 — التخريج           (GET /report-center/discharge)
 *
 * مرتبط بـ: Beneficiary Core → Episodes of Care → Sessions → Outcomes
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader as _CardHeader,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
  TextField,
  LinearProgress,
  Alert,
  Avatar,
  Paper,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Person as PersonIcon,
  EventNote as SessionIcon,
  Insights as OutcomesIcon,
  Verified as QualityIcon,
  ExitToApp as DischargeIcon,
  BarChart as KPIIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { reportCenterAPI } from '../../services/ddd';

/* ── palette ──────────────────────────────────────────────────────── */
const PRIMARY = '#1a237e';
const BG = '#e8eaf6';

/* ── helpers ──────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

/* ── KPI card ─────────────────────────────────────────────────────── */
function KPICard({ label, value, sub, icon, trend, color = PRIMARY }) {
  const trendUp = trend > 0;
  return (
    <Card elevation={2} sx={{ borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={800} color={color}>
              {value ?? '—'}
            </Typography>
            {sub && (
              <Typography variant="body2" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, opacity: 0.85 }}>{icon}</Avatar>
        </Stack>
        {trend !== undefined && (
          <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
            {trendUp ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography variant="caption" color={trendUp ? 'success.main' : 'error.main'}>
              {Math.abs(trend)}٪ مقارنة بالسابق
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Section Header ───────────────────────────────────────────────── */
function SectionHeader({ title, sub }) {
  return (
    <Box mb={2}>
      <Typography variant="h6" fontWeight={700} color={PRIMARY}>
        {title}
      </Typography>
      {sub && (
        <Typography variant="body2" color="text.secondary">
          {sub}
        </Typography>
      )}
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}

/* ── useReport hook ───────────────────────────────────────────────── */
function useReport(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res.data?.data || res.data || {});
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps controlled by caller
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 0 — Executive Summary
 * ════════════════════════════════════════════════════════════════════ */
function ExecutiveTab({ dateRange }) {
  const { data, loading, error, reload } = useReport(
    () => reportCenterAPI.executive({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to]
  );

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {data && (
        <>
          <SectionHeader title="مؤشرات الأداء الرئيسية" sub="ملخص تنفيذي شامل للمنصة" />
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المستفيدين"
                value={data.totalBeneficiaries}
                icon={<PersonIcon />}
                trend={data.beneficiaryGrowth}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="الجلسات هذا الشهر"
                value={data.totalSessions}
                icon={<SessionIcon />}
                trend={data.sessionGrowth}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="الحلقات النشطة"
                value={data.activeEpisodes}
                icon={<ReportIcon />}
                color="#4a148c"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="نسبة تحقق الأهداف"
                value={data.goalAchievementRate ? `${data.goalAchievementRate}٪` : null}
                icon={<TrendingUpIcon />}
                color="#1b5e20"
              />
            </Grid>
          </Grid>

          {data.highlights && data.highlights.length > 0 && (
            <>
              <SectionHeader title="أبرز المستجدات" />
              <Stack spacing={1}>
                {data.highlights.map((h, i) => (
                  <Alert key={i} severity={h.type || 'info'} icon={false}>
                    {h.text || h}
                  </Alert>
                ))}
              </Stack>
            </>
          )}

          {!data.totalBeneficiaries && !loading && (
            <Paper sx={{ p: 5, textAlign: 'center', bgcolor: BG }}>
              <ReportIcon sx={{ fontSize: 64, color: PRIMARY, opacity: 0.3 }} />
              <Typography color="text.secondary" mt={1}>
                لا توجد بيانات للفترة المحددة
              </Typography>
              <Button startIcon={<RefreshIcon />} onClick={reload} sx={{ mt: 1 }}>
                إعادة التحميل
              </Button>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 1 — Clinical KPIs
 * ════════════════════════════════════════════════════════════════════ */
function ClinicalKPIsTab({ dateRange }) {
  const { data, loading, error } = useReport(
    () => reportCenterAPI.clinicalKPIs({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to]
  );

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {data && (
        <>
          <SectionHeader title="المؤشرات السريرية" sub="قياس الفعالية والكفاءة الإكلينيكية" />
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={4}>
              <KPICard
                label="معدل الحضور"
                value={data.attendanceRate ? `${data.attendanceRate}٪` : null}
                icon={<SessionIcon />}
                color="#0d47a1"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <KPICard
                label="متوسط مدة العلاج (يوم)"
                value={data.avgTreatmentDays}
                icon={<ReportIcon />}
                color="#4a148c"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <KPICard
                label="نسبة تحسن المقاييس"
                value={data.measuresImprovementRate ? `${data.measuresImprovementRate}٪` : null}
                icon={<TrendingUpIcon />}
                color="#1b5e20"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <KPICard
                label="عدد المقاييس المطبقة"
                value={data.measuresApplied}
                icon={<KPIIcon />}
                color="#e65100"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <KPICard
                label="نسبة إكمال الخطط"
                value={data.planCompletionRate ? `${data.planCompletionRate}٪` : null}
                icon={<QualityIcon />}
                color="#006064"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <KPICard
                label="الجلسات / مستفيد"
                value={data.avgSessionsPerBeneficiary}
                icon={<PersonIcon />}
                color="#37474f"
              />
            </Grid>
          </Grid>

          {data.kpiList && data.kpiList.length > 0 && (
            <>
              <SectionHeader title="تفاصيل المؤشرات" />
              <Table size="small">
                <TableHead sx={{ bgcolor: BG }}>
                  <TableRow>
                    <TableCell>المؤشر</TableCell>
                    <TableCell align="center">القيمة</TableCell>
                    <TableCell align="center">الهدف</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.kpiList.map((k, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{k.name}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {k.value}
                      </TableCell>
                      <TableCell align="center">{k.target}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            k.status === 'met'
                              ? 'محقق'
                              : k.status === 'warning'
                                ? 'تحذير'
                                : 'لم يتحقق'
                          }
                          color={
                            k.status === 'met'
                              ? 'success'
                              : k.status === 'warning'
                                ? 'warning'
                                : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 2 — Beneficiaries Report
 * ════════════════════════════════════════════════════════════════════ */
function BeneficiariesTab({ dateRange }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);

  const { data, loading, error } = useReport(
    () =>
      reportCenterAPI.beneficiaries({
        from: dateRange.from,
        to: dateRange.to,
        page: page + 1,
        limit: rowsPerPage,
      }),
    [dateRange.from, dateRange.to, page]
  );

  const rows = data?.data || data?.beneficiaries || [];
  const total = data?.total || 0;

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SectionHeader
        title="تقرير المستفيدين"
        sub="قائمة تفصيلية بجميع المستفيدين المنتسبين خلال الفترة"
      />

      {/* Summary KPIs */}
      {data && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="إجمالي المستفيدين"
              value={data.totalBeneficiaries || total}
              icon={<PersonIcon />}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard label="نشطون" value={data.active} icon={<QualityIcon />} color="#1b5e20" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="تحت التقييم"
              value={data.underAssessment}
              icon={<KPIIcon />}
              color="#e65100"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="مخرَّجون"
              value={data.discharged}
              icon={<DischargeIcon />}
              color="#4a148c"
            />
          </Grid>
        </Grid>
      )}

      <Table size="small">
        <TableHead sx={{ bgcolor: BG }}>
          <TableRow>
            <TableCell>الاسم</TableCell>
            <TableCell>نوع الإعاقة</TableCell>
            <TableCell align="center">الحالة</TableCell>
            <TableCell align="center">الحلقات</TableCell>
            <TableCell align="center">الجلسات</TableCell>
            <TableCell>تاريخ الانتساب</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r._id || r.id || i} hover>
              <TableCell sx={{ fontWeight: 600 }}>{r.name || r.fullName}</TableCell>
              <TableCell>{r.disabilityType}</TableCell>
              <TableCell align="center">
                <Chip
                  label={r.status}
                  size="small"
                  color={
                    r.status === 'active'
                      ? 'success'
                      : r.status === 'discharged'
                        ? 'default'
                        : 'warning'
                  }
                />
              </TableCell>
              <TableCell align="center">{r.episodeCount ?? '—'}</TableCell>
              <TableCell align="center">{r.sessionCount ?? '—'}</TableCell>
              <TableCell>
                {r.enrollmentDate ? new Date(r.enrollmentDate).toLocaleDateString('ar-SA') : '—'}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                لا توجد بيانات للفترة المحددة
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[20]}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
      />
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 3 — Sessions Report
 * ════════════════════════════════════════════════════════════════════ */
function SessionsTab({ dateRange }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);

  const { data, loading, error } = useReport(
    () =>
      reportCenterAPI.sessions({
        from: dateRange.from,
        to: dateRange.to,
        page: page + 1,
        limit: rowsPerPage,
      }),
    [dateRange.from, dateRange.to, page]
  );

  const rows = data?.sessions || data?.data || [];
  const total = data?.total || 0;

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SectionHeader
        title="تقرير الجلسات التأهيلية"
        sub="ملخص الجلسات المنفذة خلال الفترة المحددة"
      />

      {data && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="إجمالي الجلسات"
              value={data.totalSessions || total}
              icon={<SessionIcon />}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard label="مكتملة" value={data.completed} icon={<QualityIcon />} color="#1b5e20" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="ملغاة / غياب"
              value={data.cancelled}
              icon={<TrendingDownIcon />}
              color="#b71c1c"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="متوسط المدة (د)"
              value={data.avgDurationMinutes}
              icon={<KPIIcon />}
              color="#e65100"
            />
          </Grid>
        </Grid>
      )}

      <Table size="small">
        <TableHead sx={{ bgcolor: BG }}>
          <TableRow>
            <TableCell>المستفيد</TableCell>
            <TableCell>المعالج</TableCell>
            <TableCell align="center">النوع</TableCell>
            <TableCell align="center">الحالة</TableCell>
            <TableCell align="center">المدة (د)</TableCell>
            <TableCell>التاريخ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r._id || r.id || i} hover>
              <TableCell>{r.beneficiaryName || r.beneficiary?.name}</TableCell>
              <TableCell>{r.therapistName || r.therapist?.name}</TableCell>
              <TableCell align="center">{r.sessionType}</TableCell>
              <TableCell align="center">
                <Chip
                  label={r.status}
                  size="small"
                  color={
                    r.status === 'completed'
                      ? 'success'
                      : r.status === 'cancelled'
                        ? 'error'
                        : 'warning'
                  }
                />
              </TableCell>
              <TableCell align="center">{r.duration ?? r.durationMinutes ?? '—'}</TableCell>
              <TableCell>{r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '—'}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                لا توجد بيانات للفترة المحددة
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[20]}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
      />
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 4 — Outcomes Report
 * ════════════════════════════════════════════════════════════════════ */
function OutcomesTab({ dateRange }) {
  const { data, loading, error } = useReport(
    () => reportCenterAPI.outcomes({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to]
  );

  const rows = data?.outcomes || data?.data || [];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SectionHeader
        title="تقرير مخرجات التأهيل"
        sub="قياس التحسن والنتائج الوظيفية على المستفيدين"
      />

      {data && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="نسبة التحسن الكلية"
              value={data.overallImprovementRate ? `${data.overallImprovementRate}٪` : null}
              icon={<TrendingUpIcon />}
              color="#1b5e20"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="حققوا أهدافهم"
              value={data.goalAchievers}
              icon={<QualityIcon />}
              color="#0d47a1"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="متوسط تحسن المقاييس"
              value={data.avgMeasureChange}
              icon={<KPIIcon />}
              color="#4a148c"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="المخرَّجون بنجاح"
              value={data.successfulDischarges}
              icon={<DischargeIcon />}
              color="#006064"
            />
          </Grid>
        </Grid>
      )}

      {rows.length > 0 && (
        <Table size="small">
          <TableHead sx={{ bgcolor: BG }}>
            <TableRow>
              <TableCell>المستفيد</TableCell>
              <TableCell>المقياس</TableCell>
              <TableCell align="center">القبلي</TableCell>
              <TableCell align="center">البعدي</TableCell>
              <TableCell align="center">التغير</TableCell>
              <TableCell align="center">الهدف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => {
              const change = r.post - r.pre;
              return (
                <TableRow key={r._id || i} hover>
                  <TableCell>{r.beneficiaryName}</TableCell>
                  <TableCell>{r.measure || r.measureName}</TableCell>
                  <TableCell align="center">{r.pre ?? '—'}</TableCell>
                  <TableCell align="center">{r.post ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color={
                        change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'
                      }
                    >
                      {change > 0 ? `+${change}` : change}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{r.targetChange ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {rows.length === 0 && !loading && (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: BG }}>
          <OutcomesIcon sx={{ fontSize: 64, color: PRIMARY, opacity: 0.3 }} />
          <Typography color="text.secondary" mt={1}>
            لا توجد بيانات نتائج للفترة المحددة
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 5 — Quality Indicators
 * ════════════════════════════════════════════════════════════════════ */
function QualityTab({ dateRange }) {
  const { data, loading, error } = useReport(
    () => reportCenterAPI.quality({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to]
  );

  const indicators = data?.indicators || data?.data || [];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SectionHeader
        title="مؤشرات الجودة والاعتماد"
        sub="مراقبة الامتثال لمعايير الجودة المؤسسية"
      />

      {data && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="مؤشرات مستوفاة"
              value={data.metCount}
              icon={<QualityIcon />}
              color="#1b5e20"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="تحت المراجعة"
              value={data.warningCount}
              icon={<KPIIcon />}
              color="#e65100"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="غير مستوفاة"
              value={data.failCount}
              icon={<TrendingDownIcon />}
              color="#b71c1c"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="نسبة الامتثال"
              value={data.overallCompliance ? `${data.overallCompliance}٪` : null}
              icon={<QualityIcon />}
              color="#0d47a1"
            />
          </Grid>
        </Grid>
      )}

      {indicators.length > 0 && (
        <Grid container spacing={2}>
          {indicators.map((ind, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Card elevation={1}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={600}>
                      {ind.name}
                    </Typography>
                    <Chip
                      label={
                        ind.status === 'met'
                          ? 'مستوفى'
                          : ind.status === 'warning'
                            ? 'تحذير'
                            : 'غير مستوفى'
                      }
                      color={
                        ind.status === 'met'
                          ? 'success'
                          : ind.status === 'warning'
                            ? 'warning'
                            : 'error'
                      }
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {ind.description}
                  </Typography>
                  {ind.value !== undefined && (
                    <Typography variant="caption">
                      القيمة: <strong>{ind.value}</strong> / الهدف: {ind.target}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {indicators.length === 0 && !loading && (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: BG }}>
          <QualityIcon sx={{ fontSize: 64, color: PRIMARY, opacity: 0.3 }} />
          <Typography color="text.secondary" mt={1}>
            لا توجد بيانات جودة للفترة المحددة
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 6 — Discharge Report
 * ════════════════════════════════════════════════════════════════════ */
function DischargeTab({ dateRange }) {
  const { data, loading, error } = useReport(
    () => reportCenterAPI.discharge({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to]
  );

  const rows = data?.discharges || data?.data || [];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SectionHeader
        title="تقرير التخريج"
        sub="المستفيدون الذين أتموا مسارهم التأهيلي أو تم إنهاء خدمتهم"
      />

      {data && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="إجمالي التخريج"
              value={data.totalDischarges || rows.length}
              icon={<DischargeIcon />}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="تخريج ناجح"
              value={data.successfulDischarges}
              icon={<QualityIcon />}
              color="#1b5e20"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="متوسط مدة التأهيل (يوم)"
              value={data.avgLengthOfStay}
              icon={<SessionIcon />}
              color="#e65100"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KPICard
              label="رضا الأسرة"
              value={data.familySatisfactionAvg ? `${data.familySatisfactionAvg}٪` : null}
              icon={<KPIIcon />}
              color="#4a148c"
            />
          </Grid>
        </Grid>
      )}

      <Table size="small">
        <TableHead sx={{ bgcolor: BG }}>
          <TableRow>
            <TableCell>المستفيد</TableCell>
            <TableCell align="center">سبب التخريج</TableCell>
            <TableCell align="center">مدة التأهيل</TableCell>
            <TableCell align="center">نسبة الإنجاز</TableCell>
            <TableCell>تاريخ التخريج</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r._id || i} hover>
              <TableCell sx={{ fontWeight: 600 }}>
                {r.beneficiaryName || r.beneficiary?.name}
              </TableCell>
              <TableCell align="center">
                <Chip label={r.dischargeReason || r.reason || '—'} size="small" />
              </TableCell>
              <TableCell align="center">
                {r.lengthOfStayDays ? `${r.lengthOfStayDays} يوم` : '—'}
              </TableCell>
              <TableCell align="center">
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={
                    r.goalCompletionPct >= 80
                      ? 'success.main'
                      : r.goalCompletionPct >= 50
                        ? 'warning.main'
                        : 'error.main'
                  }
                >
                  {r.goalCompletionPct != null ? `${r.goalCompletionPct}٪` : '—'}
                </Typography>
              </TableCell>
              <TableCell>
                {r.dischargeDate ? new Date(r.dischargeDate).toLocaleDateString('ar-SA') : '—'}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                لا توجد تخريجات للفترة المحددة
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Root Page
 * ════════════════════════════════════════════════════════════════════ */
const TAB_CONFIG = [
  { label: 'الملخص التنفيذي', icon: <DashboardIcon /> },
  { label: 'المؤشرات السريرية', icon: <KPIIcon /> },
  { label: 'المستفيدون', icon: <PersonIcon /> },
  { label: 'الجلسات', icon: <SessionIcon /> },
  { label: 'النتائج', icon: <OutcomesIcon /> },
  { label: 'الجودة', icon: <QualityIcon /> },
  { label: 'التخريج', icon: <DischargeIcon /> },
];

export default function ReportCenterPage() {
  const [tab, setTab] = useState(0);
  const [dateRange, setDateRange] = useState({ from: monthAgo(), to: today() });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3} flexWrap="wrap">
        <Avatar sx={{ bgcolor: PRIMARY, width: 48, height: 48 }}>
          <ReportIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color={PRIMARY}>
            مركز التقارير السريرية الموحدة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تقارير تشغيلية وإكلينيكية وجودة تغطي كامل دورة الرعاية
          </Typography>
        </Box>
        {/* Date range filter — shared across all tabs */}
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }} alignItems="center">
          <TextField
            label="من"
            type="date"
            size="small"
            value={dateRange.from}
            onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={dateRange.to}
            onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />
          <Tooltip title="تصدير التقرير">
            <span>
              <IconButton size="small" disabled>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, overflowX: 'auto' }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {TAB_CONFIG.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>
      </Paper>

      {tab === 0 && <ExecutiveTab dateRange={dateRange} />}
      {tab === 1 && <ClinicalKPIsTab dateRange={dateRange} />}
      {tab === 2 && <BeneficiariesTab dateRange={dateRange} />}
      {tab === 3 && <SessionsTab dateRange={dateRange} />}
      {tab === 4 && <OutcomesTab dateRange={dateRange} />}
      {tab === 5 && <QualityTab dateRange={dateRange} />}
      {tab === 6 && <DischargeTab dateRange={dateRange} />}
    </Box>
  );
}
