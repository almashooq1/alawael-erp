/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';




import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const txTypeMap = {
  expense: { label: 'مصروف', color: '#F44336' },
  replenishment: { label: 'تعبئة', color: '#4CAF50' },
  advance: { label: 'سلفة', color: '#FF9800' },
  return: { label: 'إرجاع', color: '#2196F3' },
  adjustment: { label: 'تسوية', color: '#9C27B0' },
};
const categoryMap = {
  office_supplies: 'لوازم مكتبية',
  transportation: 'مواصلات',
  meals: 'وجبات',
  maintenance: 'صيانة',
  printing: 'طباعة',
  postage: 'بريد',
  cleaning: 'نظافة',
  misc: 'متفرقات',
  replenishment: 'تعبئة',
  other: 'أخرى',
};
const statusMap = {
  pending: { label: 'بانتظار', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#4CAF50' },
  rejected: { label: 'مرفوض', color: '#F44336' },
  posted: { label: 'مرحّل', color: '#2196F3' },
};
const fundStatusMap = {
  active: { label: 'نشط', color: '#4CAF50' },
  suspended: { label: 'موقوف', color: '#F44336' },
  closed: { label: 'مغلق', color: '#795548' },
  pending_replenishment: { label: 'بحاجة تعبئة', color: '#FF9800' },
};

const PettyCashManagement = () => {
  const [tab, setTab] = useState(0);
  const [funds, setFunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fundOpen, setFundOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [fundForm, setFundForm] = useState({
    fundName: '',
    custodianName: '',
    fundLimit: 5000,
    department: '',
  });
  const [txForm, setTxForm] = useState({
    fundId: '',
    type: 'expense',
    amount: 0,
    category: 'office_supplies',
    description: '',
    receiptNumber: '',
    vendorName: '',
  });

  const headers = {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, tRes, sRes] = await Promise.all([
        fetch(`${API}/finance/pro/petty-cash/funds`, { headers }),
        fetch(`${API}/finance/pro/petty-cash/transactions`, { headers }),
        fetch(`${API}/finance/pro/petty-cash/summary`, { headers }),
      ]);
      const fJson = await fRes.json();
      const tJson = await tRes.json();
      const sJson = await sRes.json();
      if (fJson.success) setFunds(fJson.data);
      if (tJson.success) setTransactions(tJson.data);
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

  const handleCreateFund = async () => {
    try {
      await fetch(`${API}/finance/pro/petty-cash/funds`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fundForm),
      });
      setFundOpen(false);
      setFundForm({ fundName: '', custodianName: '', fundLimit: 5000, department: '' });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTx = async () => {
    try {
      await fetch(`${API}/finance/pro/petty-cash/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(txForm),
      });
      setTxOpen(false);
      setTxForm({
        fundId: '',
        type: 'expense',
        amount: 0,
        category: 'office_supplies',
        description: '',
        receiptNumber: '',
        vendorName: '',
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id, action) => {
    try {
      await fetch(`${API}/finance/pro/petty-cash/transactions/${id}/approve`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action }),
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
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
            العهد والصندوق
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Petty Cash Management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={fetchAll} startIcon={<Refresh />}>
            تحديث
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceWallet />}
            onClick={() => setFundOpen(true)}
          >
            صندوق جديد
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setTxOpen(true)}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            حركة جديدة
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'عدد الصناديق', value: summary.totalFunds, color: brandColors.primary },
            { label: 'إجمالي الحد', value: fc(summary.totalLimit), color: '#2196F3' },
            { label: 'إجمالي الرصيد', value: fc(summary.totalBalance), color: '#4CAF50' },
            { label: 'إجمالي المصروف', value: fc(summary.totalSpent), color: '#F44336' },
            {
              label: 'نسبة الاستخدام',
              value: `${summary.utilizationRate}%`,
              color: summary.utilizationRate > 80 ? '#F44336' : '#FF9800',
            },
            { label: 'بحاجة تعبئة', value: summary.needsReplenishment, color: '#FF9800' },
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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`الصناديق (${funds.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`الحركات (${transactions.length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* Funds Tab */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {funds.length === 0 ? (
            <Typography sx={{ p: 4, color: neutralColors.textSecondary }}>
              لا توجد صناديق
            </Typography>
          ) : (
            funds.map(fund => {
              const usage = fund.fundLimit
                ? ((fund.fundLimit - fund.currentBalance) / fund.fundLimit) * 100
                : 0;
              return (
                <Card
                  key={fund._id}
                  sx={{
                    minWidth: 280,
                    flex: '1 1 280px',
                    borderRadius: 2,
                    border: `1px solid ${surfaceColors.border}`,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography fontWeight={700}>{fund.fundName}</Typography>
                      <Chip
                        size="small"
                        label={fundStatusMap[fund.status]?.label || fund.status}
                        sx={{
                          bgcolor: `${fundStatusMap[fund.status]?.color}15`,
                          color: fundStatusMap[fund.status]?.color,
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                      {fund.custodianName} - {fund.department}
                    </Typography>
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">الرصيد: {fc(fund.currentBalance)}</Typography>
                        <Typography variant="caption">الحد: {fc(fund.fundLimit)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(usage, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: usage > 80 ? '#F44336' : usage > 50 ? '#FF9800' : '#4CAF50',
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: usage > 80 ? '#F44336' : neutralColors.textSecondary }}
                      >
                        استخدام {usage.toFixed(0)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}

      {/* Transactions Tab */}
      {tab === 1 && (
        <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.card }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الحركة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الصندوق</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    المبلغ
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد حركات
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map(tx => (
                    <TableRow key={tx._id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {tx.transactionNumber}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={txTypeMap[tx.type]?.label || tx.type}
                          sx={{
                            bgcolor: `${txTypeMap[tx.type]?.color}15`,
                            color: txTypeMap[tx.type]?.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>{tx.fundId?.fundName || '-'}</TableCell>
                      <TableCell>{categoryMap[tx.category] || tx.category}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: tx.type === 'expense' ? '#F44336' : '#4CAF50',
                        }}
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {fc(tx.amount)}
                      </TableCell>
                      <TableCell
                        sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusMap[tx.status]?.label || tx.status}
                          sx={{
                            bgcolor: `${statusMap[tx.status]?.color}15`,
                            color: statusMap[tx.status]?.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {tx.status === 'pending' && (
                          <>
                            <Tooltip title="اعتماد">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApprove(tx._id, 'approve')}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleApprove(tx._id, 'reject')}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Fund Dialog */}
      <Dialog open={fundOpen} onClose={() => setFundOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <AccountBalanceWallet sx={{ verticalAlign: 'middle', mr: 1 }} /> إنشاء صندوق نثرية جديد
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="اسم الصندوق"
              value={fundForm.fundName}
              onChange={e => setFundForm({ ...fundForm, fundName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="اسم أمين الصندوق"
              value={fundForm.custodianName}
              onChange={e => setFundForm({ ...fundForm, custodianName: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="number"
                label="حد الصندوق (ر.س)"
                value={fundForm.fundLimit}
                onChange={e => setFundForm({ ...fundForm, fundLimit: +e.target.value })}
                fullWidth
              />
              <TextField
                label="القسم"
                value={fundForm.department}
                onChange={e => setFundForm({ ...fundForm, department: e.target.value })}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFundOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateFund}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Transaction Dialog */}
      <Dialog open={txOpen} onClose={() => setTxOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Receipt sx={{ verticalAlign: 'middle', mr: 1 }} /> تسجيل حركة نثرية
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label="الصندوق"
              value={txForm.fundId}
              onChange={e => setTxForm({ ...txForm, fundId: e.target.value })}
              fullWidth
              required
            >
              {funds
                .filter(f => f.status === 'active')
                .map(f => (
                  <MenuItem key={f._id} value={f._id}>
                    {f.fundName}
                  </MenuItem>
                ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="النوع"
                value={txForm.type}
                onChange={e => setTxForm({ ...txForm, type: e.target.value })}
                fullWidth
              >
                {Object.entries(txTypeMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="الفئة"
                value={txForm.category}
                onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                fullWidth
              >
                {Object.entries(categoryMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              type="number"
              label="المبلغ (ر.س)"
              value={txForm.amount}
              onChange={e => setTxForm({ ...txForm, amount: +e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="الوصف"
              value={txForm.description}
              onChange={e => setTxForm({ ...txForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="رقم الإيصال"
                value={txForm.receiptNumber}
                onChange={e => setTxForm({ ...txForm, receiptNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="اسم المورّد"
                value={txForm.vendorName}
                onChange={e => setTxForm({ ...txForm, vendorName: e.target.value })}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateTx}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PettyCashManagement;
