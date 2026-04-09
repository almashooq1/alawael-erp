/**
 * لوحة معلومات هيئة رعاية ذوي الإعاقة + معايير سباهي
 * Disability Authority Reports & CBAHI Compliance Dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, Chip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Tabs, Tab, IconButton, LinearProgress, Accordion,
  AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  ExpandMore, Assessment, Gavel, Refresh, Add, VerifiedUser, Star,
} from '@mui/icons-material';
import disabilityAuthorityService from '../../services/disabilityAuthority.service';

const reportStatusLabels = {
  draft: 'مسودة', under_review: 'قيد المراجعة', approved: 'معتمد',
  submitted: 'مقدّم', acknowledged: 'مُستلم', revision_required: 'يتطلب تعديل',
};
const reportStatusColors = {
  draft: 'default', under_review: 'warning', approved: 'success',
  submitted: 'primary', acknowledged: 'info', revision_required: 'error',
};
const readinessLabels = {
  not_ready: 'غير جاهز', needs_improvement: 'يحتاج تحسين',
  partially_ready: 'جاهز جزئياً', ready: 'جاهز', fully_compliant: 'ممتثل بالكامل',
};
const readinessColors = {
  not_ready: 'error', needs_improvement: 'warning',
  partially_ready: 'info', ready: 'primary', fully_compliant: 'success',
};

export default function DisabilityAuthorityDashboard() {
  const [tab, setTab] = useState(0);
  const [reports, setReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [standards, setStandards] = useState([]);
  const [_reportDashboard, setReportDashboard] = useState(null);
  const [cbahiDashboard, setCbahiDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [repRes, assessRes, stdRes, repDash, cbahiDash] = await Promise.all([
        disabilityAuthorityService.getReports({ limit: 10 }),
        disabilityAuthorityService.getAssessments({ limit: 10 }),
        disabilityAuthorityService.getCBAHIStandards(),
        disabilityAuthorityService.getReportDashboard().catch(() => null),
        disabilityAuthorityService.getCBAHIDashboard().catch(() => null),
      ]);
      setReports(repRes?.data?.reports || repRes?.reports || []);
      setAssessments(assessRes?.data?.assessments || assessRes?.assessments || []);
      setStandards(stdRes?.data?.standards || stdRes?.standards || []);
      setReportDashboard(repDash?.data || repDash);
      setCbahiDashboard(cbahiDash?.data || cbahiDash);
    } catch (err) {
      setError('فشل في تحميل بيانات هيئة الإعاقة');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeedStandards = async () => {
    try {
      await disabilityAuthorityService.seedCBAHIStandards();
      fetchData();
    } catch (err) {
      setError('فشل في تحميل المعايير الافتراضية');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            هيئة رعاية ذوي الإعاقة ومعايير سباهي
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة تقارير الهيئة ومتابعة الامتثال لمعايير CBAHI
          </Typography>
        </Box>
        <IconButton onClick={fetchData}><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* إحصائيات مختصرة */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' }, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #1976d2, #1976d288)' }} />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(25,118,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                <Gavel color="primary" sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{reports.length}</Typography>
              <Typography variant="body2" color="text.secondary">تقارير الهيئة</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' }, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #2e7d32, #2e7d3288)' }} />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(46,125,50,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                <VerifiedUser color="success" sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{standards.length}</Typography>
              <Typography variant="body2" color="text.secondary">معايير سباهي</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' }, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #0288d1, #0288d188)' }} />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(2,136,209,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                <Assessment color="info" sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{assessments.length}</Typography>
              <Typography variant="body2" color="text.secondary">تقييمات سباهي</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' }, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #ed6c02, #ed6c0288)' }} />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(237,108,2,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                <Star color="warning" sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {cbahiDashboard?.latestScore ? `${cbahiDashboard.latestScore}%` : '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">آخر نتيجة</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Card sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 }, '& .Mui-selected': { fontWeight: 700 }, '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' } }}>
          <Tab label="تقارير الهيئة" icon={<Gavel />} iconPosition="start" />
          <Tab label="معايير سباهي" icon={<VerifiedUser />} iconPosition="start" />
          <Tab label="تقييمات الامتثال" icon={<Assessment />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* تبويب تقارير الهيئة */}
          {tab === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>نوع التقرير</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>الفترة</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>المستفيدون</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>الخدمات المقدمة</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>تاريخ الإنشاء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">لا توجد تقارير</TableCell></TableRow>
                  ) : reports.map((r) => (
                    <TableRow key={r._id} hover>
                      <TableCell>
                        {r.reportType === 'quarterly' ? 'ربع سنوي' : r.reportType === 'annual' ? 'سنوي' : r.reportType === 'monthly' ? 'شهري' : r.reportType}
                      </TableCell>
                      <TableCell>
                        {r.period?.startDate ? new Date(r.period.startDate).toLocaleDateString('ar-SA') : '—'}
                        {' — '}
                        {r.period?.endDate ? new Date(r.period.endDate).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell align="center">{r.data?.beneficiaryStats?.totalActive || 0}</TableCell>
                      <TableCell align="center">{r.data?.serviceStats?.totalSessions || 0}</TableCell>
                      <TableCell align="center">
                        <Chip label={reportStatusLabels[r.status] || r.status} color={reportStatusColors[r.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>{new Date(r.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* تبويب معايير سباهي */}
          {tab === 1 && (
            <Box>
              {standards.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary" gutterBottom>لم يتم تحميل المعايير بعد</Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={handleSeedStandards}>
                    تحميل المعايير الافتراضية
                  </Button>
                </Box>
              ) : (
                standards.map((std) => (
                  <Accordion key={std._id} sx={{ mb: 1, borderRadius: '12px !important', border: '1px solid rgba(0,0,0,0.06)', '&:before': { display: 'none' }, overflow: 'hidden', transition: 'all 0.3s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        <Chip label={std.code} size="small" color="primary" variant="outlined" />
                        <Typography fontWeight="bold" flex={1}>{std.titleAr || std.title}</Typography>
                        <Chip
                          label={std.priority === 'essential' ? 'أساسي' : std.priority === 'important' ? 'مهم' : 'تطويري'}
                          color={std.priority === 'essential' ? 'error' : std.priority === 'important' ? 'warning' : 'info'}
                          size="small"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {std.descriptionAr || std.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>الفصل:</strong> {std.chapter} | <strong>القسم:</strong> {std.section || '—'}
                      </Typography>
                      {std.evidenceRequired?.length > 0 && (
                        <Box mt={1}>
                          <Typography variant="body2" fontWeight="bold">الأدلة المطلوبة:</Typography>
                          {std.evidenceRequired.map((ev, i) => (
                            <Chip key={i} label={ev} size="small" sx={{ mr: 0.5, mt: 0.5 }} />
                          ))}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          )}

          {/* تبويب تقييمات الامتثال */}
          {tab === 2 && (
            <Box>
              {assessments.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>لا توجد تقييمات</Typography>
              ) : assessments.map((assess) => (
                <Card key={assess._id} variant="outlined" sx={{ mb: 2, p: 2, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.07)' } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">تقييم {assess.assessmentType || ''}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assess.assessmentDate ? new Date(assess.assessmentDate).toLocaleDateString('ar-SA') : '—'}
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h3" fontWeight="bold" color={
                        (assess.overallScore || 0) >= 80 ? 'success.main' :
                        (assess.overallScore || 0) >= 60 ? 'warning.main' : 'error.main'
                      }>
                        {assess.overallScore || 0}%
                      </Typography>
                      <Chip
                        label={readinessLabels[assess.readinessLevel] || assess.readinessLevel || '—'}
                        color={readinessColors[assess.readinessLevel] || 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                  {assess.chapterResults && (
                    <Grid container spacing={1}>
                      {Object.entries(assess.chapterResults).map(([chapter, data]) => (
                        <Grid item xs={12} sm={6} md={4} key={chapter}>
                          <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                            <Typography variant="caption" fontWeight="bold">{chapter}</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={data?.score || 0}
                              sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                              color={(data?.score || 0) >= 80 ? 'success' : (data?.score || 0) >= 60 ? 'warning' : 'error'}
                            />
                            <Typography variant="caption" color="text.secondary">{data?.score || 0}%</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
