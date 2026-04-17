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
  LinearProgress,
} from '@mui/material';
import {
  PersonOutline,
  Add,
  CheckCircle,
  AccountBalanceWallet,
  Payment,
  Refresh,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const typeMap = {
  salary_advance: { label: 'سلفة راتب', color: '#2196F3' },
  personal_loan: { label: 'قرض شخصي', color: '#9C27B0' },
  emergency_loan: { label: 'قرض طوارئ', color: '#F44336' },
  housing_loan: { label: 'قرض سكن', color: '#FF9800' },
  education_loan: { label: 'قرض تعليمي', color: '#4CAF50' },
  other: { label: 'أخرى', color: '#607D8B' },
};
const statusMap = {
  pending: { label: 'بانتظار', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#2196F3' },
  disbursed: { label: 'مصروف', color: '#9C27B0' },
  active: { label: 'نشط', color: '#4CAF50' },
  completed: { label: 'مكتمل', color: '#4CAF50' },
  defaulted: { label: 'متعثر', color: '#F44336' },
  cancelled: { label: 'ملغي', color: '#9E9E9E' },
};

const EmployeeLoans = () => {
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState({
    type: 'salary_advance',
    employeeName: '',
    amount: 0,
    totalInstallments: 1,
    reason: '',
    deductionStartDate: '',
  });
  const [payAmount, setPayAmount] = useState(0);

  const headers = {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        fetch(`${API}/finance/pro/employee-loans`, { headers }),
        fetch(`${API}/finance/pro/employee-loans/summary`, { headers }),
      ]);
      const lJson = await lRes.json();
      const sJson = await sRes.json();
      if (lJson.success) setLoans(lJson.data);
      if (sJson.success) setSummary(sJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const handleCreate = async () => {
    try {
      await fetch(`${API}/finance/pro/employee-loans`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      setOpen(false);
      setForm({
        type: 'salary_advance',
        employeeName: '',
        amount: 0,
        totalInstallments: 1,
        reason: '',
        deductionStartDate: '',
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await fetch(`${API}/finance/pro/employee-loans/${id}/${action}`, {
        method: 'PATCH',
        headers,
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePay = async () => {
    try {
      await fetch(`${API}/finance/pro/employee-loans/${selectedLoan._id}/pay-installment`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ amount: payAmount }),
      });
      setPayOpen(false);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const openPay = loan => {
    setSelectedLoan(loan);
    setPayAmount(loan.installmentAmount || 0);
    setPayOpen(true);
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
            سلف وقروض الموظفين
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Employee Advances & Loans
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={fetchAll} startIcon={<Refresh />}>
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpen(true)}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            سلفة / قرض جديد
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            {
              label: 'إجمالي السلف والقروض',
              value: summary.totalLoans,
              color: brandColors.primary,
            },
            { label: 'نشط / جاري السداد', value: summary.activeLoans, color: '#4CAF50' },
            { label: 'بانتظار الاعتماد', value: summary.pendingLoans, color: '#FF9800' },
            {
              label: 'إجمالي المبالغ المصروفة',
              value: fc(summary.totalDisbursed),
              color: '#9C27B0',
            },
            { label: 'إجمالي المتبقي', value: fc(summary.totalRemaining), color: '#F44336' },
          ].map((item, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                minWidth: 170,
                borderRadius: 2,
                border: `1px solid ${surfaceColors.border}`,
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
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

      {/* Loans Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم السلفة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأقساط</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المتبقي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد سلف أو قروض
                  </TableCell>
                </TableRow>
              ) : (
                loans.map(loan => {
                  const progress = loan.totalInstallments
                    ? (loan.paidInstallments / loan.totalInstallments) * 100
                    : 0;
                  return (
                    <TableRow key={loan._id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {loan.loanNumber}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <PersonOutline sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        {loan.employeeName}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={typeMap[loan.type]?.label || loan.type}
                          sx={{
                            bgcolor: `${typeMap[loan.type]?.color}15`,
                            color: typeMap[loan.type]?.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {fc(loan.amount)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {loan.paidInstallments} / {loan.totalInstallments}
                        </Typography>
                        <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                          {fc(loan.installmentAmount)} /شهر
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#F44336' }}>
                        {fc(loan.remainingBalance)}
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(progress, 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#E0E0E0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: progress >= 100 ? '#4CAF50' : '#2196F3',
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Typography variant="caption">{progress.toFixed(0)}%</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusMap[loan.status]?.label || loan.status}
                          sx={{
                            bgcolor: `${statusMap[loan.status]?.color}15`,
                            color: statusMap[loan.status]?.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {loan.status === 'pending' && (
                          <Tooltip title="اعتماد">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAction(loan._id, 'approve')}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {loan.status === 'approved' && (
                          <Tooltip title="صرف">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleAction(loan._id, 'disburse')}
                            >
                              <AccountBalanceWallet fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(loan.status === 'active' || loan.status === 'disbursed') && (
                          <Tooltip title="سداد قسط">
                            <IconButton size="small" color="info" onClick={() => openPay(loan)}>
                              <Payment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Loan Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Add sx={{ verticalAlign: 'middle', mr: 1 }} /> طلب سلفة / قرض جديد
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="اسم الموظف"
              value={form.employeeName}
              onChange={e => setForm({ ...form, employeeName: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="النوع"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                fullWidth
              >
                {Object.entries(typeMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                label="المبلغ (ر.س)"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: +e.target.value })}
                fullWidth
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="number"
                label="عدد الأقساط"
                value={form.totalInstallments}
                onChange={e => setForm({ ...form, totalInstallments: +e.target.value })}
                fullWidth
                inputProps={{ min: 1 }}
              />
              <TextField
                type="date"
                label="بداية الاستقطاع"
                value={form.deductionStartDate}
                onChange={e => setForm({ ...form, deductionStartDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label="السبب"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            تقديم الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Installment Dialog */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Payment sx={{ verticalAlign: 'middle', mr: 1 }} /> سداد قسط
        </DialogTitle>
        <DialogContent dividers>
          {selectedLoan && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography>
                الموظف: <strong>{selectedLoan.employeeName}</strong>
              </Typography>
              <Typography>
                رقم السلفة: <strong>{selectedLoan.loanNumber}</strong>
              </Typography>
              <Typography>
                المتبقي: <strong>{fc(selectedLoan.remainingBalance)}</strong>
              </Typography>
              <TextField
                type="number"
                label="مبلغ القسط (ر.س)"
                value={payAmount}
                onChange={e => setPayAmount(+e.target.value)}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handlePay} color="success" sx={{ fontWeight: 700 }}>
            تأكيد السداد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeLoans;
