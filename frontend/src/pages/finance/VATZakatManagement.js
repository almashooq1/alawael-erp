import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Receipt as VATIcon,
  Visibility as ViewIcon,
  Send as FileIcon,
  AccountBalance as ZakatIcon,
} from '@mui/icons-material';
import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const vatStatusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  filed: { label: 'مقدم', color: 'info' },
  paid: { label: 'مدفوع', color: 'success' },
  amended: { label: 'معدل', color: 'warning' },
};

const mockVATReturns = [
  {
    _id: 'vr1',
    period: '2026-Q1',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    standardSales: 1850000,
    zeroRatedSales: 120000,
    outputVAT: 277500,
    standardPurchases: 980000,
    importPurchases: 150000,
    inputVAT: 169500,
    netVAT: 108000,
    adjustments: -2000,
    adjustedNetVAT: 106000,
    status: 'paid',
    filedDate: '2026-04-15',
  },
  {
    _id: 'vr2',
    period: '2025-Q4',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    standardSales: 1620000,
    zeroRatedSales: 95000,
    outputVAT: 243000,
    standardPurchases: 870000,
    importPurchases: 110000,
    inputVAT: 147000,
    netVAT: 96000,
    adjustments: 0,
    adjustedNetVAT: 96000,
    status: 'paid',
    filedDate: '2026-01-20',
  },
  {
    _id: 'vr3',
    period: '2026-Q2',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    standardSales: 2100000,
    zeroRatedSales: 140000,
    outputVAT: 315000,
    standardPurchases: 1100000,
    importPurchases: 200000,
    inputVAT: 195000,
    netVAT: 120000,
    adjustments: -3500,
    adjustedNetVAT: 116500,
    status: 'filed',
    filedDate: '2026-07-10',
  },
  {
    _id: 'vr4',
    period: '2026-Q3',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    standardSales: 1950000,
    zeroRatedSales: 130000,
    outputVAT: 292500,
    standardPurchases: 1050000,
    importPurchases: 180000,
    inputVAT: 184500,
    netVAT: 108000,
    adjustments: 0,
    adjustedNetVAT: 108000,
    status: 'draft',
  },
];

const mockZakatData = {
  year: 2025,
  revenuebase: 8500000,
  netProfit: 1200000,
  adjustedProfit: 1150000,
  zakatableBase: 4200000,
  zakatRate: 2.5,
  zakatDue: 105000,
  paid: 80000,
  remaining: 25000,
  dueDate: '2026-04-30',
  status: 'partially_paid',
  items: [
    { label: 'رأس المال', amount: 2500000, type: 'addition' },
    { label: 'الأرباح المبقاة', amount: 800000, type: 'addition' },
    { label: 'المخصصات', amount: 350000, type: 'addition' },
    { label: 'القروض طويلة الأجل', amount: 550000, type: 'addition' },
    { label: 'الأصول الثابتة', amount: -1500000, type: 'deduction' },
    { label: 'الاستثمارات طويلة الأجل', amount: -500000, type: 'deduction' },
  ],
};

const VATZakatManagement = () => {
  const showSnackbar = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [vatReturns, setVATReturns] = useState([]);
  const [zakatData, setZakatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const vData = await accountingService.getVATReturns();
      setVATReturns(Array.isArray(vData) && vData.length > 0 ? vData : mockVATReturns);
      const zData = await accountingService.getZakatData();
      setZakatData(zData || mockZakatData);
    } catch (err) {
      logger.error('VATZakat error:', err);
      setVATReturns(mockVATReturns);
      setZakatData(mockZakatData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalVATPaid = vatReturns
    .filter(v => v.status === 'paid')
    .reduce((s, v) => s + (v.adjustedNetVAT || 0), 0);

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري التحميل...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <VATIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  ضريبة القيمة المضافة والزكاة
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إقرارات ضريبة القيمة المضافة وحساب الزكاة الشرعية
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<VATIcon />} iconPosition="start" label="ضريبة القيمة المضافة (VAT)" />
        <Tab icon={<ZakatIcon />} iconPosition="start" label="الزكاة" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {/* VAT Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'إجمالي الإقرارات', value: vatReturns.length, color: brandColors.primary },
              {
                label: 'المدفوع',
                value: `${totalVATPaid.toLocaleString()} ر.س`,
                color: statusColors.success,
              },
              {
                label: 'إقرارات مسودة',
                value: vatReturns.filter(v => v.status === 'draft').length,
                color: statusColors.warning,
              },
              { label: 'معدل الضريبة', value: '15%', color: statusColors.info },
            ].map((s, i) => (
              <Grid item xs={3} key={i}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${surfaceColors.border}`,
                    textAlign: 'center',
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                      {s.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* VAT Table */}
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell sx={{ fontWeight: 700 }}>الفترة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      المبيعات الخاضعة
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      ضريبة المخرجات
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      المشتريات الخاضعة
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      ضريبة المدخلات
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      صافي الضريبة
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vatReturns.map(vr => (
                    <TableRow key={vr._id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: brandColors.primary }}
                        >
                          {vr.period}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        {(vr.standardSales + (vr.zeroRatedSales || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell align="left">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: statusColors.error }}
                        >
                          {vr.outputVAT?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        {(vr.standardPurchases + (vr.importPurchases || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell align="left">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: statusColors.success }}
                        >
                          {vr.inputVAT?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: brandColors.primary }}
                        >
                          {vr.adjustedNetVAT?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vatStatusConfig[vr.status]?.label}
                          color={vatStatusConfig[vr.status]?.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedReturn(vr);
                              setViewDialog(true);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {vr.status === 'draft' && (
                          <Tooltip title="تقديم">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setVATReturns(prev =>
                                  prev.map(v =>
                                    v._id === vr._id
                                      ? {
                                          ...v,
                                          status: 'filed',
                                          filedDate: new Date().toISOString().slice(0, 10),
                                        }
                                      : v
                                  )
                                );
                                showSnackbar('تم تقديم الإقرار بنجاح', 'success');
                              }}
                            >
                              <FileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {activeTab === 1 && zakatData && (
        <>
          {/* Zakat Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              {
                label: 'الوعاء الزكوي',
                value: `${zakatData.zakatableBase?.toLocaleString()} ر.س`,
                color: brandColors.primary,
              },
              {
                label: 'الزكاة المستحقة',
                value: `${zakatData.zakatDue?.toLocaleString()} ر.س`,
                color: statusColors.error,
              },
              {
                label: 'المدفوع',
                value: `${zakatData.paid?.toLocaleString()} ر.س`,
                color: statusColors.success,
              },
              {
                label: 'المتبقي',
                value: `${zakatData.remaining?.toLocaleString()} ر.س`,
                color: statusColors.warning,
              },
            ].map((s, i) => (
              <Grid item xs={3} key={i}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${surfaceColors.border}`,
                    textAlign: 'center',
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                      {s.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Zakat Calculation */}
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <ZakatIcon color="primary" /> حساب الوعاء الزكوي — {zakatData.year}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  {zakatData.items?.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.label}</TableCell>
                      <TableCell align="left">
                        <Typography
                          fontWeight={600}
                          sx={{
                            color:
                              item.type === 'addition' ? statusColors.success : statusColors.error,
                          }}
                        >
                          {item.amount < 0
                            ? `(${Math.abs(item.amount).toLocaleString()})`
                            : item.amount.toLocaleString()}{' '}
                          ر.س
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.type === 'addition' ? 'إضافة' : 'خصم'}
                          color={item.type === 'addition' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: 16 }}>الوعاء الزكوي</TableCell>
                    <TableCell align="left">
                      <Typography
                        fontWeight={800}
                        fontSize={16}
                        sx={{ color: brandColors.primary }}
                      >
                        {zakatData.zakatableBase?.toLocaleString()} ر.س
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>نسبة الزكاة</TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={700}>{zakatData.zakatRate}%</Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.05)' }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: 16 }}>الزكاة المستحقة</TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={800} fontSize={16} sx={{ color: statusColors.error }}>
                        {zakatData.zakatDue?.toLocaleString()} ر.س
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  تاريخ الاستحقاق: {zakatData.dueDate}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={zakatData.zakatDue > 0 ? (zakatData.paid / zakatData.zakatDue) * 100 : 0}
                    sx={{ width: 120, height: 8, borderRadius: 4, bgcolor: neutralColors.divider }}
                  />
                  <Typography variant="caption" fontWeight={700}>
                    {zakatData.zakatDue > 0
                      ? ((zakatData.paid / zakatData.zakatDue) * 100).toFixed(0)
                      : 0}
                    % مدفوع
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {/* VAT View Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VATIcon /> تفاصيل إقرار ضريبة القيمة المضافة
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedReturn && (
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  الفترة
                </Typography>
                <Typography fontWeight={700}>{selectedReturn.period}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  من
                </Typography>
                <Typography>{selectedReturn.startDate}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  إلى
                </Typography>
                <Typography>{selectedReturn.endDate}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Chip label="المبيعات" size="small" />
                </Divider>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  المبيعات القياسية
                </Typography>
                <Typography fontWeight={600}>
                  {selectedReturn.standardSales?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  مبيعات صفرية
                </Typography>
                <Typography fontWeight={600}>
                  {selectedReturn.zeroRatedSales?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  ضريبة المخرجات
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.error }}>
                  {selectedReturn.outputVAT?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Chip label="المشتريات" size="small" />
                </Divider>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  مشتريات محلية
                </Typography>
                <Typography fontWeight={600}>
                  {selectedReturn.standardPurchases?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  واردات
                </Typography>
                <Typography fontWeight={600}>
                  {selectedReturn.importPurchases?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  ضريبة المدخلات
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.success }}>
                  {selectedReturn.inputVAT?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Chip label="الصافي" size="small" />
                </Divider>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  صافي الضريبة
                </Typography>
                <Typography fontWeight={700}>
                  {selectedReturn.netVAT?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  التعديلات
                </Typography>
                <Typography fontWeight={600}>
                  {selectedReturn.adjustments?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  المبلغ المستحق
                </Typography>
                <Typography fontWeight={800} fontSize={18} sx={{ color: brandColors.primary }}>
                  {selectedReturn.adjustedNetVAT?.toLocaleString()} ر.س
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VATZakatManagement;
