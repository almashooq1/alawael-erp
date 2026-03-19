import { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { Add, CurrencyExchange, SwapHoriz, Delete, Refresh } from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const MultiCurrency = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [form, setForm] = useState({
    fromCurrency: 'USD',
    toCurrency: 'SAR',
    rate: 3.75,
    effectiveDate: new Date().toISOString().slice(0, 10),
    source: 'manual',
  });
  const [convertForm, setConvertForm] = useState({ from: 'USD', to: 'SAR', amount: 1000 });
  const [convertResult, setConvertResult] = useState(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/exchange-rates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) setRates(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = async () => {
    try {
      const res = await fetch(`${API}/finance/advanced/exchange-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenAddDialog(false);
        fetchRates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async () => {
    try {
      const res = await fetch(`${API}/finance/advanced/exchange-rates/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(convertForm),
      });
      const json = await res.json();
      if (json.success) setConvertResult(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    try {
      await fetch(`${API}/finance/advanced/exchange-rates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchRates();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (v, cur = 'SAR') =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(v || 0);

  const currencies = [
    { code: 'SAR', name: 'ريال سعودي', flag: '🇸🇦' },
    { code: 'USD', name: 'دولار أمريكي', flag: '🇺🇸' },
    { code: 'EUR', name: 'يورو', flag: '🇪🇺' },
    { code: 'GBP', name: 'جنيه إسترليني', flag: '🇬🇧' },
    { code: 'AED', name: 'درهم إماراتي', flag: '🇦🇪' },
    { code: 'KWD', name: 'دينار كويتي', flag: '🇰🇼' },
    { code: 'BHD', name: 'دينار بحريني', flag: '🇧🇭' },
    { code: 'QAR', name: 'ريال قطري', flag: '🇶🇦' },
    { code: 'OMR', name: 'ريال عماني', flag: '🇴🇲' },
    { code: 'EGP', name: 'جنيه مصري', flag: '🇪🇬' },
    { code: 'JOD', name: 'دينار أردني', flag: '🇯🇴' },
    { code: 'CNY', name: 'يوان صيني', flag: '🇨🇳' },
    { code: 'JPY', name: 'ين ياباني', flag: '🇯🇵' },
    { code: 'INR', name: 'روبية هندية', flag: '🇮🇳' },
  ];

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            العملات المتعددة
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Multi-Currency - أسعار الصرف وتحويل العملات
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => setOpenConvertDialog(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            تحويل عملات
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddDialog(true)}
            sx={{
              bgcolor: brandColors.primary,
              borderRadius: 2,
              fontWeight: 700,
              px: 3,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            إضافة سعر صرف
          </Button>
        </Box>
      </Box>

      {/* Quick Converter */}
      <Card
        sx={{
          borderRadius: 2.5,
          border: `1px solid ${surfaceColors.border}`,
          mb: 3,
          p: 2.5,
          bgcolor: '#F8F9FF',
        }}
      >
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <CurrencyExchange sx={{ color: brandColors.primary }} /> محول العملات السريع
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            select
            label="من عملة"
            value={convertForm.from}
            onChange={e => setConvertForm({ ...convertForm, from: e.target.value })}
            sx={{ minWidth: 160 }}
          >
            {currencies.map(c => (
              <MenuItem key={c.code} value={c.code}>
                {c.flag} {c.code} - {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="المبلغ"
            type="number"
            value={convertForm.amount}
            onChange={e => setConvertForm({ ...convertForm, amount: +e.target.value })}
            sx={{ width: 160 }}
          />
          <SwapHoriz sx={{ color: brandColors.primary, mx: 1 }} />
          <TextField
            select
            label="إلى عملة"
            value={convertForm.to}
            onChange={e => setConvertForm({ ...convertForm, to: e.target.value })}
            sx={{ minWidth: 160 }}
          >
            {currencies.map(c => (
              <MenuItem key={c.code} value={c.code}>
                {c.flag} {c.code} - {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={handleConvert}
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              height: 56,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            تحويل
          </Button>
          {convertResult && (
            <Card sx={{ px: 3, py: 1.5, borderRadius: 2, bgcolor: '#E8F5E9', ml: 1 }}>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                النتيجة
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#2E7D32' }}>
                {convertResult.convertedAmount?.toLocaleString('ar-SA', {
                  minimumFractionDigits: 2,
                })}{' '}
                {convertResult.toCurrency || convertForm.to}
              </Typography>
              <Typography variant="caption">سعر الصرف: {convertResult.rate}</Typography>
            </Card>
          )}
        </Box>
      </Card>

      {/* Rates Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            أسعار الصرف المسجلة
          </Typography>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchRates}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>من</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إلى</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  سعر الصرف
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ السريان</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المصدر</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rates.map((r, idx) => {
                const fromCur = currencies.find(c => c.code === r.fromCurrency);
                const toCur = currencies.find(c => c.code === r.toCurrency);
                return (
                  <TableRow key={r._id || idx} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {fromCur?.flag || ''} {r.fromCurrency}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {toCur?.flag || ''} {r.toCurrency}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 800, color: brandColors.primary, fontSize: '1rem' }}
                    >
                      {r.rate?.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      {new Date(r.effectiveDate || r.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          r.source === 'api' ? 'تلقائي' : r.source === 'bank' ? 'بنكي' : 'يدوي'
                        }
                        sx={{
                          bgcolor: r.source === 'api' ? '#2196F315' : '#FF980015',
                          color: r.source === 'api' ? '#2196F3' : '#FF9800',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.isActive !== false ? 'نشط' : 'منتهي'}
                        sx={{
                          bgcolor: r.isActive !== false ? '#4CAF5015' : '#9E9E9E15',
                          color: r.isActive !== false ? '#4CAF50' : '#9E9E9E',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(r._id)}
                          sx={{ color: '#F44336' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد أسعار صرف مسجلة - أضف سعر صرف جديد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Rate Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة سعر صرف</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="من عملة"
                value={form.fromCurrency}
                onChange={e => setForm({ ...form, fromCurrency: e.target.value })}
                fullWidth
              >
                {currencies.map(c => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="إلى عملة"
                value={form.toCurrency}
                onChange={e => setForm({ ...form, toCurrency: e.target.value })}
                fullWidth
              >
                {currencies.map(c => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="سعر الصرف"
              type="number"
              value={form.rate}
              onChange={e => setForm({ ...form, rate: +e.target.value })}
              fullWidth
              inputProps={{ step: 0.0001 }}
            />
            <TextField
              label="تاريخ السريان"
              type="date"
              value={form.effectiveDate}
              onChange={e => setForm({ ...form, effectiveDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="المصدر"
              value={form.source}
              onChange={e => setForm({ ...form, source: e.target.value })}
              fullWidth
            >
              <MenuItem value="manual">يدوي</MenuItem>
              <MenuItem value="bank">بنكي</MenuItem>
              <MenuItem value="api">تلقائي (API)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddRate}
            disabled={!form.rate}
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog
        open={openConvertDialog}
        onClose={() => setOpenConvertDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تحويل عملات</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="من عملة"
              value={convertForm.from}
              onChange={e => setConvertForm({ ...convertForm, from: e.target.value })}
              fullWidth
            >
              {currencies.map(c => (
                <MenuItem key={c.code} value={c.code}>
                  {c.flag} {c.code} - {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="المبلغ"
              type="number"
              value={convertForm.amount}
              onChange={e => setConvertForm({ ...convertForm, amount: +e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="إلى عملة"
              value={convertForm.to}
              onChange={e => setConvertForm({ ...convertForm, to: e.target.value })}
              fullWidth
            >
              {currencies.map(c => (
                <MenuItem key={c.code} value={c.code}>
                  {c.flag} {c.code} - {c.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={handleConvert}
              fullWidth
              sx={{
                bgcolor: brandColors.primary,
                fontWeight: 700,
                py: 1.5,
                '&:hover': { bgcolor: brandColors.primaryDark },
              }}
            >
              تحويل
            </Button>
            {convertResult && (
              <Card sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#2E7D32' }}>
                  {convertResult.convertedAmount?.toLocaleString('ar-SA', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  {convertResult.toCurrency || convertForm.to}
                </Typography>
                <Typography variant="caption">سعر الصرف المستخدم: {convertResult.rate}</Typography>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenConvertDialog(false);
              setConvertResult(null);
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MultiCurrency;
