import { useState, useEffect, useCallback } from 'react';

import { surfaceColors, neutralColors, brandColors } from 'theme/palette';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import Warning from '@mui/icons-material/Warning';
import Schedule from '@mui/icons-material/Schedule';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Delete from '@mui/icons-material/Delete';

const API = process.env.REACT_APP_API_URL || '/api';

const statusLabels = {
  upcoming: 'قادم',
  due: 'مستحق',
  overdue: 'متأخر',
  filed: 'تم التقديم',
  paid: 'مدفوع',
  cancelled: 'ملغي',
};
const statusColors = {
  upcoming: '#2196F3',
  due: '#FF9800',
  overdue: '#F44336',
  filed: '#9C27B0',
  paid: '#4CAF50',
  cancelled: '#9E9E9E',
};
const taxTypeLabels = {
  vat: 'ضريبة القيمة المضافة',
  zakat: 'الزكاة',
  withholding: 'ضريبة الاستقطاع',
  income: 'ضريبة الدخل',
  custom: 'رسوم جمركية',
  social_insurance: 'تأمينات اجتماعية',
};
const freqLabels = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semi_annual: 'نصف سنوي',
  annual: 'سنوي',
  one_time: 'مرة واحدة',
};

const TaxCalendar = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    title: '',
    taxType: 'vat',
    dueDate: '',
    periodStart: '',
    periodEnd: '',
    frequency: 'quarterly',
    estimatedAmount: 0,
    authority: 'ZATCA',
    reminderDays: [30, 7, 1],
    notes: '',
  });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/extended/tax-calendar`, { headers });
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/extended/tax-calendar`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        setForm({
          title: '',
          taxType: 'vat',
          dueDate: '',
          periodStart: '',
          periodEnd: '',
          frequency: 'quarterly',
          estimatedAmount: 0,
          authority: 'ZATCA',
          reminderDays: [30, 7, 1],
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await fetch(`${API}/finance/extended/tax-calendar/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    try {
      await fetch(`${API}/finance/extended/tax-calendar/${id}`, { method: 'DELETE', headers });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const getDaysUntilDue = dueDate => {
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Group by status priority
  const overdue = items.filter(i => i.status === 'overdue');
  const due = items.filter(i => i.status === 'due');
  const upcoming = items.filter(i => i.status === 'upcoming');
  const filed = items.filter(i => i.status === 'filed');
  const paid = items.filter(i => i.status === 'paid');

  const totalEstimated = items
    .filter(i => !['paid', 'cancelled'].includes(i.status))
    .reduce((s, i) => s + (i.estimatedAmount || i.amount || 0), 0);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            التقويم الضريبي
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Tax Calendar - مواعيد وإقرارات الالتزامات الضريبية
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: brandColors.primary,
            borderRadius: 2,
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: brandColors.primaryDark },
          }}
        >
          إضافة التزام
        </Button>
      </Box>

      {/* Alerts */}
      {overdue.length > 0 && (
        <Alert
          severity="error"
          icon={<EventBusy />}
          sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
        >
          تنبيه: يوجد {overdue.length} التزام/التزامات ضريبية متأخرة! يرجى التقديم فوراً لتجنب
          الغرامات.
        </Alert>
      )}
      {due.length > 0 && (
        <Alert
          severity="warning"
          icon={<NotificationsActive />}
          sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
        >
          يوجد {due.length} التزام/التزامات مستحقة خلال الأيام القادمة.
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'متأخر', value: overdue.length, color: '#F44336', icon: <EventBusy /> },
          { label: 'مستحق', value: due.length, color: '#FF9800', icon: <Warning /> },
          { label: 'قادم', value: upcoming.length, color: '#2196F3', icon: <Schedule /> },
          { label: 'تم التقديم', value: filed.length, color: '#9C27B0', icon: <Receipt /> },
          { label: 'مدفوع', value: paid.length, color: '#4CAF50', icon: <CheckCircle /> },
          {
            label: 'المبالغ المتوقعة',
            value: fc(totalEstimated),
            color: brandColors.primary,
            icon: <CalendarMonth />,
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 140,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>
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

      {/* Tax Obligations Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>الالتزام</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نوع الضريبة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الجهة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفترة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الاستحقاق</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأيام المتبقية</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ المقدّر
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التكرار</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...overdue, ...due, ...upcoming, ...filed, ...paid].map((item, idx) => {
                const days = getDaysUntilDue(item.dueDate);
                const urgency =
                  item.status === 'overdue'
                    ? '#FFEBEE'
                    : item.status === 'due'
                      ? '#FFF3E0'
                      : 'transparent';
                return (
                  <TableRow key={item._id || idx} hover sx={{ bgcolor: urgency }}>
                    <TableCell sx={{ fontWeight: 700 }}>{item.title}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={taxTypeLabels[item.taxType] || item.taxType}
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>{item.authority}</TableCell>
                    <TableCell>
                      {item.periodStart && item.periodEnd ? (
                        <Typography variant="caption">
                          {new Date(item.periodStart).toLocaleDateString('ar-SA')} -{' '}
                          {new Date(item.periodEnd).toLocaleDateString('ar-SA')}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {new Date(item.dueDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {['paid', 'filed', 'cancelled'].includes(item.status) ? (
                          <Typography variant="caption" sx={{ color: '#4CAF50' }}>
                            تم
                          </Typography>
                        ) : (
                          <>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                color: days < 0 ? '#F44336' : days <= 7 ? '#FF9800' : '#4CAF50',
                              }}
                            >
                              {days < 0
                                ? `متأخر ${Math.abs(days)} يوم`
                                : days === 0
                                  ? 'اليوم!'
                                  : `${days} يوم`}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.max(0, Math.min(100, ((30 - days) / 30) * 100))}
                              sx={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: days < 0 ? '#F44336' : days <= 7 ? '#FF9800' : '#4CAF50',
                                },
                              }}
                            />
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {fc(item.estimatedAmount || item.amount)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {freqLabels[item.frequency] || item.frequency}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabels[item.status] || item.status}
                        sx={{
                          bgcolor: `${statusColors[item.status] || '#9E9E9E'}15`,
                          color: statusColors[item.status] || '#9E9E9E',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {item.status !== 'filed' &&
                          item.status !== 'paid' &&
                          item.status !== 'cancelled' && (
                            <Tooltip title="تم التقديم">
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(item._id, 'filed')}
                                sx={{ color: '#9C27B0' }}
                              >
                                <Receipt fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        {item.status === 'filed' && (
                          <Tooltip title="تم الدفع">
                            <IconButton
                              size="small"
                              onClick={() => handleStatusChange(item._id, 'paid')}
                              sx={{ color: '#4CAF50' }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(item._id)}
                            sx={{ color: '#F44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد التزامات ضريبية مسجلة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة التزام ضريبي</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="العنوان"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="نوع الضريبة"
                value={form.taxType}
                onChange={e => setForm({ ...form, taxType: e.target.value })}
                fullWidth
              >
                {Object.entries(taxTypeLabels).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="التكرار"
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value })}
                fullWidth
              >
                {Object.entries(freqLabels).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="بداية الفترة"
                type="date"
                value={form.periodStart}
                onChange={e => setForm({ ...form, periodStart: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="نهاية الفترة"
                type="date"
                value={form.periodEnd}
                onChange={e => setForm({ ...form, periodEnd: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label="تاريخ الاستحقاق"
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="المبلغ المقدّر"
                type="number"
                value={form.estimatedAmount}
                onChange={e => setForm({ ...form, estimatedAmount: +e.target.value })}
                fullWidth
              />
              <TextField
                label="الجهة"
                value={form.authority}
                onChange={e => setForm({ ...form, authority: e.target.value })}
                fullWidth
              />
            </Box>
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.title || !form.dueDate}
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
    </Container>
  );
};

export default TaxCalendar;
