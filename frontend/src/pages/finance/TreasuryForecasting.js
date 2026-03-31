/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Refresh,
  Add,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  ShowChart,} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const scenarioMap = {
  base: { label: 'سيناريو أساسي', color: '#2196F3' },
  optimistic: { label: 'متفائل', color: '#4CAF50' },
  pessimistic: { label: 'متشائم', color: '#F44336' },
  custom: { label: 'مخصص', color: '#9C27B0' },
};
const transferStatusMap = {
  pending: { label: 'معلق', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#2196F3' },
  executed: { label: 'منفذ', color: '#4CAF50' },
  cancelled: { label: 'ملغي', color: '#9E9E9E' },
  failed: { label: 'فشل', color: '#F44336' },
};

const TreasuryForecasting = () => {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecastDialog, setForecastDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [forecastForm, setForecastForm] = useState({
    scenarioName: '',
    scenarioType: 'base',
    periodStart: '',
    periodEnd: '',
    openingBalance: '',
    minimumBalance: '',
  });
  const [transferForm, setTransferForm] = useState({
    fromBankAccountId: '',
    toBankAccountId: '',
    amount: '',
    transferDate: '',
    notes: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, fcRes, trRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/treasury/dashboard`, { headers }),
        fetch(`${API}/finance/enterprise/treasury/forecast`, { headers }),
        fetch(`${API}/finance/enterprise/treasury/transfers`, { headers }),
      ]);
      const dashData = await dashRes.json();
      const fcData = await fcRes.json();
      const trData = await trRes.json();
      if (dashData.success) setDashboard(dashData.data);
      if (fcData.success) setForecasts(fcData.data);
      if (trData.success) setTransfers(trData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleCreateForecast = async () => {
    try {
      const res = await fetch(`${API}/finance/enterprise/treasury/forecast`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...forecastForm,
          openingBalance: parseFloat(forecastForm.openingBalance),
          minimumBalance: parseFloat(forecastForm.minimumBalance),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForecastDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      const res = await fetch(`${API}/finance/enterprise/treasury/transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...transferForm,
          amount: parseFloat(transferForm.amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTransferDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteTransfer = async id => {
    try {
      await fetch(`${API}/finance/enterprise/treasury/transfers/${id}/execute`, {
        method: 'PATCH',
        headers,
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
          إدارة الخزينة والتنبؤ النقدي
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setForecastDialog(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            تنبؤ جديد
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => setTransferDialog(true)}
            color="secondary"
          >
            تحويل بين حسابات
          </Button>
        </Box>
      </Box>

      {/* Treasury Dashboard */}
      {dashboard && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #4CAF5020' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <AccountBalanceWallet sx={{ fontSize: 40, color: '#4CAF50', mb: 1 }} />
                <Typography variant="h3" fontWeight={700} color="#4CAF50">
                  {fmt(dashboard.totalBalance)}
                </Typography>
                <Typography variant="body1" color={neutralColors.textSecondary}>
                  إجمالي رصيد الخزينة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #2196F320' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h4" fontWeight={700} color="#2196F3">
                  {dashboard.accountCount}
                </Typography>
                <Typography variant="body1" color={neutralColors.textSecondary}>
                  حسابات بنكية نشطة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: surfaceColors.card }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>
                  الأرصدة حسب العملة
                </Typography>
                {dashboard.byCurrency.map((c, i) => (
                  <Box key={i} display="flex" justifyContent="space-between" py={0.5}>
                    <Chip label={c.currency} size="small" />
                    <Typography fontWeight={600}>{fmt(c.balance)}</Typography>
                  </Box>
                ))}
                {dashboard.byCurrency.length === 0 && (
                  <Typography variant="body2" color={neutralColors.textSecondary}>
                    لا توجد بيانات
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="التنبؤ النقدي" icon={<ShowChart />} iconPosition="start" />
        <Tab label="التحويلات" icon={<SwapHoriz />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'السيناريو',
                    'النوع',
                    'الفترة',
                    'رصيد الافتتاح',
                    'التدفقات الداخلة',
                    'التدفقات الخارجة',
                    'الرصيد المتوقع',
                    'الفائض/العجز',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {forecasts.map(f => {
                  const sc = scenarioMap[f.scenarioType] || scenarioMap.base;
                  const surplus = (f.projectedClosing || 0) - (f.minimumBalance || 0);
                  return (
                    <TableRow key={f._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {f.scenarioName || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={sc.label}
                          size="small"
                          sx={{ bgcolor: `${sc.color}20`, color: sc.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {f.periodStart ? new Date(f.periodStart).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(f.openingBalance)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50' }}>
                        <TrendingUp fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {fmt(f.totalExpectedInflows)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#F44336' }}>
                        <TrendingDown fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {fmt(f.totalExpectedOutflows)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                        {fmt(f.projectedClosing)}
                      </TableCell>
                      <TableCell
                        sx={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: surplus >= 0 ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {fmt(surplus)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {forecasts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد تنبؤات نقدية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم التحويل',
                    'من حساب',
                    'إلى حساب',
                    'المبلغ',
                    'التاريخ',
                    'الحالة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.map(t => {
                  const st = transferStatusMap[t.status] || transferStatusMap.pending;
                  return (
                    <TableRow key={t._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {t.transferNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {t.fromBankAccountId || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{t.toBankAccountId || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                        {fmt(t.amount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {t.transferDate
                          ? new Date(t.transferDate).toLocaleDateString('ar-SA')
                          : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {t.status === 'pending' || t.status === 'approved' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleExecuteTransfer(t._id)}
                          >
                            تنفيذ
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {transfers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد تحويلات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Forecast Dialog */}
      <Dialog
        open={forecastDialog}
        onClose={() => setForecastDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء تنبؤ نقدي جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم السيناريو"
              value={forecastForm.scenarioName}
              onChange={e => setForecastForm({ ...forecastForm, scenarioName: e.target.value })}
              fullWidth
            />
            <TextField
              label="نوع السيناريو"
              value={forecastForm.scenarioType}
              onChange={e => setForecastForm({ ...forecastForm, scenarioType: e.target.value })}
              select
              fullWidth
            >
              {Object.entries(scenarioMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="بداية الفترة"
              type="date"
              value={forecastForm.periodStart}
              onChange={e => setForecastForm({ ...forecastForm, periodStart: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="نهاية الفترة"
              type="date"
              value={forecastForm.periodEnd}
              onChange={e => setForecastForm({ ...forecastForm, periodEnd: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="رصيد الافتتاح"
              type="number"
              value={forecastForm.openingBalance}
              onChange={e => setForecastForm({ ...forecastForm, openingBalance: e.target.value })}
              fullWidth
            />
            <TextField
              label="الحد الأدنى للسيولة"
              type="number"
              value={forecastForm.minimumBalance}
              onChange={e => setForecastForm({ ...forecastForm, minimumBalance: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForecastDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateForecast}
            sx={{ bgcolor: brandColors.primary }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog
        open={transferDialog}
        onClose={() => setTransferDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تحويل بين حسابات بنكية</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="من حساب (معرف)"
              value={transferForm.fromBankAccountId}
              onChange={e =>
                setTransferForm({ ...transferForm, fromBankAccountId: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="إلى حساب (معرف)"
              value={transferForm.toBankAccountId}
              onChange={e => setTransferForm({ ...transferForm, toBankAccountId: e.target.value })}
              fullWidth
            />
            <TextField
              label="المبلغ (ر.س)"
              type="number"
              value={transferForm.amount}
              onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
              fullWidth
            />
            <TextField
              label="تاريخ التحويل"
              type="date"
              value={transferForm.transferDate}
              onChange={e => setTransferForm({ ...transferForm, transferDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateTransfer} color="secondary">
            تحويل
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TreasuryForecasting;
