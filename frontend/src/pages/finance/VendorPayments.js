import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Tooltip,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { LocalShipping, Warning, Refresh, TrendingDown, CalendarMonth } from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const VendorPayments = () => {
  const [tab, setTab] = useState(0);
  const [payments, setPayments] = useState([]);
  const [aging, setAging] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, sRes] = await Promise.all([
        fetch(`${API}/finance/pro/vendor-payments?overdueOnly=${overdueOnly}`, { headers }),
        fetch(`${API}/finance/pro/vendor-payments/aging`, { headers }),
        fetch(`${API}/finance/pro/vendor-payments/summary`, { headers }),
      ]);
      const pJson = await pRes.json();
      const aJson = await aRes.json();
      const sJson = await sRes.json();
      if (pJson.success) setPayments(pJson.data);
      if (aJson.success) setAging(aJson.data);
      if (sJson.success) setSummary(sJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [overdueOnly]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const agingColor = bucket => {
    const map = {
      current: '#4CAF50',
      '1-30': '#2196F3',
      '31-60': '#FF9800',
      '61-90': '#F44336',
      '90+': '#B71C1C',
    };
    return map[bucket] || '#607D8B';
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            مدفوعات الموردين
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Vendor Payment Tracking & Aging
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={overdueOnly ? 'contained' : 'outlined'}
            color="error"
            size="small"
            onClick={() => setOverdueOnly(!overdueOnly)}
            startIcon={<Warning />}
          >
            {overdueOnly ? 'الكل' : 'المتأخرة فقط'}
          </Button>
          <Button variant="outlined" onClick={fetchAll} startIcon={<Refresh />}>
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            {
              label: 'إجمالي المستحق',
              value: fc(summary.totalOutstanding),
              icon: <TrendingDown />,
              color: '#F44336',
            },
            {
              label: 'المتأخرة',
              value: fc(summary.totalOverdue),
              icon: <Warning />,
              color: '#B71C1C',
            },
            { label: 'المدفوع هذا الشهر', value: fc(summary.paidThisMonth), color: '#4CAF50' },
            {
              label: 'مستحق هذا الأسبوع',
              value: fc(summary.dueThisWeek),
              icon: <CalendarMonth />,
              color: '#FF9800',
            },
          ].map((item, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                minWidth: 190,
                borderRadius: 2,
                border: `1px solid ${surfaceColors.border}`,
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                {item.icon && <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>}
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`المدفوعات (${payments.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`أعمار الديون (${aging.length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* Payments Tab */}
      {tab === 0 && (
        <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.card }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المورّد</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    المبلغ
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    المدفوع
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    المتبقي
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ الاستحقاق</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد مدفوعات
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p, i) => {
                    const isOverdue =
                      p.dueDate && new Date(p.dueDate) < new Date() && p.remaining > 0;
                    return (
                      <TableRow
                        key={i}
                        hover
                        sx={{ bgcolor: isOverdue ? '#F4433608' : 'transparent' }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.invoiceNumber || '-'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          <LocalShipping
                            sx={{
                              fontSize: 16,
                              verticalAlign: 'middle',
                              mr: 0.5,
                              color: neutralColors.textSecondary,
                            }}
                          />
                          {p.vendorName || p.vendor?.name || '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {fc(p.totalAmount || p.amount)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#4CAF50' }}>
                          {fc(p.paidAmount || 0)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#F44336' }}>
                          {fc(p.remaining || p.totalAmount - (p.paidAmount || 0))}
                        </TableCell>
                        <TableCell>
                          {p.dueDate ? (
                            <Tooltip title={new Date(p.dueDate).toLocaleDateString('ar-SA')}>
                              <Chip
                                size="small"
                                label={new Date(p.dueDate).toLocaleDateString('ar-SA')}
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: isOverdue ? '#F4433615' : '#4CAF5015',
                                  color: isOverdue ? '#F44336' : '#4CAF50',
                                }}
                                icon={isOverdue ? <Warning sx={{ fontSize: 14 }} /> : undefined}
                              />
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isOverdue ? 'متأخر' : p.remaining <= 0 ? 'مدفوع' : 'مستحق'}
                            sx={{
                              fontWeight: 600,
                              bgcolor: isOverdue
                                ? '#F4433615'
                                : p.remaining <= 0
                                  ? '#4CAF5015'
                                  : '#FF980015',
                              color: isOverdue
                                ? '#F44336'
                                : p.remaining <= 0
                                  ? '#4CAF50'
                                  : '#FF9800',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Aging Tab */}
      {tab === 1 && (
        <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              تحليل أعمار ديون الموردين
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: neutralColors.textSecondary }}>
              Vendor Aging Analysis — تصنيف المبالغ المستحقة حسب فترة التأخير
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.card }}>
                    <TableCell sx={{ fontWeight: 700 }}>المورّد</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: agingColor('current') }}>
                      جاري
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: agingColor('1-30') }}>
                      1-30 يوم
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: agingColor('31-60') }}>
                      31-60 يوم
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: agingColor('61-90') }}>
                      61-90 يوم
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: agingColor('90+') }}>
                      +90 يوم
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      الإجمالي
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aging.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 4, color: neutralColors.textSecondary }}
                      >
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  ) : (
                    aging.map((vendor, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          <LocalShipping sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                          {vendor.vendorName || vendor._id}
                        </TableCell>
                        <TableCell align="right" sx={{ color: agingColor('current') }}>
                          {fc(vendor.current)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: agingColor('1-30') }}>
                          {fc(vendor['1-30'] || vendor.days1to30)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: agingColor('31-60') }}>
                          {fc(vendor['31-60'] || vendor.days31to60)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: agingColor('61-90') }}>
                          {fc(vendor['61-90'] || vendor.days61to90)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: agingColor('90+') }}>
                          {fc(vendor['90+'] || vendor.days90plus)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {fc(vendor.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Totals Row */}
                  {aging.length > 0 && (
                    <TableRow sx={{ bgcolor: surfaceColors.card }}>
                      <TableCell sx={{ fontWeight: 900 }}>الإجمالي</TableCell>
                      {['current', '1-30', '31-60', '61-90', '90+', 'total'].map(bucket => (
                        <TableCell
                          key={bucket}
                          align="right"
                          sx={{
                            fontWeight: 900,
                            color: bucket === 'total' ? brandColors.primary : agingColor(bucket),
                          }}
                        >
                          {fc(
                            aging.reduce(
                              (s, v) =>
                                s +
                                (v[bucket] ||
                                  v[
                                    bucket === '1-30'
                                      ? 'days1to30'
                                      : bucket === '31-60'
                                        ? 'days31to60'
                                        : bucket === '61-90'
                                          ? 'days61to90'
                                          : bucket === '90+'
                                            ? 'days90plus'
                                            : bucket
                                  ] ||
                                  0),
                              0
                            )
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default VendorPayments;
