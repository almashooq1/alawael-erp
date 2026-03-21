/**
 * لوحة معلومات الموافقات المسبقة للتأمين (التصاريح العلاجية)
 * Treatment Authorization / Insurance Pre-Auth Dashboard
 */
import { useState, useEffect, useCallback } from 'react';


import treatmentAuthorizationService from '../../services/treatmentAuthorization.service';

const statusLabels = {
  draft: 'مسودة', pending_review: 'قيد المراجعة الداخلية',
  submitted: 'مقدّم للتأمين', under_review: 'قيد مراجعة التأمين',
  approved: 'مُوافق', partially_approved: 'موافق جزئياً',
  denied: 'مرفوض', appealed: 'تم الاستئناف',
  appeal_approved: 'الاستئناف مُوافق', appeal_denied: 'الاستئناف مرفوض',
  expired: 'منتهي الصلاحية',
};
const statusColors = {
  draft: 'default', pending_review: 'warning', submitted: 'info',
  under_review: 'secondary', approved: 'success', partially_approved: 'primary',
  denied: 'error', appealed: 'warning', appeal_approved: 'success',
  appeal_denied: 'error', expired: 'default',
};
const serviceCategories = {
  speech_therapy: 'علاج النطق', occupational_therapy: 'العلاج الوظيفي',
  physical_therapy: 'العلاج الطبيعي', behavioral_therapy: 'العلاج السلوكي',
  psychological_therapy: 'العلاج النفسي', social_skills: 'المهارات الاجتماعية',
  sensory_integration: 'التكامل الحسي', cognitive_therapy: 'العلاج المعرفي',
  aqua_therapy: 'العلاج المائي', music_therapy: 'العلاج بالموسيقى',
  art_therapy: 'العلاج بالفن', other: 'أخرى',
};

const workflowSteps = ['مسودة', 'مراجعة داخلية', 'مقدّم للتأمين', 'مراجعة التأمين', 'القرار'];

function getActiveStep(status) {
  const map = { draft: 0, pending_review: 1, submitted: 2, under_review: 3 };
  if (['approved', 'partially_approved', 'denied'].includes(status)) return 4;
  return map[status] ?? 0;
}

export default function TreatmentAuthorizationDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, reqRes, expRes] = await Promise.all([
        treatmentAuthorizationService.getDashboard(),
        treatmentAuthorizationService.getRequests({ limit: 20 }),
        treatmentAuthorizationService.getExpiring(),
      ]);
      setDashboard(dashRes?.data || dashRes);
      setRequests(reqRes?.data?.requests || reqRes?.requests || []);
      setExpiring(expRes?.data?.requests || expRes?.requests || []);
    } catch (err) {
      setError('فشل في تحميل بيانات التصاريح العلاجية');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const stats = dashboard?.summary || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            التصاريح العلاجية والموافقات المسبقة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة طلبات الموافقة المسبقة من شركات التأمين للخدمات العلاجية
          </Typography>
        </Box>
        <IconButton onClick={fetchData}><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* تنبيه التصاريح المنتهية قريباً */}
      {expiring.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningAmber />}>
          يوجد {expiring.length} تصريح(ات) ستنتهي خلال 30 يوماً — يرجى تجديدها
        </Alert>
      )}

      {/* بطاقات إحصائية */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <LocalHospital color="primary" sx={{ fontSize: 36 }} />
              <Typography variant="h5" fontWeight="bold">{stats.totalRequests || 0}</Typography>
              <Typography variant="caption" color="text.secondary">إجمالي الطلبات</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <CheckCircle color="success" sx={{ fontSize: 36 }} />
              <Typography variant="h5" fontWeight="bold">{stats.approved || 0}</Typography>
              <Typography variant="caption" color="text.secondary">مُوافق عليها</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <HourglassEmpty color="warning" sx={{ fontSize: 36 }} />
              <Typography variant="h5" fontWeight="bold">{stats.pending || 0}</Typography>
              <Typography variant="caption" color="text.secondary">قيد المعالجة</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <Cancel color="error" sx={{ fontSize: 36 }} />
              <Typography variant="h5" fontWeight="bold">{stats.denied || 0}</Typography>
              <Typography variant="caption" color="text.secondary">مرفوضة</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <AttachMoney color="info" sx={{ fontSize: 36 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats.approvalRate ? `${stats.approvalRate}%` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">نسبة الموافقة</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول الطلبات */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            طلبات التصاريح العلاجية
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم الطلب</TableCell>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>شركة التأمين</TableCell>
                  <TableCell>الخدمات</TableCell>
                  <TableCell align="center">الجلسات</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell>تاريخ الطلب</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">لا توجد طلبات</TableCell></TableRow>
                ) : requests.map((req) => (
                  <TableRow key={req._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedRequest(req)}>
                    <TableCell>{req.authorizationNumber || '—'}</TableCell>
                    <TableCell>{req.beneficiary?.name || '—'}</TableCell>
                    <TableCell>{req.insurance?.providerName || '—'}</TableCell>
                    <TableCell>
                      {(req.services || []).slice(0, 2).map((s, i) => (
                        <Chip key={i} label={serviceCategories[s.serviceCategory] || s.serviceCategory} size="small" sx={{ mr: 0.5 }} />
                      ))}
                      {(req.services || []).length > 2 && (
                        <Chip label={`+${req.services.length - 2}`} size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {req.services?.reduce((sum, s) => sum + (s.sessionsUsed || 0), 0) || 0}/
                      {req.services?.reduce((sum, s) => sum + (s.sessionsRequested || 0), 0) || 0}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={statusLabels[req.status] || req.status} color={statusColors[req.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell align="center">
                      {req.status === 'draft' && (
                        <Tooltip title="إرسال للمراجعة">
                          <IconButton size="small" color="primary"
                            onClick={(e) => { e.stopPropagation(); treatmentAuthorizationService.submitForReview(req._id).then(fetchData); }}>
                            <Send fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {req.status === 'pending_review' && (
                        <Tooltip title="إرسال للتأمين">
                          <IconButton size="small" color="success"
                            onClick={(e) => { e.stopPropagation(); treatmentAuthorizationService.submitToInsurer(req._id).then(fetchData); }}>
                            <Send fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {req.status === 'denied' && (
                        <Tooltip title="استئناف">
                          <IconButton size="small" color="warning"
                            onClick={(e) => { e.stopPropagation(); }}>
                            <Gavel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* تفاصيل الطلب Dialog */}
      <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} maxWidth="md" fullWidth>
        {selectedRequest && (
          <>
            <DialogTitle>
              تفاصيل التصريح العلاجي — {selectedRequest.authorizationNumber || 'مسودة'}
            </DialogTitle>
            <DialogContent>
              {/* مسار العمل */}
              <Stepper activeStep={getActiveStep(selectedRequest.status)} sx={{ mb: 3, mt: 1 }}>
                {workflowSteps.map((label) => (
                  <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
              </Stepper>

              <Divider sx={{ mb: 2 }} />

              {/* معلومات المستفيد */}
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>معلومات المستفيد</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography variant="body2"><strong>الاسم:</strong> {selectedRequest.beneficiary?.name || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2"><strong>رقم الملف:</strong> {selectedRequest.beneficiary?.fileNumber || '—'}</Typography></Grid>
              </Grid>

              {/* معلومات التأمين */}
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>معلومات التأمين</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography variant="body2"><strong>الشركة:</strong> {selectedRequest.insurance?.providerName || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2"><strong>رقم البوليصة:</strong> {selectedRequest.insurance?.policyNumber || '—'}</Typography></Grid>
              </Grid>

              {/* الخدمات المطلوبة */}
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>الخدمات المطلوبة</Typography>
              {(selectedRequest.services || []).map((svc, idx) => (
                <Box key={idx} sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" fontWeight="bold">
                      {serviceCategories[svc.serviceCategory] || svc.serviceCategory}
                    </Typography>
                    <Chip
                      label={svc.approvalStatus === 'approved' ? 'مُوافق' : svc.approvalStatus === 'denied' ? 'مرفوض' : 'قيد المراجعة'}
                      color={svc.approvalStatus === 'approved' ? 'success' : svc.approvalStatus === 'denied' ? 'error' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption">
                    الجلسات: {svc.sessionsUsed || 0}/{svc.sessionsApproved || svc.sessionsRequested || 0} |
                    التكرار: {svc.frequencyPerWeek || 0}/أسبوع |
                    المدة: {svc.durationMinutes || 0} دقيقة
                  </Typography>
                  {svc.sessionsRequested > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={((svc.sessionsUsed || 0) / (svc.sessionsApproved || svc.sessionsRequested)) * 100}
                      sx={{ height: 6, borderRadius: 3, mt: 1 }}
                    />
                  )}
                </Box>
              ))}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedRequest(null)}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
