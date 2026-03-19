/**
 * ========================================
 * محوِّل التاريخ - Date Converter Component
 * ========================================
 *
 * مكون واجهة المستخدم لتحويل التواريخ
 * User Interface Component for Date Conversion
 *
 * Features:
 * - تحويل ثنائي الاتجاه (Bi-directional conversion)
 * - واجهة سهلة الاستخدام (User-friendly interface)
 * - دعم كامل للعربية (Full Arabic support)
 * - تصميم Material-UI حديث (Modern Material-UI design)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  Container,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ArrowForward, SwapHoriz, Today, AccessTime, CalendarMonth } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)',
  },
}));

const ConversionBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  backgroundColor: theme.palette.background.paper,
  border: `2px solid ${theme.palette.primary.light}`,
  marginBottom: theme.spacing(2),
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  padding: theme.spacing(4),
  borderRadius: '12px',
  marginBottom: theme.spacing(3),
  textAlign: 'center',
}));

function DateConverterComponent() {
  const [tabValue, setTabValue] = useState(0);
  const [gregorianDate, setGregorianDate] = useState('');
  const [hijriDate, setHijriDate] = useState('');
  const [conversionResult, setConversionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversionHistory, setConversionHistory] = useState([]);

  /**
   * تحويل التاريخ الميلادي إلى هجري
   */
  const convertGregorianToHijri = async () => {
    if (!gregorianDate) {
      setError('يرجى إدخال تاريخ ميلادي');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/date-converter/gregorian-to-hijri', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gregorianDate }),
      });

      if (!response.ok) {
        throw new Error('فشل التحويل');
      }

      const data = await response.json();
      setConversionResult(data);
      setHijriDate(data.fullDate);
      addToHistory({
        type: 'gregorian_to_hijri',
        input: gregorianDate,
        output: data.fullDate,
        timestamp: new Date().toLocaleString('ar-SA'),
      });
    } catch (err) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * تحويل التاريخ الهجري إلى ميلادي
   */
  const convertHijriToGregorian = async () => {
    if (!hijriDate) {
      setError('يرجى إدخال تاريخ هجري');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/date-converter/hijri-to-gregorian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hijriDate }),
      });

      if (!response.ok) {
        throw new Error('فشل التحويل');
      }

      const data = await response.json();
      setConversionResult(data);
      setGregorianDate(data.fullDate);
      addToHistory({
        type: 'hijri_to_gregorian',
        input: hijriDate,
        output: data.fullDate,
        timestamp: new Date().toLocaleString('ar-SA'),
      });
    } catch (err) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * الحصول على معلومات التاريخ الكاملة
   */
  const getCompleteDateInfo = async () => {
    const date = gregorianDate || new Date().toISOString().split('T')[0];

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/date-converter/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gregorianDate: date }),
      });

      if (!response.ok) {
        throw new Error('فشل الحصول على المعلومات');
      }

      const data = await response.json();
      setConversionResult(data);
    } catch (err) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * إضافة التحويل إلى السجل
   */
  const addToHistory = item => {
    setConversionHistory([item, ...conversionHistory.slice(0, 9)]);
  };

  /**
   * مسح السجل
   */
  const clearHistory = () => {
    setConversionHistory([]);
  };

  /**
   * التبديل بين التواريخ
   */
  const swapDates = () => {
    setGregorianDate(conversionResult?.gregorian || '');
    setHijriDate(conversionResult?.hijri || '');
  };

  /**
   * استخدام اليوم الحالي
   */
  const useToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setGregorianDate(`${year}-${month}-${day}`);
    convertGregorianToHijri();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <HeaderBox>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <CalendarMonth sx={{ fontSize: 40 }} />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
            محوِّل التاريخ
          </Typography>
          <CalendarMonth sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
          تحويل بين التاريخ الميلادي والهجري
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          بناءً على تقويم أم القرى - Conversion based on Umm al-Qura Calendar
        </Typography>
      </HeaderBox>

      {/* Tab Navigation */}
      <StyledCard>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="تحويل التاريخ" icon={<SwapHoriz />} iconPosition="start" />
          <Tab label="معلومات شاملة" icon={<AccessTime />} iconPosition="start" />
          <Tab label="السجل" icon={<Today />} iconPosition="start" />
        </Tabs>
      </StyledCard>

      {/* Tab Content */}
      {tabValue === 0 && (
        <>
          {/* Gregorian to Hijri */}
          <StyledCard>
            <CardHeader
              title="تحويل التاريخ الميلادي إلى هجري"
              subheader="Gregorian to Hijri Conversion"
              avatar={<Today sx={{ color: 'primary.main' }} />}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="التاريخ الميلادي"
                    type="date"
                    value={gregorianDate}
                    onChange={e => setGregorianDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button variant="contained" startIcon={<ArrowForward />} onClick={convertGregorianToHijri} fullWidth disabled={loading}>
                      {loading ? <CircularProgress size={24} /> : 'تحويل'}
                    </Button>
                    <Button variant="outlined" onClick={useToday} disabled={loading}>
                      اليوم
                    </Button>
                  </Box>
                </Grid>

                {conversionResult?.hijri && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <ConversionBox>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography color="textSecondary" gutterBottom>
                                التاريخ الهجري (Hijri Date)
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {conversionResult.hijri.formatted}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1, color: 'textSecondary' }}>
                                {conversionResult.hijri.date}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography color="textSecondary" gutterBottom>
                                اليوم (Day of Week)
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {conversionResult.day?.nameAr}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1, color: 'textSecondary' }}>
                                {conversionResult.day?.nameEn}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </ConversionBox>
                    </Grid>
                  </>
                )}

                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error">{error}</Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </StyledCard>

          {/* Hijri to Gregorian */}
          <StyledCard>
            <CardHeader
              title="تحويل التاريخ الهجري إلى ميلادي"
              subheader="Hijri to Gregorian Conversion"
              avatar={<CalendarMonth sx={{ color: 'success.main' }} />}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="التاريخ الهجري (يوم/شهر/سنة)"
                    placeholder="15/5/1445"
                    value={hijriDate}
                    onChange={e => setHijriDate(e.target.value)}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ArrowForward />}
                    onClick={convertHijriToGregorian}
                    fullWidth
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'تحويل'}
                  </Button>
                </Grid>

                {conversionResult?.gregorian && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <ConversionBox>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography color="textSecondary" gutterBottom>
                                التاريخ الميلادي (Gregorian Date)
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {conversionResult.gregorian.formatted}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1, color: 'textSecondary' }}>
                                {conversionResult.gregorian.date}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography color="textSecondary" gutterBottom>
                                الشهر (Month)
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                {conversionResult.gregorian.monthNameAr}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1, color: 'textSecondary' }}>
                                {conversionResult.gregorian.monthName}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </ConversionBox>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </StyledCard>
        </>
      )}

      {tabValue === 1 && (
        <StyledCard>
          <CardHeader title="معلومات التاريخ الشاملة" subheader="Complete Date Information" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="حدد التاريخ"
                    type="date"
                    value={gregorianDate}
                    onChange={e => setGregorianDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  />
                  <Button variant="contained" onClick={getCompleteDateInfo} disabled={loading}>
                    عرض المعلومات
                  </Button>
                </Box>
              </Grid>

              {conversionResult && (
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="small" gutterBottom>
                          التاريخ الميلادي
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {conversionResult.gregorian.formatted}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="small" gutterBottom>
                          التاريخ الهجري
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                          {conversionResult.hijri.formatted}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="small" gutterBottom>
                          يوم الأسبوع
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                          {conversionResult.day.nameAr}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="small" gutterBottom>
                          الشهر الميلادي
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                          {conversionResult.gregorian.monthNameAr}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </StyledCard>
      )}

      {tabValue === 2 && (
        <StyledCard>
          <CardHeader
            title="سجل التحويلات"
            subheader={`عدد التحويلات: ${conversionHistory.length}`}
            action={
              conversionHistory.length > 0 && (
                <Button size="small" color="error" onClick={clearHistory}>
                  مسح السجل
                </Button>
              )
            }
          />
          <CardContent>
            {conversionHistory.length === 0 ? (
              <Alert severity="info">لا توجد تحويلات حتى الآن</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.light' }}>
                      <TableCell>النوع</TableCell>
                      <TableCell>المدخل</TableCell>
                      <TableCell>المخرج</TableCell>
                      <TableCell>الوقت</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conversionHistory.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{item.type === 'gregorian_to_hijri' ? 'ميلادي ← هجري' : 'هجري ← ميلادي'}</TableCell>
                        <TableCell>{item.input}</TableCell>
                        <TableCell>{item.output}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{item.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </StyledCard>
      )}
    </Container>
  );
}

export default DateConverterComponent;
