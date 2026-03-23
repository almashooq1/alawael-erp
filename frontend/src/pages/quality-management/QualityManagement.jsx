/**
 * Quality Management Page — صفحة إدارة الجودة (ISO / CBAHI)
 * Phase 20 — تدقيق، مؤشرات جودة، تقارير اعتماد تلقائية
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  LinearProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  VerifiedUser as VerifiedUserIcon,
  FindInPage as FindInPageIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Assignment as AssignmentIcon,
  LocalHospital as LocalHospitalIcon,
} from '@mui/icons-material';
import qualityManagementService from '../../services/qualityManagementService';

/* ═══ Helper — severity chip ═══ */
const severityColor = (sev) => {
  const map = { critical: 'error', major: 'warning', minor: 'info', observation: 'default', opportunity: 'success' };
  return map[sev] || 'default';
};

const statusColor = (st) => {
  const map = {
    planned: 'info', in_progress: 'warning', completed: 'success', cancelled: 'default',
    open: 'error', root_cause_analysis: 'warning', action_planned: 'info',
    verification: 'secondary', closed: 'success', draft: 'default',
    approved: 'success', under_review: 'warning', active: 'error', mitigated: 'success',
    ready: 'success', nearly_ready: 'info', not_ready: 'error',
  };
  return map[st] || 'default';
};

const riskColor = (level) => {
  const map = { very_high: '#d32f2f', high: '#f44336', medium: '#ff9800', low: '#4caf50', very_low: '#81c784' };
  return map[level] || '#9e9e9e';
};

/* ═══ Stat Card ═══ */
const StatCard = ({ icon, title, value, color = 'primary.main', subtitle }) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" fontWeight="bold">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </CardContent>
  </Card>
);

/* ═══ Main Component ═══ */
export default function QualityManagement() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [audits, setAudits] = useState([]);
  const [findings, setFindings] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [capas, setCapas] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [risks, setRisks] = useState([]);
  const [reports, setReports] = useState([]);

  /* ── Fetch All ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, auditRes, findRes, ncRes, capaRes, indRes, docRes, riskRes, repRes] =
        await Promise.all([
          qualityManagementService.getDashboard(),
          qualityManagementService.listAudits(),
          qualityManagementService.listFindings(),
          qualityManagementService.listNonConformances(),
          qualityManagementService.listCAPAs(),
          qualityManagementService.listIndicators(),
          qualityManagementService.listDocuments(),
          qualityManagementService.listRisks(),
          qualityManagementService.listAccreditationReports(),
        ]);
      setDashboard(dashRes.data?.data);
      setAudits(auditRes.data?.data || []);
      setFindings(findRes.data?.data || []);
      setNcs(ncRes.data?.data || []);
      setCapas(capaRes.data?.data || []);
      setIndicators(indRes.data?.data || []);
      setDocuments(docRes.data?.data || []);
      setRisks(riskRes.data?.data || []);
      setReports(repRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Generate Report ── */
  const handleGenerateReport = async (standard) => {
    try {
      await qualityManagementService.generateAccreditationReport({ standard, period: '2026' });
      fetchAll();
    } catch (err) {
      setError('خطأ في إنشاء التقرير');
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={48} /><Typography sx={{ mt: 2 }}>جاري تحميل نظام إدارة الجودة...</Typography></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;

  const summary = dashboard?.summary || {};

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <VerifiedUserIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 36 }} />
            نظام إدارة الجودة
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            ISO 9001 / CBAHI / JCI — تدقيق، مؤشرات جودة، تقارير اعتماد
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAll}>تحديث</Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<AssessmentIcon fontSize="large" />} title="التدقيقات" value={summary.totalAudits || 0} color="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<CheckCircleIcon fontSize="large" />} title="مكتملة" value={summary.completedAudits || 0} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<FindInPageIcon fontSize="large" />} title="ملاحظات مفتوحة" value={summary.openFindings || 0} color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<ErrorIcon fontSize="large" />} title="ملاحظات حرجة" value={summary.criticalFindings || 0} color="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<WarningIcon fontSize="large" />} title="عدم مطابقة" value={summary.openNonConformances || 0} color="warning.dark" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<ScheduleIcon fontSize="large" />} title="إجراءات متأخرة" value={summary.overdueActions || 0} color="error.dark" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<SecurityIcon fontSize="large" />} title="مخاطر عالية" value={summary.highRisks || 0} color="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={1.5}>
          <StatCard icon={<DescriptionIcon fontSize="large" />} title="الوثائق" value={summary.totalDocuments || 0} color="info.main" />
        </Grid>
      </Grid>

      {/* Compliance by Standard */}
      {dashboard?.complianceByStandard && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>نسبة الامتثال حسب المعيار</Typography>
          <Grid container spacing={2}>
            {dashboard.complianceByStandard.map((cs) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={cs.standard}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">{cs.nameAr}</Typography>
                    <Typography variant="h3" fontWeight="bold" color={cs.averageCompliance >= 80 ? 'success.main' : cs.averageCompliance >= 60 ? 'warning.main' : 'error.main'}>
                      {cs.averageCompliance != null ? `${cs.averageCompliance}%` : '—'}
                    </Typography>
                    <Typography variant="caption">{cs.auditCount} تدقيق</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="التدقيقات" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="الملاحظات" icon={<FindInPageIcon />} iconPosition="start" />
          <Tab label="عدم المطابقة" icon={<WarningIcon />} iconPosition="start" />
          <Tab label="الإجراءات" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="المؤشرات" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="الوثائق" icon={<DescriptionIcon />} iconPosition="start" />
          <Tab label="المخاطر" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="تقارير الاعتماد" icon={<LocalHospitalIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* TAB 0: Audits */}
          {tab === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>المعيار</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>المدقق</TableCell>
                    <TableCell>الامتثال</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audits.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>{a.titleAr}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell><Chip label={a.standard} size="small" variant="outlined" /></TableCell>
                      <TableCell>{a.department}</TableCell>
                      <TableCell><Chip label={a.status} size="small" color={statusColor(a.status)} /></TableCell>
                      <TableCell>{a.scheduledDate}</TableCell>
                      <TableCell>{a.leadAuditor}</TableCell>
                      <TableCell>{a.complianceScore != null ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LinearProgress variant="determinate" value={a.complianceScore} sx={{ width: 60, height: 8, borderRadius: 4 }} color={a.complianceScore >= 80 ? 'success' : a.complianceScore >= 60 ? 'warning' : 'error'} /><Typography variant="caption">{a.complianceScore}%</Typography></Box> : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 1: Findings */}
          {tab === 1 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>المرجع</TableCell>
                    <TableCell>الخطورة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المسؤول</TableCell>
                    <TableCell>تاريخ الاستحقاق</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {findings.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>{f.titleAr}</TableCell>
                      <TableCell><Chip label={f.clauseRef} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={f.severity} size="small" color={severityColor(f.severity)} /></TableCell>
                      <TableCell><Chip label={f.status} size="small" color={statusColor(f.status)} /></TableCell>
                      <TableCell>{f.responsiblePerson}</TableCell>
                      <TableCell>{f.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 2: Non-Conformances */}
          {tab === 2 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>المعيار</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>الخطورة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>تاريخ الإبلاغ</TableCell>
                    <TableCell>تاريخ الاستحقاق</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ncs.map((nc) => (
                    <TableRow key={nc.id} hover>
                      <TableCell>{nc.titleAr}</TableCell>
                      <TableCell><Chip label={nc.standard} size="small" variant="outlined" /></TableCell>
                      <TableCell>{nc.department}</TableCell>
                      <TableCell><Chip label={nc.severity} size="small" color={severityColor(nc.severity)} /></TableCell>
                      <TableCell><Chip label={nc.status} size="small" color={statusColor(nc.status)} /></TableCell>
                      <TableCell>{nc.reportedDate}</TableCell>
                      <TableCell>{nc.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 3: CAPA */}
          {tab === 3 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المسؤول</TableCell>
                    <TableCell>الإنجاز</TableCell>
                    <TableCell>تاريخ الاستحقاق</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {capas.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.titleAr}</TableCell>
                      <TableCell><Chip label={c.type === 'corrective' ? 'تصحيحي' : 'وقائي'} size="small" color={c.type === 'corrective' ? 'warning' : 'info'} /></TableCell>
                      <TableCell><Chip label={c.status} size="small" color={statusColor(c.status)} /></TableCell>
                      <TableCell>{c.responsiblePerson}</TableCell>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LinearProgress variant="determinate" value={c.completionPercent} sx={{ width: 60, height: 8, borderRadius: 4 }} /><Typography variant="caption">{c.completionPercent}%</Typography></Box></TableCell>
                      <TableCell>{c.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 4: Quality Indicators */}
          {tab === 4 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الرمز</TableCell>
                    <TableCell>المؤشر</TableCell>
                    <TableCell>المعيار</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>الوحدة</TableCell>
                    <TableCell>المستهدف</TableCell>
                    <TableCell>التكرار</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {indicators.map((qi) => (
                    <TableRow key={qi.id} hover>
                      <TableCell><Chip label={qi.code} size="small" variant="outlined" /></TableCell>
                      <TableCell>{qi.nameAr}</TableCell>
                      <TableCell>{qi.standard}</TableCell>
                      <TableCell>{qi.department}</TableCell>
                      <TableCell>{qi.unit}</TableCell>
                      <TableCell>{qi.target}</TableCell>
                      <TableCell>{qi.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 5: Documents */}
          {tab === 5 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الرمز</TableCell>
                    <TableCell>العنوان</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>المعيار</TableCell>
                    <TableCell>الإصدار</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>تاريخ المراجعة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell><Chip label={d.code} size="small" variant="outlined" /></TableCell>
                      <TableCell>{d.titleAr}</TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{d.standard}</TableCell>
                      <TableCell>{d.version}</TableCell>
                      <TableCell><Chip label={d.status} size="small" color={statusColor(d.status)} /></TableCell>
                      <TableCell>{d.reviewDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 6: Risks */}
          {tab === 6 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الخطر</TableCell>
                    <TableCell>المعيار</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>الاحتمالية</TableCell>
                    <TableCell>الأثر</TableCell>
                    <TableCell>النتيجة</TableCell>
                    <TableCell>المستوى</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {risks.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.titleAr}</TableCell>
                      <TableCell>{r.standard}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.likelihood}</TableCell>
                      <TableCell>{r.impact}</TableCell>
                      <TableCell><Typography fontWeight="bold">{r.riskScore}</Typography></TableCell>
                      <TableCell><Chip label={r.riskLevel} size="small" sx={{ bgcolor: riskColor(r.riskLevel), color: '#fff' }} /></TableCell>
                      <TableCell><Chip label={r.status} size="small" color={statusColor(r.status)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 7: Accreditation Reports */}
          {tab === 7 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {['cbahi', 'jci', 'iso9001', 'iso45001', 'iso14001'].map((std) => (
                  <Button key={std} variant="outlined" size="small" onClick={() => handleGenerateReport(std)} startIcon={<DescriptionIcon />}>
                    إنشاء تقرير {std.toUpperCase()}
                  </Button>
                ))}
              </Box>
              <Divider sx={{ mb: 2 }} />
              {reports.length === 0 ? (
                <Alert severity="info">لا توجد تقارير اعتماد بعد. اضغط على أحد الأزرار أعلاه لإنشاء تقرير.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {reports.map((rpt) => (
                    <Grid item xs={12} md={6} key={rpt.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">{rpt.titleAr}</Typography>
                            <Chip label={rpt.readinessLevel} size="small" color={statusColor(rpt.readinessLevel)} />
                          </Box>
                          <Typography variant="h3" fontWeight="bold" color={rpt.overallCompliance >= 80 ? 'success.main' : rpt.overallCompliance >= 60 ? 'warning.main' : 'error.main'} sx={{ mb: 1 }}>
                            {rpt.overallCompliance}%
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}><Typography variant="caption" color="text.secondary">التدقيقات: {rpt.auditSummary?.total}</Typography></Grid>
                            <Grid item xs={6}><Typography variant="caption" color="text.secondary">الملاحظات المفتوحة: {rpt.findingsSummary?.open}</Typography></Grid>
                            <Grid item xs={6}><Typography variant="caption" color="text.secondary">عدم المطابقة المفتوح: {rpt.ncSummary?.open}</Typography></Grid>
                            <Grid item xs={6}><Typography variant="caption" color="text.secondary">المخاطر العالية: {rpt.riskSummary?.high}</Typography></Grid>
                          </Grid>
                          {rpt.recommendations && rpt.recommendations.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight="bold">التوصيات:</Typography>
                              {rpt.recommendations.map((rec, i) => (
                                <Typography key={i} variant="caption" display="block" sx={{ color: rec.priority === 'critical' ? 'error.main' : rec.priority === 'high' ? 'warning.main' : 'text.secondary' }}>
                                  • {rec.textAr}
                                </Typography>
                              ))}
                            </Box>
                          )}
                          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.disabled' }}>
                            {new Date(rpt.generatedAt).toLocaleString('ar-SA')}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
