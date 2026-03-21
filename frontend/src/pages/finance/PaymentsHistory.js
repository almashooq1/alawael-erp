import { useState, useEffect } from 'react';

import { parentService } from 'services/parentService';
import { getStatusColor } from 'utils/statusColors';
import logger from 'utils/logger';
import { gradients, neutralColors, surfaceColors, brandColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';

const PaymentsHistory = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const userId = currentUser?._id || currentUser?.id || '';
  const [paymentData, setPaymentData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await parentService.getPaymentsHistory(userId);
        setPaymentData(data);
      } catch (err) {
        logger.error('Failed to load payments:', err);
        setError(err.message || 'حدث خطأ في تحميل سجل المدفوعات');
        showSnackbar('حدث خطأ أثناء تحميل سجل المدفوعات', 'error');
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  if (!paymentData) return <Typography>جاري التحميل...</Typography>;

  const filteredPayments = paymentData.payments?.filter(p => {
    const matchesSearch =
      p.invoiceNumber.includes(searchText) || p.description.includes(searchText);
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.warning,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PaymentIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              سجل الدفعات والفواتير
            </Typography>
            <Typography variant="body2">متابعة الدفعات والفواتير المتعلقة بالخدمات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {paymentData.summaryCards?.map(card => (
          <Grid item xs={12} sm={6} md={3} key={card.id}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: card.color, fontWeight: 'bold' }}>
                  {card.amount}
                </Typography>
                <Typography variant="caption">{card.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(e, val) => setSelectedTab(val)} sx={{ mb: 3 }}>
        <Tab label={`جميع الفواتير (${paymentData.payments?.length})`} />
        <Tab
          label={`المدفوعة (${paymentData.payments?.filter(p => p.status === 'مدفوعة').length})`}
        />
        <Tab
          label={`قيد الانتظار (${paymentData.payments?.filter(p => p.status === 'قيد الانتظار').length})`}
        />
        <Tab
          label={`متأخرة (${paymentData.payments?.filter(p => p.status === 'متأخرة').length})`}
        />
      </Tabs>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="بحث برقم الفاتورة..."
              size="small"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                label="الحالة"
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="مدفوعة">مدفوعة</MenuItem>
                <MenuItem value="قيد الانتظار">قيد الانتظار</MenuItem>
                <MenuItem value="متأخرة">متأخرة</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{
                background: gradients.warning,
              }}
            >
              طباعة
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader title="الفواتير والدفعات" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                <TableCell sx={{ fontWeight: 'bold' }}>رقم الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>المبلغ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments?.map(payment => (
                <TableRow key={payment.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{payment.invoiceNumber}</TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {payment.amount} ر.س
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      color={getStatusColor(payment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => setOpenDialog(true)}
                    >
                      تحميل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Payment Methods */}
      <Box sx={{ mt: 4 }}>
        <Card>
          <CardHeader title="طرق الدفع المسجلة" />
          <CardContent>
            <Grid container spacing={2}>
              {paymentData.paymentMethods?.map(method => (
                <Grid item xs={12} md={6} key={method.id}>
                  <Card
                    sx={{
                      border: `1px solid ${surfaceColors.borderSubtle}`,
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 2 },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {method.type}
                        </Typography>
                        <Typography variant="body2">{method.details}</Typography>
                      </Box>
                      {method.isDefault && (
                        <Chip label="الطريقة الافتراضية" size="small" color="success" />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Invoice Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>فاتورة رقم INV-001</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              بيانات الفاتورة
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                  رقم الفاتورة
                </Typography>
                <Typography variant="body2">INV-001</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                  التاريخ
                </Typography>
                <Typography variant="body2">2025-01-15</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                  الخدمة
                </Typography>
                <Typography variant="body2">جلسات علاج نطق</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                  المبلغ
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'bold', color: brandColors.accentCoral }}
                >
                  5,000 ر.س
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              تفاصيل الخدمات
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                    <TableCell>الخدمة</TableCell>
                    <TableCell align="right">الكمية</TableCell>
                    <TableCell align="right">السعر</TableCell>
                    <TableCell align="right">الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>جلسة علاج نطق</TableCell>
                    <TableCell align="right">5</TableCell>
                    <TableCell align="right">1,000</TableCell>
                    <TableCell align="right">5,000</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إغلاق</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            تحميل PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PaymentsHistory;
