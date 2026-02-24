/**
 * SCFHS License Verification Dashboard
 * لوحة تحكم التحقق الذكي من تراخيص هيئة التخصصات الصحية
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AppBar,
  Tabs,
  TabPanel,
  LinearProgress,
  Badge,
  Tooltip,
  Icon,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Psychology as PsychologyIcon,
  Shield as ShieldIcon,
  Assessment as AssessmentIcon,
  NotificationsActive as NotificationsActiveIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FileOpen as FileOpenIcon,
  VerifiedUser as VerifiedUserIcon,
  Block as BlockIcon,
  Clock as ClockIcon,
} from '@mui/icons-material';
import scfhsVerificationService from '../services/scfhsVerificationService';

const SCFHSVerificationDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [licenseData, setLicenseData] = useState({
    licenseNumber: '',
    professionalFirstName: '',
    professionalLastName: '',
    nationalId: '',
    specialization: '',
    subSpecialization: '',
    licenseIssueDate: '',
    licenseExpiryDate: '',
    checksum: '',
  });

  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchData, setBatchData] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await scfhsVerificationService.getVerificationStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  const loadAlerts = async (licenseNumber) => {
    try {
      const alerts = await scfhsVerificationService.getActiveAlerts(licenseNumber);
      setActiveAlerts(alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  /**
   * Single license verification
   */
  const handleVerifyLicense = useCallback(async () => {
    if (!licenseData.licenseNumber || !licenseData.nationalId) {
      setError('يجب إدخال رقم الرخصة ورقم الهوية الوطنية');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await scfhsVerificationService.verifyLicenseComprehensive(licenseData);

      setVerificationResult(result);
      setVerificationHistory([result, ...verificationHistory.slice(0, 19)]);

      if (result.success && result.verified) {
        await loadAlerts(licenseData.licenseNumber);
      }
    } catch (err) {
      setError('خطأ في التحقق من الرخصة: ' + err.message);
      setVerificationResult({
        success: false,
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [licenseData]);

  /**
   * Batch verification
   */
  const handleBatchVerification = useCallback(async () => {
    if (!batchData.trim()) {
      setError('يجب إدخال بيانات لتحقق من الدفعة');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const lines = batchData.split('\n').filter(line => line.trim());
      const results = [];

      for (const line of lines) {
        const [licenseNumber, nationalId, specialization] = line.split(',').map(x => x.trim());

        if (licenseNumber && nationalId) {
          const result = await scfhsVerificationService.verifyLicenseComprehensive({
            licenseNumber,
            nationalId,
            specialization: specialization || 'unknown',
            professionalFirstName: '',
            professionalLastName: '',
          });

          results.push(result);
        }
      }

      setVerificationHistory(results.concat(verificationHistory).slice(0, 20));
      setVerificationResult({
        success: true,
        batchResults: results,
        totalProcessed: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });
    } catch (err) {
      setError('خطأ في التحقق من الدفعة: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [batchData, verificationHistory]);

  /**
   * Export verification result
   */
  const handleExportResult = useCallback(() => {
    if (!selectedVerification) return;

    const dataStr = JSON.stringify(selectedVerification, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification-${selectedVerification.verificationId || 'export'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [selectedVerification]);

  /**
   * Generate report
   */
  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading(true);
      const report = await scfhsVerificationService.generateVerificationReport({
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        dateTo: new Date(),
      });

      setSelectedVerification(report);
      setDetailsDialogOpen(true);
    } catch (err) {
      setError('خطأ في إنشاء التقرير: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRiskLevelColor = (riskLevel) => {
    const colors = {
      LOW: '#4caf50',
      LOW_MEDIUM: '#8bc34a',
      MEDIUM: '#ff9800',
      HIGH: '#f44336',
      CRITICAL: '#b71c1c',
    };
    return colors[riskLevel] || '#9e9e9e';
  };

  const getRiskLevelText = (riskLevel) => {
    const texts = {
      LOW: 'منخفض',
      LOW_MEDIUM: 'منخفض-متوسط',
      MEDIUM: 'متوسط',
      HIGH: 'مرتفع',
      CRITICAL: 'حرج',
    };
    return texts[riskLevel] || 'غير معروف';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
          }}
        >
          🏥 لوحة تحكم التحقق الذكي من تراخيص SCFHS
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
          هيئة التخصصات الصحية السعودية | نظام التحقق المتقدم والذكي
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      إجمالي التحققات
                    </Typography>
                    <Typography variant="h5">{statistics.totalVerifications || 0}</Typography>
                  </Box>
                  <AssessmentIcon sx={{ fontSize: 40, color: '#667eea', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      معدل النجاح
                    </Typography>
                    <Typography variant="h5">{(statistics.successRate || 0).toFixed(1)}%</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      اكتشاف الاحتيال
                    </Typography>
                    <Typography variant="h5">{(statistics.fraudDetectionRate || 0).toFixed(1)}%</Typography>
                  </Box>
                  <ShieldIcon sx={{ fontSize: 40, color: '#f44336', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      متوسط وقت المعالجة
                    </Typography>
                    <Typography variant="h5">{(statistics.averageProcessingTime || 0).toFixed(0)}ms</Typography>
                  </Box>
                  <Clock Icon sx={{ fontSize: 40, color: '#ff9800', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="🔍 التحقق الفردي" value={0} />
          <Tab label="📦 التحقق من الدفعات" value={1} />
          <Tab label="📊 السجل والتقارير" value={2} />
          <Tab label="⚠️ التنبيهات النشطة" value={3} />
        </Tabs>
      </Paper>

      {/* Tab 0: Single License Verification */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="🔐 التحقق من رخصة فردية"
                subtitle="إدخل بيانات المتخصص الصحي للتحقق الشامل"
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="رقم الرخصة *"
                    value={licenseData.licenseNumber}
                    onChange={e => setLicenseData({ ...licenseData, licenseNumber: e.target.value })}
                    fullWidth
                    placeholder="مثال: SCFHS-2020-12345"
                    InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
                  />

                  <TextField
                    label="رقم الهوية الوطنية *"
                    value={licenseData.nationalId}
                    onChange={e => setLicenseData({ ...licenseData, nationalId: e.target.value })}
                    fullWidth
                    placeholder="10 أرقام"
                    maxLength="10"
                  />

                  <TextField
                    label="الاسم الأول"
                    value={licenseData.professionalFirstName}
                    onChange={e => setLicenseData({ ...licenseData, professionalFirstName: e.target.value })}
                    fullWidth
                  />

                  <TextField
                    label="اسم العائلة"
                    value={licenseData.professionalLastName}
                    onChange={e => setLicenseData({ ...licenseData, professionalLastName: e.target.value })}
                    fullWidth
                  />

                  <TextField
                    label="التخصص"
                    value={licenseData.specialization}
                    onChange={e => setLicenseData({ ...licenseData, specialization: e.target.value })}
                    fullWidth
                    placeholder="مثال: Surgery, Pediatrics"
                  />

                  <TextField
                    label="التخصص الفرعي (اختياري)"
                    value={licenseData.subSpecialization}
                    onChange={e => setLicenseData({ ...licenseData, subSpecialization: e.target.value })}
                    fullWidth
                  />

                  <TextField
                    label="تاريخ الإصدار"
                    type="date"
                    value={licenseData.licenseIssueDate}
                    onChange={e => setLicenseData({ ...licenseData, licenseIssueDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />

                  <TextField
                    label="تاريخ انتهاء الصلاحية"
                    type="date"
                    value={licenseData.licenseExpiryDate}
                    onChange={e => setLicenseData({ ...licenseData, licenseExpiryDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />

                  {error && activeTab === 0 && <Alert severity="error">{error}</Alert>}

                  <Button
                    onClick={handleVerifyLicense}
                    disabled={loading || !licenseData.licenseNumber || !licenseData.nationalId}
                    variant="contained"
                    size="large"
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                    startIcon={loading ? <CircularProgress size={20} /> : <VerifiedUserIcon />}
                  >
                    {loading ? 'جاري التحقق...' : 'تحقق من الرخصة'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {verificationResult && (
              <Card sx={{ border: `2px solid ${getRiskLevelColor(verificationResult.overall?.riskLevel)}` }}>
                <CardHeader
                  title="📋 نتائج التحقق"
                  subtitle={verificationResult.verificationId}
                  avatar={
                    verificationResult.verified ? (
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    ) : (
                      <ErrorIcon sx={{ color: '#f44336' }} />
                    )
                  }
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Main Status */}
                    {verificationResult.verified && (
                      <Alert severity="success" icon={<CheckCircleIcon />}>
                        ✅ تم التحقق من الرخصة بنجاح
                      </Alert>
                    )}
                    {!verificationResult.verified && verificationResult.success === false && (
                      <Alert severity="error" icon={<ErrorIcon />}>
                        ❌ فشل التحقق من الرخصة
                      </Alert>
                    )}

                    {/* Trust Score */}
                    {verificationResult.overall?.trustScore !== undefined && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">درجة الثقة</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {verificationResult.overall.trustScore}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={verificationResult.overall.trustScore}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: `linear-gradient(90deg, ${
                                verificationResult.overall.trustScore > 70 ? '#4caf50' : '#ff9800'
                              } 0%, ${verificationResult.overall.trustScore > 90 ? '#4caf50' : '#f44336'} 100%)`,
                            },
                          }}
                        />
                      </Box>
                    )}

                    {/* Risk Level */}
                    {verificationResult.overall?.riskLevel && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">مستوى المخاطرة:</Typography>
                        <Chip
                          label={getRiskLevelText(verificationResult.overall.riskLevel)}
                          sx={{
                            backgroundColor: getRiskLevelColor(verificationResult.overall.riskLevel),
                            color: 'white',
                            fontWeight: 600,
                          }}
                          icon={
                            verificationResult.overall.riskLevel === 'LOW' ? (
                              <CheckCircleIcon />
                            ) : (
                              <WarningIcon />
                            )
                          }
                        />
                      </Box>
                    )}

                    {/* Verification Layers */}
                    {verificationResult.layers && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          طبقات التحقق:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {Object.entries(verificationResult.layers).map(([layer, result]) => (
                            <Box
                              key={layer}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                backgroundColor: '#f5f5f5',
                                borderRadius: 1,
                              }}
                            >
                              {result.isValid || result.errors?.length === 0 ? (
                                <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                              ) : (
                                <ErrorIcon sx={{ color: '#f44336', fontSize: 18 }} />
                              )}
                              <Typography variant="caption">{layer}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Processing Time */}
                    {verificationResult.processingTimeMs && (
                      <Typography variant="caption" color="textSecondary">
                        ⏱️ وقت المعالجة: {verificationResult.processingTimeMs}ms
                      </Typography>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button
                        onClick={() => {
                          setSelectedVerification(verificationResult);
                          setDetailsDialogOpen(true);
                        }}
                        variant="outlined"
                        size="small"
                        startIcon={<FileOpenIcon />}
                      >
                        التفاصيل الكاملة
                      </Button>
                      <Button
                        onClick={handleExportResult}
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                      >
                        تحميل
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Batch Verification */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="📦 التحقق من الدفعات"
                subtitle="أدخل بيانات متعددة - صيغة: رقم_الرخصة, رقم_الهوية, التخصص (كل سطر)"
              />
              <CardContent>
                <TextField
                  multiline
                  rows={8}
                  value={batchData}
                  onChange={e => setBatchData(e.target.value)}
                  fullWidth
                  placeholder="SCFHS-2020-12345,1234567890,Surgery&#10;SCFHS-2021-54321,9876543210,Pediatrics"
                  sx={{ mb: 2, fontFamily: 'monospace' }}
                />

                {error && activeTab === 1 && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Button
                  onClick={handleBatchVerification}
                  disabled={loading || !batchData.trim()}
                  variant="contained"
                  size="large"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                  {loading ? 'جاري معالجة الدفعة...' : 'معالجة الدفعة'}
                </Button>

                {verificationResult?.batchResults && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="info">
                      تمت معالجة {verificationResult.totalProcessed} رخصة | نجاح: {verificationResult.successCount} | فشل:{' '}
                      {verificationResult.failureCount}
                    </Alert>

                    <TableContainer sx={{ mt: 2 }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell>رقم الرخصة</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>درجة الثقة</TableCell>
                            <TableCell>مستوى المخاطرة</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {verificationResult.batchResults.map((result, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{result.verificationId}</TableCell>
                              <TableCell>
                                {result.success ? (
                                  <Chip label="✅ نجح" size="small" color="success" />
                                ) : (
                                  <Chip label="❌ فشل" size="small" color="error" />
                                )}
                              </TableCell>
                              <TableCell>{result.overall?.trustScore || 'N/A'}%</TableCell>
                              <TableCell>
                                <Chip
                                  label={getRiskLevelText(result.overall?.riskLevel)}
                                  size="small"
                                  sx={{ backgroundColor: getRiskLevelColor(result.overall?.riskLevel), color: 'white' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: History & Reports */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="📊 سجل التحققات والتقارير"
                action={
                  <Button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  >
                    {loading ? 'جاري الإنشاء...' : 'إنشاء تقرير'}
                  </Button>
                }
              />
              <CardContent>
                {verificationHistory.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>معرف التحقق</TableCell>
                          <TableCell>التاريخ والوقت</TableCell>
                          <TableCell>الحالة</TableCell>
                          <TableCell>درجة الثقة</TableCell>
                          <TableCell>مستوى المخاطرة</TableCell>
                          <TableCell>الإجراء</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {verificationHistory.map((result, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {result.verificationId?.substring(0, 20)}...
                            </TableCell>
                            <TableCell>{new Date(result.timestamp).toLocaleString('ar-SA')}</TableCell>
                            <TableCell>
                              {result.verified ? (
                                <Chip label="✅ نجح" size="small" color="success" />
                              ) : (
                                <Chip label="❌ فشل" size="small" color="error" />
                              )}
                            </TableCell>
                            <TableCell>{result.overall?.trustScore || 'N/A'}%</TableCell>
                            <TableCell>
                              <Chip
                                label={getRiskLevelText(result.overall?.riskLevel)}
                                size="small"
                                sx={{
                                  backgroundColor: getRiskLevelColor(result.overall?.riskLevel),
                                  color: 'white',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => {
                                  setSelectedVerification(result);
                                  setDetailsDialogOpen(true);
                                }}
                                size="small"
                                variant="outlined"
                              >
                                عرض
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">لا توجد تحققات بعد</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Active Alerts */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="⚠️ التنبيهات النشطة" />
              <CardContent>
                {activeAlerts.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {activeAlerts.map((alert, idx) => (
                      <Alert
                        key={idx}
                        severity={alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'}
                        icon={
                          alert.severity === 'critical' ? (
                            <BlockIcon />
                          ) : alert.severity === 'high' ? (
                            <WarningIcon />
                          ) : (
                            <InfoIcon />
                          )
                        }
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {alert.description}
                        </Typography>
                        <Typography variant="caption" color="inherit">
                          نوع التنبيه: {alert.alertType} - {new Date(alert.createdAt).toLocaleString('ar-SA')}
                        </Typography>
                      </Alert>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="success">✅ لا توجد تنبيهات نشطة</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📋 تفاصيل التحقق الكاملة</DialogTitle>
        <DialogContent dividers>
          {selectedVerification && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.875rem' }}>
              <pre style={{ overflow: 'auto', backgroundColor: '#f5f5f5', p: 1 }}>
                {JSON.stringify(selectedVerification, null, 2)}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
          <Button onClick={handleExportResult} variant="contained">
            تحميل JSON
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SCFHSVerificationDashboard;
