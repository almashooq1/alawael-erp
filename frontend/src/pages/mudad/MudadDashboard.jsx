/**
 * لوحة معلومات نظام مُدد (حماية الأجور)
 * Mudad Wage Protection Dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, Chip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, LinearProgress, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  AccountBalance, AttachMoney, CheckCircle, Refresh,
  CloudUpload, TrendingUp, PriorityHigh,
} from '@mui/icons-material';
import mudadService from '../../services/mudad.service';

const statusColors = {
  pending: 'warning',
  validated: 'info',
  uploaded: 'primary',
  confirmed: 'success',
  rejected: 'error',
};

const statusLabels = {
  pending: 'قيد الانتظار',
  validated: 'تم التحقق',
  uploaded: 'تم الرفع',
  confirmed: 'مؤكد',
  rejected: 'مرفوض',
};

export default function MudadDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [batches, setBatches] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, batchRes, compRes] = await Promise.all([
        mudadService.getDashboard(),
        mudadService.getBatches({ limit: 10 }),
        mudadService.getComplianceReports({ limit: 5 }),
      ]);
      setDashboard(dashRes?.data || dashRes);
      setBatches(batchRes?.data?.batches || batchRes?.batches || []);
      setCompliance(compRes?.data?.reports || compRes?.reports || []);
    } catch (err) {
      setError('فشل في تحميل بيانات مُدد');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateSalaryRecords = async () => {
    try {
      setGenerating(true);
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      await mudadService.generateSalaryRecords({ month, year });
      setGenerateDialog(false);
      fetchData();
    } catch (err) {
      setError('فشل في توليد سجلات الرواتب');
    } finally {
      setGenerating(false);
    }
  };

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
            نظام مُدد — حماية الأجور
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة ومتابعة الامتثال لنظام حماية الأجور السعودي
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<AttachMoney />} onClick={() => setGenerateDialog(true)}>
            توليد سجلات الرواتب
          </Button>
          <IconButton onClick={fetchData}><Refresh /></IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي الموظفين</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.totalEmployees || 0}</Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>نسبة الامتثال</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.complianceRate || 0}%</Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>دفعات قيد الانتظار</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.pendingBatches || 0}</Typography>
                </Box>
                <PriorityHigh sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي المبالغ (ر.س)</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {(stats.totalAmount || 0).toLocaleString('ar-SA')}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول الدفعات الأخيرة */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                الدفعات الأخيرة
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>رقم الدفعة</TableCell>
                      <TableCell>الشهر</TableCell>
                      <TableCell align="center">عدد الموظفين</TableCell>
                      <TableCell align="center">المبلغ الإجمالي</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                      <TableCell align="center">إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">لا توجد دفعات حالياً</TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch) => (
                        <TableRow key={batch._id} hover>
                          <TableCell>{batch.batchNumber}</TableCell>
                          <TableCell>{batch.month}/{batch.year}</TableCell>
                          <TableCell align="center">{batch.employeeCount || 0}</TableCell>
                          <TableCell align="center">{(batch.totalAmount || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                          <TableCell align="center">
                            <Chip label={statusLabels[batch.status] || batch.status} color={statusColors[batch.status] || 'default'} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            {batch.status === 'pending' && (
                              <Tooltip title="التحقق من الدفعة">
                                <IconButton size="small" color="primary" onClick={() => mudadService.validateBatch(batch._id).then(fetchData)}>
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {batch.status === 'validated' && (
                              <Tooltip title="رفع لمُدد">
                                <IconButton size="small" color="success" onClick={() => mudadService.uploadBatch(batch._id).then(fetchData)}>
                                  <CloudUpload fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* تقارير الامتثال */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                تقارير الامتثال
              </Typography>
              {compliance.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  لا توجد تقارير امتثال
                </Typography>
              ) : (
                compliance.map((report) => (
                  <Box key={report._id} sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight="bold">{report.month}/{report.year}</Typography>
                      <Chip
                        label={report.riskLevel === 'low' ? 'منخفض' : report.riskLevel === 'medium' ? 'متوسط' : 'مرتفع'}
                        color={report.riskLevel === 'low' ? 'success' : report.riskLevel === 'medium' ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={report.complianceRate || 0}
                      color={report.complianceRate >= 80 ? 'success' : report.complianceRate >= 60 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      نسبة الامتثال: {report.complianceRate || 0}% | مخالفات: {report.violations?.length || 0}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog توليد سجلات الرواتب */}
      <Dialog open={generateDialog} onClose={() => setGenerateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>توليد سجلات الرواتب</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            سيتم توليد سجلات الرواتب للشهر الحالي من بيانات كشوف المرتبات
          </Typography>
          <TextField
            label="الشهر"
            value={new Date().getMonth() + 1}
            disabled
            fullWidth
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="السنة"
            value={new Date().getFullYear()}
            disabled
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleGenerateSalaryRecords} disabled={generating}>
            {generating ? <CircularProgress size={24} /> : 'توليد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
